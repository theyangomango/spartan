// screens/Workout/parts/StartCluster.jsx
import React from "react";
import { View, Pressable, StyleSheet, Platform, Animated } from "react-native";
import { AddSquare } from "iconsax-react-native";
import StartOpenButton from "../ui/StartOpenButton";
import LiveStack from "../LiveStack";
import { SMALL_SIZE } from "./workoutTheme";

export default function StartCluster({
    navigation,
    scaleAnim,
    hasActiveWorkout,
    onStartWorkout,
    onOpenNewWorkout,
    onOpenFriends,
}) {
    const liveNow = [
        { uid: "a1", pfp: "https://i.pravatar.cc/200?img=11" },
        { uid: "a2", pfp: "https://i.pravatar.cc/200?img=12" },
        { uid: "a3", pfp: "https://i.pravatar.cc/200?img=13" },
    ];
    return (
        <View style={styles.actionsRow} pointerEvents="box-none">
            {/* Make a Post */}
            <Pressable
                hitSlop={8}
                android_ripple={{ color: "rgba(2,6,23,0.08)", radius: SMALL_SIZE / 2, borderless: true }}
                accessibilityRole="button"
                accessibilityLabel="Create a post"
                style={({ pressed }) => [styles.smallBtn, pressed && styles.smallBtnPressed]}
                onPress={() => navigation?.navigate("ProfileStack", { screen: "SelectPhotos" })}
            >
                <AddSquare size={24} color="#000" />
            </Pressable>

            {/* Start / Open button */}
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <StartOpenButton
                    hasActiveWorkout={hasActiveWorkout}
                    onOpen={onOpenNewWorkout}
                    onStart={onStartWorkout}
                />
            </Animated.View>

            {/* Friends live */}
            <Pressable
                hitSlop={8}
                android_ripple={{ color: "rgba(2,6,23,0.08)", radius: SMALL_SIZE / 2, borderless: true }}
                accessibilityRole="button"
                accessibilityLabel="Friends training now"
                style={({ pressed }) => [styles.smallBtn, pressed && styles.smallBtnPressed]}
                onPress={onOpenFriends}
            >
                <LiveStack users={liveNow} />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    actionsRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
        width: "75%",
        alignSelf: "center",
    },
    smallBtn: {
        width: SMALL_SIZE,
        height: SMALL_SIZE,
        borderRadius: SMALL_SIZE / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
        ...Platform.select({
            ios: { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
            android: { elevation: 3 },
        }),
    },
    smallBtnPressed: { transform: [{ scale: 0.96 }], backgroundColor: "#F1F5F9" },
});
