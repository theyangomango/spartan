import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import FastImage from "react-native-fast-image";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { Heart, MessageCircle, AtSign, UserPlus, Activity, Check } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
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

const readUid = (value) => {
    if (!value) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (typeof value === 'object') return String(value?.uid || '');
    return '';
};

const normalizeUserRef = (u = {}) => ({
    uid: String(u?.uid || ''),
    handle: u?.handle || '',
    name: u?.name || '',
    pfp: u?.pfp || '',
});

export default function NotificationCard({
    item,
    onPressCard,
    onAcceptWorkoutInvite,
    onAcceptFollowRequest,
    onDeclineFollowRequest,
    isFirst,
    isLast,
}) {
    const [acceptingInvite, setAcceptingInvite] = useState(false);
    const [respondingRequest, setRespondingRequest] = useState(false);
    const [followState, setFollowState] = useState('none');
    const [followBusy, setFollowBusy] = useState(false);
    const [inviteExpired, setInviteExpired] = useState(false);
    const pfpUri = usePfp(item?.uid, item?.pfpVersion ?? 0, item?.pfp || "");

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

    const showAcceptAction = item?.type === "workout-invite" && typeof onAcceptWorkoutInvite === "function";
    const inviteAccepted = showAcceptAction && item?.inviteStatus === "accepted";

    const requestStatus = String(item?.requestStatus || '').toLowerCase();
    const showFollowRequestActions = item?.type === "follow-request" && typeof onAcceptFollowRequest === "function" && typeof onDeclineFollowRequest === "function";
    const requestHandled = showFollowRequestActions && (requestStatus === 'accepted' || requestStatus === 'declined');

    useEffect(() => {
        if (!showAcceptAction || inviteAccepted) {
            setInviteExpired(false);
            return undefined;
        }

        const wid = String(item?.wid || "");
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
    }, [showAcceptAction, inviteAccepted, item?.wid, item?.uid]);

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

    const handleDeclineFollowRequest = async () => {
        if (!showFollowRequestActions || respondingRequest || requestHandled) return;
        try { haptic(); } catch {}
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
                base = { IconCmp: UserPlus, accent: "#16A34A", accent2: "#22C55E", badgeBg: "rgba(22,163,74,0.12)" };
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

        const cardBg = theme.surface;
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

    const isFollowing = followState === 'following';
    const isRequested = followState === 'requested';
    const requestedButtonBg = withAlpha(accent, 0.12);
    const requestedButtonBorder = withAlpha(accent, 0.35);
    const requestedButtonText = mixHex(accent, "#F5F8FF", 0.28);

    const cardStyles = [styles.card];
    if (isFirst) cardStyles.push(styles.firstCard);
    if (isLast) cardStyles.push(styles.lastCard);
    cardStyles.push({ backgroundColor: cardBg });

    const followAction = item.type === "follow"
        ? (
            <RNBounceable
                style={[
                    styles.actionButton,
                    { backgroundColor: buttonBg, borderColor: buttonBorder },
                    isFollowing && { backgroundColor: buttonBgActive, borderColor: buttonBorderActive },
                    isRequested && { backgroundColor: requestedButtonBg, borderColor: requestedButtonBorder },
                ]}
                onPress={handleFollowToggle}
                disabled={followBusy}
            >
                <Text
                    style={[
                        styles.actionLabel,
                        { color: buttonText },
                        isFollowing && { color: buttonTextActive },
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
                    <>
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
                        <Pressable
                            style={[
                                styles.actionButton,
                                styles.requestActionBtn,
                                { backgroundColor: neutralButtonBg, borderColor: neutralButtonBorder },
                                respondingRequest && styles.requestActionDisabled,
                            ]}
                            onPress={handleDeclineFollowRequest}
                            disabled={respondingRequest}
                            hitSlop={10}
                        >
                            <Text style={[styles.actionLabel, { color: neutralButtonText }]}>Decline</Text>
                        </Pressable>
                    </>
                )}
            </View>
        )
        : null;

    return (
        <Pressable style={({ pressed }) => [styles.pressable, pressed && styles.pressablePressed]} onPress={withStrongPress(onPressCard)}>
            <View style={cardStyles}>
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
                    {/* <LinearGradient
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
                    </LinearGradient> */}
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

/* -------------- styles -------------- */
const styles = StyleSheet.create({
    pressable: {
        width: '100%',
        alignSelf: 'stretch',
    },
    pressablePressed: { opacity: 0.92 },
    card: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: 'flex-start',
        paddingHorizontal: scaleSize(24),
        paddingVertical: scaleSize(12),
        backgroundColor: theme.surface,
        borderBottomWidth: 0.75,
        borderColor: theme.hairline,
    },
    firstCard: { borderTopWidth: StyleSheet.hairlineWidth },
    lastCard: { borderBottomWidth: StyleSheet.hairlineWidth },
    pfpWrap: { position: "relative", marginRight: scaleSize(14) },
    pfp: {
        width: scaleSize(38),
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
        right: -scaleSize(8),
        bottom: -scaleSize(5),
        width: scaleSize(22),
        aspectRatio: 1,
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
        aspectRatio: 1,
        borderRadius: scaleSize(10),
        backgroundColor: theme.surface,
        alignItems: "center",
        justifyContent: "center",
    },
    textContainer: { flex: 1, minWidth: 0, paddingRight: scaleSize(12) },
    topRow: { flexDirection: "row", alignItems: "center", marginBottom: scaleSize(1) },
    handle: {
        fontSize: scaleSize(13),
        fontFamily: "Outfit_600SemiBold",
        color: theme.textPrimary,
        maxWidth: '100%'
    },
    message: {
        fontSize: scaleSize(13),
        color: theme.textSecondary,
        fontFamily: "Outfit_400Regular",
        lineHeight: scaleSize(20),
    },
    trailingColumn: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingLeft: scaleSize(12),
        marginLeft: 'auto',
    },
    time: {
        fontSize: scaleSize(12),
        color: theme.textSecondary,
        fontFamily: "Outfit_500Medium",
    },
    unreadDot: { width: scaleSize(7), height: scaleSize(7), borderRadius: scaleSize(7) / 2, marginBottom: scaleSize(6) },

    actionButton: {
        paddingVertical: scaleSize(8),
        paddingHorizontal: scaleSize(12),
        borderRadius: scaleSize(14),
        marginLeft: scaleSize(12),
        borderWidth: scaleSize(1),
        alignItems: "center",
        justifyContent: "center",
    },
    actionLabel: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(12),
    },
    inviteAcceptBtn: {
        minWidth: scaleSize(74),
    },
    requestActionsWrap: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    requestActionBtn: {
        minWidth: scaleSize(74),
    },
    requestActionDisabled: {
        opacity: 0.6,
    },
    requestHandledText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(12),
        color: theme.muted,
    },
    requestHandledAcceptedText: {
        color: theme.primary,
    },
    actionHandledText: {
        marginLeft: scaleSize(12),
    },
});
