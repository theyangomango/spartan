import { computeRankProgressFromData, LADDER_LEVELS } from "../../shared/rankProgress.js";
import { buildRankPromotionKey, registerRankPromotionKey } from "./rankPromotionEvents";

const GLOBAL_KEY = "__userDataSubscribers";
const PROMOTION_SUBSCRIBERS_KEY = "__rankPromotionSubscribers";
const PROMOTION_QUEUE_KEY = "__rankPromotionQueue";

const getSet = () => {
    try {
        if (!global[GLOBAL_KEY]) {
            Object.defineProperty(global, GLOBAL_KEY, {
                value: new Set(),
                configurable: true,
                enumerable: false,
                writable: false,
            });
        }
        return global[GLOBAL_KEY];
    } catch {
        return null;
    }
};

const getPromotionSubscribers = () => {
    try {
        if (!global[PROMOTION_SUBSCRIBERS_KEY]) {
            Object.defineProperty(global, PROMOTION_SUBSCRIBERS_KEY, {
                value: new Set(),
                configurable: true,
                enumerable: false,
                writable: false,
            });
        }
        return global[PROMOTION_SUBSCRIBERS_KEY];
    } catch {
        return null;
    }
};

const getPromotionQueue = () => {
    try {
        if (!Array.isArray(global[PROMOTION_QUEUE_KEY])) {
            Object.defineProperty(global, PROMOTION_QUEUE_KEY, {
                value: [],
                configurable: true,
                enumerable: false,
                writable: true,
            });
        }
        return global[PROMOTION_QUEUE_KEY];
    } catch {
        return [];
    }
};

const notifyPromotionSubscribers = () => {
    const subs = getPromotionSubscribers();
    if (!subs) return;
    const snapshot = getPromotionQueue().slice();
    subs.forEach((listener) => {
        try { listener(snapshot); } catch { }
    });
};

const buildPromotionSteps = (fromEntry, toEntry) => {
    if (!fromEntry || !toEntry || fromEntry.key === toEntry.key) return [];
    const fromIndex = LADDER_LEVELS.findIndex((item) => item.key === fromEntry.key);
    const toIndex = LADDER_LEVELS.findIndex((item) => item.key === toEntry.key);
    if (fromIndex === -1 || toIndex === -1) {
        return [{ from: fromEntry, to: toEntry }];
    }
    const step = toIndex > fromIndex ? 1 : -1;
    const steps = [];
    let currentIndex = fromIndex;
    while (currentIndex !== toIndex) {
        const nextIndex = currentIndex + step;
        const nextEntry = LADDER_LEVELS[nextIndex];
        const currentEntry = LADDER_LEVELS[currentIndex];
        if (!nextEntry || !currentEntry) break;
        steps.push({ from: currentEntry, to: nextEntry });
        currentIndex = nextIndex;
    }
    return Array.isArray(steps) && steps.length ? steps : [{ from: fromEntry, to: toEntry }];
};

const buildRankSnapshot = (user) => {
    try {
        const completedWorkouts = Array.isArray(user?.completedWorkouts)
            ? user.completedWorkouts.filter(Boolean)
            : [];
        const statsHexagon = user?.statsHexagon;
        const progress = computeRankProgressFromData({ completedWorkouts, statsHexagon });
        const entry = progress?.currentRankEntry || null;
        const index = Number.isFinite(progress?.currentRankIndexDesc)
            ? progress.currentRankIndexDesc
            : null;
        return { entry, index };
    } catch {
        return { entry: null, index: null };
    }
};

const resolveUserKey = (payload) => {
    try {
        const uid = payload?.uid || payload?.id;
        return uid ? String(uid) : null;
    } catch {
        return null;
    }
};

let lastRankSnapshot = null;
let lastRankUserKey = null;

const detectAndQueuePromotion = (payload) => {
    const nextSnapshot = buildRankSnapshot(payload);
    const userKey = resolveUserKey(payload);

    // Reset tracking on user switch or logout
    if (!userKey || (lastRankUserKey && userKey !== lastRankUserKey)) {
        try {
            global[PROMOTION_QUEUE_KEY] = [];
            notifyPromotionSubscribers();
        } catch { }
        lastRankSnapshot = nextSnapshot;
        lastRankUserKey = userKey || null;
        return;
    }

    if (lastRankSnapshot?.entry && nextSnapshot.entry && nextSnapshot.entry.key !== lastRankSnapshot.entry.key) {
        const promoted =
            typeof lastRankSnapshot.index === "number" && typeof nextSnapshot.index === "number"
                ? nextSnapshot.index < lastRankSnapshot.index
                : true;
        if (promoted) {
            const promotionKey = buildRankPromotionKey(lastRankSnapshot.entry, nextSnapshot.entry);
            const isNew = registerRankPromotionKey(promotionKey);
            if (isNew) {
                const steps = buildPromotionSteps(lastRankSnapshot.entry, nextSnapshot.entry);
                const queue = getPromotionQueue();
                queue.push(...steps);
                notifyPromotionSubscribers();
            }
        }
    }

    lastRankSnapshot = nextSnapshot;
    lastRankUserKey = userKey;
};

export const subscribeRankPromotions = (listener) => {
    if (typeof listener !== "function") return () => {};
    const subs = getPromotionSubscribers();
    if (!subs) return () => {};
    subs.add(listener);
    try { listener(getPromotionQueue().slice()); } catch { listener([]); }
    return () => {
        const collection = getPromotionSubscribers();
        if (!collection) return;
        collection.delete(listener);
    };
};

export const dequeueRankPromotion = () => {
    try {
        const queue = getPromotionQueue();
        if (!queue.length) return null;
        const [first, ...rest] = queue;
        global[PROMOTION_QUEUE_KEY] = rest;
        notifyPromotionSubscribers();
        return first;
    } catch {
        return null;
    }
};

export const emitUserDataUpdate = () => {
    const set = getSet();
    if (!set) return;
    const payload = (() => {
        try { return global?.userData || null; } catch { return null; }
    })();
    detectAndQueuePromotion(payload);
    set.forEach((listener) => {
        try { listener(payload); } catch { }
    });
};

export const subscribeUserData = (listener) => {
    if (typeof listener !== "function") return () => {};
    const set = getSet();
    if (!set) return () => {};
    set.add(listener);
    try { listener(global?.userData || null); } catch { listener(null); }
    return () => {
        const collection = getSet();
        if (!collection) return;
        collection.delete(listener);
    };
};

export default {
    emitUserDataUpdate,
    subscribeUserData,
    subscribeRankPromotions,
    dequeueRankPromotion,
};
