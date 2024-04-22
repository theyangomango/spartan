import { useEffect, useRef, useState } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import Footer from "../components/Footer";
import Story from "../components/feed/Story";
import Post from "../components/feed/Post";
import FeedHeader from "../components/feed/FeedHeader";
import { readDoc } from "../../backend/helper/firebase/readDoc";
import InstaStory from 'react-native-insta-story';

const data = [
    {
        user_id: 1,
        user_image:
            'https://pbs.twimg.com/profile_images/1222140802475773952/61OmyINj.jpg',
        user_name: 'Ahmet Çağlar Durmuş',
        stories: [
            {
                story_id: 1,
                story_image:
                    'https://image.freepik.com/free-vector/universe-mobile-wallpaper-with-planets_79603-600.jpg',
                swipeText: 'Custom swipe text for this story',
                onPress: () => console.log('story 1 swiped'),
            },
            {
                story_id: 2,
                story_image:
                    'https://image.freepik.com/free-vector/mobile-wallpaper-with-fluid-shapes_79603-601.jpg',
            },
        ],
    },
    {
        user_id: 2,
        user_image:
            'https://images.unsplash.com/photo-1511367461989-f85a21fda167?ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8cHJvZmlsZXxlbnwwfHwwfHw%3D&ixlib=rb-1.2.1&w=1000&q=80',
        user_name: 'Test User',
        stories: [
            {
                story_id: 1,
                story_image:
                    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTjORKvjcbMRGYPR3QIs3MofoWkD4wHzRd_eg&usqp=CAU',
                swipeText: 'Custom swipe text for this story',
                onPress: () => console.log('story 1 swiped'),
            },
            {
                story_id: 2,
                story_image:
                    'https://files.oyebesmartest.com/uploads/preview/vivo-u20-mobile-wallpaper-full-hd-(1)qm6qyz9v60.jpg',
                swipeText: 'Custom swipe text for this story',
                onPress: () => console.log('story 2 swiped'),
            },
        ],
    },
];
const UID = '6b176d7d-4d89-4cb5-beb0-0f19b47a10a2';

export default function Feed({ navigation }) {
    console.log('Feed Screen');

    const [stories, setStories] = useState([]);
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
        setStories(db_stories);

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
                {/* <ScrollView showsHorizontalScrollIndicator={false} style={styles.stories_scrollview_ctnr} horizontal={true}>
                    {
                        // * Stories
                        stories.map((content, index) => {
                            return <Story data={content} key={index} />
                        })
                    }
                </ScrollView> */}

                <InstaStory
                    data={data}
                    duration={10}
                />
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
            <Footer navigation={navigation} currentScreenName={'Feed'} userData={userData.current} />
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
    },
    stories_view_ctnr: {
        width: '100%',
        backgroundColor: '#2D9EFF',
        paddingBottom: 10,
    },
    stories_scrollview_ctnr: {
        flexDirection: 'row',
        paddingLeft: 25,
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