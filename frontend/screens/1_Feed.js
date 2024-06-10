import { useEffect, useRef, useState } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import Footer from "../components/Footer";
import Post from "../components/1_feed/Post";
import FeedHeader from "../components/1_feed/FeedHeader";
import readDoc from "../../backend/helper/firebase/readDoc";
import getStoriesDisplayFormat from "../helper/getStoriesDisplayFormat";
import WorkoutFooter from "../components/3_workout/WorkoutFooter";
import retrieveUserFeed from "../../backend/retreiveUserFeed";
import Stories from "../components/1_feed/Stories";

// Todo - store uid on phone storage
const UID = '6b176d7d-4d89-4cb5-beb0-0f19b47a10a2'; // Hard set UID 

export default function Feed({ navigation }) {
    const [storiesDisplay, setStoriesDisplay] = useState(null);
    const [posts, setPosts] = useState([]);
    const [messages, setMessages] = useState(null);
    const userDataRef = useRef(0);

    useEffect(() => {
        init();
    }, []);

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

    return (
        <View style={styles.main_ctnr}>
            <FeedHeader toMessagesScreen={toMessagesScreen} />
            <ScrollView scrollEnabled={true} showsVerticalScrollIndicator={false} style={{backgroundColor: '#2D9EFF'}}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={{ backgroundColor: '#fff', paddingBottom: 200}}
                >
                    <Stories displayStories={storiesDisplay} />
                    <View style={styles.posts_view_ctnr}>
                        {
                            posts.map((content, index) => {
                                return <Post data={content} uid={UID} key={index} />
                            })
                        }
                    </View>
                </ScrollView>
            </ScrollView>



            {global.workout &&
                <WorkoutFooter userData={userDataRef} />
            }
            <Footer navigation={navigation} currentScreenName={'Feed'} />
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: '#fff'
    },
    posts_view_ctnr: {
        paddingTop: 20,
        paddingHorizontal: 20,
        flex: 1,
        backgroundColor: '#fff',
    }
});