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
    TouchableWithoutFeedback,
    Alert,
    Text,
    ActivityIndicator,
    Animated,
    Easing,
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
import usePersonalizedFeed from "./feed/hooks/usePersonalizedFeed";
import useFeedUserData from "./feed/hooks/useFeedUserData";
import { toMillis as toMillisSafe } from "../utils/friends";
import deletePost from "../../backend/posts/deletePost";
import deleteCompletedWorkout from "../../backend/workouts/deleteCompletedWorkout";
import { emitHexagonUpdate } from "../utils/hexagonEvents";
import { emitUserDataUpdate } from "../utils/userDataEvents";
import readDoc from "../../backend/helper/firebase/readDoc";
import { strong as hapticStrong } from "../utils/haptics";
import FeedSnapshotCard from "../components/1_Feed/FeedSnapshotCard";
import FeedLoadingSkeleton from "../components/1_Feed/FeedLoadingSkeleton";
import UserStatsBottomSheet from "../components/2_Competition/UserStats/UserStatsBottomSheet";
import { navigateOneWay, jumpToTab } from "../../navigationRef";
import { requestCompetitionTabFocus } from "../utils/competitionTabEvents";
import { logFeedSignal } from "../helper/feedSignals";
import { isClipPost } from "../utils/postTypes";
import { primeAllUsers } from "../helper/getAllUsers";

