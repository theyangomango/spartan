import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import ProfileBottomBottomSheet from "../components/5_Profile/ProfileBottom/ProfileBottomBottomSheet";
import ViewProfileRowButtons from "../components/ViewProfile/ViewProfileRowButtons";
import ViewProfileInfo from "../components/ViewProfile/ViewProfileInfo";
import ViewProfileHeader from "../components/ViewProfile/ViewProfileHeader";
import readDoc from "../../backend/helper/firebase/readDoc";
import WorkoutStats from "../components/5_Profile/ProfileTop/WorkoutStats";
import Footer from "../components/Footer";

export default function ViewProfile({ navigation, route }) {
    const user = route.params.user;
    const [userData, setUserData] = useState(null);
    const [posts, setPosts] = useState([]);
    const [selectedPanel, setSelectedPanel] = useState('posts');

    useEffect(() => {
        getFullUserData();
    }, [user]);

    async function getFullUserData() {
        const data = await readDoc('users', user.uid);
        setUserData(data);
        console.log(data);
    }

    useEffect(() => {
        if (userData) {
            getPosts();
        }
    }, [userData]);


    async function getPosts() {
        let db_posts = [];
        for (const pid of userData.posts) {
            let postData = await readDoc('posts', pid);
            db_posts.push(postData);
        }
        setPosts(db_posts);
    }

    async function toMessages() {
        for (msg of global.userData.messages) {
            if (msg.otherUsers.length == 1 && msg.otherUsers[0].uid == user.uid) { // This DM
                const chatData = await readDoc('messages', msg.mid);
                navigation.navigate('Chat', { data: chatData, usersExcludingSelf: msg.otherUsers });
            }
        }
    }

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.body_ctnr}>
                <ViewProfileHeader handle={user.handle} />
                <ViewProfileInfo userData={userData} />
                <ViewProfileRowButtons toMessages={toMessages} />
                <WorkoutStats userData={userData} />
            </View>

            <ProfileBottomBottomSheet selectedPanel={selectedPanel}
                setSelectedPanel={setSelectedPanel}
                posts={posts}
                navigation={navigation} />

            <Footer currentScreenName={'Explore'} navigation={navigation} />
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: '#fff'
    },
    body_ctnr: {
        paddingHorizontal: 10,
    }
});
