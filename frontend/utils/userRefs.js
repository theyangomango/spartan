const UID_KEYS = [
    "uid",
    "id",
    "userUid",
    "memberUid",
    "profileUid",
    "followUid",
    "followerUid",
    "ownerUid",
    "creatorUid",
    "creatorUID",
    "docId",
    "_id",
    "objectID",
];

export const coerceUid = (input) => {
    if (input === null || input === undefined) return "";
    if (typeof input === "string" || typeof input === "number") {
        const str = String(input).trim();
        return str || "";
    }
    if (typeof input !== "object") return "";
    for (const key of UID_KEYS) {
        if (Object.prototype.hasOwnProperty.call(input, key)) {
            const value = coerceUid(input[key]);
            if (value) return value;
        }
    }
    return "";
};

export const normalizeUserRef = (user) => {
    const uid = coerceUid(user);
    if (!uid) return null;
    return {
        uid,
        handle: user?.handle || user?.username || "",
        name: user?.name || user?.displayName || "",
        pfp: user?.pfp || user?.image || user?.photoURL || "",
    };
};

export const ensureUidArray = (list) => {
    if (!Array.isArray(list)) return [];
    const seen = new Set();
    const out = [];
    list.forEach((entry) => {
        const uid = coerceUid(entry);
        if (!uid || seen.has(uid)) return;
        seen.add(uid);
        out.push(uid);
    });
    return out;
};

export const mergeUidSets = (base = [], incoming = []) => {
    const set = new Set(ensureUidArray(base));
    ensureUidArray(incoming).forEach((uid) => set.add(uid));
    return Array.from(set);
};

export default {
    coerceUid,
    normalizeUserRef,
    ensureUidArray,
    mergeUidSets,
};
