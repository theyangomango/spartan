/**
 * Feed Screen. Retrieves and displays stories and posts.
 * Handles Navigation to the Messages Screen.
 * Handles the CommentsBottomSheet, ShareBottomSheet, and Workout viewer sheet
 * * Does NOT handle backend calls from user interactions
 */

import React, { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import { SafeAreaView, StyleSheet, View, RefreshControl, Dimensions } from "react-native";
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets, SafeAreaView as SafeAreaInsetsView } from "react-native-safe-area-context";
import Reanimated, { useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, useDerivedValue, runOnJS, withTiming, withSpring, Easing as ReEasing } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import PostListItem from "../components/1_Feed/PostListItem";
import createCellRenderer from "../components/1_Feed/createCellRenderer";
import useHeaderSearchUsers from "../hooks/useHeaderSearchUsers";
import CommentsBottomSheet from "../components/1_Feed/Comments/CommentsBottomSheet";
import ShareBottomSheet from "../components/1_Feed/SharePost/ShareBottomSheet";
import FollowListBottomSheet from "../components/FollowListBottomSheet";
import FeedWorkoutViewerSheet from "../components/1_Feed/ViewWorkout/FeedWorkoutViewerSheet";
import FeedHeaderOverlay from "../components/1_Feed/FeedHeaderOverlay";

import Footer from "../components/Footer";
import theme from "../theme/mfpDark";
import isThisUser from "../helper/isThisUser";
import useFilteredFeed from "../helper/useFilteredFeed";
import MaskedView from "@react-native-masked-view/masked-view";
import scaleSize from "../helper/scaleSize";
import useFeedUserData from "./feed/hooks/useFeedUserData";
import { FeedFocusProvider } from "./feed/hooks/FeedFocusContext";
import useFeedUnfocusGesture from "./feed/hooks/useFeedUnfocusGesture";
import {
    TARGET_POSITION,
    FOCUS_ANIMATION_DURATION as ANIMATION_DURATION,
    INTERACTIVE_START_MS,
    INTERACTIVE_CANCEL_MS,
    INTERACTIVE_LOCKOUT_MS,
    COMMENTS_COLLAPSE_MIN_PX,
    COMMENTS_REOPEN_MAX_PX,
    FOCUS_SPRING_CONFIG,
    WINDOW_WIDTH as width,
    WINDOW_HEIGHT as height,
} from "./feed/constants";

