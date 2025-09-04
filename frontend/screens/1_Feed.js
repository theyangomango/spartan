/**
 * Feed Screen. Retrieves and displays stories and posts.
 * Handles Navigation to the Messages Screen.
 * Handles the NotificationsBottomSheet, CommentsBottomSheet, ShareBottomSheet, and Workout viewer sheet
 * * Does NOT handle backend calls from user interactions
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, SafeAreaView, StyleSheet, View, Easing as RNEasing, Text } from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from "expo-status-bar";
import { doc, onSnapshot } from "firebase/firestore";
import { useSafeAreaInsets, SafeAreaView as SafeAreaInsetsView } from "react-native-safe-area-context";
import Reanimated, { useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, runOnJS, withTiming, Easing as ReEasing } from 'react-native-reanimated';

import Footer from "../components/Footer";
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
import { db } from "../../firebase.config";
import getScrollTargetPosition from "../helper/getScrollTargetPosition";
import millisToHoursMinutesSeconds from "../helper/millisToHoursMinutesSeconds";
import isThisUser from "../helper/isThisUser";
import useFilteredFeed from "../helper/useFilteredFeed";
import MaskedView from "@react-native-masked-view/masked-view";

const { width, height } = Dimensions.get("window");
const TARGET_POSITION = getScrollTargetPosition(width, height),
    ANIMATION_DURATION = 300;

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
    // Pre-mounted bottom sheet viewer for workouts
    const [feedWorkoutExpandToggle, setFeedWorkoutExpandToggle] = useState(false);
    const [feedSelectedWorkout, setFeedSelectedWorkout] = useState(null);
    const [feedSelectedFriendUid, setFeedSelectedFriendUid] = useState("");
    const [feedSelectedFriendPfp, setFeedSelectedFriendPfp] = useState(null);

    /* ---------- refs ---------- */
    const scrollOffsetY = useRef(0);
    const userDataRef = useRef(null);
    const focusedPostIndex = useRef(-1);
    const flatListRef = useRef(null);
    const isTransitioning = useRef(false); /* 🔒 */

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

    // Wait until target index is viewable and scrolling has settled, then focus
    const startFocusWatcher = useCallback((pid, idx) => {
        desiredFocusIndexRef.current = idx;
        if (focusWatchIdRef.current) {
            try { cancelAnimationFrame(focusWatchIdRef.current); } catch {}
            focusWatchIdRef.current = null;
        }
        let tries = 0; const MAX = 60; // ~1s at 60fps
        const tick = () => {
            const i = desiredFocusIndexRef.current;
            if (i < 0) return; // canceled
            const now = Date.now();
            const lay = itemLayoutsRef.current.get(i);
            const isViewable = viewableSetRef.current.has(i);
            const idle = now - (lastScrollTsRef.current || 0) > 40;
            if (lay && isViewable && idle) {
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
    const translateY = useRef(new Animated.Value(0)).current;
    const storiesOpacity = useRef(new Animated.Value(1)).current;
    // Reanimated header reveal values (UI thread)
    const headerH = useSharedValue(0);
    const chipsH = useSharedValue(0); // minimum visible height (keep chips in view)
    const maskH = useSharedValue(0);  // height of rounded mask under chips
    const hidden = useSharedValue(0); // 0..(H - chipsH)
    const prevY = useSharedValue(0);
    const focusHide = useSharedValue(0); // when focusing a post, fully hide header
    const isFocusSV = useSharedValue(0); // freeze JS mirrors during focus
    // Animated styles: overlay header translate + spacer height
    const overlayHeaderStyle = useAnimatedStyle(() => {
        const totalHidden = Math.min(headerH.value, hidden.value + focusHide.value);
        return { transform: [{ translateY: -totalHidden }] };
    });
    const spacerStyle = useAnimatedStyle(() => {
        const totalHidden = Math.min(headerH.value, hidden.value + focusHide.value);
        return { height: Math.max(0, headerH.value - totalHidden) };
    });
    // Animated container for MaskedView to track visible header height smoothly
    const maskContainerStyle = useAnimatedStyle(() => {
        const totalHidden = Math.min(headerH.value, hidden.value + focusHide.value);
        const visible = Math.max(0, headerH.value - totalHidden);
        return { top: visible };
    });

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

    // Reanimated scroll handler: UI-thread header control + forward to JS logic
    // Ratio to slow header/chips/mask displacement relative to user scroll
    const HEADER_SCROLL_RATIO = 0.25; // e.g., 10px scroll -> 5px displacement
    const onScrollRe = useAnimatedScrollHandler({
        onBeginDrag: (e) => {
            prevY.value = e.contentOffset.y;
        },
        onScroll: (e) => {
            const y = e.contentOffset.y;
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

    // Load user data from Firestore once
    useEffect(() => {
        if (!UID) return;
        const unsub = onSnapshot(doc(db, "users", UID), (snap) => {
            userDataRef.current = snap.data();
            global.userData = userDataRef.current; // init of userData has global variable
            // keep header in sync with current workout
            setActiveWorkout(userDataRef.current?.currentWorkout || null);
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
        stopFlatListMomentum();

        focusedPostIndex.current = index;
        setIsSomePostFocused(true);
        const run = () => {
            const Vstart = visibleHeaderHRef.current || 0; // overlay header+chips visible height right before focus
            const Vfinal = backHeaderHRef.current || (insets?.top ? insets.top + 44 : TARGET_POSITION);
            // Needed translation Δ for the card: Vfinal - (pageY - Vstart) = - (pageY - Vstart - Vfinal)
            // animateView negates the input, so pass (pageY - Vstart - Vfinal)
            animateView(pageY - Vstart - Vfinal, 0);
        };
        if (!preferWaitForHeader) {
            setTimeout(run, 0);
        } else {
            // For programmatic focus: ensure the compact header has measured to avoid offset
            let tries = 0; const MAX = 24; // ~400ms
            const poll = () => {
                if (backHeaderHRef.current > 0 || tries++ >= MAX) {
                    setTimeout(run, 0);
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

        setIsSomePostFocused(false);
        setShareBottomSheetCloseFlag((f) => !f);
        animateView(0, 1);

        flatListRef.current?.setNativeProps({ scrollEnabled: true });
    };

    // When a post is focused/unfocused, animate header fully hidden/visible to avoid interference
    useEffect(() => {
        focusHide.value = withTiming(
            isSomePostFocused ? headerH.value : 0,
            { duration: ANIMATION_DURATION, easing: ReEasing.linear }
        );
        isFocusSV.value = isSomePostFocused ? 1 : 0;
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
    const animateView = (translateYValue, opacityValue) => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -translateYValue,
                duration: ANIMATION_DURATION,
                easing: RNEasing.linear,
                useNativeDriver: true,
            }),
            Animated.timing(storiesOpacity, {
                toValue: opacityValue,
                duration: ANIMATION_DURATION,
                easing: RNEasing.linear,
                useNativeDriver: true,
            }),
        ]).start(() => {
            isTransitioning.current = false; /* 🔓 unlock */
            if (translateYValue === 0) focusedPostIndex.current = -1;
        });
    };

    // Go to Messages screen
    const toMessagesScreen = () => {
        if (global.userData && messages) {
            navigation.navigate("Messages", { userData: userDataRef.current, messages });
        }
    };

    // Bottom sheet toggles
    const openCommentsModal = () => setCommentsBottomSheetExpandFlag(!commentsBottomSheetExpandFlag);
    const openShareModal = () => setShareBottomSheetExpandFlag(!shareBottomSheetExpandFlag);
    const handleOpenNotifications = () => setNotificationsBottomSheetExpandFlag(!notificationsBottomSheetExpandFlag);

    // Profile navigation from posts
    function toViewProfilePosts(idx) {
        const user = { handle: posts[idx].handle, uid: posts[idx].uid, pfp: posts[idx].pfp, name: posts[idx].name };
        isThisUser(posts[idx].uid) ? navigation.navigate("Profile") : navigation.navigate("ViewProfile", { user });
    }

    // Profile navigation from comments
    function toViewProfileComments(data) {
        const user = { handle: data.handle, uid: data.uid, pfp: data.pfp, name: data.name };
        isThisUser(data.uid) ? navigation.navigate("Profile") : navigation.navigate("ViewProfile", { user });
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

        // If fully visible already: just trigger a programmatic tap quickly
        if (lay && lay.y >= viewportTop && (lay.y + lay.h) <= viewportBottom) {
            programFocusPidRef.current = String(pid);
            setTimeout(() => setProgramFocusSignal(Date.now()), 50);
            return true;
        }

        // Otherwise, perform a minimal instant reveal (no animation) for stability
        if (lay) {
            const targetOffset = Math.max(0, lay.y - 8);
            try {
                flatListRef.current?.scrollToOffset?.({ offset: targetOffset, animated: false });
                scrollOffsetY.current = targetOffset;
            } catch {}
        } else {
            try { flatListRef.current?.scrollToIndex?.({ index: idx, viewPosition: 0, animated: false }); } catch {}
        }

        // Fire programmatic tap after the jump
        programFocusPidRef.current = String(pid);
        setTimeout(() => setProgramFocusSignal(Date.now()), 50);
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

    // Respond to param-based scrollToTop when navigated with intent
    useEffect(() => {
        if (route?.params?.scrollToTop) {
            const id = setTimeout(() => scrollToTop(), 30);
            try { navigation.setParams({ scrollToTop: false }); } catch {}
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
            }, 50);
            try { navigation.setParams({ focusPid: undefined }); } catch {}
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
                try { navigation.setParams({ scrollToTop: false }); } catch {}
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
                try { navigation.setParams({ focusPid: undefined }); } catch {}
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

    // Render a single post
    const renderPost = useCallback(
        ({ item, index }) => {
            const isFocusedPost = index === focusedPostIndex.current;

            const commonProps = {
                data: item,
                index,
                openCommentsModal,
                openShareModal,
                handleFocusPost,
                toViewProfile: toViewProfilePosts,
                openViewWorkoutModal,
            };

            if (!isSomePostFocused) {
                return (
                    <Animated.View style={[styles.postWrapper, isFocusedPost && { transform: [{ translateY }], zIndex: 1 }]}>
                    <Post
                        {...commonProps}
                        isFocused={false}
                        isSomePostFocused={false}
                        highlightPid={highlightPidRef.current}
                        highlightSignal={highlightSignal}
                        programFocusPid={programFocusPidRef.current}
                        programFocusSignal={programFocusSignal}
                        shouldPlay={index === centeredIndex} // ⟵ only centered post can play (if video slide)
                    />
                    </Animated.View>
                );
            }

            if (Math.abs(focusedPostIndex.current - index) <= 2) {
                return (
                    <Animated.View style={[styles.postWrapper, isFocusedPost && { transform: [{ translateY }], zIndex: 1 }]}>
                        <Post
                            {...commonProps}
                            isFocused={isFocusedPost}
                            isSomePostFocused={true}
                            highlightPid={highlightPidRef.current}
                            highlightSignal={highlightSignal}
                            programFocusPid={programFocusPidRef.current}
                            programFocusSignal={programFocusSignal}
                            shouldPlay={false} // ⟵ playback is controlled by focus rules inside Post
                        />
                    </Animated.View>
                );
            }

            return (
                <Animated.View style={[styles.postWrapper, isFocusedPost && { transform: [{ translateY }], zIndex: 1 }]}>
                    <Post
                        {...commonProps}
                        isFocused={false}
                        isSomePostFocused={false}
                        highlightPid={highlightPidRef.current}
                        highlightSignal={highlightSignal}
                        programFocusPid={programFocusPidRef.current}
                        programFocusSignal={programFocusSignal}
                        shouldPlay={false}
                    />
                </Animated.View>
            );
        },
        [isSomePostFocused, handleFocusPost, openCommentsModal, openShareModal, centeredIndex]
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
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F7FAFF" }}>
            <SafeAreaView style={styles.mainContainer}>
                <StatusBar style="dark" />

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
                                        borderRadius: 24,
                                    }}
                                />
                            </View>
                        }
                    >
                        <Reanimated.FlatList
                            ref={flatListRef}
                            bounces={false}
                            showsVerticalScrollIndicator={false}
                            data={listData}
                            keyExtractor={(item, i) => String(i)}
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
                        />
                    </MaskedView>
                </Reanimated.View>
            </SafeAreaView>

            {/* Overlay header (FeedHeader + ActivityChips) that reveals/collapses; spacer keeps posts pushed */}
            <SafeAreaInsetsView edges={['top']} pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
                <Reanimated.View
                    pointerEvents={isSomePostFocused ? "none" : "auto"}
                    onLayout={(e) => {
                        const h = e.nativeEvent.layout.height || 0;
                        if (h && Math.abs(h - headerH.value) > 1) {
                            headerH.value = h;
                            hidden.value = 0; // start visible
                            try { visibleHeaderHRef.current = h; } catch { }
                        }
                    }}
                    style={[{
                        backgroundColor: '#F7FAFF',
                        zIndex: 20,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: 'rgba(0,0,0,0.05)'
                    }, overlayHeaderStyle]}
                >
                    <FeedHeader
                        navigation={navigation}
                        toMessagesScreen={toMessagesScreen}
                        onOpenNotifications={handleOpenNotifications}
                        backButton={isSomePostFocused}
                        onBackPress={handleBackPress}
                        scrollToTop={scrollToTop}
                        allUsersRef={allUsersRef}
                        workout={activeWorkout}
                        timerRef={headerTimerRef}
                    />
                    <Animated.View
                        onLayout={(e) => {
                            const h = e.nativeEvent.layout.height || 0;
                            if (h && Math.abs(h - chipsH.value) > 1) chipsH.value = h;
                        }}
                        style={{ opacity: storiesOpacity }}
                    >
                        <ActivityChips navigation={navigation} />
                    </Animated.View>
                    {/* Rounded separator mask to keep a smooth transition into posts */}
                    {/* <ChipsRoundMask onLayout={(e) => {
                        const h = e.nativeEvent.layout.height || 0;
                        if (h && Math.abs(h - maskH.value) > 1) maskH.value = h;
                    }} /> */}
                </Reanimated.View>


                {isSomePostFocused && (
                    <SafeAreaInsetsView
                        edges={['top']}
                        onLayout={(e) => { backHeaderHRef.current = e.nativeEvent.layout.height || 0; }}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30, backgroundColor: '#F7FAFF' }}
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
                )}
            </SafeAreaInsetsView>

            {/* Top safe-area mask to hide content above inset */}
            <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: '#F7FAFF', zIndex: 25 }} />



            <NotificationsBottomSheet notificationsBottomSheetExpandFlag={notificationsBottomSheetExpandFlag} />
            <CommentsBottomSheet
                isVisible={isSomePostFocused}
                postData={focusedPostIndex.current === -1 ? null : posts[focusedPostIndex.current]}
                commentsBottomSheetExpandFlag={commentsBottomSheetExpandFlag}
                toViewProfile={toViewProfileComments}
            />
            <ShareBottomSheet
                shareBottomSheetCloseFlag={shareBottomSheetCloseFlag}
                shareBottomSheetExpandFlag={shareBottomSheetExpandFlag}
            />
            <Footer key={footerKey} navigation={navigation} currentScreenName="Feed" />
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
    mainContainer: { flex: 1, backgroundColor: "#f9fbffff" },
    postWrapper: { width: "100%" },
});
