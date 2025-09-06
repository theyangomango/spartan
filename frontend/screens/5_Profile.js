import React, { useEffect, useRef, useState } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import ProfileHeader from "../components/5_Profile/ProfileTop/ProfileHeader";
import ProfileInfo from "../components/5_Profile/ProfileTop/ProfileInfo";
import ProfileRowButtons from "../components/5_Profile/ProfileTop/ProfileRowButtons";
import WorkoutStats from "../components/5_Profile/ProfileTop/WorkoutStats";
import readDoc from "../../backend/helper/firebase/readDoc";
import readDocsByIds from "../../backend/helper/firebase/readDocsByIds";
import EditProfileBottomSheet from "../components/5_Profile/EditProfile/EditProfileBottomSheet";
// ⬇️ swap OUT the old ViewStatsBottomSheet
// import ViewStatsBottomSheet from "../components/5_Profile/ViewStats/ViewStatsBottomSheet";
// ⬇️ and swap IN the Competition screen’s bottom sheet
import UserStatsBottomSheet from "../components/2_Competition/UserStats/UserStatsBottomSheet";
import Footer from "../components/Footer";

export default function Profile({ navigation }) {
    const userData = global.userData;
    const [posts, setPosts] = useState([]);
    const [selectedPanel, setSelectedPanel] = useState("posts");
    const [isEditProfileBottomSheetVisible, setIsEditProfileBottomSheetVisible] = useState(false);

    // Reuse this flag to show the Competition-style UserStatsBottomSheet
    const [isViewStatsBottomSheetVisible, setIsViewStatsBottomSheetVisible] = useState(false);

    const [pfp, setPFP] = useState(global.userData.image);

    useEffect(() => {
        getPosts();
    }, []);


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
        try {
            const ids = Array.isArray(userData.posts) ? userData.posts : [];
            const n = ids.length;
            if (!n) { setPosts([]); return; }

            // Always stream results into a buffer in original order
            const buffer = new Array(n);
            setPosts([]);

            // Fetch first screenful ASAP using a single `in` query
            const firstChunk = ids.slice(0, 10);
            const tail = ids.slice(10);

            const firstDocs = await readDocsByIds('posts', firstChunk);
            firstDocs.forEach((doc, i) => { if (doc && !doc.pid) doc.pid = firstChunk[i]; buffer[i] = doc; });
            setPosts(buffer.filter(Boolean));

            // Fetch the remainder concurrently in 10s; update as chunks return
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
            // keep existing posts on failure
        }
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

            <Footer currentScreenName={"Profile"} navigation={navigation} />
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
