/**
 * Feed Screen. Retrieves and displays stories and posts.
 * Handles Navigation to the Messages Screen.
 * Handles the NotificationsBottomSheet, CommentsBottomSheet, ShareBottomSheet, and Workout viewer sheet
 * * Does NOT handle backend calls from user interactions
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, SafeAreaView, StyleSheet, View, Text, RefreshControl, InteractionManager } from "react-native";
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from "expo-status-bar";
import { doc, onSnapshot } from "firebase/firestore";
import { useSafeAreaInsets, SafeAreaView as SafeAreaInsetsView } from "react-native-safe-area-context";
import Reanimated, { useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, runOnJS, withTiming, Easing as ReEasing } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import Post from "../components/1_Feed/Posts/Post";
import FeedHeader from "../components/1_Feed/FeedHeader";
import useHeaderSearchUsers from "../hooks/useHeaderSearchUsers";
import ActivityChips from "../components/1_Feed/Pulse/ActivityChips";
import ChipsRoundMask from "../components/1_Feed/Pulse/ChipsRoundMask";
import NotificationsBottomSheet from "../components/1_Feed/Notifications/NotificationsBottomSheet";
import CommentsBottomSheet from "../components/1_Feed/Comments/CommentsBottomSheet";
import ShareBottomSheet from "../components/1_Feed/SharePost/ShareBottomSheet";
import FeedWorkoutViewerSheet from "../components/1_Feed/ViewWorkout/FeedWorkoutViewerSheet";

import { initUserFeed, registerFeedSetters } from "../helper/initUserFeed";
import Footer from "../components/Footer";
import theme from "../theme/mfpDark";
import { db } from "../../firebase.config";
import getScrollTargetPosition from "../helper/getScrollTargetPosition";
import millisToHoursMinutesSeconds from "../helper/millisToHoursMinutesSeconds";
import isThisUser from "../helper/isThisUser";
import useFilteredFeed from "../helper/useFilteredFeed";
import MaskedView from "@react-native-masked-view/masked-view";

import scaleSize from "../helper/scaleSize";

const { width, height } = Dimensions.get("window");
const CARD_AR = 0.8; // Post card aspect ratio (W / H)
const TARGET_POSITION = getScrollTargetPosition(width, height),
    ANIMATION_DURATION = 280;

export default function Feed({ navigation, route }) {
    const insets = useSafeAreaInsets();
    // Debug logger (always logs)
    const dlog = (...args) => { try { console.log('[Feed]', ...args); } catch { } };

    // Use UID from global or route params
    const UID = "userData" in global ? global.userData.uid : route?.params?.uid;

    // State
    const posts = useFilteredFeed(global.userData ? global.userData?.following : []);
    const [messages, setMessages] = useState(null);
    const [isSomePostFocused, setIsSomePostFocused] = useState(false);
    const [footerKey, setFooterKey] = useState(0);
    const [shareBottomSheetExpandFlag, setShareBottomSheetExpandFlag] = useState(false);
    const [shareBottomSheetCloseFlag, setShareBottomSheetCloseFlag] = useState(false);
    const [notificationsBottomSheetExpandFlag, setNotificationsBottomSheetExpandFlag] = useState(false);
    const [commentsBottomSheetExpandFlag, setCommentsBottomSheetExpandFlag] = useState(false);
    const [commentsCollapseSignal, setCommentsCollapseSignal] = useState(0);
    const [commentsReopenSignal, setCommentsReopenSignal] = useState(0);
    // Removed JS-driven unfocus progress to avoid per-frame JS updates
    // Pre-mounted bottom sheet viewer for workouts
    const [feedWorkoutExpandToggle, setFeedWorkoutExpandToggle] = useState(false);
    const [feedSelectedWorkout, setFeedSelectedWorkout] = useState(null);
    const [feedSelectedFriendUid, setFeedSelectedFriendUid] = useState("");
    const [feedSelectedFriendPfp, setFeedSelectedFriendPfp] = useState(null);
    // Pull-to-refresh state
    const [refreshing, setRefreshing] = useState(false);

    /* ---------- refs ---------- */
    const scrollOffsetY = useRef(0);
    const userDataRef = useRef(null);
    const focusedPostIndex = useRef(-1);
    const [focusedIndexState, setFocusedIndexState] = useState(-1);
    const flatListRef = useRef(null);
    const isTransitioning = useRef(false); /* 🔒 */
    const pendingUnfocusTRef = useRef(null);
    const focusUnlockTimerRef = useRef(null);
    const [unfocusing, setUnfocusing] = useState(false);
    const focusSeqRef = useRef(0);
    const [focusSeq, setFocusSeq] = useState(0);
    const queuedFocusRef = useRef(null);
    // Only remount the focused Post at the end of focus when truly needed
    const needsFocusEndRemountRef = useRef(false);

    // Overlay focus: render focused Post absolutely to avoid any clipping without pre-scroll
    const [showOverlay, setShowOverlay] = useState(false);
    const overlayIndexRef = useRef(-1);
    const focusStartPageYSV = useSharedValue(0);
    const focusStartHeaderSV = useSharedValue(0);
    const focusStartPageYRef = useRef(0); // JS mirror for precise finish math
    const focusStartHeaderJSRef = useRef(0);

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
    // Track current visible height of the collapsible header (overlay header + chips)
    const visibleHeaderHRef = useRef(0);
    const setVisibleHeaderJS = (v) => { visibleHeaderHRef.current = v || 0; };
    // Measure the compact back header shown during focus
    const backHeaderHRef = useRef(0);
    // Height of the compact header (FeedHeader only), measured from the overlay header
    const compactHeaderHRef = useRef(0);
    // Track last consumed global scroll-to-top signal
    const feedTopSignalRef = useRef(0);

    // Highlight target when navigating from notifications
    const highlightPidRef = useRef(null);
    const [highlightSignal, setHighlightSignal] = useState(0);
    const [pendingFocusPid, setPendingFocusPid] = useState(null);
    // Programmatic focusing (simulate user press)
    const programFocusPidRef = useRef(null);
    const [programFocusSignal, setProgramFocusSignal] = useState(0);
    // For reliable programmatic focus
    const lastScrollTsRef = useRef(0);
    const desiredFocusIndexRef = useRef(-1);
    const focusWatchIdRef = useRef(null);
    // When performing a native scroll to finish unfocus, hold target offset here
    const finalizeScrollTargetRef = useRef(null);
    // When initiating a focus via native FlatList scroll, wait until we reach the
    // target offset to unlock transitions again so unfocus can be triggered.
    const focusScrollTargetRef = useRef(null);
    // Flag: we are currently finishing via a native FlatList scroll
    const isFinishingScrollRef = useRef(false);

    // Wait until target index is in viewport and scrolling has settled, then focus
    const startFocusWatcher = useCallback((pid, idx) => {
        desiredFocusIndexRef.current = idx;
        if (focusWatchIdRef.current) {
            try { cancelAnimationFrame(focusWatchIdRef.current); } catch { }
            focusWatchIdRef.current = null;
        }
        let tries = 0; const MAX = 12; // ~200ms at 60fps for responsiveness
        const tick = () => {
            const i = desiredFocusIndexRef.current;
            if (i < 0) return; // canceled
            const now = Date.now();
            const lay = itemLayoutsRef.current.get(i);
            const idle = now - (lastScrollTsRef.current || 0) > 40;
            if (lay && idle) {
                programFocusPidRef.current = String(pid);
                setProgramFocusSignal(Date.now());
                desiredFocusIndexRef.current = -1;
                focusWatchIdRef.current = null;
                return;
            }
            if (++tries >= MAX) {
                // Fallback: proceed anyway
                programFocusPidRef.current = String(pid);
                setProgramFocusSignal(Date.now());
                desiredFocusIndexRef.current = -1;
                focusWatchIdRef.current = null;
                return;
            }
            focusWatchIdRef.current = requestAnimationFrame(tick);
        };
        focusWatchIdRef.current = requestAnimationFrame(tick);
    }, []);

    /* ---------- animated values ---------- */
    // Reanimated shared values for smooth, UI-thread animations
    const translateYSV = useSharedValue(0);
    // Track the focused-post anchored translation so we can interpolate during interactive unfocus
    const focusTranslateTargetRef = useRef(0);
    const panProgressRef = useRef(0); // 0..1 progress while panning to unfocus
    const didCollapseCommentsRef = useRef(false);
    const focusTranslateTargetSV = useSharedValue(0); // mirror of focusTranslateTargetRef for UI-thread
    const storiesOpacitySV = useSharedValue(1);
    // Opacity for all non-focused posts (1 = visible, 0 = hidden)
    const othersOpacitySV = useSharedValue(1);
    // Track last progress across onUpdate frames (Gesture handler context isn't provided)
    const lastPanProgressSV = useSharedValue(-1);
    const closedInEndSV = useSharedValue(0);
    const isPanningRef = useRef(false);
    // Reanimated header reveal values (UI thread)
    const headerH = useSharedValue(0);
    const chipsH = useSharedValue(0); // minimum visible height (keep chips in view)
    const maskH = useSharedValue(0);  // height of rounded mask under chips
    const hidden = useSharedValue(0); // 0..(H - chipsH)
    const prevY = useSharedValue(0);
    const focusHide = useSharedValue(0); // when focusing a post, fully hide header
    const isFocusSV = useSharedValue(0); // freeze JS mirrors during focus
    // Back header opacity (compact header shown during focus)
    const backHeaderOpacitySV = useSharedValue(0);
    // Overlay header opacity (full header revealed outside focus)
    const overlayHeaderOpacitySV = useSharedValue(1);
    // UI-thread progress of interactive unfocus (0..1) shared with Post cards
    const unfocusProgressSV = useSharedValue(0);
    // JS mirrors for interactive unfocus handoff
    const translateYValueRef = useRef(0);
    const closingViaPanRef = useRef(false);
    const headerHeightRef = useRef(0);
    // Animated styles: overlay header translate + spacer height
    const overlayHeaderStyle = useAnimatedStyle(() => {
        const totalHidden = Math.min(headerH.value, hidden.value + focusHide.value);
        return { transform: [{ translateY: -totalHidden }] };
    });
    const spacerStyle = useAnimatedStyle(() => {
        const totalHidden = Math.min(headerH.value, hidden.value + focusHide.value);
        return { height: scaleSize(Math.max(0, headerH.value - totalHidden)) };
    });
    // Animated container for MaskedView to track visible header height smoothly
    // Optionally freeze the posts layer top during the auto-finish so header reveal
    // doesn't push the list and cause a snap.
    const lockPostsTopSV = useSharedValue(0); // 1 = locked
    const lockedTopSV = useSharedValue(0);
    const maskContainerStyle = useAnimatedStyle(() => {
        const totalHidden = Math.min(headerH.value, hidden.value + focusHide.value);
        const visible = Math.max(0, headerH.value - totalHidden);
        const top = lockPostsTopSV.value === 1 ? lockedTopSV.value : visible;
        return { top };
    });
    const backHeaderStyle = useAnimatedStyle(() => ({ opacity: backHeaderOpacitySV.value }));
    const overlayHeaderOpacityStyle = useAnimatedStyle(() => ({ opacity: overlayHeaderOpacitySV.value }));
    // Translate the entire posts layer (not a single card) when focusing/unfocusing
    const postsTranslateStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateYSV.value }],
    }));
    const storiesOpacityStyle = useAnimatedStyle(() => ({ opacity: storiesOpacitySV.value }));
    // UI-thread fade for non-focused rows during interactive unfocus
    const nonFocusedOpacityStyle = useAnimatedStyle(() => ({
        opacity: othersOpacitySV.value,
    }));

    // Track native FlatList scroll (UI thread) during finish to keep spacer in sync
    const scrollYSV = useSharedValue(0);
    const startScrollYSV = useSharedValue(0);
    // Signal (UI thread) that we are finishing via native scroll
    const finishingSV = useSharedValue(0);

    // Overlay position: start from tap screen Y, then follow overlay translate minus native/pan scroll
    const panStartScrollSV = useSharedValue(0);
    const panActiveSV = useSharedValue(0);
    const overlayTopStyle = useAnimatedStyle(() => ({
        top:
            (focusStartPageYSV.value - focusStartHeaderSV.value) +
            translateYSV.value -
            (finishingSV.value * ((scrollYSV.value || 0) - (startScrollYSV.value || 0))) -
            (panActiveSV.value * ((scrollYSV.value || 0) - (panStartScrollSV.value || 0))),
    }));

    // Header workout pill state
    const [activeWorkout, setActiveWorkout] = useState(null);
    const headerTimerRef = useRef("");
    const headerTimerIdRef = useRef(null);
    const toMillis = (v) => {
        if (typeof v === "number") return v;
        if (v?.toMillis) return v.toMillis();
        if (typeof v?.seconds === "number") return v.seconds * 1000;
        const n = new Date(v).getTime();
        return Number.isFinite(n) ? n : 0;
    };

    const handleScroll = (e) => {
        const y = e.nativeEvent.contentOffset.y;
        scrollOffsetY.current = y;
        lastScrollTsRef.current = Date.now();

        // If we are finishing via native scroll, finalize once we reach target
        try {
            const t = finalizeScrollTargetRef.current;
            if (t != null && Math.abs(y - t) <= 2) {
                finalizeScrollTargetRef.current = null;
                isFinishingScrollRef.current = false;
                // Complete the unfocus now that the list reached the target
                handleFocusAnimEndJS(0);
            }
        } catch {}

        // If we are focusing via a programmatic list scroll, unlock once we arrive
        try {
            const ft = focusScrollTargetRef.current;
            if (ft != null && Math.abs(y - ft) <= 4) {
                focusScrollTargetRef.current = null;
                isTransitioning.current = false; // allow back/unfocus gestures now
                if (focusUnlockTimerRef.current) { try { clearTimeout(focusUnlockTimerRef.current); } catch {} focusUnlockTimerRef.current = null; }
            }
        } catch {}

        // Only manage center-based playback when NO post is focused
        if (!isSomePostFocused) {
            const vHeader = visibleHeaderHRef.current || 0;
            const viewportCenter = y + (height - vHeader) / 2;

            let best = -1;
            let bestDist = Number.POSITIVE_INFINITY;

            // Limit to currently viewable items for perf
            viewableSetRef.current.forEach((idx) => {
                const lay = itemLayoutsRef.current.get(idx);
                if (!lay) return;
                const mid = lay.y + lay.h / 2;
                const dist = Math.abs(mid - viewportCenter);
                if (dist < bestDist) {
                    bestDist = dist;
                    best = idx;
                }
            });

            const bestPost = best === -1 ? -1 : best; // list index equals posts index
            if (bestPost !== centeredIndexRef.current) {
                centeredIndexRef.current = bestPost;
                setCenteredIndex(bestPost); // ⟵ triggers Post props update => pause/play swap
            }
        } else if (centeredIndexRef.current !== -1) {
            centeredIndexRef.current = -1;
            setCenteredIndex(-1);
        }
    };

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
                runOnJS(handleScroll)({ nativeEvent: { contentOffset: { y } } });
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
            runOnJS(handleScroll)({ nativeEvent: { contentOffset: { y } } });
        },
    });

    // Mirror refreshing flag to UI thread
    useEffect(() => {
        try { refreshingSV.value = refreshing ? 1 : 0; } catch { }
    }, [refreshing]);

    // Load user data from Firestore once
    useEffect(() => {
        if (!UID) return;
        const unsub = onSnapshot(doc(db, "users", UID), (snap) => {
            userDataRef.current = snap.data();
            global.userData = userDataRef.current; // init of userData has global variable
            // keep header in sync with current workout, but suppress briefly if we know we just cleared it locally
            const killUntil = Number(global?.__suppressCurrentWorkoutUntil || 0);
            const now = Date.now();
            const cw = (now < killUntil) ? null : (userDataRef.current?.currentWorkout || null);
            setActiveWorkout(cw);
        });

        return () => unsub();
    }, [UID]);

    // Drive a local timer for the header pill when there is an active workout
    useEffect(() => {
        if (headerTimerIdRef.current) {
            try { clearInterval(headerTimerIdRef.current); } catch { }
            headerTimerIdRef.current = null;
        }
        headerTimerRef.current = "";
        const wid = String(activeWorkout?.wid || "");
        const createdMs = toMillis(activeWorkout?.created ?? activeWorkout?.createdAt);
        if (!wid || !createdMs) return;

        const tick = () => {
            const diff = Math.max(1000, Date.now() - createdMs);
            headerTimerRef.current = millisToHoursMinutesSeconds(diff);
        };
        tick();
        headerTimerIdRef.current = setInterval(tick, 1000);
        return () => {
            if (headerTimerIdRef.current) {
                try { clearInterval(headerTimerIdRef.current); } catch { }
                headerTimerIdRef.current = null;
            }
        };
    }, [activeWorkout?.wid, activeWorkout?.created, activeWorkout?.createdAt]);

    useEffect(() => {
        registerFeedSetters({
            setMessages,
            setFooterKey,
        });

        if (UID) initUserFeed(UID);
    }, [UID]);

    // Baseline subscription handled in useHeaderSearchUsers

    // If messages are passed from route, set them
    useEffect(() => {
        if (route?.params?.messages) setMessages(route.params.messages);
    }, [route?.params?.messages]);

    /* ---------- focus / unfocus handlers ---------- */
    const handleFocusPost = (index, pageY, preferWaitForHeader = false, pid = null) => {
        // Reset per-focus flags
        needsFocusEndRemountRef.current = false;
        if (true) {
            const lay0 = itemLayoutsRef.current.get(index);
            dlog('focus.request', { index, pageY: Math.round(pageY), preferWaitForHeader, pid, layY: lay0?.y, top: scrollOffsetY.current, transitioning: isTransitioning.current });
        }
        // No pre-scroll path (requested): use overlay instead of moving the list first.
        // No pre-scroll: we'll render a focused overlay to avoid clipping.

        if (isTransitioning.current) {
            // Queue a focus attempt to run once the current transition completes
            queuedFocusRef.current = { index, pageY, preferWaitForHeader: true };
            const t = setTimeout(() => {
                if (!isTransitioning.current && queuedFocusRef.current) {
                    const q = queuedFocusRef.current; queuedFocusRef.current = null;
                    dlog('focus.dequeue', q);
                    try { handleFocusPost(q.index, q.pageY, true); } catch { }
                }
            }, 0);
            return; /* 🔒 */
        }
        isTransitioning.current = true;
        stopFlatListMomentum();

        // Cancel any queued unfocus from a previous gesture
        if (pendingUnfocusTRef.current) { try { clearTimeout(pendingUnfocusTRef.current); } catch { } pendingUnfocusTRef.current = null; }

        // Bump focus sequence to force fresh mounts/handlers on new focus
        focusSeqRef.current += 1; setFocusSeq(focusSeqRef.current);

        focusedPostIndex.current = index;
        try { setFocusedIndexState(index); } catch { }
        setIsSomePostFocused(true);
        // Fade out all other posts as we enter focus
        try { othersOpacitySV.value = withTiming(0, { duration: ANIMATION_DURATION, easing: ReEasing.out(ReEasing.cubic) }); } catch {}
        // Consume any pending programmatic focus so it doesn't re-trigger after unfocus
        try { programFocusPidRef.current = null; } catch { }
        const run = () => {
            const Vstart = visibleHeaderHRef.current || 0; // visible overlay header height
            // Compact header height: use measured value, fallback to (overlayHeader - chips)
            const approxCompact = Math.max(0, Math.round((headerH?.value || 0) - (chipsH?.value || 0)));
            const compactH = compactHeaderHRef.current || approxCompact || 44;
            const Vfinal = (insets?.top || 0) + compactH;
            let pageYAdj = pageY;
            // Programmatic path no longer adjusts the offset here; we rely on the
            // focus watcher + Post.measure to provide an accurate pageY.
            // If triggered by a user press: compensate if cell was clipped at the top/bottom
            // No pre-scroll; overlay covers any clipped area. Keep pageYAdj from measure/layout only.

            // If pageY is unavailable (e.g., no measure), estimate from layout
            if (typeof pageYAdj !== 'number') {
                try {
                    const lay2 = itemLayoutsRef.current.get(index);
                    if (lay2 && typeof lay2.y === 'number') {
                        const topNow = scrollOffsetY.current || 0;
                        pageYAdj = lay2.y - topNow + Vstart; // convert content Y to screen Y
                    }
                } catch { }
            }
            // Record focus-start anchors
            try {
                focusStartPageYSV.value = pageYAdj || 0;
                focusStartHeaderSV.value = Vstart || 0;
                focusStartPageYRef.current = pageYAdj || 0;
                focusStartHeaderJSRef.current = Vstart || 0;
                overlayIndexRef.current = index;
                setShowOverlay(false);
            } catch { }
            // Native-scroll the FlatList so the focused row lands at the target position
            // Needed translation Δ: Vfinal - (pageY - Vstart) = - (pageY - Vstart - Vfinal)
            const translate = (pageYAdj || 0) - Vstart - Vfinal;
            dlog('focus.animate', { index, Vstart, Vfinal, pageYAdj, translate });
            const offOld = scrollOffsetY.current || 0;
            const targetOff = Math.max(0, offOld + translate);
            try {
                // If no movement is needed, unlock immediately
                if (Math.abs(targetOff - offOld) <= 1) {
                    focusScrollTargetRef.current = null;
                    isTransitioning.current = false;
                } else {
                    // Mark the target so handleScroll can unlock when we arrive
                    focusScrollTargetRef.current = targetOff;
                    flatListRef.current?.scrollToOffset?.({ offset: targetOff, animated: true });
                    // Fallback unlock in case onScroll doesn't report the exact offset
                    if (focusUnlockTimerRef.current) { try { clearTimeout(focusUnlockTimerRef.current); } catch {} }
                    focusUnlockTimerRef.current = setTimeout(() => {
                        focusScrollTargetRef.current = null;
                        isTransitioning.current = false;
                        focusUnlockTimerRef.current = null;
                    }, 600);
                }
            } catch {}
        };
        // Do not wait for the back header's onLayout; Vfinal is derived above
        setTimeout(run, 0);
    };

    const handleBackPress = () => {
        if (isTransitioning.current) return; /* 🔒 */
        isTransitioning.current = true;
        setUnfocusing(true);
        // no JS progress updates
        // Keep focus state during the animation to avoid layout thrash/jitter.
        // We'll flip isSomePostFocused to false in the animation end callback.
        // Start revealing the header in parallel for a cohesive unfocus
        try {
            // Instantly clear prior scroll-hidden amount so header reveal starts immediately.
            hidden.value = 0;
            focusHide.value = withTiming(0, { duration: ANIMATION_DURATION, easing: ReEasing.out(ReEasing.cubic) });
            // Ensure overlay header/chips fully fade in during automatic completion
            overlayHeaderOpacitySV.value = withTiming(1, { duration: ANIMATION_DURATION, easing: ReEasing.out(ReEasing.cubic) });
            // Also ensure ActivityChips become fully visible
            storiesOpacitySV.value = withTiming(1, { duration: ANIMATION_DURATION, easing: ReEasing.out(ReEasing.cubic) });
            backHeaderOpacitySV.value = withTiming(0, { duration: ANIMATION_DURATION, easing: ReEasing.out(ReEasing.cubic) });
            // Freeze posts top so header reveal doesn't push the list during finish
            lockPostsTopSV.value = 1;
            // Lock to the final header height so unlocking later doesn't cause a jump
            lockedTopSV.value = headerHeightRef.current || 0;
        } catch { }
        // If this unfocus was initiated by an upward pan
        if (closingViaPanRef.current) {
            const extraUp = Math.max(80, Math.min(height * 0.18, 160));
            const baseY = focusTranslateTargetRef.current || 0; // negative
            const targetY = baseY - extraUp; // maximum lift point (more negative)
            const currentY = translateYValueRef.current || 0;
            if (showOverlay) {
                // Commit current overlay position to the list so visuals match exactly
                const currentY2 = translateYValueRef.current || 0;
                runOnJS(applyOverlayCompletionAdjustJS)(currentY2);
                // Native scroll the list to place the focused row just under the header (with slight clip)
                const clipMargin = Math.max(4, Math.floor(scaleSize(8)));
                const lay = itemLayoutsRef.current.get(focusedPostIndex.current);
                if (lay && typeof lay.y === 'number') {
                    const vHeader = headerHeightRef.current || 0;
                    const targetOff = Math.max(0, lay.y - (vHeader - clipMargin));
                    startScrollYSV.value = scrollYSV.value || 0;
                    finishingSV.value = 1;
                    finalizeScrollTargetRef.current = targetOff;
                    isFinishingScrollRef.current = true;
                    try { flatListRef.current?.scrollToOffset?.({ offset: targetOff, animated: true }); } catch {}
                }
                try { othersOpacitySV.value = withTiming(1, { duration: ANIMATION_DURATION, easing: ReEasing.out(ReEasing.cubic) }); } catch {}
                try { storiesOpacitySV.value = withTiming(1, { duration: ANIMATION_DURATION, easing: ReEasing.out(ReEasing.cubic) }); } catch {}
                // Keep overlay mounted until finalize to avoid any layout flicker/snap
                return; // finalize happens when onScroll reaches target
            } else {
                // No overlay: adjust list offset immediately to avoid jump
                try {
                    const off = scrollOffsetY.current || 0;
                    const newOff = Math.max(0, off - currentY);
                    flatListRef.current?.scrollToOffset?.({ offset: newOff, animated: false });
                    scrollOffsetY.current = newOff;
                    translateYSV.value = 0;
                    translateYValueRef.current = 0;
                } catch { }
                // Finish with the normal unfocus animation
                animateView(0, 1);
            }
            closingViaPanRef.current = false;
        } else {
            // Back button or programmatic unfocus: if overlay is active, drive to max-lift
            // point first so the motion matches the interactive pan, then finalize.
            if (showOverlay) {
                // Commit current overlay position, then perform a natural scroll to max
                const currentY = translateYValueRef.current || 0;
                runOnJS(applyOverlayCompletionAdjustJS)(currentY);
                const clipMargin = Math.max(4, Math.floor(scaleSize(8)));
                const desiredTop = (headerHeightRef.current || 0) - clipMargin;
                const curTop = (focusStartPageYRef.current - focusStartHeaderJSRef.current) + currentY;
                const delta = Math.max(0, curTop - desiredTop);
                const targetOffProg = Math.max(0, (scrollOffsetY.current || 0) + delta);
                startScrollYSV.value = scrollYSV.value || 0;
                finishingSV.value = 1;
                finalizeScrollTargetRef.current = targetOffProg;
                isFinishingScrollRef.current = true;
                try { flatListRef.current?.scrollToOffset?.({ offset: targetOffProg, animated: true }); } catch {}
                try { othersOpacitySV.value = withTiming(1, { duration: ANIMATION_DURATION, easing: ReEasing.out(ReEasing.cubic) }); } catch {}
                try { storiesOpacitySV.value = withTiming(1, { duration: ANIMATION_DURATION, easing: ReEasing.out(ReEasing.cubic) }); } catch {}
                return;
            } else {
                // No overlay: use previous animation
                animateView(0, 1);
            }
        }
        try { othersOpacitySV.value = withTiming(1, { duration: ANIMATION_DURATION, easing: ReEasing.out(ReEasing.cubic) }); } catch { }
        // Reset interactive refs so the next focus starts clean
        try { panProgressRef.current = 0; } catch { }
        try { didCollapseCommentsRef.current = false; } catch { }
    };

    // Allow posts to request an unfocus while a focus/unfocus animation is in-flight.
    // If locked, queue a single attempt right after the animation window.
    const requestUnfocus = useCallback(() => {
        try { if (!isSomePostFocused) return; } catch { }
        if (!isTransitioning.current) {
            handleBackPress();
            return;
        }
        if (pendingUnfocusTRef.current) { try { clearTimeout(pendingUnfocusTRef.current); } catch { } pendingUnfocusTRef.current = null; }
        pendingUnfocusTRef.current = setTimeout(() => {
            pendingUnfocusTRef.current = null;
            if (!isSomePostFocused) return;
            if (!isTransitioning.current) handleBackPress();
        }, 0);
    }, [isSomePostFocused]);

    useEffect(() => () => { if (pendingUnfocusTRef.current) { try { clearTimeout(pendingUnfocusTRef.current); } catch { } } }, []);

    // When a post is focused/unfocused, animate header fully hidden/visible to avoid interference
    useEffect(() => {
        focusHide.value = withTiming(
            isSomePostFocused ? headerH.value : 0,
            { duration: ANIMATION_DURATION, easing: ReEasing.out(ReEasing.cubic) }
        );
        isFocusSV.value = isSomePostFocused ? 1 : 0;
    }, [isSomePostFocused]);

    // Keep others' opacity in a safe state when focus toggles (non-interactive paths)
    useEffect(() => {
        if (!isSomePostFocused) {
            try { othersOpacitySV.value = 1; } catch { }
        }
    }, [isSomePostFocused]);

    // Drive back-header opacity to fade in/out in sync with focus/unfocus
    useEffect(() => {
        if (isSomePostFocused) {
            // If unfocusing, fade it out; otherwise fade in
            backHeaderOpacitySV.value = withTiming(unfocusing ? 0 : 1, { duration: ANIMATION_DURATION, easing: ReEasing.out(ReEasing.cubic) });
        } else {
            backHeaderOpacitySV.value = 0;
        }
    }, [isSomePostFocused, unfocusing]);

    // Drive overlay header fade to appear immediately at start of unfocus
    useEffect(() => {
        // Skip effect-driven fades while the user is actively panning or finishing a native scroll.
        if (isPanningRef.current || isFinishingScrollRef.current) return;
        if (isSomePostFocused) {
            // While focused: keep overlay hidden; during unfocus: fade it in
            overlayHeaderOpacitySV.value = withTiming(unfocusing ? 1 : 0, { duration: ANIMATION_DURATION, easing: ReEasing.out(ReEasing.cubic) });
        } else {
            overlayHeaderOpacitySV.value = 1;
        }
    }, [isSomePostFocused, unfocusing]);

    // Feed-level pan gesture using Reanimated/Gesture Handler for smooth unfocus drag
    // Avoid inline runOnJS closures (can capture HostObjects) by defining JS callbacks
    // Optional: lockstep pan (disabled by default as it can double-apply motion
    // when combined with layer translate). Enable only after careful testing.
    const LOCKSTEP_PAN = true;
    const panBaseScrollRef = useRef(0);
    const panBaseYRef = useRef(0);
    const panLastOffRef = useRef(0);
    const syncScrollDuringPan = (off) => {
        try {
            flatListRef.current?.scrollToOffset?.({ offset: Math.max(0, off), animated: false });
            scrollOffsetY.current = Math.max(0, off);
        } catch {}
    };

    const handleUnfocusPanBeginJS = useCallback(() => {
        try { didCollapseCommentsRef.current = false; } catch { }
        try { translateYValueRef.current = focusTranslateTargetRef.current || 0; } catch { }
        try { isPanningRef.current = true; } catch {}
        try { panBaseScrollRef.current = scrollOffsetY.current || 0; } catch {}
        try { panBaseYRef.current = translateYValueRef.current || 0; } catch {}
        try { panLastOffRef.current = panBaseScrollRef.current || 0; } catch {}
        try { panStartScrollSV.value = scrollYSV.value || 0; panActiveSV.value = 1; } catch {}
    }, []);

    const handleUnfocusPanUpdateJS = useCallback((progress) => {
        try { panProgressRef.current = progress; } catch { }
        if (!didCollapseCommentsRef.current && progress > 0.08) {
            try { setCommentsCollapseSignal(Date.now()); } catch { }
            didCollapseCommentsRef.current = true;
        }
        if (LOCKSTEP_PAN) {
            try {
                const baseY = panBaseYRef.current || 0; // negative focused anchor
                const EXTRA_UP_PX = Math.max(80, Math.min(height * 0.18, 160));
                const y = baseY - progress * EXTRA_UP_PX; // current overlay translate (negative)
                const delta = y - baseY; // negative
                const off = (panBaseScrollRef.current || 0) - delta; // subtract negative -> add pixels
                const last = panLastOffRef.current || 0;
                if (Math.abs(off - last) > 0.8) {
                    panLastOffRef.current = off;
                    syncScrollDuringPan(off);
                }
            } catch {}
        }
    }, []);

    const handleUnfocusPanEndCloseJS = useCallback((yAtEnd, progressAtEnd) => {
        try { closingViaPanRef.current = true; } catch { }
        try { translateYValueRef.current = yAtEnd; } catch { }
        // Capture precise final progress for accurate header delta during offset adjustment
        try { panProgressRef.current = (typeof progressAtEnd === 'number') ? Math.max(0, Math.min(1, progressAtEnd)) : (panProgressRef.current || 0); } catch { }
        try { isPanningRef.current = false; } catch {}
        try { panActiveSV.value = 0; } catch {}
        try { Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Heavy).catch(() => { }); } catch { }
        try { requestUnfocus(); } catch { }
    }, [requestUnfocus]);

    const handleUnfocusPanEndCancelJS = useCallback(() => {
        try { panProgressRef.current = 0; } catch { }
        if (didCollapseCommentsRef.current) {
            try { setCommentsReopenSignal(Date.now()); } catch { }
        }
        try { isPanningRef.current = false; } catch {}
        try { panActiveSV.value = 0; } catch {}
    }, []);

    // When finishing an overlay-based unfocus, convert the current transform into
    // a real FlatList scroll offset so visuals remain in place as the overlay unmounts.
    const applyOverlayCompletionAdjustJS = useCallback((finalY) => {
        try {
            const off = scrollOffsetY.current || 0;
            const y = typeof finalY === 'number' ? finalY : (translateYValueRef.current || 0); // negative
            const ft = focusTranslateTargetRef.current || 0; // negative
            // lift the list achieved at final frame (px). At max this equals EXTRA_UP_PX
            const lift = Math.max(0, ft - y);
            const overlapFix = scaleSize(33) + scaleSize(6);
            const newOff = Math.max(0, off - y - (lift + overlapFix));
            flatListRef.current?.scrollToOffset?.({ offset: newOff, animated: false });
            scrollOffsetY.current = newOff;
            // Do NOT reset translate values here; overlay follows native scroll via overlayTopStyle
        } catch { }
    }, []);
    const unfocusPanGesture = useMemo(() => {
        const FULL_GESTURE_PX = Math.max(140, Math.min(height * 0.25, 260));
        const EXTRA_UP_PX = Math.max(80, Math.min(height * 0.18, 160));

        return Gesture.Pan()
            .enabled(!!isSomePostFocused)
            .maxPointers(1)
            .minDistance(4)
            // Fail if horizontal movement gets large (keep horizontal swipes unaffected)
            .failOffsetX([-60, 60])
            .onBegin(() => {
                'worklet';
                // mirror JS refs for back-press handling
                lastPanProgressSV.value = -1;
                closedInEndSV.value = 0;
                // Ensure header starts fully hidden via focusHide (not "hidden") so reveal is smooth
                hidden.value = 0;
                if (headerH?.value != null) focusHide.value = headerH.value;
                // Begin with overlay header/chips invisible (they'll fade with progress)
                overlayHeaderOpacitySV.value = 0;
                storiesOpacitySV.value = 0;
                // Keep other rows hidden at pan start; they'll fade in with progress
                othersOpacitySV.value = 0;
                runOnJS(handleUnfocusPanBeginJS)();
            })
            .onUpdate((e) => {
                'worklet';
                if (!isSomePostFocused) return;
                const dy = e.translationY;
                // Only consider upward drag
                if (dy >= 0) {
                    // reset visuals to focused state
                    translateYSV.value = focusTranslateTargetSV.value || 0;
                    storiesOpacitySV.value = 0;
                    backHeaderOpacitySV.value = 1;
                    overlayHeaderOpacitySV.value = 0;
                    if (headerH?.value != null) focusHide.value = headerH.value;
                    // update unfocus progress on UI thread only
                    try { unfocusProgressSV.value = 0; } catch { }
                    try { othersOpacitySV.value = 0; } catch { }
                    return;
                }
                const progress = Math.max(0, Math.min(1, (-dy) / FULL_GESTURE_PX));
                // Lift the focused post slightly more as you drag up
                const baseY = focusTranslateTargetSV.value || 0; // negative value in focused state
                const y = baseY - progress * EXTRA_UP_PX;
                translateYSV.value = y;
                storiesOpacitySV.value = progress;
                backHeaderOpacitySV.value = 1 - progress;
                overlayHeaderOpacitySV.value = progress;
                if (headerH?.value != null) focusHide.value = headerH.value * (1 - progress);
                // update unfocus progress on UI thread only
                try { unfocusProgressSV.value = progress; } catch { }
                try { othersOpacitySV.value = progress; } catch { }

                // JS mirrors needed for layout adjustments and Posts' unfocus fade
                const last = lastPanProgressSV.value;
                if (Math.abs(progress - last) > 0.08) {
                    runOnJS(handleUnfocusPanUpdateJS)(progress);
                    lastPanProgressSV.value = progress;
                }
            })
            .onEnd((e) => {
                'worklet';
                lastPanProgressSV.value = -1;
                const dy = e.translationY;
                const vy = e.velocityY; // px/s, negative is upward
                const distanceOK = dy < -12;
                const velocityOK = vy < -400;
                // Also close if the focused card's top has crossed the header threshold.
                // Compute the card top relative to the screen based on current gesture progress.
                const progress = Math.max(0, Math.min(1, (-dy) / FULL_GESTURE_PX));
                const baseY = focusTranslateTargetSV.value || 0; // negative when focused
                const y = baseY - progress * EXTRA_UP_PX; // current translateY applied to posts layer
                const baseTop = (focusStartPageYSV.value - focusStartHeaderSV.value) || 0; // initial top of focused card
                const curTop = baseTop + y; // where the focused card's top sits on screen now
                const headerTopThreshold = Math.max(0, (headerH?.value || 0) - 8); // a small clip margin
                // Close when: any upward intent OR velocity/distance OR card has reached header zone
                const slightUp = dy < -2;
                const crossedTop = curTop <= headerTopThreshold;
                const shouldClose = !!isSomePostFocused && (crossedTop || slightUp || distanceOK || velocityOK);
                if (shouldClose) {
                    closedInEndSV.value = 1;
                    // Use the y/progress computed above for a seamless handoff
                    // Continue fading other posts on release to avoid a pop-in
                    try { unfocusProgressSV.value = withTiming(1, { duration: 200, easing: ReEasing.out(ReEasing.cubic) }); } catch { }
                    try { othersOpacitySV.value = withTiming(1, { duration: 200, easing: ReEasing.out(ReEasing.cubic) }); } catch { }
                    runOnJS(handleUnfocusPanEndCloseJS)(y, progress);
                } else {
                    // Revert interactive changes back to focused state
                    translateYSV.value = withTiming(focusTranslateTargetSV.value || 0, { duration: 180, easing: ReEasing.out(ReEasing.cubic) });
                    storiesOpacitySV.value = withTiming(0, { duration: 180, easing: ReEasing.out(ReEasing.cubic) });
                    backHeaderOpacitySV.value = withTiming(1, { duration: 180, easing: ReEasing.out(ReEasing.cubic) });
                    overlayHeaderOpacitySV.value = withTiming(0, { duration: 180, easing: ReEasing.out(ReEasing.cubic) });
                    if (headerH?.value != null) focusHide.value = withTiming(headerH.value, { duration: 180, easing: ReEasing.out(ReEasing.cubic) });
                    try { unfocusProgressSV.value = withTiming(0, { duration: 180, easing: ReEasing.out(ReEasing.cubic) }); } catch { }
                    try { othersOpacitySV.value = withTiming(0, { duration: 180, easing: ReEasing.out(ReEasing.cubic) }); } catch { }
                    runOnJS(handleUnfocusPanEndCancelJS)();
                }
            })
            .onFinalize(() => {
                'worklet';
                if (closedInEndSV.value === 1) return;
                // Ensure full revert if gesture cancelled/failed without onEnd close
                translateYSV.value = withTiming(focusTranslateTargetSV.value || 0, { duration: 180, easing: ReEasing.out(ReEasing.cubic) });
                storiesOpacitySV.value = withTiming(0, { duration: 180, easing: ReEasing.out(ReEasing.cubic) });
                backHeaderOpacitySV.value = withTiming(1, { duration: 180, easing: ReEasing.out(ReEasing.cubic) });
                overlayHeaderOpacitySV.value = withTiming(0, { duration: 180, easing: ReEasing.out(ReEasing.cubic) });
                if (headerH?.value != null) focusHide.value = withTiming(headerH.value, { duration: 180, easing: ReEasing.out(ReEasing.cubic) });
                try { unfocusProgressSV.value = withTiming(0, { duration: 180, easing: ReEasing.out(ReEasing.cubic) }); } catch { }
                runOnJS(handleUnfocusPanEndCancelJS)();
            });
    }, [isSomePostFocused, requestUnfocus, handleUnfocusPanBeginJS, handleUnfocusPanUpdateJS, handleUnfocusPanEndCloseJS, handleUnfocusPanEndCancelJS]);


    // Stop any ongoixng fling by jumping to the current offset with animation off
    const stopFlatListMomentum = () => {
        if (flatListRef.current) {
            flatListRef.current.scrollToOffset({
                offset: scrollOffsetY.current,
                animated: false, // ⟵ cancels momentum
            });
            flatListRef.current.setNativeProps({ scrollEnabled: false });
        }
    };

    // Robustly keep scrollEnabled in sync with focus state, in case any animation callback is skipped
    useEffect(() => {
        try { flatListRef.current?.setNativeProps({ scrollEnabled: !isSomePostFocused }); } catch { }
    }, [isSomePostFocused]);

    /* ---------- helper: run the trio animation ---------- */
    const animFinalizeTimeoutRef = useRef(null);
    const animFinalizedRef = useRef(false);

    const handleFocusAnimEndJS = useCallback((translateYValue) => {
        if (animFinalizedRef.current) return;
        animFinalizedRef.current = true;
        if (animFinalizeTimeoutRef.current) {
            try { clearTimeout(animFinalizeTimeoutRef.current); } catch { }
            animFinalizeTimeoutRef.current = null;
        }
        isTransitioning.current = false; /* 🔓 unlock */
        if (translateYValue === 0) {
            // Unfocus completed: now flip state and re-enable scroll
            try { setIsSomePostFocused(false); } catch { }
            try { focusedPostIndex.current = -1; setFocusedIndexState?.(-1); } catch { }
            try { setShareBottomSheetCloseFlag((f) => !f); } catch { }
            try { flatListRef.current?.setNativeProps({ scrollEnabled: true }); } catch { }
            try { setUnfocusing(false); } catch { }
            try { focusTranslateTargetRef.current = 0; } catch { }
            // no JS progress updates
            try { overlayIndexRef.current = -1; setShowOverlay(false); } catch { }
            try { lockPostsTopSV.value = 0; } catch {}
            try { storiesOpacitySV.value = 1; } catch {}
        } else {
            // Only remount at end when we compensated for a clipped-at-top start
            if (needsFocusEndRemountRef.current) {
                try { focusSeqRef.current += 1; setFocusSeq(focusSeqRef.current); } catch { }
            }
            needsFocusEndRemountRef.current = false;
        }
        try { console.log('[Feed]', 'focus.animationEnd', { translateYValue, focusedIndex: focusedPostIndex.current, focusSeq: focusSeqRef.current }); } catch { }
        // If a focus was queued during the transition, honor it now
        if (queuedFocusRef.current) {
            const q = queuedFocusRef.current; queuedFocusRef.current = null;
            try { handleFocusPost(q.index, q.pageY, true); } catch { }
        }
        try { isFinishingScrollRef.current = false; } catch {}
    }, [handleFocusPost]);

    const handleFocusAnimFinalizeJS = useCallback((translateYValue) => {
        handleFocusAnimEndJS(translateYValue);
    }, [handleFocusAnimEndJS]);

    const animateView = (translateYValue, opacityValue) => {
        // Animate both values on UI thread; use translateY's callback as the end signal
        // Add a JS fallback timer in case the UI-thread callback is skipped due to identical values
        animFinalizedRef.current = false;
        if (animFinalizeTimeoutRef.current) {
            try { clearTimeout(animFinalizeTimeoutRef.current); } catch { }
            animFinalizeTimeoutRef.current = null;
        }
        translateYSV.value = withTiming(-translateYValue, { duration: ANIMATION_DURATION, easing: ReEasing.out(ReEasing.cubic) }, (finished) => {
            'worklet';
            if (!finished) return;
            runOnJS(handleFocusAnimFinalizeJS)(translateYValue);
        });
        storiesOpacitySV.value = withTiming(opacityValue, { duration: ANIMATION_DURATION, easing: ReEasing.out(ReEasing.cubic) });
        // Fallback finalize in case withTiming callback doesn't fire (e.g., start==end)
        animFinalizeTimeoutRef.current = setTimeout(() => {
            handleFocusAnimEndJS(translateYValue);
        }, ANIMATION_DURATION + 50);
    };

    // Go to Messages screen (always navigate; pass extras if available)
    const toMessagesScreen = () => {
        try {
            if (global.userData && messages) {
                navigation.navigate("Messages", { userData: userDataRef.current || global.userData, messages });
            } else {
                navigation.navigate("Messages");
            }
        } catch (e) {
            try { navigation.navigate("Messages"); } catch { }
        }
    };
    // Bottom sheet toggles
    const openCommentsModal = () => setCommentsBottomSheetExpandFlag(!commentsBottomSheetExpandFlag);
    const openShareModal = () => setShareBottomSheetExpandFlag(!shareBottomSheetExpandFlag);
    const handleOpenNotifications = () => setNotificationsBottomSheetExpandFlag(!notificationsBottomSheetExpandFlag);

    // Profile navigation from posts
    function toViewProfilePosts(idx) {
        const user = { handle: posts[idx].handle, uid: posts[idx].uid, pfp: posts[idx].pfp, name: posts[idx].name };
        const rootNav = navigation?.getParent?.('ROOT');
        if (isThisUser(posts[idx].uid)) {
            if (rootNav?.navigate) rootNav.navigate('Profile', { transition: 'slide-from-right' });
            else navigation.navigate('Profile', { transition: 'slide-from-right' });
        } else {
            if (rootNav?.navigate) rootNav.navigate('ViewProfile', { user });
            else navigation.navigate('ViewProfile', { user });
        }
    }

    // Profile navigation from comments
    function toViewProfileComments(data) {
        const user = { handle: data.handle, uid: data.uid, pfp: data.pfp, name: data.name };
        const rootNav = navigation?.getParent?.('ROOT');
        if (isThisUser(data.uid)) {
            if (rootNav?.navigate) rootNav.navigate('Profile', { transition: 'slide-from-right' });
            else navigation.navigate('Profile', { transition: 'slide-from-right' });
        } else {
            if (rootNav?.navigate) rootNav.navigate('ViewProfile', { user });
            else navigation.navigate('ViewProfile', { user });
        }
    }

    // Scroll to a specific post by pid and flash-highlight it
    const scrollToPid = useCallback((pid) => {
        if (!pid || !Array.isArray(posts) || posts.length === 0) return false;
        const idx = posts.findIndex((p) => String(p?.pid || '') === String(pid));
        if (idx < 0) return false;
        highlightPidRef.current = String(pid);
        setHighlightSignal(Date.now());

        const lay = itemLayoutsRef.current.get(idx);
        const visibleH = Math.max(0, visibleHeaderHRef.current || 0);
        const viewportTop = scrollOffsetY.current;
        const viewportBottom = viewportTop + (height - visibleH);

        // If fully visible already: wait for idle and simulate tap
        if (lay && lay.y >= viewportTop && (lay.y + lay.h) <= viewportBottom) {
            startFocusWatcher(pid, idx);
            return true;
        }

        // Otherwise, place the row just below the header immediately (no animation)
        // then wait until the row is viewable+idle before simulating the tap.
        if (lay) {
            const targetOffset = Math.max(0, lay.y - 8);
            try {
                flatListRef.current?.scrollToOffset?.({ offset: targetOffset, animated: false });
                scrollOffsetY.current = targetOffset;
            } catch { }
        } else {
            try { flatListRef.current?.scrollToIndex?.({ index: idx, viewPosition: 0.02, animated: false }); } catch { }
        }

        startFocusWatcher(pid, idx);
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
    const scrollToTop = useCallback(() => {
        try {
            if (flatListRef.current?.scrollToOffset) {
                flatListRef.current.scrollToOffset({ offset: 0, animated: true });
            }
        } catch { }
    }, []);

    // Expose an imperative scroll-to-top for the Footer when already on Feed
    useEffect(() => {
        try { global.scrollFeedToTop = scrollToTop; } catch { }
        return () => {
            try { if (global.scrollFeedToTop === scrollToTop) global.scrollFeedToTop = null; } catch { }
        };
    }, [scrollToTop]);

    // Respond to param-based scrollToTop when navigated with intent
    useEffect(() => {
        if (route?.params?.scrollToTop) {
            const id = setTimeout(() => scrollToTop(), 30);
            try { navigation.setParams({ scrollToTop: false }); } catch { }
            return () => clearTimeout(id);
        }
    }, [route?.params?.scrollToTop]);

    // Respond to param-based focusPid when navigated from notifications
    useEffect(() => {
        if (route?.params?.focusPid) {
            const pid = String(route.params.focusPid);
            setPendingFocusPid(pid);
            const id = setTimeout(() => {
                const ok = scrollToPid(pid);
                if (ok) setPendingFocusPid(null);
            }, 0);
            try { navigation.setParams({ focusPid: undefined }); } catch { }
            return () => clearTimeout(id);
        }
    }, [route?.params?.focusPid]);

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
                }, 0);
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
    const CellRenderer = useMemo(() => {
        const Comp = ({ index, style, onLayout, children, ...rest }) => {
            const handleLayout = (e) => {
                const { y, height: h } = e.nativeEvent.layout;
                itemLayoutsRef.current.set(index, { y, h });
                onLayout && onLayout(e);
            };
            return (
                <View style={style} onLayout={handleLayout} {...rest}>
                    {children}
                </View>
            );
        };
        return Comp;
    }, []);

    // Dynamic spacer for the focused row while overlay is active, so adjacent
    // posts follow the focused post during the unfocus drag (no visible gap).
    const DynamicSpacer = ({ baseH }) => {
        const st = useAnimatedStyle(() => {
            const base = baseH || 0;
            // Lift contributed by overlay translate (pre-finish)
            const liftTranslate = (focusTranslateTargetSV.value || 0) - (translateYSV.value || 0);
            // Lift contributed by native list scroll during finish
            const liftScroll = Math.max(0, (scrollYSV.value || 0) - (startScrollYSV.value || 0));
            const lift = Math.max(0, liftTranslate + liftScroll);
            // Account for the natural overlap between rows
            const overlapFix = scaleSize(33) + scaleSize(6);
            const h = Math.max(0, base - Math.min(base, lift + overlapFix));
            return { height: h };
        });
        return <Reanimated.View style={[{ width: '100%' }, st]} />;
    };

    // Render a single post
    const renderPost = useCallback(
        ({ item, index }) => {
            const isFocusedPost = index === focusedIndexState;

            const commonProps = {
                data: item,
                index,
                openCommentsModal,
                openShareModal,
                handleFocusPost,
                onSwipeUnfocus: requestUnfocus,
                toViewProfile: toViewProfilePosts,
                openViewWorkoutModal,
                focusSeq,
                isUnfocusing: unfocusing,
            };

            if (!isSomePostFocused) {
            return (
                <Reanimated.View style={[styles.postWrapper]}>
                    <Post
                        {...commonProps}
                        isFocused={false}
                        isSomePostFocused={false}
                        isAdjacentToFocused={false}
                        highlightPid={highlightPidRef.current}
                        highlightSignal={highlightSignal}
                        programFocusPid={programFocusPidRef.current}
                        programFocusSignal={programFocusSignal}
                        shouldPlay={index === centeredIndex} // ⟵ only centered post can play (if video slide)
                        unfocusProgressSV={unfocusProgressSV}
                    />
                </Reanimated.View>
            );
        }

        if (Math.abs(focusedIndexState - index) <= 2) {
            const isAdj = Math.abs(focusedIndexState - index) === 1;
            const isAboveAdjacent = isAdj && index < focusedIndexState;
            if (showOverlay && isFocusedPost) {
                // Replace focused row with a dynamic spacer whose height shrinks with
                // unfocus progress so other rows follow the focused overlay smoothly.
                const lay = itemLayoutsRef.current.get(index);
                const ph = lay?.h || (scaleSize(width / CARD_AR) + scaleSize(33));
                return <DynamicSpacer baseH={ph} />;
            }
            return (
                <Reanimated.View style={[
                    styles.postWrapper,
                    !isFocusedPost && nonFocusedOpacityStyle,
                    isFocusedPost && [{ zIndex: 1 }],
                    // Ensure the immediate row below the focused overlay sits above it
                    showOverlay && isAdj && !isAboveAdjacent ? { zIndex: 29 } : null,
                ]}>
                    <Post
                        {...commonProps}
                        isFocused={isFocusedPost}
                        isSomePostFocused={true}
                        isAdjacentToFocused={isAdj}
                        isAboveAdjacent={isAboveAdjacent}
                        highlightPid={highlightPidRef.current}
                        highlightSignal={highlightSignal}
                        programFocusPid={programFocusPidRef.current}
                        programFocusSignal={programFocusSignal}
                        shouldPlay={false} // ⟵ playback is controlled by focus rules inside Post
                        unfocusProgressSV={unfocusProgressSV}
                    />
                </Reanimated.View>
            );
        }

        return (
            <Reanimated.View style={[styles.postWrapper, !isFocusedPost && nonFocusedOpacityStyle, isFocusedPost && [{ zIndex: 1 }]]}>
                <Post
                    {...commonProps}
                    isFocused={false}
                    isSomePostFocused={true}
                    isAdjacentToFocused={false}
                    highlightPid={highlightPidRef.current}
                    highlightSignal={highlightSignal}
                    programFocusPid={programFocusPidRef.current}
                    programFocusSignal={programFocusSignal}
                    shouldPlay={false}
                    unfocusProgressSV={unfocusProgressSV}
                />
            </Reanimated.View>
        );
        },
        [isSomePostFocused, handleFocusPost, openCommentsModal, openShareModal, centeredIndex, focusedIndexState, focusSeq, unfocusing]
    );

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

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
            <SafeAreaView style={styles.mainContainer}>
                <StatusBar style="light" />

                <GestureDetector gesture={unfocusPanGesture}>
                    <Reanimated.View
                        style={[{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            bottom: 0,
                            // While focused, keep list layer above the focused-overlay (28) but
                            // below the back header (30) to let the next row appear on top.
                            // zIndex: isSomePostFocused ? 29 : 0,
                        }, maskContainerStyle]}
                    >
                        <MaskedView
                            style={{ flex: 1 }}
                            maskElement={
                                <View style={{ flex: 1, backgroundColor: 'black' }}>
                                    <View
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            backgroundColor: 'black',
                                            borderRadius: scaleSize(35),
                                        }}
                                    />
                                </View>
                            }
                        >
                            <Reanimated.View style={postsTranslateStyle}>
                                <Reanimated.FlatList
                                    ref={flatListRef}
                                    style={{ paddingBottom: 1000, }}
                                    bounces={true}
                                    alwaysBounceVertical
                                    showsVerticalScrollIndicator={false}
                                    data={listData}
                                    keyExtractor={(item, i) => String(item?.pid ?? i)}
                                    renderItem={({ item, index }) => renderPost({ item, index })}
                                    onScroll={onScrollRe}
                                    scrollEventThrottle={16}
                                    stickyHeaderIndices={[]}
                                    viewabilityConfig={{ itemVisiblePercentThreshold: 20 }}
                                    onViewableItemsChanged={({ viewableItems }) => {
                                        const s = new Set();
                                        viewableItems.forEach((v) => {
                                            if (typeof v.index === "number" && v.index >= 0) s.add(v.index);
                                        });
                                        viewableSetRef.current = s;
                                    }}
                                    CellRendererComponent={CellRenderer}
                                    // Spacer no longer needed; container top tracks header
                                    // ListHeaderComponent={<Reanimated.View style={spacerStyle} />}
                                    initialNumToRender={3}
                                    windowSize={5}
                                    removeClippedSubviews={false}
                                    onScrollToIndexFailed={(info) => {
                                        try {
                                            const approx = Math.max(0, (info?.averageItemLength || (width / CARD_AR)) * (info?.index || 0));
                                            flatListRef.current?.scrollToOffset?.({ offset: approx, animated: false });
                                        } catch { }
                                        setTimeout(() => {
                                            try { flatListRef.current?.scrollToIndex?.({ index: info?.index || 0, viewPosition: 0.02, animated: false }); } catch { }
                                        }, 50);
                                    }}
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
                            </Reanimated.View>
                        </MaskedView>
                </Reanimated.View>
                </GestureDetector>
            </SafeAreaView>
            {/* Overlay header (FeedHeader + ActivityChips) that reveals/collapses; spacer keeps posts pushed */}
            <SafeAreaInsetsView edges={['top']} pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 40 }}>
                <Reanimated.View
                    pointerEvents={isSomePostFocused ? "none" : "auto"}
                    onLayout={(e) => {
                        const h = e.nativeEvent.layout.height || 0;
                        if (h && Math.abs(h - headerH.value) > 1) {
                            headerH.value = h;
                            hidden.value = 0; // start visible
                            try { visibleHeaderHRef.current = h; } catch { }
                            try { headerHeightRef.current = h; } catch { }
                        }
                        // no-op; refresh indicator is positioned by default directly under header
                    }}
                    style={[{
                        backgroundColor: theme.bg,
                        // Raise above focused overlay so it can fade/slide in during unfocus
                        zIndex: 35,
                    }, overlayHeaderStyle, overlayHeaderOpacityStyle]}
                >
                    <View onLayout={(e) => {
                        const h = e.nativeEvent.layout.height || 0;
                        if (h && Math.abs(h - compactHeaderHRef.current) > 1) compactHeaderHRef.current = h;
                    }}>
                        <FeedHeader
                            navigation={navigation}
                            toMessagesScreen={toMessagesScreen}
                            onOpenNotifications={handleOpenNotifications}
                            backButton={false}
                            onBackPress={handleBackPress}
                            scrollToTop={scrollToTop}
                            allUsersRef={allUsersRef}
                            workout={activeWorkout}
                            timerRef={headerTimerRef}
                            heightAdjust={-2}
                        />
                    </View>
                    <Reanimated.View
                        onLayout={(e) => {
                            const h = e.nativeEvent.layout.height || 0;
                            if (h && Math.abs(h - chipsH.value) > 1) chipsH.value = h;
                        }}
                        style={storiesOpacityStyle}
                    >
                        <ActivityChips navigation={navigation} />
                    </Reanimated.View>
                    {/* Rounded separator mask to keep a smooth transition into posts */}
                    {/* <ChipsRoundMask onLayout={(e) => {
                        const h = e.nativeEvent.layout.height || 0;
                        if (h && Math.abs(h - maskH.value) > 1) maskH.value = h;
                    }} /> */}
                </Reanimated.View>


                {isSomePostFocused && (
                    <SafeAreaInsetsView
                        edges={['top']}
                        pointerEvents="box-none"
                        onLayout={(e) => { backHeaderHRef.current = e.nativeEvent.layout.height || 0; }}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30, backgroundColor: theme.bg }}
                    >
                        <Reanimated.View style={backHeaderStyle}>
                            <FeedHeader
                                navigation={navigation}
                                toMessagesScreen={toMessagesScreen}
                                onOpenNotifications={handleOpenNotifications}
                                backButton={true}
                                onBackPress={handleBackPress}
                                scrollToTop={scrollToTop}
                                allUsersRef={allUsersRef}
                                workout={activeWorkout}
                                timerRef={headerTimerRef}
                                heightAdjust={-2}
                            />
                        </Reanimated.View>
                    </SafeAreaInsetsView>
                )}
            </SafeAreaInsetsView>
            {/* Focused Post overlay (absolute, moves in sync, avoids clipping). Kept under back header. */}
            {showOverlay && focusedIndexState >= 0 && (
                <GestureDetector gesture={unfocusPanGesture}>
                <Reanimated.View
                    pointerEvents="box-none"
                    style={[{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        zIndex: 28,
                    }, overlayTopStyle]}
                >
                    <View style={styles.postWrapper}>
                        <Post
                            data={posts[focusedIndexState]}
                            index={focusedIndexState}
                            openCommentsModal={openCommentsModal}
                            openShareModal={openShareModal}
                            handleFocusPost={handleFocusPost}
                            onSwipeUnfocus={requestUnfocus}
                            toViewProfile={toViewProfilePosts}
                            openViewWorkoutModal={openViewWorkoutModal}
                            focusSeq={focusSeq}
                            isUnfocusing={unfocusing}
                            isFocused={true}
                            isSomePostFocused={true}
                            isAdjacentToFocused={false}
                            highlightPid={highlightPidRef.current}
                            highlightSignal={highlightSignal}
                            programFocusPid={programFocusPidRef.current}
                            programFocusSignal={programFocusSignal}
                            shouldPlay={false}
                            unfocusProgressSV={unfocusProgressSV}
                        />
                    </View>
                </Reanimated.View>
                </GestureDetector>
            )}
            {/* Top safe-area mask to hide content above inset */}
            <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: theme.bg, zIndex: 25 }} />
            <NotificationsBottomSheet notificationsBottomSheetExpandFlag={notificationsBottomSheetExpandFlag} />
            <CommentsBottomSheet
                isVisible={isSomePostFocused && !unfocusing}
                postData={focusedPostIndex.current === -1 ? null : posts[focusedPostIndex.current]}
                commentsBottomSheetExpandFlag={commentsBottomSheetExpandFlag}
                toViewProfile={toViewProfileComments}
                collapseSignal={commentsCollapseSignal}
                reopenSignal={commentsReopenSignal}
            // interactiveProgress removed for performance; collapse is handled via collapseSignal
            />
            <ShareBottomSheet
                shareBottomSheetCloseFlag={shareBottomSheetCloseFlag}
                shareBottomSheetExpandFlag={shareBottomSheetExpandFlag}
            />
            <Footer currentScreenName="Feed" navigation={navigation} />
            {/* Workout viewer bottom sheet (pre-mounted, slides up) */}
            <FeedWorkoutViewerSheet
                expandToggle={feedWorkoutExpandToggle}
                workout={feedSelectedWorkout}
                friendUid={feedSelectedFriendUid}
                friendPfp={feedSelectedFriendPfp}
                onClose={closeViewWorkoutModal}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: theme.bg },
    // Add bottom padding so the cell's touchable region covers the visual card bottom.
    // This counteracts any internal negative margins and prevents "dead zones" for touch starts.
    postWrapper: { width: "100%", paddingBottom: scaleSize(33) },
});
