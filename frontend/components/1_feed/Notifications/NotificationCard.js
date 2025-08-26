import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import FastImage from "react-native-fast-image";
import RNBounceable from "@freakycoder/react-native-bounceable";

import scaleSize from "../../../helper/scaleSize";
import getDisplayTime from "../../../helper/getDisplayTime";
import followUser from "../../../../backend/user/followUser";
import unfollowUser from "../../../../backend/user/unfollowUser";
import { usePfp } from "../../../helper/usePFPs";

/* -------- helper: build the message string -------- */
function getDisplayMessage(item) {
    switch (item.type) {
        case "follow":
            return "followed you";
        case "liked-post":
            return "liked your post";
        case "liked-comment":
            return `liked your comment "${item.content}"`;
        case "comment":
            return `commented "${item.content}"`;
        case "replied-comment":
            return `replied to your comment "${item.content}"`;
        case "mention":
            return "mentioned you";
        default:
            return "";
    }
}

export default function NotificationCard({ item }) {
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

    return (
        <Pressable>
            <View style={styles.card}>
                {/* avatar */}
                {pfpUri ? (
                    <FastImage
                        source={{
                            uri: pfpUri,
                            priority: FastImage.priority.normal,
                            cache: FastImage.cacheControl.immutable,
                        }}
                        style={styles.pfp}
                        resizeMode={FastImage.resizeMode.cover}
                    />
                ) : (
                    <View style={[styles.pfp, styles.pfpPlaceholder]} />
                )}

                {/* text */}
                <View style={styles.textContainer}>
                    <Text style={styles.handle}>{item.handle}</Text>
                    <Text style={styles.inline}>
                        <Text style={styles.message}>{getDisplayMessage(item)}</Text>
                        <Text style={styles.dot}>  •  </Text>
                        <Text style={styles.time}>{getDisplayTime(item.timestamp)}</Text>
                    </Text>
                </View>

                {/* follow action */}
                {item.type === "follow" && (
                    <RNBounceable
                        style={[styles.followBtn, isFollowing && styles.followBtnPressed]}
                        onPress={handleFollowToggle}
                    >
                        <Text style={[styles.followText, isFollowing && styles.followTextPressed]}>
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
    card: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: scaleSize(6),
        paddingHorizontal: scaleSize(14),
        paddingVertical: scaleSize(14),
        backgroundColor: "#FFFFFF",
        borderRadius: scaleSize(20),
        borderWidth: 1,
        borderColor: "rgba(15,23,42,0.05)",
        shadowColor: "#363c4aff",
        shadowOpacity: 0.06,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    pfp: {
        width: scaleSize(48),
        aspectRatio: 1,
        borderRadius: scaleSize(18),
        marginRight: scaleSize(12),
        borderWidth: 1,
        borderColor: "rgba(15,23,42,0.06)",
        backgroundColor: "#EEE",
    },
    pfpPlaceholder: {
        backgroundColor: "#EEE",
    },
    textContainer: { flex: 1 },
    handle: {
        fontSize: scaleSize(15),
        fontFamily: "Outfit_600SemiBold",
        color: "#0F172A",
        marginBottom: scaleSize(2),
    },
    inline: {
        lineHeight: scaleSize(18),
    },
    message: {
        fontSize: scaleSize(13.5),
        color: "#4B5563",
        fontFamily: "Outfit_500Medium",
    },
    dot: {
        fontSize: scaleSize(13.5),
        color: "#B0B7C3",
        fontFamily: "Outfit_500Medium",
    },
    time: {
        fontSize: scaleSize(13.5),
        color: "#9AA6B2",
        fontFamily: "Outfit_500Medium",
    },

    followBtn: {
        backgroundColor: "#2D92FF",
        paddingVertical: scaleSize(10),
        paddingHorizontal: scaleSize(16),
        borderRadius: scaleSize(18),
        marginLeft: scaleSize(10),
        shadowColor: "#2D92FF",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 4,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.3)",
    },
    followBtnPressed: {
        backgroundColor: "#FFFFFF",
        borderColor: "#2D92FF",
        shadowOpacity: 0.15,
        elevation: 2,
    },
    followText: {
        color: "#FFFFFF",
        fontSize: scaleSize(13),
        fontFamily: "Outfit_600SemiBold",
    },
    followTextPressed: {
        color: "#2D92FF",
    },
});
