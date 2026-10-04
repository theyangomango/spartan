import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    collection,
    query,
    orderBy,
    limit,
    onSnapshot,
    startAfter,
    getDocs,
    doc,
} from 'firebase/firestore';
import { db } from '../../firebase.config';
import { ensureUidArray, getViewerUid } from '../utils/userRefs';
import {
    subscribeOptimisticFeedPosts,
    getOptimisticFeedPostsSnapshot,
    removeOptimisticFeedPost,
} from '../utils/optimisticFeedPosts';
import { FEED_CACHE_PREFIX } from './feedCache';
import {
    toStringUid,
    toStringPid,
    resolveTimestamp,
    workoutIdentityKey,
    normalizePost,
    cacheReplacer,
    parseCachedPosts,
    buildLiveFeedEntry,
} from './filteredFeedUtils';

const PAGE_SIZE_DEFAULT = 50;
const FEED_CACHE_LIMIT = 30;
const CACHE_WRITE_DELAY = 600;

export default function useFilteredFeed(followingUsers, pageSize = PAGE_SIZE_DEFAULT) {
    const [feed, setFeed] = useState([]);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hydratedFromCache, setHydratedFromCache] = useState(false);
    const [initialSyncComplete, setInitialSyncComplete] = useState(false);

    const myUid = (() => {
        const resolved = getViewerUid();
        return resolved ? resolved : null;
    })();

    const filtersRef = useRef({ allowed: new Set(), excluded: new Set() });
    const firstPageLastDocRef = useRef(null);
    const lastLoadedDocRef = useRef(null);
    const firstPageMapRef = useRef(new Map());
    const extraMapRef = useRef(new Map());
    const liveMapRef = useRef(new Map());
    const optimisticMapRef = useRef(new Map());
    const unsubscribeRef = useRef(null);
    const hasMoreRef = useRef(true);
    const loadingMoreRef = useRef(false);
    const liveUnsubRef = useRef(new Map());
    const livePostUnsubRef = useRef(new Map());
    const livePostMetaRef = useRef(new Map());
    const liveProfileRef = useRef(new Map());
    const liveWorkoutRef = useRef(new Map());
    const liveWorkoutKeyRef = useRef(new Map());
    const cacheKeyRef = useRef(null);
    const hydrationAttemptedRef = useRef(false);
    const cacheWriteTimeoutRef = useRef(null);
    const serverSyncedRef = useRef(false);

    const cacheKey = useMemo(() => (
        myUid ? `${FEED_CACHE_PREFIX}${myUid}` : null
    ), [myUid]);

    useEffect(() => {
        cacheKeyRef.current = cacheKey;
        hydrationAttemptedRef.current = false;
        setHydratedFromCache(false);
    }, [cacheKey]);

    useEffect(() => () => {
        if (cacheWriteTimeoutRef.current) {
            clearTimeout(cacheWriteTimeoutRef.current);
            cacheWriteTimeoutRef.current = null;
        }
    }, []);

    const scheduleCachePersist = useCallback((entries) => {
        if (!cacheKeyRef.current) return;
        if (!Array.isArray(entries) || entries.length === 0) return;

        const trimmed = entries
            .slice(0, FEED_CACHE_LIMIT)
            .map((entry) => normalizePost(entry, entry))
            .filter(Boolean);

        if (trimmed.length === 0) return;

        const serialized = JSON.stringify(trimmed, cacheReplacer);
        if (typeof serialized !== 'string') return;
        const key = cacheKeyRef.current;
        if (typeof key !== 'string' || key.length === 0) return;

        if (cacheWriteTimeoutRef.current) {
            clearTimeout(cacheWriteTimeoutRef.current);
        }

        cacheWriteTimeoutRef.current = setTimeout(() => {
            cacheWriteTimeoutRef.current = null;
            AsyncStorage.multiSet([[key, serialized]]).catch((error) => {
                console.warn('useFilteredFeed: failed to persist cache', { key, error });
            });
        }, CACHE_WRITE_DELAY);
    }, []);

    const teardownLivePostSubscription = useCallback((uid) => {
        const key = String(uid || '');
        if (!key) return;
        const unsub = livePostUnsubRef.current.get(key);
        if (unsub) {
            try { unsub(); } catch { }
        }
        livePostUnsubRef.current.delete(key);
        livePostMetaRef.current.delete(key);
    }, []);

    const recomputeFeed = useCallback((persistFlag) => {
        const combined = new Map();

        optimisticMapRef.current.forEach((value, key) => {
            if (value) combined.set(key, value);
        });

        liveMapRef.current.forEach((value, key) => {
            if (value) combined.set(key, value);
        });
        firstPageMapRef.current.forEach((value, key) => {
            if (value) combined.set(key, value);
        });
        extraMapRef.current.forEach((value, key) => {
            if (!combined.has(key) && value) {
                combined.set(key, value);
            }
        });

        const array = [];
        combined.forEach((value) => {
            const normalized = normalizePost(value, value);
            if (normalized) array.push(normalized);
        });

        array.sort((a, b) => {
            const liveA = Boolean(a?.isLive || a?.liveWorkout);
            const liveB = Boolean(b?.isLive || b?.liveWorkout);
            if (liveA !== liveB) {
                return liveA ? -1 : 1;
            }
            const sortA = typeof a?.sortKey === 'number' ? a.sortKey : resolveTimestamp(a);
            const sortB = typeof b?.sortKey === 'number' ? b.sortKey : resolveTimestamp(b);
            if (sortA !== sortB) return sortB - sortA;
            const pidA = toStringPid(a?.pid || a?.id);
            const pidB = toStringPid(b?.pid || b?.id);
            return pidB.localeCompare(pidA);
        });

        setFeed(array);

        if (optimisticMapRef.current.size > 0) {
            const realPidSet = new Set();
            firstPageMapRef.current.forEach((value) => {
                const pid = toStringPid(value?.pid || value?.id);
                if (pid) realPidSet.add(pid);
            });
            extraMapRef.current.forEach((value) => {
                const pid = toStringPid(value?.pid || value?.id);
                if (pid) realPidSet.add(pid);
            });
            liveMapRef.current.forEach((value) => {
                const pid = toStringPid(value?.pid || value?.id);
                if (pid) realPidSet.add(pid);
            });
            if (realPidSet.size > 0) {
                const cleanup = [];
                optimisticMapRef.current.forEach((value, key) => {
                    if (key && realPidSet.has(key)) {
                        cleanup.push(key);
                    }
                });
                if (cleanup.length) {
                    setTimeout(() => {
                        cleanup.forEach((pid) => removeOptimisticFeedPost(pid));
                    }, 0);
                }
            }
        }

        const shouldPersist = typeof persistFlag === 'boolean'
            ? persistFlag
            : serverSyncedRef.current;

        if (shouldPersist && array.length) {
            scheduleCachePersist(array);
        }
    }, [scheduleCachePersist]);

    const updateLiveEntryForUid = useCallback((uid, { recompute = true } = {}) => {
        const key = String(uid || '');
        if (!key) return;

        const workout = liveWorkoutRef.current.get(key);
        const profile = liveProfileRef.current.get(key);
        if (!workout || !profile) {
            liveMapRef.current.delete(`live:${key}`);
            liveWorkoutKeyRef.current.delete(key);
            if (recompute) recomputeFeed(false);
            return;
        }

        const workoutKey = workoutIdentityKey(workout, key);
        const prevWorkoutKey = liveWorkoutKeyRef.current.get(key) || '';
        const sameWorkout = workoutKey && prevWorkoutKey && workoutKey === prevWorkoutKey;
        if (!sameWorkout) {
            livePostMetaRef.current.delete(key);
            liveMapRef.current.delete(`live:${key}`);
        }
        liveWorkoutKeyRef.current.set(key, workoutKey || '');

        const postMeta = livePostMetaRef.current.get(key) || null;
        const existing = liveMapRef.current.get(`live:${key}`) || null;
        const entry = buildLiveFeedEntry(key, profile, workout, postMeta, existing);
        const normalized = normalizePost(entry, existing);

        if (normalized) {
            liveMapRef.current.set(`live:${key}`, normalized);
        } else {
            liveMapRef.current.delete(`live:${key}`);
        }

        if (recompute) recomputeFeed(false);
    }, [buildLiveFeedEntry, recomputeFeed]);

    const ensureLivePostSubscription = useCallback((uid) => {
        const key = String(uid || '');
        if (!key || livePostUnsubRef.current.has(key)) return;
        const pid = `workout:live:${key}`;
        try {
            const unsubscribe = onSnapshot(doc(db, 'posts', pid), (snapshot) => {
                if (snapshot.exists()) {
                    livePostMetaRef.current.set(key, snapshot.data() || {});
                } else {
                    livePostMetaRef.current.delete(key);
                }
                updateLiveEntryForUid(key);
            });
            livePostUnsubRef.current.set(key, () => {
                try { unsubscribe(); } catch { }
            });
        } catch {
            /* ignore subscription errors */
        }
    }, [updateLiveEntryForUid]);

    useEffect(() => {
        const applyOptimisticEntries = (entries) => {
            const allowed = filtersRef.current?.allowed || new Set();
            const excluded = filtersRef.current?.excluded || new Set();
            const next = new Map();
            entries.forEach((entry) => {
                if (!entry) return;
                const uid = toStringUid(entry?.uid);
                if (!uid) return;
                if (allowed.size && !allowed.has(uid)) return;
                if (excluded.has(uid)) return;
                const prev = optimisticMapRef.current.get(entry.pid) || entry;
                const normalized = normalizePost(entry, prev);
                if (normalized) {
                    normalized.pendingUpload = entry.pendingUpload !== false;
                    normalized.isOptimistic = true;
                    next.set(normalized.pid, normalized);
                }
            });
            optimisticMapRef.current = next;
            recomputeFeed(false);
        };

        applyOptimisticEntries(getOptimisticFeedPostsSnapshot());
        const unsubscribe = subscribeOptimisticFeedPosts(applyOptimisticEntries);
        return () => {
            try { unsubscribe?.(); } catch { }
            optimisticMapRef.current = new Map();
            recomputeFeed(false);
        };
    }, [recomputeFeed]);

    const cleanupLiveSubscriptions = useCallback(() => {
        liveUnsubRef.current.forEach((unsub) => {
            try { unsub(); } catch { }
        });
        liveUnsubRef.current.clear();

        livePostUnsubRef.current.forEach((unsub) => {
            try { unsub(); } catch { }
        });
        livePostUnsubRef.current.clear();
        livePostMetaRef.current.clear();
        liveProfileRef.current.clear();
        liveWorkoutRef.current.clear();
        liveWorkoutKeyRef.current.clear();
    }, []);

    useEffect(() => {
        const followingArray = Array.isArray(followingUsers) ? followingUsers : [];
        const allowed = new Set(
            followingArray
                .map(toStringUid)
                .filter(Boolean)
        );
        if (myUid) allowed.add(myUid);

        const myBlocked = ensureUidArray(global?.userData?.blockedUidList || global?.userData?.blocked);
        const myBlockedBy = ensureUidArray(global?.userData?.blockedByUidList || global?.userData?.blockedBy);
        const excluded = new Set(
            [...myBlocked, ...myBlockedBy].filter(Boolean)
        );

        filtersRef.current = { allowed, excluded };

        if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
        }

        cleanupLiveSubscriptions();
        liveMapRef.current = new Map();

        firstPageMapRef.current = new Map();
        extraMapRef.current = new Map();
        firstPageLastDocRef.current = null;
        lastLoadedDocRef.current = null;
        hasMoreRef.current = true;
        loadingMoreRef.current = false;

        recomputeFeed(false);

        serverSyncedRef.current = false;
        setInitialSyncComplete(false);
        setHasMore(true);
        setLoadingMore(false);

        let cancelled = false;

        const hydrateFromCache = async () => {
            if (hydrationAttemptedRef.current) return;
            hydrationAttemptedRef.current = true;

            if (!cacheKeyRef.current) {
                if (!cancelled) setHydratedFromCache(true);
                return;
            }

            try {
                const raw = await AsyncStorage.getItem(cacheKeyRef.current);
                if (cancelled) return;
                const cached = parseCachedPosts(raw, allowed, excluded);
                if (cached.length) {
                    setFeed(cached);
                }
            } catch (error) {
                if (!cancelled) {
                    console.warn('useFilteredFeed: failed to hydrate cache', error);
                }
            } finally {
                if (!cancelled) {
                    setHydratedFromCache(true);
                }
            }
        };

        hydrateFromCache();

        if (allowed.size === 0) {
            hydrationAttemptedRef.current = true;
            serverSyncedRef.current = true;
            setFeed([]);
            setHasMore(false);
            setLoadingMore(false);
            setHydratedFromCache(true);
            setInitialSyncComplete(true);
            return () => {
                cancelled = true;
            };
        }

        const allowedArray = Array.from(allowed);

        const syncLiveSubscriptions = () => {
            let changed = false;
            const toRemove = [];
            liveUnsubRef.current.forEach((_unsub, uid) => {
                if (!allowed.has(uid) || excluded.has(uid)) {
                    toRemove.push(uid);
                }
            });

            toRemove.forEach((uid) => {
                const key = String(uid);
                const unsub = liveUnsubRef.current.get(key);
                if (unsub) {
                    try { unsub(); } catch { }
                }
                liveUnsubRef.current.delete(key);
                liveMapRef.current.delete(`live:${key}`);
                liveProfileRef.current.delete(key);
                liveWorkoutRef.current.delete(key);
                liveWorkoutKeyRef.current.delete(key);
                teardownLivePostSubscription(key);
                changed = true;
            });

            const localUnsubs = new Map();

            allowedArray.forEach((rawUid) => {
                const uid = String(rawUid);
                if (!uid || excluded.has(uid) || liveUnsubRef.current.has(uid) || localUnsubs.has(uid)) return;
                try {
                    const unsubscribeUser = onSnapshot(doc(db, 'usersPublic', uid), (snapshot) => {
                        const data = snapshot.data() || {};
                        const workout = data.currentWorkout || null;
                        const { allowed: allowedSet, excluded: excludedSet } = filtersRef.current;
                        if (!allowedSet.has(uid) || excludedSet.has(uid)) {
                            liveMapRef.current.delete(`live:${uid}`);
                            liveProfileRef.current.delete(uid);
                            liveWorkoutRef.current.delete(uid);
                            liveWorkoutKeyRef.current.delete(uid);
                            teardownLivePostSubscription(uid);
                            recomputeFeed(false);
                            return;
                        }
                        liveProfileRef.current.set(uid, data);
                        if (workout) {
                            liveWorkoutRef.current.set(uid, workout);
                            const nextKey = workoutIdentityKey(workout, uid);
                            const prevKey = liveWorkoutKeyRef.current.get(uid) || '';
                            if (nextKey !== prevKey) {
                                livePostMetaRef.current.delete(uid);
                                liveMapRef.current.delete(`live:${uid}`);
                            }
                            liveWorkoutKeyRef.current.set(uid, nextKey || '');
                            ensureLivePostSubscription(uid);
                        } else {
                            liveWorkoutRef.current.delete(uid);
                            liveWorkoutKeyRef.current.delete(uid);
                            teardownLivePostSubscription(uid);
                            livePostMetaRef.current.delete(uid);
                            liveMapRef.current.delete(`live:${uid}`);
                        }
                        updateLiveEntryForUid(uid);
                    });
                    localUnsubs.set(uid, () => {
                        try { unsubscribeUser(); } catch { }
                    });
                } catch {
                    /* ignore subscribe error */
                }
            });

            localUnsubs.forEach((unsub, uid) => {
                liveUnsubRef.current.set(uid, unsub);
            });

            if (changed) {
                recomputeFeed(false);
            }
        };

        syncLiveSubscriptions();

        const postsRef = collection(db, 'posts');
        const baseQuery = query(postsRef, orderBy('created', 'desc'), limit(pageSize));

        const unsubscribe = onSnapshot(baseQuery, (snapshot) => {
            const { allowed: allowedSet, excluded: excludedSet } = filtersRef.current;
            const newFirstPageMap = new Map();

            snapshot.docs.forEach((docSnap) => {
                const docId = docSnap.id;
                if (typeof docId === "string" && docId.startsWith("workout:live:")) {
                    return;
                }
                const data = docSnap.data();
                const uid = toStringUid(data?.uid);
                if (!uid || !allowedSet.has(uid) || excludedSet.has(uid)) {
                    return;
                }
                const prev = firstPageMapRef.current.get(docSnap.id) || null;
                const merged = { ...prev, ...data, pid: data?.pid ?? docSnap.id };
                const normalized = normalizePost(merged, prev);
                if (normalized) {
                    newFirstPageMap.set(docSnap.id, normalized);
                    if (extraMapRef.current.has(docSnap.id)) {
                        extraMapRef.current.set(docSnap.id, normalized);
                    }
                }
            });

            firstPageMapRef.current = newFirstPageMap;
            if (snapshot.docs.length > 0) {
                const lastDoc = snapshot.docs[snapshot.docs.length - 1];
                firstPageLastDocRef.current = lastDoc;
                if (!lastLoadedDocRef.current) {
                    lastLoadedDocRef.current = lastDoc;
                }
            }

            if (extraMapRef.current.size === 0) {
                const canLoadMore = snapshot.docs.length === pageSize;
                hasMoreRef.current = canLoadMore;
                setHasMore(canLoadMore);
            }

            if (!serverSyncedRef.current) {
                serverSyncedRef.current = true;
                setInitialSyncComplete(true);
            }

            recomputeFeed(true);
        });

        unsubscribeRef.current = () => {
            try { unsubscribe(); } catch { }
        };

        return () => {
            cancelled = true;
            if (unsubscribeRef.current) {
                try { unsubscribeRef.current(); } catch { }
                unsubscribeRef.current = null;
            }
            cleanupLiveSubscriptions();
            liveMapRef.current = new Map();
            recomputeFeed(false);
        };
    }, [
        recomputeFeed,
        cleanupLiveSubscriptions,
        updateLiveEntryForUid,
        ensureLivePostSubscription,
        teardownLivePostSubscription,
        JSON.stringify(
            Array.isArray(followingUsers)
                ? followingUsers.map((u) => (u?.uid || u))
                : []
        ),
        pageSize,
        myUid,
        cacheKey,
    ]);

    const loadMore = useCallback(async () => {
        if (loadingMoreRef.current) return;
        if (!hasMoreRef.current) return;

        const startDoc = lastLoadedDocRef.current || firstPageLastDocRef.current;
        if (!startDoc) return;

        loadingMoreRef.current = true;
        setLoadingMore(true);

        try {
            const postsRef = collection(db, 'posts');
            const pagedQuery = query(
                postsRef,
                orderBy('created', 'desc'),
                startAfter(startDoc),
                limit(pageSize),
            );

            const snapshot = await getDocs(pagedQuery);
            const { allowed, excluded } = filtersRef.current;
            let appended = false;

            snapshot.docs.forEach((docSnap) => {
                const docId = docSnap.id;
                if (typeof docId === "string" && docId.startsWith("workout:live:")) {
                    return;
                }
                const data = docSnap.data();
                const uid = toStringUid(data?.uid);
                if (!uid || !allowed.has(uid) || excluded.has(uid)) {
                    return;
                }
                const prev = extraMapRef.current.get(docSnap.id)
                    || firstPageMapRef.current.get(docSnap.id)
                    || null;
                const merged = { ...prev, ...data, pid: data?.pid ?? docSnap.id };
                const normalized = normalizePost(merged, prev);
                if (normalized) {
                    extraMapRef.current.set(docSnap.id, normalized);
                    appended = true;
                }
            });

            if (snapshot.docs.length > 0) {
                lastLoadedDocRef.current = snapshot.docs[snapshot.docs.length - 1];
            }

            const moreAvailable = snapshot.docs.length === pageSize;
            hasMoreRef.current = moreAvailable;
            setHasMore(moreAvailable);

            if (appended) {
                recomputeFeed(true);
            }
        } finally {
            loadingMoreRef.current = false;
            setLoadingMore(false);
        }
    }, [pageSize, recomputeFeed]);

    return {
        posts: feed,
        loadMore,
        hasMore,
        loadingMore,
        hydratedFromCache,
        initialSyncComplete,
    };
}
