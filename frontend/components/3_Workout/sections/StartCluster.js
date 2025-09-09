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
    // shadow-only halo hidden beneath the button (no visible ring)
    glow: {
        position: "absolute",
        width: SMALL_SIZE * 0.92,
        height: SMALL_SIZE * 0.92,
        borderRadius: (SMALL_SIZE * 0.92) / 2,
        backgroundColor: 'transparent',
        borderWidth: 0,
        // Slight brand-tinted halo (less stark than white)
        shadowColor: "#2D9EFF",
        shadowOpacity: 0.32,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 0 },
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
        borderWidth: 0, // remove ring outline
        ...Platform.select({
            ios: { shadowColor: "#fff", shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
            android: { elevation: 3 },
        }),
    },
    smallBtnPressed: { transform: [{ scale: 0.96 }], backgroundColor: '#515A6B' },
});

export default memo(StartCluster);
