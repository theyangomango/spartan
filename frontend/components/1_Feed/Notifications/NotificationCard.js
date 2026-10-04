import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import FastImage from "react-native-fast-image";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { doc, onSnapshot } from "firebase/firestore";

import scaleSize from "../../../helper/scaleSize";
import theme from "../../../theme/mfpDark";
import getDisplayTimeDifference from "../../../helper/getDisplayTimeDifference";
import followUser from "../../../../backend/user/followUser";
import unfollowUser from "../../../../backend/user/unfollowUser";
import cancelFollowRequest from "../../../../backend/user/cancelFollowRequest";
import { usePfp } from "../../../helper/usePFPs";
import { subscribeUserData } from "../../../utils/userDataEvents";
import { strong as haptic, withStrongPress } from "../../../utils/haptics";
import { db } from "../../../../firebase.config";
import VerifiedHandle from "../../common/VerifiedHandle";
import { resolvePhotoURL } from "../../../utils/profilePhoto";
import styles from "./NotificationCard.styles";
import { mixHex, withAlpha } from "./notificationColors";
import { getDisplayMessage, normalizeUserRef, readUid } from "./notificationCardUtils";

const BRAND_ACCENT = theme.primary;
const followingBg = withAlpha('#3CB179', 0.22);
const followingBorder = withAlpha('#3CB179', 0.5);
const followingText = mixHex('#3CB179', '#F8FFF6', 0.12);

