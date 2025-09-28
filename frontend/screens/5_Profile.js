import React, { useEffect, useRef, useState, useCallback } from "react";
import { SafeAreaView, StyleSheet, View, StatusBar } from "react-native";
import ProfileHeader from "../components/5_Profile/ProfileTop/ProfileHeader";
import ProfileInfo from "../components/5_Profile/ProfileTop/ProfileInfo";
import ProfileRowButtons from "../components/5_Profile/ProfileTop/ProfileRowButtons";
import WorkoutStats from "../components/5_Profile/ProfileTop/WorkoutStats";
import readDocsByIds from "../../backend/helper/firebase/readDocsByIds";
import EditProfileBottomSheet from "../components/5_Profile/EditProfile/EditProfileBottomSheet";
// ⬇️ swap OUT the old ViewStatsBottomSheet
// import ViewStatsBottomSheet from "../components/5_Profile/ViewStats/ViewStatsBottomSheet";
// ⬇️ and swap IN the Competition screen’s bottom sheet
import UserStatsBottomSheet from "../components/2_Competition/UserStats/UserStatsBottomSheet";
import Footer from "../components/Footer";
import FeedWorkoutViewerSheet from "../components/1_Feed/ViewWorkout/FeedWorkoutViewerSheet";
import FollowListBottomSheet from "../components/FollowListBottomSheet";

import theme from "../theme/mfpDark";
import { subscribeUserData } from "../utils/userDataEvents";

const templateListsEqual = (a, b) => {
    if (a === b) return true;
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
        const left = a[i] || {};
        const right = b[i] || {};
        const leftId = left?.tid ?? left?.id ?? null;
        const rightId = right?.tid ?? right?.id ?? null;
        if (leftId !== rightId) return false;
        if ((left?.name || '') !== (right?.name || '')) return false;
        const leftExercises = Array.isArray(left?.exercises) ? left.exercises.length : Number(left?.exercises || 0);
        const rightExercises = Array.isArray(right?.exercises) ? right.exercises.length : Number(right?.exercises || 0);
        if (leftExercises !== rightExercises) return false;
        if ((left?.lastDate || null) !== (right?.lastDate || null)) return false;
    }
    return true;
};

export default function Profile({ navigation }) {
    const [, setRerender] = useState(0);
    useEffect(() => {
        const { onHexagonUpdate } = require('../utils/hexagonEvents');
        const off = onHexagonUpdate(() => setRerender((x) => x + 1));
        return () => off && off();
    }, []);
    const userData = global.userData || {};
    const [posts, setPosts] = useState([]);
    const [templates, setTemplates] = useState(() => {
        const raw = userData?.templates;
        return Array.isArray(raw) ? raw : [];
    });
    const [selectedPanel, setSelectedPanel] = useState("posts");
    const [isEditProfileBottomSheetVisible, setIsEditProfileBottomSheetVisible] = useState(false);

    // Reuse this flag to show the Competition-style UserStatsBottomSheet
    const [isViewStatsBottomSheetVisible, setIsViewStatsBottomSheetVisible] = useState(false);
    const [isFollowListVisible, setIsFollowListVisible] = useState(false);
    const [followListMode, setFollowListMode] = useState('followers'); // or 'following'

    const [pfp, setPFP] = useState(() => (global?.userData?.image || ""));

    // Workout viewer state (reuses Feed viewer)
    const [profileSelectedWorkout, setProfileSelectedWorkout] = useState(null);
    const [profileWorkoutExpandToggle, setProfileWorkoutExpandToggle] = useState(false);
    const viewerInstanceRef = useRef(0);
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
            privacyMode: wk?.privacyMode ?? 'global',
        };
        const normalized = { ...fallback, ...wk };
        if (!normalized.privacyMode) normalized.privacyMode = 'global';
        viewerInstanceRef.current = (viewerInstanceRef.current + 1) % 1_000_000_000;
        normalized.__viewerInstance = viewerInstanceRef.current;
        setProfileSelectedWorkout(normalized);
        setProfileWorkoutExpandToggle((t) => !t);
    }, []);
    const closeWorkoutViewer = useCallback((closingInstance) => {
        setProfileSelectedWorkout((prev) => {
            if (!prev) return prev;
            if (Number.isFinite(closingInstance) && prev.__viewerInstance !== closingInstance) return prev;
            return null;
        });
    }, []);

    const [profileTopHeight, setProfileTopHeight] = useState(null);
    const handleProfileTopLayout = useCallback((event) => {
        const nextHeight = event?.nativeEvent?.layout?.height || 0;
        setProfileTopHeight((prev) => {
            if (prev == null) return nextHeight;
            return Math.abs(prev - nextHeight) > 1 ? nextHeight : prev;
        });
    }, []);

    useEffect(() => {
        const unsubscribe = subscribeUserData((nextUser) => {
            const nextTemplates = Array.isArray(nextUser?.templates) ? nextUser.templates : [];
            setTemplates((prev) => (templateListsEqual(prev, nextTemplates) ? prev : nextTemplates));
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        getPosts();
    }, []);


    // If another tab requests opening SelectPhotos, honor it on focus
    const lastOpenSigRef = React.useRef(0);
    useEffect(() => {
        const unsub = navigation.addListener('focus', () => {
            try {
                const globalTemplates = Array.isArray(global?.userData?.templates) ? global.userData.templates : [];
                setTemplates((prev) => (templateListsEqual(prev, globalTemplates) ? prev : globalTemplates));
            } catch {}
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
            <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
            <View style={styles.body_ctnr} onLayout={handleProfileTopLayout}>
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
                <ProfileInfo
                    userData={userData}
                    pfp={pfp}
                    onPressFollowers={() => { setFollowListMode('followers'); setIsFollowListVisible(true); }}
                    onPressFollowing={() => { setFollowListMode('following'); setIsFollowListVisible(true); }}
                />
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
                templates={templates}
                completedWorkouts={(global?.userData?.completedWorkouts || [])}
                navigation={navigation}
                onOpenWorkout={openWorkoutViewer}
                topContentHeight={profileTopHeight}
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

            <FollowListBottomSheet
                isVisible={isFollowListVisible}
                setIsVisible={setIsFollowListVisible}
                title={followListMode === 'followers' ? 'Followers' : 'Following'}
                users={followListMode === 'followers' ? (userData?.followers || []) : (userData?.following || [])}
                navigation={navigation}
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

import scaleSize from "../helper/scaleSize";

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        // Match Feed background for cohesion
        backgroundColor: theme.bg,
    },
    body_ctnr: {
        paddingHorizontal: scaleSize(10),
        paddingBottom: scaleSize(14),
    },
});
