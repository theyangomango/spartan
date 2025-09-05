// components/3_Workout/ui/StartOpenButton.jsx
import React, { useEffect, useRef } from "react";
import { View, Pressable, Text, StyleSheet, Platform } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Reanimated, { useSharedValue, withTiming, withDelay, withSequence, Easing, useAnimatedProps, runOnJS } from "react-native-reanimated";
import { BTN_SIZE } from "../sections/workoutTheme";

/**
 * Minimal black circular button that either:
 *  - shows "START" with long-press-and-fill ring to begin a workout, or
 *  - shows "OPEN" with a subtle pulsing yellow halo when a workout is active.
 *
 * Props:
 *  - hasActiveWorkout: boolean
 *  - onOpen: () => void
 *  - onStart: () => void
 *  - holdMs?: number (default 650)
 */
export default function StartOpenButton({ hasActiveWorkout, onOpen, onStart, holdMs = 550 }) {
    /* ------------- Long-press ring (START state) ------------- */
    // Reanimated progress on the UI thread to avoid JS jank
    const progress = useSharedValue(0);      // 0..1
    const armed = useSharedValue(0);         // 1 while holding, 0 otherwise
    const firedRef = useRef(false);
    const freezeActiveRef = useRef(false);
    const freezeTimerRef = useRef(null);
    const FREEZE_MS = 1200; // keep ring full after completion

    const maybeStart = () => {
        if (firedRef.current) return;
        firedRef.current = true;
        onStart?.();
    };

    const clearFreeze = () => {
        if (freezeTimerRef.current) {
            clearTimeout(freezeTimerRef.current);
            freezeTimerRef.current = null;
        }
        freezeActiveRef.current = false;
    };
    const beginFreeze = () => {
        clearFreeze();
        freezeActiveRef.current = true;
        // end freeze after the visual delay
        freezeTimerRef.current = setTimeout(() => { freezeActiveRef.current = false; }, FREEZE_MS + 40);
    };

    const handlePressIn = () => {
        if (hasActiveWorkout) return;
        firedRef.current = false;
        clearFreeze();
        armed.value = 1;
        progress.value = withTiming(1, { duration: holdMs, easing: Easing.linear }, (finished) => {
            if (finished && armed.value === 1) {
                runOnJS(maybeStart)();
                // Keep ring full for a short freeze, then retract on the UI thread
                armed.value = 0;
                progress.value = withSequence(
                    withTiming(1, { duration: 0 }),
                    withDelay(FREEZE_MS, withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) }))
                );
                runOnJS(beginFreeze)();
            }
        });
    };

    const handleLongPress = () => {
        // Fallback path for some Android devices that fire longPress simultaneously
        if (!hasActiveWorkout && armed.value === 1 && !firedRef.current) {
            runOnJS(maybeStart)();
            armed.value = 0;
            progress.value = 0;
        }
    };

    const handlePressOut = () => {
        if (hasActiveWorkout) return;
        // If hold already completed and we're freezing the full ring, don't retract on release
        if (freezeActiveRef.current) return;
        armed.value = 0; // disarm so completion callback won't trigger
        // Smoothly retract ring without causing re-renders
        progress.value = withTiming(0, { duration: 160, easing: Easing.out(Easing.cubic) });
    };

    // Cleanup on unmount
    useEffect(() => () => clearFreeze(), []);

    /* ------------- Static halo (OPEN state) ------------- */
    // Non-pulsing white halo that hugs the black button and extends a few pixels outward.

    return (
        <View style={styles.wrap}>
            <Pressable
                {...(hasActiveWorkout
                    ? { onPress: onOpen }
                    : {
                        onLongPress: handleLongPress, // fallback
                        delayLongPress: holdMs,
                        onPressIn: handlePressIn,
                        onPressOut: handlePressOut,
                    })}
                hitSlop={10}
                style={({ pressed }) => [
                    styles.startBtn,
                    hasActiveWorkout && styles.startBtnOpen,
                    pressed && { transform: [{ scale: 0.98 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel={hasActiveWorkout ? "Open current workout" : "Start workout"}
            >
                <Text style={styles.startText}>{hasActiveWorkout ? "OPEN" : "START"}</Text>
            </Pressable>

            {/* Static white halo around OPEN state (rendered above button) */}
            {/* {hasActiveWorkout && (
                <View pointerEvents="none" style={styles.pulseWrap}>
                    <View style={styles.openHaloOuter} />
                    <View style={styles.openHaloInner} />
                    <View style={styles.openGlow} />
                </View>
            )} */}

            {/* START state progress ring (UI-thread, jank-free) */}
            {!hasActiveWorkout && <HoldRing progress={progress} />}
        </View>
    );
}

// Reanimated SVG ring that animates on the UI thread
const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);
function HoldRing({ progress }) {
    const size = BTN_SIZE + 18;
    const r = (size - 6) / 2; // account for stroke width
    const c = 2 * Math.PI * r;

    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: c * (1 - progress.value),
    }));

    return (
        <View style={styles.holdRing} pointerEvents="none">
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* background track */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    strokeWidth={6}
                    stroke="rgba(2,6,23,0.12)"
                    fill="none"
                />
                {/* progress arc */}
                <AnimatedCircle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    strokeWidth={6}
                    stroke="#60A5FA"
                    fill="none"
                    strokeDasharray={`${c} ${c}`}
                    animatedProps={animatedProps}
                    strokeLinecap="round"
                    // Start from top by rotating SVG group  -90deg
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </Svg>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        width: BTN_SIZE,
        height: BTN_SIZE,
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible", // ensure halo/glow extending outside is visible
    },
    // Core black button (minimal)
    startBtn: {
        width: BTN_SIZE,
        height: BTN_SIZE,
        borderRadius: 10000,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0D0D0D",
        ...Platform.select({
            ios: { shadowColor: "#000", shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 12 } },
            android: { elevation: 8 },
        }),
    },
    // Extra styling when OPEN to create a crisp white rim + glow
    startBtnOpen: {
        width: BTN_SIZE * 1.1,
        height: BTN_SIZE * 1.1,
        borderWidth: 6,
        borderColor: "#FFFFFF",
        ...Platform.select({
            ios: { shadowColor: "#FFFFFF", shadowOpacity: 0.75, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
            android: {},
        }),
    },
    startText: {
        color: "#FFFFFF",
        fontSize: 20,
        fontWeight: "900",
        textTransform: "uppercase",
        letterSpacing: 0.6,
        fontStyle: "italic",
        transform: [{ skewX: "-7deg" }],
    },

    // progress ring overlay for long press (hidden when active)
    holdRing: {
        position: "absolute",
        alignItems: "center",
        justifyContent: "center",
    },

    // Pulsing halo wrapper (tight to the button so it centers)
    pulseWrap: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2,
    },
    // Non-pulsing white halo for OPEN state (outer soft ring)
    openHaloOuter: {
        position: "absolute",
        width: BTN_SIZE + 56,
        height: BTN_SIZE + 56,
        borderRadius: (BTN_SIZE + 56) / 2,
        borderWidth: 22,
        borderColor: "rgba(255,255,255,0.30)",
        backgroundColor: "transparent",
    },
    // Crisp inner ring that hugs the black button edge
    openHaloInner: {
        position: "absolute",
        width: BTN_SIZE + 18,
        height: BTN_SIZE + 18,
        borderRadius: (BTN_SIZE + 18) / 2,
        borderWidth: 10,
        borderColor: "#9ac7ffff",
        backgroundColor: "transparent",
    },
    // Extra soft glow just beyond the halo to make it more visible
    openGlow: {
        position: "absolute",
        width: BTN_SIZE + 76,
        height: BTN_SIZE + 76,
        borderRadius: (BTN_SIZE + 76) / 2,
        backgroundColor: "rgba(255,255,255,0.16)",
    },
});

// default export declared above
