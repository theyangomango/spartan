import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import FastImage from "react-native-fast-image";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { Heart, MessageCircle, AtSign, UserPlus, Activity, Check } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

import scaleSize from "../../../helper/scaleSize";
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

/* -------- color utils -------- */
const HEX_LENGTHS = new Set([3, 4, 6, 8]);

const clamp = (value, min = 0, max = 1) => {
    if (Number.isNaN(value)) return min;
    return Math.min(Math.max(value, min), max);
};

const normalizeHex = (color) => {
    if (typeof color !== "string" || !color.startsWith("#")) return null;
    const hex = color.slice(1);
    if (!HEX_LENGTHS.has(hex.length)) return null;

    // Expand shorthand forms (#RGB, #RGBA) to full length.
    if (hex.length === 3 || hex.length === 4) {
        const chars = hex.split("");
        const expanded = chars.map((char) => char + char).join("");
        return expanded.length === 6 ? expanded : expanded.slice(0, 8);
    }

    return hex;
};

const hexToRgba = (color) => {
    const normalized = normalizeHex(color);
    if (!normalized) return null;

    const hasAlpha = normalized.length === 8;
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    const a = hasAlpha ? parseInt(normalized.slice(6, 8), 16) / 255 : 1;

    return { r, g, b, a };
};

const componentToHex = (value) => value.toString(16).padStart(2, "0");

