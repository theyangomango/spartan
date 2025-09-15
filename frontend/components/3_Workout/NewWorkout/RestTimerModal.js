// components/Tracking/RestTimerModal.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    Modal,
    Pressable,
    View,
    Text,
    StyleSheet,
    Dimensions,
    Animated,
    Easing,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import RNBounceable from "@freakycoder/react-native-bounceable";
import theme from "../../../theme/mfpDark";
import * as Haptics from "expo-haptics";
import scaleSize from "../../../helper/scaleSize";

const { height: screenHeight } = Dimensions.get("window");
const scaledSize = (size) => scaleSize(size);

const PRESETS = [30, 60, 90, 120];
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const formatTime = (s = 0) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
};

const CountdownRing = ({ size = 160, stroke = 10, progress, pulse }) => {
    const radius = (size - stroke) / 2;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * radius;

    const dashOffset = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [circumference, 0],
    });

    const pulseOpacity = pulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.08, 0.22],
    });

    return (
        <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
            {/* Track */}
            <Circle
                cx={cx}
                cy={cy}
                r={radius}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={stroke}
                fill="transparent"
            />
            {/* Soft glow pulse */}
            <AnimatedCircle
                cx={cx}
                cy={cy}
                r={radius}
                stroke={theme.primary}
                strokeWidth={stroke}
                fill="transparent"
                strokeOpacity={pulseOpacity}
            />
            {/* Progress */}
            <AnimatedCircle
                cx={cx}
                cy={cy}
                r={radius}
                stroke={theme.primary}
                strokeWidth={stroke}
                fill="transparent"
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
            />
        </Svg>
    );
}

/**
 * Props:
 * - visible: boolean
 * - onClose: () => void
 * - countdown: number
 * - onStart: (secs:number) => void
 * - onAdd: (secs:number) => void
 * - onReset: () => void
 */
