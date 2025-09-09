import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import FastImage from "react-native-fast-image";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { Heart, MessageCircle, AtSign, UserPlus } from "lucide-react-native";
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
        default:
            return "";
    }
}

export default function NotificationCard({ item, onPressCard }) {
    const [isFollowing, setIsFollowing] = useState(false);
    const pfpUri = usePfp(item.uid, item.pfpVersion ?? 0);

    /* check initial follow state */
    useEffect(() => {
        if (item.type === "follow") {
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
                return { IconCmp: UserPlus, accent: "#22C55E", accent2: "#34D399", lightAccent: "rgba(34,197,94,0.16)", badgeBg: "rgba(34,197,94,0.06)" };
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
                        style={[styles.pfpIconBadge, { borderColor: "#FFFFFF", shadowColor: accent }]}
                    >
                        <View style={[styles.pfpIconBadgeInner, { backgroundColor: badgeBg } ]}>
                            <IconCmp size={scaleSize(13)} color="#FFFFFF" strokeWidth={2.5} />
                        </View>
                    </LinearGradient>
                </View>

                {/* text */}
                <View style={styles.textContainer}>
                    <View style={styles.topRow}>
                        <Text style={styles.handle} numberOfLines={1}>
                            {item.handle}
                        </Text>
                        <View style={styles.timeWrap}>
                            {unread && <View style={[styles.unreadDot, { backgroundColor: accent }]} />}
                            <Text style={styles.time}>{timeAgo}</Text>
                        </View>
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
        marginVertical: scaleSize(8),
        paddingHorizontal: scaleSize(14),
        paddingVertical: scaleSize(12),
        backgroundColor: theme.surface,
        borderRadius: scaleSize(16),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },
    cardUnread: {
        backgroundColor: "#1E2128",
        borderColor: "rgba(37,99,235,0.28)",
    },
    pfpWrap: { position: "relative", marginRight: scaleSize(12) },
    pfp: {
        width: scaleSize(44),
        aspectRatio: 1,
        borderRadius: scaleSize(22),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.06)",
        backgroundColor: "#2E323C",
    },
    pfpPlaceholder: {
        backgroundColor: "#2E323C",
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
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
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
        color: "#E5E7EB",
        maxWidth: '70%'
    },
    message: {
        fontSize: scaleSize(13),
        color: "#B8BFCA",
        fontFamily: "Outfit_400Regular",
        lineHeight: scaleSize(20),
    },
    time: {
        fontSize: scaleSize(12),
        color: "#A1A7B3",
        fontFamily: "Outfit_600SemiBold",
    },
    timeWrap: { flexDirection: 'row', alignItems: 'center', gap: scaleSize(6) },
    unreadDot: { width: scaleSize(7), height: scaleSize(7), borderRadius: scaleSize(7)/2 },

    followBtn: {
        backgroundColor: "#1E2128",
        paddingVertical: scaleSize(8),
        paddingHorizontal: scaleSize(12),
        borderRadius: scaleSize(14),
        marginLeft: scaleSize(10),
        borderWidth: 1,
        borderColor: "#2D92FF",
    },
    followBtnPressed: {
        backgroundColor: "rgba(45,146,255,0.16)",
        borderColor: "#2D92FF",
    },
    followText: {
        color: "#2D92FF",
        fontSize: scaleSize(12.5),
        fontFamily: "Outfit_700Bold",
    },
    followTextPressed: {
        color: "#1E7BE0",
    },
});
