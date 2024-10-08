import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, Animated, SafeAreaView } from "react-native";
import Footer from "../components/Footer";
import Post from "../components/1_Feed/Posts/Post";
import FeedHeader from "../components/1_Feed/FeedHeader";
import readDoc from "../../backend/helper/firebase/readDoc";
import retrieveUserFeed from "../../backend/retreiveUserFeed";
import Stories from "../components/1_Feed/Stories/Stories";
import CommentsBottomSheet from "../components/1_Feed/Comments/CommentsBottomSheet";
import ShareBottomSheet from "../components/1_Feed/SharePost/ShareBottomSheet";
import NotificationsBottomSheet from "../components/1_Feed/Notifications/NotificationsBottomSheet";
import MaskedView from '@react-native-masked-view/masked-view';
import { StatusBar } from "expo-status-bar";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.config";
import { Dimensions } from "react-native";
import ViewWorkoutBottomSheet from "../components/1_Feed/ViewWorkout/ViewWorkoutBottomSheet";

// Constants
const ANIMATION_DURATION = 300;
const { width, height } = Dimensions.get("window");

const getTargetPosition = () => {
    if (width >= 430 && height >= 932) { // iPhone 14 Pro Max and similar
        return 105; // Adjusted for iPhone 14 Pro Max
    } else if (width >= 390 && height >= 844) { // iPhone 13/14 and similar
        return 95; // Adjusted for iPhone 13/14
    } else if (width >= 375 && height >= 812) { // iPhone X/XS/11 Pro and similar
        return 90; // Adjusted for iPhone X/XS/11 Pro
    } else { // Smaller iPhone models (like iPhone SE)
        return 85; // Adjusted for smaller iPhone models
    }
};

const TARGET_POSITION = getTargetPosition();
const SCROLL_THRESHOLD = 85;

