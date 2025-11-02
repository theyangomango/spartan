import {
    collection,
    doc,
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

const pruneUserMessages = async (uid, blockedUid) => {
    try {
        const data = await readDoc("users", uid);
        if (!data) return;
        const messages = Array.isArray(data.messages) ? data.messages : [];
        const filtered = messages.filter((entry) => {
            if (!entry) return false;
            const others = Array.isArray(entry?.otherUsers) ? entry.otherUsers : [];
            return !others.some((u) => coerceUid(u) === blockedUid);
        });
        if (filtered.length !== messages.length) {
            await updateDoc("users", uid, { messages: filtered });
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
                updates.push(arrayErase("users", uidA, "tribeIds", tribeId));
            }
            if (members.includes(uidB)) {
                updates.push(arrayErase("users", uidB, "tribeIds", tribeId));
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

    const meDocRef = doc(db, "users", meUid);
    const otherDocRef = doc(db, "users", otherUid);

    const [meSnap, otherSnap] = await Promise.all([getDoc(meDocRef), getDoc(otherDocRef)]);
    const meData = meSnap.exists() ? meSnap.data() || {} : {};
    const otherData = otherSnap.exists() ? otherSnap.data() || {} : {};

    const alreadyBlocked = ensureUidArray(meData.blockedUidList || meData.blocked).includes(otherUid);
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
        await arrayErase("users", meUid, "followRequestsOut", otherRef);
    } catch {}
    try {
        await arrayErase("users", meUid, "followRequestsIn", otherRef);
    } catch {}
    try {
        await arrayErase("users", otherUid, "followRequestsOut", meRef);
    } catch {}
    try {
        await arrayErase("users", otherUid, "followRequestsIn", meRef);
    } catch {}

    await Promise.all([
        removeFromRelationshipArrays(meDocRef, meData, otherUid),
        removeFromRelationshipArrays(otherDocRef, otherData, meUid),
    ]);

    await Promise.all([
        pruneUserMessages(meUid, otherUid),
        pruneUserMessages(otherUid, meUid),
        hideChatsBetween(meUid, otherUid),
        removeUserFromCommonTribes(meUid, otherUid),
    ]);

    // Update block metadata & derived uid lists
    await Promise.all([
        arrayAppend("users", meUid, "blocked", otherRef),
        arrayAppend("users", meUid, "blockedUidList", otherUid),
        updateDoc("users", meUid, {
            [`blockedTimestamps.${otherUid}`]: serverTimestamp(),
        }),
        arrayAppend("users", otherUid, "blockedBy", meRef),
        arrayAppend("users", otherUid, "blockedByUidList", meUid),
        updateDoc("users", otherUid, {
            [`blockedByTimestamps.${meUid}`]: serverTimestamp(),
        }),
    ]);
}
