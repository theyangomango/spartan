import { createWithEqualityFn } from 'zustand/traditional';
import { collection, query, orderBy, limit, onSnapshot, startAfter, getDocs } from 'firebase/firestore';
import { db } from '../../firebase.config';

const PAGE_SIZE = 20;

const initialState = {
    ready: false,
    events: [],
    hasMore: true,
    loadingMore: false,
    newLikes: 0,
    newComments: 0,
};

export const useNotificationsStore = createWithEqualityFn((set) => ({
    ...initialState,
}));

let activeUid = null;
let unsubscribe = null;
let lastDoc = null;
let hasLoadedMore = false;

const computeCounts = (events = []) => {
    let likes = 0;
    let comments = 0;
    for (const item of events) {
        if (item?.read) break;
        if (item?.type?.startsWith('liked')) likes += 1;
        if (item?.type === 'comment' || item?.type === 'replied-comment') comments += 1;
    }
    return { likes, comments };
};

const applySnapshot = (docs) => {
    useNotificationsStore.setState((state) => {
        const snapshotIds = new Set(docs.map((doc) => doc.id));
        const tail = state.events.filter((evt) => !snapshotIds.has(evt.id));
        const nextEvents = [...docs, ...tail];
        const counts = computeCounts(nextEvents);
        const update = {
            events: nextEvents,
            ready: true,
            newLikes: counts.likes,
            newComments: counts.comments,
        };
        if (!hasLoadedMore) {
            update.hasMore = docs.length === PAGE_SIZE;
        }
        return { ...state, ...update };
    });
};

export const ensureNotificationsListener = (uid) => {
    const normalizedUid = uid ? String(uid) : '';
    if (!normalizedUid) {
        stopNotificationsListener();
        return;
    }

    if (activeUid === normalizedUid && unsubscribe) {
        return;
    }

    stopNotificationsListener();

    activeUid = normalizedUid;
    lastDoc = null;
    hasLoadedMore = false;
    useNotificationsStore.setState({ ...initialState, ready: false });

    try {
        const notifRef = collection(db, 'users', normalizedUid, 'notifications');
        const notifQuery = query(notifRef, orderBy('timestamp', 'desc'), limit(PAGE_SIZE));
        unsubscribe = onSnapshot(notifQuery, (snapshot) => {
            const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }));
            lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
            applySnapshot(docs);
        }, () => {
            useNotificationsStore.setState((state) => ({ ...state, ready: true }));
        });
    } catch {
        useNotificationsStore.setState((state) => ({ ...state, ready: true }));
    }
};

export const stopNotificationsListener = () => {
    if (unsubscribe) {
        try { unsubscribe(); } catch { }
    }
    unsubscribe = null;
    activeUid = null;
    lastDoc = null;
    hasLoadedMore = false;
    useNotificationsStore.setState({ ...initialState });
};

export const loadMoreNotifications = async () => {
    if (!activeUid || !lastDoc || useNotificationsStore.getState().loadingMore || !useNotificationsStore.getState().hasMore) {
        return;
    }

    useNotificationsStore.setState((state) => (state.loadingMore ? state : { ...state, loadingMore: true }));

    try {
        const notifRef = collection(db, 'users', activeUid, 'notifications');
        const q = query(
            notifRef,
            orderBy('timestamp', 'desc'),
            startAfter(lastDoc),
            limit(PAGE_SIZE)
        );
        const snap = await getDocs(q);
        const more = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }));

        if (more.length === 0) {
            useNotificationsStore.setState((state) => ({ ...state, loadingMore: false, hasMore: false }));
            hasLoadedMore = true;
            return;
        }

        lastDoc = snap.docs[snap.docs.length - 1] || lastDoc;
        hasLoadedMore = true;

        useNotificationsStore.setState((state) => {
            const seen = new Set(state.events.map((evt) => evt.id));
            const filtered = more.filter((item) => !seen.has(item.id));
            if (filtered.length === 0) {
                return {
                    ...state,
                    loadingMore: false,
                    hasMore: snap.docs.length === PAGE_SIZE,
                };
            }
            const events = [...state.events, ...filtered];
            const counts = computeCounts(events);
            return {
                ...state,
                events,
                loadingMore: false,
                hasMore: snap.docs.length === PAGE_SIZE,
                newLikes: counts.likes,
                newComments: counts.comments,
            };
        });
    } catch {
        useNotificationsStore.setState((state) => ({ ...state, loadingMore: false }));
    }
};

export const updateNotificationEvent = (id, updater) => {
    const safeId = String(id || '');
    if (!safeId) return;

    useNotificationsStore.setState((state) => {
        const idx = state.events.findIndex((evt) => String(evt?.id || '') === safeId);
        if (idx === -1) return state;
        const events = state.events.slice();
        const current = events[idx];
        const next = typeof updater === 'function'
            ? updater(current)
            : { ...current, ...(updater || {}) };
        if (!next) return state;
        events[idx] = next;
        const counts = computeCounts(events);
        return {
            ...state,
            events,
            newLikes: counts.likes,
            newComments: counts.comments,
        };
    });
};

export const markAllNotificationsReadLocal = () => {
    useNotificationsStore.setState((state) => {
        if (!state.events.length) return state;
        const events = state.events.map((evt) => (evt?.read ? evt : { ...evt, read: true }));
        return {
            ...state,
            events,
            newLikes: 0,
            newComments: 0,
        };
    });
};

export const getNotificationsState = () => useNotificationsStore.getState();

export default useNotificationsStore;
