/**
 * Feed Screen. Displays posts in a simple scrolling list and manages feed overlays.
 */

import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    StyleSheet,
    FlatList,
    RefreshControl,
    View,
    TouchableOpacity,
    Alert,
    Text,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useIsFocused, useFocusEffect } from "@react-navigation/native";
import useStableSafeAreaInsets from "../hooks/useStableSafeAreaInsets";

import PostListItem from "../components/1_Feed/PostListItem";
import FeedHeader from "../components/1_Feed/FeedHeader";
import useHeaderSearchUsers from "../hooks/useHeaderSearchUsers";
import CommentsBottomSheet from "../components/1_Feed/Comments/CommentsBottomSheet";
import ShareBottomSheet from "../components/1_Feed/SharePost/ShareBottomSheet";
import FollowListBottomSheet from "../components/FollowListBottomSheet";
import Footer from "../components/Footer";
import theme from "../theme/mfpDark";
import scaleSize from "../helper/scaleSize";
import isThisUser from "../helper/isThisUser";
import useFilteredFeed from "../helper/useFilteredFeed";
import useFeedUserData from "./feed/hooks/useFeedUserData";
import { toMillis as toMillisSafe } from "../utils/friends";
import deletePost from "../../backend/posts/deletePost";
import deleteCompletedWorkout from "../../backend/workouts/deleteCompletedWorkout";
import { emitHexagonUpdate } from "../utils/hexagonEvents";
import readDoc from "../../backend/helper/firebase/readDoc";
import { strong as hapticStrong } from "../utils/haptics";

const HEADER_TOP_TRIM = scaleSize(4);
const LIST_BOTTOM_INSET = scaleSize(120);

const toNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};

const sanitizeWorkoutForRoute = (workout) => {
    if (!workout || typeof workout !== "object") return null;

    const replacer = (_key, value) => (typeof value === "function" ? undefined : value);

    try {
        return JSON.parse(JSON.stringify(workout, replacer));
    } catch {
        const clone = { ...workout };
        clone.exercises = Array.isArray(workout.exercises)
            ? workout.exercises.map((exercise) => {
                if (!exercise || typeof exercise !== "object") return {};
                const sets = Array.isArray(exercise.sets)
                    ? exercise.sets.map((set) => {
                        if (!set || typeof set !== "object") return {};
                        const { weight, reps, unit, units, weightUnit, kg, lbs, ...rest } = set;
                        const normalized = {
                            ...rest,
                            weight: Number(weight ?? kg ?? lbs ?? 0) || 0,
                            reps: Number(reps ?? set?.rep ?? set?.r ?? 0) || 0,
                        };
                        const resolvedUnit = unit || units || weightUnit || (kg != null ? "kg" : undefined);
                        if (resolvedUnit) normalized.unit = resolvedUnit;
                        normalized.prev = Object.prototype.hasOwnProperty.call(set, "prev")
                            ? (set?.prev && typeof set.prev === "object"
                                ? {
                                    weight: Number(set.prev?.weight) || 0,
                                    reps: Number(set.prev?.reps) || 0,
                                }
                                : null)
                            : null;
                        return normalized;
                    })
                    : [];
                return { ...exercise, sets };
            })
            : [];
        return clone;
    }
};

const ensureAtHandle = (value) => {
    if (!value) return "";
    const str = String(value).trim();
    if (!str) return "";
    return str.startsWith("@") ? str : `@${str}`;
};

