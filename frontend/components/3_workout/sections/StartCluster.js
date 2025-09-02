// components/3_Workout/sections/StartCluster.jsx
import React, { memo } from "react";
import { View, Pressable, StyleSheet, Platform, Animated } from "react-native";
import { AddSquare } from "iconsax-react-native";
import { Feather } from "@expo/vector-icons";
import LiveStack from "../LiveStack";
import StartOpenButton from "../ui/StartOpenButton";
import { SMALL_SIZE, ROW_WIDTH } from "./workoutTheme";

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
                <Pressable
                    hitSlop={8}
                    android_ripple={{ color: "rgba(2,6,23,0.08)", radius: SMALL_SIZE / 2, borderless: true }}
                    accessibilityRole="button"
                    accessibilityLabel="Create a post"
                    style={({ pressed }) => [styles.smallBtn, pressed && styles.smallBtnPressed]}
                    onPress={() => {
                        navigation?.navigate('Tabs', { screen: 'ProfileStack', params: { screen: 'SelectPhotos' } });
                    }}
                >
                    <AddSquare size={24} color="#000" />
                </Pressable>

                {/* Start / Open */}
                <Animated.View style={{ transform: [{ scale }] }}>
                    <StartOpenButton hasActiveWorkout={hasActiveWorkout} onOpen={onOpenNewWorkout} onStart={onStartWorkout} />
                </Animated.View>

                {/* Friends / Live */}
                <Pressable
                    hitSlop={8}
                    android_ripple={{ color: "rgba(2,6,23,0.08)", radius: SMALL_SIZE / 2, borderless: true }}
                    accessibilityRole="button"
                    accessibilityLabel="Friends training now"
                    style={({ pressed }) => [styles.smallBtn, pressed && styles.smallBtnPressed]}
                    onPress={onOpenFriends}
                >
                    {showStack ? <LiveStack users={friendsStackUsers} /> : <Feather name="users" size={21} color="#000" />}
                </Pressable>
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

export default memo(StartCluster);
