import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SafeAreaView, StyleSheet, View, StatusBar, ScrollView, Alert } from "react-native";
import Footer from "../components/Footer";
import ProfileContentCards from "../components/5_Profile/ProfileBottom/ProfileContentCards";
import ViewProfileRowButtons from "../components/ViewProfile/ViewProfileRowButtons";
import { filterViewableWorkouts, canViewerAccessProfile } from "../utils/workoutPrivacy";
import ViewProfileInfo from "../components/ViewProfile/ViewProfileInfo";
import ViewProfileHeader from "../components/ViewProfile/ViewProfileHeader";
import readDoc from "../../backend/helper/firebase/readDoc";
import WorkoutStats from "../components/5_Profile/ProfileTop/WorkoutStats";
import UserStatsBottomSheet from "../components/2_Competition/UserStats/UserStatsBottomSheet";
import createChat from "../../backend/messages/createChat";
import makeID from "../../backend/helper/makeID";
import arrayAppend from "../../backend/helper/firebase/arrayAppend";
import FeedWorkoutViewerSheet from "../components/1_Feed/ViewWorkout/FeedWorkoutViewerSheet";
import theme from "../theme/mfpDark";
import FollowListBottomSheet from "../components/FollowListBottomSheet";
import ViewProfileOptionsSheet from "../components/ViewProfile/ViewProfileOptionsSheet";
import blockUser from "../../backend/user/blockUser";
import unblockUser from "../../backend/user/unblockUser";
import { useFocusEffect } from "@react-navigation/native";
import { clearFooterSuppression } from "../state/footerSuppressionStore";
import { countLoggedFoods } from "../utils/loggedFoods";

import scaleSize from "../helper/scaleSize";
import { coerceUid, ensureUidArray, normalizeUserRef } from "../utils/userRefs";
import useReportContentSheet from "../hooks/useReportContentSheet";

