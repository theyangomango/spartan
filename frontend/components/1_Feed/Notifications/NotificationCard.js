import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import FastImage from "react-native-fast-image";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { Heart, MessageCircle, AtSign, UserPlus, Activity, Check } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

import scaleSize, { ts } from "../../../helper/scaleSize";
import theme from "../../../theme/mfpDark";
import getDisplayTimeDifference from "../../../helper/getDisplayTimeDifference";
import followUser from "../../../../backend/user/followUser";
import unfollowUser from "../../../../backend/user/unfollowUser";
import { usePfp } from "../../../helper/usePFPs";

/* -------- helpers -------- */
const ellipsize = (str = "", max = 60) => {
    const s = String(str || "").replace(/\s+/g, " ").trim();
    if (!s) return "";
    return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

function getDisplayMessage(item) {
    switch (item.type) {
        case "follow":
            return "followed you";
        case "follow-request":
            return "requested to follow you";
        case "follow-accepted":
            return "accepted your follow request";
        case "liked-post":
            return "liked your post";
        case "liked-comment":
            return `liked your comment "${ellipsize(item.content, 50)}"`;
        case "comment":
            return `commented "${ellipsize(item.content, 50)}"`;
        case "replied-comment":
            return `replied to your comment "${ellipsize(item.content, 50)}"`;
        case "mention":
            return "mentioned you";
        case "workout-invite":
            return "invited you to a workout";
        default:
            return "";
    }
}

export default function NotificationCard({ item, onPressCard, onAcceptWorkoutInvite, onAcceptFollowRequest, onDeclineFollowRequest }) {
    const [isFollowing, setIsFollowing] = useState(false);
    const [acceptingInvite, setAcceptingInvite] = useState(false);
    const [respondingRequest, setRespondingRequest] = useState(false);
    const pfpUri = usePfp(
        item.uid,
        item.pfpVersion ?? 0,
        item?.pfp || item?.pfpUrl || item?.photoURL || item?.image || ""
    );

    /* check initial follow state */
    useEffect(() => {
        if (item.type === "follow" || item.type === "follow-accepted") {
            const isFollower = !!global?.userData?.following?.some((f) => f?.uid === item.uid);
            setIsFollowing(isFollower);
        }
    }, [item]);

    /* toggle follow / unfollow */
    const handleFollowToggle = () => {
        const currentUser = {
            name: global?.userData?.name,
            handle: global?.userData?.handle,
            pfp: global?.userData?.image,
            uid: global?.userData?.uid,
        };

        const notifUser = {
            name: item.name,
            handle: item.handle,
            pfp: item.pfp,
            uid: item.uid,
        };

        if (isFollowing) unfollowUser(currentUser, notifUser);
        else followUser(currentUser, notifUser);

        setIsFollowing((prev) => !prev);
    };

    const timeAgo = getDisplayTimeDifference(
        (typeof item?.timestamp === 'number')
            ? item.timestamp
            : (item?.timestamp?.toMillis?.() || (typeof item?.timestamp?.seconds === 'number' ? item.timestamp.seconds * 1000 : Date.parse(item?.timestamp) || 0)),
        Date.now()
    );

    const unread = item?.read === false;

    const showAcceptAction = item?.type === "workout-invite" && typeof onAcceptWorkoutInvite === "function";
    const inviteAccepted = showAcceptAction && item?.inviteStatus === "accepted";

    const requestStatus = String(item?.requestStatus || '').toLowerCase();
    const showFollowRequestActions = item?.type === "follow-request" && typeof onAcceptFollowRequest === "function" && typeof onDeclineFollowRequest === "function";
    const requestHandled = showFollowRequestActions && (requestStatus === 'accepted' || requestStatus === 'declined');

    const handleAcceptInvite = async () => {
        if (!showAcceptAction || inviteAccepted || acceptingInvite) return;
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
        setRespondingRequest(true);
        try {
            await onAcceptFollowRequest();
        } catch (err) {
            console.log('accept follow request notification error', err);
        } finally {
            setRespondingRequest(false);
        }
    };

    const handleDeclineFollowRequest = async () => {
        if (!showFollowRequestActions || respondingRequest || requestHandled) return;
        setRespondingRequest(true);
        try {
            await onDeclineFollowRequest();
        } catch (err) {
            console.log('decline follow request notification error', err);
        } finally {
            setRespondingRequest(false);
        }
    };

    const { IconCmp, accent, accent2, lightAccent, badgeBg } = useMemo(() => {
        switch (item.type) {
            case "liked-post":
            case "liked-comment":
                return { IconCmp: Heart, accent: "#FF387E", accent2: "#FF74A8", lightAccent: "rgba(255,56,126,0.14)", badgeBg: "rgba(255,56,126,0.06)" };
            case "comment":
            case "replied-comment":
                return { IconCmp: MessageCircle, accent: "#2D92FF", accent2: "#6AB6FF", lightAccent: "rgba(45,146,255,0.14)", badgeBg: "rgba(45,146,255,0.06)" };
            case "mention":
                return { IconCmp: AtSign, accent: "#885FFF", accent2: "#A78BFA", lightAccent: "rgba(136,95,255,0.14)", badgeBg: "rgba(136,95,255,0.06)" };
            case "follow":
            case "follow-request":
                return { IconCmp: UserPlus, accent: "#22C55E", accent2: "#34D399", lightAccent: "rgba(34,197,94,0.16)", badgeBg: "rgba(34,197,94,0.06)" };
            case "follow-accepted":
                return { IconCmp: Check, accent: "#2D92FF", accent2: "#6AB6FF", lightAccent: "rgba(45,146,255,0.16)", badgeBg: "rgba(45,146,255,0.06)" };
            case "workout-invite":
                return { IconCmp: Activity, accent: "#0EA5E9", accent2: "#38BDF8", lightAccent: "rgba(14,165,233,0.18)", badgeBg: "rgba(14,165,233,0.08)" };
            default:
                return { IconCmp: MessageCircle, accent: "#64748B", accent2: "#94A3B8", lightAccent: "rgba(100,116,139,0.12)", badgeBg: "rgba(100,116,139,0.06)" };
        }
    }, [item?.type]);

    return (
        <Pressable style={({ pressed }) => [styles.pressable, pressed && { opacity: 0.95 }]} onPress={onPressCard}>
            <View style={[styles.card, unread && styles.cardUnread]}>
                {/* avatar + type badge */}
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
                    <LinearGradient
                        colors={[accent2, accent]}
                        start={{ x: 0.2, y: 0 }}
                        end={{ x: 0.8, y: 1 }}
                        style={[
                            styles.pfpIconBadge,
                            {
                                borderColor: theme.bg,
                                shadowColor: accent,
                                backgroundColor: accent,
                            },
                        ]}
                    >
                        <View style={[styles.pfpIconBadgeInner, { backgroundColor: badgeBg }]}>
                            <IconCmp size={scaleSize(13)} color={theme.textPrimary} strokeWidth={2.5} />
                        </View>
                    </LinearGradient>
                </View>

                {/* text */}
                <View style={styles.textContainer}>
                    <View style={styles.topRow}>
                        <Text style={styles.handle} numberOfLines={1}>
                            {item.handle}
                        </Text>

                    </View>
                    <Text style={styles.message} numberOfLines={2}>
                        {getDisplayMessage(item)}
                    </Text>
                </View>

                {/* follow action */}
                {item.type === "follow" && (
                    <RNBounceable
                        style={[styles.followBtn, { borderColor: accent }, isFollowing && [styles.followBtnPressed, { backgroundColor: lightAccent }]]}
                        onPress={handleFollowToggle}
                    >
                        <Text style={[styles.followText, { color: accent }, isFollowing && styles.followTextPressed]}>
                            {isFollowing ? "Following" : "Follow Back"}
                        </Text>
                    </RNBounceable>
                )}
                {showAcceptAction && (
                    <Pressable
                        style={[styles.inviteAcceptBtn, (inviteAccepted || acceptingInvite) && styles.inviteAcceptBtnDisabled]}
                        onPress={handleAcceptInvite}
                        disabled={inviteAccepted || acceptingInvite}
                        hitSlop={10}
                    >
                        <Text style={styles.inviteAcceptText}>
                            {inviteAccepted ? "Accepted" : acceptingInvite ? "Accepting…" : "Accept"}
                        </Text>
                    </Pressable>
                )}
                {showFollowRequestActions && (
                    <View style={styles.requestActionsWrap}>
                        {requestHandled ? (
                            <Text style={styles.requestHandledText}>
                                {requestStatus === 'accepted' ? 'Accepted' : 'Declined'}
                            </Text>
                        ) : (
                            <>
                                <Pressable
                                    style={[styles.requestActionBtn, styles.requestAcceptBtn, respondingRequest && styles.requestActionDisabled]}
                                    onPress={handleAcceptFollowRequest}
                                    disabled={respondingRequest}
                                    hitSlop={10}
                                >
                                    <Text style={styles.requestAcceptText}>
                                        {respondingRequest ? 'One moment…' : 'Accept'}
                                    </Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.requestActionBtn, styles.requestDeclineBtn, respondingRequest && styles.requestActionDisabled]}
                                    onPress={handleDeclineFollowRequest}
                                    disabled={respondingRequest}
                                    hitSlop={10}
                                >
                                    <Text style={styles.requestDeclineText}>Decline</Text>
                                </Pressable>
                            </>
                        )}

                    </View>

                )}

                <View style={styles.timeWrap}>
                    {unread && <View style={[styles.unreadDot, { backgroundColor: accent }]} />}
                    <Text style={styles.time}>{timeAgo}</Text>
                </View>
            </View>
        </Pressable>
    );
}

