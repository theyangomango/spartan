import React, { useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { StyleSheet, View, Dimensions, Animated, FlatList } from "react-native";
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
import SettingsBottomSheet from "../components/1_Feed/SettingsBottomSheet";

// Constants
const UID = '6b176d7d-4d89-4cb5-beb0-0f19b47a10a2'; // Hard set UID
const ANIMATION_DURATION = 300;
const TARGET_POSITION = 85;
const SCROLL_THRESHOLD = 85;

export default function Feed({ navigation }) {
    const [stories, setStories] = useState(null);
    const [posts, setPosts] = useState([]);
    const [messages, setMessages] = useState(null);
    const [isPostsVisible, setIsPostsVisible] = useState(true);
    const [isScrolledPast90, setIsScrolledPast90] = useState(false);

    const [shareBottomSheetExpandFlag, setShareBottomSheetExpandFlag] = useState(false);
    const [shareBottomSheetCloseFlag, setShareBottomSheetCloseFlag] = useState(false);
    const [settingsBottomSheetExpandFlag, setSettingsBottomSheetExpandFlag] = useState(false);
    const [notificationsBottomSheetExpandFlag, setNotificationsBottomSheetExpandFlag] = useState(false);
    const [commentsBottomSheetExpandFlag, setCommentsBottomSheetExpandFlag] = useState(false);

    const userDataRef = useRef(0);
    const focusedPostIndex = useRef(-1);
    const translateY = useRef(new Animated.Value(0)).current;
    const headerOpacity = useRef(new Animated.Value(1)).current;
    const footerOpacity = useRef(new Animated.Value(1)).current;
    const storiesOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        init();
    }, []);

    const init = async () => {
        userDataRef.current = await readDoc('users', UID);
        const feedData = await retrieveUserFeed(userDataRef.current);
        global.userData = userDataRef.current;
        setStories(feedData[0]);
        setPosts(feedData[1]);
        setMessages(feedData[2]);
    };

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
        setSettingsBottomSheetExpandFlag(!settingsBottomSheetExpandFlag);
    };

    const handleOpenNotifications = () => {
        setNotificationsBottomSheetExpandFlag(!notificationsBottomSheetExpandFlag);
    };

    const handleScroll = (event) => {
        const yOffset = event.nativeEvent.contentOffset.y;
        setIsScrolledPast90(yOffset > SCROLL_THRESHOLD);
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
            <MaskedView
                pointerEvents="box-none"
                style={{ flex: 1, flexDirection: 'row', height: '100%' }}
                maskElement={
                    <View
                        pointerEvents="none"
                        style={{ flex: 1 }}
                    >
                        <View style={styles.headerSpacer(isPostsVisible)} />
                        <View style={styles.maskSpacer(isScrolledPast90)} />
                    </View>
                }
            >
                <View style={styles.mainContainer}>
                    <StatusBar style="dark" />
                    <SettingsBottomSheet settingsBottomSheetExpandFlag={settingsBottomSheetExpandFlag} />
                    <NotificationsBottomSheet notificationsBottomSheetExpandFlag={notificationsBottomSheetExpandFlag} />
                    <CommentsBottomSheet
                        isVisible={!isPostsVisible}
                        postData={focusedPostIndex.current === -1 ? null : posts[focusedPostIndex.current]}
                        commentsBottomSheetExpandFlag={commentsBottomSheetExpandFlag}
                    />
                    <ShareBottomSheet
                        shareBottomSheetCloseFlag={shareBottomSheetCloseFlag}
                        shareBottomSheetExpandFlag={shareBottomSheetExpandFlag}
                    />
                    <FeedHeader
                        toMessagesScreen={toMessagesScreen}
                        onOpenNotifications={handleOpenNotifications}
                        onOpenSettings={handleOpenSettings}
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
                        ListHeaderComponent={<Animated.View style={{ opacity: storiesOpacity }}>
                            {stories &&
                                <Stories data={stories.storiesData} userList={stories.storiesUserList} />
                            }
                        </Animated.View>}
                        initialNumToRender={2}
                    />
                    <Animated.View style={{ opacity: footerOpacity }}>
                        <Footer navigation={navigation} currentScreenName={'Feed'} />
                    </Animated.View>
                </View>
            </MaskedView>
        </View>
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
    headerSpacer: (isPostsVisible) => ({
        paddingTop: isPostsVisible ? 86 : 83,
        backgroundColor: '#fff',
    }),
    maskSpacer: (isScrolledPast90) => ({
        flex: 1,
        backgroundColor: '#fff',
        borderTopRightRadius: isScrolledPast90 ? 35 : 0,
        borderTopLeftRadius: isScrolledPast90 ? 35 : 0,
    }),
});
