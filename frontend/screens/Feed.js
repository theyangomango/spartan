import { useEffect, useState } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Story from "../components/Story";
import Post from "../components/Post";

export default function Feed() {
    const [stories, setStories] = useState([1]);
    const [posts, setPosts] = useState([1]);

    useEffect(() => {
        
    }, []);

    return (
        <View style={styles.main_ctnr}>
            <Header />
            <View style={styles.stories_view_ctnr}>
                <ScrollView style={styles.stories_scrollview_ctnr} horizontal={true}>
                    {
                        // * Stories
                        stories.map((index) => {
                            return <Story key={index} />
                        })
                    }
                </ScrollView>
            </View>
            <View style={styles.posts_view_ctnr}>
                <ScrollView style={styles.posts_scrollview}>
                    {
                        // * Posts
                        posts.map((index) => {
                            return <Post key={index} />
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