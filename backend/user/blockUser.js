import {
    collection,
    getDoc,
    getDocs,
    query,
    updateDoc as nativeUpdateDoc,
    where,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase.config";
import arrayAppend from "../helper/firebase/arrayAppend";
import arrayErase from "../helper/firebase/arrayErase";
import updateDoc from "../helper/firebase/updateDoc";
import readDoc from "../helper/firebase/readDoc";
import unfollowUser from "./unfollowUser";
import { normalizeUserRef, coerceUid, ensureUidArray } from "../helper/userRefs";
import { userPrivateDoc, userPublicDoc } from "../../shared/firestoreRefs";

const pruneUserMessages = async (uid, blockedUid) => {
    try {
        const data = await readDoc("usersPrivate", uid);
        if (!data) return;
        const messages = Array.isArray(data.messages) ? data.messages : [];
        const filtered = messages.filter((entry) => {
            if (!entry) return false;
            const others = Array.isArray(entry?.otherUsers) ? entry.otherUsers : [];
            return !others.some((u) => coerceUid(u) === blockedUid);
        });
        if (filtered.length !== messages.length) {
            await updateDoc("usersPrivate", uid, { messages: filtered });
        }
    } catch (err) {
        console.log("pruneUserMessages error", err?.message || err);
    }
};

const removeUserFromCommonTribes = async (uidA, uidB) => {
    try {
        const tribesRef = collection(db, "tribes");
        const [snapA, snapB] = await Promise.all([
            getDocs(query(tribesRef, where("members", "array-contains", uidA))),
            getDocs(query(tribesRef, where("members", "array-contains", uidB))),
        ]);

        const touched = new Map();
        snapA.forEach((docSnap) => touched.set(docSnap.id, docSnap));
        snapB.forEach((docSnap) => touched.set(docSnap.id, docSnap));

        const updates = [];

        touched.forEach((docSnap, tribeId) => {
            const data = docSnap.data() || {};
            const members = Array.isArray(data.members) ? data.members : [];
            const nextMembers = members.filter((memberUid) => memberUid !== uidA && memberUid !== uidB);
            const payload = {};
            let changed = nextMembers.length !== members.length;

            if (changed) payload.members = nextMembers;

            const ownerUid = data.ownerUid ? String(data.ownerUid) : "";
            if (ownerUid && (ownerUid === uidA || ownerUid === uidB)) {
                payload.ownerUid = nextMembers[0] || "";
                changed = true;
            }

            if (changed) {
                payload.updatedAt = serverTimestamp();
                updates.push(updateDoc("tribes", tribeId, payload, { allowCreate: true }));
            }

            if (members.includes(uidA)) {
                updates.push(arrayErase("usersPrivate", uidA, "tribeIds", tribeId));
            }
            if (members.includes(uidB)) {
                updates.push(arrayErase("usersPrivate", uidB, "tribeIds", tribeId));
            }
        });

        await Promise.all(updates);
    } catch (err) {
        console.log("removeUserFromCommonTribes error", err?.message || err);
    }
};

const hideChatsBetween = async (uidA, uidB) => {
    try {
        const chatsRef = collection(db, "messages");
        const snap = await getDocs(query(chatsRef, where("memberUids", "array-contains", uidA)));
        const writes = [];
        snap.forEach((docSnap) => {
            const data = docSnap.data() || {};
            const members = Array.isArray(data.memberUids) ? data.memberUids : [];
            if (!members.includes(uidB)) return;
            const existingHidden = Array.isArray(data.hiddenFor) ? data.hiddenFor : [];
            const hiddenSet = new Set(existingHidden);
            let changed = false;
            [uidA, uidB].forEach((uid) => {
                if (!hiddenSet.has(uid)) {
                    hiddenSet.add(uid);
                    changed = true;
                }
            });
            if (!data.isGroup && data.users?.length === 2) changed = true; // mark as blocked direct thread
            if (!changed) return;
            const updatePayload = {
                hiddenFor: Array.from(hiddenSet),
                isBlockedThread: true,
            };
            writes.push(updateDoc("messages", docSnap.id, updatePayload));
        });
        await Promise.all(writes);
    } catch (err) {
        console.log("hideChatsBetween error", err?.message || err);
    }
};

const removeFromRelationshipArrays = async (docRef, data, targetUid) => {
    const next = {};
    let dirty = false;

    const stripArrayFields = ["followers", "following", "friends", "friendsList", "followingList", "followersList"];
    stripArrayFields.forEach((field) => {
        const value = data?.[field];
        if (!Array.isArray(value)) return;
        const filtered = value.filter((entry) => coerceUid(entry) !== targetUid);
        if (filtered.length !== value.length) {
            next[field] = filtered;
            dirty = true;
        }
    });

    // Handle map/object variants
    const mapFields = ["friendsMap", "followersMap", "followingMap"];
    mapFields.forEach((field) => {
        const value = data?.[field];
        if (!value || typeof value !== "object") return;
        if (!Object.prototype.hasOwnProperty.call(value, targetUid)) return;
        const clone = { ...value };
        delete clone[targetUid];
        next[field] = clone;
        dirty = true;
    });

    if (dirty) {
        await nativeUpdateDoc(docRef, next);
    }
};

export default async function blockUser(this_user, user) {
    const meRef = normalizeUserRef(this_user);
    const otherRef = normalizeUserRef(user);

    if (!meRef || !otherRef) return;

    const meUid = meRef.uid;
    const otherUid = otherRef.uid;

    const mePublicRef = userPublicDoc(meUid);
    const otherPublicRef = userPublicDoc(otherUid);
    const mePrivateRef = userPrivateDoc(meUid);
    const otherPrivateRef = userPrivateDoc(otherUid);

    const [mePublicSnap, otherPublicSnap, mePrivateSnap, otherPrivateSnap] = await Promise.all([
        getDoc(mePublicRef),
        getDoc(otherPublicRef),
        getDoc(mePrivateRef),
        getDoc(otherPrivateRef),
    ]);
    const mePublicData = mePublicSnap.exists() ? mePublicSnap.data() || {} : {};
    const otherPublicData = otherPublicSnap.exists() ? otherPublicSnap.data() || {} : {};
    const mePrivateData = mePrivateSnap.exists() ? mePrivateSnap.data() || {} : {};

    const alreadyBlocked = ensureUidArray(mePrivateData.blockedUidList || mePrivateData.blocked).includes(otherUid);
    if (alreadyBlocked) return;

    // Remove social connections first
    try {
        await unfollowUser(meRef, otherRef);
    } catch (err) {
        console.log("blockUser unfollow me->other error", err?.message || err);
    }
    try {
        await unfollowUser(otherRef, meRef);
    } catch (err) {
        console.log("blockUser unfollow other->me error", err?.message || err);
    }

    // Remove any lingering follow requests in either direction
    try {
        await arrayErase("usersPrivate", meUid, "followRequestsOut", otherRef);
    } catch {}
    try {
        await arrayErase("usersPrivate", meUid, "followRequestsIn", otherRef);
    } catch {}
    try {
        await arrayErase("usersPrivate", otherUid, "followRequestsOut", meRef);
    } catch {}
    try {
        await arrayErase("usersPrivate", otherUid, "followRequestsIn", meRef);
    } catch {}

    await Promise.all([
        removeFromRelationshipArrays(mePublicRef, mePublicData, otherUid),
        removeFromRelationshipArrays(otherPublicRef, otherPublicData, meUid),
    ]);

    await Promise.all([
        pruneUserMessages(meUid, otherUid),
        pruneUserMessages(otherUid, meUid),
        hideChatsBetween(meUid, otherUid),
        removeUserFromCommonTribes(meUid, otherUid),
    ]);

    // Update block metadata & derived uid lists
    await Promise.all([
        arrayAppend("usersPrivate", meUid, "blocked", otherRef),
        arrayAppend("usersPrivate", meUid, "blockedUidList", otherUid),
        updateDoc("usersPrivate", meUid, {
            [`blockedTimestamps.${otherUid}`]: serverTimestamp(),
        }),
        arrayAppend("usersPrivate", otherUid, "blockedBy", meRef),
        arrayAppend("usersPrivate", otherUid, "blockedByUidList", meUid),
        updateDoc("usersPrivate", otherUid, {
            [`blockedByTimestamps.${meUid}`]: serverTimestamp(),
        }),
    ]);
}
