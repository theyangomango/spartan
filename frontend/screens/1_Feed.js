/**
 * Feed Screen. Retrieves and displays stories and posts.
 * Handles Navigation to the Messages Screen.
 * Handles the NotificationsBottomSheet, CommentsBottomSheet, ShareBottomSheet, and ViewWorkoutBottomSheet
 * * Does NOT handle backend calls from user interactions
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, SafeAreaView, StyleSheet, View, Easing as RNEasing } from "react-native";
import { StatusBar } from "expo-status-bar";
import { doc, onSnapshot } from "firebase/firestore";
import { useSafeAreaInsets, SafeAreaView as SafeAreaInsetsView } from "react-native-safe-area-context";
import Reanimated, { useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, runOnJS, withTiming, Easing as ReEasing } from 'react-native-reanimated';

import Footer from "../components/Footer";
import Post from "../components/1_Feed/Posts/Post";
import FeedHeader from "../components/1_Feed/FeedHeader";
import useHeaderSearchUsers from "../hooks/useHeaderSearchUsers";
import ActivityChips from "../components/1_Feed/Pulse/ActivityChips";
import NotificationsBottomSheet from "../components/1_Feed/Notifications/NotificationsBottomSheet";
import CommentsBottomSheet from "../components/1_Feed/Comments/CommentsBottomSheet";
import ShareBottomSheet from "../components/1_Feed/SharePost/ShareBottomSheet";
import ViewWorkoutBottomSheet from "../components/1_Feed/ViewWorkout/ViewWorkoutBottomSheet";

import { initUserFeed, registerFeedSetters } from "../helper/initUserFeed";
import { db } from "../../firebase.config";
import getScrollTargetPosition from "../helper/getScrollTargetPosition";
import millisToHoursMinutesSeconds from "../helper/millisToHoursMinutesSeconds";
import isThisUser from "../helper/isThisUser";
import useFilteredFeed from "../helper/useFilteredFeed";

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
    const [viewWorkoutBottomSheetExpandFlag, setViewWorkoutBottomSheetExpandFlag] = useState(false);
    const [viewingWorkoutIndex, setViewingWorkoutIndex] = useState(null);

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

    /* ---------- animated values ---------- */
    const translateY = useRef(new Animated.Value(0)).current;
    const storiesOpacity = useRef(new Animated.Value(1)).current;
    // Reanimated header reveal values (UI thread)
    const headerH = useSharedValue(0);
    const chipsH = useSharedValue(0); // minimum visible height (keep chips in view)
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

        // Only manage center-based playback when NO post is focused
        if (!isSomePostFocused) {
            const viewportCenter = y + height / 2;

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
                const minVisible = Math.min(Math.max(chipsH.value, 0), H);
                const maxHidden = Math.max(0, H - minVisible);
                let next = hidden.value + dy; // dy>0 hide; dy<0 reveal
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
            try { clearInterval(headerTimerIdRef.current); } catch {}
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
                try { clearInterval(headerTimerIdRef.current); } catch {}
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
    const handleFocusPost = (index, pageY) => {
        if (isTransitioning.current) return; /* 🔒 */
        isTransitioning.current = true;
        stopFlatListMomentum();

        focusedPostIndex.current = index;
        setIsSomePostFocused(true);
        // Compute after back header measures (next frame)
        setTimeout(() => {
            const Vstart = visibleHeaderHRef.current || 0; // overlay header+chips visible height right before focus
            const Vfinal = backHeaderHRef.current || (insets?.top ? insets.top + 44 : TARGET_POSITION);
            // Needed translation Δ for the card: Vfinal - (pageY - Vstart) = - (pageY - Vstart - Vfinal)
            // animateView negates the input, so pass (pageY - Vstart - Vfinal)
            animateView(pageY - Vstart - Vfinal, 0);
        }, 0);
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

    // View workout details
    function openViewWorkoutModal(workoutIndex) {
        setViewingWorkoutIndex(workoutIndex);
        setViewWorkoutBottomSheetExpandFlag(!viewWorkoutBottomSheetExpandFlag);
    }

    // Implement scrollToTop function
    const scrollToTop = () => {
        if (flatListRef.current) {
            flatListRef.current.scrollToOffset({ offset: 0, animated: true });
        }
    };

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
                <Reanimated.FlatList
                    ref={flatListRef}
                    bounces={false}
                    showsVerticalScrollIndicator={false}
                    data={listData}
                    keyExtractor={(item, i) => String(i)}
                    renderItem={({ item, index }) => {
                        return renderPost({ item, index });
                    }}
                    onScroll={onScrollRe}
                    scrollEventThrottle={16}
                    // No sticky items; overlay + spacer manage layout
                    stickyHeaderIndices={[]}
                    viewabilityConfig={{ itemVisiblePercentThreshold: 20 }}
                    onViewableItemsChanged={({ viewableItems }) => {
                        const s = new Set();
                        viewableItems.forEach((v) => {
                            // Track list indices; posts start at index 0
                            if (typeof v.index === "number" && v.index >= 0) s.add(v.index);
                        });
                        viewableSetRef.current = s;
                    }}
                    CellRendererComponent={CellRenderer}
                    ListHeaderComponent={<Reanimated.View style={spacerStyle} />}
                    initialNumToRender={3}
                    windowSize={5}
                />
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
                            try { visibleHeaderHRef.current = h; } catch {}
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
            <ViewWorkoutBottomSheet
                workout={viewingWorkoutIndex !== null ? posts[viewingWorkoutIndex].workout : null}
                viewWorkoutBottomSheetExpandFlag={viewWorkoutBottomSheetExpandFlag}
            />
            <Footer key={footerKey} navigation={navigation} currentScreenName="Feed" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: "#f9fbffff" },
    postWrapper: { width: "100%" },
});
