import React, { useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { StyleSheet, View, Dimensions, Animated, FlatList } from "react-native";
import Footer from "../components/Footer";
import Post from "../components/1_feed/Post";
import FeedHeader from "../components/1_feed/FeedHeader";
import readDoc from "../../backend/helper/firebase/readDoc";
import getStoriesDisplayFormat from "../helper/getStoriesDisplayFormat";
import WorkoutFooter from "../components/3_workout/WorkoutFooter";
import retrieveUserFeed from "../../backend/retreiveUserFeed";
import Stories from "../components/1_feed/Stories";
import BottomSheet from "react-native-gesture-bottom-sheet";
import CommentsModal from "../components/1_feed/CommentsModal";
import { BlurView } from 'expo-blur';
import createPost from "../../backend/posts/createPost";
import ShareModal from "../components/1_feed/ShareModal";
import NotificationsModal from "../components/1_feed/NotificationsModal";
import MaskedView from '@react-native-masked-view/masked-view';

import { StatusBar } from "expo-status-bar";
import CommentsBottomSheet from "../components/1_feed/CommentsBottomSheet";

const UID = '6b176d7d-4d89-4cb5-beb0-0f19b47a10a2'; // Hard set UID

const { width, height } = Dimensions.get('window');

export default function Feed({ navigation }) {
    const [stories, setStories] = useState(null);
    const [posts, setPosts] = useState([]);
    const [messages, setMessages] = useState(null);
    const [isPostsVisible, setIsPostsVisible] = useState(true);
    const userDataRef = useRef(0);

    const [currentPost, setCurrentPost] = useState(null);
    // const commentsBottomSheet = useRef();
    // const [commentsBottomSheetBackgroundColor, setCommentsBottomSheetBackgroundColor] = useState('#000');

    const shareBottomSheet = useRef();
    const [shareBottomSheetBackgroundColor, setShareBottomSheetBackgroundColor] = useState('#000');

    const notificationsBottomSheet = useRef(); // Reference for the notifications bottom sheet
    const [notificationsBottomSheetBackgroundColor, setNotificationsBottomSheetBackgroundColor] = useState('#000');

    const [isScrolledPast90, setIsScrolledPast90] = useState(false);

    // const [focusedPostIndex, setFocusedPostIndex] = useState(-1);
    const focusedPostIndex = useRef(-1);

    const [isCommentsBottomSheetVisible, setIsCommentsBottomSheetVisible] = useState(false);
    const [commentsBottomSheetExpandFlag, setCommentsBottomSheetExpandFlag] = useState(false);



    const translateY = useRef(new Animated.Value(0)).current;
    const headerOpacity = useRef(new Animated.Value(1)).current;
    const footerOpacity = useRef(new Animated.Value(1)).current;
    const storiesOpacity = useRef(new Animated.Value(1)).current;

    const handlePressPost = (index, postPositionY) => {
        // setFocusedPostIndex(index);
        focusedPostIndex.current = index;
        const targetPosition = 85; // The desired distance from the top of the screen
        const translateYValue = postPositionY - targetPosition;

        const animations = [
            Animated.timing(translateY, {
                toValue: -translateYValue,
                duration: 300,
                useNativeDriver: true,
            }),
            // Animated.timing(headerOpacity, {
            //     toValue: 0,
            //     duration: 300,
            //     useNativeDriver: true,
            // }),
            Animated.timing(footerOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(storiesOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            })
        ];

        setIsPostsVisible(false);
        Animated.parallel(animations).start();
        // setIsCommentsBottomSheetVisible(true);
    };

    const handleBackPress = () => {
        const animations = [
            Animated.timing(translateY, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(headerOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(footerOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(storiesOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            })
        ];
        setIsPostsVisible(true);
        setIsCommentsBottomSheetVisible(false);

        Animated.parallel(animations).start(() => {
            // setFocusedPostIndex(-1);
            focusedPostIndex.current = -1;
        });
        // setTimeout(() => {
        //     focusedPostIndex.current = -1;
        //     focusedPostIndex.current = -1;

        // }, 300);
    };

    useEffect(() => {
        init();
    }, []);

    useEffect(() => {
        console.log(focusedPostIndex.current);
    }, [focusedPostIndex.current]);

    // useEffect(() => {
    //     console.log(isScrolledPast90);
    // }, [isScrolledPast90]);

    // useFocusEffect(
    //     React.useCallback(() => {
    //         const interval = setInterval(() => {
    //             let panY = parseInt(JSON.stringify(commentsBottomSheet.current.state.pan.y));
    //             let animatedHeight = parseInt(JSON.stringify(commentsBottomSheet.current.state.animatedHeight));
    //             let realHeight = Math.max(panY, 1000 - animatedHeight);
    //             setCommentsBottomSheetBackgroundColor(`rgba(0, 0, 0, ${0.7 - 0.75 * (realHeight / 600)})`);

    //             let panY2 = parseInt(JSON.stringify(shareBottomSheet.current.state.pan.y));
    //             let animatedHeight2 = parseInt(JSON.stringify(shareBottomSheet.current.state.animatedHeight));
    //             let realHeight2 = Math.max(panY2, 1000 - animatedHeight2);
    //             setShareBottomSheetBackgroundColor(`rgba(0, 0, 0, ${0.7 - 0.75 * (realHeight2 / 600)})`);

    //             let panY3 = parseInt(JSON.stringify(notificationsBottomSheet.current.state.pan.y));
    //             let animatedHeight3 = parseInt(JSON.stringify(notificationsBottomSheet.current.state.animatedHeight));
    //             let realHeight3 = Math.max(panY3, 1000 - animatedHeight3);
    //             setNotificationsBottomSheetBackgroundColor(`rgba(0, 0, 0, ${0.7 - 0.75 * (realHeight3 / 600)})`);
    //         }, 10);

    //         return () => {
    //             clearInterval(interval);
    //         };
    //     }, [])
    // );

    async function init() {
        userDataRef.current = await readDoc('users', UID);
        let feedData = await retrieveUserFeed(userDataRef.current);
        global.userData = userDataRef.current;
        setStories(feedData[0]);
        setPosts(feedData[1]);
        setMessages(feedData[2]);
    }

    const toMessagesScreen = () => {
        if (global.userData == null || messages == null) return;
        navigation.navigate('Messages', {
            userData: userDataRef.current,
            messages: messages
        });
    };

    const openCommentsModal = (index) => {
        // setCurrentPost(posts[index]);
        // commentsBottomSheet.current.show();
        setCommentsBottomSheetExpandFlag(!commentsBottomSheetExpandFlag);
    };

    const openShareModal = (index) => {
        setCurrentPost(posts[index]);
        shareBottomSheet.current.show();
    };

    const handleOpenNotifications = () => {
        notificationsBottomSheet.current.show();
    };

    const handleScroll = (event) => {
        const yOffset = event.nativeEvent.contentOffset.y;
        setIsScrolledPast90(yOffset > 85);
    };

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
            />
        </Animated.View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <MaskedView pointerEvents="box-none"
                style={{ flex: 1, flexDirection: 'row', height: '100%' }}
                maskElement={
                    <View pointerEvents="none"
                        style={{
                            flex: 1,
                        }}
                    >
                        <View style={{
                            paddingTop: isPostsVisible ? 86 : 83,
                            backgroundColor: '#fff',
                        }} />
                        <View style={{
                            flex: 1,
                            backgroundColor: '#fff',
                            borderTopRightRadius: ((isScrolledPast90) ? 35 : 0),
                            borderTopLeftRadius: ((isScrolledPast90) ? 35 : 0)
                        }} />
                    </View>
                }
            >
                <View style={styles.main_ctnr}>
                    <StatusBar style="dark" />

                    <BottomSheet
                        hasDraggableIcon
                        ref={shareBottomSheet}
                        height={height - 65}
                        sheetBackgroundColor={'#fff'}
                        backgroundColor={shareBottomSheetBackgroundColor}
                        draggable={true}
                    >
                        <ShareModal />
                    </BottomSheet>

                    <BottomSheet
                        hasDraggableIcon
                        ref={notificationsBottomSheet}
                        height={height - 65}
                        sheetBackgroundColor={'#fff'}
                        backgroundColor={notificationsBottomSheetBackgroundColor}
                        draggable={true}
                    >
                        <NotificationsModal />
                    </BottomSheet>

                    <CommentsBottomSheet
                        isVisible={!isPostsVisible}
                        setIsVisible={setIsCommentsBottomSheetVisible}
                        postData={(focusedPostIndex.current == -1) ? null : posts[focusedPostIndex.current]}
                        commentsBottomSheetExpandFlag={commentsBottomSheetExpandFlag}
                    />

                    <FeedHeader
                        toMessagesScreen={toMessagesScreen}
                        onOpenNotifications={handleOpenNotifications}
                        backButton={!isPostsVisible}
                        onBackPress={handleBackPress}
                        style={{ opacity: headerOpacity }}
                    />
                    <Animated.FlatList
                        scrollEnabled={isPostsVisible}
                        showsVerticalScrollIndicator={false}
                        data={posts}
                        renderItem={renderItem}
                        keyExtractor={(item, index) => index.toString()}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                        ListHeaderComponent={<Animated.View style={{ opacity: storiesOpacity }}><Stories data={stories} /></Animated.View>}
                    />

                    <Animated.View style={{ opacity: footerOpacity }}>
                        {/* {global.workout && <WorkoutFooter userData={userDataRef} />} */}
                        <Footer navigation={navigation} currentScreenName={'Feed'} />
                    </Animated.View>
                </View>

            </MaskedView>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: '#fff'
    },
    posts_view_ctnr: {
        paddingTop: 10,
        flex: 1,
        backgroundColor: '#fff',
        marginBottom: 70
    },
    blurview: {
        position: 'absolute',
        top: 85,
        left: 0,
        width: '100%',
        height: 11.5,
    },
    outer: {
        position: 'absolute',
        top: 90,
        left: 0,
        right: 0,
        bottom: 0,
    },
    inner: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        top: 0,
        overflow: 'hidden',
        backgroundColor: 'transparent'
    },
    postWrapper: {
        width: '100%',
    }
});
