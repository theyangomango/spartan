// components/3_Workout/ui/StartOpenButton.jsx
import React, { useEffect, useRef, useState } from "react";
import { View, Pressable, Text, StyleSheet, Platform, Animated, Easing } from "react-native";
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

    /* ------------- Pulsing halo (OPEN state) ------------- */
    const pulse1 = useRef(new Animated.Value(0)).current;
    const pulse2 = useRef(new Animated.Value(0)).current;
    const loop1Ref = useRef(null);
    const loop2Ref = useRef(null);

    useEffect(() => {
        if (hasActiveWorkout) {
            loop1Ref.current = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulse1, {
                        toValue: 1,
                        duration: 1000,
                        easing: Easing.out(Easing.quad),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulse1, { toValue: 0, duration: 0, useNativeDriver: true }),
                ])
            );
            loop2Ref.current = Animated.loop(
                Animated.sequence([
                    Animated.delay(700),
                    Animated.timing(pulse2, {
                        toValue: 1,
                        duration: 1000,
                        easing: Easing.out(Easing.quad),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulse2, { toValue: 0, duration: 0, useNativeDriver: true }),
                ])
            );
            loop1Ref.current.start();
            loop2Ref.current.start();
            return () => {
                loop1Ref.current && loop1Ref.current.stop();
                loop2Ref.current && loop2Ref.current.stop();
                pulse1.setValue(0);
                pulse2.setValue(0);
            };
        } else {
            loop1Ref.current && loop1Ref.current.stop();
            loop2Ref.current && loop2Ref.current.stop();
            pulse1.setValue(0);
            pulse2.setValue(0);
        }
    }, [hasActiveWorkout, pulse1, pulse2]);

    const HALO_SCALE = 1.8;
    const haloStyle = (val) => ({
        position: "absolute",
        width: BTN_SIZE,
        height: BTN_SIZE,
        borderRadius: BTN_SIZE / 2,
        borderWidth: 6,
        borderColor: "rgba(250, 204, 21, 0.55)", // #FACC15 with alpha
        transform: [
            {
                scale: val.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, HALO_SCALE],
                }),
            },
        ],
        opacity: val.interpolate({
            inputRange: [0, 1],
            outputRange: [0.55, 0],
        }),
    });

    return (
        <View style={{ width: BTN_SIZE, height: BTN_SIZE, alignItems: "center", justifyContent: "center" }}>
            {/* Pulsing halo around OPEN state */}
            {hasActiveWorkout && (
                <View pointerEvents="none" style={styles.pulseWrap}>
                    <Animated.View style={haloStyle(pulse1)} />
                    <Animated.View style={haloStyle(pulse2)} />
                </View>
            )}

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
                style={({ pressed }) => [styles.startBtn, pressed && { transform: [{ scale: 0.98 }] }]}
                accessibilityRole="button"
                accessibilityLabel={hasActiveWorkout ? "Open current workout" : "Start workout"}
            >
                <Text style={styles.startText}>{hasActiveWorkout ? "OPEN" : "START"}</Text>
            </Pressable>

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
    },
});

export default StartOpenButton;
