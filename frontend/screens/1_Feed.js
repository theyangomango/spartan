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
import { doc, onSnapshot } from "firebase/firestore";

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
    const UID = "userData" in global ? global.userData.uid : route.params.uid;

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
        const unsub = onSnapshot(doc(db, "users", UID), snap => {
            userDataRef.current = snap.data();
            global.userData = userDataRef.current; // init of userData has global variable
        });

        return () => unsub();
    }, []);


    useEffect(() => {
        registerFeedSetters({
            setMessages,
            setFooterKey,
        });

        initUserFeed(UID);
    }, []);


    // Update stories only
    const initStories = async () => {
        // // Todo: Replace - should just be a client end update
        // const feedData = await retrieveUserFeed(userDataRef.current);
        // setStories(feedData[0]);
    };

    // If messages are passed from route, set them
    useEffect(() => { if ('messages' in route.params) setMessages(route.params.messages); }, [route]);


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

        else {
            if (Math.abs(focusedPostIndex.current - index) <= 1) {
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
        }
    }, [isSomePostFocused, handleFocusPost, openCommentsModal, openShareModal]);


    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
            <FeedHeader
                toMessagesScreen={toMessagesScreen}
                onOpenNotifications={handleOpenNotifications}
                backButton={isSomePostFocused}
                onBackPress={handleBackPress}
                scrollToTop={scrollToTop} // Pass scrollToTop function to FeedHeader
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
                                        initStories={initStories}
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
    maskContainer: isScrolledPastTopClip => ({ // * Mask used to prevent clipping effect when posts are scrolled to top
        flex: 1,
        backgroundColor: "#fff",
        borderTopRightRadius: isScrolledPastTopClip ? 35 : 0,
        borderTopLeftRadius: isScrolledPastTopClip ? 35 : 0
    })
});
