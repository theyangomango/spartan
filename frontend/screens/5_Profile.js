import React, { useEffect, useRef, useState, useCallback } from "react";
import { SafeAreaView, StyleSheet, View, StatusBar } from "react-native";
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
import FeedWorkoutViewerSheet from "../components/1_Feed/ViewWorkout/FeedWorkoutViewerSheet";

import theme from "../theme/mfpDark";

export default function Profile({ navigation }) {
    const [, setRerender] = useState(0);
    useEffect(() => {
        const { onHexagonUpdate } = require('../utils/hexagonEvents');
        const off = onHexagonUpdate(() => setRerender((x) => x + 1));
        return () => off && off();
    }, []);
    const userData = global.userData;
    const [posts, setPosts] = useState([]);
    const [savedPosts, setSavedPosts] = useState([]);
    const [selectedPanel, setSelectedPanel] = useState("posts");
    const [isEditProfileBottomSheetVisible, setIsEditProfileBottomSheetVisible] = useState(false);

    // Reuse this flag to show the Competition-style UserStatsBottomSheet
    const [isViewStatsBottomSheetVisible, setIsViewStatsBottomSheetVisible] = useState(false);

    const [pfp, setPFP] = useState(global.userData.image);

    // Workout viewer state (reuses Feed viewer)
    const [profileSelectedWorkout, setProfileSelectedWorkout] = useState(null);
    const [profileWorkoutExpandToggle, setProfileWorkoutExpandToggle] = useState(false);
    const openWorkoutViewer = useCallback((wk) => {
        if (!wk) { setProfileSelectedWorkout(null); return; }
        // Normalize minimal fields expected by NewWorkoutModal
        const fallback = {
            wid: wk?.wid || wk?.id,
            creatorUID: wk?.creatorUID || wk?.creatorUid || (global?.userData?.uid || ''),
            created: wk?.created || wk?.createdAt || Date.now(),
            exercises: Array.isArray(wk?.exercises) ? wk.exercises : [],
            duration: wk?.duration,
            volume: wk?.volume,
            reps: wk?.reps,
            PBs: wk?.PBs ?? wk?.pbs ?? 0,
            templateName: wk?.templateName || wk?.template?.name,
        };
        setProfileSelectedWorkout({ ...fallback, ...wk });
        setProfileWorkoutExpandToggle((t) => !t);
    }, []);
    const closeWorkoutViewer = useCallback(() => {
        setProfileSelectedWorkout(null);
    }, []);

    useEffect(() => {
        getPosts();
        getSavedPosts();
    }, []);


    // If another tab requests opening SelectPhotos, honor it on focus
    const lastOpenSigRef = React.useRef(0);
    useEffect(() => {
        const unsub = navigation.addListener('focus', () => {
            // Refresh saved posts when returning to profile
            try { getSavedPosts(); } catch {}
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

    async function getSavedPosts() {
        try {
            const ids = Array.isArray(userData.savedPosts) ? userData.savedPosts : [];
            const n = ids.length;
            if (!n) { setSavedPosts([]); return; }

            const buffer = new Array(n);
            setSavedPosts([]);

            const firstChunk = ids.slice(0, 10);
            const tail = ids.slice(10);

            const firstDocs = await readDocsByIds('posts', firstChunk);
            firstDocs.forEach((doc, i) => { if (doc && !doc.pid) doc.pid = firstChunk[i]; buffer[i] = doc; });
            setSavedPosts(buffer.filter(Boolean));

            const promises = [];
            for (let i = 0; i < tail.length; i += 10) {
                const group = tail.slice(i, i + 10);
                const startIndex = 10 + i;
                promises.push(
                    readDocsByIds('posts', group).then((docs) => {
                        docs.forEach((doc, j) => { const id = group[j]; if (doc && !doc.pid) doc.pid = id; buffer[startIndex + j] = doc; });
                        setSavedPosts(buffer.filter(Boolean));
                    })
                );
            }
            await Promise.all(promises);
        } catch (e) {
            // keep existing savedPosts on failure
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
            <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
            <View style={styles.body_ctnr}>
                <ProfileHeader
                    onPressCreateBtn={uploadPost}
                    onPressSettings={() => {
                        try {
                            const rootNav = navigation?.getParent?.('ROOT');
                            if (rootNav?.navigate) rootNav.navigate('Settings', { transition: 'slide-from-right' });
                            else navigation.navigate('Settings', { transition: 'slide-from-right' });
                        } catch { navigation.navigate('Settings'); }
                    }}
                />
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
                savedPosts={savedPosts}
                completedWorkouts={global.userData.completedWorkouts}
                navigation={navigation}
                onOpenWorkout={openWorkoutViewer}
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

            {/* Workout viewer bottom sheet (profile) */}
            <FeedWorkoutViewerSheet
                expandToggle={profileWorkoutExpandToggle}
                workout={profileSelectedWorkout}
                friendUid={global?.userData?.uid}
                friendPfp={global?.userData?.image}
                onClose={closeWorkoutViewer}
            />
        </SafeAreaView>
    );
}

// If this import was in your original file, keep it.
// It was referenced above but not shown in your snippet.
import ProfileBottomBottomSheet from "../components/5_Profile/ProfileBottom/ProfileBottomBottomSheet";

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    body_ctnr: {
        paddingHorizontal: 10,
    },
});
