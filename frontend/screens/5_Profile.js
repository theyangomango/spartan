import React, { useEffect, useRef, useState, useCallback } from "react";
import { SafeAreaView, StyleSheet, View, StatusBar, ScrollView } from "react-native";
import ProfileHeader from "../components/5_Profile/ProfileTop/ProfileHeader";
import ProfileInfo from "../components/5_Profile/ProfileTop/ProfileInfo";
import ProfileRowButtons from "../components/5_Profile/ProfileTop/ProfileRowButtons";
import WorkoutStats from "../components/5_Profile/ProfileTop/WorkoutStats";
import EditProfileBottomSheet from "../components/5_Profile/EditProfile/EditProfileBottomSheet";
// ⬇️ swap OUT the old ViewStatsBottomSheet
// import ViewStatsBottomSheet from "../components/5_Profile/ViewStats/ViewStatsBottomSheet";
// ⬇️ and swap IN the Competition screen’s bottom sheet
import UserStatsBottomSheet from "../components/2_Competition/UserStats/UserStatsBottomSheet";
import Footer from "../components/Footer";
import FeedWorkoutViewerSheet from "../components/1_Feed/ViewWorkout/FeedWorkoutViewerSheet";
import FollowListBottomSheet from "../components/FollowListBottomSheet";
import ProfileContentCards from "../components/5_Profile/ProfileBottom/ProfileContentCards";

import theme from "../theme/mfpDark";
import { subscribeUserData } from "../utils/userDataEvents";
import { clearFooterSuppression } from "../state/footerSuppressionStore";

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
    const [templates, setTemplates] = useState(() => {
        const raw = userData?.templates;
        return Array.isArray(raw) ? raw : [];
    });
    const [isEditProfileBottomSheetVisible, setIsEditProfileBottomSheetVisible] = useState(false);

    // Reuse this flag to show the Competition-style UserStatsBottomSheet
    const [isViewStatsBottomSheetVisible, setIsViewStatsBottomSheetVisible] = useState(false);
    const [isFollowListVisible, setIsFollowListVisible] = useState(false);
    const [followListMode, setFollowListMode] = useState('followers'); // or 'following'

    const [pfp, setPFP] = useState(() => (global?.userData?.image || ""));

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
            privacyMode: wk?.privacyMode ?? 'global',
        };
        const normalized = { ...fallback, ...wk };
        if (!normalized.privacyMode) normalized.privacyMode = 'global';
        setProfileSelectedWorkout(normalized);
        setProfileWorkoutExpandToggle((t) => !t);
    }, []);
    const closeWorkoutViewer = useCallback(() => {
        // Intentionally leave the last workout cached; the sheet collapsing shouldn't
        // wipe the data so reopening is instant (mirrors Feed behaviour).
    }, []);

    useEffect(() => {
        const unsubscribe = subscribeUserData((nextUser) => {
            const nextTemplates = Array.isArray(nextUser?.templates) ? nextUser.templates : [];
            setTemplates((prev) => (templateListsEqual(prev, nextTemplates) ? prev : nextTemplates));
        });
        return unsubscribe;
    }, []);

    // If another tab requests opening SelectPhotos, honor it on focus
    const lastOpenSigRef = React.useRef(0);
    useEffect(() => {
        const unsub = navigation.addListener('focus', () => {
            clearFooterSuppression();
            try {
                const globalTemplates = Array.isArray(global?.userData?.templates) ? global.userData.templates : [];
                setTemplates((prev) => (templateListsEqual(prev, globalTemplates) ? prev : globalTemplates));
            } catch {}
            const sig = Number(global?.profileOpenSelectPhotosSignal || 0);
            if (sig && sig !== lastOpenSigRef.current) {
                lastOpenSigRef.current = sig;
                try { navigation.navigate('PostOptions', { images: [] }); } catch {}
            }
        });
        return unsub;
    }, [navigation]);

    function uploadPost() {
        navigation.navigate('PostOptions', {
            images: [],
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
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
            >
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

                <View style={styles.cards_ctnr}>
                    <ProfileContentCards
                        onPressWorkoutsAndPosts={() => {
                            navigation.navigate('ProfileWorkoutsAndPosts', {
                                targetUid: String(userData?.uid || ''),
                                isViewingSelf: true,
                                initialUser: userData || null,
                            });
                        }}
                        onPressTemplates={() => {
                            navigation.navigate('ProfileTemplates', {
                                targetUid: String(userData?.uid || ''),
                                isViewingSelf: true,
                                initialUser: userData || null,
                            });
                        }}
                        postsCount={Array.isArray(userData?.posts) ? userData.posts.length : 0}
                        workoutsCount={Array.isArray(global?.userData?.completedWorkouts) ? global.userData.completedWorkouts.length : 0}
                        templatesCount={Array.isArray(templates) ? templates.length : 0}
                    />
                </View>
            </ScrollView>

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

import scaleSize from "../helper/scaleSize";

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        // Match Feed background for cohesion
        backgroundColor: theme.bg,
    },
    scrollContent: {
        paddingBottom: scaleSize(120),
    },
    body_ctnr: {
        paddingHorizontal: scaleSize(10),
        paddingBottom: scaleSize(14),
    },
    cards_ctnr: {
        paddingHorizontal: scaleSize(14),
        paddingTop: scaleSize(12),
    },
});
