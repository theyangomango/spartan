import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SafeAreaView, View, StatusBar, ScrollView, Alert } from "react-native";
import Footer from "../components/Footer";
import ProfileContentCards from "../components/5_Profile/ProfileBottom/ProfileContentCards";
import styles from "../components/5_Profile/profileScreenStyles";
import ViewProfileRowButtons from "../components/ViewProfile/ViewProfileRowButtons";
import { filterViewableWorkouts, canViewerAccessProfile } from "../utils/workoutPrivacy";
import ViewProfileInfo from "../components/ViewProfile/ViewProfileInfo";
import ViewProfileHeader from "../components/ViewProfile/ViewProfileHeader";
import { lookupRemoteDirectChat, upsertLocalMessageEntry } from "../components/ViewProfile/directChat";
import readDoc from "../../backend/helper/firebase/readDoc";
import WorkoutStats from "../components/5_Profile/ProfileTop/WorkoutStats";
import createChat from "../../backend/messages/createChat";
import makeID from "../../backend/helper/makeID";
import arrayAppend from "../../backend/helper/firebase/arrayAppend";
import theme from "../theme/mfpDark";
import FollowListBottomSheet from "../components/FollowListBottomSheet";
import ViewProfileOptionsSheet from "../components/ViewProfile/ViewProfileOptionsSheet";
import blockUser from "../../backend/user/blockUser";
import unblockUser from "../../backend/user/unblockUser";
import { useFocusEffect } from "@react-navigation/native";
import { clearFooterSuppression } from "../state/footerSuppressionStore";
import { countLoggedFoods } from "../utils/loggedFoods";
import { coerceUid, ensureUidArray, normalizeUserRef } from "../utils/userRefs";
import useReportContentSheet from "../hooks/useReportContentSheet";

