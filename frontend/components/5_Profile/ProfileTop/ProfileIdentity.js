import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import scaleSize from "../../../helper/scaleSize";
import theme from "../../../theme/mfpDark";
import { withStrongPress } from "../../../utils/haptics";

export const PROFILE_AVATAR_SIZE = scaleSize(72);

/**
 * The identity block shared by the own-profile and view-profile screens: a centred avatar
 * flanked by the follower counts, with the bio underneath.
 */
export default function ProfileIdentity({
    avatar,
    bio,
    followersCount = 0,
    followingCount = 0,
    onPressFollowers,
    onPressFollowing,
}) {
    return (
        <View style={styles.container}>
            <View style={styles.avatarRow}>
                <Pressable style={styles.sideStat} onPress={withStrongPress(onPressFollowers)} hitSlop={8}>
                    <Text style={styles.statCount}>{followersCount}</Text>
                    <Text style={styles.statLabel}>Followers</Text>
                </Pressable>
                {avatar}
                <Pressable style={styles.sideStat} onPress={withStrongPress(onPressFollowing)} hitSlop={8}>
                    <Text style={styles.statCount}>{followingCount}</Text>
                    <Text style={styles.statLabel}>Following</Text>
                </Pressable>
            </View>
            <View style={styles.bio}>{bio}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        marginTop: scaleSize(2),
    },
    avatarRow: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "stretch",
    },
    sideStat: {
        flex: 1,
        alignItems: "center",
    },
    statCount: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(18),
        color: theme.textPrimary,
        fontVariant: ["tabular-nums"],
    },
    statLabel: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(13),
        color: theme.textSecondary,
        marginTop: scaleSize(1),
    },
    bio: {
        marginTop: scaleSize(10),
        paddingHorizontal: scaleSize(24),
    },
});
