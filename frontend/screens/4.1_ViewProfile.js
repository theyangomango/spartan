import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import ProfileBottomBottomSheet from "../components/5_Profile/ProfileBottom/ProfileBottomBottomSheet";
import ViewProfileRowButtons from "../components/ViewProfile/ViewProfileRowButtons";
import ViewProfileInfo from "../components/ViewProfile/ViewProfileInfo";
import ViewProfileHeader from "../components/ViewProfile/ViewProfileHeader";
import readDoc from "../../backend/helper/firebase/readDoc";
import WorkoutStats from "../components/5_Profile/ProfileTop/WorkoutStats";
import Footer from "../components/Footer";
import initChat from "../../backend/messages/initChat";
import makeID from "../../backend/helper/makeID";
import arrayAppend from "../../backend/helper/firebase/arrayAppend";

export default function ViewProfile({ navigation, route }) {
    const user = route.params.user;
    const [profileUserData, setProfileUserData] = useState(null);
    const [posts, setPosts] = useState([]);
    const [selectedPanel, setSelectedPanel] = useState('posts');

    useEffect(() => {
        getFullUserData();
    }, [user]);

    async function getFullUserData() {
        const data = await readDoc('users', user.uid);
        setProfileUserData(data);
    }

    useEffect(() => {
        if (profileUserData) {
            getPosts();
        }
    }, [profileUserData]);


    async function getPosts() {
        let db_posts = [];
        for (const pid of profileUserData.posts) {
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
                return;
            }
        }

        const selfUser = {
            uid: global.userData.uid,
            handle: global.userData.handle,
            pfp: global.userData.image,
            name: global.userData.name
        };

        const cid = makeID();
        arrayAppend('users', global.userData.uid, 'messages', {
            mid: cid,
            otherUsers: [user]
        });
        arrayAppend('users', profileUserData.uid, 'messages', {
            mid: cid,
            otherUsers: [selfUser]
        });

        const newChat = await initChat(global.userData.uid, [user, selfUser], cid);
        navigation.navigate('Chat', { data: newChat, usersExcludingSelf: [user] });
    }

    async function goBack() {
        navigation.navigate('Explore');
    }

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.body_ctnr}>
                <ViewProfileHeader handle={user.handle} goBack={goBack} />
                <ViewProfileInfo userData={profileUserData} />
                <ViewProfileRowButtons toMessages={toMessages} user={user} />
                <WorkoutStats userData={profileUserData} />
            </View>

            <ProfileBottomBottomSheet selectedPanel={selectedPanel}
                setSelectedPanel={setSelectedPanel}
                posts={posts}
                completedWorkouts={profileUserData && profileUserData.completedWorkouts}
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
