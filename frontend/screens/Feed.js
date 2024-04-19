import { useEffect, useState } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Story from "../components/Story";
import Post from "../components/Post";
import { readDoc } from "../../backend/helper/firebase/readDoc";
import initUser from "../../backend/initUser";

const UID = '6b176d7d-4d89-4cb5-beb0-0f19b47a10a2';

export default function Feed() {
    const [stories, setStories] = useState([]);
    const [posts, setPosts] = useState([]);

    useEffect(() => {
        getFeedData();
    }, []);

    async function getFeedData() {
        let userData = await readDoc('users', UID);

        // * Stories
        let db_stories = [];
        for (sid of userData.feedStories) {
            let storyData = await readDoc('stories', sid);
            db_stories.push(storyData);
        }
        setStories(db_stories);

        // * Posts
        let db_posts = [];
        for (pid of userData.feedPosts) {
            let postData = await readDoc('posts', pid);
            db_posts.push(postData);
        }
        setPosts(db_posts);
    }

    return (
        <View style={styles.main_ctnr}>
            <Header />
            <View style={styles.stories_view_ctnr}>
                <ScrollView showsHorizontalScrollIndicator={false} style={styles.stories_scrollview_ctnr} horizontal={true}>
                    {
                        // * Stories
                        stories.map((content, index) => {
                            return <Story data={content} key={index} />
                        })
                    }
                </ScrollView>
            </View>
            <View style={styles.posts_view_ctnr}>
                <ScrollView showsVerticalScrollIndicator={false} style={styles.posts_scrollview}>
                    {
                        // * Posts
                        posts.map((content, index) => {
                            return <Post data={content} key={index} />
                        })
                    }
                </ScrollView>
            </View>
            <Footer />
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