/**
 * Feed Screen. Retrieves and displays stories and posts. 
 * Handles Navigation to the Messages Screen.
 * Handles the NotificationsBottomSheet, CommentsBottomSheet, ShareBottomSheet, and ViewWorkoutBottomSheet
 * * Does NOT handle backend calls from user interactions
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Dimensions, SafeAreaView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import MaskedView from "@react-native-masked-view/masked-view";
import { doc, onSnapshot, collection, where, query, getDocs, orderBy, limit } from "firebase/firestore";

import Footer from "../components/Footer";
import Post from "../components/1_Feed/Posts/Post";
import FeedHeader from "../components/1_Feed/FeedHeader";
import Stories from "../components/1_Feed/Stories/Stories";
import NotificationsBottomSheet from "../components/1_Feed/Notifications/NotificationsBottomSheet";
import CommentsBottomSheet from "../components/1_Feed/Comments/CommentsBottomSheet";
import ShareBottomSheet from "../components/1_Feed/SharePost/ShareBottomSheet";
import ViewWorkoutBottomSheet from "../components/1_Feed/ViewWorkout/ViewWorkoutBottomSheet";

import { initUserFeed, registerFeedSetters } from '../helper/initUserFeed';
import { db } from "../../firebase.config";
import getScrollTargetPosition from "../helper/getScrollTargetPosition";
import isThisUser from "../helper/isThisUser";
import useFilteredFeed from "../helper/useFilteredFeed";
import useFilteredStories from '../helper/useFilteredStories';

const { width, height } = Dimensions.get("window");
const TARGET_POSITION = getScrollTargetPosition(width, height),
    SCROLL_THRESHOLD = 30,
    ANIMATION_DURATION = 300;

export default function Feed({ navigation, route }) {
    // Use UID from global or route params
    const UID = "userData" in global ? global.userData.uid : route?.params?.uid;

    // State
    const posts = useFilteredFeed(global.userData ? global.userData?.following : []);
    const { storiesData, storiesUserList } = useFilteredStories(global.userData?.following);
    const [messages, setMessages] = useState(null)
    const [isSomePostFocused, setIsSomePostFocused] = useState(false)
    const [isScrolledPastTopClip, setIsScrolledPastTopClip] = useState(false)
    const [footerKey, setFooterKey] = useState(0)
    const [shareBottomSheetExpandFlag, setShareBottomSheetExpandFlag] = useState(false)
    const [shareBottomSheetCloseFlag, setShareBottomSheetCloseFlag] = useState(false)
    const [notificationsBottomSheetExpandFlag, setNotificationsBottomSheetExpandFlag] = useState(false)
    const [commentsBottomSheetExpandFlag, setCommentsBottomSheetExpandFlag] = useState(false)
    const [viewWorkoutBottomSheetExpandFlag, setViewWorkoutBottomSheetExpandFlag] = useState(false)
    const [viewingWorkoutIndex, setViewingWorkoutIndex] = useState(null);

    /* ---------- refs ---------- */
    const scrollOffsetY = useRef(0);
    const userDataRef = useRef(null);
    const focusedPostIndex = useRef(-1);
    const flatListRef = useRef(null);
    const isTransitioning = useRef(false);      /* 🔒 */

    // ✅ Local user cache for instant search in header
    const allUsersRef = useRef([]); // SearchUsersBar reads .current

    /* ---------- animated values ---------- */
    const translateY = useRef(new Animated.Value(0)).current;
    const footerOpacity = useRef(new Animated.Value(1)).current;
    const storiesOpacity = useRef(new Animated.Value(1)).current;

    const handleScroll = e => {
        const y = e.nativeEvent.contentOffset.y;
        scrollOffsetY.current = y;                             // remember position
        setIsScrolledPastTopClip(y > SCROLL_THRESHOLD);
    };

    // Load user data from Firestore once
    useEffect(() => {
        if (!UID) return;
        const unsub = onSnapshot(doc(db, "users", UID), snap => {
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
    useEffect(() => { if (route?.params?.messages) setMessages(route.params.messages); }, [route?.params?.messages]);


    /* ---------- focus / unfocus handlers ---------- */
    const handleFocusPost = (index, pageY) => {
        if (isTransitioning.current) return;            /* 🔒 */
        isTransitioning.current = true;
        stopFlatListMomentum();

        focusedPostIndex.current = index;
        setIsSomePostFocused(true);
        animateView(pageY - TARGET_POSITION, 0);
    };

    const handleBackPress = () => {
        if (isTransitioning.current) return;            /* 🔒 */
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
                animated: false,          // ⟵ cancels momentum
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
            isTransitioning.current = false;              /* 🔓 unlock */
            if (translateYValue === 0) focusedPostIndex.current = -1;
        });
    };

    // Go to Messages screen
    const toMessagesScreen = () => {
        if (global.userData && messages) {
            navigation.navigate("Messages", { userData: userDataRef.current, messages });
        };
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

    // Render a single post
    const renderPost = useCallback(({ item, index }) => {
        const isFocusedPost = index === focusedPostIndex.current;

        if (!isSomePostFocused) {
            return (
                <Animated.View style={[styles.postWrapper, isFocusedPost && { transform: [{ translateY }], zIndex: 1 }]}>
                    <Post
                        data={item}
                        index={index}
                        openCommentsModal={openCommentsModal}
                        openShareModal={openShareModal}
                        isFocused={isSomePostFocused && isFocusedPost}
                        handleFocusPost={handleFocusPost}
                        isSomePostFocused={false}
                        toViewProfile={toViewProfilePosts}
                        openViewWorkoutModal={openViewWorkoutModal}
                    />
                </Animated.View>
            );
        }

        if (Math.abs(focusedPostIndex.current - index) <= 2) {
            return (
                <Animated.View style={[styles.postWrapper, isFocusedPost && { transform: [{ translateY }], zIndex: 1 }]}>
                    <Post
                        data={item}
                        index={index}
                        openCommentsModal={openCommentsModal}
                        openShareModal={openShareModal}
                        isFocused={isSomePostFocused && isFocusedPost}
                        handleFocusPost={handleFocusPost}
                        isSomePostFocused={isSomePostFocused}
                        toViewProfile={toViewProfilePosts}
                        openViewWorkoutModal={openViewWorkoutModal}
                    />
                </Animated.View>
            );
        }

        return (
            <Animated.View style={[styles.postWrapper, isFocusedPost && { transform: [{ translateY }], zIndex: 1 }]}>
                <Post
                    data={item}
                    index={index}
                    openCommentsModal={openCommentsModal}
                    openShareModal={openShareModal}
                    isFocused={isSomePostFocused && isFocusedPost}
                    handleFocusPost={handleFocusPost}
                    isSomePostFocused={false}
                    toViewProfile={toViewProfilePosts}
                    openViewWorkoutModal={openViewWorkoutModal}
                />
            </Animated.View>
        );
    }, [isSomePostFocused, handleFocusPost, openCommentsModal, openShareModal]);

    /* -------------------- HYDRATE allUsersRef.current -------------------- */

    // Utility to merge unique users into the ref (by uid)
    const mergeUsersIntoRef = (arr) => {
        if (!Array.isArray(arr) || arr.length === 0) return;
        const map = new Map(allUsersRef.current.map(u => [u.uid, u]));
        for (const u of arr) {
            if (!u?.uid) continue;
            const cur = map.get(u.uid) || {};
            map.set(u.uid, {
                uid: u.uid,
                handle: u.handle ?? cur.handle ?? '',
                name: u.name ?? cur.name ?? '',
                pfp: u.pfp ?? cur.pfp ?? '',
            });
        }
        allUsersRef.current = Array.from(map.values());
        // console.log('allUsersRef size:', allUsersRef.current.length);
    };

    // 1) Seed from currently loaded feed posts (cheap & instant)
    useEffect(() => {
        if (!posts || posts.length === 0) return;
        const seeded = posts
            .map(p => ({ uid: p?.uid, handle: p?.handle, name: p?.name, pfp: p?.pfp }))
            .filter(u => !!u.uid);
        mergeUsersIntoRef(seeded);
    }, [posts]);

    // 2) Seed from story users (also already loaded)
    useEffect(() => {
        if (!storiesUserList || storiesUserList.length === 0) return;
        const seeded = storiesUserList
            .map(u => ({ uid: u?.uid, handle: u?.handle, name: u?.name, pfp: u?.pfp }))
            .filter(u => !!u.uid);
        mergeUsersIntoRef(seeded);
    }, [storiesUserList]);

    // 3) Fetch your "following" that aren't already cached (chunks of 10 using '__name__' in)
    useEffect(() => {
        const run = async () => {
            const following = Array.isArray(global.userData?.following) ? global.userData.following : [];
            if (!following || following.length === 0) return;

            const existing = new Set(allUsersRef.current.map(u => u.uid));
            const missing = following.filter(uid => uid && !existing.has(uid));
            if (missing.length === 0) return;

            const usersCol = collection(db, 'users');
            const chunks = [];
            for (let i = 0; i < missing.length; i += 10) chunks.push(missing.slice(i, i + 10));

            const fetched = [];
            await Promise.all(chunks.map(async (ids) => {
                const q = query(usersCol, where('__name__', 'in', ids));
                const snap = await getDocs(q);
                snap.forEach(d => {
                    const data = d.data();
                    fetched.push({
                        uid: d.id,
                        handle: data?.handle ?? '',
                        name: data?.name ?? '',
                        pfp: data?.pfp ?? '',
                    });
                });
            }));

            mergeUsersIntoRef(fetched);
        };
        run().catch(() => { /* noop */ });
    }, [global.userData?.following, UID]);

    // 4) Small universal prefetch (first ~100 handles) so local search works even with 0 following
    useEffect(() => {
        if ((allUsersRef.current?.length || 0) > 25) return; // already seeded enough
        const prefetch = async () => {
            const usersCol = collection(db, 'users');
            const q = query(usersCol, orderBy('handle_lower'), limit(100));
            const snap = await getDocs(q);
            const arr = [];
            snap.forEach(d => {
                const data = d.data();
                arr.push({
                    uid: d.id,
                    handle: data?.handle ?? '',
                    name: data?.name ?? '',
                    pfp: data?.pfp ?? '',
                });
            });
            mergeUsersIntoRef(arr);
        };
        prefetch().catch(() => { /* noop */ });
    }, []);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
            <FeedHeader
                navigation={navigation}
                toMessagesScreen={toMessagesScreen}
                onOpenNotifications={handleOpenNotifications}
                backButton={isSomePostFocused}
                onBackPress={handleBackPress}
                scrollToTop={scrollToTop}
                allUsersRef={allUsersRef} // ✅ now hydrated
            />

            <MaskedView
                pointerEvents="box-none"
                style={{ flex: 1, flexDirection: "row", height: "100%" }}
                maskElement={<View style={styles.maskContainer(isScrolledPastTopClip)} />}
            >
                <SafeAreaView style={styles.mainContainer}>
                    <StatusBar style="dark" />
                    <Animated.FlatList
                        ref={flatListRef} // Assign ref to FlatList
                        bounces={false}
                        showsVerticalScrollIndicator={false}
                        data={posts}
                        renderItem={renderPost}
                        keyExtractor={(_, i) => i.toString()}
                        onScroll={handleScroll}
                        scrollEventThrottle={10}
                        ListHeaderComponent={
                            <Animated.View style={{ opacity: storiesOpacity }}>
                                {storiesData && (
                                    <Stories
                                        disabled={isSomePostFocused}
                                        navigation={navigation}
                                        data={storiesData}
                                        userList={storiesUserList}
                                        initStories={() => { }}
                                    />
                                )}
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
            <ShareBottomSheet shareBottomSheetCloseFlag={shareBottomSheetCloseFlag} shareBottomSheetExpandFlag={shareBottomSheetExpandFlag} />
            <ViewWorkoutBottomSheet
                workout={viewingWorkoutIndex !== null ? posts[viewingWorkoutIndex].workout : null}
                viewWorkoutBottomSheetExpandFlag={viewWorkoutBottomSheetExpandFlag}
            />
            <Footer key={footerKey} navigation={navigation} currentScreenName="Feed" />
        </SafeAreaView>
    );

}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: "#fff" },
    postWrapper: { width: "100%" },
    maskContainer: isScrolledPastTopClip => ({
        flex: 1,
        backgroundColor: "#fff",
        borderTopRightRadius: isScrolledPastTopClip ? 35 : 0,
        borderTopLeftRadius: isScrolledPastTopClip ? 35 : 0
    })
});
