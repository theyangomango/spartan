// Profile.js
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Footer from "../components/Footer";
import ProfileHeader from "../components/5_Profile//ProfileTop/ProfileHeader";
import ProfileRowButtons from "../components/5_Profile/ProfileTop/ProfileRowButtons";
import WorkoutStats from "../components/5_Profile/ProfileTop/WorkoutStats";
import readDoc from "../../backend/helper/firebase/readDoc";
import EditProfileBottomSheet from "../components/5_Profile/EditProfile/EditProfileBottomSheet";
import ProfileBottomBottomSheet from "../components/5_Profile/ProfileBottom/ProfileBottomBottomSheet";
import ProfileBottomModal from "../components/5_Profile/ProfileBottom/ProfileBottomModal"; // Import the new component
import ViewProfileRowButtons from "../components/ViewProfile/ViewProfileRowButtons";
import ViewProfileInfo from "../components/ViewProfile/ViewProfileInfo";
import ViewProfileHeader from "../components/ViewProfile/ViewProfileHeader";

export default function ViewProfile({ navigation, route }) {
    const user = route.params.user;
    const [posts, setPosts] = useState([]);
    const [selectedPanel, setSelectedPanel] = useState('posts');

    useEffect(() => {
        getPosts();
    }, []);

    async function getPosts() {
        // let db_posts = [];
        // for (const pid of user.posts) {
        //     let postData = await readDoc('posts', pid);
        //     db_posts.push(postData);
        // }
        // setPosts(db_posts);
    }

    function uploadPost() {
        console.log('Upload Post');
        navigation.navigate('SelectPhotos', {
            userData: user
        });
    }

    function toOptionsScreen() {
        console.log('Options');
        navigation.navigate('PostOptions', {
            userData: user
        });
    }

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.body_ctnr}>
                <ViewProfileHeader handle={user.handle}/>
                <ViewProfileInfo user={user} />
                <ViewProfileRowButtons />
                {/* <WorkoutStats userData={user} /> */}
            </View>

            <ProfileBottomBottomSheet selectedPanel={selectedPanel}
                setSelectedPanel={setSelectedPanel}
                posts={posts}
                navigation={navigation} />
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