export default function Feed({ navigation, route }) {
    const insets = useStableSafeAreaInsets();
    const isScreenFocused = useIsFocused();

    const UID = "userData" in global ? global.userData.uid : route?.params?.uid;

    const followingList = global.userData ? global.userData?.following : [];

    const {
        posts,
        loadMore: loadMorePosts,
        hasMore: hasMorePosts,
        loadingMore: loadingMorePosts,
    } = useFilteredFeed(followingList);

    const {
        activeWorkout,
        footerKey,
        headerTimerRef,
        toMessagesScreen,
    } = useFeedUserData({ UID, navigation, route, isScreenFocused });

    const { allUsersRef, mergeUsersIntoRef } = useHeaderSearchUsers({
        following: global.userData?.following,
        enablePrefetch: true,
    });

    const flatListRef = useRef(null);
    const [refreshing, setRefreshing] = useState(false);
    const [activePostIndex, setActivePostIndex] = useState(-1);
    const [activeSheet, setActiveSheet] = useState(null); // 'comments' | 'share' | null
    const [commentsBottomSheetExpandFlag, setCommentsBottomSheetExpandFlag] = useState(false);
    const [shareBottomSheetExpandFlag, setShareBottomSheetExpandFlag] = useState(false);
    const [shareBottomSheetCloseFlag, setShareBottomSheetCloseFlag] = useState(false);
    const [likesSheetVisible, setLikesSheetVisible] = useState(false);
    const [likesSheetUsers, setLikesSheetUsers] = useState([]);
    const [likesSheetTitle, setLikesSheetTitle] = useState("Liked by");
    const [deletingPostPid, setDeletingPostPid] = useState(null);

    const highlightPidRef = useRef(null);
    const [highlightSignal, setHighlightSignal] = useState(0);
    const [pendingScrollRequest, setPendingScrollRequest] = useState(null);


    const resolveTimestamp = useCallback((item) => {
        if (!item) return 0;
        const fallback = item?.workout || null;
        const candidates = [
            item?.created,
            item?.createdAt,
            item?.updatedAt,
            fallback?.created,
            fallback?.createdAt,
            fallback?.completedAt,
            fallback?.finishedAt,
        ];
        for (const value of candidates) {
            const ms = toMillisSafe(value);
            if (ms) return ms;
        }
        return 0;
    }, []);

    const listData = useMemo(() => {
        const basePosts = Array.isArray(posts) ? [...posts] : [];
        basePosts.sort((a, b) => {
            const liveA = Boolean(a?.isLive || a?.liveWorkout);
            const liveB = Boolean(b?.isLive || b?.liveWorkout);
            if (liveA !== liveB) {
                return liveA ? -1 : 1;
            }
            return resolveTimestamp(b) - resolveTimestamp(a);
        });
        return basePosts;
    }, [posts, resolveTimestamp]);

    const handleEndReached = useCallback(() => {
        if (!hasMorePosts || loadingMorePosts) return;
        loadMorePosts();
    }, [hasMorePosts, loadingMorePosts, loadMorePosts]);

    const listFooter = useMemo(() => {
        if (!loadingMorePosts) return null;
        return (
            <View style={styles.listFooter}>
                <ActivityIndicator size="small" color={theme.textSecondary} />
            </View>
        );
    }, [loadingMorePosts]);

    const onRefresh = useCallback(async () => {
        try {
            setRefreshing(true);
            await new Promise((resolve) => setTimeout(resolve, 600));
        } finally {
            setRefreshing(false);
        }
    }, []);

    const openCommentsModal = useCallback((index) => {
        if (!Array.isArray(listData) || index == null || index < 0 || index >= listData.length) {
            return;
        }
        setActivePostIndex(index);
        setActiveSheet("comments");
        setCommentsBottomSheetExpandFlag((flag) => !flag);
    }, [listData]);

    const dismissCommentsModal = useCallback(() => {
        setActiveSheet((current) => {
            if (current === "comments") {
                setActivePostIndex(-1);
                return null;
            }
            return current;
        });
    }, []);

    const openShareModal = useCallback((index) => {
        if (!Array.isArray(listData) || index == null || index < 0 || index >= listData.length) {
            return;
        }
        setActivePostIndex(index);
        setActiveSheet("share");
        setShareBottomSheetExpandFlag((flag) => !flag);
    }, [listData]);

    const showLikesSheet = useCallback((users, title = "Liked by") => {
        const processed = Array.isArray(users)
            ? users
                .map((entry) => {
                    if (!entry) return null;
                    if (typeof entry === "string" || typeof entry === "number") {
                        const uid = String(entry).trim();
                        return uid ? uid : null;
                    }
                    if (typeof entry === "object") {
                        const uid = entry?.uid ?? entry?.id;
                        if (uid == null) return entry;
                        const safeUid = String(uid).trim();
                        if (!safeUid) return null;
                        return { ...entry, uid: safeUid };
                    }
                    return null;
                })
                .filter(Boolean)
            : [];
        setLikesSheetUsers(processed);
        setLikesSheetTitle(title || "Liked by");
        setLikesSheetVisible(true);
    }, []);

    const openLikesSheet = useCallback((index) => {
        if (!Array.isArray(listData) || index == null || index < 0 || index >= listData.length) {
            return;
        }
        const post = listData[index];
        if (!post) return;
        showLikesSheet(post.likes, "Liked by");
    }, [listData, showLikesSheet]);

    const handleDeletePost = useCallback((index) => {
        if (!Array.isArray(listData) || index == null || index < 0 || index >= listData.length) {
            return;
        }

        const post = listData[index];
        if (!post) return;

        const pid = String(post?.pid || post?.id || "").trim();
        if (!pid) return;

        const ownerUidCandidates = [
            post?.uid,
            post?.creatorUid,
            post?.creatorUID,
            post?.ownerUid,
            post?.userUid,
        ];
        const ownerUid = ownerUidCandidates
            .map((value) => (value == null ? "" : String(value).trim()))
            .find(Boolean);
        const viewerUid = global?.userData?.uid ? String(global.userData.uid) : "";
        const safeUid = ownerUid || viewerUid;

        const workoutDeleteIdentifier = (() => {
            const workout = post?.workout;
            if (!workout || typeof workout !== "object") return null;
            const widCandidates = [
                workout?.wid,
                workout?.id,
                workout?.workoutId,
                workout?.pid,
                workout?.postPid,
            ];
            let wid = "";
            for (const value of widCandidates) {
                if (value === undefined || value === null) continue;
                const str = String(value).trim();
                if (str) {
                    wid = str;
                    break;
                }
            }

            const createdCandidates = [
                workout?.created,
                workout?.createdAt,
                workout?.finishedAt,
                workout?.completedAt,
                workout?.startedAt,
            ];
            let created = 0;
            for (const value of createdCandidates) {
                const ms = toMillisSafe(value);
                if (ms) {
                    created = ms;
                    break;
                }
            }
            if (!wid && !created) return null;
            return { wid: wid || null, created: created || 0 };
        })();

        const viewerOwnsPost = viewerUid && safeUid && viewerUid === safeUid;
        const canDeleteLinkedWorkout = Boolean(viewerOwnsPost && workoutDeleteIdentifier);
        const deleteTitle = canDeleteLinkedWorkout ? "Delete post & workout?" : "Delete post?";
        const deleteMessage = canDeleteLinkedWorkout
            ? "This will delete the post and remove the workout from your history and stats."
            : "This will permanently remove the post and its comments.";

        if (deletingPostPid && deletingPostPid === pid) {
            return;
        }

        const executeDelete = async () => {
            setDeletingPostPid(pid);
            let postError = null;
            let workoutError = null;
            let workoutResult = null;

            try {
                await deletePost(pid, safeUid);
            } catch (error) {
                postError = error;
                console.error("handleDeletePost: deletePost failed", error);
            }

            if (!postError && safeUid && global?.userData && String(global.userData.uid) === safeUid) {
                try {
                    if (Array.isArray(global.userData.posts)) {
                        global.userData.posts = global.userData.posts
                            .map((value) => (value == null ? value : String(value)))
                            .filter((value) => value && value !== pid);
                    }
                    if (typeof global.userData.postCount === "number") {
                        global.userData.postCount = Math.max(0, global.userData.postCount - 1);
                    }
                } catch (error) {
                    console.warn("handleDeletePost: failed to update global userData cache", error);
                }
            }

            if (!postError && canDeleteLinkedWorkout && safeUid) {
                try {
                    const res = await deleteCompletedWorkout(safeUid, workoutDeleteIdentifier);
                    workoutResult = res;
                    if (res?.ok && global?.userData && String(global.userData.uid) === safeUid) {
                        try {
                            global.userData.completedWorkouts = Array.isArray(res.completedWorkouts) ? res.completedWorkouts : [];
                            global.userData.statsExercises = res.statsExercises || {};
                            global.userData.statsHexagon = res.statsHexagon || {};
                            global.userData.statsHexagonMeta = res.statsHexagonMeta || {};
                            global.userData.statsTotalVolume = res.statsTotalVolume || 0;
                            global.userData.statsTotalHours = res.statsTotalHours || 0;
                            global.userData.statsTotalWorkouts = res.statsTotalWorkouts || 0;
                            global.userData.workoutsByDate = res.workoutsByDate || {};
                        } catch (error) {
                            console.warn("handleDeletePost: failed to update workout stats cache", error);
                        }
                    }
                } catch (error) {
                    workoutError = error;
                    console.error("handleDeletePost: deleteCompletedWorkout failed", error);
                }
            }

            if (workoutResult?.ok) {
                emitHexagonUpdate();
            }

            if (postError) {
                Alert.alert("Unable to delete post", "Please try again in a moment.");
            } else if (workoutError) {
                Alert.alert(
                    "Workout removal incomplete",
                    "The post was deleted, but the workout is still in your history. Please retry from the workout details screen."
                );
            }

            setDeletingPostPid((current) => (current === pid ? null : current));
        };

        Alert.alert(
            deleteTitle,
            deleteMessage,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: canDeleteLinkedWorkout ? "Delete Post & Workout" : "Delete",
                    style: "destructive",
                    onPress: () => {
                        if (deletingPostPid && deletingPostPid === pid) return;
                        executeDelete();
                    },
                },
            ]
        );
    }, [listData, deletingPostPid, deletePost, deleteCompletedWorkout, emitHexagonUpdate]);

    const handleEditPost = useCallback(async (index) => {
        if (!Array.isArray(listData) || index == null || index < 0 || index >= listData.length) {
            return;
        }

        const post = listData[index];
        if (!post) return;

        const pid = String(post?.pid || post?.id || "").trim();
        if (!pid) return;

        let latest = post;
        try {
            const fetched = await readDoc("posts", pid);
            if (fetched) latest = fetched;
        } catch (error) {
            console.warn("handleEditPost: failed to fetch latest post", error);
        }

        const resolvedCaption = (() => {
            if (typeof latest.caption === "string" && latest.caption.trim()) {
                return latest.caption;
            }
            const captionComment = Array.isArray(latest.comments)
                ? latest.comments.find((comment) => comment?.isCaption && typeof comment?.content === "string")
                : null;
            return captionComment?.content || "";
        })();

        const mediaEntries = [];
        const seen = new Set();

        if (Array.isArray(latest.media)) {
            latest.media.forEach((entry) => {
                const uri = typeof entry === "string" ? entry : entry?.uri;
                if (!uri || seen.has(uri)) return;
                seen.add(uri);
                const type = typeof entry === "string" ? undefined : entry?.type;
                mediaEntries.push({ uri, type: type === "video" ? "video" : "image" });
            });
        }
        if (Array.isArray(latest.images)) {
            latest.images.forEach((entry) => {
                const uri = typeof entry === "string" ? entry : entry?.uri;
                if (!uri || seen.has(uri)) return;
                seen.add(uri);
                mediaEntries.push({ uri, type: "image" });
            });
        }

        const uniqueMedia = mediaEntries.map((entry) => entry.uri);
        const workoutName = (() => {
            const source = latest.workout || post.workout || null;
            if (!source || typeof source !== "object") return "";
            const candidate = source.templateName || source.template?.name || source.name || source.workoutName || "";
            return candidate ? String(candidate).trim() : "";
        })();

        navigation.navigate("PostOptions", {
            images: uniqueMedia,
            editingPost: {
                pid,
                caption: resolvedCaption,
                mediaEntries,
                workoutName,
            },
        });
    }, [listData, navigation]);

    const handleOpenNotifications = useCallback(() => {
        try {
            navigation?.navigate?.("Notifications", { transition: "slide-from-right" });
        } catch { }
    }, [navigation]);

    const toViewProfilePosts = useCallback((index) => {
        const post = listData[index];
        if (!post) return;
        const user = { handle: post.handle, uid: post.uid, pfp: post.pfp, name: post.name };
        const rootNav = navigation?.getParent?.("ROOT");
        hapticStrong();
        if (isThisUser(post.uid)) {
            if (rootNav?.navigate) rootNav.navigate("Profile", { transition: "slide-from-right" });
            else navigation.navigate("Profile", { transition: "slide-from-right" });
        } else {
            if (rootNav?.navigate) rootNav.navigate("ViewProfile", { user });
            else navigation.navigate("ViewProfile", { user });
        }
    }, [navigation, listData]);

    const toViewProfileComments = useCallback((data) => {
        const user = { handle: data.handle, uid: data.uid, pfp: data.pfp, name: data.name };
        const rootNav = navigation?.getParent?.("ROOT");
        hapticStrong();
        if (isThisUser(data.uid)) {
            if (rootNav?.navigate) rootNav.navigate("Profile", { transition: "slide-from-right" });
            else navigation.navigate("Profile", { transition: "slide-from-right" });
        } else {
            if (rootNav?.navigate) rootNav.navigate("ViewProfile", { user });
            else navigation.navigate("ViewProfile", { user });
        }
    }, [navigation]);

    const openViewWorkoutModal = useCallback((index) => {
        if (!Array.isArray(listData) || index == null || index < 0 || index >= listData.length) {
            return;
        }

        const post = listData[index];
        const workoutInput = post?.workout;
        if (!workoutInput) return;

        const fallback = {
            wid: workoutInput?.wid || workoutInput?.id,
            creatorUID: workoutInput?.creatorUID || workoutInput?.creatorUid || post?.uid || (global?.userData?.uid || ""),
            created: workoutInput?.created || workoutInput?.createdAt || Date.now(),
            exercises: Array.isArray(workoutInput?.exercises) ? workoutInput.exercises : [],
            duration: workoutInput?.duration,
            volume: workoutInput?.volume,
            reps: workoutInput?.reps,
            PBs: workoutInput?.PBs ?? workoutInput?.pbs ?? 0,
            templateName: workoutInput?.templateName || workoutInput?.template?.name,
        };

        const mergedWorkout = { ...fallback, ...workoutInput };
        const ownerUid = String(post?.uid || mergedWorkout.creatorUID || mergedWorkout.creatorUid || "");
        const ownerHandle = ensureAtHandle(post?.handle || mergedWorkout.handle || mergedWorkout.username || "");
        const ownerName = post?.name || mergedWorkout.ownerName || mergedWorkout.name || "";
        const ownerPfp = post?.pfp || mergedWorkout.pfp || mergedWorkout.pfpUrl || mergedWorkout.photoURL || mergedWorkout.photo || "";
        const ownerPfpVersion = post?.pfpVersion ?? mergedWorkout.pfpVersion ?? mergedWorkout.version ?? 0;

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

        const likeCount = Array.isArray(post?.likes) ? post.likes.length : toNumber(post?.likeCount);
        const commentCount = Array.isArray(post?.comments)
            ? Math.max(0, post.comments.length - 1)
            : toNumber(post?.commentCount);

        const sanitizeEntry = (entry) => {
            if (!entry || typeof entry !== "object") return entry;
            try {
                return JSON.parse(JSON.stringify(entry, (_key, value) => (typeof value === "function" ? undefined : value)));
            } catch {
                return { ...entry };
            }
        };

        const likesForRoute = Array.isArray(post?.likes)
            ? post.likes.map(sanitizeEntry)
            : [];

        const mediaForRoute = Array.isArray(post?.media)
            ? post.media.map(sanitizeEntry)
            : [];

        const imagesForRoute = Array.isArray(post?.images)
            ? post.images.map(sanitizeEntry)
            : [];

        const tagsForRoute = Array.isArray(post?.tags) ? [...post.tags] : [];
        const taggedForRoute = Array.isArray(post?.tagged) ? [...post.tagged] : [];

        navigation?.navigate?.("PastWorkout", {
            workout: sanitizedWorkout,
            owner: {
                uid: ownerUid,
                handle: ownerHandle,
                name: ownerName,
                pfp: ownerPfp,
                pfpVersion: ownerPfpVersion,
            },
            postMeta: {
                pid: post?.pid ?? post?.id ?? `${ownerUid}:${sanitizedWorkout?.wid ?? sanitizedWorkout?.id ?? index}`,
                caption: typeof post?.caption === "string" ? post.caption : "",
                created: post?.created ?? post?.createdAt ?? sanitizedWorkout?.created ?? null,
                likeCount,
                commentCount,
                likes: likesForRoute,
                media: mediaForRoute,
                images: imagesForRoute,
                shareCount: toNumber(post?.shareCount),
                tags: tagsForRoute,
                tagged: taggedForRoute,
            },
        });
    }, [listData, navigation]);

    const scrollToTop = useCallback(() => {
        if (flatListRef.current) {
            flatListRef.current.scrollToOffset({ offset: 0, animated: true });
        }
    }, []);

    useEffect(() => {
        try { global.scrollFeedToTop = scrollToTop; } catch { }
        return () => {
            try {
                if (global.scrollFeedToTop === scrollToTop) {
                    global.scrollFeedToTop = undefined;
                }
            } catch { }
        };
    }, [scrollToTop]);

    const scrollToPid = useCallback((pid) => {
        if (!pid || !Array.isArray(listData) || listData.length === 0) return false;
        const idx = listData.findIndex((p) => String(p?.pid || "") === String(pid));
        if (idx < 0) return false;
        highlightPidRef.current = String(pid);
        setHighlightSignal(Date.now());
        try {
            flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0 });
        } catch {
            try { flatListRef.current?.scrollToOffset({ offset: 0, animated: true }); } catch { }
        }
        return true;
    }, [listData]);

    useEffect(() => {
        if (route?.params?.scrollToTop) {
            const id = setTimeout(() => scrollToTop(), 30);
            try { navigation.setParams({ scrollToTop: false }); } catch { }
            return () => clearTimeout(id);
        }
        return undefined;
    }, [route?.params?.scrollToTop, navigation, scrollToTop]);

    useEffect(() => {
        if (route?.params?.focusPid || route?.params?.scrollPid) {
            const rawPid = route?.params?.focusPid ?? route?.params?.scrollPid;
            if (rawPid !== undefined && rawPid !== null) {
                const pid = String(rawPid);
                setPendingScrollRequest({ pid });
                const id = setTimeout(() => {
                    const ok = scrollToPid(pid);
                    if (ok) setPendingScrollRequest(null);
                }, 50);
                const cleanup = () => clearTimeout(id);
                try { navigation.setParams({ focusPid: undefined, scrollPid: undefined }); } catch { }
                return cleanup;
            }
            try { navigation.setParams({ focusPid: undefined, scrollPid: undefined }); } catch { }
        }
        return undefined;
    }, [route?.params?.focusPid, route?.params?.scrollPid, navigation, scrollToPid]);

    useEffect(() => {
        if (!pendingScrollRequest?.pid) return;
        const ok = scrollToPid(pendingScrollRequest.pid);
        if (ok) setPendingScrollRequest(null);
    }, [pendingScrollRequest, scrollToPid]);

    useFocusEffect(
        useCallback(() => {
            const sig = Number(global?.scrollFeedToTopSignal || 0);
            const handled = Number(global?.scrollFeedToTopHandled || 0);
            if (sig && sig !== handled) {
                try { global.scrollFeedToTopHandled = sig; } catch { }
                const id = setTimeout(() => scrollToTop(), 30);
                return () => clearTimeout(id);
            }
            return undefined;
        }, [scrollToTop])
    );

    useEffect(() => {
        if (!listData || listData.length === 0) return;
        const seeded = listData
            .map((p) => ({ uid: p?.uid, handle: p?.handle, name: p?.name, pfp: p?.pfp }))
            .filter((u) => !!u.uid);
        mergeUsersIntoRef(seeded);
    }, [listData, mergeUsersIntoRef]);

    const listKeyExtractor = useCallback((item, index) => String(item?.pid || item?.id || index), []);

    const renderPost = useCallback(({ item, index }) => (
        <PostListItem
            item={item}
            index={index}
            highlightPid={highlightPidRef.current}
            highlightSignal={highlightSignal}
            openCommentsModal={openCommentsModal}
            openShareModal={openShareModal}
            openLikesSheet={openLikesSheet}
            toViewProfilePosts={toViewProfilePosts}
            openViewWorkoutModal={openViewWorkoutModal}
            onDeletePost={handleDeletePost}
            onEditPost={handleEditPost}
        />
    ), [highlightSignal, openCommentsModal, openShareModal, openLikesSheet, toViewProfilePosts, openViewWorkoutModal, handleDeletePost, handleEditPost]);

    const headerComponent = useMemo(() => (
        <FeedHeader
            navigation={navigation}
            toMessagesScreen={toMessagesScreen}
            onOpenNotifications={handleOpenNotifications}
            scrollToTop={scrollToTop}
            allUsersRef={allUsersRef}
            workout={activeWorkout}
            timerRef={headerTimerRef}
            heightAdjust={-2}
            topAdjust={-HEADER_TOP_TRIM}
            centerVariant="text"
            centerTitle="Feed"
            centerTextPreset="feed"
        />
    ), [navigation, toMessagesScreen, handleOpenNotifications, scrollToTop, allUsersRef, activeWorkout, headerTimerRef]);

    const renderEmptyList = () => (
        <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
                <Feather
                    name="users"
                    size={scaleSize(28)}
                    color={theme.primary}
                />
            </View>
            <Text style={styles.emptyTitle}>Your feed is quiet</Text>
            <Text style={styles.emptySubtitle}>
                Follow friends or share your progress to see posts here.
            </Text>
        </View>
    );

    const handleCreatePost = useCallback(() => {
        try {
            navigation?.navigate('PostOptions', { images: [] });
        } catch {
            navigation?.navigate('PostOptions');
        }
    }, [navigation]);

    const commentsVisible = activeSheet === "comments" && activePostIndex >= 0;
    const shareSheetVisible = activeSheet === "share";
    const activePost = commentsVisible || shareSheetVisible
        ? listData[activePostIndex] || null
        : null;

    return (
        <SafeAreaView style={styles.screen} edges={["top"]}>
            <StatusBar style="light" />
            <View style={styles.headerWrap}>{headerComponent}</View>
            <FlatList
                ref={flatListRef}
                data={listData}
                keyExtractor={listKeyExtractor}
                renderItem={renderPost}
                style={styles.list}
                ListEmptyComponent={renderEmptyList}
                ListFooterComponent={listFooter}
                refreshControl={(
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.textPrimary}
                        colors={[theme.textPrimary]}
                        progressBackgroundColor={theme.bg}
                    />
                )}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: LIST_BOTTOM_INSET + Math.max(0, insets.bottom || 0) },
                ]}
                showsVerticalScrollIndicator={false}
                onEndReached={handleEndReached}
                onEndReachedThreshold={0.6}
            />

            <TouchableOpacity
                style={[
                    styles.createPostButton,
                    { bottom: (insets.bottom || 0) + scaleSize(110) },
                ]}
                activeOpacity={0.85}
                onPress={handleCreatePost}
                accessibilityRole="button"
                accessibilityLabel="Create a post"
            >
                <Feather
                    name="plus"
                    size={scaleSize(24)}
                    color={'#000'}
                />
            </TouchableOpacity>

            <CommentsBottomSheet
                isVisible={commentsVisible}
                postData={commentsVisible ? activePost : null}
                commentsBottomSheetExpandFlag={commentsBottomSheetExpandFlag}
                toViewProfile={toViewProfileComments}
                onShowLikesSheet={showLikesSheet}
                onDismiss={dismissCommentsModal}
            />

            <FollowListBottomSheet
                isVisible={likesSheetVisible}
                setIsVisible={setLikesSheetVisible}
                title={likesSheetTitle}
                users={likesSheetUsers}
                navigation={navigation}
            />

            <ShareBottomSheet
                shareBottomSheetCloseFlag={shareBottomSheetCloseFlag}
                shareBottomSheetExpandFlag={shareSheetVisible ? shareBottomSheetExpandFlag : false}
                onDismiss={() => {
                    setActiveSheet((current) => {
                        if (current === "share") {
                            setActivePostIndex(-1);
                            return null;
                        }
                        return current;
                    });
                }}
            />

            <Footer key={footerKey} currentScreenName="Feed" navigation={navigation} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    headerWrap: {
        backgroundColor: theme.bg,
        paddingBottom: scaleSize(2),
        zIndex: 2,
        elevation: 2,
    },
    list: {
        flex: 1,
    },
    listContent: {
        flexGrow: 1,
    },
    listFooter: {
        paddingVertical: scaleSize(24),
    },
    createPostButton: {
        position: "absolute",
        right: scaleSize(24),
        width: scaleSize(56),
        height: scaleSize(56),
        borderRadius: scaleSize(28),
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 3,
        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
    },
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scaleSize(28),
        paddingTop: scaleSize(36),
    },
    emptyIcon: {
        width: scaleSize(60),
        height: scaleSize(60),
        borderRadius: scaleSize(30),
        backgroundColor: theme.primaryDeep,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: scaleSize(18),
    },
    emptyTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(16),
        color: theme.textPrimary,
        marginBottom: scaleSize(6),
    },
    emptySubtitle: {
        fontFamily: "Outfit_400Regular",
        fontSize: scaleSize(13),
        color: theme.textSecondary,
        textAlign: "center",
        lineHeight: scaleSize(18),
    },
});
