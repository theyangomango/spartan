import React, { useEffect, useState, useCallback } from "react";
import { SafeAreaView, View, StatusBar, ScrollView } from "react-native";
import ProfileHeader from "../components/5_Profile/ProfileTop/ProfileHeader";
import ProfileInfo from "../components/5_Profile/ProfileTop/ProfileInfo";
import ProfileRowButtons from "../components/5_Profile/ProfileTop/ProfileRowButtons";
import WorkoutStats from "../components/5_Profile/ProfileTop/WorkoutStats";
import EditProfileBottomSheet from "../components/5_Profile/EditProfile/EditProfileBottomSheet";
import Footer from "../components/Footer";
import FollowListBottomSheet from "../components/FollowListBottomSheet";
import ProfileContentCards from "../components/5_Profile/ProfileBottom/ProfileContentCards";
import styles from "../components/5_Profile/profileScreenStyles";

import theme from "../theme/mfpDark";
import { subscribeUserData } from "../utils/userDataEvents";
import { onHexagonUpdate } from "../utils/hexagonEvents";
import { countLoggedFoods } from "../utils/loggedFoods";
import { clearFooterSuppression } from "../state/footerSuppressionStore";
import { resolvePhotoURL } from "../utils/profilePhoto";

export default function Profile({ navigation }) {
    const [, setRerender] = useState(0);
    useEffect(() => {
        const off = onHexagonUpdate(() => setRerender((x) => x + 1));
        return () => off && off();
    }, []);

    const [userData, setUserData] = useState(() => ({ ...(global?.userData || {}) }));

    const [isFollowListVisible, setIsFollowListVisible] = useState(false);
    const [followListMode, setFollowListMode] = useState('followers'); // or 'following'

    const [pfp, setPFP] = useState(() => resolvePhotoURL(global?.userData, ""));
    const [loggedFoodsCount, setLoggedFoodsCount] = useState(() => countLoggedFoods((global?.userData?.loggedFoods) || {}));
    const [isEditProfileBottomSheetVisible, setIsEditProfileBottomSheetVisible] = useState(false);

    useEffect(() => {
        const nextImage = resolvePhotoURL(userData, "");
        setPFP((prev) => (prev === nextImage ? prev : nextImage));
    }, [userData]);

    useEffect(() => {
        const unsub = navigation.addListener('focus', () => {
            clearFooterSuppression();
            setLoggedFoodsCount(countLoggedFoods((global?.userData?.loggedFoods) || {}));
        });
        return unsub;
    }, [navigation]);
    useEffect(() => {
        const unsubscribe = subscribeUserData((nextUser) => {
            const snapshot = nextUser || {};
            setUserData(snapshot);
            setLoggedFoodsCount(countLoggedFoods(snapshot.loggedFoods || {}));
        });
        return unsubscribe;
    }, []);

    const handleEditProfile = useCallback(() => {
        setIsEditProfileBottomSheetVisible(true);
    }, []);

    const bioValue = (userData?.bio ?? "").toString();

    function handleOpenViewStats() {
        // The stats screen follows the live user record for the signed-in user, so the uid is enough.
        const params = { user: { uid: userData?.uid }, transition: 'slide-from-right' };
        try {
            const rootNav = navigation?.getParent?.('ROOT');
            if (rootNav?.navigate) rootNav.navigate('UserStats', params);
            else navigation.navigate('UserStats', params);
        } catch { navigation.navigate('UserStats', params); }
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
                        userData={userData}
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
                        bioValue={bioValue}
                    />
                    <ProfileRowButtons
                        handleEditProfile={handleEditProfile}
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
                        workoutsCount={Array.isArray(userData?.completedWorkouts) ? userData.completedWorkouts.length : 0}
                        loggedFoodsCount={loggedFoodsCount}
                    />
                </View>
            </ScrollView>

            <EditProfileBottomSheet
                isVisible={isEditProfileBottomSheetVisible}
                setIsVisible={setIsEditProfileBottomSheetVisible}
                setPFP={setPFP}
            />
            <FollowListBottomSheet
                isVisible={isFollowListVisible}
                setIsVisible={setIsFollowListVisible}
                title={followListMode === 'followers' ? 'Followers' : 'Following'}
                users={followListMode === 'followers' ? (userData?.followers || []) : (userData?.following || [])}
                navigation={navigation}
            />

            <Footer currentScreenName={"Profile"} navigation={navigation} />
        </SafeAreaView>
    );
}