export default function ViewProfile({ navigation, route }) {
    const user = route.params.user;
    const [profileUserData, setProfileUserData] = useState(null);
    const [blockedFromViewing, setBlockedFromViewing] = useState(false);
    const [isFollowListVisible, setIsFollowListVisible] = useState(false);
    const [followListMode, setFollowListMode] = useState('followers');
    const [isOptionsVisible, setIsOptionsVisible] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const { openReportSheet, reportSheetNode } = useReportContentSheet();
    const chatTargetRef = useMemo(() => {
        const primary = normalizeUserRef(profileUserData || user || {});
        if (primary) return primary;
        const uid = coerceUid(profileUserData) || coerceUid(user);
        if (!uid) return null;
        return {
            uid,
            handle: profileUserData?.handle || user?.handle || profileUserData?.username || user?.username || "",
            name: profileUserData?.name || user?.name || profileUserData?.displayName || user?.displayName || "",
            pfp: profileUserData?.pfp || user?.pfp || profileUserData?.image || user?.image || profileUserData?.photoURL || user?.photoURL || "",
        };
    }, [profileUserData, user]);

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

    useEffect(() => {
        getFullUserData();
    }, [user]);

    async function getFullUserData() {
        if (!user?.uid) return;
        try {
            const targetUid = String(user.uid);
            const viewerUid = (() => {
                try { return String(global?.userData?.uid || ""); } catch { return ""; }
            })();
            const isViewingSelf = viewerUid && viewerUid === targetUid;

            const publicData = await readDoc("usersPublic", targetUid).catch(() => null);
            const privateData = isViewingSelf
                ? await readDoc("usersPrivate", targetUid).catch(() => null)
                : null;

            const merged = {
                ...(user || {}),
                ...(publicData || {}),
                ...(isViewingSelf && privateData ? privateData : {}),
            };
            if (!merged.uid) merged.uid = targetUid;
            setProfileUserData(merged);

            try {
                const meUid = viewerUid;
                const theirBlockedUids = ensureUidArray((privateData?.blockedUidList || privateData?.blocked));
                const theyBlockedMe = Boolean(privateData && theirBlockedUids.includes(meUid));
                const myBlockedBy = ensureUidArray(global?.userData?.blockedByUidList || global?.userData?.blockedBy);
                const uid = coerceUid(publicData) || coerceUid(privateData) || coerceUid(user);
                const inMyBlockedBy = uid ? myBlockedBy.includes(uid) : false;
                setBlockedFromViewing(Boolean(theyBlockedMe || inMyBlockedBy));
            } catch {
                setBlockedFromViewing(false);
            }
        } catch (err) {
            console.log("getFullUserData error", err?.message || err);
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

    useEffect(() => {
        try {
            const viewerUid = String(global?.userData?.uid || "");
            const targetUid = chatTargetRef?.uid || "";
            if (!viewerUid || !targetUid || viewerUid === targetUid) return;
            lookupRemoteDirectChat(viewerUid, targetUid, chatTargetRef);
        } catch {}
    }, [chatTargetRef]);
    async function toMessages() {
        const selfUser = normalizeUserRef(global?.userData || {});
        const otherUser = chatTargetRef || normalizeUserRef(profileUserData || user || {});
        const selfUid = selfUser?.uid || "";
        const otherUid = otherUser?.uid || "";
        if (!selfUid || !otherUid) return;

        const fallbackParticipants = otherUser ? [otherUser] : [];
        const navigateToChat = (cid, participants = []) => {
            if (!cid) return;
            const others = Array.isArray(participants) && participants.length > 0 ? participants : fallbackParticipants;
            navigation.navigate("Chat", { data: { cid }, usersExcludingSelf: others });
        };

        const list = Array.isArray(global?.userData?.messages) ? global.userData.messages : [];
        for (const msg of list) {
            const others = Array.isArray(msg?.otherUsers) ? msg.otherUsers : [];
            if (others.length === 1 && String(others[0]?.uid) === otherUid && msg?.mid) {
                navigateToChat(msg.mid, others);
                return;
            }
        }

        const remoteMatch = await lookupRemoteDirectChat(selfUid, otherUid, otherUser);
        if (remoteMatch?.chatData?.cid) {
            navigateToChat(remoteMatch.chatData.cid, remoteMatch.participants);
            return;
        }

        const cid = makeID();
        upsertLocalMessageEntry({ mid: cid, otherUsers: fallbackParticipants });

        const appendPromise = arrayAppend("usersPrivate", selfUid, "messages", {
            mid: cid,
            otherUsers: fallbackParticipants,
        }).catch((err) => {
            console.log("[ViewProfile] failed to append chat entry", err?.message || err);
        });

        try {
            const participants = [otherUser, selfUser].filter(Boolean);
            const newChat = await createChat(selfUid, participants, cid);
            await appendPromise;
            navigateToChat(newChat?.cid || cid, fallbackParticipants);
        } catch (err) {
            console.log("[ViewProfile] createChat failed", err?.message || err);
            Alert.alert("Chat unavailable", "We couldn't start this conversation. Please try again.");
        }
    }

    async function goBack() {
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
    function handleOpenViewStats() {
        navigation.navigate('UserStats', { user: profileUserData || user, transition: 'slide-from-right' });
    }

    const handleReportProfile = useCallback(() => {
        openReportSheet({
            targetType: "profile",
            targetId: reportProfileUid || `profile-${Date.now()}`,
            ownerUid: reportProfileUid,
            ownerHandle: profileHandleNormalized,
            source: "profile-view",
            metadata: {
                displayName: profileDisplayName,
            },
        });
    }, [openReportSheet, profileDisplayName, profileHandleNormalized, reportProfileUid]);

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

    if (blockedFromViewing) {
        return (
            <SafeAreaView style={styles.main_ctnr}>
                <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
                <View style={styles.body_ctnr}>
                    <ViewProfileHeader
                        handle={headerHandle}
                        user={profileUserData || user}
                        goBack={goBack}
                        toMessages={() => {}}
                        onOpenOptions={() => {}}
                        isVerified={isVerifiedProfile}
                    />
                </View>
                <Footer currentScreenName={'Profile'} navigation={navigation} />
            </SafeAreaView>
        );
    }

    const handleBlock = async () => {
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
    };

    const handleUnblock = async () => {
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
    };

    return (
        <SafeAreaView style={styles.main_ctnr}>
            <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
            >
                <View style={styles.body_ctnr}>
                    <ViewProfileHeader
                        handle={headerHandle}
                        user={profileUserData || user}
                        goBack={goBack}
                        toMessages={toMessages}
                        onOpenOptions={() => setIsOptionsVisible(true)}
                        isVerified={isVerifiedProfile}
                    />
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

            <FollowListBottomSheet
                isVisible={isFollowListVisible}
                setIsVisible={setIsFollowListVisible}
                title={followListMode === 'followers' ? 'Followers' : 'Following'}
                users={followListMode === 'followers' ? (profileUserData?.followers || []) : (profileUserData?.following || [])}
                navigation={navigation}
            />

            {/* Options bottom sheet from header handle/chevron */}
            <ViewProfileOptionsSheet
                isVisible={isOptionsVisible}
                setIsVisible={setIsOptionsVisible}
                handle={headerHandle}
                isBlocked={isBlocked}
                onReport={handleReportProfile}
                onBlock={handleBlock}
                onUnblock={handleUnblock}
            />
            {reportSheetNode}
        </SafeAreaView>
    );
}
