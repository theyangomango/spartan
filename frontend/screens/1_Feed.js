import React, { useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { StyleSheet, View, ScrollView, Dimensions } from "react-native";
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


// Todo - store uid on phone storage
const UID = '6b176d7d-4d89-4cb5-beb0-0f19b47a10a2'; // Hard set UID 

const { width, height } = Dimensions.get('window');


export default function Feed({ navigation }) {
    const [stories, setStories] = useState(null);
    const [posts, setPosts] = useState([]);
    const [messages, setMessages] = useState(null);
    const userDataRef = useRef(0);

    const [currentPost, setCurrentPost] = useState(null);
    const commentsBottomSheet = useRef();
    const [commentsBottomSheetBackgroundColor, setCommentsBottomSheetBackgroundColor] = useState('#000');

    const shareBottomSheet = useRef();
    const [shareBottomSheetBackgroundColor, setShareBottomSheetBackgroundColor] = useState('#000');

    useEffect(() => {
        init();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            const interval = setInterval(() => {
                let panY = parseInt(JSON.stringify(commentsBottomSheet.current.state.pan.y));
                let animatedHeight = parseInt(JSON.stringify(commentsBottomSheet.current.state.animatedHeight));
                let realHeight = Math.max(panY, 1000 - animatedHeight);
                setCommentsBottomSheetBackgroundColor(`rgba(0, 0, 0, ${0.7 - 0.75 * (realHeight / 600)})`)

                let panY2 = parseInt(JSON.stringify(shareBottomSheet.current.state.pan.y));
                let animatedHeight2 = parseInt(JSON.stringify(shareBottomSheet.current.state.animatedHeight));
                let realHeight2 = Math.max(panY2, 1000 - animatedHeight2);
                setShareBottomSheetBackgroundColor(`rgba(0, 0, 0, ${0.7 - 0.75 * (realHeight2 / 600)})`)
            }, 10);

            return () => {
                clearInterval(interval);
            };
        }, [])
    );

    async function init() {
        userDataRef.current = await readDoc('users', UID);
        let feedData = await retrieveUserFeed(userDataRef.current);
        global.userData = userDataRef.current;
        setStories(feedData[0]);
        setPosts(feedData[1]);
        setMessages(feedData[2]);
    }

    function toMessagesScreen() {
        if (global.userData == null || messages == null) return;
        navigation.navigate('Messages', {
            userData: userDataRef.current,
            messages: messages
        })
    }

    function openCommentsModal(index) {
        setCurrentPost(posts[index]);
        commentsBottomSheet.current.show();
    }

    function openShareModal(index) {
        setCurrentPost(posts[index]);
        shareBottomSheet.current.show();
    }

    return (
        <View style={styles.main_ctnr}>
            <BottomSheet
                hasDraggableIcon
                ref={commentsBottomSheet}
                height={height - 65}
                sheetBackgroundColor={'#fff'}
                backgroundColor={commentsBottomSheetBackgroundColor}
                draggable={true} // Optional, as it's true by default
            >
                <CommentsModal postData={currentPost} />
            </BottomSheet>

            <BottomSheet
                hasDraggableIcon
                ref={shareBottomSheet}
                height={height - 65}
                sheetBackgroundColor={'#fff'}
                backgroundColor={shareBottomSheetBackgroundColor}
                draggable={true} // Optional, as it's true by default
            >
                <ShareModal />
            </BottomSheet>

            <FeedHeader toMessagesScreen={toMessagesScreen} />
            <ScrollView scrollEnabled={true} showsVerticalScrollIndicator={false} bounces={false}>
                {stories && <Stories data={stories} />}
                <View style={styles.posts_view_ctnr}>
                    {
                        posts.map((content, index) => {
                            return <Post data={content} index={index} onPressCommentButton={openCommentsModal} onPressShareButton={openShareModal} key={index} />
                        })
                    }
                </View>
            </ScrollView>

            {
                global.workout &&
                <WorkoutFooter userData={userDataRef} />
            }
            <Footer navigation={navigation} currentScreenName={'Feed'} />
            <BlurView intensity={1.5} style={styles.blurview} />
        </View >
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: '#fff'
    },
    posts_view_ctnr: {
        paddingTop: 10,
        paddingHorizontal: 10,
        // paddingHorizontal: 3,
        flex: 1,
        // backgroundColor: '#E9F1FB',
        // backgroundColor: '#FAFCFF',
        backgroundColor: '#fff',
        marginBottom: 70
    },
    blurview: {
        position: 'absolute',
        top: 90,
        left: 0,
        width: '100%',
        height: 11.5,
        // backgroundColor: '#2D9EFF'
    }
});