// components/3_Workout/sections/StartCluster.jsx
import React, { memo } from "react";
import { View, Pressable, StyleSheet, Platform, Animated } from "react-native";
import { AddSquare } from "iconsax-react-native";
import { Feather } from "@expo/vector-icons";
import LiveStack from "../LiveStack";
import StartOpenButton from "../ui/StartOpenButton";
import { SMALL_SIZE, ROW_WIDTH } from "./workoutTheme";
import theme from "../../../theme/mfpDark";

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
                    <View style={[styles.glow, styles.glowLeft]} pointerEvents="none" />
                    <Pressable
                        hitSlop={8}
                        android_ripple={{ color: "rgba(255,255,255,0.08)", radius: SMALL_SIZE / 2, borderless: true }}
                        accessibilityRole="button"
                        accessibilityLabel="Create a post"
                        style={({ pressed }) => [styles.smallBtn, pressed && styles.smallBtnPressed]}
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
                    <View style={[styles.glow, styles.glowRight]} pointerEvents="none" />
                    <Pressable
                        hitSlop={8}
                        android_ripple={{ color: "rgba(255,255,255,0.08)", radius: SMALL_SIZE / 2, borderless: true }}
                        accessibilityRole="button"
                        accessibilityLabel="Friends training now"
                        style={({ pressed }) => [styles.smallBtn, pressed && styles.smallBtnPressed]}
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
        marginBottom: 10,
    },
    glowWrap: { position: "relative", alignItems: "center", justifyContent: "center" },
    glow: {
        position: "absolute",
        width: SMALL_SIZE + 8,
        height: SMALL_SIZE + 8,
        borderRadius: (SMALL_SIZE + 8) / 2,
        backgroundColor: "#2D9EFF1F", // stronger soft fill
        borderWidth: 1,
        borderColor: "#2D9EFF55",
        shadowColor: "#2D9EFF",
        shadowOpacity: 0.34,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 0,
    },
    glowLeft: {},
    glowRight: {},
    smallBtn: {
        width: SMALL_SIZE,
        height: SMALL_SIZE,
        borderRadius: SMALL_SIZE / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.hairline,
        ...Platform.select({
            ios: { shadowColor: "#000", shadowOpacity: 0.36, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
            android: { elevation: 3 },
        }),
    },
    smallBtnPressed: { transform: [{ scale: 0.96 }], backgroundColor: '#444E63' },
});

export default memo(StartCluster);
