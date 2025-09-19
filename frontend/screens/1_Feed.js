/**
 * Feed Screen. Retrieves and displays stories and posts.
 * Handles Navigation to the Messages Screen.
 * Handles the NotificationsBottomSheet, CommentsBottomSheet, ShareBottomSheet, and Workout viewer sheet
 * * Does NOT handle backend calls from user interactions
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, SafeAreaView, StyleSheet, View, RefreshControl } from "react-native";
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets, SafeAreaView as SafeAreaInsetsView } from "react-native-safe-area-context";
import Reanimated, { useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, useDerivedValue, runOnJS, withTiming, withSpring, withDelay, Easing as ReEasing } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import PostListItem from "../components/1_Feed/PostListItem";
import createCellRenderer from "../components/1_Feed/createCellRenderer";
import useHeaderSearchUsers from "../hooks/useHeaderSearchUsers";
// import ChipsRoundMask from "../components/1_Feed/Pulse/ChipsRoundMask";
import NotificationsBottomSheet from "../components/1_Feed/Notifications/NotificationsBottomSheet";
import CommentsBottomSheet from "../components/1_Feed/Comments/CommentsBottomSheet";
import ShareBottomSheet from "../components/1_Feed/SharePost/ShareBottomSheet";
import FeedWorkoutViewerSheet from "../components/1_Feed/ViewWorkout/FeedWorkoutViewerSheet";
import FeedHeaderOverlay from "../components/1_Feed/FeedHeaderOverlay";

import Footer from "../components/Footer";
import theme from "../theme/mfpDark";
import getScrollTargetPosition from "../helper/getScrollTargetPosition";
import isThisUser from "../helper/isThisUser";
import useFilteredFeed from "../helper/useFilteredFeed";
import MaskedView from "@react-native-masked-view/masked-view";
import useFeedUserData from "./feed/hooks/useFeedUserData";
import { FeedFocusProvider } from "./feed/hooks/FeedFocusContext";

const { width, height } = Dimensions.get("window");
const TARGET_POSITION = getScrollTargetPosition(width, height),
    ANIMATION_DURATION = 320; // main focus/unfocus translation + fades
// More gradual timings for various phases
const INTERACTIVE_START_MS = 220; // when entering focus, settle interactive progress to 0
const INTERACTIVE_CANCEL_MS = 300; // when canceling interactive unfocus, return to focused
const INTERACTIVE_CANCEL_FADE_MS = 260; // chips/story fade when canceling
const INTERACTIVE_LOCKOUT_MS = 340; // brief lockout after cancel
const FOCUS_SPRING_CONFIG = {
    damping: 24,
    stiffness: 240,
    mass: 0.9,
    restDisplacementThreshold: 0.15,
    restSpeedThreshold: 0.15,
    overshootClamping: true,
};

export default function Feed({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const isScreenFocused = useIsFocused();
    // Use UID from global or route params
    const UID = "userData" in global ? global.userData.uid : route?.params?.uid;

    // State
    const posts = useFilteredFeed(global.userData ? global.userData?.following : []);

    const {
        activeWorkout,
        footerKey,
        headerTimerRef,
        toMessagesScreen,
    } = useFeedUserData({ UID, navigation, route, isScreenFocused });

    const [isSomePostFocused, setIsSomePostFocused] = useState(false);
    const [focusedIndexState, setFocusedIndexState] = useState(-1);
    const [translatingIndexState, setTranslatingIndexState] = useState(-1);
    const [shareBottomSheetExpandFlag, setShareBottomSheetExpandFlag] = useState(false);
    const [shareBottomSheetCloseFlag, setShareBottomSheetCloseFlag] = useState(false);
    const [notificationsBottomSheetExpandFlag, setNotificationsBottomSheetExpandFlag] = useState(false);
    const [commentsBottomSheetExpandFlag, setCommentsBottomSheetExpandFlag] = useState(false);
    const [commentsCollapseSignal, setCommentsCollapseSignal] = useState(0);
    const [commentsReopenSignal, setCommentsReopenSignal] = useState(0);
    // Pre-mounted bottom sheet viewer for workouts
    const [feedWorkoutExpandToggle, setFeedWorkoutExpandToggle] = useState(false);
    const [feedSelectedWorkout, setFeedSelectedWorkout] = useState(null);
    const [feedSelectedFriendUid, setFeedSelectedFriendUid] = useState("");
    const [feedSelectedFriendPfp, setFeedSelectedFriendPfp] = useState(null);
    // Pull-to-refresh state
    const [refreshing, setRefreshing] = useState(false);

    /* ---------- refs ---------- */
    const scrollOffsetY = useRef(0);
    const focusedPostIndex = useRef(-1);
    const flatListRef = useRef(null);
    const isTransitioning = useRef(false); /* 🔒 */
    const isUnfocusingRef = useRef(false); // true while interactive unfocus gesture is active
    const [unfocusGestureActive, setUnfocusGestureActive] = useState(false);

    // ✅ Shared header users (global/users + following + prefetch)
    const { allUsersRef, mergeUsersIntoRef } = useHeaderSearchUsers({
        following: global.userData?.following,
        enablePrefetch: true,
    });

    // Center detection
    const centeredIndexRef = useRef(-1);
    const [centeredIndex, setCenteredIndex] = useState(-1);
    const itemLayoutsRef = useRef(new Map()); // index -> { y, h }
    const viewableSetRef = useRef(new Set());
    const postRefs = useRef({});
    // Track current visible height of the collapsible header (overlay header + chips)
    const visibleHeaderHRef = useRef(0);
    const setVisibleHeaderJS = (v) => { visibleHeaderHRef.current = v || 0; };
    // Measure the compact back header shown during focus
    const backHeaderHRef = useRef(0);
    const [backHeaderH, setBackHeaderH] = useState(0);
    // Track last consumed global scroll-to-top signal
    const feedTopSignalRef = useRef(0);
    // Keep track of which index is currently translating (focus/unfocus animation)
    const translatingIndexRef = useRef(-1);

    useEffect(() => {
        focusedPostIndex.current = focusedIndexState;
    }, [focusedIndexState]);

    useEffect(() => {
        translatingIndexRef.current = translatingIndexState;
    }, [translatingIndexState]);

    // Highlight target when navigating from notifications
    const highlightPidRef = useRef(null);
    const [highlightSignal, setHighlightSignal] = useState(0);
    const [pendingFocusPid, setPendingFocusPid] = useState(null);
    // Programmatic focusing (simulate user press)
    const programFocusPidRef = useRef(null);
    const [programFocusSignal, setProgramFocusSignal] = useState(0);
    // Versioning for programmatic focus to cancel stale timers/polls
    const programFocusNonceRef = useRef(0);
    const focusSessionNonceRef = useRef(0);
    // For reliable programmatic focus
    const lastScrollTsRef = useRef(0);
    const focusOffsetRef = useRef(0); // current focused translateY offset (negative)
    // Shared locks on UI thread to guard gesture reentry/race
    const isTransitioningSV = useSharedValue(0); // 1 while focus/unfocus animation settles
    const panEnabledSV = useSharedValue(1); // 0 temporarily blocks new pan sessions

    /* ---------- animated values ---------- */
    // Reanimated header reveal values (UI thread)
    const headerH = useSharedValue(0);
    const chipsH = useSharedValue(0); // minimum visible height (keep chips in view)
    const maskH = useSharedValue(0);  // height of rounded mask under chips
    const hidden = useSharedValue(0); // 0..(H - chipsH)
    const prevY = useSharedValue(0);
    const focusHide = useSharedValue(0); // when focusing a post, fully hide header
    const isFocusSV = useSharedValue(0); // freeze JS mirrors during focus
    // Interactive unfocus shared values
    const interactiveProgressSV = useSharedValue(0); // 0..1
    const focusBaseSV = useSharedValue(0);          // base focused translateY (negative)
    const interTranslateSV = useSharedValue(0);     // overlay translate during drag
    const focusTranslateSV = useSharedValue(0);     // base translate for focus/unfocus
    const storiesOpacitySV = useSharedValue(1);     // chips fade
    // Animated styles: overlay header translate
    const overlayHeaderStyle = useAnimatedStyle(() => {
        const totalHidden = Math.min(headerH.value, hidden.value + focusHide.value);
        return { transform: [{ translateY: -totalHidden }] };
    });
    // Smooth the visible header height to remove tiny step changes while preserving scroll/touch behavior
    const visibleSmoothSV = useSharedValue(0);
    useDerivedValue(() => {
        const totalHidden = Math.min(headerH.value, hidden.value + focusHide.value);
        const raw = Math.max(0, headerH.value - totalHidden);
        // Half-pixel rounding reduces sub-pixel thrash
        const target = Math.round(raw * 2) / 2;
        const diff = Math.abs(visibleSmoothSV.value - target);
        if (diff < 0.15) {
            visibleSmoothSV.value = target;
        } else {
            // Gentle spring without overshoot to avoid bounce past target
            visibleSmoothSV.value = withSpring(target, {
                damping: 22,
                stiffness: 240,
                mass: 1,
                overshootClamping: true,
            });
        }
    });
    const maskContainerStyle = useAnimatedStyle(() => ({ top: visibleSmoothSV.value }));
    const chipsOpacityStyle = useAnimatedStyle(() => ({ opacity: storiesOpacitySV.value }));
    // Cross-fade headers during interactive unfocus: normal header fades in while back header fades out
    const normalHeaderOpacityStyle = useAnimatedStyle(() => ({
        opacity: isFocusSV.value === 1 ? interactiveProgressSV.value : 1,
    }));
    const backHeaderOpacityStyle = useAnimatedStyle(() => ({
        opacity: isFocusSV.value === 1 ? 1 - interactiveProgressSV.value : 0,
    }));
    // Combined translate (base focus translate + interactive overlay)
    const interPostStyle = useAnimatedStyle(() => ({ transform: [{ translateY: focusTranslateSV.value + interTranslateSV.value }] }));

    // Throttled center detection to reduce JS bridge load
    const lastCenterCalcTsRef = useRef(0);
    const pendingCenterTimeoutRef = useRef(null);
    const handleScrollJS = useCallback((y) => {
        scrollOffsetY.current = y;
        lastScrollTsRef.current = Date.now();

        const computeCenter = () => {
            if (isSomePostFocused) return; // handled separately
            const vHeader = visibleHeaderHRef.current || 0;
            const viewportCenter = y + (height - vHeader) / 2;

            let best = -1;
            let bestDist = Number.POSITIVE_INFINITY;
            viewableSetRef.current.forEach((idx) => {
                const lay = itemLayoutsRef.current.get(idx);
                if (!lay) return;
                const mid = lay.y + lay.h / 2;
                const dist = Math.abs(mid - viewportCenter);
                if (dist < bestDist) { bestDist = dist; best = idx; }
            });
            const bestPost = best === -1 ? -1 : best; // list index equals posts index
            if (bestPost !== centeredIndexRef.current) {
                centeredIndexRef.current = bestPost;
                setCenteredIndex(bestPost); // ⟵ triggers Post props update => pause/play swap
            }
        };

        if (!isSomePostFocused) {
            const now = Date.now();
            const THROTTLE_MS = 48; // ~20fps is sufficient for autoplay swap
            if (now - (lastCenterCalcTsRef.current || 0) >= THROTTLE_MS) {
                lastCenterCalcTsRef.current = now;
                computeCenter();
            } else if (!pendingCenterTimeoutRef.current) {
                const delay = THROTTLE_MS - (now - (lastCenterCalcTsRef.current || 0));
                pendingCenterTimeoutRef.current = setTimeout(() => {
                    pendingCenterTimeoutRef.current = null;
                    lastCenterCalcTsRef.current = Date.now();
                    computeCenter();
                }, Math.max(8, delay));
            }
        } else if (centeredIndexRef.current !== -1) {
            centeredIndexRef.current = -1;
            setCenteredIndex(-1);
        }
    }, [isSomePostFocused, height]);

    // Pull-to-refresh handler (posts stream via onSnapshot; we just show spinner briefly)
    const onRefresh = useCallback(async () => {
        try {
            setRefreshing(true);
            // No explicit re-fetch needed; Firestore onSnapshot keeps feed live.
            // Keep spinner visible briefly to acknowledge the gesture.
            await new Promise((res) => setTimeout(res, 600));
        } finally {
            setRefreshing(false);
        }
    }, []);

    // Reanimated scroll handler: UI-thread header control + forward to JS logic
    // Ratio to slow header/chips/mask displacement relative to user scroll
    const HEADER_SCROLL_RATIO = 0.2; // e.g., 10px scroll -> 5px displacement
    const refreshingSV = useSharedValue(0);
    const onScrollRe = useAnimatedScrollHandler({
        onBeginDrag: (e) => {
            prevY.value = e.contentOffset.y;
        },
        onScroll: (e) => {
            const y = e.contentOffset.y;
            // If pulling down (y<0) or actively refreshing, freeze header animation
            if (y < 0 || refreshingSV.value === 1) {
                prevY.value = y;
                runOnJS(handleScrollJS)(y);
                return;
            }
            const dy = y - prevY.value;
            prevY.value = y;
            const H = headerH.value;
            if (H > 0) {
                const minVisible = Math.min(Math.max(chipsH.value + maskH.value, 0), H);
                const maxHidden = Math.max(0, H - minVisible);
                // Apply slowed displacement factor so UI moves slower than finger
                let next = hidden.value + dy * HEADER_SCROLL_RATIO; // dy>0 hide; dy<0 reveal
                if (next < 0) next = 0;
                if (next > maxHidden) next = maxHidden;
                hidden.value = next;
                const visibleNow = Math.max(0, H - next);
                if (isFocusSV.value === 0) {
                    runOnJS(setVisibleHeaderJS)(visibleNow);
                }
            }
            runOnJS(handleScrollJS)(y);
        },
    });

    // Mirror refreshing flag to UI thread
    useEffect(() => {
        try { refreshingSV.value = refreshing ? 1 : 0; } catch { }
    }, [refreshing]);

    // Clear any pending throttled center calc on unmount
    useEffect(() => () => { try { if (pendingCenterTimeoutRef.current) { clearTimeout(pendingCenterTimeoutRef.current); pendingCenterTimeoutRef.current = null; } } catch { } }, []);

    const ensureFocusedAlignment = useCallback((idx, sessionId, attempt = 0) => {
        if (idx < 0) return;
        if (focusSessionNonceRef.current !== sessionId) return;
        const ref = postRefs.current?.[idx];
        if (!ref?.measureScreenTop) {
            if (attempt < 6) {
                setTimeout(() => ensureFocusedAlignment(idx, sessionId, attempt + 1), 48);
            }
            return;
        }
        Promise.resolve(ref.measureScreenTop())
            .then((top) => {
                if (focusSessionNonceRef.current !== sessionId) return;
                const targetTop = backHeaderHRef.current || (insets?.top ? insets.top + 44 : TARGET_POSITION);
                if (!Number.isFinite(top) || !Number.isFinite(targetTop)) {
                    if (attempt < 6) {
                        setTimeout(() => ensureFocusedAlignment(idx, sessionId, attempt + 1), 64);
                    }
                    return;
                }
                const diff = top - targetTop;
                const absDiff = Math.abs(diff);
                const PRIMARY_THRESHOLD = 6;
                const RECHECK_THRESHOLD = 1.1;
                if (absDiff <= RECHECK_THRESHOLD) {
                    if (attempt < 2 && absDiff > 0.4) {
                        setTimeout(() => ensureFocusedAlignment(idx, sessionId, attempt + 1), 72);
                    }
                    return;
                }
                if (absDiff <= PRIMARY_THRESHOLD) {
                    if (attempt < 2) {
                        setTimeout(() => ensureFocusedAlignment(idx, sessionId, attempt + 1), 88);
                    }
                    return;
                }
                const next = (focusOffsetRef.current || 0) - diff;
                focusOffsetRef.current = next;
                try { focusBaseSV.value = next; } catch { }
                try {
                    focusTranslateSV.value = withSpring(next, FOCUS_SPRING_CONFIG);
                } catch { }
                if (attempt < 5) {
                    setTimeout(() => ensureFocusedAlignment(idx, sessionId, attempt + 1), 120);
                }
            })
            .catch(() => {
                if (attempt < 6) {
                    setTimeout(() => ensureFocusedAlignment(idx, sessionId, attempt + 1), 64);
                }
            });
    }, [insets?.top]);

    /* ---------- focus / unfocus handlers ---------- */
    const handleFocusPost = (index, pageY, preferWaitForHeader = false) => {
        // Any manual focus should invalidate stale programmatic focus requests
        try { programFocusNonceRef.current += 1; } catch { }
        try { setPendingFocusPid(null); } catch { }
        if (isTransitioning.current) return; /* 🔒 */
        isTransitioning.current = true;
        try { isTransitioningSV.value = 1; } catch { }
        try { panEnabledSV.value = 0; } catch { }
        const sessionId = (focusSessionNonceRef.current = (focusSessionNonceRef.current || 0) + 1);

        const maybeSyncScrollOffset = () => {
            if (typeof pageY !== 'number') return;
            try {
                const lay = itemLayoutsRef.current?.get?.(index);
                const headerVisible = Math.max(0, visibleHeaderHRef.current || 0);
                if (lay && Number.isFinite(lay.y) && Number.isFinite(headerVisible)) {
                    const inferredOffset = lay.y + headerVisible - pageY;
                    if (Number.isFinite(inferredOffset)) {
                        scrollOffsetY.current = Math.max(0, inferredOffset);
                    }
                }
            } catch { }
        };

        maybeSyncScrollOffset();
        stopFlatListMomentum();

        focusedPostIndex.current = index;
        setFocusedIndexState(index);
        translatingIndexRef.current = index;
        setTranslatingIndexState(index);
        commentsHiddenSV.value = 0;

        const resolveFocusPageY = () => {
            try {
                const lay = itemLayoutsRef.current?.get?.(index);
                const headerVisible = Math.max(0, visibleHeaderHRef.current || 0);
                const currentOffset = scrollOffsetY.current;
                if (lay && Number.isFinite(lay.y) && Number.isFinite(headerVisible) && Number.isFinite(currentOffset)) {
                    const rel = lay.y - currentOffset;
                    const computed = headerVisible + rel;
                    if (Number.isFinite(computed)) {
                        return Math.max(0, computed);
                    }
                }
            } catch { }
            return typeof pageY === 'number' ? pageY : 0;
        };

        const startFocus = () => {
            const resolvedPageY = resolveFocusPageY();
            const Vstart = visibleHeaderHRef.current || 0; // overlay header+chips visible height right before focus
            const Vfinal = backHeaderHRef.current || (insets?.top ? insets.top + 44 : TARGET_POSITION);
            // Needed translation Δ for the card: Vfinal - (resolvedPageY - Vstart) = - (resolvedPageY - Vstart - Vfinal)
            // animateView negates the input, so pass (resolvedPageY - Vstart - Vfinal)
            const delta = resolvedPageY - Vstart - Vfinal;
            // store target focused offset for interactive gesture math
            focusOffsetRef.current = -delta;
            try { focusBaseSV.value = -delta; } catch { }
            // Begin card translation first, then enter focus mode so header chips hide in sync
            animateView(delta, 0);
            // Enter focus mode and ensure other posts fade out gradually
            setIsSomePostFocused(true);
            try { interactiveProgressSV.value = withTiming(0, { duration: INTERACTIVE_START_MS, easing: ReEasing.out(ReEasing.cubic) }); } catch { }
            try {
                setTimeout(() => ensureFocusedAlignment(index, sessionId, 0), ANIMATION_DURATION + 96);
            } catch { }
        };

        const scheduleFocusStart = () => {
            let tries = 0; const MAX_IDLE_CHECKS = 4;
            const waitForIdle = () => {
                const idleForMs = Date.now() - (lastScrollTsRef.current || 0);
                if (idleForMs > 24 || tries++ >= MAX_IDLE_CHECKS) {
                    requestAnimationFrame(() => startFocus());
                    return;
                }
                requestAnimationFrame(waitForIdle);
            };
            waitForIdle();
        };

        if (!preferWaitForHeader) {
            scheduleFocusStart();
        } else {
            // Ensure the compact header height is known; a ghost sizer generally sets this instantly.
            let tries = 0; const MAX = 24; // ~400ms
            const poll = () => {
                if (backHeaderHRef.current > 0 || tries++ >= MAX) {
                    scheduleFocusStart();
                    return;
                }
                requestAnimationFrame(poll);
            };
            requestAnimationFrame(poll);
        }
    };

    const handleBackPress = (origin = 'button') => {
        // Invalidate any pending programmatic focus callbacks
        try { programFocusNonceRef.current += 1; } catch { }
        try { setPendingFocusPid(null); } catch { }
        try { focusSessionNonceRef.current += 1; } catch { }
        if (isTransitioning.current) return; /* 🔒 */
        isTransitioning.current = true;
        try { isTransitioningSV.value = 1; } catch { }
        try { panEnabledSV.value = 0; } catch { }

        // Collapse comments immediately to avoid lag
        try { setCommentsCollapseSignal(Date.now()); } catch { }
        // Initiate share sheet close if open
        setShareBottomSheetCloseFlag((f) => !f);

        const fromGesture = origin === 'gesture';

        try {
            focusHide.value = withTiming(0, { duration: ANIMATION_DURATION, easing: ReEasing.out(ReEasing.cubic) });
            interactiveProgressSV.value = withTiming(1, { duration: ANIMATION_DURATION, easing: ReEasing.out(ReEasing.cubic) });
        } catch { }

        if (!fromGesture) stopFlatListMomentum();

        animateView(0, 1);

        flatListRef.current?.setNativeProps({ scrollEnabled: true });
    };

    // When a post is focused/unfocused, animate header fully hidden/visible to avoid interference
    useEffect(() => {
        focusHide.value = withTiming(
            isSomePostFocused ? headerH.value : 0,
            { duration: ANIMATION_DURATION, easing: ReEasing.out(ReEasing.cubic) }
        );
        isFocusSV.value = isSomePostFocused ? 1 : 0;
        // Keep non-focused posts fully visible when leaving focus
        if (!isSomePostFocused) {
            try { interactiveProgressSV.value = withTiming(1, { duration: ANIMATION_DURATION, easing: ReEasing.out(ReEasing.cubic) }); } catch { }
        }
    }, [isSomePostFocused]);


    // Stop any ongoing fling by jumping to the current offset with animation off
    const stopFlatListMomentum = () => {
        if (flatListRef.current) {
            flatListRef.current.scrollToOffset({
                offset: scrollOffsetY.current,
                animated: false, // ⟵ cancels momentum
            });
            flatListRef.current.setNativeProps({ scrollEnabled: false });
        }
    };

    /* ---------- helper: run the trio animation ---------- */
    const onFocusTranslateEnd = useCallback((clearTranslating) => {
        // Called after the translate animation settles
        isTransitioning.current = false; /* 🔓 unlock */
        try { isTransitioningSV.value = 0; } catch { }
        try { panEnabledSV.value = 1; } catch { }
        isUnfocusingRef.current = false;
        if (clearTranslating) {
            // Finishing unfocus: commit state after animation to avoid layout jump
            try { setIsSomePostFocused(false); } catch { }
            try { focusedPostIndex.current = -1; } catch { }
            setFocusedIndexState(-1);
            translatingIndexRef.current = -1;
            setTranslatingIndexState(-1);
            try { setUnfocusGestureActive(false); } catch { }
        }
    }, []);

    const animateView = (translateYValue, opacityValue) => {
        try {
            const clearTranslating = translateYValue === 0;
            focusTranslateSV.value = withSpring(-translateYValue, FOCUS_SPRING_CONFIG, () => {
                runOnJS(onFocusTranslateEnd)(clearTranslating);
            });
            storiesOpacitySV.value = withTiming(opacityValue, { duration: ANIMATION_DURATION, easing: ReEasing.out(ReEasing.cubic) });
        } catch {
            // Fallback: clear flags
            isTransitioning.current = false;
            isUnfocusingRef.current = false;
        }
    };

    // JS helpers for runOnJS calls from worklet
    const scheduleClearUnfocusGestureActive = useCallback((delayMs) => {
        try { setTimeout(() => setUnfocusGestureActive(false), delayMs || 0); } catch { }
    }, []);
    const clearUnfocusFlagsJS = useCallback(() => {
        try { isUnfocusingRef.current = false; } catch { }
        try { setUnfocusGestureActive(false); } catch { }
    }, []);
    const signalCommentsCollapse = useCallback(() => {
        try { setCommentsCollapseSignal(Date.now()); } catch { }
    }, []);
    const signalCommentsReopen = useCallback(() => {
        try { setCommentsReopenSignal(Date.now()); } catch { }
    }, []);

    // Bottom sheet toggles
    const openCommentsModal = useCallback(() => {
        setCommentsBottomSheetExpandFlag((f) => !f);
    }, []);
    const openShareModal = useCallback(() => {
        setShareBottomSheetExpandFlag((f) => !f);
    }, []);
    const handleOpenNotifications = useCallback(() => {
        setNotificationsBottomSheetExpandFlag((f) => !f);
    }, []);

    // Profile navigation from posts
    const toViewProfilePosts = useCallback((idx) => {
        const user = { handle: posts[idx].handle, uid: posts[idx].uid, pfp: posts[idx].pfp, name: posts[idx].name };
        const rootNav = navigation?.getParent?.('ROOT');
        if (isThisUser(posts[idx].uid)) {
            if (rootNav?.navigate) rootNav.navigate('Profile', { transition: 'slide-from-right' });
            else navigation.navigate('Profile', { transition: 'slide-from-right' });
        } else {
            if (rootNav?.navigate) rootNav.navigate('ViewProfile', { user });
            else navigation.navigate('ViewProfile', { user });
        }
    }, [navigation, posts]);

    // Profile navigation from comments
    const toViewProfileComments = useCallback((data) => {
        const user = { handle: data.handle, uid: data.uid, pfp: data.pfp, name: data.name };
        const rootNav = navigation?.getParent?.('ROOT');
        if (isThisUser(data.uid)) {
            if (rootNav?.navigate) rootNav.navigate('Profile', { transition: 'slide-from-right' });
            else navigation.navigate('Profile', { transition: 'slide-from-right' });
        } else {
            if (rootNav?.navigate) rootNav.navigate('ViewProfile', { user });
            else navigation.navigate('ViewProfile', { user });
        }
    }, [navigation]);

    // Scroll to a specific post by pid and focus it reliably
    const scrollToPid = useCallback((pid) => {
        if (!pid || !Array.isArray(posts) || posts.length === 0) return false;
        const idx = posts.findIndex((p) => String(p?.pid || '') === String(pid));
        if (idx < 0) return false;
        highlightPidRef.current = String(pid);
        setHighlightSignal(Date.now());
        // Create a new nonce to uniquely identify this request
        const myNonce = (programFocusNonceRef.current = (programFocusNonceRef.current || 0) + 1);

        // Helper to compute screen Y for the item without measure (pretend in-window)
        const computePageY = () => {
            const l = itemLayoutsRef.current.get(idx);
            if (!l) return null;
            const vHeader = Math.max(0, visibleHeaderHRef.current || 0);
            const yScreen = vHeader + (l.y - scrollOffsetY.current);
            return yScreen;
        };

        const lay = itemLayoutsRef.current.get(idx);
        const visibleH = Math.max(0, visibleHeaderHRef.current || 0);
        const viewportTop = scrollOffsetY.current;
        const viewportBottom = viewportTop + (height - visibleH);

        // If already fully visible, trigger programmatic focus; Post will measure pageY
        if (lay && lay.y >= viewportTop && (lay.y + lay.h) <= viewportBottom) {
            programFocusPidRef.current = String(pid);
            // small delay to ensure layout refs are fresh
            setTimeout(() => {
                if (programFocusNonceRef.current !== myNonce) return; // stale
                setProgramFocusSignal(myNonce);
            }, 30);
            return true;
        }

        // Otherwise, jump the list to reveal the item near the top of viewport
        if (lay) {
            const targetOffset = Math.max(0, lay.y - 8);
            try {
                flatListRef.current?.scrollToOffset?.({ offset: targetOffset, animated: false });
                scrollOffsetY.current = targetOffset;
            } catch { }
        } else {
            try { flatListRef.current?.scrollToIndex?.({ index: idx, viewPosition: 0, animated: false }); } catch { }
        }

        // Poll until layout is available and scroll has settled, then trigger a measured focus
        let tries = 0; const MAX = 40; // ~600ms worst-case
        const poll = () => {
            const now = Date.now();
            const stable = now - (lastScrollTsRef.current || 0) > 32;
            const hasLay = !!itemLayoutsRef.current.get(idx);
            if (hasLay && stable) {
                if (programFocusNonceRef.current !== myNonce) return; // stale
                programFocusPidRef.current = String(pid);
                setProgramFocusSignal(myNonce);
                return;
            }
            if (tries++ >= MAX) {
                // Fallback: force focus anyway
                if (programFocusNonceRef.current !== myNonce) return; // stale
                programFocusPidRef.current = String(pid);
                setProgramFocusSignal(myNonce);
                return;
            }
            requestAnimationFrame(poll);
        };
        requestAnimationFrame(poll);
        return true;
    }, [posts, handleFocusPost]);

    // View workout details using FeedWorkoutViewerSheet (bottom sheet, not full-screen)
    function openViewWorkoutModal(workoutIndex) {
        try {
            const post = posts?.[workoutIndex];
            const w = post?.workout;
            if (!w) return;
            // Normalize minimal fields expected by NewWorkoutModal
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
            // Resolve friend uid + pfp (author of the post/workout)
            const friendUid = String(post?.uid || wk.creatorUID || wk.creatorUid || "");
            const friendPfp =
                post?.pfp || wk?.pfp || wk?.pfpUrl || post?.photoURL || post?.image || "";
            wk.__friendUid = friendUid;
            wk.__friendPfp = friendPfp;

            setFeedSelectedWorkout(wk);
            setFeedSelectedFriendUid(friendUid);
            setFeedSelectedFriendPfp(friendPfp || null);
            setFeedWorkoutExpandToggle((f) => !f);
        } catch { }
    }
    const closeViewWorkoutModal = () => {
        // Keep last workout cached to avoid race clearing when reopening quickly.
        // It will be replaced on next open.
    };

    // Implement scrollToTop function
    const scrollToTop = () => {
        if (flatListRef.current) {
            flatListRef.current.scrollToOffset({ offset: 0, animated: true });
        }
    };

    // Respond to param-based triggers while screen is already focused
    useEffect(() => {
        if (route?.params?.scrollToTop) {
            const id = setTimeout(() => scrollToTop(), 30);
            try { navigation.setParams({ scrollToTop: false }); } catch { }
            return () => clearTimeout(id);
        }
        if (route?.params?.focusPid) {
            const pid = String(route.params.focusPid);
            setPendingFocusPid(pid);
            const id = setTimeout(() => {
                const ok = scrollToPid(pid);
                if (ok) setPendingFocusPid(null);
            }, 50);
            try { navigation.setParams({ focusPid: undefined }); } catch { }
            return () => clearTimeout(id);
        }
    }, [route?.params?.scrollToTop, route?.params?.focusPid]);

    // Scroll to top when triggered by Footer reselection (param or global signal)
    useFocusEffect(
        useCallback(() => {
            // Param-based trigger
            if (route?.params?.scrollToTop) {
                const id = setTimeout(() => scrollToTop(), 30);
                // reset param so it doesn't re-trigger on next focus
                try { navigation.setParams({ scrollToTop: false }); } catch { }
                return () => clearTimeout(id);
            }
            // Focus a specific post by pid (from notifications)
            if (route?.params?.focusPid) {
                const pid = String(route.params.focusPid);
                setPendingFocusPid(pid);
                const id = setTimeout(() => {
                    const ok = scrollToPid(pid);
                    if (ok) setPendingFocusPid(null);
                }, 50);
                try { navigation.setParams({ focusPid: undefined }); } catch { }
                return () => clearTimeout(id);
            }
            // Global-signal fallback
            const lastRef = feedTopSignalRef.current || 0;
            const sig = Number(global?.scrollFeedToTopSignal || 0);
            if (sig && sig !== lastRef) {
                feedTopSignalRef.current = sig;
                const id = setTimeout(() => scrollToTop(), 30);
                return () => clearTimeout(id);
            }
        }, [route?.params?.scrollToTop, navigation])
    );

    // Retry pending focus once posts are available
    useEffect(() => {
        if (!pendingFocusPid) return;
        const ok = scrollToPid(pendingFocusPid);
        if (ok) setPendingFocusPid(null);
    }, [pendingFocusPid, posts]);

    // Custom CellRenderer to capture y/height of each cell in content coordinates
    const CellRenderer = useMemo(() =>
        createCellRenderer((index, y, h) => {
            try { itemLayoutsRef.current.set(index, { y, h }); } catch { }
        }),
        []);

    // Stable viewability handler (avoid re-creating function each render)
    const onViewableItemsChangedRef = useRef(({ viewableItems }) => {
        const s = new Set();
        viewableItems.forEach((v) => {
            if (typeof v.index === "number" && v.index >= 0) s.add(v.index);
        });
        viewableSetRef.current = s;
    });

    // Render a single post (deduped logic)
    const renderPost = useCallback(
        ({ item, index }) => (
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
        ),
        [
            isScreenFocused,
            centeredIndex,
            highlightSignal,
            openCommentsModal,
            openShareModal,
            toViewProfilePosts,
            openViewWorkoutModal,
        ]
    );

    const focusContextValue = useMemo(() => ({
        isSomePostFocused,
        focusedIndex: focusedIndexState,
        translatingIndex: translatingIndexState,
        focusModeSV: isFocusSV,
        interactiveUnfocusSV: interactiveProgressSV,
        interPostStyle,
        unfocusGestureActive,
        handleFocusPost,
        handleUnfocus: handleBackPress,
    }), [
        isSomePostFocused,
        focusedIndexState,
        translatingIndexState,
        interPostStyle,
        unfocusGestureActive,
        handleFocusPost,
        handleBackPress,
    ]);

    /* -------------------- HYDRATE allUsersRef.current -------------------- */

    useEffect(() => {
        if (!posts || posts.length === 0) return;
        const seeded = posts
            .map((p) => ({ uid: p?.uid, handle: p?.handle, name: p?.name, pfp: p?.pfp }))
            .filter((u) => !!u.uid);
        mergeUsersIntoRef(seeded);
    }, [posts]);

    // Following hydration and small prefetch handled in useHeaderSearchUsers

    // Build data: posts only; header+chips are handled by overlay + spacer
    const listData = useMemo(() => ([...(posts || [])]), [posts]);
    const listKeyExtractor = useCallback((item, i) => String(item?.pid || item?.id || i), []);

    // ---------- Upward pan to unfocus (interactive) ----------
    // Use device height to set a sensible drag distance
    const FULL_GESTURE_PX = Math.max(84, Math.min(height * 0.16, 200));
    // Make progress feel snappier near the start
    const PROGRESS_SLOW_K = 1.2; // lower = more sensitive early progress
    const CLOSE_THRESHOLD = 0.1; // keep similar close feel
    const REOPEN_THRESHOLD = 0.06; // hysteresis to avoid flicker when user drags back down
    const commentsHiddenSV = useSharedValue(0); // 0 visible, 1 hidden (collapsed) during interactive pan
    const panUnfocus = useMemo(() => {
        return Gesture.Pan()
            .minPointers(1)
            .maxPointers(1)
            // Immediately give up when the user swipes horizontally (so carousels scroll)
            .failOffsetX([-12, 12])
            .activeOffsetY([-4, 4])
            // Expand the gesture start region both above AND below the post.
            // This ensures that after focusing a top-clipped post, gestures remain
            // responsive across the entire visual card, not just the originally
            // visible slice. Symmetric hitSlop prevents dead zones near the bottom.
            .hitSlop({ top: height, bottom: height, left: 0, right: 0 })
            .shouldCancelWhenOutside(false)
            .cancelsTouchesInView(false)
            .enabled(!!isSomePostFocused)
            .simultaneousWithExternalGesture(Gesture.Native())
            .onBegin(() => {
                // Block if a transition is settling or we are in lockout window
                if (isTransitioningSV.value === 1 || panEnabledSV.value === 0) {
                    return;
                }
                // mark interactive
                isUnfocusingRef.current = true;
                runOnJS(setUnfocusGestureActive)(true);
                interactiveProgressSV.value = 0;
                interTranslateSV.value = 0;
                commentsHiddenSV.value = 1;
                try { runOnJS(signalCommentsCollapse)(); } catch { }
            })
            .onUpdate((e) => {
                if (isTransitioningSV.value === 1 || panEnabledSV.value === 0) return;
                if (!isSomePostFocused) return;
                const ty = Math.min(0, e.translationY);
                const dyUp = -ty; // positive upwards drag in px
                const base = focusBaseSV.value || 0; // can be negative or positive
                // Normalize UI progress by absolute distance to origin so timing is consistent
                const distToZero = Math.max(1, Math.abs(base));
                let pNorm = dyUp / distToZero;
                if (pNorm < 0) pNorm = 0; if (pNorm > 1) pNorm = 1;
                // Apply eased curve for a more gradual feel (UI-only)
                const p = Math.pow(pNorm, PROGRESS_SLOW_K);
                interactiveProgressSV.value = p;
                // Early collapse/restore of comments sheet to avoid perceived lag
                if (commentsHiddenSV.value === 0 && pNorm > CLOSE_THRESHOLD) {
                    commentsHiddenSV.value = 1;
                    try { runOnJS(signalCommentsCollapse)(); } catch { }
                } else if (commentsHiddenSV.value === 1 && pNorm < REOPEN_THRESHOLD) {
                    commentsHiddenSV.value = 0;
                    try { runOnJS(signalCommentsReopen)(); } catch { }
                }
                // Reveal overlay header and chips progressively
                const fh = headerH.value || 0;
                focusHide.value = Math.max(0, fh * (1 - p));
                // Fade stories/chips
                storiesOpacitySV.value = p;
                // Move the focused card at a constant speed (1:1 with finger),
                // clamped to the remaining distance in the correct direction.
                const sign = base < 0 ? 1 : -1; // direction toward zero
                const interMag = Math.min(dyUp, Math.abs(base));
                interTranslateSV.value = sign * interMag;
            })
            .onEnd((e) => {
                if (isTransitioningSV.value === 1 || panEnabledSV.value === 0) return;
                if (!isSomePostFocused) return;
                const ty = Math.min(0, e.translationY);
                const dyUp = -ty;
                const baseNow = focusBaseSV.value || 0; // can be negative or positive
                const distToZero = Math.max(1, Math.abs(baseNow));
                let pNorm = dyUp / distToZero;
                if (pNorm < 0) pNorm = 0; if (pNorm > 1) pNorm = 1;
                const shouldClose = pNorm > CLOSE_THRESHOLD || (e.velocityY || 0) < -350;
                // Commit the current combined translation (base + inter) to avoid a visual jump
                const interMagNow = Math.min(dyUp, Math.abs(baseNow));
                const signNow = baseNow < 0 ? 1 : -1;
                const combinedNow = baseNow + signNow * interMagNow;
                const startValue = Math.abs(combinedNow) < 0.5 ? 0 : combinedNow;
                focusTranslateSV.value = startValue;
                interTranslateSV.value = 0;
                // Enter a brief lockout so a second immediate pan doesn't race animations
                panEnabledSV.value = 0;
                if (shouldClose) {
                    // Smoothly finish header reveal to avoid jump
                    focusHide.value = withTiming(0, { duration: ANIMATION_DURATION, easing: ReEasing.out(ReEasing.cubic) });
                    interactiveProgressSV.value = withTiming(1, { duration: ANIMATION_DURATION, easing: ReEasing.out(ReEasing.cubic) });
                    storiesOpacitySV.value = withTiming(1, { duration: ANIMATION_DURATION, easing: ReEasing.out(ReEasing.cubic) });
                    // Collapse comments immediately for responsiveness
                    runOnJS(signalCommentsCollapse)();
                    focusTranslateSV.value = withSpring(0, FOCUS_SPRING_CONFIG, () => {
                        runOnJS(onFocusTranslateEnd)(true);
                    });
                    // Delegate JS cleanup for unfocus
                    runOnJS(handleBackPress)('gesture');
                    // Keep wrapper for the duration to avoid a frame of unwrapped layout
                    runOnJS(scheduleClearUnfocusGestureActive)(ANIMATION_DURATION + 20);
                    // Re-enable pan after the unfocus animation if still relevant
                    panEnabledSV.value = withDelay(ANIMATION_DURATION + 40, withTiming(1, { duration: 0 }));
                } else {
                    // cancel: return to focused state
                    focusHide.value = withTiming(headerH.value, { duration: INTERACTIVE_CANCEL_MS, easing: ReEasing.out(ReEasing.cubic) });
                    interactiveProgressSV.value = withTiming(0, { duration: INTERACTIVE_CANCEL_MS, easing: ReEasing.out(ReEasing.cubic) });
                    interTranslateSV.value = withTiming(0, { duration: INTERACTIVE_CANCEL_MS, easing: ReEasing.out(ReEasing.cubic) });
                    storiesOpacitySV.value = withTiming(0, { duration: INTERACTIVE_CANCEL_FADE_MS, easing: ReEasing.out(ReEasing.cubic) });
                    // Animate base back to focused offset on UI thread
                    focusTranslateSV.value = withSpring(focusBaseSV.value, FOCUS_SPRING_CONFIG);
                    // Clear flags on JS
                    runOnJS(clearUnfocusFlagsJS)();
                    // Reopen comments to its open position if user cancels
                    runOnJS(signalCommentsReopen)();
                    commentsHiddenSV.value = 0;
                    // Brief lockout before accepting a new pan session
                    panEnabledSV.value = withDelay(INTERACTIVE_LOCKOUT_MS, withTiming(1, { duration: 0 }));
                }
            })
            .onFinalize(() => {
                // keep isUnfocusingRef until animateView callback clears it on success path
            });
    }, [isSomePostFocused, height, signalCommentsCollapse, signalCommentsReopen]);

    // Focused-only horizontal swipe at the same wrapper level to change slides
    // Feed-level handlers to proxy horizontal pan to the focused Post
    const hSwipeBeginJS = useCallback(() => {
        try {
            if (!isSomePostFocused) return;
            const ref = postRefs.current?.[focusedPostIndex.current];
            if (ref && typeof ref?.hSwipeBegin === 'function') ref.hSwipeBegin();
        } catch { }
    }, [isSomePostFocused]);
    const hSwipeUpdateJS = useCallback((dx) => {
        try {
            if (!isSomePostFocused) return;
            const ref = postRefs.current?.[focusedPostIndex.current];
            if (ref && typeof ref?.hSwipeUpdate === 'function') ref.hSwipeUpdate(dx);
        } catch { }
    }, [isSomePostFocused]);
    const hSwipeEndJS = useCallback((dx, vx) => {
        try {
            if (!isSomePostFocused) return;
            const ref = postRefs.current?.[focusedPostIndex.current];
            if (ref && typeof ref?.hSwipeEnd === 'function') ref.hSwipeEnd(dx, vx);
        } catch { }
    }, [isSomePostFocused]);
    const horizontalSwipe = useMemo(() => {
        return Gesture.Pan()
            .enabled(!!isSomePostFocused)
            .minPointers(1)
            .maxPointers(1)
            .activeOffsetX([-6, 6])
            .failOffsetY([-8, 8])
            .onBegin(() => { try { runOnJS(hSwipeBeginJS)(); } catch { } })
            .onUpdate((e) => { try { runOnJS(hSwipeUpdateJS)(e.translationX); } catch { } })
            .onEnd((e) => { try { runOnJS(hSwipeEndJS)(e.translationX, e.velocityX); } catch { } });
    }, [isSomePostFocused, hSwipeBeginJS, hSwipeUpdateJS, hSwipeEndJS]);
    const combinedGesture = useMemo(() => Gesture.Simultaneous(panUnfocus, horizontalSwipe), [panUnfocus, horizontalSwipe]);

    return (
        <FeedFocusProvider value={focusContextValue}>
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
                <SafeAreaView style={styles.mainContainer}>
                    <StatusBar style="light" />

                    <GestureDetector gesture={combinedGesture}>
                        <Reanimated.View
                            style={[{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                bottom: 0,
                            }, maskContainerStyle]}
                        >
                            <MaskedView
                                style={{ flex: 1 }}
                                maskElement={
                                    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                                        <View
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                backgroundColor: 'black',
                                                borderRadius: 35,
                                            }}
                                        />
                                    </View>
                                }
                            >
                                <Reanimated.FlatList
                                    ref={flatListRef}
                                    // bounces={true}
                                    alwaysBounceVertical
                                    showsVerticalScrollIndicator={false}
                                    data={listData}
                                    keyExtractor={listKeyExtractor}
                                    renderItem={({ item, index }) => renderPost({ item, index })}
                                    onScroll={onScrollRe}
                                    scrollEventThrottle={16}
                                    stickyHeaderIndices={[]}
                                    viewabilityConfig={{ itemVisiblePercentThreshold: 20 }}
                                    onViewableItemsChanged={onViewableItemsChangedRef.current}
                                    CellRendererComponent={CellRenderer}
                                    // Spacer no longer needed; container top tracks header
                                    initialNumToRender={3}
                                    windowSize={5}
                                    maxToRenderPerBatch={4}
                                    updateCellsBatchingPeriod={32}
                                    removeClippedSubviews={false}
                                    refreshControl={
                                        <RefreshControl
                                            refreshing={refreshing}
                                            onRefresh={onRefresh}
                                            tintColor={theme.textPrimary}
                                            colors={[theme.textPrimary]}
                                            progressBackgroundColor={theme.bg}
                                        />
                                    }
                                />
                            </MaskedView>
                        </Reanimated.View>
                    </GestureDetector>

                    {/* Full-screen unfocus pan is handled by the GestureDetector
                        wrapping the list container above. It’s enabled only while
                        a post is focused and configured to fail quickly on
                        horizontal motion, so horizontal media swipes remain
                        responsive. */}
                </SafeAreaView>

                {/* Overlay header (FeedHeader + ActivityChips) that reveals/collapses; spacer keeps posts pushed */}
                <SafeAreaInsetsView edges={['top']} pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
                    <FeedHeaderOverlay
                        navigation={navigation}
                        toMessagesScreen={toMessagesScreen}
                        onOpenNotifications={handleOpenNotifications}
                        onBackPress={handleBackPress}
                        scrollToTop={scrollToTop}
                        allUsersRef={allUsersRef}
                        activeWorkout={activeWorkout}
                        timerRef={headerTimerRef}
                        overlayHeaderStyle={overlayHeaderStyle}
                        normalHeaderOpacityStyle={normalHeaderOpacityStyle}
                        chipsOpacityStyle={chipsOpacityStyle}
                        backHeaderOpacityStyle={backHeaderOpacityStyle}
                        headerH={headerH}
                        hidden={hidden}
                        chipsH={chipsH}
                        visibleHeaderHRef={visibleHeaderHRef}
                        backHeaderHRef={backHeaderHRef}
                        setBackHeaderH={setBackHeaderH}
                        isSomePostFocused={isSomePostFocused}
                    />
                </SafeAreaInsetsView>

                {/* Top safe-area mask to hide content above inset */}
                <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: theme.bg, zIndex: 25 }} />

                {/* Pan overlay handled above; nothing additional here. */}


                <NotificationsBottomSheet notificationsBottomSheetExpandFlag={notificationsBottomSheetExpandFlag} />
                <CommentsBottomSheet
                    isVisible={isSomePostFocused}
                    postData={focusedPostIndex.current === -1 ? null : posts[focusedPostIndex.current]}
                    commentsBottomSheetExpandFlag={commentsBottomSheetExpandFlag}
                    toViewProfile={toViewProfileComments}
                    // Drive interactive collapse during pan-to-unfocus
                    interactiveProgressSV={interactiveProgressSV}
                    interactiveScale={3.0}
                    collapseSignal={commentsCollapseSignal}
                    reopenSignal={commentsReopenSignal}
                    unfocusGestureActive={unfocusGestureActive}
                />
                <ShareBottomSheet
                    shareBottomSheetCloseFlag={shareBottomSheetCloseFlag}
                    shareBottomSheetExpandFlag={shareBottomSheetExpandFlag}
                />
                <Footer key={footerKey} currentScreenName="Feed" navigation={navigation} />
                {/* Workout viewer bottom sheet (pre-mounted, slides up) */}
                <FeedWorkoutViewerSheet
                    expandToggle={feedWorkoutExpandToggle}
                    workout={feedSelectedWorkout}
                    friendUid={feedSelectedFriendUid}
                    friendPfp={feedSelectedFriendPfp}
                    onClose={closeViewWorkoutModal}
                />
            </SafeAreaView>
        </FeedFocusProvider>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: theme.bg },
    postWrapper: { width: "100%" },
});
