// Profile.js
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Footer from "../components/Footer";
import ProfileHeader from "../components/5_Profile//ProfileTop/ProfileHeader";
import ProfileInfo from "../components/5_Profile/ProfileTop/ProfileInfo";
import ProfileRowButtons from "../components/5_Profile/ProfileTop/ProfileRowButtons";
import WorkoutStats from "../components/5_Profile/ProfileTop/WorkoutStats";
import readDoc from "../../backend/helper/firebase/readDoc";
import EditProfileBottomSheet from "../components/5_Profile/EditProfile/EditProfileBottomSheet";
import ProfileBottomBottomSheet from "../components/5_Profile/ProfileBottom/ProfileBottomBottomSheet";
import ViewStatsBottomSheet from "../components/5_Profile/ViewStats/ViewStatsBottomSheet";

export default function Profile({ navigation }) {
    const userData = global.userData;
    const [posts, setPosts] = useState([]);
    const [selectedPanel, setSelectedPanel] = useState('posts');
    const [isEditProfileBottomSheetVisible, setIsEditProfileBottomSheetVisible] = useState(false);
    const [isViewStatsBottomSheetVisible, setIsViewStatsBottomSheetVisible] = useState(false);

    useEffect(() => {
        getPosts();
    }, []);

    async function getPosts() {
        let db_posts = [];
        for (const pid of userData.posts) {
            let postData = await readDoc('posts', pid);
            db_posts.push(postData);
        }
        setPosts(db_posts);
    }

    function uploadPost() {
        console.log('Upload Post');
        navigation.navigate('SelectPhotos', {
            userData: userData
        });
    }

    function handleOpenEditProfile() {
        setIsEditProfileBottomSheetVisible(true);
    }

    function handleOpenViewStats() {
        setIsViewStatsBottomSheetVisible(true);
    }

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.body_ctnr}>
                <ProfileHeader onPressCreateBtn={uploadPost} />
                <ProfileInfo userData={userData} />
                <ProfileRowButtons handleOpenEditProfile={handleOpenEditProfile} handleOpenViewStats={handleOpenViewStats} />
                <WorkoutStats userData={userData} />
            </View>

            <ProfileBottomBottomSheet selectedPanel={selectedPanel}
                setSelectedPanel={setSelectedPanel}
                posts={posts}
                navigation={navigation}
            />

            <EditProfileBottomSheet
                isVisible={isEditProfileBottomSheetVisible}
                setIsVisible={setIsEditProfileBottomSheetVisible}
            />

            <ViewStatsBottomSheet
                isVisible={isViewStatsBottomSheetVisible}
                setIsVisible={setIsViewStatsBottomSheetVisible}
            />

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
