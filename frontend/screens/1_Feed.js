/**
 * Feed Screen. Retrieves and displays stories and posts.
 * Handles Navigation to the Messages Screen.
 * Handles the NotificationsBottomSheet, CommentsBottomSheet, ShareBottomSheet, and ViewWorkoutBottomSheet
 * * Does NOT handle backend calls from user interactions
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, SafeAreaView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import MaskedView from "@react-native-masked-view/masked-view";
import { doc, onSnapshot, collection, where, query, getDocs, orderBy, limit } from "firebase/firestore";

import Footer from "../components/Footer";
import Post from "../components/1_Feed/Posts/Post";
import FeedHeader from "../components/1_Feed/FeedHeader";
import ActivityChips from "../components/1_Feed/Pulse/ActivityChips";
import NotificationsBottomSheet from "../components/1_Feed/Notifications/NotificationsBottomSheet";
import CommentsBottomSheet from "../components/1_Feed/Comments/CommentsBottomSheet";
import ShareBottomSheet from "../components/1_Feed/SharePost/ShareBottomSheet";
import ViewWorkoutBottomSheet from "../components/1_Feed/ViewWorkout/ViewWorkoutBottomSheet";

import { initUserFeed, registerFeedSetters } from "../helper/initUserFeed";
import { db } from "../../firebase.config";
import getScrollTargetPosition from "../helper/getScrollTargetPosition";
import isThisUser from "../helper/isThisUser";
import useFilteredFeed from "../helper/useFilteredFeed";

const { width, height } = Dimensions.get("window");
const TARGET_POSITION = getScrollTargetPosition(width, height),
    SCROLL_THRESHOLD = 30,
    ANIMATION_DURATION = 300;

export default function Feed({ navigation, route }) {
    // Use UID from global or route params
    const UID = "userData" in global ? global.userData.uid : route?.params?.uid;

    // State
    const posts = useFilteredFeed(global.userData ? global.userData?.following : []);
    const [messages, setMessages] = useState(null);
    const [isSomePostFocused, setIsSomePostFocused] = useState(false);
    const [isScrolledPastTopClip, setIsScrolledPastTopClip] = useState(false);
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

    // ✅ Local user cache for instant search in header
    const allUsersRef = useRef([]); // SearchUsersBar reads .current

    // Center detection
    const centeredIndexRef = useRef(-1);
    const [centeredIndex, setCenteredIndex] = useState(-1);
    const itemLayoutsRef = useRef(new Map()); // index -> { y, h }
    const viewableSetRef = useRef(new Set());

    /* ---------- animated values ---------- */
    const translateY = useRef(new Animated.Value(0)).current;
    const footerOpacity = useRef(new Animated.Value(1)).current;
    const storiesOpacity = useRef(new Animated.Value(1)).current;

    const handleScroll = (e) => {
        const y = e.nativeEvent.contentOffset.y;
        scrollOffsetY.current = y;
        setIsScrolledPastTopClip(y > SCROLL_THRESHOLD);

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

            if (best !== centeredIndexRef.current) {
                centeredIndexRef.current = best;
                setCenteredIndex(best); // ⟵ triggers Post props update => pause/play swap
            }
        } else if (centeredIndexRef.current !== -1) {
            centeredIndexRef.current = -1;
            setCenteredIndex(-1);
        }
    };

    // Load user data from Firestore once
    useEffect(() => {
        if (!UID) return;
        const unsub = onSnapshot(doc(db, "users", UID), (snap) => {
            userDataRef.current = snap.data();
            global.userData = userDataRef.current; // init of userData has global variable
        });

        return () => unsub();
    }, [UID]);

    useEffect(() => {
        registerFeedSetters({
            setMessages,
            setFooterKey,
        });

        if (UID) initUserFeed(UID);
    }, [UID]);

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
        animateView(pageY - TARGET_POSITION, 0);
    };

    const handleBackPress = () => {
        if (isTransitioning.current) return; /* 🔒 */
        isTransitioning.current = true;

        setIsSomePostFocused(false);
        setShareBottomSheetCloseFlag((f) => !f);
        animateView(0, 1);

        flatListRef.current?.setNativeProps({ scrollEnabled: true });
    };

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
                useNativeDriver: true,
            }),
            Animated.timing(footerOpacity, {
                toValue: opacityValue,
                duration: ANIMATION_DURATION,
                useNativeDriver: true,
            }),
            Animated.timing(storiesOpacity, {
                toValue: opacityValue,
                duration: ANIMATION_DURATION,
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
    const mergeUsersIntoRef = (arr) => {
        if (!Array.isArray(arr) || arr.length === 0) return;
        const map = new Map(allUsersRef.current.map((u) => [u.uid, u]));
        for (const u of arr) {
            if (!u?.uid) continue;
            const cur = map.get(u.uid) || {};
            map.set(u.uid, {
                uid: u.uid,
                handle: u.handle ?? cur.handle ?? "",
                name: u.name ?? cur.name ?? "",
                pfp: u.pfp ?? cur.pfp ?? "",
            });
        }
        allUsersRef.current = Array.from(map.values());
    };

    useEffect(() => {
        if (!posts || posts.length === 0) return;
        const seeded = posts
            .map((p) => ({ uid: p?.uid, handle: p?.handle, name: p?.name, pfp: p?.pfp }))
            .filter((u) => !!u.uid);
        mergeUsersIntoRef(seeded);
    }, [posts]);

    useEffect(() => {
        const run = async () => {
            const following = Array.isArray(global.userData?.following) ? global.userData.following : [];
            if (!following || following.length === 0) return;

            const existing = new Set(allUsersRef.current.map((u) => u.uid));
            const missing = following.filter((uid) => uid && !existing.has(uid));
            if (missing.length === 0) return;

            const usersCol = collection(db, "users");
            const chunks = [];
            for (let i = 0; i < missing.length; i += 10) chunks.push(missing.slice(i, i + 10));

            const fetched = [];
            await Promise.all(
                chunks.map(async (ids) => {
                    const q = query(usersCol, where("__name__", "in", ids));
                    const snap = await getDocs(q);
                    snap.forEach((d) => {
                        const data = d.data();
                        fetched.push({
                            uid: d.id,
                            handle: data?.handle ?? "",
                            name: data?.name ?? "",
                            pfp: data?.pfp ?? "",
                        });
                    });
                })
            );

            mergeUsersIntoRef(fetched);
        };
        run().catch(() => { });
    }, [global.userData?.following, UID]);

    useEffect(() => {
        if ((allUsersRef.current?.length || 0) > 25) return;
        const prefetch = async () => {
            const usersCol = collection(db, "users");
            const q = query(usersCol, orderBy("handle_lower"), limit(100));
            const snap = await getDocs(q);
            const arr = [];
            snap.forEach((d) => {
                const data = d.data();
                arr.push({
                    uid: d.id,
                    handle: data?.handle ?? "",
                    name: data?.name ?? "",
                    pfp: data?.pfp ?? "",
                });
            });
            mergeUsersIntoRef(arr);
        };
        prefetch().catch(() => { });
    }, []);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F7FAFF" }}>
            <FeedHeader
                navigation={navigation}
                toMessagesScreen={toMessagesScreen}
                onOpenNotifications={handleOpenNotifications}
                backButton={isSomePostFocused}
                onBackPress={handleBackPress}
                scrollToTop={scrollToTop}
                allUsersRef={allUsersRef}
            />

            <MaskedView
                pointerEvents="box-none"
                style={{ flex: 1, flexDirection: "row", height: "100%" }}
                maskElement={<View style={styles.maskContainer(isScrolledPastTopClip)} />}
            >
                <SafeAreaView style={styles.mainContainer}>
                    <StatusBar style="dark" />
                    <Animated.FlatList
                        ref={flatListRef}
                        bounces={false}
                        showsVerticalScrollIndicator={false}
                        data={posts}
                        renderItem={renderPost}
                        keyExtractor={(_, i) => i.toString()}
                        onScroll={handleScroll}
                        scrollEventThrottle={10}
                        viewabilityConfig={{ itemVisiblePercentThreshold: 20 }}
                        onViewableItemsChanged={({ viewableItems }) => {
                            const s = new Set();
                            viewableItems.forEach((v) => {
                                if (typeof v.index === "number") s.add(v.index);
                            });
                            viewableSetRef.current = s;
                        }}
                        CellRendererComponent={CellRenderer}
                        ListHeaderComponent={
                            <Animated.View style={{ opacity: storiesOpacity }}>
                                <ActivityChips navigation={navigation} />
                            </Animated.View>
                        }
                        initialNumToRender={2}
                        windowSize={4}
                    />
                </SafeAreaView>
            </MaskedView>

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
    maskContainer: (isScrolledPastTopClip) => ({
        flex: 1,
        backgroundColor: "#fff",
        borderTopRightRadius: isScrolledPastTopClip ? 35 : 0,
        borderTopLeftRadius: isScrolledPastTopClip ? 35 : 0,
    }),
});