export default function NotificationCard({
    item,
    onPressCard,
    onAcceptWorkoutInvite,
    onAcceptFollowRequest,
    isFirst,
    isLast,
}) {
    const [acceptingInvite, setAcceptingInvite] = useState(false);
    const [respondingRequest, setRespondingRequest] = useState(false);
    const [followState, setFollowState] = useState('none');
    const [followBusy, setFollowBusy] = useState(false);
    const [inviteExpired, setInviteExpired] = useState(false);
    const pfpUri = usePfp(item?.uid, item?.pfpVersion ?? 0, resolvePhotoURL(item, item?.pfp || ""));

    const targetUid = useMemo(() => String(item?.uid || ''), [item?.uid]);

    const deriveFollowState = useCallback(() => {
        if (!targetUid) return 'none';
        try {
            const viewer = global?.userData || {};
            const isFollowing = Array.isArray(viewer?.following)
                ? viewer.following.some((f) => readUid(f) === targetUid)
                : false;
            if (isFollowing) return 'following';

            const isRequested = Array.isArray(viewer?.followRequestsOut)
                ? viewer.followRequestsOut.some((f) => readUid(f) === targetUid)
                : false;
            if (isRequested) return 'requested';
        } catch {}

        return 'none';
    }, [targetUid]);

    useEffect(() => {
        if (item?.type === 'follow') {
            setFollowState(deriveFollowState());
        }
    }, [deriveFollowState, item?.type]);

    useEffect(() => {
        if (item?.type !== 'follow') return undefined;
        const unsubscribe = subscribeUserData(() => {
            setFollowState(deriveFollowState());
        });
        return unsubscribe;
    }, [deriveFollowState, item?.type]);

    const applyFollowStateToGlobal = useCallback((state, otherRef) => {
        const otherUid = readUid(otherRef);
        if (!otherUid) return;

        try {
            if (!global.userData || typeof global.userData !== 'object') {
                global.userData = {};
            }

            const followingList = Array.isArray(global?.userData?.following) ? [...global.userData.following] : [];
            const requestsList = Array.isArray(global?.userData?.followRequestsOut) ? [...global.userData.followRequestsOut] : [];

            const removeByUid = (list) => list.filter((entry) => readUid(entry) !== otherUid);

            if (state === 'following') {
                const exists = followingList.some((entry) => readUid(entry) === otherUid);
                if (!exists) followingList.push(otherRef);
                global.userData.following = followingList;
                global.userData.followRequestsOut = removeByUid(requestsList);
            } else if (state === 'requested') {
                const exists = requestsList.some((entry) => readUid(entry) === otherUid);
                if (!exists) requestsList.push(otherRef);
                global.userData.followRequestsOut = requestsList;
                global.userData.following = removeByUid(followingList);
            } else {
                global.userData.following = removeByUid(followingList);
                global.userData.followRequestsOut = removeByUid(requestsList);
            }
        } catch {}
    }, []);

    const handleFollowToggle = useCallback(async () => {
        if (item?.type !== 'follow' || followBusy) return;
        try { haptic(); } catch {}

        const currentUser = normalizeUserRef(global?.userData || {});
        const notifUser = normalizeUserRef(item || {});
        if (!currentUser.uid || !notifUser.uid) return;

        const prevState = followState;
        const setState = (state) => {
            setFollowState(state);
            applyFollowStateToGlobal(state, notifUser);
        };

        setFollowBusy(true);
        try {
            if (followState === 'following') {
                setState('none');
                await unfollowUser(currentUser, notifUser);
            } else if (followState === 'requested') {
                setState('none');
                await cancelFollowRequest(currentUser, notifUser);
            } else {
                setState('requested');
                const result = await followUser(currentUser, notifUser);
                const nextStatus = result?.status === 'following'
                    ? 'following'
                    : result?.status === 'requested'
                        ? 'requested'
                        : 'none';
                setState(nextStatus);
            }
        } catch (err) {
            setState(prevState);
        } finally {
            setFollowBusy(false);
        }
    }, [applyFollowStateToGlobal, followBusy, followState, item]);

    const timeAgo = getDisplayTimeDifference(
        (typeof item?.timestamp === 'number')
            ? item.timestamp
            : (item?.timestamp?.toMillis?.() || (typeof item?.timestamp?.seconds === 'number' ? item.timestamp.seconds * 1000 : Date.parse(item?.timestamp) || 0)),
        Date.now()
    );

    const unread = item?.read === false;

    const inviteMetadata = item?.metadata || {};
    const inviteWid = String(item?.wid || inviteMetadata?.wid || "");
    const inviteStatus = item?.inviteStatus || inviteMetadata?.inviteStatus || "";

    const showAcceptAction = item?.type === "workout-invite" && typeof onAcceptWorkoutInvite === "function";
    const inviteAccepted = showAcceptAction && inviteStatus === "accepted";

    const requestStatus = String(item?.requestStatus || inviteMetadata?.requestStatus || '').toLowerCase();
    const showFollowRequestActions = item?.type === "follow-request" && typeof onAcceptFollowRequest === "function";
    const requestHandled = showFollowRequestActions && (requestStatus === 'accepted' || requestStatus === 'declined');

    useEffect(() => {
        if (!showAcceptAction || inviteAccepted) {
            setInviteExpired(false);
            return undefined;
        }

        const wid = inviteWid;
        const inviterUid = String(item?.uid || "");
        if (!wid || !inviterUid) {
            setInviteExpired(true);
            return undefined;
        }

        let mounted = true;
        const evaluate = (data) => {
            if (!mounted) return;
            const current = data?.currentWorkout || null;
            const primaryWid = String(current?.wid || "");
            const matchesPrimary = primaryWid === wid;

            const rawCollection = data?.currentWorkouts;
            let matchesCollection = false;
            if (Array.isArray(rawCollection)) {
                matchesCollection = rawCollection.some((entry) => {
                    if (!entry) return false;
                    if (typeof entry === "string") return String(entry) === wid;
                    const candidate = entry?.wid || entry?.id || entry?.key;
                    return String(candidate || "") === wid;
                });
            } else if (rawCollection && typeof rawCollection === "object") {
                const values = Object.values(rawCollection);
                matchesCollection = values.some((entry) => {
                    if (!entry) return false;
                    if (typeof entry === "string") return String(entry) === wid;
                    const candidate = entry?.wid || entry?.id || entry?.key;
                    return String(candidate || "") === wid;
                }) || Object.keys(rawCollection).some((key) => String(key || "") === wid);
            }

            setInviteExpired(!(matchesPrimary || matchesCollection));
        };

        let unsubscribe;
        try {
            unsubscribe = onSnapshot(
                doc(db, "users", inviterUid),
                (snap) => evaluate(snap.data() || {}),
                () => {
                    if (mounted) setInviteExpired(false);
                }
            );
        } catch {
            setInviteExpired(false);
            return undefined;
        }

        return () => {
            mounted = false;
            if (typeof unsubscribe === "function") unsubscribe();
        };
    }, [showAcceptAction, inviteAccepted, inviteWid, item?.uid]);

    const handleAcceptInvite = async () => {
        if (!showAcceptAction || inviteAccepted || acceptingInvite || inviteExpired) return;
        try { haptic(); } catch {}
        setAcceptingInvite(true);
        try {
            await onAcceptWorkoutInvite();
        } catch (err) {
            console.log('accept workout invite notification error', err);
        } finally {
            setAcceptingInvite(false);
        }
    };

    const handleAcceptFollowRequest = async () => {
        if (!showFollowRequestActions || respondingRequest || requestHandled) return;
        try { haptic(); } catch {}
        setRespondingRequest(true);
        try {
            await onAcceptFollowRequest();
        } catch (err) {
            console.log('accept follow request notification error', err);
        } finally {
            setRespondingRequest(false);
        }
    };


    const palette = useMemo(() => {
        const workoutAccent = item?.type === "friend-workout-started";
        const accentHex = workoutAccent ? "#FF6B54" : BRAND_ACCENT;
        const buttonBg = withAlpha(accentHex, 0.16);
        const buttonBgActive = withAlpha(accentHex, 0.26);
        const buttonBorder = withAlpha(accentHex, 0.4);
        const buttonBorderActive = withAlpha(accentHex, 0.55);
        const buttonText = mixHex(accentHex, "#F5F8FF", 0.15);
        const buttonTextActive = mixHex("#FFFFFF", accentHex, 0.18);
        const solidButtonBg = mixHex(accentHex, "#111827", 0.45);
        const solidButtonBgDisabled = withAlpha(accentHex, 0.22);

        return {
            accent: accentHex,
            buttonBg,
            buttonBgActive,
            buttonBorder,
            buttonBorderActive,
            buttonText,
            buttonTextActive,
            solidButtonBg,
            solidButtonBgDisabled,
        };
    }, [item?.type]);

    const {
        accent,
        buttonBg,
        buttonBgActive,
        buttonBorder,
        buttonBorderActive,
        buttonText,
        buttonTextActive,
        solidButtonBg,
        solidButtonBgDisabled,
    } = palette;

    const isFollowing = followState === 'following';
    const isRequested = followState === 'requested';
    const requestedButtonBg = withAlpha(accent, 0.12);
    const requestedButtonBorder = withAlpha(accent, 0.35);
    const requestedButtonText = mixHex(accent, "#F5F8FF", 0.28);

    const cardStyles = [styles.card];
    if (isFirst) cardStyles.push(styles.firstCard);
    if (isLast) cardStyles.push(styles.lastCard);

    const followAction = item.type === "follow"
        ? (
            <RNBounceable
                style={[
                    styles.actionButton,
                    { backgroundColor: buttonBg, borderColor: buttonBorder },
                    isFollowing && { backgroundColor: followingBg, borderColor: followingBorder },
                    isRequested && { backgroundColor: requestedButtonBg, borderColor: requestedButtonBorder },
                ]}
                onPress={handleFollowToggle}
                disabled={followBusy}
            >
                <Text
                    style={[
                        styles.actionLabel,
                        { color: buttonText },
                        isFollowing && { color: followingText },
                        isRequested && { color: requestedButtonText },
                    ]}
                >
                    {isFollowing ? "Following" : isRequested ? "Requested" : "Follow Back"}
                </Text>
            </RNBounceable>
        )
        : null;

    const workoutInviteAction = showAcceptAction
        ? (
            inviteAccepted
                ? <Text style={[styles.requestHandledText, styles.actionHandledText, styles.requestHandledAcceptedText]}>Accepted</Text>
                : inviteExpired
                    ? <Text style={[styles.requestHandledText, styles.actionHandledText]}>Expired</Text>
                    : (
                        <Pressable
                            style={[
                                styles.actionButton,
                                styles.inviteAcceptBtn,
                                { backgroundColor: solidButtonBg, borderColor: buttonBorderActive },
                                acceptingInvite && {
                                    backgroundColor: solidButtonBgDisabled,
                                    borderColor: buttonBorder,
                                },
                            ]}
                            onPress={handleAcceptInvite}
                            disabled={acceptingInvite}
                            hitSlop={10}
                        >
                            <Text
                                style={[
                                    styles.actionLabel,
                                    { color: theme.textPrimary },
                                    acceptingInvite && { color: withAlpha(theme.textPrimary, 0.8) },
                                ]}
                            >
                                {acceptingInvite ? "Accepting…" : "Accept"}
                            </Text>
                        </Pressable>
                    )
        )
        : null;

    const followRequestActions = showFollowRequestActions
        ? (
            <View style={styles.requestActionsWrap}>
                {requestHandled ? (
                    <Text
                        style={[
                            styles.requestHandledText,
                            styles.actionHandledText,
                            requestStatus === 'accepted' && styles.requestHandledAcceptedText,
                        ]}
                    >
                        {requestStatus === 'accepted' ? 'Accepted' : 'Declined'}
                    </Text>
                ) : (
                    <Pressable
                        style={[
                            styles.actionButton,
                            styles.requestActionBtn,
                            { backgroundColor: buttonBgActive, borderColor: buttonBorderActive },
                            respondingRequest && styles.requestActionDisabled,
                        ]}
                        onPress={handleAcceptFollowRequest}
                        disabled={respondingRequest}
                        hitSlop={10}
                    >
                        <Text style={[styles.actionLabel, { color: buttonTextActive }]}>
                            {respondingRequest ? 'One moment…' : 'Accept'}
                        </Text>
                    </Pressable>
                )}
            </View>
        )
        : null;

    return (
        <Pressable style={({ pressed }) => [styles.pressable, pressed && styles.pressablePressed]} onPress={withStrongPress(onPressCard)}>
            <View style={cardStyles}>
                {/* avatar */}
                <View style={styles.pfpWrap}>
                    {pfpUri ? (
                        <FastImage
                            source={{
                                uri: pfpUri,
                                priority: FastImage.priority.normal,
                                cache: FastImage.cacheControl.immutable,
                            }}
                            style={[styles.pfp, unread && { borderColor: accent, borderWidth: scaleSize(2) }]}
                            resizeMode={FastImage.resizeMode.cover}
                        />
                    ) : (
                        <View style={[styles.pfp, styles.pfpPlaceholder, unread && { borderColor: accent, borderWidth: scaleSize(2) }]} />
                    )}
                </View>

                {/* text */}
                <View style={styles.textContainer}>
                    <View style={styles.topRow}>
                        <VerifiedHandle
                            handle={item.handle}
                            isVerified={Boolean(item?.isVerified ?? item?.verified)}
                            textStyle={styles.handle}
                            numberOfLines={1}
                            containerStyle={styles.handleRow}
                        />
                    </View>
                    <Text style={styles.message} numberOfLines={2}>
                        {getDisplayMessage(item)}
                    </Text>
                </View>

                {followAction}
                {workoutInviteAction}
                {followRequestActions}

                <View style={styles.trailingColumn}>
                    {unread && <View style={[styles.unreadDot, { backgroundColor: accent }]} />}
                    <Text style={styles.time}>{timeAgo}</Text>
                </View>
            </View>
        </Pressable>
    );
}
