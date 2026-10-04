import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    SafeAreaView,
    TouchableOpacity,
    StatusBar,
    Text,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import Footer from "../components/Footer";
import SimpleFeedPost from "../components/1_Feed/SimpleFeedPost";
import CommentsBottomSheet from "../components/1_Feed/Comments/CommentsBottomSheet";
import FollowListBottomSheet from "../components/FollowListBottomSheet";
import isThisUser from "../helper/isThisUser";
import theme from "../theme/mfpDark";
import scaleSize from "../helper/scaleSize";
import readDoc from "../../backend/helper/firebase/readDoc";
import readDocsByIds from "../../backend/helper/firebase/readDocsByIds";
import { canViewerAccessProfile, filterViewableWorkouts } from "../utils/workoutPrivacy";
import { withStrongPress, strong as hapticStrong } from "../utils/haptics";
import { clearFooterSuppression } from "../state/footerSuppressionStore";
import { subscribeUserData } from "../utils/userDataEvents";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "../../firebase.config";
import { isClipPost } from "../utils/postTypes";
import { buildEditPostPayload, ensureAtHandle, extractPidFromWorkout, stringCandidates } from "../utils/feedItemUtils";
import { sanitizeEntry } from "../utils/workoutRouteParams";
import LockedView from "./profileWorkoutsAndPosts/LockedView";
import styles from "./profileWorkoutsAndPosts/ProfileWorkoutsAndPosts.styles";
import { extractWidFromWorkout, sortPostsByCreated, sortWorkoutsByTimestamp } from "./profileWorkoutsAndPosts/profileWorkoutsAndPostsUtils";

