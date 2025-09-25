// components/3_Workout/sections/StartCluster.jsx
import React, { memo, useMemo, useCallback } from "react";
import { View, StyleSheet, Animated, useWindowDimensions } from "react-native";
import StartOpenButton from "../ui/StartOpenButton";
import { ROW_WIDTH } from "./workoutTheme";
import scaleSize from "../../../helper/scaleSize";

const StartCluster = ({
    scaleAnim,
    hasActiveWorkout,
    onStartWorkout,
    onOpenNewWorkout,
    templateFocusIndex,
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

    const handleStart = useCallback(() => {
        onStartWorkout?.("global");
    }, [onStartWorkout]);

    return (
        <View style={[styles.wrap, containerStyle]} pointerEvents="box-none">
            <View style={styles.actionsRow} pointerEvents="box-none">
                <Animated.View style={{ transform: [{ scale }] }}>
                    <StartOpenButton
                        hasActiveWorkout={hasActiveWorkout}
                        onOpen={onOpenNewWorkout}
                        onStart={handleStart}
                        templateFocusIndex={templateFocusIndex}
                    />
                </Animated.View>
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
        justifyContent: "center",
        marginBottom: scaleSize(10),
    },
});

export default memo(StartCluster);