const HEADER_TOP_TRIM = scaleSize(4);
const LIST_BOTTOM_INSET = scaleSize(120);
const MIN_HEADER_MEASURE = scaleSize(24);

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

    const UID = route?.params?.uid ?? global?.userData?.uid ?? null;

    const followingList = global.userData ? global.userData?.following : [];
    const [feedScope, setFeedScope] = useState("forYou");
    const {
        posts: personalizedPosts,
        followingPosts,
        personalPosts,
        loadMore: loadMorePosts,
        hasMore: hasMorePosts,
        loadingMore: loadingMorePosts,
        hydratedFromCache,
        initialSyncComplete,
    } = usePersonalizedFeed(followingList);

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

    useEffect(() => {
        primeAllUsers().catch(() => {});
    }, []);

    const toggleFeedVideosMuted = useCallback(() => {
        setFeedVideosMuted((prev) => !prev);
    }, []);

    useEffect(() => {
        try {
            globalThis.__SPARTAN_FEED_GLOBAL_MUTE__ = areFeedVideosMuted;
        } catch { }
    }, [areFeedVideosMuted]);

    const flatListRef = useRef(null);
    const refreshTimeoutRef = useRef(null);
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
    const [isUserStatsBottomSheetVisible, setIsUserStatsBottomSheetVisible] = useState(false);
    const [activeVideoPostKey, setActiveVideoPostKey] = useState(null);
    const [isCreateMenuVisible, setCreateMenuVisible] = useState(false);
    const [isCreateMenuMounted, setCreateMenuMounted] = useState(false);
    const [areFeedVideosMuted, setFeedVideosMuted] = useState(() => {
        try {
            const stored = globalThis?.__SPARTAN_FEED_GLOBAL_MUTE__;
            if (typeof stored === "boolean") return stored;
        } catch { }
        return true;
    });
    const createMenuAnim = useRef(new Animated.Value(0)).current;

    const highlightPidRef = useRef(null);
    const [highlightSignal, setHighlightSignal] = useState(0);
    const [pendingScrollRequest, setPendingScrollRequest] = useState(null);

    const headerVisibility = useRef(new Animated.Value(1)).current;
    const [headerPointerEvents, setHeaderPointerEvents] = useState("auto");
    const [headerMeasuredHeight, setHeaderMeasuredHeight] = useState(0);
    const lastScrollOffsetRef = useRef(0);
    const lastScrollTimeRef = useRef(Date.now());
    const isHeaderHiddenRef = useRef(false);
    const isAnimatingHeaderRef = useRef(false);
    const viewabilityConfigRef = useRef({ itemVisiblePercentThreshold: 65 });
    useEffect(() => {
        if (isCreateMenuVisible) {
            setCreateMenuMounted(true);
            Animated.spring(createMenuAnim, {
                toValue: 1,
                tension: 120,
                friction: 14,
                useNativeDriver: true,
            }).start();
            return;
        }
        Animated.timing(createMenuAnim, {
            toValue: 0,
            duration: 160,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) {
                setCreateMenuMounted(false);
            }
        });
    }, [createMenuAnim, isCreateMenuVisible]);


    const listData = useMemo(() => {
        if (feedScope === "following") {
            return Array.isArray(followingPosts) ? followingPosts : [];
        }
        if (feedScope === "personal") {
            return Array.isArray(personalPosts) ? personalPosts : [];
        }
        return Array.isArray(personalizedPosts) ? personalizedPosts : [];
    }, [feedScope, followingPosts, personalPosts, personalizedPosts]);

    const showFeedSkeleton = (!hydratedFromCache || !initialSyncComplete)
        && (!Array.isArray(listData) || listData.length === 0);

    const hasPosts = Array.isArray(listData) && listData.length > 0;

    useEffect(() => {
        if (Array.isArray(listData) && listData.length > 0) {
            return;
        }
        setActiveVideoPostKey(null);
    }, [listData]);

    const animateHeaderVisibility = useCallback(
        (toValue) => {
            if (isAnimatingHeaderRef.current) {
                headerVisibility.stopAnimation?.();
            }
            isAnimatingHeaderRef.current = true;
            if (toValue === 1) {
                setHeaderPointerEvents("auto");
            }
            Animated.timing(headerVisibility, {
                toValue,
                duration: 220,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }).start(() => {
                isAnimatingHeaderRef.current = false;
                if (toValue === 0) {
                    setHeaderPointerEvents("none");
                }
            });
        },
        [headerVisibility]
    );

    const showHeader = useCallback(() => {
        if (!isHeaderHiddenRef.current) return;
        isHeaderHiddenRef.current = false;
        animateHeaderVisibility(1);
    }, [animateHeaderVisibility]);

    const hideHeader = useCallback(() => {
        if (isHeaderHiddenRef.current) return;
        isHeaderHiddenRef.current = true;
        animateHeaderVisibility(0);
    }, [animateHeaderVisibility]);

    const handleHeaderLayout = useCallback(
        (event) => {
            const height = event?.nativeEvent?.layout?.height || 0;
            if (
                (headerMeasuredHeight === 0 && height > 0) ||
                (height > MIN_HEADER_MEASURE && Math.abs(height - headerMeasuredHeight) > 1)
            ) {
                setHeaderMeasuredHeight(height);
            }
        },
        [headerMeasuredHeight]
    );

    const headerHeightForAnimation = headerMeasuredHeight > 0 ? headerMeasuredHeight : scaleSize(88);

    const headerAnimatedStyle = useMemo(
        () => ({
            opacity: headerVisibility,
            marginBottom: headerVisibility.interpolate({
                inputRange: [0, 1],
                outputRange: [-headerHeightForAnimation, scaleSize(2)],
            }),
            transform: [
                {
                    translateY: headerVisibility.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-(headerHeightForAnimation + scaleSize(12)), 0],
                    }),
                },
            ],
        }),
        [headerHeightForAnimation, headerVisibility]
    );

    const handleListScroll = useCallback(
        (event) => {
            const offsetY = event?.nativeEvent?.contentOffset?.y ?? 0;
            const lastOffset = lastScrollOffsetRef.current;
            const delta = offsetY - lastOffset;
            lastScrollOffsetRef.current = offsetY;
            const now = Date.now();
            const dt = Math.max(now - lastScrollTimeRef.current, 1);
            lastScrollTimeRef.current = now;
            const speedPerMs = Math.abs(delta) / dt;
            const shouldTriggerSpeed = speedPerMs >= 1.2; // ~700 px/sec

            if (offsetY <= 12) {
                showHeader();
                return;
            }

            if (delta > 20) {
                hideHeader();
            } else if (delta < -28 && shouldTriggerSpeed) {
                showHeader();
            }
        },
        [hideHeader, showHeader]
    );

    useEffect(() => {
        if (hasPosts) return;
        try {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
        } catch { }
    }, [hasPosts]);

    useEffect(() => () => {
        if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
            refreshTimeoutRef.current = null;
        }
    }, []);

    const listFooter = hasPosts && loadingMorePosts ? (
        <View style={styles.listFooter}>
            <ActivityIndicator size="small" color={theme.textSecondary} />
        </View>
    ) : null;

    const handleEndReached = useCallback(() => {
        if (!hasMorePosts || loadingMorePosts) return;
        loadMorePosts();
    }, [hasMorePosts, loadingMorePosts, loadMorePosts]);

    const onRefresh = useCallback(() => {
        if (refreshing) return;
        showHeader();
        setRefreshing(true);
        if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
        }
        refreshTimeoutRef.current = setTimeout(() => {
            refreshTimeoutRef.current = null;
            setRefreshing(false);
        }, 700);
    }, [refreshing, showHeader]);

    const openCommentsModal = useCallback((index) => {
        if (!Array.isArray(listData) || index == null || index < 0 || index >= listData.length) {
            return;
        }
        const target = listData[index];
        if (target) {
            logFeedSignal("open_comments", { pid: target?.pid, uid: target?.uid || target?.creatorUid });
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
        const target = listData[index];
        if (target) {
            logFeedSignal("share_sheet_open", { pid: target?.pid, uid: target?.uid || target?.creatorUid });
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
        logFeedSignal("open_likes_sheet", { pid: post?.pid, uid: post?.uid || post?.creatorUid });
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

            if (canDeleteLinkedWorkout && safeUid) {
                try {
                    const res = await deleteCompletedWorkout(safeUid, workoutDeleteIdentifier);
                    workoutResult = res;
                    invalidateFeedCacheForUser(safeUid);
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
                            emitHexagonUpdate();
                            emitUserDataUpdate();
                        } catch (error) {
                            console.warn("handleDeletePost: failed to update workout stats cache", error);
                        }
                    }
                } catch (error) {
                    workoutError = error;
                    console.error("handleDeletePost: deleteCompletedWorkout failed", error);
                }
            }

            try {
                await deletePost(pid, safeUid);
                if (safeUid) invalidateFeedCacheForUser(safeUid);
                if (safeUid && global?.userData && String(global.userData.uid) === safeUid) {
                    try {
                        if (Array.isArray(global.userData.posts)) {
                            global.userData.posts = global.userData.posts
                                .map((value) => (value == null ? value : String(value)))
                                .filter((value) => value && value !== pid);
                        }
                        if (typeof global.userData.postCount === "number") {
                            global.userData.postCount = Math.max(0, global.userData.postCount - 1);
                        }
                        emitUserDataUpdate();
                    } catch (error) {
                        console.warn("handleDeletePost: failed to update global userData cache", error);
                    }
                }
            } catch (error) {
                postError = error;
                console.error("handleDeletePost: deletePost failed", error);
            }

            if (postError) {
                Alert.alert("Unable to delete post", "Please try again in a moment.");
            } else if (workoutError) {
                Alert.alert(
                    "Workout removal incomplete",
                    "The workout could not be removed from your history. Please retry from the workout details screen."
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
    }, [listData, deletingPostPid, deletePost, deleteCompletedWorkout, emitHexagonUpdate, emitUserDataUpdate]);

    const handleEditPost = useCallback(async (index, directPost, _options = {}) => {
        const sourcePost = directPost || (Array.isArray(listData) ? listData[index] : null);
        if (!sourcePost) return;

        const pid = String(sourcePost?.pid || sourcePost?.id || "").trim();
        if (!pid) return;

        let latest = sourcePost;
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
                const entryTypeRaw = typeof entry === "string" ? undefined : entry?.type;
                const type = entryTypeRaw === "clip" ? "video" : entryTypeRaw;
                const cropRect = typeof entry === "string" ? null : entry?.cropRect || null;
                const duration =
                    typeof entry === "string"
                        ? 0
                        : Number(
                              entry?.duration ??
                              entry?.videoDuration ??
                              entry?.length ??
                              entry?.seconds ??
                              0
                          ) || 0;
                const width = typeof entry?.width === "number" ? entry.width : (typeof entry?.naturalWidth === "number" ? entry.naturalWidth : 0);
                const height = typeof entry?.height === "number" ? entry.height : (typeof entry?.naturalHeight === "number" ? entry.naturalHeight : 0);
                const aspectRatio = typeof entry?.aspectRatio === "number"
                    ? entry.aspectRatio
                    : (width && height ? width / height : null);

                mediaEntries.push({
                    uri,
                    type: type === "video" ? "video" : "image",
                    duration,
                    cropRect,
                    width,
                    height,
                    aspectRatio,
                    isClip: Boolean(entry?.isClip || entryTypeRaw === "clip" || latest?.type === "clip"),
                });
            });
        }
        if (Array.isArray(latest.images)) {
            latest.images.forEach((entry) => {
                const uri = typeof entry === "string" ? entry : entry?.uri;
                if (!uri || seen.has(uri)) return;
                seen.add(uri);
                mediaEntries.push({
                    uri,
                    type: "image",
                    duration: 0,
                    cropRect: typeof entry === "string" ? null : entry?.cropRect || null,
                    width: typeof entry?.width === "number" ? entry.width : 0,
                    height: typeof entry?.height === "number" ? entry.height : 0,
                    aspectRatio: typeof entry?.aspectRatio === "number" ? entry.aspectRatio : null,
                    isClip: false,
                });
            });
        }

        const workoutName = (() => {
            const source = latest.workout || sourcePost.workout || null;
            if (!source || typeof source !== "object") return "";
            const candidate = source.templateName || source.template?.name || source.name || source.workoutName || "";
            return candidate ? String(candidate).trim() : "";
        })();

        const editingPayload = {
            pid,
            caption: resolvedCaption,
            mediaEntries,
            workoutName,
        };

        if (isClipPost(latest)) {
            const clipEntry = mediaEntries.find((entry) => entry?.type === "video");
            if (!clipEntry) {
                Alert.alert("Unable to edit clip", "This clip is missing its video. Please try again later.");
                return;
            }
            navigation.navigate("EditClip", {
                initialClip: clipEntry,
                initialCaption: resolvedCaption,
                editingContext: { editingPost: editingPayload },
            });
            return;
        }

        navigation.navigate("PostOptions", {
            images: mediaEntries,
            editingPost: editingPayload,
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

    const openViewWorkoutModal = useCallback((index, options = {}) => {
        if (!Array.isArray(listData) || index == null || index < 0 || index >= listData.length) {
            return;
        }

        const post = listData[index];
        const workoutInput = post?.workout;
        if (!workoutInput) return;

        const startEditing = Boolean(options?.startEditing);

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

        const isLiveWorkoutPost = Boolean(
            post?.isLive ||
            post?.liveWorkout ||
            (typeof post?.pid === "string" && post.pid.startsWith("workout:live"))
        );

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
            isLiveWorkout: isLiveWorkoutPost,
        };

        if (startEditing) {
            params.startEditing = true;
        }

        navigation?.navigate?.("PastWorkout", params);
    }, [listData, navigation]);

    const handleEditWorkout = useCallback((index) => {
        openViewWorkoutModal(index, { startEditing: true });
    }, [openViewWorkoutModal]);

    const scrollToTop = useCallback(() => {
        showHeader();
        if (flatListRef.current) {
            flatListRef.current.scrollToOffset({ offset: 0, animated: true });
        }
    }, [showHeader]);

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

    const feedExtraData = useMemo(() => ({
        activeVideoPostKey,
        areFeedVideosMuted,
    }), [activeVideoPostKey, areFeedVideosMuted]);

    const handleViewableItemsChanged = useCallback(({ viewableItems }) => {
        if (!Array.isArray(viewableItems) || viewableItems.length === 0) {
            setActiveVideoPostKey((current) => (current === null ? current : null));
            return;
        }
        let nextKey = null;
        for (const token of viewableItems) {
            if (!token?.isViewable) continue;
            const derivedKey = token?.key
                ?? (token?.item ? listKeyExtractor(token.item, token.index ?? 0) : null);
            if (derivedKey != null) {
                nextKey = derivedKey;
                break;
            }
        }
        setActiveVideoPostKey((current) => (current === nextKey ? current : nextKey));
    }, [listKeyExtractor]);

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
            onEditWorkout={handleEditWorkout}
            areVideosMuted={areFeedVideosMuted}
            onToggleVideosMuted={toggleFeedVideosMuted}
            shouldPlayMedia={listKeyExtractor(item, index) === activeVideoPostKey}
        />
    ), [activeVideoPostKey, areFeedVideosMuted, highlightSignal, listKeyExtractor, openCommentsModal, openShareModal, openLikesSheet, toViewProfilePosts, openViewWorkoutModal, handleDeletePost, handleEditPost, handleEditWorkout, toggleFeedVideosMuted]);

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
            feedScope={feedScope}
            onChangeFeedScope={setFeedScope}
        />
    ), [navigation, toMessagesScreen, handleOpenNotifications, scrollToTop, allUsersRef, activeWorkout, headerTimerRef, feedScope]);

    const renderLoadingList = useCallback(() => (
        <FeedLoadingSkeleton />
    ), []);

    const renderEmptyList = () => {
        const isFollowingScope = feedScope === "following";
        const isPersonalScope = feedScope === "personal";
        return (
            <View>
                {renderSnapshotCard()}
                <View style={styles.emptyState}>
                    <View style={styles.emptyIcon}>
                        <Feather
                            name={isFollowingScope ? "users" : isPersonalScope ? "user" : "trending-up"}
                            size={scaleSize(28)}
                            color={theme.primary}
                        />
                    </View>
                    <Text style={styles.emptyTitle}>
                        {isFollowingScope
                            ? "No following posts yet"
                            : isPersonalScope
                                ? "No personal posts yet"
                                : "Getting recommendations ready"}
                    </Text>
                    <Text style={styles.emptySubtitle}>
                        {isFollowingScope
                            ? "Follow more athletes or ask friends to share updates so this tab fills up."
                            : isPersonalScope
                                ? "Share a workout or update to build your own timeline here."
                                : "Keep scrolling—your Feed mixes trending workouts and creator highlights."}
                    </Text>
                </View>
            </View>
        );
    };

    const closeCreateMenu = useCallback(() => {
        setCreateMenuVisible(false);
    }, []);

    const toggleCreateMenu = useCallback(() => {
        setCreateMenuVisible((prev) => !prev);
    }, []);

    const handleSharePost = useCallback(() => {
        closeCreateMenu();
        try {
            navigation?.navigate('PostOptions', { images: [] });
        } catch {
            navigation?.navigate('PostOptions');
        }
    }, [closeCreateMenu, navigation]);

    const handleShareClip = useCallback(() => {
        closeCreateMenu();
        try {
            navigation?.navigate('NewClip');
        } catch {
            navigation?.navigate('NewClip');
        }
    }, [closeCreateMenu, navigation]);

    const commentsVisible = activeSheet === "comments" && activePostIndex >= 0;
    const shareSheetVisible = activeSheet === "share";
    const activePost = commentsVisible || shareSheetVisible
        ? listData[activePostIndex] || null
        : null;

    const handleOpenUserStats = useCallback(() => {
        if (!global?.userData) return;
        try { hapticStrong(); } catch { }
        try { setIsUserStatsBottomSheetVisible(true); } catch { setIsUserStatsBottomSheetVisible(true); }
    }, []);

    const handleNavigateCompetitionProgress = useCallback(() => {
        try { hapticStrong(); } catch {}
        const targetTab = "progress";
        requestCompetitionTabFocus(targetTab);
        const tabParams = { focusTab: targetTab };
        const routeParams = { ...tabParams, transition: "slide-from-right" };

        if (jumpToTab("Competition", tabParams)) {
            return;
        }

        try {
            navigation.navigate("Competition", routeParams);
            return;
        } catch {}

        navigateOneWay("Competition", {
            animation: "slide-from-right",
            params: tabParams,
        });
    }, [navigation]);

    const renderSnapshotCard = useCallback(
        () => (
            <FeedSnapshotCard
                onPressOverall={handleOpenUserStats}
                onPressCard={handleNavigateCompetitionProgress}
            />
        ),
        [handleOpenUserStats, handleNavigateCompetitionProgress]
    );

    return (
        <SafeAreaView style={styles.screen} edges={["top"]}>
            <StatusBar style="light" />
            <Animated.View
                style={[styles.headerWrap, headerAnimatedStyle]}
                pointerEvents={headerPointerEvents}
                onLayout={handleHeaderLayout}
            >
                {headerComponent}
            </Animated.View>
            <FlatList
                ref={flatListRef}
                data={listData}
                extraData={feedExtraData}
                keyExtractor={listKeyExtractor}
                renderItem={renderPost}
                style={styles.list}
                ListEmptyComponent={showFeedSkeleton ? renderLoadingList : renderEmptyList}
                ListFooterComponent={listFooter}
                ListHeaderComponent={hasPosts ? renderSnapshotCard : null}
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
                onScroll={handleListScroll}
                onViewableItemsChanged={handleViewableItemsChanged}
                viewabilityConfig={viewabilityConfigRef.current}
                scrollEventThrottle={16}
                onEndReached={handleEndReached}
                onEndReachedThreshold={0.6}
                maintainVisibleContentPosition={{
                    minIndexForVisible: 0,
                    autoscrollToTopThreshold: scaleSize(120),
                }}
                initialNumToRender={6}
                maxToRenderPerBatch={6}
                windowSize={8}
                updateCellsBatchingPeriod={50}
                removeClippedSubviews
            />

            {isCreateMenuMounted && (
                <TouchableWithoutFeedback onPress={closeCreateMenu}>
                    <Animated.View
                        style={[
                            styles.createPostBackdrop,
                            { opacity: createMenuAnim },
                        ]}
                    />
                </TouchableWithoutFeedback>
            )}

            <View
                pointerEvents="box-none"
                style={[
                    styles.createPostActionsWrapper,
                    { bottom: (insets.bottom || 0) + scaleSize(110) },
                ]}
            >
                {isCreateMenuMounted && (
                    <Animated.View
                        style={[
                            styles.createPostMenu,
                            {
                                opacity: createMenuAnim,
                                transform: [
                                    {
                                        translateY: createMenuAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [scaleSize(18), 0],
                                        }),
                                    },
                                    {
                                        scale: createMenuAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.94, 1],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    >
                        <TouchableOpacity
                            style={[
                                styles.createPostMenuButton,
                                styles.createPostMenuButtonPost,
                            ]}
                            activeOpacity={0.85}
                            onPress={handleSharePost}
                            accessibilityRole="button"
                            accessibilityLabel="Share a post"
                        >
                            <View style={styles.createPostMenuRow}>
                                <View style={styles.createPostMenuLabelWrap}>
                                    <Text style={[styles.createPostMenuText, styles.createPostMenuTextDark]}>
                                        Share Post
                                    </Text>
                                    <Text style={[styles.createPostMenuSubtext, styles.createPostMenuSubtextDark]}>
                                        Quick notes, can add photos/videos
                                    </Text>
                                </View>
                                <View style={styles.createPostMenuIconBadgeDark}>
                                    <Feather
                                        name="edit-3"
                                        size={scaleSize(15)}
                                        color="#FFFFFF"
                                    />
                                </View>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.createPostMenuButton,
                                styles.createPostMenuButtonPost,
                            ]}
                            activeOpacity={0.85}
                            onPress={handleShareClip}
                            accessibilityRole="button"
                            accessibilityLabel="Share a clip"
                        >
                            <View style={styles.createPostMenuRow}>
                                <View style={styles.createPostMenuLabelWrap}>
                                    <Text style={[styles.createPostMenuText, styles.createPostMenuTextDark]}>
                                        Share Clip
                                    </Text>
                                    <Text style={[styles.createPostMenuSubtext, styles.createPostMenuSubtextDark]}>
                                        Short-form video content
                                    </Text>
                                </View>
                                <View style={styles.createPostMenuIconBadgeDark}>
                                    <Feather
                                        name="video"
                                        size={scaleSize(15)}
                                        color="#FFFFFF"
                                    />
                                </View>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                )}
                <TouchableOpacity
                    style={[
                        styles.createPostButton,
                        isCreateMenuVisible && styles.createPostButtonActive,
                    ]}
                    activeOpacity={0.85}
                    onPress={toggleCreateMenu}
                    accessibilityRole="button"
                    accessibilityLabel="Open share options"
                >
                    <Animated.View
                        style={{
                            transform: [{
                                rotate: createMenuAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ["0deg", "45deg"],
                                }),
                            }],
                        }}
                    >
                        <Feather
                            name="plus"
                            size={scaleSize(24)}
                            color={isCreateMenuVisible ? '#FFFFFF' : '#000'}
                        />
                    </Animated.View>
                </TouchableOpacity>
            </View>

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

            <UserStatsBottomSheet
                isVisible={isUserStatsBottomSheetVisible}
                setIsVisible={setIsUserStatsBottomSheetVisible}
                user={global?.userData || null}
                navigation={navigation}
                heightRatio={0.88}
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
        width: scaleSize(56),
        height: scaleSize(56),
        borderRadius: scaleSize(28),
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
    },
    createPostButtonActive: {
        backgroundColor: theme.primary,
    },
    createPostActionsWrapper: {
        position: "absolute",
        right: scaleSize(24),
        alignItems: "flex-end",
        zIndex: 3,
    },
    createPostBackdrop: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 2,
        backgroundColor: "rgba(0, 0, 0, 0.35)",
    },
    createPostMenu: {
        marginBottom: scaleSize(16),
        width: scaleSize(190),
    },
    createPostMenuButton: {
        borderRadius: scaleSize(14),
        paddingVertical: scaleSize(14),
        paddingHorizontal: scaleSize(20),
        alignItems: "flex-start",
        justifyContent: "center",
        marginBottom: scaleSize(12),
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 7,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
    },
    createPostMenuButtonPost: {
        backgroundColor: "#1B1F29",
    },
    createPostMenuRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    createPostMenuLabelWrap: {
        flex: 1,
    },
    createPostMenuText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(15),
        color: "#0A0E14",
    },
    createPostMenuTextDark: {
        color: "#E7ECF5",
    },
    createPostMenuSubtext: {
        fontFamily: "Outfit_400Regular",
        fontSize: scaleSize(12),
        marginTop: scaleSize(4),
        color: "#A0A8BA",
    },
    createPostMenuSubtextDark: {
        color: "#CCD1DE",
    },
    createPostMenuIconBadge: {
        padding: scaleSize(8),
        borderRadius: scaleSize(999),
        backgroundColor: "rgba(255,255,255,0.9)",
        alignItems: "center",
        justifyContent: "center",
    },
    createPostMenuIconBadgeDark: {
        backgroundColor: "rgba(255, 255, 255, 0.12)",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.25)",
        marginLeft: scaleSize(12),
        padding: scaleSize(8),
        borderRadius: scaleSize(999),
        alignItems: "center",
        justifyContent: "center",
    },
    emptyState: {
        alignItems: "center",
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
import { invalidateFeedCacheForUser } from "../helper/feedCache";