/* -------------- styles -------------- */
const styles = StyleSheet.create({
    pressable: { borderRadius: scaleSize(18) },
    card: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: scaleSize(6),
        paddingHorizontal: scaleSize(14),
        paddingVertical: scaleSize(12),
        // Neutral card surface to better match the rest of the app
        // (remove the saturated bluish slate)
        backgroundColor: theme.surface,
        borderRadius: scaleSize(16),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: scaleSize(10),
        shadowOffset: { width: 0, height: scaleSize(4) },
        elevation: 2,
    },
    cardUnread: {
        // Slightly darker to subtly differentiate unread while staying on-palette
        backgroundColor: theme.field,
        borderColor: theme.hairline,
    },
    pfpWrap: { position: "relative", marginRight: scaleSize(12) },
    pfp: {
        width: scaleSize(44),
        aspectRatio: 1,
        borderRadius: scaleSize(22),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
        backgroundColor: theme.field,
    },
    pfpPlaceholder: {
        backgroundColor: theme.field,
    },
    pfpIconBadge: {
        position: "absolute",
        right: -scaleSize(5),
        bottom: -scaleSize(5),
        width: scaleSize(26),
        height: scaleSize(26),
        borderRadius: scaleSize(13),
        alignItems: "center",
        justifyContent: "center",
        borderWidth: scaleSize(2),
        // Give the pill a base fill so iOS can calculate the drop shadow
        backgroundColor: theme.surface,
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: scaleSize(3),
        shadowOffset: { width: 0, height: scaleSize(1) },
        elevation: 3,
    },
    pfpIconBadgeInner: {
        width: scaleSize(20),
        height: scaleSize(20),
        borderRadius: scaleSize(10),
        backgroundColor: theme.surface,
        alignItems: "center",
        justifyContent: "center",
    },
    textContainer: { flex: 1, minWidth: 0 },
    topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: scaleSize(1) },
    handle: {
        fontSize: scaleSize(13.5),
        fontFamily: "Outfit_600SemiBold",
        color: theme.textPrimary,
        maxWidth: '70%'
    },
    message: {
        fontSize: scaleSize(13),
        color: theme.textSecondary,
        fontFamily: "Outfit_400Regular",
        lineHeight: scaleSize(20),
    },
    time: {
        fontSize: scaleSize(12),
        color: theme.textSecondary,
        fontFamily: "Outfit_600SemiBold",
    },
    timeWrap: { flexDirection: 'row', alignItems: 'center', paddingLeft: scaleSize(10) },
    unreadDot: { width: scaleSize(7), height: scaleSize(7), borderRadius: scaleSize(7) / 2 },

    followBtn: {
        backgroundColor: theme.field,
        paddingVertical: scaleSize(8),
        paddingHorizontal: scaleSize(12),
        borderRadius: scaleSize(14),
        marginLeft: scaleSize(10),
        borderWidth: scaleSize(1),
        borderColor: theme.primary,
    },
    followBtnPressed: {
        backgroundColor: "rgba(45,158,255,0.16)",
        borderColor: theme.primary,
    },
    followText: {
        color: theme.primary,
        fontSize: scaleSize(12.5),
        fontFamily: "Outfit_700Bold",
    },
    followTextPressed: {
        color: theme.accentBlue,
    },
    inviteAcceptBtn: {
        marginLeft: scaleSize(10),
        paddingHorizontal: scaleSize(16),
        paddingVertical: scaleSize(7),
        borderRadius: scaleSize(999),
        backgroundColor: "#10B981",
        alignItems: "center",
        justifyContent: "center",
        minWidth: scaleSize(74),
    },
    inviteAcceptBtnDisabled: {
        backgroundColor: "rgba(16,185,129,0.24)",
    },
    inviteAcceptText: {
        color: "#fff",
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(12.5),
    },
    requestActionsWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: scaleSize(10),
    },
    requestActionBtn: {
        paddingHorizontal: scaleSize(14),
        paddingVertical: scaleSize(7),
        borderRadius: scaleSize(999),
        borderWidth: StyleSheet.hairlineWidth,
        minWidth: scaleSize(74),
        alignItems: 'center',
        justifyContent: 'center',
    },
    requestAcceptBtn: {
        backgroundColor: 'rgba(34,197,94,0.16)',
        borderColor: 'rgba(34,197,94,0.36)',
    },
    requestDeclineBtn: {
        backgroundColor: 'rgba(100,116,139,0.14)',
        borderColor: 'rgba(100,116,139,0.28)',
        marginLeft: scaleSize(6),
    },
    requestAcceptText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(12),
        color: '#22C55E',
    },
    requestDeclineText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(12),
        color: '#94A3B8',
    },
    requestActionDisabled: {
        opacity: 0.6,
    },
    requestHandledText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(12),
        color: '#94A3B8',
    },
});
