// components/3_Workout/ui/StartOpenButton.jsx
import React, { useEffect, useRef } from "react";
import { View, Pressable, Text, StyleSheet, Platform } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import Reanimated, { useSharedValue, withTiming, withDelay, withSequence, Easing, useAnimatedProps, runOnJS } from "react-native-reanimated";
import { BTN_SIZE } from "../sections/workoutTheme";
import theme from "../../../theme/mfpDark";

import scaleSize from "../../../helper/scaleSize";
import { strong as haptic } from "../../../utils/haptics";
import * as Haptics from "expo-haptics";

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
export default function  StartOpenButton({ hasActiveWorkout, onOpen, onStart, holdMs = 550 }) {
    /* ------------- Long-press ring (START state) ------------- */
    // Reanimated progress on the UI thread to avoid JS jank
    const progress = useSharedValue(0);      // 0..1
    const armed = useSharedValue(0);         // 1 while holding, 0 otherwise
    const firedRef = useRef(false);
    const freezeActiveRef = useRef(false);
    const freezeTimerRef = useRef(null);
    const holdHapticsRef = useRef([]);
    // Keep the visual "full ring" moment so the completion feels satisfying
    const FREEZE_MS = 1200;

    const clearHoldHaptics = () => {
        if (holdHapticsRef.current.length) {
            holdHapticsRef.current.forEach((id) => clearTimeout(id));
            holdHapticsRef.current = [];
        }
    };

    const scheduleHoldHaptics = () => {
        clearHoldHaptics();
        const total = Math.max(holdMs, 220);
        const maxDelay = Math.max(0, total - 10);
        const pulsePlan = [
            { ratio: 0, style: Haptics.ImpactFeedbackStyle.Light },
            { ratio: 0.12, style: Haptics.ImpactFeedbackStyle.Light },
            { ratio: 0.24, style: Haptics.ImpactFeedbackStyle.Medium },
            { ratio: 0.4, style: Haptics.ImpactFeedbackStyle.Medium },
            { ratio: 0.58, style: Haptics.ImpactFeedbackStyle.Medium },
            { ratio: 0.75, style: Haptics.ImpactFeedbackStyle.Heavy },
            { ratio: 0.88, style: Haptics.ImpactFeedbackStyle.Heavy },
            { ratio: 0.97, style: Haptics.ImpactFeedbackStyle.Heavy },
        ];

        const timers = [];
        let lastDelay = -Infinity;
        pulsePlan.forEach(({ ratio, style }) => {
            let delay = Math.round(total * ratio);
            if (delay > maxDelay) delay = maxDelay;
            delay = Math.max(0, delay);
            if (delay <= lastDelay) delay = Math.min(maxDelay, lastDelay + 25);
            lastDelay = delay;
            const id = setTimeout(() => {
                try { Haptics.impactAsync?.(style); } catch { }
            }, delay);
            timers.push(id);
        });
        holdHapticsRef.current = timers;
    };

    const maybeStart = () => {
        if (firedRef.current) return;
        firedRef.current = true;
        clearHoldHaptics();
        try { haptic(); } catch {}
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
        scheduleHoldHaptics();
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
            clearHoldHaptics();
            runOnJS(maybeStart)();
            armed.value = 0;
            progress.value = 0;
        }
    };

    const handlePressOut = () => {
        if (hasActiveWorkout) return;
        clearHoldHaptics();
        // If hold already completed and we're freezing the full ring, don't retract on release
        if (freezeActiveRef.current) return;
        armed.value = 0; // disarm so completion callback won't trigger
        // Smoothly retract ring without causing re-renders
        progress.value = withTiming(0, { duration: 160, easing: Easing.out(Easing.cubic) });
    };

    // Cleanup on unmount
    useEffect(() => () => { clearFreeze(); clearHoldHaptics(); }, []);

    /* ------------- Static halo (OPEN state) ------------- */
    // Non-pulsing white halo that hugs the black button and extends a few pixels outward.

    const handleOpenPress = () => {
        try { haptic(); } catch {}
        onOpen?.();
    };

    return (
        <View style={styles.wrap}>
            {/* White halo: iOS via shadow, Android via SVG radial gradient */}
            {Platform.OS !== 'ios' && <Halo size={BTN_SIZE * 1.12} />}
            {/* Hidden back disc (no visible ring) */}
            <View style={styles.backDisc} />
            <Pressable
                {...(hasActiveWorkout
                    ? { onPress: handleOpenPress }
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

    // Progress arc animates its dash offset
    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: c * (1 - progress.value),
    }));

    // Hide the background track entirely until the ring begins animating
    const trackAnimatedProps = useAnimatedProps(() => ({
        opacity: progress.value > 0 ? 1 : 0,
    }));

    return (
        <View style={styles.holdRing} pointerEvents="none">
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* background track (hidden when not animating) */}
                <AnimatedCircle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    strokeWidth={6}
                    stroke="rgba(2,6,23,0.12)"
                    fill="none"
                    animatedProps={trackAnimatedProps}
                />
                {/* progress arc */}
                <AnimatedCircle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    strokeWidth={6}
                    stroke="#2D9EFF"
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
    // Subtle disc to separate pure black from dark background
    backDisc: {
        position: "absolute",
        width: scaleSize(BTN_SIZE * 1.12),
        height: scaleSize(BTN_SIZE * 1.12),
        borderRadius: scaleSize(9999),
        // Keep element for layout, but fully transparent so no visible ring
        backgroundColor: 'transparent',
        borderWidth: 0,
        ...Platform.select({ ios: { shadowOpacity: 0 }, android: { elevation: 0 } }),
    },

    // Accent ring removed to avoid onion layering
    // Core black button (minimal)
    startBtn: {
        width: BTN_SIZE,
        height: BTN_SIZE,
        borderRadius: scaleSize(10000),
        // overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 0, // remove inner ring outline
        ...Platform.select({
            ios: {
                backgroundColor: "#0a0a0aff",
                shadowColor: "#FFFFFF",
                shadowOpacity: 0.8,
                shadowRadius: scaleSize(16),
                shadowOffset: { width: 0, height: 0 },
            },
            android: { elevation: 0 },
        }),
    },
    // Extra styling when OPEN to create a crisp white rim + glow
    startBtnOpen: {
        width: scaleSize(BTN_SIZE * 1.05),
        height: scaleSize(BTN_SIZE * 1.05),
        borderWidth: 0, // no crisp rim; rely on haloSoft
        // Keep the same white halo on iOS as the START state
        ...Platform.select({
            ios: {
                backgroundColor: "#0A0A0A",
                shadowColor: "#FFFFFF",
                shadowOpacity: 0.8,
                shadowRadius: scaleSize(16),
                shadowOffset: { width: 0, height: 0 },
            },
            android: {},
        }),
    },
    startText: {
        color: "#FFFFFF",
        fontSize: scaleSize(20),
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

    // Glow removed
    underRimGlow: { display: 'none' },
    
});

// Android halo using SVG radial gradient (iOS halo handled by shadow on the button)
function Halo({ size }) {
    const offset = (BTN_SIZE - size) / 2;
    const id = React.useRef(`halo_${Math.random().toString(36).slice(2)}`).current;
    return (
        <Svg
            width={size}
            height={size}
            style={{ position: 'absolute', left: offset, top: offset }}
            pointerEvents="none"
        >
            <Defs>
                <RadialGradient id={id} cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor="rgba(255,255,255,0.20)" />
                    <Stop offset="55%" stopColor="rgba(255,255,255,0.14)" />
                    <Stop offset="80%" stopColor="rgba(255,255,255,0.08)" />
                    <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </RadialGradient>
            </Defs>
            <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
        </Svg>
    );
}

// default export declared above
