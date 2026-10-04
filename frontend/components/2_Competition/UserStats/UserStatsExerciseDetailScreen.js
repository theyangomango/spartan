import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, Animated, FlatList, Pressable, Alert } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, doc, getDocs, limit, onSnapshot, query, where } from 'firebase/firestore';
import { styles, COLORS, scaledSize } from './UserStatsStyles';
import { withStrongPress, strong as hapticStrong } from '../../../utils/haptics';
import SimpleFeedPost from '../../1_Feed/SimpleFeedPost';
import { extractWid } from './userStatsUtils';
import { ensureAtHandle, buildFeedItem } from './userStatsDetailUtils';
import { db } from '../../../../firebase.config';
import CommentsBottomSheet from '../../1_Feed/Comments/CommentsBottomSheet';
import { navigateOneWay } from '../../../../navigationRef';
import isThisUser from '../../../helper/isThisUser';
import FollowListBottomSheet from '../../FollowListBottomSheet';
import readDoc from '../../../../backend/helper/firebase/readDoc';
import { isClipPost } from '../../../utils/postTypes';
import { toNumber, extractPidFromWorkout, buildEditPostPayload } from '../../../utils/feedItemUtils';
import { sanitizeEntry, sanitizeWorkoutForRoute } from '../../../utils/workoutRouteParams';