export default function Feed({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const isScreenFocused = useIsFocused();
    // Use UID from global or route params
    const UID = "userData" in global ? global.userData.uid : route?.params?.uid;

    // State
    const posts = useFilteredFeed(global.userData ? global.userData?.following : []);

    const POST_ASPECT_RATIO = 0.8;
    const screenHeight = useMemo(() => {
        const dims = Dimensions.get('screen');
        return Number.isFinite(dims?.height) ? dims.height : height;
    }, []);
    const commentsContainerOffset = useMemo(() => scaleSize(85), []);
    const maxCommentsSheetHeight = useMemo(
        () => Math.max(0, screenHeight - commentsContainerOffset),
        [screenHeight, commentsContainerOffset]
    );
    const postCardHeight = useMemo(() => width / POST_ASPECT_RATIO, []);

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
    const [commentsBottomSheetExpandFlag, setCommentsBottomSheetExpandFlag] = useState(false);
    const [commentsCollapseSignal, setCommentsCollapseSignal] = useState(0);
    const [commentsReopenSignal, setCommentsReopenSignal] = useState(0);
    // Pre-mounted bottom sheet viewer for workouts
    const [feedWorkoutExpandToggle, setFeedWorkoutExpandToggle] = useState(false);
    const [feedWorkoutItems, setFeedWorkoutItems] = useState([]);
    const [feedWorkoutActiveIndex, setFeedWorkoutActiveIndex] = useState(0);
    const [likesSheetVisible, setLikesSheetVisible] = useState(false);
    const [likesSheetUsers, setLikesSheetUsers] = useState([]);
    const [likesSheetTitle, setLikesSheetTitle] = useState('Liked by');
    // Pull-to-refresh state
    const [refreshing, setRefreshing] = useState(false);
    const commentsSnapHeightRef = useRef(null);
    const [commentsSnapHeight, setCommentsSnapHeight] = useState(null);

    /* ---------- refs ---------- */
    const scrollOffsetY = useRef(0);
    const focusedPostIndex = useRef(-1);
    const flatListRef = useRef(null);
    const isTransitioning = useRef(false); /* 🔒 */
    const isUnfocusingRef = useRef(false); // true while interactive unfocus gesture is active
    const justRefocusedRef = useRef(false);
    const refocusTimeoutRef = useRef(null);
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
    // Track current visible height of the collapsible header
    const visibleHeaderHRef = useRef(0);
    const setVisibleHeaderJS = (v) => { visibleHeaderHRef.current = v || 0; };
    // Measure the compact back header shown during focus
    const backHeaderHRef = useRef(0);
    const [backHeaderH, setBackHeaderH] = useState(0);
    // Track last consumed global scroll-to-top signal
    const feedTopSignalRef = useRef(0);
    // Keep track of which index is currently translating (focus/unfocus animation)
    const translatingIndexRef = useRef(-1);
    const alignmentSuspendedRef = useRef(false);
    const unfocusGestureTimeoutRef = useRef(null);
    const activityViewerSessionRef = useRef(0);

    useEffect(() => {
        focusedPostIndex.current = focusedIndexState;
    }, [focusedIndexState]);

    useEffect(() => {
        translatingIndexRef.current = translatingIndexState;
    }, [translatingIndexState]);

    useEffect(() => () => {
        if (unfocusGestureTimeoutRef.current) {
            cancelAnimationFrame(unfocusGestureTimeoutRef.current);
            unfocusGestureTimeoutRef.current = null;
        }
    }, []);

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

    // Highlight target when navigating from notifications
    const highlightPidRef = useRef(null);
    const [highlightSignal, setHighlightSignal] = useState(0);
    const [pendingScrollRequest, setPendingScrollRequest] = useState(null);
    // Programmatic focusing (simulate user press)
    const programFocusPidRef = useRef(null);
    const [programFocusSignal, setProgramFocusSignal] = useState(0);
    // Versioning for programmatic focus to cancel stale timers/polls
    const programFocusNonceRef = useRef(0);
    const focusSessionNonceRef = useRef(0);
    // For reliable programmatic focus
    const lastScrollTsRef = useRef(0);
    const focusOffsetRef = useRef(0); // current focused translateY offset (negative)
    const syncFocusOffsetJS = useCallback((value) => {
        focusOffsetRef.current = value || 0;
    }, []);
    // Shared locks on UI thread to guard gesture reentry/race
    const isTransitioningSV = useSharedValue(0); // 1 while focus/unfocus animation settles
    const panEnabledSV = useSharedValue(1); // 0 temporarily blocks new pan sessions

    /* ---------- animated values ---------- */
    // Reanimated header reveal values (UI thread)
    const headerH = useSharedValue(0);
    const hidden = useSharedValue(0); // header hide distance
    const prevY = useSharedValue(0);
    const focusHide = useSharedValue(0); // when focusing a post, fully hide header
    const isFocusSV = useSharedValue(0); // freeze JS mirrors during focus
    // Interactive unfocus shared values
    const interactiveProgressSV = useSharedValue(0); // 0..1
    const focusBaseSV = useSharedValue(0);          // base focused translateY (negative)
    const interTranslateSV = useSharedValue(0);     // overlay translate during drag
    const focusTranslateSV = useSharedValue(0);     // base translate for focus/unfocus
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
        // Half-pixel rounding reduces sub-pixel thrash while keeping top alignment exact.
        const target = Math.round(raw * 2) / 2;
        visibleSmoothSV.value = target;
    });
    const maskContainerStyle = useAnimatedStyle(() => ({ top: visibleSmoothSV.value }));
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
    // Ratio to slow header displacement relative to user scroll
    const HEADER_SCROLL_RATIO = 0.2; // e.g., 10px scroll -> 5px displacement
    const refreshingSV = useSharedValue(0);
    const onScrollRe = useAnimatedScrollHandler({
        onBeginDrag: (e) => {
            prevY.value = e.contentOffset.y;
        },
        onScroll: (e) => {
            const y = e.contentOffset.y;
            // If pulling down or actively refreshing, snap header fully open
            if (y <= 0 || refreshingSV.value === 1) {
                prevY.value = y;
                hidden.value = 0;
                if (isFocusSV.value === 0) {
                    const h = headerH.value;
                    if (h > 0) runOnJS(setVisibleHeaderJS)(h);
                }
                runOnJS(handleScrollJS)(y);
                return;
            }
            const dy = y - prevY.value;
            prevY.value = y;
            const H = headerH.value;
            if (H > 0) {
                const minVisible = 0;
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

    const updateCommentsSnapHeight = useCallback((targetTop) => {
        if (!Number.isFinite(targetTop)) return;
        const bottom = targetTop + postCardHeight;
        const rawHeight = screenHeight - bottom;
        const clamped = Math.max(0, Math.min(maxCommentsSheetHeight, rawHeight));
        if (!Number.isFinite(clamped)) return;
        const prev = commentsSnapHeightRef.current;
        commentsSnapHeightRef.current = clamped;
        if (prev == null || Math.abs(prev - clamped) > 0.5) {
            setCommentsSnapHeight(clamped);
        }
    }, [postCardHeight, screenHeight, maxCommentsSheetHeight]);

    const ensureFocusedAlignment = useCallback((idx, sessionId, attempt = 0) => {
        if (idx < 0) return;
        if (focusSessionNonceRef.current !== sessionId) return;
        if (alignmentSuspendedRef.current) {
            if (attempt < 6) {
                requestAnimationFrame(() => ensureFocusedAlignment(idx, sessionId, attempt + 1));
            }
            return;
        }
        const ref = postRefs.current?.[idx];
        if (!ref?.measureScreenTop) {
            if (attempt < 6) {
                requestAnimationFrame(() => ensureFocusedAlignment(idx, sessionId, attempt + 1));
            }
            return;
        }
        Promise.resolve(ref.measureScreenTop())
            .then((top) => {
                if (focusSessionNonceRef.current !== sessionId) return;
                const targetTop = backHeaderHRef.current || (insets?.top ? insets.top + 44 : TARGET_POSITION);
                if (!Number.isFinite(top) || !Number.isFinite(targetTop)) {
                    if (attempt < 6) {
                        requestAnimationFrame(() => ensureFocusedAlignment(idx, sessionId, attempt + 1));
                    }
                    return;
                }
                updateCommentsSnapHeight(targetTop);
                const diff = top - targetTop;
                const absDiff = Math.abs(diff);
                const PRIMARY_THRESHOLD = 6;
                const RECHECK_THRESHOLD = 1.1;
                if (absDiff <= RECHECK_THRESHOLD) {
                    return;
                }
                if (absDiff <= PRIMARY_THRESHOLD) {
                    return;
                }
                const next = (focusOffsetRef.current || 0) - diff;
                focusOffsetRef.current = next;
                try { focusBaseSV.value = next; } catch { }
                try {
                    focusTranslateSV.value = withSpring(next, FOCUS_SPRING_CONFIG);
                } catch { }
                if (attempt < 3) {
                    requestAnimationFrame(() => ensureFocusedAlignment(idx, sessionId, attempt + 1));
                }
            })
            .catch(() => {
                if (attempt < 6) {
                    requestAnimationFrame(() => ensureFocusedAlignment(idx, sessionId, attempt + 1));
                }
            });
    }, [insets?.top, updateCommentsSnapHeight]);

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
        translatingIndexRef.current = index;
        startTransition(() => {
            setFocusedIndexState(index);
            setTranslatingIndexState(index);
        });

        const resolveFocusPageY = () => {
            try {
                const lay = itemLayoutsRef.current?.get?.(index);
                const headerVisible = Math.max(0, visibleHeaderHRef.current || 0);
                const currentOffset = scrollOffsetY.current;
                if (lay && Number.isFinite(lay.y) && Number.isFinite(headerVisible) && Number.isFinite(currentOffset)) {
                    const rel = lay.y - currentOffset;
                    const computed = headerVisible + rel;
                    if (Number.isFinite(computed)) {
                        // Preserve negative values so posts clipped above the viewport
                        // start from their actual screen position, preventing the two-step
                        // correction that previously occurred when clamping to zero.
                        return computed;
                    }
                }
            } catch { }
            return typeof pageY === 'number' ? pageY : 0;
        };

        const startFocus = () => {
            const resolvedPageY = resolveFocusPageY();
            const Vstart = visibleHeaderHRef.current || 0; // overlay header visible height right before focus
            const Vfinal = backHeaderHRef.current || (insets?.top ? insets.top + 44 : TARGET_POSITION);
            updateCommentsSnapHeight(Vfinal);
            // Needed translation Δ for the card: Vfinal - (resolvedPageY - Vstart) = - (resolvedPageY - Vstart - Vfinal)
            // animateView negates the input, so pass (resolvedPageY - Vstart - Vfinal)
            const delta = resolvedPageY - Vstart - Vfinal;
            // store target focused offset for interactive gesture math
            focusOffsetRef.current = -delta;
            try { focusBaseSV.value = -delta; } catch { }
            // Begin card translation first, then enter focus mode so the header hides in sync
            animateView(delta);
            // Enter focus mode and ensure other posts fade out gradually
        startTransition(() => setIsSomePostFocused(true));
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

    const handleBackPress = (origin = 'button', options = {}) => {
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
        const preAnimated = !!(fromGesture && options?.preAnimated);

        if (!preAnimated) {
            try {
                focusHide.value = withTiming(0, { duration: ANIMATION_DURATION, easing: ReEasing.out(ReEasing.cubic) });
                interactiveProgressSV.value = withTiming(1, { duration: ANIMATION_DURATION, easing: ReEasing.out(ReEasing.cubic) });
            } catch { }
        }

        if (!fromGesture) stopFlatListMomentum();

        if (!preAnimated) {
            animateView(0);
        } else if (typeof options?.onComplete === 'function') {
            options.onComplete(true);
        }

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

    // JS helpers for runOnJS calls from worklet
    const suspendInteractiveAlignment = useCallback(() => {
        alignmentSuspendedRef.current = true;
        if (unfocusGestureTimeoutRef.current) {
            cancelAnimationFrame(unfocusGestureTimeoutRef.current);
            unfocusGestureTimeoutRef.current = null;
        }
    }, []);
    const resumeInteractiveAlignment = useCallback(() => {
        alignmentSuspendedRef.current = false;
    }, []);
    const clearUnfocusFlagsJS = useCallback(() => {
        isUnfocusingRef.current = false;
        resumeInteractiveAlignment();
        if (unfocusGestureTimeoutRef.current) {
            cancelAnimationFrame(unfocusGestureTimeoutRef.current);
            unfocusGestureTimeoutRef.current = null;
        }
        setUnfocusGestureActive(false);
        if (isSomePostFocused && focusedPostIndex.current !== -1) {
            const idx = focusedPostIndex.current;
            const sessionId = focusSessionNonceRef.current;
            const frameId = requestAnimationFrame(() => {
                unfocusGestureTimeoutRef.current = null;
                ensureFocusedAlignment(idx, sessionId, 0);
            });
            unfocusGestureTimeoutRef.current = frameId;
        }
    }, [ensureFocusedAlignment, isSomePostFocused, resumeInteractiveAlignment]);

    /* ---------- helper: run the trio animation ---------- */
    const onFocusTranslateEnd = useCallback((clearTranslating) => {
        // Called after the translate animation settles
        isTransitioning.current = false; /* 🔓 unlock */
        try { isTransitioningSV.value = 0; } catch { }
        try { panEnabledSV.value = 1; } catch { }
        resumeInteractiveAlignment();
        isUnfocusingRef.current = false;
        if (clearTranslating) {
            syncFocusOffsetJS(0);
            try { focusBaseSV.value = 0; } catch { }
        }
        if (clearTranslating) {
            // Finishing unfocus: commit state after animation to avoid layout jump
            try { startTransition(() => setIsSomePostFocused(false)); } catch { }
            try { focusedPostIndex.current = -1; } catch { }
            translatingIndexRef.current = -1;
            startTransition(() => {
                setFocusedIndexState(-1);
                setTranslatingIndexState(-1);
            });
            commentsSnapHeightRef.current = null;
            setCommentsSnapHeight(null);
        }
    }, [resumeInteractiveAlignment, setCommentsSnapHeight, syncFocusOffsetJS]);

    const animateView = (translateYValue) => {
        try {
            const clearTranslating = translateYValue === 0;
            focusTranslateSV.value = withSpring(-translateYValue, FOCUS_SPRING_CONFIG, () => {
                runOnJS(onFocusTranslateEnd)(clearTranslating);
            });
        } catch {
            // Fallback: clear flags
            isTransitioning.current = false;
            isUnfocusingRef.current = false;
        }
    };
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
    const showLikesSheet = useCallback((users, title = 'Liked by') => {
        const processed = Array.isArray(users)
            ? users
                .map((entry) => {
                    if (!entry) return null;
                    if (typeof entry === 'string' || typeof entry === 'number') {
                        const uid = String(entry).trim();
                        return uid ? uid : null;
                    }
                    if (typeof entry === 'object') {
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
        setLikesSheetTitle(title || 'Liked by');
        setLikesSheetVisible(true);
    }, [setLikesSheetUsers, setLikesSheetTitle, setLikesSheetVisible]);
    const openLikesSheet = useCallback((idx) => {
        if (idx == null || idx < 0 || !Array.isArray(posts)) return;
        const post = posts[idx];
        if (!post) return;

        showLikesSheet(post.likes, 'Liked by');
    }, [posts, showLikesSheet]);
    const handleOpenNotifications = useCallback(() => {
        try {
            navigation?.navigate?.('Notifications', { transition: 'slide-from-right' });
        } catch {}
    }, [navigation]);

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

    // Scroll to a specific post by pid, optionally focusing it
    const scrollToPid = useCallback((pid, { focus = true } = {}) => {
        if (!pid || !Array.isArray(posts) || posts.length === 0) return false;
        const idx = posts.findIndex((p) => String(p?.pid || '') === String(pid));
        if (idx < 0) return false;
        const normalizedPid = String(pid);
        highlightPidRef.current = normalizedPid;
        setHighlightSignal(Date.now());

        const lay = itemLayoutsRef.current.get(idx);
        const visibleH = Math.max(0, visibleHeaderHRef.current || 0);
        const viewportTop = scrollOffsetY.current;
        const viewportBottom = viewportTop + (height - visibleH);
        const fullyVisible = lay && lay.y >= viewportTop && (lay.y + lay.h) <= viewportBottom;

        if (!focus) {
            if (!fullyVisible) {
                if (lay) {
                    const targetOffset = Math.max(0, lay.y - 8);
                    try {
                        flatListRef.current?.scrollToOffset?.({ offset: targetOffset, animated: false });
                        scrollOffsetY.current = targetOffset;
                    } catch {}
                } else {
                    try { flatListRef.current?.scrollToIndex?.({ index: idx, viewPosition: 0, animated: false }); } catch {}
                }
            }
            return true;
        }

        const myNonce = (programFocusNonceRef.current = (programFocusNonceRef.current || 0) + 1);

        if (fullyVisible) {
            programFocusPidRef.current = normalizedPid;
            // small delay to ensure layout refs are fresh
            setTimeout(() => {
                if (programFocusNonceRef.current !== myNonce) return; // stale
                setProgramFocusSignal(myNonce);
            }, 30);
            return true;
        }

        if (lay) {
            const targetOffset = Math.max(0, lay.y - 8);
            try {
                flatListRef.current?.scrollToOffset?.({ offset: targetOffset, animated: false });
                scrollOffsetY.current = targetOffset;
            } catch {}
        } else {
            try { flatListRef.current?.scrollToIndex?.({ index: idx, viewPosition: 0, animated: false }); } catch {}
        }

        // Poll until layout is available and scroll has settled, then trigger a measured focus
        let tries = 0; const MAX = 40; // ~600ms worst-case
        const poll = () => {
            const now = Date.now();
            const stable = now - (lastScrollTsRef.current || 0) > 32;
            const hasLay = !!itemLayoutsRef.current.get(idx);
            if (hasLay && stable) {
                if (programFocusNonceRef.current !== myNonce) return; // stale
                programFocusPidRef.current = normalizedPid;
                setProgramFocusSignal(myNonce);
                return;
            }
            if (tries++ >= MAX) {
                // Fallback: force focus anyway
                if (programFocusNonceRef.current !== myNonce) return; // stale
                programFocusPidRef.current = normalizedPid;
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
            console.log('[Feed] openViewWorkoutModal error', e);
        }
    }
    const closeViewWorkoutModal = () => {
        // Keep last workout cached to avoid race clearing when reopening quickly.
        // It will be replaced on next open.
    };

    // Implement scrollToTop function
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

    // Respond to param-based triggers while screen is already focused
    useEffect(() => {
        let cleanup;

        if (route?.params?.scrollToTop) {
            if (justRefocusedRef.current) {
                justRefocusedRef.current = false;
                try { navigation.setParams({ scrollToTop: false }); } catch { }
            } else {
                const id = setTimeout(() => scrollToTop(), 30);
                cleanup = () => clearTimeout(id);
                try { navigation.setParams({ scrollToTop: false }); } catch { }
            }
        }

        if (route?.params?.focusPid || route?.params?.scrollPid) {
            const rawPid = route?.params?.focusPid ?? route?.params?.scrollPid;
            if (rawPid !== undefined && rawPid !== null) {
                const pid = String(rawPid);
                const focus = Boolean(route?.params?.focusPid);
                setPendingScrollRequest({ pid, focus });
                const id = setTimeout(() => {
                    const ok = scrollToPid(pid, { focus });
                    if (ok) setPendingScrollRequest(null);
                }, 50);
                const focusCleanup = () => clearTimeout(id);
                cleanup = cleanup
                    ? () => { cleanup(); focusCleanup(); }
                    : focusCleanup;
            }
            try { navigation.setParams({ focusPid: undefined, scrollPid: undefined }); } catch { }
        }

        return cleanup;
    }, [route?.params?.scrollToTop, route?.params?.focusPid, route?.params?.scrollPid, navigation, scrollToPid, scrollToTop]);

    // Scroll to top when triggered by legacy global signal
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

    // Retry pending scroll requests once posts are available
    useEffect(() => {
        const req = pendingScrollRequest;
        if (!req?.pid) return;
        const ok = scrollToPid(req.pid, { focus: req.focus });
        if (ok) setPendingScrollRequest(null);
    }, [pendingScrollRequest, posts, scrollToPid]);

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
                openLikesSheet={openLikesSheet}
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
            openLikesSheet,
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

    // Build data: posts only; header handled by overlay + spacer
    const listData = useMemo(() => ([...(posts || [])]), [posts]);
    const listKeyExtractor = useCallback((item, i) => String(item?.pid || item?.id || i), []);

    const { panUnfocus } = useFeedUnfocusGesture({
        height,
        isSomePostFocused,
        isTransitioningSV,
        panEnabledSV,
        setUnfocusGestureActive,
        isUnfocusingRef,
        interactiveProgressSV,
        focusBaseSV,
        interTranslateSV,
        focusTranslateSV,
        syncFocusOffsetJS,
        suspendInteractiveAlignment,
        resumeInteractiveAlignment,
        focusHide,
        headerH,
        signalCommentsCollapse,
        signalCommentsReopen,
        handleBackPress,
        focusSpringConfig: FOCUS_SPRING_CONFIG,
        onFocusTranslateEnd,
        clearUnfocusFlagsJS,
        focusAnimationDuration: ANIMATION_DURATION,
        INTERACTIVE_CANCEL_MS,
        INTERACTIVE_LOCKOUT_MS,
        COMMENTS_COLLAPSE_MIN_PX,
        COMMENTS_REOPEN_MAX_PX,
    });

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
            .simultaneousWithExternalGesture(Gesture.Native())
            .onBegin(() => { try { runOnJS(hSwipeBeginJS)(); } catch { } })
            .onUpdate((e) => { try { runOnJS(hSwipeUpdateJS)(e.translationX); } catch { } })
            .onEnd((e) => { try { runOnJS(hSwipeEndJS)(e.translationX, e.velocityX); } catch { } });
    }, [isSomePostFocused, hSwipeBeginJS, hSwipeUpdateJS, hSwipeEndJS]);
    const handleFooterTap = useCallback((absoluteX, absoluteY) => {
        try {
            if (!isSomePostFocused) return;
            const idx = focusedPostIndex.current;
            if (idx == null || idx < 0) return;
            const ref = postRefs.current?.[idx];
            if (!ref || typeof ref?.handleFooterTap !== 'function') return;
            ref.handleFooterTap(absoluteX, absoluteY);
        } catch { }
    }, [isSomePostFocused]);

    const footerTapGesture = useMemo(() => {
        return Gesture.Tap()
            .enabled(!!isSomePostFocused)
            .maxDistance(18)
            .onEnd((event, success) => {
                if (!success) return;
                try { runOnJS(handleFooterTap)(event.absoluteX, event.absoluteY); } catch { }
            });
    }, [isSomePostFocused, handleFooterTap]);

    const combinedGesture = useMemo(
        () => Gesture.Simultaneous(panUnfocus, horizontalSwipe, footerTapGesture),
        [panUnfocus, horizontalSwipe, footerTapGesture]
    );

    const commentsSnapHeightValue = Number.isFinite(commentsSnapHeight) ? commentsSnapHeight : null;

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

                {/* Overlay header (FeedHeader) that reveals/collapses; spacer keeps posts pushed */}
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
                        backHeaderOpacityStyle={backHeaderOpacityStyle}
                        headerH={headerH}
                        hidden={hidden}
                        visibleHeaderHRef={visibleHeaderHRef}
                        backHeaderHRef={backHeaderHRef}
                        setBackHeaderH={setBackHeaderH}
                        isSomePostFocused={isSomePostFocused}
                    />
                </SafeAreaInsetsView>

                {/* Top safe-area mask to hide content above inset */}
                <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: theme.bg, zIndex: 25 }} />

                {/* Pan overlay handled above; nothing additional here. */}


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
                    openPositionPx={commentsSnapHeightValue ?? undefined}
                    onShowLikesSheet={showLikesSheet}
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
                    shareBottomSheetExpandFlag={shareBottomSheetExpandFlag}
                />
                <Footer key={footerKey} currentScreenName="Feed" navigation={navigation} />
                {/* Workout viewer bottom sheet (pre-mounted, slides up) */}
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
    mainContainer: { flex: 1, backgroundColor: theme.bg },
    postWrapper: { width: "100%" },
});
