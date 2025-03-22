/**
 * Feed Screen. Retrieves and displays stories and posts. 
 * Handles Navigation to the Messages Screen.
 * Handles the NotificationsBottomSheet, CommentsBottomSheet, ShareBottomSheet, and ViewWorkoutBottomSheet
 * * Does NOT handle backend calls from user interactions
 */

import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, SafeAreaView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import MaskedView from "@react-native-masked-view/masked-view";
import { doc, onSnapshot } from "firebase/firestore";
import FastImage from "react-native-fast-image";

import Footer from "../components/Footer";
import Post from "../components/1_Feed/Posts/Post";
import FeedHeader from "../components/1_Feed/FeedHeader";
import Stories from "../components/1_Feed/Stories/Stories";
import NotificationsBottomSheet from "../components/1_Feed/Notifications/NotificationsBottomSheet";
import CommentsBottomSheet from "../components/1_Feed/Comments/CommentsBottomSheet";
import ShareBottomSheet from "../components/1_Feed/SharePost/ShareBottomSheet";
import ViewWorkoutBottomSheet from "../components/1_Feed/ViewWorkout/ViewWorkoutBottomSheet";

import readDoc from "../../backend/helper/firebase/readDoc";
import retrieveUserFeed from "../../backend/retrieveUserFeed";
import retrieveUserExploreFeed from '../../backend/retrieveUserExploreFeed'
import { db } from "../../firebase.config";
import getScrollTargetPosition from "../helper/getScrollTargetPosition";
import isThisUser from "../helper/isThisUser";

const { width, height } = Dimensions.get("window");
const TARGET_POSITION = getScrollTargetPosition(width, height),
    SCROLL_THRESHOLD = 30,
    ANIMATION_DURATION = 300;

export default function Feed({ navigation, route }) {
    // Use UID from global or route params
    const UID = "userData" in global ? global.userData.uid : route.params.uid;

    // State
    const [stories, setStories] = useState(null),
        [posts, setPosts] = useState([]),
        [messages, setMessages] = useState(null),
        [isSomePostFocused, setIsSomePostFocused] = useState(false),
        [isScrolledPastTopClip, setIsScrolledPastTopClip] = useState(false),
        [footerKey, setFooterKey] = useState(0),
        [shareBottomSheetExpandFlag, setShareBottomSheetExpandFlag] = useState(false),
        [shareBottomSheetCloseFlag, setShareBottomSheetCloseFlag] = useState(false),
        [notificationsBottomSheetExpandFlag, setNotificationsBottomSheetExpandFlag] = useState(false),
        [commentsBottomSheetExpandFlag, setCommentsBottomSheetExpandFlag] = useState(false),
        [viewWorkoutBottomSheetExpandFlag, setViewWorkoutBottomSheetExpandFlag] = useState(false),
        [viewingWorkoutIndex, setViewingWorkoutIndex] = useState(null);

    // Refs
    const userDataRef = useRef(null),
        focusedPostIndex = useRef(-1),
        flatListRef = useRef(null); // Reference to FlatList

    // Animated values
    const translateY = useRef(new Animated.Value(0)).current,
        footerOpacity = useRef(new Animated.Value(1)).current,
        storiesOpacity = useRef(new Animated.Value(1)).current;

    // Load user data from Firestore once
    useEffect(() => {
        init();
        const unsub = onSnapshot(doc(db, "users", UID), snap => {
            userDataRef.current = snap.data();
            global.userData = userDataRef.current; // init of userData has global variable
        });
        return () => unsub();
    }, []);

    // Re-init when screen gains focus
    useEffect(() => {
        const unsub = navigation.addListener("focus", () => {
            console.log({ messages });
            setFooterKey(k => k + 1); // state update for footer style
            // Todo figure ts out
            // init();
            // onSnapshot(doc(db, "users", UID), snap => {
            //     userDataRef.current = snap.data();
            //     global.userData = userDataRef.current;
            // });
        });
        return unsub;
    }, [navigation]);

    // If messages are passed from route, set them
    useEffect(() => { if ('messages' in route.params) setMessages(route.params.messages); }, [route]);

    // Initialize stories, posts, messages
    const init = async () => {
        try {
            userDataRef.current = await readDoc("users", UID);
            const feedData = await retrieveUserFeed(userDataRef.current);
            const exploreFeedData = await retrieveUserExploreFeed(userData);
            global.userData = userDataRef.current;
            global.exploreFeedPosts = exploreFeedData;
            setStories(feedData[0]);
            setPosts(feedData[1]);
            setMessages(feedData[2]);

            if (userDataRef.current.currentWorkout) {
                global.isCurrentlyWorkingOut = true;
                setFooterKey(k => k + 1); // Update footer style
            }

            // Preload Stories Images using FastImage
            const storiesPreloadImages = feedData[0].storiesData.map(story => ({
                uri: story.image,
                priority: FastImage.priority.high,
                // Optionally add cache control
                cache: FastImage.cacheControl.immutable,
            }));

            const exploreFeedPreloadImages = exploreFeedData.map(post => ({
                uri: post.images[0],
                priority: FastImage.priority.normal,
            }));

            FastImage.preload(storiesPreloadImages);
            FastImage.preload(exploreFeedPreloadImages);

            console.log("All story images have been preloaded with FastImage.");
        } catch (error) {
            console.error("Error initializing feed data:", error);
        }
    };

    // Update stories only
    const initStories = async () => {
        const feedData = await retrieveUserFeed(userDataRef.current);
        setStories(feedData[0]);
    };

    // Focus on a single post
    const handleFocusPost = (index, postY) => {
        focusedPostIndex.current = index;
        setIsSomePostFocused(true);
        animateView(postY - TARGET_POSITION, 0);
    };

    // Go back from single post
    const handleBackPress = () => {
        setIsSomePostFocused(false);
        setShareBottomSheetCloseFlag(!shareBottomSheetCloseFlag);
        animateView(0, 1);
    };

    // Animate view
    const animateView = (translateYValue, opacityValue) => {
        Animated.parallel([
            Animated.timing(translateY, { toValue: -translateYValue, duration: ANIMATION_DURATION, useNativeDriver: true }),
            Animated.timing(footerOpacity, { toValue: opacityValue, duration: ANIMATION_DURATION, useNativeDriver: true }),
            Animated.timing(storiesOpacity, { toValue: opacityValue, duration: ANIMATION_DURATION, useNativeDriver: true })
        ]).start(() => { if (translateYValue === 0) focusedPostIndex.current = -1; });
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

    // Scroll-based top mask
    const handleScroll = e => setIsScrolledPastTopClip(e.nativeEvent.contentOffset.y > SCROLL_THRESHOLD);

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
    function renderPost({ item, index }) {
        const isFocusedPost = index === focusedPostIndex.current;
        // const isNearFocusedPost = Math.abs(index - focusedPostIndex.current) > 1; // only update/rerender nearby posts when a post is focused

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
    };

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
                        scrollEnabled={!isSomePostFocused}
                        showsVerticalScrollIndicator={false}
                        data={posts}
                        renderItem={renderPost}
                        keyExtractor={(_, i) => i.toString()}
                        onScroll={handleScroll}
                        scrollEventThrottle={10}
                        ListHeaderComponent={
                            <Animated.View style={{ opacity: storiesOpacity }}>
                                {stories && (
                                    <Stories
                                        navigation={navigation}
                                        data={stories.storiesData}
                                        userList={stories.storiesUserList}
                                        initStories={initStories}
                                    />
                                )}
                            </Animated.View>
                        }
                        initialNumToRender={2}
                        removeClippedSubviews
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
