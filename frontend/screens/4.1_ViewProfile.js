import React, { useCallback, useEffect, useState } from "react";
import { SafeAreaView, StyleSheet, View, StatusBar } from "react-native";
import Footer from "../components/Footer";
import ProfileBottomBottomSheet from "../components/5_Profile/ProfileBottom/ProfileBottomBottomSheet";
import ViewProfileRowButtons from "../components/ViewProfile/ViewProfileRowButtons";
import ViewProfileInfo from "../components/ViewProfile/ViewProfileInfo";
import ViewProfileHeader from "../components/ViewProfile/ViewProfileHeader";
import readDoc from "../../backend/helper/firebase/readDoc";
import readDocsByIds from "../../backend/helper/firebase/readDocsByIds";
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

import scaleSize from "../helper/scaleSize";

export default function ViewProfile({ navigation, route }) {
    const user = route.params.user;
    const [profileUserData, setProfileUserData] = useState(null);
    const [blockedFromViewing, setBlockedFromViewing] = useState(false);
    const [posts, setPosts] = useState([]);
    const [selectedPanel, setSelectedPanel] = useState('posts');
    const [isViewStatsBottomSheetVisible, setIsViewStatsBottomSheetVisible] = useState(false);
    const [isFollowListVisible, setIsFollowListVisible] = useState(false);
    const [followListMode, setFollowListMode] = useState('followers');
    const [viewerWorkout, setViewerWorkout] = useState(null);
    const [viewerToggle, setViewerToggle] = useState(false);
    const [isOptionsVisible, setIsOptionsVisible] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
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
    const closeViewer = useCallback(() => setViewerWorkout(null), []);

    useEffect(() => {
        getFullUserData();
    }, [user]);

    async function getFullUserData() {
        const data = await readDoc('users', user.uid);
        setProfileUserData(data);
        try {
            const meUid = String(global?.userData?.uid || '');
            const theirBlocked = Array.isArray(data?.blocked) ? data.blocked : [];
            const theyBlockedMe = theirBlocked.some((x) => String(x?.uid || x?.id || x) === meUid);
            // Also respect my derived blockedBy list if available
            const myBlockedBy = Array.isArray(global?.userData?.blockedBy) ? global.userData.blockedBy : [];
            const uid = String(data?.uid || user?.uid || '');
            const inMyBlockedBy = myBlockedBy.some((x) => String(x?.uid || x) === uid);
            setBlockedFromViewing(!!theyBlockedMe || !!inMyBlockedBy);
        } catch {
            setBlockedFromViewing(false);
        }
    }

    useEffect(() => {
        if (profileUserData) {
            getPosts();
        }
    }, [profileUserData]);

    useEffect(() => {
        // derive blocked status from global cache
        try {
            const list = Array.isArray(global?.userData?.blocked) ? global.userData.blocked : [];
            const targetUid = String(user?.uid || profileUserData?.uid || '');
            setIsBlocked(list.some((x) => String(x?.uid) === targetUid));
        } catch {
            setIsBlocked(false);
        }
    }, [profileUserData, user, (global?.userData?.blocked || []).length]);


    async function getPosts() {
        try {
            const ids = Array.isArray(profileUserData?.posts) ? profileUserData.posts : [];
            const n = ids.length;
            setPosts([]); // allow skeleton to render immediately
            if (!n) return;

            const buffer = new Array(n);

            // First screenful via a single batched read
            const firstChunk = ids.slice(0, 10);
            const tail = ids.slice(10);
            const firstDocs = await readDocsByIds('posts', firstChunk);
            firstDocs.forEach((doc, i) => { if (doc && !doc.pid) doc.pid = firstChunk[i]; buffer[i] = doc; });
            setPosts(buffer.filter(Boolean));

            // Remaining chunks concurrently, update as they land
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
            // Swallow for now; keep whatever loaded
        }
    }

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
    function handleOpenViewStats() { setIsViewStatsBottomSheetVisible(true); }

    if (blockedFromViewing) {
        return (
            <SafeAreaView style={styles.main_ctnr}>
                <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
                <View style={styles.body_ctnr}>
                    <ViewProfileHeader handle={headerHandle} goBack={goBack} toMessages={() => {}} onOpenOptions={() => {}} />
                </View>
                <Footer currentScreenName={'Profile'} navigation={navigation} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.main_ctnr}>
            <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
            <View style={styles.body_ctnr}>
                <ViewProfileHeader handle={headerHandle} goBack={goBack} toMessages={toMessages} onOpenOptions={() => setIsOptionsVisible(true)} />
                <ViewProfileInfo
                    userData={profileUserData}
                    onPressFollowers={() => { setFollowListMode('followers'); setIsFollowListVisible(true); }}
                    onPressFollowing={() => { setFollowListMode('following'); setIsFollowListVisible(true); }}
                />
                <ViewProfileRowButtons handleOpenViewStats={handleOpenViewStats} user={user} />
                <WorkoutStats userData={profileUserData} />
            </View>

            <ProfileBottomBottomSheet selectedPanel={selectedPanel}
                setSelectedPanel={setSelectedPanel}
                posts={posts}
                completedWorkouts={profileUserData && profileUserData.completedWorkouts}
                navigation={navigation}
                onOpenWorkout={openViewer}
            />
            <Footer currentScreenName={'Profile'} navigation={navigation} />

            <UserStatsBottomSheet
                user={profileUserData || user}
                navigation={navigation}
                isVisible={isViewStatsBottomSheetVisible}
                setIsVisible={setIsViewStatsBottomSheetVisible}
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
                onBlock={async () => {
                    try {
                        const me = global?.userData || {};
                        const other = profileUserData || user || {};
                        await blockUser(me, other);
                        try {
                            // Update local cache for consistency
                            const normalized = ({ uid: String(other?.uid||other?.id||''), handle: other?.handle||other?.username||'', name: other?.name||other?.displayName||'', pfp: other?.pfp||other?.image||other?.photoURL||'' });
                            const list = Array.isArray(global?.userData?.blocked) ? [...global.userData.blocked] : [];
                            if (!list.some(x => String(x?.uid) === normalized.uid)) list.push(normalized);
                            global.userData.blocked = list;
                            // Also update local follow/follower arrays to reflect removal
                            try {
                                const meFollowing = Array.isArray(global?.userData?.following) ? [...global.userData.following] : [];
                                global.userData.following = meFollowing.filter((x) => String(x?.uid) !== normalized.uid);
                                const meFollowers = Array.isArray(global?.userData?.followers) ? [...global.userData.followers] : [];
                                global.userData.followers = meFollowers.filter((x) => String(x?.uid) !== normalized.uid);
                            } catch {}
                        } catch {}
                        setIsBlocked(true);
                    } catch {}
                }}
                onUnblock={async () => {
                    try {
                        const me = global?.userData || {};
                        const other = profileUserData || user || {};
                        await unblockUser(me, other);
                        try {
                            // Update local cache for consistency
                            const targetUid = String(other?.uid||other?.id||'');
                            const list = Array.isArray(global?.userData?.blocked) ? [...global.userData.blocked] : [];
                            global.userData.blocked = list.filter((x) => String(x?.uid) !== targetUid);
                        } catch {}
                        setIsBlocked(false);
                    } catch {}
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        // Match Feed background for cohesion
        backgroundColor: theme.bg,
    },
    body_ctnr: {
        height: '45%',
        paddingHorizontal: scaleSize(10),
    }
});
