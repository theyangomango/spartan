const LAST_PROMOTION_KEY = "__spartan_last_rank_promotion_key";
const LAST_PROMOTION_MAP = "__spartan_last_rank_promotion_map";

// Keep track of the last promotion per-user so one user's animation doesn't
// suppress another user's animation on the same device/session.
const resolveCurrentUserKey = () => {
    try {
        const uid = global?.userData?.uid || global?.userData?.id;
        return uid ? String(uid) : null;
    } catch {
        return null;
    }
};

const resolveRankKey = (entry) => {
    if (!entry) return "?";
    if (typeof entry.key === "string" && entry.key) return entry.key;
    const tier = entry.rankTier || entry.tier || "?";
    const level = entry.rankLevel || entry.level || "?";
    return `${tier}-${level}`;
};

export const buildRankPromotionKey = (fromEntry, toEntry) => {
    const fromKey = resolveRankKey(fromEntry);
    const toKey = resolveRankKey(toEntry);
    return `${fromKey}->${toKey}`;
};

export const registerRankPromotionKey = (key) => {
    if (!key) return false;
    const userKey = resolveCurrentUserKey();
    try {
        if (userKey) {
            if (typeof global[LAST_PROMOTION_MAP] !== "object" || !global[LAST_PROMOTION_MAP]) {
                global[LAST_PROMOTION_MAP] = {};
            }
            if (global[LAST_PROMOTION_MAP][userKey] === key) return false;
            global[LAST_PROMOTION_MAP][userKey] = key;
            return true;
        }
        if (global[LAST_PROMOTION_KEY] === key) return false;
        global[LAST_PROMOTION_KEY] = key;
        return true;
    } catch {
        return true;
    }
};

export const getLastRankPromotionKey = () => {
    try {
        const userKey = resolveCurrentUserKey();
        if (userKey && global[LAST_PROMOTION_MAP]) {
            return global[LAST_PROMOTION_MAP][userKey] || null;
        }
        return global[LAST_PROMOTION_KEY] || null;
    } catch {
        return null;
    }
};

export default {
    buildRankPromotionKey,
    registerRankPromotionKey,
    getLastRankPromotionKey,
};
