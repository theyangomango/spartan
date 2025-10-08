// components/3_Workout/sections/StartCluster.jsx
import React, { memo, useMemo, useCallback } from "react";
import { View, StyleSheet, Animated, useWindowDimensions, Pressable } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import StartOpenButton from "../ui/StartOpenButton";
import { ROW_WIDTH, SMALL_SIZE } from "./workoutTheme";
import scaleSize from "../../../helper/scaleSize";
import theme from "../../../theme/mfpDark";
import { strong as haptic } from "../../../utils/haptics";

const StartCluster = ({
    scaleAnim,
    hasActiveWorkout,
    onStartWorkout,
    onOpenNewWorkout,
    onOpenCreatePost,
    onOpenBarcodeScanner,
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

    const handleOpenCreatePost = useCallback(() => {
        try { haptic(); } catch {}
        onOpenCreatePost?.();
    }, [onOpenCreatePost]);

    const handleOpenBarcodeScanner = useCallback(() => {
        try { haptic(); } catch {}
        onOpenBarcodeScanner?.();
    }, [onOpenBarcodeScanner]);

    return (
        <View style={[styles.wrap, containerStyle]} pointerEvents="box-none">
            <View style={styles.actionsRow} pointerEvents="box-none">
                <Pressable
                    style={[styles.sideButton, styles.sideButtonOffset]}
                    accessibilityRole="button"
                    accessibilityLabel="Scan food barcode"
                    android_ripple={{ color: "rgba(255,255,255,0.12)", borderless: false }}
                    hitSlop={scaleSize(10)}
                    onPress={handleOpenBarcodeScanner}
                >
                    <Ionicons name="barcode-outline" size={24} color="#E5E7EB" />
                </Pressable>
                <Animated.View style={{ transform: [{ scale }] }}>
                    <StartOpenButton
                        hasActiveWorkout={hasActiveWorkout}
                        onOpen={onOpenNewWorkout}
                        onStart={handleStart}
                        templateFocusIndex={templateFocusIndex}
                    />
                </Animated.View>
                <Pressable
                    style={[styles.sideButton, styles.sideButtonOffset]}
                    accessibilityRole="button"
                    accessibilityLabel="Create a post"
                    android_ripple={{ color: "rgba(255,255,255,0.12)", borderless: false }}
                    hitSlop={scaleSize(10)}
                    onPress={handleOpenCreatePost}
                >
                    <Feather name="plus" size={23} color="#E5E7EB" />
                </Pressable>
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
    sideButton: {
        width: SMALL_SIZE,
        height: SMALL_SIZE,
        borderRadius: SMALL_SIZE / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.surface,
    },
    sideButtonOffset: {
        transform: [{ translateY: -scaleSize(6) }],
    },
});

export default memo(StartCluster);
