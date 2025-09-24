/**
 * Feed Screen. Retrieves and displays stories and posts.
 * Handles Navigation to the Messages Screen.
 * Handles the NotificationsBottomSheet, CommentsBottomSheet, ShareBottomSheet, and Workout viewer sheet
 * * Does NOT handle backend calls from user interactions
 */

import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    startTransition,
} from "react";
import {
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    View,
} from "react-native";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import {
    SafeAreaView as SafeAreaInsetsView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import PostListItem from "../components/1_Feed/PostListItem";
import useHeaderSearchUsers from "../hooks/useHeaderSearchUsers";
import NotificationsBottomSheet from "../components/1_Feed/Notifications/NotificationsBottomSheet";
import CommentsBottomSheet from "../components/1_Feed/Comments/CommentsBottomSheet";
import ShareBottomSheet from "../components/1_Feed/SharePost/ShareBottomSheet";
import FeedWorkoutViewerSheet from "../components/1_Feed/ViewWorkout/FeedWorkoutViewerSheet";
import FeedHeaderOverlay from "../components/1_Feed/FeedHeaderOverlay";
import Footer from "../components/Footer";
import theme from "../theme/mfpDark";
import isThisUser from "../helper/isThisUser";
import useFilteredFeed from "../helper/useFilteredFeed";
import useFeedUserData from "./feed/hooks/useFeedUserData";
import { FeedFocusProvider } from "./feed/hooks/FeedFocusContext";
import useFeedUnfocusGesture from "./feed/hooks/useFeedUnfocusGesture"; // retained for backwards compatibility (unused)
import { toMillis as toMillisSafe } from "../utils/friends";
import { canViewWorkout, coercePrivacyMode } from "../utils/workoutPrivacy";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase.config";
import scaleSize from "../helper/scaleSize";

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 55 };
const HEADER_FALLBACK = scaleSize(85);

