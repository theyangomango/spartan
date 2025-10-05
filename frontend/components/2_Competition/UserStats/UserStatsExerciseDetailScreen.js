import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, Animated, FlatList, Pressable } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import scaleSize from '../../../helper/scaleSize';
import { styles, COLORS, scaledSize } from './UserStatsStyles';
import { withStrongPress } from '../../../utils/haptics';
import SimpleFeedPost from '../../1_Feed/SimpleFeedPost';
import { extractWid, toMillis } from './userStatsUtils';
import { db } from '../../../../firebase.config';
import CommentsBottomSheet from '../../1_Feed/Comments/CommentsBottomSheet';
import { navigateOneWay } from '../../../../navigationRef';
import isThisUser from '../../../helper/isThisUser';
import FollowListBottomSheet from '../../FollowListBottomSheet';

const TIMESTAMP_FIELDS = ['created', 'createdAt', 'completedAt', 'finishedAt', 'startedAt', 'updatedAt'];

const resolveWorkoutCreatedAt = (workout) => {
    if (!workout) return 0;
    for (const field of TIMESTAMP_FIELDS) {
        const ms = toMillis(workout?.[field]);
        if (ms) return ms;
    }
    return 0;
};

const normalizeMediaEntry = (entry) => {
    if (!entry) return null;
    if (typeof entry === 'string') {
        const uri = entry.trim();
        return uri ? { uri, type: 'image' } : null;
    }
    if (typeof entry === 'object') {
        const uri = entry.uri ?? entry.url ?? entry.image ?? entry.photoURL ?? entry.photoUrl ?? null;
        if (!uri) return null;
        const raw = String(entry.type ?? entry.mediaType ?? entry.kind ?? 'image').toLowerCase();
        return { uri, type: raw.includes('video') ? 'video' : 'image' };
    }
    return null;
};

const mergeMediaSources = (post, workout) => {
    const sources = [];
    if (Array.isArray(post?.media)) sources.push(...post.media);
    if (Array.isArray(post?.images)) sources.push(...post.images);
    if (Array.isArray(workout?.media)) sources.push(...workout.media);
    if (Array.isArray(workout?.images)) sources.push(...workout.images);

    const seen = new Set();
    const result = [];
    sources.forEach((entry) => {
        const normalized = normalizeMediaEntry(entry);
        if (!normalized?.uri) return;
        const key = `${normalized.uri}|${normalized.type}`;
        if (seen.has(key)) return;
        seen.add(key);
        result.push(normalized);
    });
    return result;
};

const ensureHandle = (value) => {
    if (!value) return '';
    const str = String(value).trim();
    return str.startsWith('@') ? str.slice(1) : str;
};

const ensureAtHandle = (value) => {
    const base = ensureHandle(value);
    return base ? `@${base}` : '';
};

const stringCandidates = (values) => {
    for (const value of values) {
        if (value === null || value === undefined) continue;
        if (typeof value === 'string' || typeof value === 'number') {
            const str = String(value).trim();
            if (str) return str;
        }
    }
    return '';
};

const toNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};

const sanitizeEntry = (entry) => {
    if (!entry || typeof entry !== 'object') return entry;
    try {
        return JSON.parse(JSON.stringify(entry, (_key, v) => (typeof v === 'function' ? undefined : v)));
    } catch {
        return { ...entry };
    }
};

const sanitizeWorkoutForRoute = (workout) => {
    if (!workout || typeof workout !== 'object') return null;

    const replacer = (_key, value) => (typeof value === 'function' ? undefined : value);

    try {
        return JSON.parse(JSON.stringify(workout, replacer));
    } catch {
        const clone = { ...workout };
        clone.exercises = Array.isArray(workout.exercises)
            ? workout.exercises.map((exercise) => {
                if (!exercise || typeof exercise !== 'object') return {};
                const sets = Array.isArray(exercise.sets)
                    ? exercise.sets.map((set) => {
                        if (!set || typeof set !== 'object') return {};
                        const { weight, reps, unit, units, weightUnit, kg, lbs, ...rest } = set;
                        const normalized = {
                            ...rest,
                            weight: Number(weight ?? kg ?? lbs ?? 0) || 0,
                            reps: Number(reps ?? set?.rep ?? set?.r ?? 0) || 0,
                        };
                        const resolvedUnit = unit || units || weightUnit || (kg != null ? 'kg' : undefined);
                        if (resolvedUnit) normalized.unit = resolvedUnit;
                        return normalized;
                    })
                    : [];
                return { ...exercise, sets };
            })
            : [];
        return clone;
    }
};

