let cachedMessages = [];
let cachedLatestByCid = Object.create(null);
let preloadPromise = null;
let preloadUid = null;
const listeners = new Set();

const cloneLatest = (src) => {
    const next = Object.create(null);
    if (!src) return next;
    Object.keys(src).forEach((key) => {
        next[key] = Array.isArray(src[key]) ? [...src[key]] : [];
    });
    return next;
};

const emit = () => {
    if (listeners.size === 0) return;
    const snapshotMessages = cachedMessages.slice();
    const snapshotLatest = cloneLatest(cachedLatestByCid);
    listeners.forEach((listener) => {
        try { listener(snapshotMessages, snapshotLatest); } catch { }
    });
};

const normalizeChat = (chat) => {
    if (!chat || typeof chat !== 'object') return null;
    const cid = String(chat.cid || chat.mid || chat.id || '');
    if (!cid) return null;
    const content = Array.isArray(chat.content) ? [...chat.content] : [];
    return {
        ...chat,
        cid,
        content,
    };
};

export const getMessagesCache = () => cachedMessages.slice();

export const getLatestByCidCache = () => cloneLatest(cachedLatestByCid);

export const subscribeMessagesCache = (listener) => {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    listener(getMessagesCache(), getLatestByCidCache());
    return () => { listeners.delete(listener); };
};

export const clearMessagesCache = () => {
    cachedMessages = [];
    cachedLatestByCid = Object.create(null);
    preloadPromise = null;
    preloadUid = null;
    emit();
};

export const hydrateMessagesCache = (incoming) => {
    const normalized = Array.isArray(incoming)
        ? incoming.map(normalizeChat).filter(Boolean)
        : [];

    cachedMessages = normalized;

    const nextLatest = cloneLatest(cachedLatestByCid);
    let changedLatest = false;
    normalized.forEach((chat) => {
        if (chat.content.length > 0) {
            nextLatest[chat.cid] = [...chat.content];
            changedLatest = true;
        } else if (!nextLatest[chat.cid]) {
            nextLatest[chat.cid] = [];
        }
    });
    if (changedLatest) {
        cachedLatestByCid = nextLatest;
    }

    emit();
    return cachedMessages.slice();
};

export const mergeLatestBatchIntoCache = (updates) => {
    if (!updates || typeof updates !== 'object') return getLatestByCidCache();
    const nextLatest = cloneLatest(cachedLatestByCid);
    let changed = false;

    Object.keys(updates).forEach((cid) => {
        const value = updates[cid];
        nextLatest[cid] = Array.isArray(value) ? [...value] : [];
        changed = true;
    });

    if (changed) {
        cachedLatestByCid = nextLatest;
        emit();
    }
    return getLatestByCidCache();
};

export const setMessagesPreloadState = ({ promise, uid }) => {
    preloadPromise = promise || null;
    preloadUid = uid || null;
};

export const getMessagesPreloadState = () => ({
    promise: preloadPromise,
    uid: preloadUid,
});