const mixHex = (colorA, colorB, weight = 0.5) => {
    const a = hexToRgba(colorA);
    const b = hexToRgba(colorB);

    if (!a || !b) return colorA && colorA.startsWith("#") ? colorA : colorB;

    const w = clamp(weight);
    const r = Math.round(a.r + (b.r - a.r) * w);
    const g = Math.round(a.g + (b.g - a.g) * w);
    const bl = Math.round(a.b + (b.b - a.b) * w);

    return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(bl)}`;
};

const withAlpha = (color, alpha = 1) => {
    const rgba = hexToRgba(color);
    if (!rgba) return color;

    const a = clamp(typeof alpha === "number" ? alpha : rgba.a);
    return `rgba(${rgba.r},${rgba.g},${rgba.b},${a})`;
};

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

    const palette = useMemo(() => {
        let base = {
            IconCmp: MessageCircle,
            accent: "#64748B",
            accent2: "#94A3B8",
            badgeBg: "rgba(100,116,139,0.06)",
        };

        switch (item.type) {
            case "liked-post":
            case "liked-comment":
                base = { IconCmp: Heart, accent: "#FF387E", accent2: "#FF74A8", badgeBg: "rgba(255,56,126,0.08)" };
                break;
            case "comment":
            case "replied-comment":
                base = { IconCmp: MessageCircle, accent: "#2D92FF", accent2: "#6AB6FF", badgeBg: "rgba(45,146,255,0.08)" };
                break;
            case "mention":
                base = { IconCmp: AtSign, accent: "#885FFF", accent2: "#A78BFA", badgeBg: "rgba(136,95,255,0.08)" };
                break;
            case "follow":
            case "follow-request":
                base = { IconCmp: UserPlus, accent: "#22C55E", accent2: "#34D399", badgeBg: "rgba(34,197,94,0.1)" };
                break;
            case "follow-accepted":
                base = { IconCmp: Check, accent: "#2D92FF", accent2: "#6AB6FF", badgeBg: "rgba(45,146,255,0.1)" };
                break;
            case "workout-invite":
                base = { IconCmp: Activity, accent: "#0EA5E9", accent2: "#38BDF8", badgeBg: "rgba(14,165,233,0.1)" };
                break;
            default:
                break;
        }

        const accentHex = hexToRgba(base.accent) ? base.accent : "#4F5B76";
        const accent2Hex = hexToRgba(base.accent2) ? base.accent2 : "#7A85A1";

        const cardBg = mixHex(theme.field, accentHex, 0.18);
        const cardBgUnread = mixHex(theme.fieldDeep, accentHex, 0.28);
        const cardBorder = withAlpha(accentHex, 0.28);
        const cardBorderUnread = withAlpha(accentHex, 0.42);
        const cardShadow = withAlpha(accentHex, 0.5);
        const buttonBg = withAlpha(accentHex, 0.16);
        const buttonBgActive = withAlpha(accentHex, 0.26);
        const buttonBorder = withAlpha(accentHex, 0.4);
        const buttonBorderActive = withAlpha(accentHex, 0.55);
        const buttonText = mixHex(accentHex, "#F5F8FF", 0.15);
        const buttonTextActive = mixHex("#FFFFFF", accentHex, 0.18);
        const solidButtonBg = mixHex(accentHex, "#111827", 0.45);
        const solidButtonBgDisabled = withAlpha(accentHex, 0.22);

        return {
            ...base,
            accent: accentHex,
            accent2: accent2Hex,
            cardBg,
            cardBgUnread,
            cardBorder,
            cardBorderUnread,
            cardShadow,
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
        IconCmp,
        accent,
        accent2,
        badgeBg,
        cardBg,
        cardBgUnread,
        cardBorder,
        cardBorderUnread,
        cardShadow,
        buttonBg,
        buttonBgActive,
        buttonBorder,
        buttonBorderActive,
        buttonText,
        buttonTextActive,
        solidButtonBg,
        solidButtonBgDisabled,
    } = palette;

    const neutralButtonBg = withAlpha(theme.muted, 0.16);
    const neutralButtonBorder = withAlpha(theme.muted, 0.28);
    const neutralButtonText = mixHex(theme.muted, "#F1F5FF", 0.22);

    return (
        <Pressable style={({ pressed }) => [styles.pressable, pressed && { opacity: 0.95 }]} onPress={onPressCard}>
            <View
                style={[
                    styles.card,
                    { backgroundColor: cardBg, borderColor: cardBorder, shadowColor: cardShadow },
                    unread && { backgroundColor: cardBgUnread, borderColor: cardBorderUnread },
                ]}
            >
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
                        style={[
                            styles.followBtn,
                            { backgroundColor: buttonBg, borderColor: buttonBorder },
                            isFollowing && { backgroundColor: buttonBgActive, borderColor: buttonBorderActive },
                        ]}
                        onPress={handleFollowToggle}
                    >
                        <Text
                            style={[
                                styles.followText,
                                { color: buttonText },
                                isFollowing && { color: buttonTextActive },
                            ]}
                        >
                            {isFollowing ? "Following" : "Follow Back"}
                        </Text>
                    </RNBounceable>
                )}
                {showAcceptAction && (
                    <Pressable
                        style={[
                            styles.inviteAcceptBtn,
                            { backgroundColor: solidButtonBg, borderColor: buttonBorderActive },
                            (inviteAccepted || acceptingInvite) && {
                                backgroundColor: solidButtonBgDisabled,
                                borderColor: buttonBorder,
                            },
                        ]}
                        onPress={handleAcceptInvite}
                        disabled={inviteAccepted || acceptingInvite}
                        hitSlop={10}
                    >
                        <Text
                            style={[
                                styles.inviteAcceptText,
                                { color: theme.textPrimary },
                                (inviteAccepted || acceptingInvite) && { color: withAlpha(theme.textPrimary, 0.8) },
                            ]}
                        >
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
                                    style={[
                                        styles.requestActionBtn,
                                        { backgroundColor: buttonBgActive, borderColor: buttonBorderActive },
                                        respondingRequest && styles.requestActionDisabled,
                                    ]}
                                    onPress={handleAcceptFollowRequest}
                                    disabled={respondingRequest}
                                    hitSlop={10}
                                >
                                    <Text style={[styles.requestAcceptText, { color: buttonTextActive }]}>
                                        {respondingRequest ? 'One moment…' : 'Accept'}
                                    </Text>
                                </Pressable>
                                <Pressable
                                    style={[
                                        styles.requestActionBtn,
                                        { backgroundColor: neutralButtonBg, borderColor: neutralButtonBorder },
                                        { marginLeft: scaleSize(6) },
                                        respondingRequest && styles.requestActionDisabled,
                                    ]}
                                    onPress={handleDeclineFollowRequest}
                                    disabled={respondingRequest}
                                    hitSlop={10}
                                >
                                    <Text style={[styles.requestDeclineText, { color: neutralButtonText }]}>Decline</Text>
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
        backgroundColor: theme.field,
        borderRadius: scaleSize(16),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
        shadowColor: "#05070d",
        shadowOpacity: 0.2,
        shadowRadius: scaleSize(10),
        shadowOffset: { width: 0, height: scaleSize(4) },
        elevation: 2,
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
        paddingVertical: scaleSize(8),
        paddingHorizontal: scaleSize(12),
        borderRadius: scaleSize(14),
        marginLeft: scaleSize(10),
        borderWidth: scaleSize(1),
    },
    followText: {
        fontSize: scaleSize(12.5),
        fontFamily: "Outfit_700Bold",
    },
    inviteAcceptBtn: {
        marginLeft: scaleSize(10),
        paddingHorizontal: scaleSize(16),
        paddingVertical: scaleSize(7),
        borderRadius: scaleSize(999),
        alignItems: "center",
        justifyContent: "center",
        minWidth: scaleSize(74),
        borderWidth: StyleSheet.hairlineWidth,
    },
    inviteAcceptText: {
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
    requestAcceptText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(12),
    },
    requestDeclineText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(12),
    },
    requestActionDisabled: {
        opacity: 0.6,
    },
    requestHandledText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(12),
        color: theme.muted,
    },
});
