import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Footer from "../components/Footer";
import ProfileBottomBottomSheet from "../components/5_Profile/ProfileBottom/ProfileBottomBottomSheet";
import ViewProfileRowButtons from "../components/ViewProfile/ViewProfileRowButtons";
import ViewProfileInfo from "../components/ViewProfile/ViewProfileInfo";
import ViewProfileHeader from "../components/ViewProfile/ViewProfileHeader";
import readDoc from "../../backend/helper/firebase/readDoc";
import readDocsByIds from "../../backend/helper/firebase/readDocsByIds";
import WorkoutStats from "../components/5_Profile/ProfileTop/WorkoutStats";
import createChat from "../../backend/messages/createChat";
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
        try {
            const ids = Array.isArray(profileUserData?.posts) ? profileUserData.posts : [];
            const n = ids.length;
            setPosts([]); // allow skeleton to render immediately
            if (!n) return;

            const buffer = new Array(n);

            // First screenful via a single batched read
            const firstChunk = ids.slice(0, 10);
            const tail = ids.slice(10);
            const firstDocs = await readDocsByIds('posts', firstChunk);
            firstDocs.forEach((doc, i) => { if (doc && !doc.pid) doc.pid = firstChunk[i]; buffer[i] = doc; });
            setPosts(buffer.filter(Boolean));

            // Remaining chunks concurrently, update as they land
            const promises = [];
            for (let i = 0; i < tail.length; i += 10) {
                const group = tail.slice(i, i + 10);
                const startIndex = 10 + i;
                promises.push(
                    readDocsByIds('posts', group).then((docs) => {
                        docs.forEach((doc, j) => { const id = group[j]; if (doc && !doc.pid) doc.pid = id; buffer[startIndex + j] = doc; });
                        setPosts(buffer.filter(Boolean));
                    })
                );
            }
            await Promise.all(promises);
        } catch (e) {
            // Swallow for now; keep whatever loaded
        }
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

        const newChat = await createChat(global.userData.uid, [user, selfUser], cid);
        navigation.navigate('Chat', { data: newChat, usersExcludingSelf: [user] });
    }

    async function goBack() {
        // navigation.navigate('Explore');
        navigation.goBack();
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
            <Footer currentScreenName={'Profile'} navigation={navigation} />
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
