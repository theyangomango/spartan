/**
 * Feed Screen. Retrieves and displays stories and posts.
 * Handles Navigation to the Messages Screen.
 * Handles the NotificationsBottomSheet, CommentsBottomSheet, ShareBottomSheet, and Workout viewer sheet
 * * Does NOT handle backend calls from user interactions
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, SafeAreaView, StyleSheet, View, Easing as RNEasing, RefreshControl } from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from "expo-status-bar";
import { doc, onSnapshot } from "firebase/firestore";
import { useSafeAreaInsets, SafeAreaView as SafeAreaInsetsView } from "react-native-safe-area-context";
import Reanimated, { useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, useDerivedValue, runOnJS, withTiming, withSpring, withDelay, Easing as ReEasing } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import Post from "../components/1_Feed/Posts/Post";
import FeedHeader from "../components/1_Feed/FeedHeader";
import useHeaderSearchUsers from "../hooks/useHeaderSearchUsers";
import ActivityChips from "../components/1_Feed/Pulse/ActivityChips";
// import ChipsRoundMask from "../components/1_Feed/Pulse/ChipsRoundMask";
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

const { width, height } = Dimensions.get("window");
const TARGET_POSITION = getScrollTargetPosition(width, height),
    ANIMATION_DURATION = 200;

export default function Feed({ navigation, route }) {
    const insets = useSafeAreaInsets();
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

    // Highlight target when navigating from notifications
    const highlightPidRef = useRef(null);
    const [highlightSignal, setHighlightSignal] = useState(0);
    const [pendingFocusPid, setPendingFocusPid] = useState(null);
    // Programmatic focusing (simulate user press)
    const programFocusPidRef = useRef(null);
    const [programFocusSignal, setProgramFocusSignal] = useState(0);
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
    // Animated styles: overlay header translate + spacer height
    const overlayHeaderStyle = useAnimatedStyle(() => {
        const totalHidden = Math.min(headerH.value, hidden.value + focusHide.value);
        return { transform: [{ translateY: -totalHidden }] };
    });
    const spacerStyle = useAnimatedStyle(() => {
        const totalHidden = Math.min(headerH.value, hidden.value + focusHide.value);
        return { height: Math.max(0, headerH.value - totalHidden) };
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
    const handleFocusPost = (index, pageY, preferWaitForHeader = false) => {
        if (isTransitioning.current) return; /* 🔒 */
        isTransitioning.current = true;
        try { isTransitioningSV.value = 1; } catch {}
        try { panEnabledSV.value = 0; } catch {}
        stopFlatListMomentum();

        focusedPostIndex.current = index;
        translatingIndexRef.current = index;

        const startFocus = () => {
            const Vstart = visibleHeaderHRef.current || 0; // overlay header+chips visible height right before focus
            const Vfinal = backHeaderHRef.current || (insets?.top ? insets.top + 44 : TARGET_POSITION);
            // Needed translation Δ for the card: Vfinal - (pageY - Vstart) = - (pageY - Vstart - Vfinal)
            // animateView negates the input, so pass (pageY - Vstart - Vfinal)
            const delta = pageY - Vstart - Vfinal;
            // store target focused offset for interactive gesture math
            focusOffsetRef.current = -delta;
            try { focusBaseSV.value = -delta; } catch { }
            // Begin card translation first, then enter focus mode so header chips hide in sync
            animateView(delta, 0);
            // Enter focus mode and ensure other posts fade out immediately
            setIsSomePostFocused(true);
            try { interactiveProgressSV.value = withTiming(0, { duration: 140, easing: ReEasing.out(ReEasing.cubic) }); } catch { }
        };

        if (!preferWaitForHeader) {
            setTimeout(startFocus, 0);
        } else {
            // Ensure the compact header height is known; a ghost sizer generally sets this instantly.
            let tries = 0; const MAX = 24; // ~400ms
            const poll = () => {
                if (backHeaderHRef.current > 0 || tries++ >= MAX) {
                    setTimeout(startFocus, 0);
                    return;
                }
                requestAnimationFrame(poll);
            };
            requestAnimationFrame(poll);
        }
    };

    const handleBackPress = () => {
        if (isTransitioning.current) return; /* 🔒 */
        isTransitioning.current = true;
        try { isTransitioningSV.value = 1; } catch {}
        try { panEnabledSV.value = 0; } catch {}

        // Collapse comments immediately to avoid lag
        try { setCommentsCollapseSignal(Date.now()); } catch { }
        // Initiate share sheet close if open
        setShareBottomSheetCloseFlag((f) => !f);

        // Smoothly reveal header/chips while returning the card
        try {
            focusHide.value = withTiming(0, { duration: ANIMATION_DURATION, easing: ReEasing.linear });
            interactiveProgressSV.value = withTiming(1, { duration: ANIMATION_DURATION, easing: ReEasing.linear });
        } catch { }

        // Animate focused card back to its original position
        animateView(0, 1);

        // Re-enable list scroll immediately; visual remains pinned by translation until end
        flatListRef.current?.setNativeProps({ scrollEnabled: true });
    };

    // When a post is focused/unfocused, animate header fully hidden/visible to avoid interference
    useEffect(() => {
        focusHide.value = withTiming(
            isSomePostFocused ? headerH.value : 0,
            { duration: ANIMATION_DURATION, easing: ReEasing.linear }
        );
        isFocusSV.value = isSomePostFocused ? 1 : 0;
        // Keep non-focused posts fully visible when leaving focus
        if (!isSomePostFocused) {
            try { interactiveProgressSV.value = withTiming(1, { duration: ANIMATION_DURATION, easing: ReEasing.linear }); } catch { }
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
        try { isTransitioningSV.value = 0; } catch {}
        try { panEnabledSV.value = 1; } catch {}
        isUnfocusingRef.current = false;
        if (clearTranslating) {
            // Finishing unfocus: commit state after animation to avoid layout jump
            try { setIsSomePostFocused(false); } catch { }
            try { focusedPostIndex.current = -1; } catch { }
            translatingIndexRef.current = -1;
            try { setUnfocusGestureActive(false); } catch { }
        }
    }, []);

    const animateView = (translateYValue, opacityValue) => {
        try {
            const clearTranslating = translateYValue === 0;
            focusTranslateSV.value = withTiming(-translateYValue, { duration: ANIMATION_DURATION, easing: ReEasing.linear }, () => {
                runOnJS(onFocusTranslateEnd)(clearTranslating);
            });
            storiesOpacitySV.value = withTiming(opacityValue, { duration: ANIMATION_DURATION, easing: ReEasing.linear });
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
            setTimeout(() => setProgramFocusSignal(Date.now()), 30);
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
                programFocusPidRef.current = String(pid);
                setProgramFocusSignal(Date.now());
                return;
            }
            if (tries++ >= MAX) {
                // Fallback: force focus anyway
                programFocusPidRef.current = String(pid);
                setProgramFocusSignal(Date.now());
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

    // Render a single post (deduped logic)
    const renderPost = useCallback(
        ({ item, index }) => {
            const isFocusedPost = index === focusedPostIndex.current;
            const isTranslatingPost = index === translatingIndexRef.current;
            const wrapperStyle = [
                styles.postWrapper,
                (isFocusedPost || isTranslatingPost) && { zIndex: 1 },
            ];

            const isFocusedProp = isSomePostFocused ? isFocusedPost : false;
            const shouldPlay = !isSomePostFocused && index === centeredIndex;

            const contentCore = (
                <Reanimated.View style={wrapperStyle}>
                    <Post
                        data={item}
                        index={index}
                        openCommentsModal={openCommentsModal}
                        openShareModal={openShareModal}
                        handleFocusPost={handleFocusPost}
                        toViewProfile={toViewProfilePosts}
                        openViewWorkoutModal={openViewWorkoutModal}
                        isFocused={isFocusedProp}
                        isSomePostFocused={isSomePostFocused}
                        focusModeSV={isFocusSV}
                        interactiveUnfocusSV={interactiveProgressSV}
                        interactiveActive={isFocusedProp ? unfocusGestureActive : false}
                        highlightPid={highlightPidRef.current}
                        highlightSignal={highlightSignal}
                        programFocusPid={programFocusPidRef.current}
                        programFocusSignal={programFocusSignal}
                        shouldPlay={shouldPlay}
                    />
                </Reanimated.View>
            );

            // Keep transform applied for both focused and translating states; attach gesture only when focused
            if (isFocusedPost || isTranslatingPost) {
                const inner = (
                    <Reanimated.View style={[wrapperStyle, interPostStyle]}>
                        <Post
                            data={item}
                            index={index}
                            openCommentsModal={openCommentsModal}
                            openShareModal={openShareModal}
                            handleFocusPost={handleFocusPost}
                            toViewProfile={toViewProfilePosts}
                            openViewWorkoutModal={openViewWorkoutModal}
                            isFocused={isFocusedPost}
                            isSomePostFocused={isSomePostFocused}
                            focusModeSV={isFocusSV}
                            interactiveUnfocusSV={interactiveProgressSV}
                            interactiveActive={unfocusGestureActive}
                            highlightPid={highlightPidRef.current}
                            highlightSignal={highlightSignal}
                            programFocusPid={programFocusPidRef.current}
                            programFocusSignal={programFocusSignal}
                            shouldPlay={shouldPlay}
                        />
                    </Reanimated.View>
                );
                return inner;
            }
            return contentCore;
        },
        [isSomePostFocused, centeredIndex, openCommentsModal, openShareModal, handleFocusPost, toViewProfilePosts, openViewWorkoutModal, panUnfocus]
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
    const listKeyExtractor = useCallback((item, i) => String(item?.pid || item?.id || i), []);

    // ---------- Upward pan to unfocus (interactive) ----------
    // Use device height to set a sensible drag distance
    const FULL_GESTURE_PX = Math.max(84, Math.min(height * 0.16, 200));
    // Make progress feel snappier near the start
    const PROGRESS_SLOW_K = 1.2; // lower = more sensitive early progress
    const CLOSE_THRESHOLD = 0.07; // keep similar close feel
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
                focusTranslateSV.value = Math.abs(combinedNow) < 0.5 ? 0 : combinedNow;
                interTranslateSV.value = 0;
                // Enter a brief lockout so a second immediate pan doesn't race animations
                panEnabledSV.value = 0;
                if (shouldClose) {
                    // Smoothly finish header reveal to avoid jump
                    focusHide.value = withTiming(0, { duration: ANIMATION_DURATION, easing: ReEasing.linear });
                    interactiveProgressSV.value = withTiming(1, { duration: ANIMATION_DURATION, easing: ReEasing.linear });
                    storiesOpacitySV.value = withTiming(1, { duration: ANIMATION_DURATION, easing: ReEasing.linear });
                    // Collapse comments immediately for responsiveness
                    runOnJS(signalCommentsCollapse)();
                    // Delegate full unfocus transition to the existing handler
                    runOnJS(handleBackPress)();
                    // Keep wrapper for the duration to avoid a frame of unwrapped layout
                    runOnJS(scheduleClearUnfocusGestureActive)(ANIMATION_DURATION + 20);
                    // Re-enable pan after the unfocus animation if still relevant
                    panEnabledSV.value = withDelay(ANIMATION_DURATION + 40, withTiming(1, { duration: 0 }));
                } else {
                    // cancel: return to focused state
                    focusHide.value = withTiming(headerH.value, { duration: 190, easing: ReEasing.linear });
                    interactiveProgressSV.value = withTiming(0, { duration: 190, easing: ReEasing.linear });
                    interTranslateSV.value = withTiming(0, { duration: 190, easing: ReEasing.linear });
                    storiesOpacitySV.value = withTiming(0, { duration: 160, easing: ReEasing.linear });
                    // Animate base back to focused offset on UI thread
                    focusTranslateSV.value = withTiming(focusBaseSV.value, { duration: 190, easing: ReEasing.linear });
                    // Clear flags on JS
                    runOnJS(clearUnfocusFlagsJS)();
                    // Reopen comments to its open position if user cancels
                    runOnJS(signalCommentsReopen)();
                    // Brief lockout before accepting a new pan session
                    panEnabledSV.value = withDelay(210, withTiming(1, { duration: 0 }));
                }
            })
            .onFinalize(() => {
                // keep isUnfocusingRef until animateView callback clears it on success path
            });
    }, [isSomePostFocused, height]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
            <SafeAreaView style={styles.mainContainer}>
                <StatusBar style="light" />

                <GestureDetector gesture={panUnfocus}>
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
                                bounces={true}
                                alwaysBounceVertical
                                showsVerticalScrollIndicator={false}
                                data={listData}
                                keyExtractor={listKeyExtractor}
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
                {/* Ghost back-header sizer to pre-measure compact header height and avoid focus offset jitter */}
                <View
                    pointerEvents="none"
                    style={{ position: 'absolute', top: -10000, left: 0, right: 0, opacity: 0 }}
                    onLayout={(e) => { const h = e.nativeEvent.layout.height || 0; if (h && Math.abs(h - (backHeaderHRef.current || 0)) > 1) { backHeaderHRef.current = h; setBackHeaderH(h); } }}
                >
                    <SafeAreaInsetsView edges={['top']}>
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
                        />
                    </SafeAreaInsetsView>
                </View>

                <Reanimated.View
                    pointerEvents={isSomePostFocused ? "none" : "auto"}
                    onLayout={(e) => {
                        const h = e.nativeEvent.layout.height || 0;
                        if (h && Math.abs(h - headerH.value) > 1) {
                            headerH.value = h;
                            hidden.value = 0; // start visible
                            try { visibleHeaderHRef.current = h; } catch { }
                        }
                        // no-op; refresh indicator is positioned by default directly under header
                    }}
                    style={[{
                        backgroundColor: theme.bg,
                        zIndex: 20,
                    }, overlayHeaderStyle]}
                >
                    <Reanimated.View style={normalHeaderOpacityStyle}>
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
                    </Reanimated.View>
                    <Reanimated.View
                        onLayout={(e) => {
                            const h = e.nativeEvent.layout.height || 0;
                            if (h && Math.abs(h - chipsH.value) > 1) chipsH.value = h;
                        }}
                        style={chipsOpacityStyle}
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
                    <Reanimated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30, backgroundColor: theme.bg }, backHeaderOpacityStyle]}>
                        <SafeAreaInsetsView
                            edges={['top']}
                            onLayout={(e) => { const h = e.nativeEvent.layout.height || 0; backHeaderHRef.current = h; setBackHeaderH(h); }}
                        >
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
                            />
                        </SafeAreaInsetsView>
                    </Reanimated.View>
                )}
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
    postWrapper: { width: "100%" },
});
