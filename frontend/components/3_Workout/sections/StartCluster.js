// components/3_Workout/sections/StartCluster.jsx
import React, { memo, useMemo } from "react";
import { View, Pressable, StyleSheet, Platform, Animated, useWindowDimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import StartOpenButton from "../ui/StartOpenButton";
import { SMALL_SIZE, ROW_WIDTH } from "./workoutTheme";
import theme from "../../../theme/mfpDark";

import scaleSize from "../../../helper/scaleSize";

const StartCluster = ({
    scaleAnim,
    hasActiveWorkout,
    onStartWorkout,
    onOpenNewWorkout,
}) => {
    const scale = scaleAnim || new Animated.Value(1);
    const { height: screenHeight } = useWindowDimensions();
    const containerStyle = useMemo(
        () => ({
            minHeight: Math.max(scaleSize(180), Math.round(screenHeight * 0.22)),
            justifyContent: "center",
        }),
        [screenHeight],
    );

    return (
        <View style={[styles.wrap, containerStyle]} pointerEvents="box-none">
            <View style={styles.actionsRow} pointerEvents="box-none">
                <View style={styles.glowWrap} pointerEvents="none">
                    <Pressable
                        pointerEvents="none"
                        style={[styles.smallBtn, styles.smallBtnBump]}
                    >
                        <Feather name="calendar" size={22} color="#E5E7EB" />
                    </Pressable>
                </View>

                <Animated.View style={{ transform: [{ scale }] }}>
                    <StartOpenButton hasActiveWorkout={hasActiveWorkout} onOpen={onOpenNewWorkout} onStart={onStartWorkout} />
                </Animated.View>

                <View style={styles.glowWrap} pointerEvents="none">
                    <Pressable
                        pointerEvents="none"
                        style={[styles.smallBtn, styles.smallBtnBump]}
                    >
                        <Feather name="users" size={21} color="#E5E7EB" />
                    </Pressable>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrap: { alignItems: "center", justifyContent: "center" },
    actionsRow: {
        width: ROW_WIDTH,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: scaleSize(10),
    },
    glowWrap: { position: "relative", alignItems: "center", justifyContent: "center" },
    smallBtn: {
        width: SMALL_SIZE,
        height: SMALL_SIZE,
        borderRadius: scaleSize(SMALL_SIZE / 2),
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.surface,
        borderWidth: 0,
        ...Platform.select({
            ios: { shadowOpacity: 0 },
            android: { elevation: 0 },
        }),
    },
    smallBtnBump: { top: scaleSize(-6), position: "relative" },
});

export default memo(StartCluster);
