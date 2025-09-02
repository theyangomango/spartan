// components/3_Workout/ui/StartOpenButton.jsx
import React, { useEffect, useRef, useState } from "react";
import { View, Pressable, Text, StyleSheet, Platform } from "react-native";
import { AnimatedCircularProgress } from "react-native-circular-progress";
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
const StartOpenButton = ({ hasActiveWorkout, onOpen, onStart, holdMs = 650 }) => {
    /* ------------- Long-press ring (START state) ------------- */
    const [holdFill, setHoldFill] = useState(0);

    // Internal guards to ensure single fire + know which target fill we animated to.
    const pressStartAtRef = useRef(0);
    const firedRef = useRef(false);           // ensures onStart is called once
    const armedRef = useRef(false);           // only true while we're animating to 100
    const targetFillRef = useRef(0);          // remembers current animation target (100 or 0)

    const maybeStart = (reason = "animation") => {
        if (firedRef.current) return;
        firedRef.current = true;
        armedRef.current = false;
        onStart?.();
        // Immediately reset ring target back to 0 (without triggering a second start)
        targetFillRef.current = 0;
        setHoldFill(0);
    };

    const handlePressIn = () => {
        firedRef.current = false;
        pressStartAtRef.current = Date.now();
        armedRef.current = true;
        targetFillRef.current = 100;
        // AnimatedCircularProgress will tween to 100 over tweenDuration (holdMs)
        setHoldFill(100);
    };

    // Fallback: if the platform fires onLongPress right as we hit holdMs, start if not already started.
    const handleLongPress = () => {
        if (!hasActiveWorkout && armedRef.current && !firedRef.current) {
            maybeStart("longpress");
        }
    };

    // If user bails early, disarm and reset. We DO NOT start here anymore.
    const handlePressOut = () => {
        armedRef.current = false;
        targetFillRef.current = 0;
        setHoldFill(0);
    };

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
            {hasActiveWorkout && (
                <View pointerEvents="none" style={styles.pulseWrap}>
                    <View style={styles.openHaloOuter} />
                    <View style={styles.openHaloInner} />
                    <View style={styles.openGlow} />
                </View>
            )}

            {/* START state progress ring */}
            {!hasActiveWorkout && (
                <View style={styles.holdRing} pointerEvents="none">
                    <AnimatedCircularProgress
                        size={BTN_SIZE + 18}
                        width={6}
                        fill={holdFill}
                        tintColor="#60A5FA"
                        backgroundColor="rgba(2,6,23,0.12)"
                        lineCap="round"
                        arcSweepAngle={360}
                        rotation={0}
                        tweenDuration={holdMs}
                        // Fire exactly when the ring finishes animating to the current target.
                        onAnimationComplete={() => {
                            if (armedRef.current && targetFillRef.current === 100 && !hasActiveWorkout) {
                                maybeStart("progress-complete");
                            }
                        }}
                    />
                </View>
            )}
        </View>
    );
};

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
        borderRadius: BTN_SIZE / 2,
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

export default StartOpenButton;