export default function UserStatsExerciseDetailScreen({
    visible,
    gesture,
    detailName,
    translateX,
    workoutIds,
    workouts,
    loading,
    onClose,
    fullScreen = false,
}) {
    const headerName = detailName || 'Exercise';
    const [postsLoading, setPostsLoading] = useState(false);
    const [postsByPid, setPostsByPid] = useState({});
    const listenersRef = useRef({});
    const widToPidRef = useRef({});
    const [commentsVisible, setCommentsVisible] = useState(false);
    const [commentTarget, setCommentTarget] = useState(null);
    const [commentsBottomSheetExpandFlag, setCommentsBottomSheetExpandFlag] = useState(false);
    const [likesSheetVisible, setLikesSheetVisible] = useState(false);
    const [likesSheetUsers, setLikesSheetUsers] = useState([]);
    const [likesSheetTitle, setLikesSheetTitle] = useState('Liked by');

    useEffect(() => {
        const list = Array.isArray(workouts) ? workouts : [];

        const detachAll = () => {
            Object.values(listenersRef.current).forEach((unsub) => {
                try { unsub(); } catch { }
            });
            listenersRef.current = {};
        };

        if (!visible) {
            detachAll();
            widToPidRef.current = {};
            setPostsByPid({});
            setPostsLoading(false);
            return;
        }

        if (!list.length) {
            detachAll();
            widToPidRef.current = {};
            setPostsByPid({});
            setPostsLoading(false);
            return;
        }

        let cancelled = false;
        setPostsLoading(true);

        (async () => {
            const desiredPids = new Set();
            const widLookups = new Set();

            list.forEach((wk) => {
                const directPid = extractPidFromWorkout(wk);
                if (directPid && !String(directPid).startsWith('workout:')) {
                    desiredPids.add(String(directPid));
                    return;
                }
                const wid = extractWid(wk);
                if (!wid) return;
                const stored = widToPidRef.current[String(wid)];
                if (stored === null) return;
                if (stored) {
                    desiredPids.add(String(stored));
                    return;
                }
                widLookups.add(String(wid));
            });

            await Promise.all(Array.from(widLookups).map(async (wid) => {
                if (widToPidRef.current[wid] !== undefined) {
                    const mapped = widToPidRef.current[wid];
                    if (mapped) desiredPids.add(String(mapped));
                    return;
                }
                try {
                    let querySnap = await getDocs(query(collection(db, 'posts'), where('workoutWid', '==', wid), limit(1)));
                    if (querySnap.empty) {
                        querySnap = await getDocs(query(collection(db, 'posts'), where('workout.wid', '==', wid), limit(1)));
                    }
                    if (!querySnap.empty) {
                        const docSnap = querySnap.docs[0];
                        const data = docSnap.data() || {};
                        const pid = String(data?.pid || docSnap.id || '');
                        if (pid && !pid.startsWith('workout:')) {
                            widToPidRef.current[wid] = pid;
                            desiredPids.add(pid);
                        } else {
                            widToPidRef.current[wid] = null;
                        }
                    } else {
                        widToPidRef.current[wid] = null;
                    }
                } catch (error) {
                    console.warn('UserStatsExerciseDetailScreen: failed to resolve wid', { wid, error });
                    widToPidRef.current[wid] = null;
                }
            }));

            if (cancelled) return;

            Object.keys(listenersRef.current).forEach((pid) => {
                if (desiredPids.has(pid)) return;
                try { listenersRef.current[pid]?.(); } catch { }
                delete listenersRef.current[pid];
                setPostsByPid((prev) => {
                    if (!Object.prototype.hasOwnProperty.call(prev, pid)) return prev;
                    const next = { ...prev };
                    delete next[pid];
                    return next;
                });
            });

            desiredPids.forEach((pid) => {
                if (listenersRef.current[pid]) return;
                listenersRef.current[pid] = onSnapshot(doc(db, 'posts', pid), (snapshot) => {
                    if (!snapshot.exists()) {
                        setPostsByPid((prev) => {
                            if (!Object.prototype.hasOwnProperty.call(prev, pid)) return prev;
                            const next = { ...prev };
                            delete next[pid];
                            return next;
                        });
                        Object.keys(widToPidRef.current).forEach((widKey) => {
                            if (widToPidRef.current[widKey] === pid) {
                                delete widToPidRef.current[widKey];
                            }
                        });
                        return;
                    }
                    const data = snapshot.data() || {};
                    const wid = data?.workoutWid ?? extractWid(data?.workout);
                    if (wid) widToPidRef.current[String(wid)] = pid;
                    setPostsByPid((prev) => ({ ...prev, [pid]: { pid, ...data } }));
                }, (error) => {
                    console.warn('UserStatsExerciseDetailScreen: post subscription failed', { pid, error });
                });
            });

            if (!cancelled) setPostsLoading(false);
        })();

        return () => {
            cancelled = true;
        };
    }, [visible, workouts, extractPidFromWorkout, extractWid]);

    useEffect(() => () => {
        Object.values(listenersRef.current).forEach((unsub) => {
            try { unsub(); } catch { }
        });
        listenersRef.current = {};
    }, []);

    const feedItems = useMemo(() => {
        if (!visible) return [];
        const list = Array.isArray(workouts) ? workouts : [];
        if (!list.length) return [];

        return list
            .map((workout) => {
                const directPid = extractPidFromWorkout(workout);
                const wid = extractWid(workout);

                let post = null;
                if (directPid && postsByPid[directPid]) {
                    post = postsByPid[directPid];
                }

                if (!post && wid) {
                    const mapped = widToPidRef.current[String(wid)];
                    if (mapped && postsByPid[mapped]) {
                        post = postsByPid[mapped];
                    } else {
                        post = Object.values(postsByPid).find((entry) => {
                            if (!entry) return false;
                            const entryWid = entry.workoutWid ?? extractWid(entry.workout);
                            return entryWid && String(entryWid) === String(wid);
                        }) || null;
                    }
                }

                if (!post) return null;
                return buildFeedItem(workout, post);
            })
            .filter(Boolean);
    }, [visible, workouts, postsByPid, buildFeedItem, extractPidFromWorkout, extractWid]);

    useEffect(() => {
        if (!visible) {
            setCommentsVisible(false);
            setCommentTarget(null);
            setLikesSheetVisible(false);
        }
    }, [visible]);

    const keyExtractor = useCallback((item, index) => {
        if (item?.pid) return `post-${item.pid}`;
        const wid = extractWid(item?.workout);
        return `workout-${wid || index}`;
    }, []);

    const handleOpenWorkout = useCallback((item, options = {}) => {
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
                rankTier: item?.rankTier ?? item?.currentRank?.tier ?? item?.currentRank?.rankTier ?? item?.rank?.tier ?? item?.rank?.rankTier ?? mergedWorkout.rankTier ?? mergedWorkout.currentRank?.tier ?? mergedWorkout.currentRank?.rankTier ?? mergedWorkout.rank?.tier ?? mergedWorkout.rank?.rankTier ?? null,
                currentRank: item?.currentRank || mergedWorkout.currentRank || null,
                rank: item?.rank || mergedWorkout.rank || null,
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

        if (options.startEditing) {
            params.startEditing = true;
        }

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

        if (targetUid) hapticStrong();

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
        setCommentTarget(post);
        setCommentsVisible(true);
        setCommentsBottomSheetExpandFlag((flag) => !flag);
    }, []);

    const closeComments = useCallback(() => {
        setCommentsVisible(false);
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

    const handleEditWorkout = useCallback((item) => {
        if (!item) return;
        handleOpenWorkout(item, { startEditing: true });
    }, [handleOpenWorkout]);

    const handleEditPost = useCallback(async (item) => {
        if (!item) return;

        const pid = String(item?.pid || item?.id || '').trim();
        if (!pid) return;

        let latest = item;
        try {
            const fetched = await readDoc('posts', pid);
            if (fetched) {
                latest = { ...item, ...fetched };
            }
        } catch (error) {
            console.warn('UserStatsExerciseDetailScreen: handleEditPost failed to fetch latest post', { pid, error });
        }

        const { resolvedCaption, mediaEntries, editingPayload } = buildEditPostPayload(latest, item.workout, pid);

        if (isClipPost(latest)) {
            const clipEntry = mediaEntries.find((entry) => entry?.type === 'video');
            if (!clipEntry) {
                Alert.alert('Unable to edit clip', 'This clip is missing its video. Please try again later.');
                return;
            }
            navigateOneWay('EditClip', {
                animation: 'slide-from-right',
                params: {
                    initialClip: clipEntry,
                    initialCaption: resolvedCaption,
                    editingContext: { editingPost: editingPayload },
                },
            });
            return;
        }

        navigateOneWay('PostOptions', {
            animation: 'slide-from-right',
            params: {
                images: mediaEntries,
                editingPost: editingPayload,
            },
        });
    }, []);

    const navigationProxy = useMemo(() => {
        const navigate = (route, params) => {
            if (route === 'Profile') {
                hapticStrong();
                navigateOneWay('Profile', 'slide-from-right');
                return;
            }
            if (route === 'ViewProfile') {
                hapticStrong();
                navigateOneWay('ViewProfile', { animation: 'slide-from-right', params });
                return;
            }
            navigateOneWay(route, { animation: 'slide-from-right', params });
        };
        return {
            getParent: () => ({ navigate }),
            navigate,
        };
    }, []);

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
            onPressEditPost={(_, data) => handleEditPost(data || item)}
            onPressEditWorkout={(_, data) => handleEditWorkout(data || item)}
        />
    ), [handleEditPost, handleEditWorkout, handleOpenProfile, handleOpenWorkout, openComments, handleShowLikesSheet]);

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
                style={[styles.detailOverlay, fullScreen && styles.detailOverlayFullScreen, { transform: [{ translateX }] }]}
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