export default function ProfileWorkoutsAndPostsScreen({ navigation, route }) {
    const params = route?.params || {};
    const initialUser = params?.initialUser || null;
    const passedUid = params?.targetUid || initialUser?.uid || '';
    const targetUid = passedUid ? String(passedUid) : '';
    const isViewingSelf = !!params?.isViewingSelf;

    const [userData, setUserData] = useState(() => (initialUser && initialUser.uid ? initialUser : null));
    const [isUserLoading, setIsUserLoading] = useState(!initialUser);
    const [posts, setPosts] = useState([]);
    const [postsLoading, setPostsLoading] = useState(false);
    const [postsError, setPostsError] = useState(null);

    const normalizedPostIds = useMemo(() => {
        if (!Array.isArray(userData?.posts)) return [];
        return userData.posts
            .map((entry) => {
                if (entry == null) return null;
                if (typeof entry === 'object') {
                    const candidate = entry?.pid ?? entry?.id ?? entry?.uid ?? entry;
                    return candidate == null ? null : String(candidate).trim();
                }
                return String(entry).trim();
            })
            .filter((value) => !!value);
    }, [userData?.posts]);

    const postIdsKey = useMemo(
        () => (normalizedPostIds.length ? normalizedPostIds.join('|') : ''),
        [normalizedPostIds]
    );

    const previousPostIdsKeyRef = useRef(null);

    const postsByPid = useMemo(() => {
        const map = new Map();
        posts.forEach((post) => {
            const pid = post?.pid ?? post?.id;
            if (pid) map.set(String(pid), post);
        });
        return map;
    }, [posts]);

    const [selectedTab, setSelectedTab] = useState(() => {
        const requested = typeof params?.initialTab === 'string' ? params.initialTab : '';
        return requested === 'All Posts' ? 'All Posts' : 'Workouts';
    });

    const shouldRefreshOnFocusRef = useRef(false);

    const [likesSheetVisible, setLikesSheetVisible] = useState(false);
    const [likesSheetUsers, setLikesSheetUsers] = useState([]);
    const [likesSheetTitle, setLikesSheetTitle] = useState('Liked by');
    const [commentsVisible, setCommentsVisible] = useState(false);
    const [commentsExpandFlag, setCommentsExpandFlag] = useState(false);
    const [activeFeedItem, setActiveFeedItem] = useState(null);
    const [workoutPostsState, setWorkoutPostsState] = useState({ byPid: {}, byWid: {} });
    const [workoutPostsLoading, setWorkoutPostsLoading] = useState(false);

    // Declared above the focus effect so it re-runs when access to the profile changes.
    const viewerData = (() => { try { return global?.userData || null; } catch { return null; } })();
    const viewerUid = viewerData?.uid ? String(viewerData.uid) : "";
    const canViewContent = canViewerAccessProfile(userData, viewerUid, viewerData);

    useFocusEffect(
        useCallback(() => {
            clearFooterSuppression();

            let cancelled = false;

            if (shouldRefreshOnFocusRef.current && canViewContent && normalizedPostIds.length) {
                const ids = [...normalizedPostIds];
                shouldRefreshOnFocusRef.current = false;

                (async () => {
                    const buffer = new Array(ids.length);
                    const chunkSize = 10;

                    for (let start = 0; start < ids.length; start += chunkSize) {
                        const chunk = ids.slice(start, start + chunkSize);
                        await Promise.all(
                            chunk.map(async (pid, idx) => {
                                try {
                                    const snap = await getDoc(doc(db, 'posts', pid));
                                    if (!snap.exists()) return;
                                    const data = snap.data() || {};
                                    buffer[start + idx] = { pid, ...data };
                                } catch (error) {
                                    console.warn('ProfileWorkoutsAndPostsScreen: silent refresh failed', { pid, error });
                                }
                            })
                        );
                        if (cancelled) return;
                    }

                    if (cancelled) return;

                    setPosts((current) => {
                        const fallback = new Map();
                        current.forEach((post) => {
                            const pid = post?.pid ?? post?.id;
                            if (pid) fallback.set(String(pid), post);
                        });

                        const merged = buffer.map((entry, idx) => {
                            if (entry) return entry;
                            const pid = ids[idx];
                            return fallback.get(String(pid)) || null;
                        }).filter(Boolean);

                        if (!merged.length) return current;
                        return sortPostsByCreated(merged);
                    });
                })();
            } else {
                shouldRefreshOnFocusRef.current = false;
            }

            return () => {
                cancelled = true;
                shouldRefreshOnFocusRef.current = true;
            };
        }, [canViewContent, normalizedPostIds])
    );

    useEffect(() => {
        if (!targetUid) return;
        let cancelled = false;
        setIsUserLoading(true);
        Promise.all([
            readDoc('usersPublic', targetUid),
            // Another user's private document is not readable; that must not fail the whole refresh.
            readDoc('usersPrivate', targetUid).catch(() => null),
        ])
            .then(([publicDoc, privateDoc]) => {
                if (cancelled) return;
                const merged = {
                    ...(publicDoc || {}),
                    ...(privateDoc || {}),
                };
                if (merged && (merged.uid || merged.id)) setUserData(merged);
            })
            .catch(() => { })
            .finally(() => {
                if (!cancelled) setIsUserLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [targetUid]);

    useEffect(() => {
        if (!isViewingSelf) return undefined;
        try {
            const unsubscribe = subscribeUserData((nextUser) => {
                if (nextUser && nextUser.uid) setUserData(nextUser);
            });
            return unsubscribe;
        } catch {
            return undefined;
        }
    }, [isViewingSelf]);


    useEffect(() => {
        if (!userData || !canViewContent) {
            setPosts([]);
            setPostsLoading(false);
            setPostsError(null);
            previousPostIdsKeyRef.current = null;
            return;
        }

        const ids = normalizedPostIds;
        const idsKey = postIdsKey;

        if (!ids.length) {
            setPosts([]);
            setPostsLoading(false);
            setPostsError(null);
            previousPostIdsKeyRef.current = idsKey;
            return;
        }

        const prevKey = previousPostIdsKeyRef.current;
        const hasLoadedPosts = posts.length > 0;
        if (prevKey === idsKey && hasLoadedPosts) {
            return;
        }
        previousPostIdsKeyRef.current = idsKey;

        let cancelled = false;
        const buffer = new Array(ids.length);
        const updateFromBuffer = () => {
            if (cancelled) return;
            const next = sortPostsByCreated(buffer.filter(Boolean));
            setPosts(next);
        };

        setPostsLoading(true);
        setPostsError(null);

        if (prevKey !== idsKey) {
            setPosts((current) => {
                if (!current.length) return current;
                const whitelist = new Set(ids);
                const preserved = current.filter((post) => {
                    const pid = post?.pid ?? post?.id;
                    return pid ? whitelist.has(String(pid)) : false;
                });
                return preserved;
            });
        }

        const fetchChunk = async (chunkIds, startIndex) => {
            if (!chunkIds.length) return;
            const docs = await readDocsByIds('posts', chunkIds);
            if (cancelled) return;
            docs.forEach((doc, idx) => {
                const id = chunkIds[idx];
                if (doc && !doc.pid) doc.pid = id;
                buffer[startIndex + idx] = doc;
            });
            updateFromBuffer();
        };

        (async () => {
            try {
                const firstChunk = ids.slice(0, 10);
                const tail = ids.slice(10);
                await fetchChunk(firstChunk, 0);
                const promises = [];
                for (let i = 0; i < tail.length; i += 10) {
                    const group = tail.slice(i, i + 10);
                    const startIndex = 10 + i;
                    promises.push(fetchChunk(group, startIndex));
                }
                await Promise.all(promises);
            } catch (error) {
                if (!cancelled) setPostsError('Unable to load posts right now.');
            } finally {
                if (!cancelled) setPostsLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [canViewContent, normalizedPostIds, postIdsKey, posts.length, userData]);

    const visibleWorkouts = useMemo(() => {
        if (!userData || !canViewContent) return [];
        const base = filterViewableWorkouts(
            Array.isArray(userData?.completedWorkouts) ? userData.completedWorkouts : [],
            viewerUid,
            viewerData,
            userData
        );
        return sortWorkoutsByTimestamp(base);
    }, [userData, canViewContent, viewerUid, viewerData]);

    useEffect(() => {
        const workouts = Array.isArray(visibleWorkouts) ? visibleWorkouts : [];
        let cancelled = false;

        if (!workouts.length) {
            setWorkoutPostsState({ byPid: {}, byWid: {} });
            setWorkoutPostsLoading(false);
            return () => { cancelled = true; };
        }

        const hydratePosts = async () => {
            setWorkoutPostsLoading(true);
            const byPid = {};
            const byWid = {};
            const pidSet = new Set();
            const widSet = new Set();

            workouts.forEach((wk) => {
                const pid = extractPidFromWorkout(wk);
                if (pid) pidSet.add(String(pid));
                const wid = extractWidFromWorkout(wk);
                if (wid) widSet.add(String(wid));
            });

            pidSet.forEach((pid) => {
                if (postsByPid.has(pid)) {
                    const data = postsByPid.get(pid);
                    if (data) {
                        byPid[pid] = data;
                        const wid = stringCandidates([data?.workoutWid, data?.workout?.wid]);
                        if (wid) byWid[String(wid)] = pid;
                    }
                }
            });

            await Promise.all(
                Array.from(pidSet).map(async (pid) => {
                    if (byPid[pid]) return;
                    try {
                        const snap = await getDoc(doc(db, 'posts', pid));
                        if (!snap.exists()) return;
                        const payload = snap.data() || {};
                        byPid[pid] = { pid, ...payload };
                        const wid = stringCandidates([payload?.workoutWid, payload?.workout?.wid]);
                        if (wid) byWid[String(wid)] = pid;
                    } catch (error) {
                        console.warn('ProfileWorkoutsAndPostsScreen: failed to fetch post', { pid, error });
                    }
                })
            );

            for (const wid of widSet) {
                if (Object.prototype.hasOwnProperty.call(byWid, wid)) continue;
                try {
                    let querySnap = await getDocs(query(collection(db, 'posts'), where('workoutWid', '==', wid), limit(1)));
                    if (querySnap.empty) {
                        querySnap = await getDocs(query(collection(db, 'posts'), where('workout.wid', '==', wid), limit(1)));
                    }
                    if (!querySnap.empty) {
                        const docSnap = querySnap.docs[0];
                        const data = docSnap.data() || {};
                        const pid = String(data?.pid || docSnap.id);
                        byPid[pid] = { pid, ...data };
                        byWid[wid] = pid;
                    } else {
                        byWid[wid] = null;
                    }
                } catch (error) {
                    console.warn('ProfileWorkoutsAndPostsScreen: failed to query post by wid', { wid, error });
                    byWid[wid] = null;
                }
            }

            if (!cancelled) {
                setWorkoutPostsState({ byPid, byWid });
                setWorkoutPostsLoading(false);
            }
        };

        hydratePosts();

        return () => {
            cancelled = true;
        };
    }, [visibleWorkouts, postsByPid]);

    const findPostForWorkout = useCallback((workout) => {
        if (!workout) return null;
        const pid = extractPidFromWorkout(workout);
        const wid = extractWidFromWorkout(workout);
        const candidatePids = [];
        if (pid) candidatePids.push(String(pid));
        if (wid) {
            const mapped = workoutPostsState.byWid[String(wid)];
            if (mapped) candidatePids.push(String(mapped));
        }
        for (const candidate of candidatePids) {
            if (postsByPid.has(candidate)) return postsByPid.get(candidate);
            const fetched = workoutPostsState.byPid[candidate];
            if (fetched) return fetched;
        }
        return null;
    }, [extractPidFromWorkout, extractWidFromWorkout, postsByPid, workoutPostsState]);

    const workoutFeedItems = useMemo(() => {
        if (!visibleWorkouts.length) return [];

        return visibleWorkouts.map((workout) => {
            const matchedPost = findPostForWorkout(workout);
            if (!matchedPost || typeof matchedPost !== 'object') return null;
            const resolvedPid = matchedPost.pid || matchedPost.id;
            if (!resolvedPid || String(resolvedPid).startsWith('workout:')) return null;

            const mergedWorkout = {
                ...(matchedPost.workout || {}),
                ...(workout || {}),
                postPid: matchedPost.postPid ?? resolvedPid,
                pid: resolvedPid,
            };

            const post = {
                ...matchedPost,
                pid: resolvedPid,
                id: resolvedPid,
                workout: mergedWorkout,
            };

            if (!post.uid) {
                post.uid = String(
                    workout?.uid ??
                    mergedWorkout?.creatorUID ??
                    mergedWorkout?.creatorUid ??
                    userData?.uid ??
                    targetUid ??
                    ''
                );
            }

            if (!post.handle && workout?.handle) post.handle = workout.handle;
            if (!post.name && workout?.name) post.name = workout.name;
            if (!post.pfp && workout?.pfp) post.pfp = workout.pfp;

            return post;
        }).filter(Boolean);
    }, [visibleWorkouts, findPostForWorkout, targetUid, userData?.uid]);

    const handleBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    const handleSelectTab = useCallback((tab) => {
        setSelectedTab(tab);
    }, []);

    const resolveFeedItem = useCallback((item) => {
        if (!item) return null;
        const pidKey = item?.pid ? String(item.pid) : (item?.id ? String(item.id) : (item?.postPid ? String(item.postPid) : null));
        if (!pidKey) return item;
        return postsByPid.get(pidKey) || workoutPostsState.byPid[pidKey] || item;
    }, [postsByPid, workoutPostsState]);

    const openPastWorkout = useCallback((feedItemInput, options = {}) => {
        const feedItem = resolveFeedItem(feedItemInput);
        if (!feedItem || !feedItem.workout) return;

        const workout = {
            ...feedItem.workout,
            created: feedItem.workout.created ?? feedItem.created ?? Date.now(),
        };
        const fallbackUid = String(feedItem.uid || workout.creatorUID || workout.creatorUid || userData?.uid || targetUid || '');
        workout.creatorUID = workout.creatorUID || workout.creatorUid || fallbackUid;
        workout.creatorUid = workout.creatorUid || workout.creatorUID || fallbackUid;
        if (!workout.handle) {
            workout.handle = feedItem.handle || workout.username || '';
        }

        const ownerHandle = ensureAtHandle(feedItem.handle || workout.handle || workout.username || '');
        const owner = {
            uid: fallbackUid,
            handle: ownerHandle,
            name: feedItem.name || workout.ownerName || workout.name || '',
            pfp: feedItem.image || workout.pfp || workout.pfpUrl || workout.photoURL || workout.photo || '',
            pfpVersion: Number(feedItem.pfpVersion ?? workout.pfpVersion ?? 0),
            rankTier: feedItem.rankTier ?? feedItem.currentRank?.tier ?? feedItem.currentRank?.rankTier ?? feedItem.rank?.tier ?? feedItem.rank?.rankTier ?? workout.rankTier ?? workout.currentRank?.tier ?? workout.currentRank?.rankTier ?? workout.rank?.tier ?? workout.rank?.rankTier ?? null,
            currentRank: feedItem.currentRank || workout.currentRank || null,
            rank: feedItem.rank || workout.rank || null,
        };

        const likes = Array.isArray(feedItem.likes) ? feedItem.likes : [];
        const comments = Array.isArray(feedItem.comments) ? feedItem.comments : [];
        const postMeta = {
            pid: feedItem.pid || feedItem.id || `${owner.uid}:${workout.wid || workout.id || Date.now()}`,
            caption: typeof feedItem.caption === 'string' ? feedItem.caption : '',
            created: feedItem.created ?? workout.created ?? Date.now(),
            likeCount: Number.isFinite(Number(feedItem.likeCount)) ? Number(feedItem.likeCount) : likes.length,
            commentCount: Number.isFinite(Number(feedItem.commentCount)) ? Number(feedItem.commentCount) : comments.length,
            likes,
            comments,
            media: Array.isArray(feedItem.media) ? feedItem.media : [],
            images: Array.isArray(feedItem.images) ? feedItem.images : [],
            shareCount: Number.isFinite(Number(feedItem.shareCount)) ? Number(feedItem.shareCount) : 0,
            tags: Array.isArray(feedItem.tags) ? feedItem.tags : [],
            tagged: Array.isArray(feedItem.tagged) ? feedItem.tagged : [],
        };

        const params = { workout, owner, postMeta };
        if (options.startEditing) {
            params.startEditing = true;
        }

        navigation.navigate('PastWorkout', params);
    }, [navigation, resolveFeedItem, targetUid, userData?.uid]);

    const handlePostWorkout = useCallback((post) => {
        const resolved = resolveFeedItem(post);
        if (!resolved) return;
        setActiveFeedItem(resolved);
        openPastWorkout(resolved);
    }, [openPastWorkout, resolveFeedItem]);

    const handleEditWorkout = useCallback((post) => {
        const resolved = resolveFeedItem(post);
        if (!resolved) return;
        try {
            shouldRefreshOnFocusRef.current = true;
        } catch { }
        openPastWorkout(resolved, { startEditing: true });
    }, [openPastWorkout, resolveFeedItem]);

    const handleEditPost = useCallback(async (post) => {
        const resolved = resolveFeedItem(post);
        if (!resolved) return;

        const pid = String(resolved?.pid || resolved?.id || '').trim();
        if (!pid) return;

        let latest = resolved;
        try {
            const fetched = await readDoc('posts', pid);
            if (fetched) {
                latest = { ...resolved, ...fetched };
            }
        } catch (error) {
            console.warn('ProfileWorkoutsAndPostsScreen: handleEditPost failed to fetch latest post', { pid, error });
        }

        const { resolvedCaption, mediaEntries, editingPayload } = buildEditPostPayload(latest, resolved.workout, pid);

        try {
            shouldRefreshOnFocusRef.current = true;
        } catch { }

        if (isClipPost(latest)) {
            const clipEntry = mediaEntries.find((entry) => entry?.type === 'video');
            if (!clipEntry) {
                Alert.alert('Unable to edit clip', 'This clip is missing its video. Please try again later.');
                return;
            }
        navigation.navigate('EditClip', {
            initialClip: clipEntry,
            initialCaption: resolvedCaption,
            editingContext: { editingPost: editingPayload },
        });
        return;
    }

        navigation.navigate('PostOptions', {
            images: mediaEntries,
            editingPost: editingPayload,
        });
    }, [navigation, resolveFeedItem]);

    const showLikesSheet = useCallback((users, title = 'Liked by') => {
        const processed = Array.isArray(users)
            ? users
                .map((entry) => {
                    if (!entry) return null;
                    if (typeof entry === 'string' || typeof entry === 'number') {
                        const uid = String(entry).trim();
                        return uid ? { uid } : null;
                    }
                    if (typeof entry === 'object') {
                        const uid = entry?.uid ?? entry?.id;
                        if (uid == null) return sanitizeEntry(entry);
                        const safeUid = String(uid).trim();
                        if (!safeUid) return null;
                        return sanitizeEntry({ ...entry, uid: safeUid });
                    }
                    return null;
                })
                .filter(Boolean)
            : [];

        setLikesSheetUsers(processed);
        setLikesSheetTitle(title || 'Liked by');
        setLikesSheetVisible(true);
    }, []);

    const handlePressComments = useCallback((data) => {
        if (!data) return;
        const resolved = resolveFeedItem(data);
        const pid = String(resolved?.pid || '');
        if (!pid || (pid.startsWith('workout:') && !pid.startsWith('workout:live'))) {
            openPastWorkout(resolved || data);
            return;
        }
        setActiveFeedItem(resolved);
        setCommentsVisible(true);
        setCommentsExpandFlag((flag) => !flag);
    }, [openPastWorkout, resolveFeedItem]);

    const handleDismissComments = useCallback(() => {
        setCommentsVisible(false);
    }, []);

    const handlePressLikes = useCallback((data) => {
        if (!data) return;
        const resolved = resolveFeedItem(data);
        const pid = String(resolved?.pid || '');
        if (!pid || (pid.startsWith('workout:') && !pid.startsWith('workout:live'))) {
            openPastWorkout(resolved || data);
            return;
        }
        setActiveFeedItem(resolved);
        showLikesSheet(resolved?.likes, 'Liked by');
    }, [openPastWorkout, resolveFeedItem, showLikesSheet]);

    const handlePressProfile = useCallback((data) => {
        if (!data) return;
        const resolved = resolveFeedItem(data);
        const targetUid = String(resolved?.uid || resolved?.creatorUID || resolved?.creatorUid || '');
        if (!targetUid) return;
        hapticStrong();
        const rootNav = navigation?.getParent?.('ROOT');
        if (isThisUser(targetUid)) {
            if (rootNav?.navigate) rootNav.navigate('Profile');
            else navigation.navigate('Profile');
            return;
        }
        const rawHandle = ensureAtHandle(resolved?.handle || resolved?.username || '');
        const cleanHandle = rawHandle.startsWith('@') ? rawHandle.slice(1) : rawHandle;
        const user = {
            uid: targetUid,
            handle: cleanHandle,
            name: resolved?.name || resolved?.ownerName || '',
            pfp: resolved?.pfp || resolved?.image || resolved?.photoURL || resolved?.photo || '',
        };
        if (rootNav?.navigate) rootNav.navigate('ViewProfile', { user });
        else navigation.navigate('ViewProfile', { user });
    }, [navigation, resolveFeedItem]);

    const handleViewProfileFromComments = useCallback((data) => {
        if (!data) return;
        hapticStrong();
        const rootNav = navigation?.getParent?.('ROOT');
        if (isThisUser(data?.uid)) {
            if (rootNav?.navigate) rootNav.navigate('Profile');
            else navigation.navigate('Profile');
        } else {
            const user = {
                uid: data?.uid,
                handle: data?.handle,
                name: data?.name,
                pfp: data?.pfp,
            };
            if (rootNav?.navigate) rootNav.navigate('ViewProfile', { user });
            else navigation.navigate('ViewProfile', { user });
        }
    }, [navigation]);

    const renderPost = useCallback(({ item, index }) => (
        <View style={styles.postWrapper}>
            <SimpleFeedPost
                data={item}
                index={index}
                highlightPid={null}
                highlightSignal={0}
                onPressProfile={(_, data) => handlePressProfile(data || item)}
                onPressWorkout={(_, data) => handlePostWorkout(data || item)}
                onPressComments={(_, data) => handlePressComments(data || item)}
                onPressLikes={(_, data) => handlePressLikes(data || item)}
                onPressEditPost={(_, data) => handleEditPost(data || item)}
                onPressEditWorkout={(_, data) => handleEditWorkout(data || item)}
            />
        </View>
    ), [handleEditPost, handleEditWorkout, handlePostWorkout, handlePressProfile, handlePressComments, handlePressLikes]);

    const keyExtractor = useCallback((item, index) => {
        const pid = item?.pid ?? item?.id;
        return pid ? String(pid) : `post-${index}`;
    }, []);

    const postsEmptyComponent = useMemo(() => {
        if (postsLoading) {
            return (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="small" color="#93C5FD" />
                </View>
            );
        }
        if (postsError) {
            return (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>Posts unavailable</Text>
                    <Text style={styles.emptySubtitle}>{postsError}</Text>
                </View>
            );
        }
        return (
            <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No posts yet</Text>
                <Text style={styles.emptySubtitle}>
                    {isViewingSelf ? 'Share a post to see it here.' : 'This user has not shared any posts yet.'}
                </Text>
            </View>
        );
    }, [postsLoading, postsError, isViewingSelf]);

    const workoutsEmptyComponent = useMemo(() => (
        <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No workouts yet</Text>
            <Text style={styles.emptySubtitle}>
                {isViewingSelf ? 'Log a workout to see it here.' : 'This athlete has not shared any workouts yet.'}
            </Text>
        </View>
    ), [isViewingSelf]);

    const headerPaddingTop = useMemo(() => scaleSize(6), []);

    const headerContent = useMemo(() => {
        const tabs = ['Workouts', 'All Posts'];
        return (
            <View style={[styles.headerContainer, { paddingTop: headerPaddingTop }]}>
                <View style={styles.headerRow}>
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={withStrongPress(handleBack)}
                        style={styles.headerBackButton}
                        hitSlop={10}
                    >
                        <Ionicons name="chevron-back" size={scaleSize(22)} color={theme.textPrimary} />
                    </TouchableOpacity>

                    <View style={styles.segmentWrap}>
                        <View style={styles.segmentBg}>
                            {tabs.map((tab) => {
                                const isActive = selectedTab === tab;
                                return (
                                    <TouchableOpacity
                                        key={tab}
                                        activeOpacity={0.82}
                                        onPress={withStrongPress(() => handleSelectTab(tab))}
                                        style={[styles.segmentChip, isActive && styles.segmentChipActive]}
                                    >
                                        <Text style={[styles.segmentChipText, isActive && styles.segmentChipTextActive]}>
                                            {tab}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>
            </View>
        );
    }, [handleBack, handleSelectTab, headerPaddingTop, selectedTab]);
    const showingWorkouts = selectedTab === 'Workouts';

    let mainContent = null;
    if (!targetUid) {
        mainContent = (
            <View style={styles.errorContainer}>
                <Text style={styles.emptyTitle}>Profile unavailable</Text>
                <Text style={styles.emptySubtitle}>We could not determine which profile to load.</Text>
            </View>
        );
    } else if (!userData && isUserLoading) {
        mainContent = (
            <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#93C5FD" />
            </View>
        );
    } else if (!canViewContent) {
        const lockedSubtitle = userData?.settings?.profilePrivate ? 'Only approved followers can view these workouts and posts.' : '';
        mainContent = <LockedView subtitle={lockedSubtitle} />;
    } else if (showingWorkouts) {
        mainContent = (
            <FlatList
                data={workoutFeedItems}
                renderItem={renderPost}
                keyExtractor={keyExtractor}
                ListEmptyComponent={workoutPostsLoading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="small" color="#93C5FD" />
                        <Text style={styles.loadingNote}>Syncing workouts…</Text>
                    </View>
                ) : workoutsEmptyComponent}
                contentContainerStyle={styles.workoutListContent}
                style={styles.list}
                showsVerticalScrollIndicator={false}
                initialNumToRender={5}
            />
        );
    } else {
        mainContent = (
            <FlatList
                data={posts}
                renderItem={renderPost}
                keyExtractor={keyExtractor}
                ListEmptyComponent={postsEmptyComponent}
                contentContainerStyle={styles.listContent}
                style={styles.list}
                showsVerticalScrollIndicator={false}
                initialNumToRender={4}
            />
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
            <View style={styles.contentWrap}>
                {headerContent}
                <View style={styles.bodyContent}>
                    {mainContent}
                </View>
            </View>

            <Footer currentScreenName={'Profile'} navigation={navigation} />

            <CommentsBottomSheet
                isVisible={commentsVisible}
                postData={commentsVisible ? activeFeedItem : null}
                commentsBottomSheetExpandFlag={commentsExpandFlag}
                toViewProfile={handleViewProfileFromComments}
                onShowLikesSheet={showLikesSheet}
                onDismiss={handleDismissComments}
            />

            <FollowListBottomSheet
                isVisible={likesSheetVisible}
                setIsVisible={setLikesSheetVisible}
                title={likesSheetTitle}
                users={likesSheetUsers}
                navigation={navigation}
            />
        </SafeAreaView>
    );
}
