// components/3_Workout/sections/StartCluster.jsx
import React, { memo } from "react";
import { View, Pressable, StyleSheet, Platform, Animated } from "react-native";
import { AddSquare } from "iconsax-react-native";
import { Feather } from "@expo/vector-icons";
import LiveStack from "../LiveStack";
import StartOpenButton from "../ui/StartOpenButton";
import { SMALL_SIZE, ROW_WIDTH } from "./workoutTheme";
import theme from "../../../theme/mfpDark";

import scaleSize from "../../../helper/scaleSize";

const StartCluster = ({
    navigation,
    scaleAnim,
    hasActiveWorkout,
    onStartWorkout,
    onOpenNewWorkout,
    onOpenFriends,
    hasNewFriendsUpdates,
    friendsStackUsers,
}) => {
    const scale = scaleAnim || new Animated.Value(1);
    const showStack =
        Array.isArray(friendsStackUsers) && friendsStackUsers.length > 0 && !!hasNewFriendsUpdates;

    return (
        <View style={styles.wrap} pointerEvents="box-none">
            <View style={styles.actionsRow} pointerEvents="box-none">
                {/* Make a Post */}
                <View style={styles.glowWrap} pointerEvents="box-none">
                    <Pressable
                        hitSlop={8}
                        android_ripple={{ color: "rgba(255,255,255,0.08)", radius: SMALL_SIZE / 2, borderless: true }}
                        accessibilityRole="button"
                        accessibilityLabel="Create a post"
                        style={({ pressed }) => [styles.smallBtn, styles.smallBtnBump, pressed && styles.smallBtnPressed]}
                        onPress={() => { navigation?.navigate('SelectPhotos'); }}
                    >
                        <AddSquare size={24} color="#E5E7EB" />
                    </Pressable>
                </View>

                {/* Start / Open */}
                <Animated.View style={{ transform: [{ scale }] }}>
                    <StartOpenButton hasActiveWorkout={hasActiveWorkout} onOpen={onOpenNewWorkout} onStart={onStartWorkout} />
                </Animated.View>

                {/* Friends / Live */}
                <View style={styles.glowWrap} pointerEvents="box-none">
                    <Pressable
                        hitSlop={8}
                        android_ripple={{ color: "rgba(255,255,255,0.08)", radius: SMALL_SIZE / 2, borderless: true }}
                        accessibilityRole="button"
                        accessibilityLabel="Friends training now"
                        style={({ pressed }) => [styles.smallBtn, styles.smallBtnBump, pressed && styles.smallBtnPressed]}
                        onPress={onOpenFriends}
                    >
                        {showStack ? <LiveStack users={friendsStackUsers} /> : <Feather name="users" size={21} color="#E5E7EB" />}
                    </Pressable>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrap: { alignItems: "center" },
    actionsRow: {
        width: ROW_WIDTH,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: scaleSize(10),
    },
    glowWrap: { position: "relative", alignItems: "center", justifyContent: "center" },
    // Halo removed
    glow: { display: 'none' },
    glowLeft: {},
    glowRight: {},
    smallBtn: {
        width: SMALL_SIZE,
        height: SMALL_SIZE,
        borderRadius: scaleSize(SMALL_SIZE / 2),
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.surface,
        borderWidth: 0, // remove ring outline
        ...Platform.select({
            ios: { shadowOpacity: 0 },
            android: { elevation: 0 },
        }),
    },
    // Raise side buttons to form a wider "V" with START/OPEN
    smallBtnBump: { top: scaleSize(-6), position: 'relative' },
    smallBtnPressed: { transform: [{ scale: 0.96 }], backgroundColor: '#515A6B' },
});

export default memo(StartCluster);
