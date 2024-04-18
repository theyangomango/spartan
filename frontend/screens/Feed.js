import { StyleSheet, View, Text, ScrollView } from "react-native";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Story from "../components/Story";
import Post from "../components/Post";

const stories = [1, 2];
const posts = [1];

export default function Feed() {
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
    },
    stories_scrollview_ctnr: {
        flexDirection: 'row',
        paddingLeft: 25,
    },
    posts_view_ctnr: {
        paddingHorizontal: 20,
        flex: 1,
    },
    posts_scrollview: {
        paddingTop: 20
    }
});