export default function Feed({ navigation, route }) {
    const UID = 'userData' in global ? global.userData.uid : route.params.uid; // Hard set UID
    const [stories, setStories] = useState(null);
    const [posts, setPosts] = useState([]);
    const [messages, setMessages] = useState(null);
    const [isPostsVisible, setIsPostsVisible] = useState(true);
    const [isScrolledPast90, setIsScrolledPast90] = useState(false);
    const [footerKey, setFooterKey] = useState(0); // State to force footer re-render

    const [shareBottomSheetExpandFlag, setShareBottomSheetExpandFlag] = useState(false);
    const [shareBottomSheetCloseFlag, setShareBottomSheetCloseFlag] = useState(false);
    const [notificationsBottomSheetExpandFlag, setNotificationsBottomSheetExpandFlag] = useState(false);
    const [commentsBottomSheetExpandFlag, setCommentsBottomSheetExpandFlag] = useState(false);
    const [viewWorkoutBottomSheetExpandFlag, setViewWorkoutBottomSheetExpandFlag] = useState(false);
    const [viewingWorkoutIndex, setViewingWorkoutIndex] = useState(null);

    const userDataRef = useRef(0);
    const focusedPostIndex = useRef(-1);
    const translateY = useRef(new Animated.Value(0)).current;
    const headerOpacity = useRef(new Animated.Value(1)).current;
    const footerOpacity = useRef(new Animated.Value(1)).current;
    const storiesOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        init();
        const unsub = onSnapshot(doc(db, 'users', UID), async (doc) => {
            userDataRef.current = doc.data();
            global.userData = userDataRef.current;
        });

        return () => unsub();
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            setFooterKey(prevKey => prevKey + 1);

            init();
            onSnapshot(doc(db, 'users', UID), async (doc) => {
                userDataRef.current = doc.data();
                global.userData = userDataRef.current;
            });
        });

        return unsubscribe;
    }, [navigation]);

    useEffect(() => {
        if (route.params) {
            setMessages(route.params.messages);
        }
    }, [route]);

    const init = async () => {
        userDataRef.current = await readDoc('users', UID);
        const feedData = await retrieveUserFeed(userDataRef.current);
        global.userData = userDataRef.current;
        setStories(feedData[0]);
        setPosts(feedData[1]);
        setMessages(feedData[2]);

        console.log(feedData[2]);
        if (userDataRef.current.currentWorkout) {
            global.isCurrentlyWorkingOut = true;
            setFooterKey(prevKey => prevKey + 1);
        }
    };

    const initStories = async () => {
        const feedData = await retrieveUserFeed(userDataRef.current);
        setStories(feedData[0]);
    }

    const handlePressPost = (index, postPositionY) => {
        focusedPostIndex.current = index;
        const translateYValue = postPositionY - TARGET_POSITION;

        setIsPostsVisible(false);
        animateView(translateYValue, 0);
    };

    const handleBackPress = () => {
        setIsPostsVisible(true);
        setShareBottomSheetCloseFlag(!shareBottomSheetCloseFlag);
        animateView(0, 1);
    };

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
            })
        ]).start(() => {
            if (translateYValue === 0) {
                focusedPostIndex.current = -1;
            }
        });
    };

    const toMessagesScreen = () => {
        if (global.userData && messages) {
            navigation.navigate('Messages', {
                userData: userDataRef.current,
                messages: messages
            });
        }
    };

    const openCommentsModal = () => {
        setCommentsBottomSheetExpandFlag(!commentsBottomSheetExpandFlag);
    };

    const openShareModal = () => {
        setShareBottomSheetExpandFlag(!shareBottomSheetExpandFlag);
    };

    const handleOpenSettings = () => {
        // setSettingsBottomSheetExpandFlag(!settingsBottomSheetExpandFlag);
    };

    const handleOpenNotifications = () => {
        setNotificationsBottomSheetExpandFlag(!notificationsBottomSheetExpandFlag);
    };

    const handleScroll = (event) => {
        const yOffset = event.nativeEvent.contentOffset.y;
        setIsScrolledPast90(yOffset > SCROLL_THRESHOLD);
    };

    function toViewProfilePosts(index) {
        const user = {
            handle: posts[index].handle,
            uid: posts[index].uid,
            pfp: posts[index].pfp,
            name: posts[index].name
        }

        if (posts[index].uid === global.userData.uid) navigation.navigate('Profile');
        else navigation.navigate('ViewProfile', { user: user })
    }

    function toViewProfileComments(data) {
        const user = {
            handle: data.handle,
            uid: data.uid,
            pfp: data.pfp,
            name: data.name
        }

        if (posts[index].uid === global.userData.uid) navigation.navigate('Profile');
        else navigation.navigate('ViewProfile', { user: user })
    }

    function openViewWorkoutModal(workout) {
        console.log({ workout });
        setViewingWorkoutIndex(workout);
        setViewWorkoutBottomSheetExpandFlag(!viewWorkoutBottomSheetExpandFlag);
    }

    const renderItem = ({ item, index }) => (
        <Animated.View
            style={[
                styles.postWrapper,
                focusedPostIndex.current === index && {
                    transform: [{ translateY }],
                    zIndex: 1,
                }
            ]}
        >
            <Post
                data={item}
                index={index}
                onPressCommentButton={openCommentsModal}
                onPressShareButton={openShareModal}
                focusedPostIndex={focusedPostIndex}
                handlePressPost={handlePressPost}
                isPostsVisible={isPostsVisible}
                toViewProfile={toViewProfilePosts}
                openViewWorkoutModal={openViewWorkoutModal}
            />
        </Animated.View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <FeedHeader
                toMessagesScreen={toMessagesScreen}
                onOpenNotifications={handleOpenNotifications}
                onOpenSettings={handleOpenSettings}
                backButton={!isPostsVisible}
                onBackPress={handleBackPress}
                style={{ opacity: headerOpacity }}
            />

            <MaskedView
                pointerEvents="box-none"
                style={{ flex: 1, flexDirection: 'row', height: '100%' }}
                maskElement={
                    <View
                        pointerEvents="none"
                        style={{ flex: 1 }}
                    >
                        <View style={styles.maskSpacer(isScrolledPast90)} />
                    </View>
                }
            >
                <SafeAreaView style={styles.mainContainer}>
                    <StatusBar style="dark" />


                    <Animated.FlatList
                        scrollEnabled={isPostsVisible}
                        showsVerticalScrollIndicator={false}
                        data={posts}
                        renderItem={renderItem}
                        keyExtractor={(item, index) => index.toString()}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                        ListHeaderComponent={<Animated.View style={{ opacity: storiesOpacity }}>
                            {stories &&
                                <Stories navigation={navigation} data={stories.storiesData} userList={stories.storiesUserList} initStories={initStories} />
                            }
                        </Animated.View>}
                        initialNumToRender={2}
                        removeClippedSubviews={true}
                        windowSize={5}
                    />
                </SafeAreaView>
            </MaskedView>

            <NotificationsBottomSheet notificationsBottomSheetExpandFlag={notificationsBottomSheetExpandFlag} />
            <CommentsBottomSheet
                isVisible={!isPostsVisible}
                postData={focusedPostIndex.current === -1 ? null : posts[focusedPostIndex.current]}
                commentsBottomSheetExpandFlag={commentsBottomSheetExpandFlag}
                toViewProfile={toViewProfileComments}
            />
            <ShareBottomSheet
                shareBottomSheetCloseFlag={shareBottomSheetCloseFlag}
                shareBottomSheetExpandFlag={shareBottomSheetExpandFlag}
            />
            <ViewWorkoutBottomSheet
                workout={viewingWorkoutIndex !== null && posts[viewingWorkoutIndex].workout}
                viewWorkoutBottomSheetExpandFlag={viewWorkoutBottomSheetExpandFlag}
            />

            <Footer key={footerKey} navigation={navigation} currentScreenName={'Feed'} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    postWrapper: {
        width: '100%',
    },
    maskSpacer: (isScrolledPast90) => ({
        flex: 1,
        backgroundColor: '#fff',
        borderTopRightRadius: isScrolledPast90 ? 35 : 0,
        borderTopLeftRadius: isScrolledPast90 ? 35 : 0,
    }),
});
