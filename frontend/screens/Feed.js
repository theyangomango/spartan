import { useEffect, useRef, useState } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import Footer from "../components/Footer";
import Post from "../components/feed/Post";
import FeedHeader from "../components/feed/FeedHeader";
import { readDoc } from "../../backend/helper/firebase/readDoc";
import InstaStory from 'react-native-insta-story';
import getStoriesDisplayFormat from "../helper/getStoriesDisplayFormat";
import WorkoutFooter from "../components/workout/WorkoutFooter";


const UID = '6b176d7d-4d89-4cb5-beb0-0f19b47a10a2';

export default function Feed({ navigation }) {
    const [storiesDisplay, setStoriesDisplay] = useState(null);
    const [posts, setPosts] = useState([]);
    const [messages, setMessages] = useState(null);
    const userData = useRef(0);

    useEffect(() => {
        getUserData();
    }, []);

    async function getUserData() {
        userData.current = await readDoc('users', UID);

        // * Stories
        let db_stories = [];
        for (sid of userData.current.feedStories) {
            let storyData = await readDoc('stories', sid);
            db_stories.push(storyData);
        }
        // setStories(db_stories);
        setStoriesDisplay(await getStoriesDisplayFormat(db_stories));

        // * Posts
        let db_posts = [];
        for (pid of userData.current.feedPosts) {
            let postData = await readDoc('posts', pid);
            db_posts.push(postData);
        }
        setPosts(db_posts);

        // * Messages
        let db_messages = [];
        for (mid of userData.current.messages) {
            let messageData = await readDoc('messages', mid);
            db_messages.push(messageData);
        }
        setMessages(db_messages);
    }

    function toMessagesScreen() {
        if (messages == null) return;
        navigation.navigate('Messages', {
            userData: userData.current,
            messages: messages
        })
    }

    return (
        <View style={styles.main_ctnr}>
            <FeedHeader toMessagesScreen={toMessagesScreen} />
            <View style={styles.stories_view_ctnr}>
                <View style={styles.stories_ctnr}>
                    {storiesDisplay && <InstaStory
                        data={storiesDisplay}
                        avatarSize={56}
                        unPressedBorderColor={'#fff'}
                        pressedBorderColor={'#8dcbfc'}
                        unPressedAvatarTextColor={'#fff'}
                        pressedAvatarTextColor={'#fff'}
                        avatarTextStyle={styles.story_text}
                        avatarImageStyle={styles.story_image}
                        avatarWrapperStyle={styles.story_border}
                        duration={10}
                    />}
                </View>

            </View>
            <View style={styles.posts_view_ctnr}>
                <ScrollView showsVerticalScrollIndicator={false} style={styles.posts_scrollview}>
                    {
                        // * Posts
                        posts.map((content, index) => {
                            return <Post data={content} uid={UID} key={index} />
                        })
                    }
                </ScrollView>
            </View>

            {global.workout &&
                <WorkoutFooter userData={userData}/>
            }

            <Footer navigation={navigation} currentScreenName={'Feed'} userData={userData.current} />
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
    },
    stories_ctnr: {
        backgroundColor: '#2D9EFF',
        paddingLeft: 8,
        paddingTop: 10
    },
    story_text: {
        fontFamily: 'Inter_400Regular',
        fontSize: 10,
        paddingTop: 3,
        paddingBottom: 10
    },
    story_image: {
        width: 48,
        height: 48,
    },
    story_border: {
        width: 58,
        height: 58,
        borderWidth: 2,
    },
    posts_view_ctnr: {
        paddingHorizontal: 20,
        flex: 1,
        backgroundColor: '#fff',
    },
    posts_scrollview: {
        paddingTop: 20
    }
});