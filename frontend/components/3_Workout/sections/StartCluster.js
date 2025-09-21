// components/3_Workout/sections/StartCluster.jsx
import React, { memo } from "react";
import { View, StyleSheet, Animated } from "react-native";
import StartOpenButton from "../ui/StartOpenButton";
import { ROW_WIDTH } from "./workoutTheme";

import scaleSize from "../../../helper/scaleSize";

const StartCluster = ({
    scaleAnim,
    hasActiveWorkout,
    onStartWorkout,
    onOpenNewWorkout,
}) => {
    const scale = scaleAnim || new Animated.Value(1);

    return (
        <View style={styles.wrap} pointerEvents="box-none">
            <View style={styles.actionsRow} pointerEvents="box-none">
                <Animated.View style={{ transform: [{ scale }] }}>
                    <StartOpenButton hasActiveWorkout={hasActiveWorkout} onOpen={onOpenNewWorkout} onStart={onStartWorkout} />
                </Animated.View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrap: { alignItems: "center" },
    actionsRow: {
        width: ROW_WIDTH,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: scaleSize(10),
    },
});

export default memo(StartCluster);
