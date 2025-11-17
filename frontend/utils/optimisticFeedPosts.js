const optimisticPosts = new Map();
const listeners = new Set();
let cleanTimeout = null;
const EXPIRE_AFTER_MS = 2 * 60 * 1000; // fallback cleanup

const nowMs = () => Date.now();

const normalizeString = (value) => {
    if (value === undefined || value === null) return "";
    const str = String(value);
    return str.trim();
};

const emit = () => {
    const snapshot = Array.from(optimisticPosts.values());
    listeners.forEach((listener) => {
        try {
            listener(snapshot);
        } catch (error) {
            console.warn?.("optimisticFeedPosts listener failed", error);
        }
    });
};

const scheduleCleanup = () => {
    if (cleanTimeout) return;
    cleanTimeout = setTimeout(() => {
        cleanTimeout = null;
        const cutoff = nowMs() - EXPIRE_AFTER_MS;
        let removed = false;
        optimisticPosts.forEach((entry, key) => {
            if (!entry) return;
            const created = Number(entry.created || entry.createdAt || 0);
            if (created && created < cutoff) {
                optimisticPosts.delete(key);
                removed = true;
            }
        });
        if (removed) emit();
    }, EXPIRE_AFTER_MS);
};

const normalizePost = (post) => {
    if (!post || typeof post !== "object") return null;
    const pid = normalizeString(post.pid || post.id);
    const uid = normalizeString(post.uid);
    if (!pid || !uid) return null;
    const created = Number(post.created || post.createdAt || Date.now()) || Date.now();
    const normalized = {
        ...post,
        pid,
        id: pid,
        uid,
        created,
        createdAt: post.createdAt || created,
        sortKey: Number(post.sortKey) || created,
        pendingUpload: post.pendingUpload !== false,
        isOptimistic: true,
    };
    return normalized;
};

export function addOptimisticFeedPost(post) {
    const normalized = normalizePost(post);
    if (!normalized) return null;
    optimisticPosts.set(normalized.pid, normalized);
    emit();
    scheduleCleanup();
    return normalized;
}

export function updateOptimisticFeedPost(pid, updates) {
    const key = normalizeString(pid);
    if (!key || !optimisticPosts.has(key)) return;
    const existing = optimisticPosts.get(key);
    optimisticPosts.set(key, normalizePost({ ...existing, ...updates }) || existing);
    emit();
}

export function removeOptimisticFeedPost(pid) {
    const key = normalizeString(pid);
    if (!key) return;
    if (optimisticPosts.delete(key)) {
        emit();
    }
}

export function getOptimisticFeedPostsSnapshot() {
    return Array.from(optimisticPosts.values());
}

export function subscribeOptimisticFeedPosts(listener) {
    if (typeof listener !== "function") return () => {};
    listeners.add(listener);
    try {
        listener(getOptimisticFeedPostsSnapshot());
    } catch {
        /* listener error ignored */
    }
    return () => {
        listeners.delete(listener);
    };
}

export default {
    addOptimisticFeedPost,
    updateOptimisticFeedPost,
    removeOptimisticFeedPost,
    subscribeOptimisticFeedPosts,
    getOptimisticFeedPostsSnapshot,
};
