// Finds the existing direct chat between the viewer and another user, sharing one lookup per pair while it is in flight.
import { collection, getDocs, limit, query, where } from "firebase/firestore";

import { db } from "../../../firebase.config";
import { ensureUidArray, normalizeUserRef } from "../../utils/userRefs";

const DIRECT_DM_LOOKUP_CACHE = new Map();

const makePairKey = (a, b) => {
    const left = String(a || "").trim();
    const right = String(b || "").trim();
    if (!left || !right) return "";
    return [left, right].sort().join("::");
};

export const upsertLocalMessageEntry = (entry) => {
    if (!entry || !entry.mid) return;
    try {
        const prev = Array.isArray(global?.userData?.messages) ? [...global.userData.messages] : [];
        const idx = prev.findIndex((record) => String(record?.mid || "") === entry.mid);
        if (idx >= 0) prev[idx] = { ...prev[idx], ...entry };
        else prev.push(entry);
        global.userData.messages = prev;
    } catch {}
};

const resolveParticipants = (rawUsers, fallback, selfUid) => {
    const participants = Array.isArray(rawUsers)
        ? rawUsers
            .map((entry) => normalizeUserRef(entry))
            .filter((entry) => entry && entry.uid && entry.uid !== selfUid)
        : [];
    if (participants.length > 0) return participants;
    if (fallback && fallback.uid && fallback.uid !== selfUid) return [fallback];
    return [];
};

export const lookupRemoteDirectChat = async (selfUid, otherUid, fallbackOtherUser) => {
    const viewer = String(selfUid || "").trim();
    const target = String(otherUid || "").trim();
    if (!viewer || !target) return null;
    const cacheKey = makePairKey(viewer, target);
    if (!cacheKey) return null;
    if (DIRECT_DM_LOOKUP_CACHE.has(cacheKey)) {
        return DIRECT_DM_LOOKUP_CACHE.get(cacheKey);
    }

    const task = (async () => {
        try {
            const messagesRef = collection(db, "messages");
            const q = query(messagesRef, where("memberUids", "array-contains", viewer), limit(50));
            const snapshot = await getDocs(q);
            for (const docSnap of snapshot.docs) {
                const data = docSnap.data() || {};
                const memberUids = ensureUidArray(
                    data.memberUids ||
                    data.members ||
                    data.memberUidList ||
                    data.users ||
                    []
                );
                if (!memberUids.includes(viewer) || !memberUids.includes(target)) continue;
                const isGroup = data.isGroup === true || memberUids.length > 2;
                if (isGroup) continue;
                const chatData = { ...data, cid: data.cid || docSnap.id };
                const participants = resolveParticipants(chatData.users, fallbackOtherUser, viewer);
                upsertLocalMessageEntry({ mid: chatData.cid, otherUsers: participants });
                return { chatData, participants };
            }
        } catch (err) {
            console.log("[ViewProfile] remote chat lookup failed", err?.message || err);
        }
        return null;
    })();

    const wrapped = task.finally(() => {
        DIRECT_DM_LOOKUP_CACHE.delete(cacheKey);
    });

    DIRECT_DM_LOOKUP_CACHE.set(cacheKey, wrapped);
    return wrapped;
};