const extractPidFromWorkout = (workout) => stringCandidates([
    workout?.postPid,
    workout?.postPID,
    workout?.postId,
    workout?.pid,
]);

export default function UserStatsExerciseDetailScreen({
    visible,
    gesture,
    detailName,
    translateX,
    workoutIds,
    workouts,
    loading,
    onClose,
}) {
    const headerName = detailName || 'Exercise';
    const [feedItems, setFeedItems] = useState([]);
    const [postsLoading, setPostsLoading] = useState(false);
    const postCacheRef = useRef(new Map());
    const postPidByWidRef = useRef(new Map());
    const commentTargetRef = useRef(null);
    const [commentsVisible, setCommentsVisible] = useState(false);
    const [commentTarget, setCommentTarget] = useState(null);
    const [commentsBottomSheetExpandFlag, setCommentsBottomSheetExpandFlag] = useState(false);
    const [likesSheetVisible, setLikesSheetVisible] = useState(false);
    const [likesSheetUsers, setLikesSheetUsers] = useState([]);
    const [likesSheetTitle, setLikesSheetTitle] = useState('Liked by');

    const buildFeedItem = useCallback((workout, post, index) => {
        if (!workout && !post) return null;

        const workoutClone = workout && typeof workout === 'object' ? { ...workout } : null;
        const widRaw = workoutClone ? extractWid(workoutClone) : null;
        const wid = widRaw ? String(widRaw) : '';
        const cachedPid = wid ? postPidByWidRef.current.get(wid) : '';

        const pid = stringCandidates([
            post?.pid,
            workoutClone?.postPid,
            cachedPid,
            workoutClone?.pid,
            `workout:${wid || index}`,
        ]);

        if (wid && pid && !String(pid).startsWith('workout:') && cachedPid !== pid) {
            postPidByWidRef.current.set(wid, pid);
        }
        if (workoutClone && pid && workoutClone.postPid !== pid) {
            workoutClone.postPid = pid;
        }

        const ownerUid = stringCandidates([
            post?.uid,
            workoutClone?.uid,
            workoutClone?.creatorUid,
            workoutClone?.creatorUID,
            workoutClone?.ownerUid,
        ]);

        const handle = ensureHandle(post?.handle ?? workoutClone?.handle ?? workoutClone?.username ?? '');
        const fallbackName = stringCandidates([
            post?.name,
            workoutClone?.ownerName,
            workoutClone?.name,
            workoutClone?.templateName,
        ]);
        const created = Number(post?.created) || resolveWorkoutCreatedAt(workoutClone);
        const captionFromPost = typeof post?.caption === 'string' ? post.caption : '';
        const captionFromWorkout = typeof workoutClone?.caption === 'string' ? workoutClone.caption : '';
        const caption = captionFromPost || captionFromWorkout || workoutClone?.templateName || workoutClone?.name || '';

        const media = mergeMediaSources(post, workoutClone);
        const likes = Array.isArray(post?.likes) ? post.likes : [];
        const likeCount = Number.isFinite(Number(post?.likeCount)) ? Number(post.likeCount) : likes.length;
        const comments = Array.isArray(post?.comments) ? post.comments : (
            caption
                ? [{
                    content: caption,
                    handle,
                    isCaption: true,
                    pfp: post?.pfp ?? workoutClone?.pfp ?? workoutClone?.pfpUrl ?? '',
                    timestamp: created || Date.now(),
                    uid: ownerUid || null,
                }]
                : []
        );
        const commentCount = Number.isFinite(Number(post?.commentCount))
            ? Number(post.commentCount)
            : comments.length;

        return {
            pid,
            id: pid,
            uid: ownerUid,
            handle,
            name: fallbackName,
            pfp: post?.pfp ?? workoutClone?.pfp ?? workoutClone?.pfpUrl ?? workoutClone?.photoURL ?? workoutClone?.photo ?? '',
            pfpVersion: post?.pfpVersion ?? workoutClone?.pfpVersion ?? 0,
            created,
            caption,
            workout: workoutClone,
            media,
            images: Array.isArray(post?.images) ? post.images : [],
            likes,
            likeCount,
            comments,
            commentCount,
            shareCount: Number(post?.shareCount) || 0,
            tags: Array.isArray(post?.tags) ? post.tags : [],
            tagged: Array.isArray(post?.tagged) ? post.tagged : [],
            __linkedWid: wid,
            __source: 'user-stats-detail',
        };
    }, [postPidByWidRef]);

    useEffect(() => {
        let cancelled = false;

        const resolvePosts = async () => {
            if (!visible) {
                setFeedItems([]);
                setPostsLoading(false);
                return;
            }

            const list = Array.isArray(workouts) ? workouts : [];
            if (!list.length) {
                setFeedItems([]);
                setPostsLoading(false);
                return;
            }

            const fetchQueue = [];
            const widQueue = [];
            const pidByIndex = new Map();

            list.forEach((wk, index) => {
                let pid = extractPidFromWorkout(wk);
                const widRaw = extractWid(wk);
                const wid = widRaw ? String(widRaw) : '';

                if (!pid && wid) {
                    const cachedPid = postPidByWidRef.current.get(wid);
                    if (cachedPid) pid = cachedPid;
                }

                if (pid) {
                    pidByIndex.set(index, pid);
                    if (!postCacheRef.current.has(pid)) {
                        fetchQueue.push({ pid });
                    }
                } else if (wid) {
                    widQueue.push({ wid, index });
                }
            });

            if (fetchQueue.length) setPostsLoading(true);

            if (fetchQueue.length) {
                try {
                    await Promise.all(fetchQueue.map(async ({ pid }) => {
                        if (cancelled) return;
                        try {
                            const snap = await getDoc(doc(db, 'posts', pid));
                            if (snap.exists()) {
                                const payload = snap.data() || {};
                                postCacheRef.current.set(pid, { pid, ...payload });
                                if (payload?.workoutWid) {
                                    const widKey = String(payload.workoutWid);
                                    postPidByWidRef.current.set(widKey, pid);
                                }
                            } else {
                                postCacheRef.current.set(pid, null);
                            }
                        } catch (error) {
                            console.warn('UserStatsExerciseDetailScreen: failed to fetch post', { pid, error });
                            postCacheRef.current.set(pid, null);
                        }
                    }));
                } catch { }
                if (cancelled) return;
            }

            if (widQueue.length) setPostsLoading(true);

            if (widQueue.length) {
                try {
                    await Promise.all(widQueue.map(async ({ wid }) => {
                        if (cancelled) return;
                        if (postPidByWidRef.current.has(wid)) return;
                        try {
                            const primary = await getDocs(query(
                                collection(db, 'posts'),
                                where('workoutWid', '==', wid),
                                limit(1)
                            ));

                            let docSnap = primary.empty ? null : primary.docs[0];

                            if (!docSnap) {
                                const secondary = await getDocs(query(
                                    collection(db, 'posts'),
                                    where('workout.wid', '==', wid),
                                    limit(1)
                                ));
                                docSnap = secondary.empty ? null : secondary.docs[0];
                            } 

                            if (docSnap) {
                                const data = docSnap.data() || {};
                                const resolvedPid = data?.pid || docSnap.id;
                                postPidByWidRef.current.set(wid, resolvedPid);
                                postCacheRef.current.set(resolvedPid, { pid: resolvedPid, ...data });
                            } else {
                                postPidByWidRef.current.set(wid, null);
                            }
                        } catch (error) {
                            console.warn('UserStatsExerciseDetailScreen: failed to query post by wid', { wid, error });
                            postPidByWidRef.current.set(wid, null);
                        }
                    }));
                } catch { }
                if (cancelled) return;

                widQueue.forEach(({ wid, index }) => {
                    const pid = postPidByWidRef.current.get(wid);
                    if (pid) {
                        pidByIndex.set(index, pid);
                    }
                });
            }

            const items = list
                .map((workout, index) => {
                    const pid = pidByIndex.get(index);
                    const post = pid ? postCacheRef.current.get(pid) : null;
                    return buildFeedItem(workout, post, index);
                })
                .filter(Boolean);

            if (!cancelled) {
                setFeedItems(items);
                setPostsLoading(false);
            }
        };

        resolvePosts();
        return () => {
            cancelled = true;
        };
    }, [visible, workouts, buildFeedItem]);

    useEffect(() => {
        if (!visible) {
            setCommentsVisible(false);
            commentTargetRef.current = null;
            setCommentTarget(null);
            setLikesSheetVisible(false);
        }
    }, [visible]);

    const keyExtractor = useCallback((item, index) => {
        if (item?.pid) return `post-${item.pid}`;
        const wid = extractWid(item?.workout);
        return `workout-${wid || index}`;
    }, []);

    const handleOpenWorkout = useCallback((item) => {
        if (!item?.workout) return;

        const workoutInput = item.workout;
        const fallback = {
            wid: workoutInput?.wid || workoutInput?.id,
            creatorUID: workoutInput?.creatorUID || workoutInput?.creatorUid || item?.uid || global?.userData?.uid || '',
            created: workoutInput?.created || workoutInput?.createdAt || Date.now(),
            exercises: Array.isArray(workoutInput?.exercises) ? workoutInput.exercises : [],
            duration: workoutInput?.duration,
            volume: workoutInput?.volume,
            reps: workoutInput?.reps,
            PBs: workoutInput?.PBs ?? workoutInput?.pbs ?? 0,
            templateName: workoutInput?.templateName || workoutInput?.template?.name,
        };

        const mergedWorkout = { ...fallback, ...workoutInput };

        const ownerUid = String(item?.uid || mergedWorkout.creatorUID || mergedWorkout.creatorUid || '');
        const ownerHandle = ensureAtHandle(item?.handle || mergedWorkout.handle || mergedWorkout.username || '');
        const ownerName = item?.name || mergedWorkout.ownerName || mergedWorkout.name || '';
        const ownerPfp = item?.pfp || mergedWorkout.pfp || mergedWorkout.pfpUrl || mergedWorkout.photoURL || mergedWorkout.photo || '';
        const ownerPfpVersion = item?.pfpVersion ?? mergedWorkout.pfpVersion ?? mergedWorkout.version ?? 0;

        const sanitizedWorkout = sanitizeWorkoutForRoute({
            ...mergedWorkout,
            creatorUID: ownerUid || mergedWorkout.creatorUID,
            creatorUid: ownerUid || mergedWorkout.creatorUid,
            handle: ownerHandle || mergedWorkout.handle,
            pfp: ownerPfp,
            pfpUrl: ownerPfp,
            pfpVersion: ownerPfpVersion,
            ownerName,
        });

        if (!sanitizedWorkout) return;

        const likeCount = Array.isArray(item?.likes) ? item.likes.length : toNumber(item?.likeCount);
        const commentCount = Array.isArray(item?.comments)
            ? Math.max(0, item.comments.length - 1)
            : toNumber(item?.commentCount);

        const likesForRoute = Array.isArray(item?.likes) ? item.likes.map(sanitizeEntry) : [];
        const mediaForRoute = Array.isArray(item?.media) ? item.media.map(sanitizeEntry) : [];
        const imagesForRoute = Array.isArray(item?.images) ? item.images.map(sanitizeEntry) : [];
        const tagsForRoute = Array.isArray(item?.tags) ? [...item.tags] : [];
        const taggedForRoute = Array.isArray(item?.tagged) ? [...item.tagged] : [];

        const params = {
            workout: sanitizedWorkout,
            owner: {
                uid: ownerUid,
                handle: ownerHandle,
                name: ownerName,
                pfp: ownerPfp,
                pfpVersion: ownerPfpVersion,
            },
            postMeta: {
                pid: item?.pid ?? item?.id ?? `${ownerUid}:${sanitizedWorkout?.wid ?? sanitizedWorkout?.id ?? ''}`,
                caption: typeof item?.caption === 'string' ? item.caption : '',
                created: item?.created ?? item?.createdAt ?? sanitizedWorkout?.created ?? null,
                likeCount,
                commentCount,
                likes: likesForRoute,
                media: mediaForRoute,
                images: imagesForRoute,
                shareCount: toNumber(item?.shareCount),
                tags: tagsForRoute,
                tagged: taggedForRoute,
            },
        };

        navigateOneWay('PastWorkout', { animation: 'slide-from-right', params });
    }, []);

    const handleOpenProfile = useCallback((source) => {
        if (!source) return;
        const targetUid = source.uid ? String(source.uid) : '';
        const rawHandle = source.handle ? String(source.handle) : '';
        const target = {
            uid: targetUid,
            handle: rawHandle.startsWith('@') ? rawHandle.slice(1) : rawHandle,
            name: source.name || '',
            pfp: source.pfp || '',
        };

        if (targetUid && isThisUser(targetUid)) {
            navigateOneWay('Profile', 'slide-from-right');
            return;
        }

        navigateOneWay('ViewProfile', {
            animation: 'slide-from-right',
            params: { user: target },
        });
    }, []);

    const openComments = useCallback((post) => {
        if (!post?.pid) return;
        commentTargetRef.current = post;
        setCommentTarget(post);
        setCommentsVisible(true);
        setCommentsBottomSheetExpandFlag((flag) => !flag);
    }, []);

    const closeComments = useCallback(() => {
        setCommentsVisible(false);
        const targetPid = commentTargetRef.current?.pid;
        if (targetPid) {
            setFeedItems((items) => items.map((item) => (
                item.pid === targetPid ? { ...item } : item
            )));
        }
        commentTargetRef.current = null;
        setTimeout(() => setCommentTarget(null), 180);
    }, []);

    const handleShowLikesSheet = useCallback((_, data) => {
        const likeEntries = Array.isArray(data?.likes) ? data.likes : [];
        if (!likeEntries.length) return;
        setLikesSheetUsers(likeEntries);
        setLikesSheetTitle('Liked by');
        setLikesSheetVisible(true);
    }, []);

    const handleShowLikesSheetFromComments = useCallback((users, label) => {
        const likeEntries = Array.isArray(users) ? users : [];
        if (!likeEntries.length) return;
        setLikesSheetUsers(likeEntries);
        setLikesSheetTitle(label || 'Liked by');
        setLikesSheetVisible(true);
    }, []);

    const navigationProxy = useMemo(() => ({
        getParent: () => ({
            navigate: (route, params) => {
                if (route === 'Profile') {
                    navigateOneWay('Profile', 'slide-from-right');
                    return;
                }
                if (route === 'ViewProfile') {
                    navigateOneWay('ViewProfile', { animation: 'slide-from-right', params });
                    return;
                }
                navigateOneWay(route, { animation: 'slide-from-right', params });
            },
        }),
        navigate: (route, params) => {
            if (route === 'Profile') {
                navigateOneWay('Profile', 'slide-from-right');
                return;
            }
            if (route === 'ViewProfile') {
                navigateOneWay('ViewProfile', { animation: 'slide-from-right', params });
                return;
            }
            navigateOneWay(route, { animation: 'slide-from-right', params });
        },
    }), []);

    const renderItem = useCallback(({ item, index }) => (
        <SimpleFeedPost
            data={item}
            index={index}
            highlightPid={null}
            highlightSignal={0}
            onPressProfile={(_, data) => handleOpenProfile(data)}
            onPressWorkout={(_, data) => handleOpenWorkout(data)}
            onPressComments={(_, data) => openComments(data)}
            onPressLikes={handleShowLikesSheet}
        />
    ), [handleOpenProfile, handleOpenWorkout, openComments, handleShowLikesSheet]);

    const footerComponent = useMemo(() => (
        (loading || postsLoading) ? (
            <View style={styles.detailLoadingFooter}>
                <ActivityIndicator size="small" color={COLORS.subtext} />
            </View>
        ) : (
            <View style={{ height: scaledSize(40) }} />
        )
    ), [loading, postsLoading]);

    if (!visible) return null;

    return (
        <GestureDetector gesture={gesture}>
            <Animated.View
                pointerEvents="auto"
                style={[styles.detailOverlay, { transform: [{ translateX }] }]}
            >
                <View style={styles.detailHeaderWrapper}>
                    <View style={styles.detailHeaderSimpleCard}>
                        <Pressable
                            onPress={withStrongPress(onClose)}
                            hitSlop={10}
                            style={({ pressed }) => [
                                styles.detailBackButton,
                                pressed && styles.detailBackButtonPressed,
                            ]}
                        >
                            <MaterialCommunityIcons name="chevron-left" size={scaledSize(18)} color={COLORS.text} />
                        </Pressable>

                        <View style={styles.detailHeaderTitleWrap}>
                            <Text numberOfLines={2} style={styles.detailHeaderTitle}>{headerName}</Text>
                            <Text numberOfLines={1} style={styles.detailHeaderSubtitle}>
                                All workouts that included this exercise
                            </Text>
                        </View>
                    </View>
                </View>

                {workoutIds.length === 0 ? (
                    <View style={styles.detailEmpty}>
                        <Text style={styles.emptyText}>No workouts yet.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={feedItems}
                        keyExtractor={keyExtractor}
                        contentContainerStyle={[styles.detailListContent]}
                        showsVerticalScrollIndicator={false}
                        renderItem={renderItem}
                        ListEmptyComponent={(
                            <View style={styles.detailEmpty}>
                                {(loading || postsLoading) ? (
                                    <ActivityIndicator size="small" color={COLORS.subtext} />
                                ) : (
                                    <Text style={styles.emptyText}>No workouts available.</Text>
                                )}
                            </View>
                        )}
                        ListFooterComponent={footerComponent}
                    />
                )}
                <CommentsBottomSheet
                    isVisible={commentsVisible}
                    postData={commentTarget}
                    commentsBottomSheetExpandFlag={commentsBottomSheetExpandFlag}
                    toViewProfile={handleOpenProfile}
                    onShowLikesSheet={handleShowLikesSheetFromComments}
                    onDismiss={closeComments}
                />
                <FollowListBottomSheet
                    isVisible={likesSheetVisible}
                    setIsVisible={setLikesSheetVisible}
                    title={likesSheetTitle}
                    users={likesSheetUsers}
                    navigation={navigationProxy}
                />
            </Animated.View>
        </GestureDetector>
    );
}