export default function Feed({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const isScreenFocused = useIsFocused();
    const UID = "userData" in global ? global.userData.uid : route?.params?.uid;

    const posts = useFilteredFeed(global.userData ? global.userData?.following : []);

    const {
        activeWorkout,
        footerKey,
        headerTimerRef,
        toMessagesScreen,
    } = useFeedUserData({ UID, navigation, route, isScreenFocused });

    const [refreshing, setRefreshing] = useState(false);
    const [isSomePostFocused, setIsSomePostFocused] = useState(false);
    const [focusedIndexState, setFocusedIndexState] = useState(-1);
    const [translatingIndexState, setTranslatingIndexState] = useState(-1);
    const [shareBottomSheetExpandFlag, setShareBottomSheetExpandFlag] = useState(false);
    const [shareBottomSheetCloseFlag, setShareBottomSheetCloseFlag] = useState(false);
    const [notificationsBottomSheetExpandFlag, setNotificationsBottomSheetExpandFlag] = useState(false);
    const [commentsBottomSheetExpandFlag, setCommentsBottomSheetExpandFlag] = useState(false);
    const [centeredIndex, setCenteredIndex] = useState(-1);
    const [headerHeight, setHeaderHeight] = useState(HEADER_FALLBACK);

    const flatListRef = useRef(null);
    const postRefs = useRef({});
    const focusedPostIndex = useRef(-1);
    const justRefocusedRef = useRef(false);
    const refocusTimeoutRef = useRef(null);

    const [unfocusGestureActive] = useState(false);

    const scrollOffsetY = useRef(0);
    const setScrollOffset = useCallback((y) => {
        scrollOffsetY.current = y;
    }, []);

    const { allUsersRef, mergeUsersIntoRef } = useHeaderSearchUsers({
        following: global.userData?.following,
        enablePrefetch: true,
    });

    const highlightPidRef = useRef(null);
    const [highlightSignal, setHighlightSignal] = useState(0);

    const programFocusPidRef = useRef(null);
    const [programFocusSignal, setProgramFocusSignal] = useState(0);

    const feedTopSignalRef = useRef(0);
    const pendingFocusPidRef = useRef(null);

    const handleFocusPost = useCallback((index) => {
        if (typeof index !== "number" || index < 0 || !posts || index >= posts.length) return;
        focusedPostIndex.current = index;
        startTransition(() => {
            setFocusedIndexState(index);
            setTranslatingIndexState(index);
            setIsSomePostFocused(true);
        });
        requestAnimationFrame(() => {
            try {
                flatListRef.current?.scrollToIndex?.({ index, viewPosition: 0, animated: true });
            } catch { }
        });
    }, [posts]);

    const handleBackPress = useCallback(() => {
        setShareBottomSheetCloseFlag((f) => !f);
        startTransition(() => {
            setIsSomePostFocused(false);
            setFocusedIndexState(-1);
            setTranslatingIndexState(-1);
        });
        focusedPostIndex.current = -1;
        setCommentsBottomSheetExpandFlag(false);
    }, []);

    const focusContextValue = useMemo(() => ({
        isSomePostFocused,
        focusedIndex: focusedIndexState,
        translatingIndex: translatingIndexState,
        focusModeSV: null,
        interactiveUnfocusSV: null,
        interPostStyle: null,
        unfocusGestureActive,
        handleFocusPost,
        handleUnfocus: handleBackPress,
    }), [
        isSomePostFocused,
        focusedIndexState,
        translatingIndexState,
        unfocusGestureActive,
        handleFocusPost,
        handleBackPress,
    ]);

    const openCommentsModal = useCallback(() => {
        setCommentsBottomSheetExpandFlag((flag) => !flag);
    }, []);

    const openShareModal = useCallback(() => {
        setShareBottomSheetExpandFlag((flag) => !flag);
    }, []);

    const handleOpenNotifications = useCallback(() => {
        setNotificationsBottomSheetExpandFlag((flag) => !flag);
    }, []);

    const toViewProfilePosts = useCallback((idx) => {
        const post = posts?.[idx];
        if (!post) return;
        const user = {
            handle: post.handle,
            uid: post.uid,
            pfp: post.pfp,
            name: post.name,
        };
        const rootNav = navigation?.getParent?.("ROOT");
        if (isThisUser(post.uid)) {
            if (rootNav?.navigate) rootNav.navigate("Profile", { transition: "slide-from-right" });
            else navigation.navigate("Profile", { transition: "slide-from-right" });
        } else {
            if (rootNav?.navigate) rootNav.navigate("ViewProfile", { user });
            else navigation.navigate("ViewProfile", { user });
        }
    }, [navigation, posts]);

    const toViewProfileComments = useCallback((data) => {
        if (!data) return;
        const user = {
            handle: data.handle,
            uid: data.uid,
            pfp: data.pfp,
            name: data.name,
        };
        const rootNav = navigation?.getParent?.("ROOT");
        if (isThisUser(data.uid)) {
            if (rootNav?.navigate) rootNav.navigate("Profile", { transition: "slide-from-right" });
            else navigation.navigate("Profile", { transition: "slide-from-right" });
        } else {
            if (rootNav?.navigate) rootNav.navigate("ViewProfile", { user });
            else navigation.navigate("ViewProfile", { user });
        }
    }, [navigation]);

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (!Array.isArray(viewableItems) || viewableItems.length === 0) {
            setCenteredIndex(-1);
            return;
        }
        const visible = viewableItems
            .filter((item) => typeof item.index === "number" && item.isViewable)
            .sort((a, b) => (b?.percentVisible ?? 0) - (a?.percentVisible ?? 0));
        if (visible.length === 0) {
            setCenteredIndex(-1);
            return;
        }
        const bestIndex = typeof visible[0].index === "number" ? visible[0].index : -1;
        setCenteredIndex((prev) => (prev === bestIndex ? prev : bestIndex));
    });

    const renderPost = useCallback(({ item, index }) => (
        <PostListItem
            item={item}
            index={index}
            isScreenFocused={isScreenFocused}
            centeredIndex={centeredIndex}
            highlightPid={highlightPidRef.current}
            highlightSignal={highlightSignal}
            programFocusPid={programFocusPidRef.current}
            programFocusSignal={programFocusSignal}
            openCommentsModal={openCommentsModal}
            openShareModal={openShareModal}
            toViewProfilePosts={toViewProfilePosts}
            openViewWorkoutModal={openViewWorkoutModal}
            postRefs={postRefs}
        />
    ), [
        isScreenFocused,
        centeredIndex,
        highlightSignal,
        programFocusSignal,
        openCommentsModal,
        openShareModal,
        toViewProfilePosts,
        openViewWorkoutModal,
    ]);

    const onRefresh = useCallback(async () => {
        try {
            setRefreshing(true);
            await new Promise((resolve) => setTimeout(resolve, 600));
        } finally {
            setRefreshing(false);
        }
    }, []);

    const scrollToTop = useCallback(() => {
        try {
            flatListRef.current?.scrollToOffset?.({ offset: 0, animated: true });
        } catch { }
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

    useEffect(() => {
        if (isScreenFocused) {
            if (refocusTimeoutRef.current) {
                clearTimeout(refocusTimeoutRef.current);
            }
            justRefocusedRef.current = true;
            refocusTimeoutRef.current = setTimeout(() => {
                justRefocusedRef.current = false;
                refocusTimeoutRef.current = null;
            }, 400);
        } else {
            justRefocusedRef.current = false;
            if (refocusTimeoutRef.current) {
                clearTimeout(refocusTimeoutRef.current);
                refocusTimeoutRef.current = null;
            }
        }
        return () => {
            if (refocusTimeoutRef.current) {
                clearTimeout(refocusTimeoutRef.current);
                refocusTimeoutRef.current = null;
            }
            justRefocusedRef.current = false;
        };
    }, [isScreenFocused]);

    const scrollToPid = useCallback((pid) => {
        if (!pid || !Array.isArray(posts) || posts.length === 0) return false;
        const idx = posts.findIndex((p) => String(p?.pid || "") === String(pid));
        if (idx < 0) return false;
        highlightPidRef.current = String(pid);
        setHighlightSignal(Date.now());
        try {
            flatListRef.current?.scrollToIndex?.({ index: idx, animated: true });
            setTimeout(() => handleFocusPost(idx), 320);
        } catch {
            try { flatListRef.current?.scrollToOffset?.({ offset: 0, animated: true }); } catch { }
        }
        return true;
    }, [posts, handleFocusPost]);

    useEffect(() => {
        if (!posts || posts.length === 0) return;
        const seeded = posts
            .map((p) => ({ uid: p?.uid, handle: p?.handle, name: p?.name, pfp: p?.pfp }))
            .filter((u) => !!u.uid);
        mergeUsersIntoRef(seeded);
    }, [posts, mergeUsersIntoRef]);

    useEffect(() => {
        let cleanup;
        if (route?.params?.scrollToTop) {
            if (!justRefocusedRef.current) {
                const id = setTimeout(() => scrollToTop(), 30);
                cleanup = () => clearTimeout(id);
            }
            try { navigation.setParams({ scrollToTop: false }); } catch { }
        }
        if (route?.params?.focusPid) {
            const pid = String(route.params.focusPid);
            pendingFocusPidRef.current = pid;
            const id = setTimeout(() => {
                const ok = scrollToPid(pid);
                if (ok) pendingFocusPidRef.current = null;
            }, 50);
            const focusCleanup = () => clearTimeout(id);
            cleanup = cleanup ? () => { cleanup(); focusCleanup(); } : focusCleanup;
            try { navigation.setParams({ focusPid: undefined }); } catch { }
        }
        return cleanup;
    }, [route?.params?.scrollToTop, route?.params?.focusPid, navigation, scrollToPid, scrollToTop]);

    useFocusEffect(
        useCallback(() => {
            const sig = Number(global?.scrollFeedToTopSignal || 0);
            if (!sig) return undefined;
            const lastRef = feedTopSignalRef.current || 0;
            const handled = Number(global?.scrollFeedToTopHandled || 0);
            if (justRefocusedRef.current) {
                if (sig !== lastRef) {
                    feedTopSignalRef.current = sig;
                }
                return undefined;
            }
            if (sig !== lastRef && sig !== handled) {
                feedTopSignalRef.current = sig;
                try { global.scrollFeedToTopHandled = sig; } catch { }
                const id = setTimeout(() => scrollToTop(), 30);
                return () => clearTimeout(id);
            }
            return undefined;
        }, [scrollToTop])
    );

    useEffect(() => {
        if (!pendingFocusPidRef.current) return;
        const ok = scrollToPid(pendingFocusPidRef.current);
        if (ok) pendingFocusPidRef.current = null;
    }, [posts, scrollToPid]);

    const [feedWorkoutExpandToggle, setFeedWorkoutExpandToggle] = useState(false);
    const [feedWorkoutItems, setFeedWorkoutItems] = useState([]);
    const [feedWorkoutActiveIndex, setFeedWorkoutActiveIndex] = useState(0);
    const activityChipWorkoutCacheRef = useRef(new Map());
    const activityChipUserWorkoutsRef = useRef(new Map());
    const activityViewerSessionRef = useRef(0);

    const ensureUserCompletedWorkouts = useCallback(async (uid) => {
        const key = String(uid || "");
        if (!key) return [];
        if (activityChipUserWorkoutsRef.current.has(key)) {
            const cached = activityChipUserWorkoutsRef.current.get(key);
            return Array.isArray(cached) ? cached : [];
        }
        try {
            const docRef = doc(db, "users", key);
            const snap = await getDoc(docRef);
            const data = snap.exists() ? (snap.data() || {}) : {};
            const arr = Array.isArray(data?.completedWorkouts) ? data.completedWorkouts : [];
            activityChipUserWorkoutsRef.current.set(key, arr);
            return arr;
        } catch (e) {
            console.log("[Feed] failed to load completedWorkouts", key, e);
            activityChipUserWorkoutsRef.current.set(key, []);
            return [];
        }
    }, []);

    const chipKeyOf = useCallback((chip) => {
        if (!chip) return "";
        const uid = String(chip?.uid || "");
        const widRaw = chip?.workoutID ?? chip?.workoutId ?? chip?.wid ?? chip?.workout?.wid ?? chip?.id ?? null;
        const wid = widRaw ? String(widRaw) : "";
        const fallbackId = chip?.id ? String(chip.id) : "";
        return `${uid}:${wid || fallbackId}`;
    }, []);

    const ensureWorkoutForChip = useCallback(async (chip) => {
        if (!chip) return null;
        const cacheKey = chipKeyOf(chip);
        if (cacheKey && activityChipWorkoutCacheRef.current.has(cacheKey)) {
            return activityChipWorkoutCacheRef.current.get(cacheKey);
        }
        const uid = String(chip?.uid || "");
        if (!uid) return null;
        const workouts = await ensureUserCompletedWorkouts(uid);
        const targetIdRaw = chip?.workoutID ?? chip?.workoutId ?? chip?.wid ?? chip?.workout?.wid ?? null;
        const targetId = targetIdRaw ? String(targetIdRaw) : "";
        let match = null;
        if (targetId) {
            match = workouts.find((w) => String(w?.wid || w?.id || w?.workoutID || "") === targetId) || null;
        }
        if (!match && workouts.length) {
            const chipMs = toMillisSafe(chip?.ts);
            if (chipMs) {
                const MAX_DIFF_MS = 1000 * 60 * 60 * 12;
                let bestDiff = Number.POSITIVE_INFINITY;
                for (const w of workouts) {
                    const wMs = toMillisSafe(w?.finishedAt ?? w?.createdAt ?? w?.created);
                    if (!wMs) continue;
                    const diff = Math.abs(wMs - chipMs);
                    if (diff < bestDiff && diff <= MAX_DIFF_MS) {
                        bestDiff = diff;
                        match = w;
                    }
                }
            }
        }
        const base = match ? { ...match } : {
            wid: targetId || `${uid}:${chip?.id || "chip"}`,
            created: toMillisSafe(chip?.ts) || Date.now(),
            exercises: [],
            duration: 0,
            volume: 0,
            reps: 0,
            PBs: 0,
            templateName: chip?.templateName || chip?.workoutName || "Workout",
            name: chip?.workoutName || chip?.templateName || "Workout",
        };
        const baseWithPrivacy = base?.privacyMode ? base : { ...base, privacyMode: base?.privacyMode ?? "hidden" };
        const friendUid = uid;
        const friendPfp = chip?.pfp || chip?.pfpUrl || chip?.photoURL || chip?.image || null;
        const friendPfpVersion = chip?.pfpVersion ?? chip?.version ?? 0;
        const enriched = {
            ...baseWithPrivacy,
            wid: baseWithPrivacy?.wid || baseWithPrivacy?.id || targetId || `${uid}:${chip?.id || "chip"}`,
            creatorUID: String(baseWithPrivacy?.creatorUID || baseWithPrivacy?.creatorUid || baseWithPrivacy?.uid || friendUid),
            templateName: baseWithPrivacy?.templateName || baseWithPrivacy?.template?.name || chip?.templateName || baseWithPrivacy?.name,
            name: baseWithPrivacy?.name || baseWithPrivacy?.templateName || chip?.workoutName || chip?.templateName || "Workout",
            exercises: Array.isArray(baseWithPrivacy?.exercises) ? baseWithPrivacy.exercises : [],
            __friendUid: friendUid,
            __friendPfp: friendPfp,
            __friendPfpVersion: friendPfpVersion,
            __chipKey: cacheKey || `${uid}:${chip?.id || "chip"}`,
        };
        const viewerData = (() => { try { return global?.userData || null; } catch { return null; } })();
        const viewerUid = viewerData?.uid ? String(viewerData.uid) : "";
        let result = enriched;
        if (!canViewWorkout(enriched, viewerUid, viewerData)) {
            result = {
                privacyMode: coercePrivacyMode(enriched?.privacyMode),
                creatorUID: enriched?.creatorUID,
                wid: enriched?.wid,
                name: enriched?.name,
                __friendUid: enriched?.__friendUid,
                __friendPfp: enriched?.__friendPfp,
                __friendPfpVersion: enriched?.__friendPfpVersion,
                __chipKey: enriched?.__chipKey,
            };
        }
        if (cacheKey) activityChipWorkoutCacheRef.current.set(cacheKey, result);
        return result;
    }, [chipKeyOf, ensureUserCompletedWorkouts]);

    const openViewWorkoutModal = useCallback((workoutIndex) => {
        try {
            const post = posts?.[workoutIndex];
            const w = post?.workout;
            if (!w) return;
            const fallback = {
                wid: w?.wid || w?.id,
                creatorUID: w?.creatorUID || w?.creatorUid || post?.uid || (global?.userData?.uid || ""),
                created: w?.created || w?.createdAt || Date.now(),
                exercises: Array.isArray(w?.exercises) ? w.exercises : [],
                duration: w?.duration,
                volume: w?.volume,
                reps: w?.reps,
                PBs: w?.PBs ?? w?.pbs ?? 0,
                templateName: w?.templateName || w?.template?.name,
            };
            const wk = { ...fallback, ...w };
            const friendUid = String(post?.uid || wk.creatorUID || wk.creatorUid || "");
            const friendPfp = post?.pfp || wk?.pfp || wk?.pfpUrl || post?.photoURL || post?.image || "";
            const friendPfpVersion = post?.pfpVersion ?? wk?.pfpVersion ?? wk?.version ?? 0;
            wk.__friendUid = friendUid;
            wk.__friendPfp = friendPfp || null;
            wk.__friendPfpVersion = friendPfpVersion ?? 0;
            activityViewerSessionRef.current += 1;
            const item = {
                key: `${friendUid}:${wk?.wid || wk?.id || workoutIndex}`,
                workout: wk,
                friendUid,
                friendPfp: friendPfp || null,
                friendPfpVersion: friendPfpVersion ?? 0,
                chip: null,
            };
            setFeedWorkoutItems([item]);
            setFeedWorkoutActiveIndex(0);
            setFeedWorkoutExpandToggle((f) => !f);
        } catch (e) {
            console.log("[Feed] openViewWorkoutModal error", e);
        }
    }, [posts]);

    const closeViewWorkoutModal = useCallback(() => {}, []);

    const handlePressActivityChip = useCallback((chip, allChips = []) => {
        if (!chip) return;
        const sessionId = (activityViewerSessionRef.current = activityViewerSessionRef.current + 1);
        const prepareItems = (source, activeChip) => {
            const prepared = source.map((entry, index) => ({
                key: `${chipKeyOf(entry)}:${index}`,
                workout: null,
                chip: entry,
                friendUid: String(entry?.uid || ""),
                friendPfp: entry?.pfp || entry?.pfpUrl || entry?.photoURL || entry?.image || null,
                friendPfpVersion: entry?.pfpVersion ?? entry?.version ?? 0,
            }));
            if (!prepared.length) return { items: [], activeIndex: 0 };
            const boundedIndex = Math.max(0, Math.min(prepared.length - 1, source.findIndex((c) => chipKeyOf(c) === chipKeyOf(activeChip))));
            return { items: prepared, activeIndex: boundedIndex };
        };
        const { items, activeIndex } = prepareItems(allChips.length ? allChips : [chip], chip);
        setFeedWorkoutItems(items);
        setFeedWorkoutActiveIndex(activeIndex);
        setFeedWorkoutExpandToggle((f) => !f);
        const prime = (entry, idx) => {
            ensureWorkoutForChip(entry)
                .then((workout) => {
                    if (!workout) return;
                    if (activityViewerSessionRef.current !== sessionId) return;
                    setFeedWorkoutItems((prev) => {
                        if (activityViewerSessionRef.current !== sessionId) return prev;
                        if (!Array.isArray(prev) || idx >= prev.length) return prev;
                        const clone = [...prev];
                        clone[idx] = { ...clone[idx], workout };
                        return clone;
                    });
                })
                .catch((e) => console.log("[Feed] ensureWorkoutForChip prime error", e));
        };
        prime(chip, activeIndex);
        items.forEach((entry, idx) => {
            if (idx === activeIndex) return;
            if (entry?.workout) return;
            prime(entry, idx);
        });
    }, [chipKeyOf, ensureWorkoutForChip]);

    useEffect(() => {
        const sessionId = activityViewerSessionRef.current;
        const current = Array.isArray(feedWorkoutItems) ? feedWorkoutItems[feedWorkoutActiveIndex] : null;
        if (!current || current.workout || !current.chip) return;
        ensureWorkoutForChip(current.chip)
            .then((workout) => {
                if (!workout) return;
                if (activityViewerSessionRef.current !== sessionId) return;
                setFeedWorkoutItems((prev) => {
                    if (activityViewerSessionRef.current !== sessionId) return prev;
                    if (!Array.isArray(prev) || feedWorkoutActiveIndex >= prev.length) return prev;
                    const clone = [...prev];
                    const existing = clone[feedWorkoutActiveIndex];
                    if (!existing || existing.workout) return prev;
                    clone[feedWorkoutActiveIndex] = { ...existing, workout };
                    return clone;
                });
            })
            .catch((e) => console.log("[Feed] ensureWorkoutForChip active error", e));
    }, [feedWorkoutActiveIndex, feedWorkoutItems, ensureWorkoutForChip]);

    const listData = useMemo(() => ([...(posts || [])]), [posts]);
    const listKeyExtractor = useCallback((item, index) => String(item?.pid || item?.id || index), []);

    const handleScroll = useCallback((event) => {
        const y = event?.nativeEvent?.contentOffset?.y ?? 0;
        setScrollOffset(y);
    }, [setScrollOffset]);

    const focusedPost = focusedPostIndex.current === -1 ? null : posts?.[focusedPostIndex.current];

    return (
        <FeedFocusProvider value={focusContextValue}>
            <SafeAreaView style={styles.mainContainer}>
                <StatusBar style="light" />
                <View style={styles.feedContainer}>
                    <FlatList
                        ref={flatListRef}
                        data={listData}
                        keyExtractor={listKeyExtractor}
                        renderItem={renderPost}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingTop: headerHeight, paddingBottom: insets.bottom + scaleSize(80) }}
                        refreshControl={(
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={theme.textPrimary}
                                colors={[theme.textPrimary]}
                                progressBackgroundColor={theme.bg}
                            />
                        )}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                        viewabilityConfig={VIEWABILITY_CONFIG}
                        onViewableItemsChanged={onViewableItemsChanged.current}
                    />
                </View>

                <SafeAreaInsetsView edges={["top"]} pointerEvents="box-none" style={styles.headerOverlayWrapper}>
                    <FeedHeaderOverlay
                        navigation={navigation}
                        toMessagesScreen={toMessagesScreen}
                        onOpenNotifications={handleOpenNotifications}
                        onBackPress={handleBackPress}
                        scrollToTop={scrollToTop}
                        allUsersRef={allUsersRef}
                        activeWorkout={activeWorkout}
                        timerRef={headerTimerRef}
                        overlayHeaderStyle={{}}
                        normalHeaderOpacityStyle={{ opacity: isSomePostFocused ? 0 : 1 }}
                        chipsOpacityStyle={{ opacity: 1 }}
                        backHeaderOpacityStyle={{ opacity: isSomePostFocused ? 1 : 0 }}
                        headerH={{ value: headerHeight }}
                        hidden={{ value: 0 }}
                        chipsH={{ value: 0 }}
                        visibleHeaderHRef={{ current: headerHeight }}
                        backHeaderHRef={{ current: 0 }}
                        setBackHeaderH={() => { }}
                        isSomePostFocused={isSomePostFocused}
                        onPressActivityChip={handlePressActivityChip}
                        onHeaderHeightChange={setHeaderHeight}
                    />
                </SafeAreaInsetsView>

                <NotificationsBottomSheet notificationsBottomSheetExpandFlag={notificationsBottomSheetExpandFlag} />
                <CommentsBottomSheet
                    isVisible={isSomePostFocused}
                    postData={focusedPost}
                    commentsBottomSheetExpandFlag={commentsBottomSheetExpandFlag}
                    toViewProfile={toViewProfileComments}
                />
                <ShareBottomSheet
                    shareBottomSheetCloseFlag={shareBottomSheetCloseFlag}
                    shareBottomSheetExpandFlag={shareBottomSheetExpandFlag}
                />
                <Footer key={footerKey} currentScreenName="Feed" navigation={navigation} />
                <FeedWorkoutViewerSheet
                    expandToggle={feedWorkoutExpandToggle}
                    items={feedWorkoutItems}
                    activeIndex={feedWorkoutActiveIndex}
                    onChangeIndex={setFeedWorkoutActiveIndex}
                    onClose={closeViewWorkoutModal}
                />
            </SafeAreaView>
        </FeedFocusProvider>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    feedContainer: {
        flex: 1,
    },
    headerOverlayWrapper: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 30,
    },
});
