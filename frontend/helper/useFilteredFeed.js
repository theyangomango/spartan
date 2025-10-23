import { useCallback, useEffect, useRef, useState } from 'react';
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

const PAGE_SIZE_DEFAULT = 50;

const toStringUid = (value) => {
    if (value == null) return '';
    if (typeof value === 'object' && value?.uid) return String(value.uid).trim();
    return String(value).trim();
};

const resolveTimestamp = (item) => {
    if (!item) return 0;
    const candidates = [
        item?.created,
        item?.createdAt,
        item?.updatedAt,
        item?.workout?.created,
        item?.workout?.createdAt,
        item?.workout?.completedAt,
        item?.workout?.finishedAt,
    ];
    for (const value of candidates) {
        if (!value) continue;
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            const parsed = Date.parse(value);
            if (Number.isFinite(parsed)) return parsed;
            continue;
        }
        if (value instanceof Date) return value.getTime();
        if (typeof value?.toMillis === 'function') {
            const millis = value.toMillis();
            if (Number.isFinite(millis)) return millis;
        }
    }
    return 0;
};

export default function useFilteredFeed(followingUsers, pageSize = PAGE_SIZE_DEFAULT) {
    const [feed, setFeed] = useState([]);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const myUid = global?.userData?.uid ? String(global.userData.uid) : null;

    const filtersRef = useRef({ allowed: new Set(), excluded: new Set() });
    const firstPageLastDocRef = useRef(null);
    const lastLoadedDocRef = useRef(null);
    const firstPageMapRef = useRef(new Map());
    const extraMapRef = useRef(new Map());
    const liveMapRef = useRef(new Map());
    const unsubscribeRef = useRef(null);
    const hasMoreRef = useRef(true);
    const loadingMoreRef = useRef(false);
    const liveUnsubRef = useRef(new Map());

    const cleanupLiveSubscriptions = useCallback(() => {
        liveUnsubRef.current.forEach((unsub) => {
            try { unsub(); } catch { }
        });
        liveUnsubRef.current.clear();
    }, []);

    const ensureHandle = useCallback((profile, uid) => {
        const candidates = [
            profile?.handle,
            profile?.username,
            profile?.displayHandle,
            profile?.tag,
            profile?.name ? profile.name.replace(/\s+/g, "") : null,
        ];
        for (const value of candidates) {
            if (!value && value !== 0) continue;
            const str = String(value).trim();
            if (str) {
                return str.startsWith("@") ? str : `@${str}`;
            }
        }
        const suffix = uid ? String(uid).slice(-4) : "user";
        return `@${suffix}`;
    }, []);

    const buildLiveFeedEntry = useCallback((uid, profile, workout) => {
        if (!uid || !workout) return null;

        const createdMs = resolveTimestamp(workout) || Date.now();
        const normalizedWorkout = {
            ...workout,
            created: workout?.created ?? workout?.createdAt ?? createdMs,
            createdAt: workout?.createdAt ?? workout?.created ?? createdMs,
            isLive: true,
            live: true,
            duration: Number(workout?.duration) || Math.max(0, Date.now() - createdMs),
            volume: Number(workout?.volume) || 0,
            PBs: Number(workout?.PBs ?? workout?.pbs ?? 0),
        };

        return {
            pid: `workout:live:${uid}`,
            id: `workout:live:${uid}`,
            uid,
            handle: ensureHandle(profile, uid),
            pfp: profile?.pfp || profile?.pfpUrl || profile?.photoURL || profile?.image || "",
            pfpVersion: profile?.pfpVersion || profile?.profileImageVersion || 0,
            created: createdMs,
            updatedAt: Date.now(),
            caption: workout?.caption || workout?.note || "",
            media: [],
            likes: [],
            likeCount: 0,
            comments: [],
            commentCount: 0,
            workout: normalizedWorkout,
            isLive: true,
            liveWorkout: true,
        };
    }, [ensureHandle]);

    const recomputeFeed = useCallback(() => {
        const combined = new Map();
        liveMapRef.current.forEach((value, key) => {
            combined.set(key, value);
        });
        firstPageMapRef.current.forEach((value, key) => {
            combined.set(key, value);
        });
        extraMapRef.current.forEach((value, key) => {
            if (!combined.has(key)) {
                combined.set(key, value);
            }
        });
        const array = Array.from(combined.values());
        array.sort((a, b) => {
            const liveA = Boolean(a?.isLive || a?.liveWorkout);
            const liveB = Boolean(b?.isLive || b?.liveWorkout);
            if (liveA !== liveB) {
                return liveA ? -1 : 1;
            }
            return resolveTimestamp(b) - resolveTimestamp(a);
        });
        setFeed(array);
    }, []);

    useEffect(() => {
        const followingArray = Array.isArray(followingUsers) ? followingUsers : [];
        const allowed = new Set(
            followingArray
                .map(toStringUid)
                .filter(Boolean)
        );
        if (myUid) allowed.add(myUid);

        const myBlocked = Array.isArray(global?.userData?.blocked) ? global.userData.blocked : [];
        const myBlockedBy = Array.isArray(global?.userData?.blockedBy) ? global.userData.blockedBy : [];
        const excluded = new Set(
            [
                ...myBlocked.map(toStringUid),
                ...myBlockedBy.map(toStringUid),
            ].filter(Boolean)
        );

        filtersRef.current = { allowed, excluded };

        if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
        }

        cleanupLiveSubscriptions();
        liveMapRef.current = new Map();
        recomputeFeed();

        firstPageMapRef.current = new Map();
        extraMapRef.current = new Map();
        firstPageLastDocRef.current = null;
        lastLoadedDocRef.current = null;
        hasMoreRef.current = true;
        loadingMoreRef.current = false;

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
                const unsub = liveUnsubRef.current.get(uid);
                if (unsub) {
                    try { unsub(); } catch { }
                }
                liveUnsubRef.current.delete(uid);
                liveMapRef.current.delete(`live:${uid}`);
                changed = true;
            });

            const localUnsubs = new Map();

            allowedArray.forEach((rawUid) => {
                const uid = String(rawUid);
                if (!uid || excluded.has(uid) || liveUnsubRef.current.has(uid) || localUnsubs.has(uid)) return;
                try {
                    const unsubscribeUser = onSnapshot(doc(db, 'users', uid), (snapshot) => {
                        const data = snapshot.data() || {};
                        const workout = data.currentWorkout || null;
                        const { allowed: allowedSet, excluded: excludedSet } = filtersRef.current;
                        if (!allowedSet.has(uid) || excludedSet.has(uid)) {
                            liveMapRef.current.delete(`live:${uid}`);
                            recomputeFeed();
                            return;
                        }
                        if (workout) {
                            const entry = buildLiveFeedEntry(uid, data, workout);
                            if (entry) {
                                liveMapRef.current.set(`live:${uid}`, entry);
                            } else {
                                liveMapRef.current.delete(`live:${uid}`);
                            }
                        } else {
                            liveMapRef.current.delete(`live:${uid}`);
                        }
                        recomputeFeed();
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
                recomputeFeed();
            }
        };

        if (allowed.size === 0) {
            setFeed([]);
            setHasMore(false);
            setLoadingMore(false);
            return;
        }

        syncLiveSubscriptions();

        setHasMore(true);
        setLoadingMore(false);

        const postsRef = collection(db, 'posts');
        const baseQuery = query(postsRef, orderBy('created', 'desc'), limit(pageSize));

        const unsubscribe = onSnapshot(baseQuery, (snapshot) => {
            const { allowed: allowedSet, excluded: excludedSet } = filtersRef.current;
            const newFirstPageMap = new Map();

            snapshot.docs.forEach((docSnap) => {
                const data = docSnap.data();
                const uid = toStringUid(data?.uid);
                if (!uid || !allowedSet.has(uid) || excludedSet.has(uid)) {
                    return;
                }
                const prev = firstPageMapRef.current.get(docSnap.id) || {};
                const merged = { ...prev, ...data, pid: data?.pid ?? docSnap.id };
                newFirstPageMap.set(docSnap.id, merged);

                if (extraMapRef.current.has(docSnap.id)) {
                    extraMapRef.current.set(docSnap.id, merged);
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

            recomputeFeed();
        });

        unsubscribeRef.current = () => {
            try { unsubscribe(); } catch { }
        };

        return () => {
            if (unsubscribeRef.current) {
                try { unsubscribeRef.current(); } catch { }
                unsubscribeRef.current = null;
            }
            cleanupLiveSubscriptions();
            liveMapRef.current = new Map();
            recomputeFeed();
        };
    }, [
        recomputeFeed,
        cleanupLiveSubscriptions,
        buildLiveFeedEntry,
        JSON.stringify(
            Array.isArray(followingUsers)
                ? followingUsers.map((u) => (u?.uid || u))
                : []
        ),
        pageSize,
        myUid,
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
                const data = docSnap.data();
                const uid = toStringUid(data?.uid);
                if (!uid || !allowed.has(uid) || excluded.has(uid)) {
                    return;
                }
                const prev = extraMapRef.current.get(docSnap.id) || {};
                const merged = { ...prev, ...data, pid: data?.pid ?? docSnap.id };
                extraMapRef.current.set(docSnap.id, merged);
                appended = true;
            });

            if (snapshot.docs.length > 0) {
                lastLoadedDocRef.current = snapshot.docs[snapshot.docs.length - 1];
            }

            const moreAvailable = snapshot.docs.length === pageSize;
            hasMoreRef.current = moreAvailable;
            setHasMore(moreAvailable);

            if (appended) {
                recomputeFeed();
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
    };
}
