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
import { countLoggedFoods } from "../utils/loggedFoods";
import { clearFooterSuppression } from "../state/footerSuppressionStore";

export default function Profile({ navigation }) {
    const [, setRerender] = useState(0);
    useEffect(() => {
        const { onHexagonUpdate } = require('../utils/hexagonEvents');
        const off = onHexagonUpdate(() => setRerender((x) => x + 1));
        return () => off && off();
    }, []);
    const userData = global.userData || {};
    const [isEditProfileBottomSheetVisible, setIsEditProfileBottomSheetVisible] = useState(false);

    // Reuse this flag to show the Competition-style UserStatsBottomSheet
    const [isViewStatsBottomSheetVisible, setIsViewStatsBottomSheetVisible] = useState(false);
    const [isFollowListVisible, setIsFollowListVisible] = useState(false);
    const [followListMode, setFollowListMode] = useState('followers'); // or 'following'

    const [pfp, setPFP] = useState(() => (global?.userData?.image || ""));
    const [loggedFoodsCount, setLoggedFoodsCount] = useState(() => countLoggedFoods(userData?.loggedFoods || {}));

    // Workout viewer state (reuses Feed viewer)
    const [profileSelectedWorkout, setProfileSelectedWorkout] = useState(null);
    const [profileWorkoutExpandToggle, setProfileWorkoutExpandToggle] = useState(false);
    const openWorkoutViewer = useCallback((wk) => {
        if (!wk) { setProfileSelectedWorkout(null); return; }
        // Normalize minimal fields expected by SpectatingWorkoutModal
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

    // If another tab requests opening SelectPhotos, honor it on focus
    const lastOpenSigRef = React.useRef(0);
    useEffect(() => {
        const unsub = navigation.addListener('focus', () => {
            clearFooterSuppression();
            setLoggedFoodsCount(countLoggedFoods(global?.userData?.loggedFoods || {}));
            const sig = Number(global?.profileOpenSelectPhotosSignal || 0);
            if (sig && sig !== lastOpenSigRef.current) {
                lastOpenSigRef.current = sig;
                try { navigation.navigate('PostOptions', { images: [] }); } catch {}
            }
        });
        return unsub;
    }, [navigation]);
    useEffect(() => {
        const unsubscribe = subscribeUserData((nextUser) => {
            setLoggedFoodsCount(countLoggedFoods(nextUser?.loggedFoods || {}));
        });
        return unsubscribe;
    }, []);

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
                        onPressLoggedFoods={() => {
                            navigation.navigate('ProfileLoggedFoods', {
                                targetUid: String(userData?.uid || ''),
                                isViewingSelf: true,
                                initialUser: userData || null,
                            });
                        }}
                        postsCount={Array.isArray(userData?.posts) ? userData.posts.length : 0}
                        workoutsCount={Array.isArray(global?.userData?.completedWorkouts) ? global.userData.completedWorkouts.length : 0}
                        loggedFoodsCount={loggedFoodsCount}
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
                heightRatio={0.88}
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
        paddingHorizontal: 0,
        marginHorizontal: 0,
        paddingTop: scaleSize(12),
    },
});
