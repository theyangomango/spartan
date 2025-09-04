import React, { useEffect, useState } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import Footer from "../components/Footer";
import ProfileHeader from "../components/5_Profile/ProfileTop/ProfileHeader";
import ProfileInfo from "../components/5_Profile/ProfileTop/ProfileInfo";
import ProfileRowButtons from "../components/5_Profile/ProfileTop/ProfileRowButtons";
import WorkoutStats from "../components/5_Profile/ProfileTop/WorkoutStats";
import readDoc from "../../backend/helper/firebase/readDoc";
import EditProfileBottomSheet from "../components/5_Profile/EditProfile/EditProfileBottomSheet";
// ⬇️ swap OUT the old ViewStatsBottomSheet
// import ViewStatsBottomSheet from "../components/5_Profile/ViewStats/ViewStatsBottomSheet";
// ⬇️ and swap IN the Competition screen’s bottom sheet
import UserStatsBottomSheet from "../components/2_Competition/UserStats/UserStatsBottomSheet";

export default function Profile({ navigation }) {
    const userData = global.userData;
    const [posts, setPosts] = useState([]);
    const [selectedPanel, setSelectedPanel] = useState("posts");
    const [isEditProfileBottomSheetVisible, setIsEditProfileBottomSheetVisible] = useState(false);

    // Reuse this flag to show the Competition-style UserStatsBottomSheet
    const [isViewStatsBottomSheetVisible, setIsViewStatsBottomSheetVisible] = useState(false);

    const [footerKey, setFooterKey] = useState(0);
    const [pfp, setPFP] = useState(global.userData.image);

    useEffect(() => {
        getPosts();
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener("focus", () => {
            setFooterKey((prevKey) => prevKey + 1);
        });
        return unsubscribe;
    }, [navigation]);

    // If another tab requests opening SelectPhotos, honor it on focus
    const lastOpenSigRef = React.useRef(0);
    useEffect(() => {
        const unsub = navigation.addListener('focus', () => {
            const sig = Number(global?.profileOpenSelectPhotosSignal || 0);
            if (sig && sig !== lastOpenSigRef.current) {
                lastOpenSigRef.current = sig;
                try { navigation.navigate('SelectPhotos'); } catch {}
            }
        });
        return unsub;
    }, [navigation]);

    async function getPosts() {
        let db_posts = [];
        for (const pid of userData.posts) {
            let postData = await readDoc("posts", pid);
            db_posts.push(postData);
        }
        setPosts(db_posts);
    }

    function uploadPost() {
        navigation.navigate("SelectPhotos", {
            userData: userData,
        });
    }

    function handleOpenEditProfile() {
        setIsEditProfileBottomSheetVisible(true);
    }

    function handleOpenViewStats() {
        // ✅ Open the workout stats bottom sheet (same one used on Competition)
        setIsViewStatsBottomSheetVisible(true);
    }
    
    return (
        <SafeAreaView style={styles.main_ctnr}>
            <View style={styles.body_ctnr}>
                <ProfileHeader onPressCreateBtn={uploadPost} />
                <ProfileInfo userData={userData} pfp={pfp} />
                <ProfileRowButtons
                    handleOpenEditProfile={handleOpenEditProfile}
                    handleOpenViewStats={handleOpenViewStats}
                />
                <WorkoutStats userData={userData} />
            </View>

            <ProfileBottomBottomSheet
                selectedPanel={selectedPanel}
                setSelectedPanel={setSelectedPanel}
                posts={posts}
                completedWorkouts={global.userData.completedWorkouts}
                navigation={navigation}
            />

            <EditProfileBottomSheet
                isVisible={isEditProfileBottomSheetVisible}
                setIsVisible={setIsEditProfileBottomSheetVisible}
                setPFP={setPFP}
            />

            {/* ⬇️ Use the same modal as Competition screen */}
            <UserStatsBottomSheet
                user={userData}                    // show current profile’s user data
                navigation={navigation}
                isVisible={isViewStatsBottomSheetVisible}
                setIsVisible={setIsViewStatsBottomSheetVisible}
            />

            <Footer key={footerKey} currentScreenName={"Profile"} navigation={navigation} />
        </SafeAreaView>
    );
}

// If this import was in your original file, keep it.
// It was referenced above but not shown in your snippet.
import ProfileBottomBottomSheet from "../components/5_Profile/ProfileBottom/ProfileBottomBottomSheet";

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: "#fff",
    },
    body_ctnr: {
        paddingHorizontal: 10,
    },
});
