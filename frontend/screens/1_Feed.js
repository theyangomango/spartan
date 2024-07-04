import React, { useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { StyleSheet, View, ScrollView } from "react-native";
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

// Todo - store uid on phone storage
const UID = '6b176d7d-4d89-4cb5-beb0-0f19b47a10a2'; // Hard set UID 

export default function Feed({ navigation }) {
    const [storiesDisplay, setStoriesDisplay] = useState(null);
    const [posts, setPosts] = useState([]);
    const [messages, setMessages] = useState(null);
    const userDataRef = useRef(0);

    const [currentPID, setCurrentPID] = useState(null);
    const [comments, setComments] = useState(null);
    const commentsBottomSheet = useRef();
    const [commentsBottomSheetBackgroundColor, setCommentsBottomSheetBackgroundColor] = useState('#000');

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
            }, 50);

            return () => {
                clearInterval(interval);
            };
        }, [])
    );

    async function init() {
        userDataRef.current = await readDoc('users', UID);
        let feedData = await retrieveUserFeed(userDataRef.current);
        setStoriesDisplay(await getStoriesDisplayFormat(feedData[0]));
        setPosts(feedData[1]);
        setMessages(feedData[2]);
        global.userData = userDataRef.current;
    }

    function toMessagesScreen() {
        if (global.userData == null || messages == null) return;
        navigation.navigate('Messages', {
            userData: userDataRef.current,
            messages: messages
        })
    }

    function openCommentsModal(index) {
        setComments(posts[index].comments);
        setCurrentPID(posts[index].pid);
        commentsBottomSheet.current.show();
    }

    return (
        <View style={styles.main_ctnr}>
            {/* <BlurView intensity={100} style={styles.blurview}>
            </BlurView> */}

            <BottomSheet
                hasDraggableIcon
                ref={commentsBottomSheet}
                height={850}
                sheetBackgroundColor={'#fff'}
                backgroundColor={commentsBottomSheetBackgroundColor}
                draggable={false}
            >
                <CommentsModal pid={currentPID} data={comments} />
            </BottomSheet>

            <FeedHeader toMessagesScreen={toMessagesScreen} />
            <ScrollView scrollEnabled={true} showsVerticalScrollIndicator={false} bounces={false}>
                <Stories displayStories={storiesDisplay} />
                <View style={styles.posts_view_ctnr}>
                    {
                        posts.map((content, index) => {
                            return <Post data={content} uid={UID} index={index} onPressCommentButton={openCommentsModal} key={index} />
                        })
                    }
                </View>
            </ScrollView>

            {
                global.workout &&
                <WorkoutFooter userData={userDataRef} />
            }
            <Footer navigation={navigation} currentScreenName={'Feed'} />
            <BlurView intensity={1.5} style={styles.blurview}/>
        </View >
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        // backgroundColor: '#fff'
    },
    posts_view_ctnr: {
        paddingTop: 20,
        paddingHorizontal: 16,
        flex: 1,
        backgroundColor: '#fff',
    },
    blurview: {
        position: 'absolute',
        top: 95,
        left: 0,
        width: '100%',
        height: 10,
        // backgroundColor: '#2D9EFF'
    }
});