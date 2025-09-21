import React, { memo, useRef, useCallback } from "react";
import { View, Text, StyleSheet, Platform, Pressable, Animated } from "react-native";
import theme from "../../../theme/mfpDark";
import scaleSize from "../../../helper/scaleSize";
import { ss } from "./workoutTheme";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import { strong as haptic } from "../../../utils/haptics";

const RING_SIZE = ss(110);
const RING_STROKE = 9;
const CARD_MIN_HEIGHT = RING_SIZE + scaleSize(32);

function HubRowCmp({
    afterPaint,
    todayCalories,
    caloriesGoal,
    workoutsThisWeek,
    weeklyGoal,
    onPress,
}) {
    // Hard-guard every numeric prop sent into Animated components
    const safeToday = Number.isFinite(todayCalories) ? todayCalories : 0;
    const safeGoal = Number.isFinite(caloriesGoal) ? Math.max(1, caloriesGoal) : 1;
    const safeWeeklyCount = Number.isFinite(workoutsThisWeek) ? Math.max(0, workoutsThisWeek) : 0;
    const safeWeeklyGoal = Number.isFinite(weeklyGoal) ? Math.max(0, weeklyGoal) : 0;
    const caloriesEaten = Math.max(0, Math.round(safeToday));
    const caloriesFill = safeGoal > 0 ? Math.min(100, (caloriesEaten / safeGoal) * 100) : 0;

    const scale = useRef(new Animated.Value(1)).current;

    const animateTo = useCallback((value) => {
        Animated.spring(scale, {
            toValue: value,
            useNativeDriver: true,
            speed: 18,
            bounciness: 8,
        }).start();
    }, [scale]);

    const handlePressIn = useCallback(() => animateTo(0.97), [animateTo]);
    const handlePressOut = useCallback(() => animateTo(1), [animateTo]);
    const handlePress = useCallback(() => {
        if (!onPress) return;
        try { haptic(); } catch { }
        onPress();
    }, [onPress]);

    const interactive = typeof onPress === "function";

    return (
        <View style={styles.hubRow}>
            <Pressable
                disabled={!interactive}
                android_ripple={{ color: "rgba(255,255,255,0.08)" }}
                style={styles.pressable}
                accessibilityRole="button"
                accessibilityLabel="Open day details"
                accessibilityState={{ disabled: !interactive }}
                hitSlop={scaleSize(8)}
                onPress={handlePress}
                onPressIn={interactive ? handlePressIn : undefined}
                onPressOut={interactive ? handlePressOut : undefined}
            >
                <Animated.View style={[styles.card, { transform: [{ scale }] }]}
                >
                    <View style={styles.cardInner}>
                        <View style={styles.ringSection}>
                            <View style={styles.ringWrap}>
                                {afterPaint ? (
                                    <AnimatedCircularProgress
                                        size={RING_SIZE}
                                        width={RING_STROKE}
                                        fill={caloriesFill}
                                        tintColor="#2D9EFF"
                                        backgroundColor="#bbdbff4f"
                                        lineCap="round"
                                        arcSweepAngle={360}
                                        rotation={0}
                                    >
                                        {() => (
                                            <View style={styles.ringCenter}>
                                                <Text style={styles.kcalValue}>{caloriesEaten}</Text>
                                                <Text style={styles.kcalSub}>/ {safeGoal} kcal</Text>
                                            </View>
                                        )}
                                    </AnimatedCircularProgress>
                                ) : (
                                    <View style={styles.ringCenter}>
                                        <Text style={styles.kcalValue}>{caloriesEaten}</Text>
                                        <Text style={styles.kcalSub}>/ {safeGoal} kcal</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                </Animated.View>
            </Pressable>
        </View>
    );
}

const areEqual = (a, b) => (
    a.afterPaint === b.afterPaint &&
    a.todayCalories === b.todayCalories &&
    a.caloriesGoal === b.caloriesGoal &&
    a.workoutsThisWeek === b.workoutsThisWeek &&
    a.weeklyGoal === b.weeklyGoal &&
    a.onPress === b.onPress
);

export default memo(HubRowCmp, areEqual);

const styles = StyleSheet.create({
    hubRow: { flexDirection: "row", gap: scaleSize(12), paddingHorizontal: scaleSize(16), marginTop: scaleSize(6) },
    pressable: { flex: 1, borderRadius: scaleSize(24) },
    card: {
        flex: 1,
        backgroundColor: theme.surface,
        borderRadius: scaleSize(24),
        paddingVertical: scaleSize(8),
        paddingHorizontal: scaleSize(10),
        borderWidth: scaleSize(1),
        borderColor: theme.hairline,
        minHeight: CARD_MIN_HEIGHT,
        ...Platform.select({
            // Tone down card drop shadow for a flatter look
            ios: {
                backgroundColor: theme.surface,
                shadowColor: "#000",
                shadowOpacity: 0.16,
                shadowRadius: scaleSize(6),
                shadowOffset: { width: 0, height: scaleSize(3) },
            },
            android: { elevation: 1 },
        }),
    },
    cardInner: { flexDirection: "row", alignItems: "center", justifyContent: "flex-start", flex: 1 },
    cardDivider: {
        width: StyleSheet.hairlineWidth,
        backgroundColor: theme.hairline,
        marginHorizontal: scaleSize(10),
        marginVertical: scaleSize(4),
        borderRadius: scaleSize(2),
        alignSelf: "stretch",
    },
    metricSection: { flex: 1, paddingHorizontal: scaleSize(4) },
    ringSection: { flex: 0.38, alignItems: "center", justifyContent: "center", alignSelf: "stretch" },

    metricBody: { flex: 1, justifyContent: "center" },
    ringWrap: { alignItems: "center", justifyContent: "center", paddingVertical: scaleSize(1) },
    ringCenter: { alignItems: "center", justifyContent: "center" },
    kcalValue: { color: theme.textPrimary, fontSize: scaleSize(21), fontFamily: "Outfit_800ExtraBold", marginBottom: 0 },
    kcalSub: { color: theme.textSecondary, fontSize: scaleSize(10), fontFamily: "Outfit_700Bold", marginBottom: scaleSize(2) },
});
