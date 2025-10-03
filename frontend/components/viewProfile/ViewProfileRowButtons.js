import RNBounceable from "@freakycoder/react-native-bounceable";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View, Text, Dimensions } from "react-native";
import followUser from "../../../backend/user/followUser";
import unfollowUser from "../../../backend/user/unfollowUser";
import cancelFollowRequest from "../../../backend/user/cancelFollowRequest";
import theme from "../../theme/mfpDark";
import scaleSizeGlobal from "../../helper/scaleSize";
import { withStrongPress } from "../../utils/haptics";
import { subscribeUserData } from "../../utils/userDataEvents";

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375; // Base screen width assumed as 375

function scaleSize(size) {
    return Math.round(size * scale);
}

export default function ViewProfileRowButtons({ handleOpenViewStats, user }) {
    const targetIsPrivate = Boolean(
        user?.settings?.profilePrivate ??
        user?.profilePrivate ??
        user?.isPrivate ??
        user?.privateProfile ??
        user?.private
    );

    const deriveInitialState = () => {
        const viewer = (() => { try { return global?.userData || {}; } catch { return {}; } })();
        const targetUid = String(user?.uid || user?.id || '');
        if (!targetUid) return 'none';

        const isFollowing = Array.isArray(viewer?.following)
            ? viewer.following.some((f) => String(f?.uid || f?.id || f) === targetUid)
            : false;
        if (isFollowing) return 'following';

        const isRequested = Array.isArray(viewer?.followRequestsOut)
            ? viewer.followRequestsOut.some((f) => String(f?.uid || f?.id || f) === targetUid)
            : false;
        if (isRequested) return 'requested';

        return 'none';
    };

    const [followState, setFollowState] = useState(deriveInitialState);
    const pendingRef = useRef(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeUserData(() => {
            setFollowState(deriveInitialState());
        });
        return unsubscribe;
    // deriveInitialState closes over `user`
    }, [String(user?.uid || user?.id || '')]);

    const normalizeRef = (u) => ({
        uid: String(u?.uid || u?.id || ''),
        handle: u?.handle || '',
        name: u?.name || '',
        pfp: u?.pfp || u?.image || u?.photoURL || '',
    });

    const applyStateToGlobal = (state, otherRef) => {
        const targetUid = otherRef?.uid;
        if (!targetUid) return;
        try {
            if (!global.userData || typeof global.userData !== 'object') {
                global.userData = {};
            }
            const followingList = Array.isArray(global?.userData?.following) ? [...global.userData.following] : [];
            const requestsList = Array.isArray(global?.userData?.followRequestsOut) ? [...global.userData.followRequestsOut] : [];

            const removeByUid = (list) => list.filter((x) => String(x?.uid || x?.id || x) !== targetUid);

            if (state === 'following') {
                const exists = followingList.some((x) => String(x?.uid || x?.id || x) === targetUid);
                if (!exists) followingList.push(otherRef);
                global.userData.following = followingList;
                global.userData.followRequestsOut = removeByUid(requestsList);
            } else if (state === 'requested') {
                const exists = requestsList.some((x) => String(x?.uid || x?.id || x) === targetUid);
                if (!exists) requestsList.push(otherRef);
                global.userData.followRequestsOut = requestsList;
                global.userData.following = removeByUid(followingList);
            } else {
                global.userData.following = removeByUid(followingList);
                global.userData.followRequestsOut = removeByUid(requestsList);
            }
        } catch {}
    };

    const updateState = (nextState, otherRef) => {
        setFollowState(nextState);
        applyStateToGlobal(nextState, otherRef);
    };

    const toggleFollow = async () => {
        if (pendingRef.current || busy) return; // prevent spamming while a write is in-flight
        pendingRef.current = true; setBusy(true);

        const me = normalizeRef(global?.userData || {});
        const other = normalizeRef(user || {});
        const prevState = followState;

        try {
            if (followState === 'following') {
                updateState('none', other);
                await unfollowUser(me, other);
            } else if (followState === 'requested') {
                updateState('none', other);
                await cancelFollowRequest(me, other);
            } else {
                const optimisticState = targetIsPrivate ? 'requested' : 'following';
                updateState(optimisticState, other);
                const result = await followUser(me, other);
                const nextStatus = result?.status === 'following'
                    ? 'following'
                    : (result?.status === 'requested' ? 'requested' : 'none');
                updateState(nextStatus, other);
            }
        } catch (err) {
            updateState(prevState, other);
        } finally {
            pendingRef.current = false; setBusy(false);
        }
    };

    const isFollowing = followState === 'following';
    const isRequested = followState === 'requested';
    const buttonLabel = isFollowing ? "Following" : isRequested ? "Requested" : "Follow";
    const buttonStyle = isFollowing
        ? styles.following_button
        : isRequested
            ? styles.requested_button
            : styles.follow_button;
    const textStyle = isFollowing
        ? styles.following_button_text
        : isRequested
            ? styles.requested_button_text
            : styles.follow_button_text;

    return (
        <View style={styles.row}>
            <RNBounceable style={styles.flex} onPress={withStrongPress(toggleFollow)} disabled={busy}>
                <View style={[styles.flex, buttonStyle]}>
                    <Text style={textStyle}>
                        {buttonLabel}
                    </Text>
                </View>
            </RNBounceable>
            <RNBounceable style={styles.flex} onPress={withStrongPress(handleOpenViewStats)}>
                <View style={[styles.view_stats_button, styles.flex]}>
                    <Text style={styles.view_stats_button_text}>View Stats</Text>
                </View>
            </RNBounceable>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        marginHorizontal: scaleSize(5),
        marginTop: scaleSize(10),
        flexDirection: 'row',
        justifyContent: 'space-around',
        height: scaleSize(32),
    },
    flex: {
        flex: 1,
    },
    follow_button: {
        paddingHorizontal: scaleSize(20),
        borderRadius: scaleSize(10),
        backgroundColor: theme.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: scaleSize(3),
    },
    following_button: {
        paddingHorizontal: scaleSize(20),
        borderRadius: scaleSize(10),
        backgroundColor: theme.surface,
        borderWidth: scaleSize(1.2),
        borderColor: theme.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: scaleSize(3),
    },
    requested_button: {
        paddingHorizontal: scaleSize(20),
        borderRadius: scaleSize(10),
        backgroundColor: 'rgba(53, 159, 252, 0.12)',
        borderWidth: scaleSize(1.2),
        borderColor: theme.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: scaleSize(3),
    },
    view_stats_button: {
        paddingHorizontal: scaleSize(20),
        borderRadius: scaleSize(10),
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderWidth: scaleSize(1),
        borderColor: theme.hairline,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: scaleSize(3),
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: scaleSizeGlobal(6),
        shadowOffset: { width: 0, height: scaleSizeGlobal(3) },
        elevation: 2,
    },
    follow_button_text: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: scaleSizeGlobal(12.5),
        color: '#fff',
    },
    following_button_text: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: scaleSizeGlobal(12.5),
        color: theme.primary,
    },
    requested_button_text: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: scaleSizeGlobal(12.5),
        color: theme.primary,
    },
    view_stats_button_text: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: scaleSizeGlobal(12.5),
        color: '#E5E7EB',
    },
});
