/**
 * Shared helpers for working with user references across the client-side
 * backend helpers. Normalises objects stored in Firestore arrays (blocked,
 * followers, tribe members, etc.) so arrayUnion/arrayRemove operations stay
 * reliable regardless of the structure that triggered them.
 */

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
];

export const coerceUid = (input) => {
    if (input === null || input === undefined) return "";
    if (typeof input === "string" || typeof input === "number") {
        const value = String(input).trim();
        return value || "";
    }
    if (typeof input !== "object") return "";
    for (const key of UID_KEYS) {
        if (Object.prototype.hasOwnProperty.call(input, key)) {
            const coerced = coerceUid(input[key]);
            if (coerced) return coerced;
        }
    }
    return "";
};

export const ensureUidArray = (list) => {
    if (!Array.isArray(list)) return [];
    const out = [];
    const seen = new Set();
    for (const entry of list) {
        const uid = coerceUid(entry);
        if (!uid || seen.has(uid)) continue;
        seen.add(uid);
        out.push(uid);
    }
    return out;
};
