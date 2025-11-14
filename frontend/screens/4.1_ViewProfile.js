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
import { db } from "../../firebase.config";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import scaleSize from "../helper/scaleSize";
import { coerceUid, ensureUidArray, normalizeUserRef } from "../utils/userRefs";
import useReportContentSheet from "../hooks/useReportContentSheet";

const DIRECT_DM_LOOKUP_CACHE = new Map();

const makePairKey = (a, b) => {
    const left = String(a || "").trim();
    const right = String(b || "").trim();
    if (!left || !right) return "";
    return [left, right].sort().join("::");
};

const upsertLocalMessageEntry = (entry) => {
    if (!entry || !entry.mid) return;
    try {
        const prev = Array.isArray(global?.userData?.messages) ? [...global.userData.messages] : [];
        const idx = prev.findIndex((record) => String(record?.mid || "") === entry.mid);
        if (idx >= 0) prev[idx] = { ...prev[idx], ...entry };
        else prev.push(entry);
        global.userData.messages = prev;
    } catch {}
};

const resolveParticipants = (rawUsers, fallback, selfUid) => {
    const participants = Array.isArray(rawUsers)
        ? rawUsers
            .map((entry) => normalizeUserRef(entry))
            .filter((entry) => entry && entry.uid && entry.uid !== selfUid)
        : [];
    if (participants.length > 0) return participants;
    if (fallback && fallback.uid && fallback.uid !== selfUid) return [fallback];
    return [];
};

const lookupRemoteDirectChat = async (selfUid, otherUid, fallbackOtherUser) => {
    const viewer = String(selfUid || "").trim();
    const target = String(otherUid || "").trim();
    if (!viewer || !target) return null;
    const cacheKey = makePairKey(viewer, target);
    if (!cacheKey) return null;
    if (DIRECT_DM_LOOKUP_CACHE.has(cacheKey)) {
        return DIRECT_DM_LOOKUP_CACHE.get(cacheKey);
    }

    const task = (async () => {
        try {
            const messagesRef = collection(db, "messages");
            const q = query(messagesRef, where("memberUids", "array-contains", viewer), limit(50));
            const snapshot = await getDocs(q);
            for (const docSnap of snapshot.docs) {
                const data = docSnap.data() || {};
                const memberUids = ensureUidArray(
                    data.memberUids ||
                    data.members ||
                    data.memberUidList ||
                    data.users ||
                    []
                );
                if (!memberUids.includes(viewer) || !memberUids.includes(target)) continue;
                const isGroup = data.isGroup === true || memberUids.length > 2;
                if (isGroup) continue;
                const chatData = { ...data, cid: data.cid || docSnap.id };
                const participants = resolveParticipants(chatData.users, fallbackOtherUser, viewer);
                upsertLocalMessageEntry({ mid: chatData.cid, otherUsers: participants });
                return { chatData, participants };
            }
        } catch (err) {
            console.log("[ViewProfile] remote chat lookup failed", err?.message || err);
        }
        return null;
    })();

    const wrapped = task.finally(() => {
        DIRECT_DM_LOOKUP_CACHE.delete(cacheKey);
    });

    DIRECT_DM_LOOKUP_CACHE.set(cacheKey, wrapped);
    return wrapped;
};

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
        const safeNormalize = (raw) => {
            const normalized = normalizeUserRef(raw);
            if (normalized) return normalized;
            const uid = coerceUid(raw);
            if (!uid) return null;
            return {
                uid,
                handle: raw?.handle || raw?.username || "",
                name: raw?.name || raw?.displayName || "",
                pfp: raw?.pfp || raw?.image || raw?.photoURL || "",
            };
        };

        const selfUser = safeNormalize(global?.userData || {});
        const otherUser = chatTargetRef || safeNormalize(profileUserData || user || {});
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
            source: "profile-view",
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