export default function RestTimerModal({
    visible,
    onClose,
    countdown,
    restTotal,   // total seconds selected since last start/reset (prop from hook)
    onStart,
    onAdd,
    onReset,
}) {

    // Animations
    const ring = useRef(new Animated.Value(0)).current; // 1 -> 0 over remaining time
    const pulse = useRef(new Animated.Value(0)).current; // 0 <-> 1 loop while counting
    const pulseAnimRef = useRef(null); // hold loop to stop cleanly
    const appear = useRef(new Animated.Value(0)).current; // modal card entrance

    const runPulse = useCallback(() => {
        // stop any existing loop first
        if (pulseAnimRef.current?.stop) pulseAnimRef.current.stop();
        pulse.setValue(0);
        pulseAnimRef.current = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
                Animated.timing(pulse, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
            ])
        );
        pulseAnimRef.current.start();
    }, [pulse]);

    const stopPulse = useCallback(() => {
        if (pulseAnimRef.current?.stop) pulseAnimRef.current.stop();
        pulseAnimRef.current = null;
        pulse.stopAnimation();
        pulse.setValue(0);
    }, [pulse]);

    const ensureAnim = useCallback(
        (remaining, total) => {
            ring.stopAnimation();
            const ratio = total > 0 ? remaining / total : 0;
            ring.setValue(Math.max(0, Math.min(1, ratio)));
            if (remaining > 0) {
                Animated.timing(ring, {
                    toValue: 0,
                    duration: remaining * 1000,
                    easing: Easing.linear,
                    useNativeDriver: false,
                }).start();
            }
        },
        [ring]
    );

    const handleStart = useCallback((secs) => {
        const s = Math.max(1, Math.floor(secs || 0));
        onStart?.(s);
        ensureAnim(s, s);
        runPulse();
    }, [ensureAnim, onStart, runPulse]);

    const handleAdd = useCallback((secs) => {
        const newTotal = (restTotal || 0) + secs;
        const newRemaining = (countdown || 0) + secs;
        onAdd?.(secs);
        ensureAnim(newRemaining, newTotal);
        runPulse();
        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
    }, [restTotal, countdown, onAdd, ensureAnim, runPulse]);

    const handleReset = useCallback(() => {
        onReset?.();
        ring.stopAnimation();
        ring.setValue(0);
        stopPulse();
        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
    }, [onReset, ring, stopPulse]);

    // Ensure animations are fully stopped on unmount
    useEffect(() => {
        return () => {
            try { ring.stopAnimation(); } catch {}
            try { stopPulse(); } catch {}
        };
    }, [ring, stopPulse]);

    // Appear / sync
    useEffect(() => {
        if (visible) {
            appear.setValue(0);
            Animated.timing(appear, {
                toValue: 1,
                duration: 220,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start();

            const total = restTotal || countdown;
            if (countdown > 0 && total > 0) {
                ensureAnim(countdown, total);
                runPulse();
            } else {
                ring.stopAnimation();
                ring.setValue(0);
                stopPulse();
            }
        } else {
            stopPulse();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    // Stop pulse when timer ends
    useEffect(() => {
        if (countdown === 0) {
            ring.stopAnimation();
            ring.setValue(0);
            stopPulse();
        }
    }, [countdown, ring, stopPulse]);

    const cardStyle = {
        transform: [
            {
                scale: appear.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.96, 1],
                }),
            },
        ],
        opacity: appear,
    };

    return (
        <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Animated.View style={[styles.card, cardStyle]} onStartShouldSetResponder={() => true}>
                    {/* Drag handle */}
                    <View style={styles.handle} />

                    {/* Close (optional) */}
                    <Pressable hitSlop={12} onPress={onClose} style={styles.closeBtn}>
                        <Text style={styles.closeTxt}>×</Text>
                    </Pressable>

                    <Text style={styles.title}>Rest Timer</Text>
                    <Text style={styles.caption}>Timer keeps running if you close</Text>

                    <View style={styles.ringWrap}>
                        <CountdownRing size={scaledSize(190)} stroke={scaledSize(10)} progress={ring} pulse={pulse} />
                        <View style={styles.centerWrap}>
                            <Animated.Text
                                style={[
                                    styles.time,
                                    {
                                        transform: [
                                            {
                                                scale: countdown > 0
                                                    ? pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] })
                                                    : 1,
                                            },
                                        ],
                                    },
                                ]}
                            >
                                {formatTime(countdown)}
                            </Animated.Text>
                            <Text style={styles.sub}>
                                {countdown > 0 ? "Recover & breathe" : "Select a duration"}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.row}>
                        {PRESETS.map((s) => {
                            const isActive = countdown > 0 && restTotal === s;
                            return (
                                <RNBounceable key={s} onPress={() => handleStart(s)} activeScale={0.96}
                                    style={[styles.chip, isActive && styles.chipActive]}>
                                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{s}s</Text>
                                </RNBounceable>
                            );
                        })}
                    </View>

                    <View style={styles.controls}>
                        <RNBounceable
                            onPress={() => (countdown > 0 ? handleAdd(15) : handleStart(15))}
                            style={styles.ghostBtn}
                            activeScale={0.96}
                        >
                            <Text style={styles.ghostBtnText}>{countdown > 0 ? "+15s" : "Quick 15s"}</Text>
                        </RNBounceable>

                        <RNBounceable
                            onPress={() => (countdown > 0 ? handleReset() : handleStart(60))}
                            style={styles.primaryBtn}
                            activeScale={0.96}
                        >
                            <Text style={styles.primaryBtnText}>{countdown > 0 ? "Reset" : "Start 60s"}</Text>
                        </RNBounceable>
                    </View>
                </Animated.View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(15,23,42,0.55)", // slate overlay
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scaledSize(20),
    },
    card: {
        width: "100%",
        backgroundColor: theme.surface,
        borderRadius: scaledSize(20),
        padding: scaledSize(18),
        alignItems: "center",
        borderWidth: 1,
        borderColor: theme.hairline,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 10 },
        elevation: 4,
    },
    handle: {
        width: scaledSize(38),
        height: scaledSize(4),
        borderRadius: scaledSize(2),
        backgroundColor: theme.hairline,
        marginBottom: scaledSize(10),
    },
    closeBtn: {
        position: "absolute",
        top: scaledSize(10),
        right: scaledSize(10),
        width: scaledSize(28),
        height: scaledSize(28),
        borderRadius: scaledSize(14),
        alignItems: "center",
        justifyContent: "center",
    },
    closeTxt: {
        fontSize: scaledSize(22),
        lineHeight: scaledSize(22),
        color: theme.textSecondary,
    },
    title: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaledSize(18),
        color: theme.textPrimary,
        marginTop: scaledSize(2),
    },
    caption: {
        marginTop: scaledSize(4),
        fontFamily: "Outfit_500Medium",
        fontSize: scaledSize(11.5),
        color: theme.textSecondary,
    },
    ringWrap: {
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        marginTop: scaledSize(12),
        marginBottom: scaledSize(14),
    },
    centerWrap: {
        position: "absolute",
        alignItems: "center",
        justifyContent: "center",
    },
    time: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaledSize(30),
        color: theme.textPrimary,
        includeFontPadding: false,
    },
    sub: {
        marginTop: scaledSize(4),
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaledSize(12),
        color: theme.textSecondary,
    },
    row: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        gap: scaledSize(8),
        marginTop: scaledSize(6),
        marginBottom: scaledSize(10),
    },
    chip: {
        flex: 1,
        paddingVertical: scaledSize(10),
        borderRadius: scaledSize(12),
        backgroundColor: theme.field,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: theme.hairline,
    },
    chipActive: {
        backgroundColor: theme.addBtnBg,
        borderColor: theme.primary,
    },
    chipText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaledSize(13),
        color: theme.textPrimary,
    },
    chipTextActive: {
        color: theme.primary,
    },
    controls: {
        flexDirection: "row",
        width: "100%",
        marginTop: scaledSize(2),
        gap: scaledSize(8),
    },
    ghostBtn: {
        flex: 1,
        paddingVertical: scaledSize(11),
        borderRadius: scaledSize(12),
        backgroundColor: theme.addBtnBg,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: theme.primary,
    },
    ghostBtnText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaledSize(14),
        color: theme.primary,
        letterSpacing: 0.2,
    },
    primaryBtn: {
        flex: 1,
        paddingVertical: scaledSize(11),
        borderRadius: scaledSize(12),
        backgroundColor: theme.primary,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: theme.primary,
        shadowOpacity: 0.35,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
    },
    primaryBtnText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaledSize(14),
        color: "#FFFFFF",
        letterSpacing: 0.2,
    },
});