export default function ViewProfile({ navigation, route }) {
    const user = route.params.user;
    const [profileUserData, setProfileUserData] = useState(null);
    const [blockedFromViewing, setBlockedFromViewing] = useState(false);
    const [isViewStatsBottomSheetVisible, setIsViewStatsBottomSheetVisible] = useState(false);
    const [isFollowListVisible, setIsFollowListVisible] = useState(false);
    const [followListMode, setFollowListMode] = useState('followers');
    const [viewerWorkout, setViewerWorkout] = useState(null);
    const [viewerToggle, setViewerToggle] = useState(false);
    const [isOptionsVisible, setIsOptionsVisible] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const { openReportSheet, reportSheetNode } = useReportContentSheet();

    const reportProfileUid = useMemo(
        () => coerceUid(profileUserData) || coerceUid(user) || '',
        [profileUserData, user]
    );

    const profileDisplayName = useMemo(() => {
        const candidates = [
            profileUserData?.name,
            user?.name,
            profileUserData?.handle,
            user?.handle,
        ];
        const found = candidates.find((val) => typeof val === 'string' && val.trim());
        return found ? String(found).trim() : '';
    }, [profileUserData?.handle, profileUserData?.name, user?.handle, user?.name]);

    useFocusEffect(
        useCallback(() => {
            clearFooterSuppression();
            return undefined;
        }, [])
    );
    const openViewer = useCallback((wk) => {
        if (!wk) { setViewerWorkout(null); return; }
        const fallback = {
            wid: wk?.wid || wk?.id,
            creatorUID: wk?.creatorUID || wk?.creatorUid || (user?.uid || ''),
            created: wk?.created || wk?.createdAt || Date.now(),
            exercises: Array.isArray(wk?.exercises) ? wk.exercises : [],
            duration: wk?.duration,
            volume: wk?.volume,
            reps: wk?.reps,
            PBs: wk?.PBs ?? wk?.pbs ?? 0,
            templateName: wk?.templateName || wk?.template?.name,
        };
        setViewerWorkout({ ...fallback, ...wk });
        setViewerToggle((t) => !t);
    }, [user?.uid]);
    const closeViewer = useCallback(() => {
        // Mirror Feed viewer: keep the cached workout so re-opening is instantaneous.
    }, []);

    useEffect(() => {
        getFullUserData();
    }, [user]);

    async function getFullUserData() {
        const data = await readDoc('users', user.uid);
        setProfileUserData(data);
        try {
            const meUid = String(global?.userData?.uid || '');
            const theirBlockedUids = ensureUidArray(data?.blockedUidList || data?.blocked);
            const theyBlockedMe = theirBlockedUids.includes(meUid);
            const myBlockedBy = ensureUidArray(global?.userData?.blockedByUidList || global?.userData?.blockedBy);
            const uid = coerceUid(data) || coerceUid(user);
            const inMyBlockedBy = uid ? myBlockedBy.includes(uid) : false;
            setBlockedFromViewing(Boolean(theyBlockedMe || inMyBlockedBy));
        } catch {
            setBlockedFromViewing(false);
        }
    }

    useEffect(() => {
        // derive blocked status from global cache
        try {
            const blockedList = ensureUidArray(global?.userData?.blockedUidList || global?.userData?.blocked);
            const targetUid = coerceUid(profileUserData) || coerceUid(user);
            if (!targetUid) {
                setIsBlocked(false);
                return;
            }
            setIsBlocked(blockedList.includes(targetUid));
        } catch {
            setIsBlocked(false);
        }
    }, [profileUserData, user, (global?.userData?.blockedUidList || global?.userData?.blocked || []).length]);
    async function toMessages() {
        // Normalize to avoid undefined fields in Firestore arrayUnion
        const normalizeRef = (u) => ({
            uid: String(u?.uid || u?.id || ''),
            handle: u?.handle || u?.username || '',
            name: u?.name || u?.displayName || '',
            pfp: u?.pfp || u?.image || u?.photoURL || '',
        });

        const list = Array.isArray(global?.userData?.messages) ? global.userData.messages : [];
        for (const msg of list) {
            if (Array.isArray(msg?.otherUsers) && msg.otherUsers.length === 1 && String(msg.otherUsers[0]?.uid) === String(user?.uid)) { // This DM
                const chatData = await readDoc('messages', msg.mid);
                navigation.navigate('Chat', { data: chatData, usersExcludingSelf: msg.otherUsers });
                return;
            }
        }

        const selfUser = normalizeRef(global?.userData || {});
        const otherUser = normalizeRef(profileUserData || user || {});
        const otherUid = otherUser.uid;
        if (!selfUser.uid || !otherUid) return;

        const cid = makeID();
        await arrayAppend('users', selfUser.uid, 'messages', {
            mid: cid,
            otherUsers: [otherUser]
        });
        await arrayAppend('users', otherUid, 'messages', {
            mid: cid,
            otherUsers: [selfUser]
        });

        const newChat = await createChat(selfUser.uid, [otherUser, selfUser], cid);
        navigation.navigate('Chat', { data: newChat, usersExcludingSelf: [otherUser] });
    }

    async function goBack() {
        // navigation.navigate('Explore');
        navigation.goBack();
    }

    const headerHandle = profileUserData?.handle || user?.handle || user?.username || '';
    const profileHandleNormalized = useMemo(() => (
        headerHandle ? String(headerHandle).replace(/^@+/, '') : ''
    ), [headerHandle]);
    const isVerifiedProfile = Boolean(
        profileUserData?.isVerified ??
        profileUserData?.verified ??
        user?.isVerified ??
        user?.verified ??
        false
    );
    function handleOpenViewStats() { setIsViewStatsBottomSheetVisible(true); }

    const handleReportProfile = useCallback(() => {
        openReportSheet({
            targetType: "profile",
            targetId: reportProfileUid || `profile-${Date.now()}`,
            ownerUid: reportProfileUid,
            ownerHandle: profileHandleNormalized,
            metadata: {
                displayName: profileDisplayName,
            },
        });
    }, [openReportSheet, profileDisplayName, profileHandleNormalized, reportProfileUid]);

    if (blockedFromViewing) {
        return (
            <SafeAreaView style={styles.main_ctnr}>
                <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
                <View style={styles.body_ctnr}>
                    <ViewProfileHeader handle={headerHandle} goBack={goBack} toMessages={() => {}} onOpenOptions={() => {}} isVerified={isVerifiedProfile} />
                </View>
                <Footer currentScreenName={'Profile'} navigation={navigation} />
            </SafeAreaView>
        );
    }

    const viewerData = (() => { try { return global?.userData || null; } catch { return null; } })();
    const viewerUid = viewerData?.uid ? String(viewerData.uid) : "";
    const profileUid = profileUserData?.uid
        ? String(profileUserData.uid)
        : String(user?.uid || '');
    const isViewingSelf = Boolean(profileUid && viewerUid && profileUid === viewerUid);
    const canViewContent = canViewerAccessProfile(profileUserData, viewerUid, viewerData);

    const visibleCompletedWorkouts = useMemo(() => (
        !canViewContent
            ? []
            : filterViewableWorkouts(profileUserData?.completedWorkouts || [], viewerUid, viewerData, profileUserData)
    ), [profileUserData?.completedWorkouts, viewerUid, viewerData, profileUserData, canViewContent]);

    const loggedFoodsCount = useMemo(() => (
        !isViewingSelf
            ? 0
            : countLoggedFoods(profileUserData?.loggedFoods || {})
    ), [profileUserData?.loggedFoods, isViewingSelf]);

    return (
        <SafeAreaView style={styles.main_ctnr}>
            <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
            >
                <View style={styles.body_ctnr}>
                    <ViewProfileHeader handle={headerHandle} goBack={goBack} toMessages={toMessages} onOpenOptions={() => setIsOptionsVisible(true)} isVerified={isVerifiedProfile} />
                    <ViewProfileInfo
                        userData={profileUserData}
                        onPressFollowers={() => { setFollowListMode('followers'); setIsFollowListVisible(true); }}
                        onPressFollowing={() => { setFollowListMode('following'); setIsFollowListVisible(true); }}
                    />
                    <ViewProfileRowButtons
                        handleOpenViewStats={handleOpenViewStats}
                        user={profileUserData || user}
                        isBlocked={isBlocked}
                        onBlockedPress={() => setIsOptionsVisible(true)}
                    />
                    <WorkoutStats userData={profileUserData} />
                </View>

                <View style={styles.cards_ctnr}>
                    <ProfileContentCards
                        onPressWorkoutsAndPosts={() => {
                            if (!canViewContent) return;
                            const targetUid = String(profileUserData?.uid || user?.uid || '');
                            if (!targetUid) return;
                            navigation.navigate('ProfileWorkoutsAndPosts', {
                                targetUid,
                                isViewingSelf: false,
                                initialUser: profileUserData || user || null,
                            });
                        }}
                        onPressLoggedFoods={() => {
                            if (!canViewContent || !isViewingSelf) return;
                            const targetUid = String(profileUserData?.uid || user?.uid || '');
                            if (!targetUid) return;
                            navigation.navigate('ProfileLoggedFoods', {
                                targetUid,
                                isViewingSelf,
                                initialUser: profileUserData || user || null,
                            });
                        }}
                        postsCount={canViewContent && Array.isArray(profileUserData?.posts) ? profileUserData.posts.length : 0}
                        workoutsCount={canViewContent ? visibleCompletedWorkouts.length : 0}
                        loggedFoodsCount={loggedFoodsCount}
                        contentLocked={!canViewContent}
                        lockedSubtitle={profileUserData?.settings?.profilePrivate ? 'Only approved followers can see these posts, workouts, and logged food items.' : ''}
                        loggedFoodsLocked={!isViewingSelf}
                    />
                </View>
            </ScrollView>
            <Footer currentScreenName={'Profile'} navigation={navigation} />

            <UserStatsBottomSheet
                user={profileUserData || user}
                navigation={navigation}
                isVisible={isViewStatsBottomSheetVisible}
                setIsVisible={setIsViewStatsBottomSheetVisible}
                heightRatio={0.88}
            />

            <FollowListBottomSheet
                isVisible={isFollowListVisible}
                setIsVisible={setIsFollowListVisible}
                title={followListMode === 'followers' ? 'Followers' : 'Following'}
                users={followListMode === 'followers' ? (profileUserData?.followers || []) : (profileUserData?.following || [])}
                navigation={navigation}
            />

            {/* Workout viewer bottom sheet (viewing other's profile) */}
            <FeedWorkoutViewerSheet
                expandToggle={viewerToggle}
                workout={viewerWorkout}
                friendUid={profileUserData?.uid || user?.uid}
                friendPfp={profileUserData?.image || profileUserData?.pfp || null}
                onClose={closeViewer}
            />

            {/* Options bottom sheet from header handle/chevron */}
            <ViewProfileOptionsSheet
                isVisible={isOptionsVisible}
                setIsVisible={setIsOptionsVisible}
                handle={headerHandle}
                isBlocked={isBlocked}
                onReport={handleReportProfile}
                onBlock={async () => {
                    const me = global?.userData || {};
                    const other = profileUserData || user || {};

                    const hadBlockedArray = Array.isArray(global?.userData?.blocked);
                    const prevBlocked = hadBlockedArray ? [...global.userData.blocked] : [];
                    const hadBlockedUidList = Array.isArray(global?.userData?.blockedUidList);
                    const prevBlockedUidList = ensureUidArray(global?.userData?.blockedUidList);
                    const prevFollowing = Array.isArray(global?.userData?.following) ? [...global.userData.following] : [];
                    const prevFollowers = Array.isArray(global?.userData?.followers) ? [...global.userData.followers] : [];

                    const normalized = normalizeUserRef(other);
                    const targetUid = normalized?.uid || coerceUid(other);

                    setIsOptionsVisible(false);
                    setIsBlocked(true);

                    if (normalized) {
                        const alreadyTracked = prevBlocked.some((entry) => coerceUid(entry) === normalized.uid);
                        global.userData.blocked = alreadyTracked ? [...prevBlocked] : [...prevBlocked, normalized];
                    } else if (hadBlockedArray) {
                        global.userData.blocked = [...prevBlocked];
                    }

                    if (targetUid) {
                        const nextBlockedUidList = prevBlockedUidList.includes(targetUid)
                            ? [...prevBlockedUidList]
                            : [...prevBlockedUidList, targetUid];
                        global.userData.blockedUidList = nextBlockedUidList;
                        global.userData.following = prevFollowing.filter((entry) => coerceUid(entry) !== targetUid);
                        global.userData.followers = prevFollowers.filter((entry) => coerceUid(entry) !== targetUid);
                    } else {
                        global.userData.blockedUidList = [...prevBlockedUidList];
                        global.userData.following = [...prevFollowing];
                        global.userData.followers = [...prevFollowers];
                    }

                    Alert.alert(
                        "User blocked",
                        "This user can no longer view your profile, message you, or appear in shared leaderboards and tribes."
                    );

                    try {
                        await blockUser(me, other);
                    } catch (err) {
                        console.log("block user failed", err?.message || err);
                        setIsBlocked(false);
                        if (hadBlockedArray) global.userData.blocked = prevBlocked; else delete global.userData.blocked;
                        if (hadBlockedUidList) global.userData.blockedUidList = prevBlockedUidList; else delete global.userData.blockedUidList;
                        global.userData.following = prevFollowing;
                        global.userData.followers = prevFollowers;
                        Alert.alert("Block failed", "We couldn't block this user. Please try again.");
                    }
                }}
                onUnblock={async () => {
                    const me = global?.userData || {};
                    const other = profileUserData || user || {};

                    const hadBlockedArray = Array.isArray(global?.userData?.blocked);
                    const prevBlocked = hadBlockedArray ? [...global.userData.blocked] : [];
                    const hadBlockedUidList = Array.isArray(global?.userData?.blockedUidList);
                    const prevBlockedUidList = ensureUidArray(global?.userData?.blockedUidList);
                    const targetUid = coerceUid(other);

                    setIsOptionsVisible(false);
                    setIsBlocked(false);

                    if (hadBlockedArray) {
                        global.userData.blocked = prevBlocked.filter((entry) => coerceUid(entry) !== targetUid);
                    }
                    if (hadBlockedUidList) {
                        global.userData.blockedUidList = prevBlockedUidList.filter((uid) => uid !== targetUid);
                    }

                    try {
                        await unblockUser(me, other);
                    } catch (err) {
                        console.log("unblock user failed", err?.message || err);
                        setIsBlocked(true);
                        if (hadBlockedArray) global.userData.blocked = prevBlocked; else delete global.userData.blocked;
                        if (hadBlockedUidList) global.userData.blockedUidList = prevBlockedUidList; else delete global.userData.blockedUidList;
                        Alert.alert("Unblock failed", "We couldn't unblock this user. Please try again.");
                    }
                }}
            />
            {reportSheetNode}
        </SafeAreaView>
    );
}

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
    }
});
