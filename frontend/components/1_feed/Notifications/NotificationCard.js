/**
 * Single notification row.
 * - Shows avatar, message & time.
 * - For "follow" events, includes a follow / unfollow button.
 * - Avatar now rendered with FastImage for caching & faster re-use.
 */

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import FastImage from "react-native-fast-image";
import RNBounceable from "@freakycoder/react-native-bounceable";

import scaleSize from "../../../helper/scaleSize";
import getDisplayTime from "../../../helper/getDisplayTime";
import followUser from "../../../../backend/user/followUser";
import unfollowUser from "../../../../backend/user/unfollowUser";

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
        default:
            return "";
    }
}

function NotificationCard({ item }) {
    const [isFollowing, setIsFollowing] = useState(false);

    /* check initial follow state */
    useEffect(() => {
        if (item.type === "follow") {
            const isFollower = global.userData.following.some(
                (f) => f.uid === item.uid
            );
            setIsFollowing(isFollower);
        }
    }, [item]);

    /* toggle follow / unfollow */
    const handleFollowToggle = () => {
        const currentUser = {
            name: global.userData.name,
            handle: global.userData.handle,
            pfp: global.userData.image,
            uid: global.userData.uid,
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

    /* -------------- render -------------- */
    return (
        <Pressable>
            <View style={styles.card}>
                {/* avatar with FastImage (= cached) */}
                <FastImage
                    source={{
                        uri: item.pfp,
                        priority: FastImage.priority.normal,
                        cache: FastImage.cacheControl.immutable,
                    }}
                    style={styles.pfp}
                    resizeMode={FastImage.resizeMode.cover}
                />

                <View style={styles.textContainer}>
                    <Text style={styles.handle}>{item.handle}</Text>
                    <Text>
                        <Text style={styles.message}>{getDisplayMessage(item)}</Text>
                        <Text style={styles.time}> {getDisplayTime(item.timestamp)}</Text>
                    </Text>
                </View>

                {item.type === "follow" && (
                    <RNBounceable
                        style={[
                            styles.followButton,
                            isFollowing && styles.followButtonPressed,
                        ]}
                        onPress={handleFollowToggle}
                    >
                        <Text
                            style={[
                                styles.followButtonText,
                                isFollowing && styles.followButtonTextPressed,
                            ]}
                        >
                            {isFollowing ? "Following" : "Follow Back"}
                        </Text>
                    </RNBounceable>
                )}
            </View>
        </Pressable>
    );
}

export default NotificationCard;

/* -------------- styles -------------- */
const styles = StyleSheet.create({
    card: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: scaleSize(5.5),
        paddingHorizontal: scaleSize(16),
        paddingVertical: scaleSize(17),
        backgroundColor: "#f8f8f8",
        borderRadius: scaleSize(25),
    },
    pfp: {
        width: scaleSize(50),
        aspectRatio: 1,
        borderRadius: scaleSize(20),
        marginRight: scaleSize(11.5),
    },
    textContainer: { flex: 1 },
    handle: {
        fontSize: scaleSize(15),
        fontFamily: "Outfit_600SemiBold",
        paddingVertical: scaleSize(1.5),
    },
    message: {
        fontSize: scaleSize(13.5),
        color: "#555",
        fontFamily: "Outfit_500Medium",
    },
    time: {
        fontSize: scaleSize(13.5),
        color: "#aaa",
        fontFamily: "Outfit_500Medium",
    },
    followButton: {
        backgroundColor: "#2D92FF",
        paddingVertical: scaleSize(14),
        paddingHorizontal: scaleSize(18),
        borderRadius: scaleSize(20),
        marginLeft: scaleSize(10),
        shadowColor: "#2D92FF",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.8,
        shadowRadius: 3,
        elevation: 5,
    },
    followButtonPressed: {
        backgroundColor: "#fff",
        borderColor: "#2D92FF",
        borderWidth: 2,
        paddingVertical: scaleSize(12),
        paddingHorizontal: scaleSize(18),
        borderRadius: scaleSize(20),
        marginLeft: scaleSize(10),
        shadowColor: "#2D92FF",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.8,
        shadowRadius: 3,
        elevation: 5,
    },
    followButtonText: {
        color: "#fff",
        fontSize: scaleSize(13.5),
        fontFamily: "Outfit_600SemiBold",
    },
    followButtonTextPressed: {
        color: "#2D92FF",
    },
});
