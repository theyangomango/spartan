import React, { memo, useRef, useCallback } from "react";
import { View, Text, StyleSheet, Platform, Pressable, Animated } from "react-native";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import { ss } from "./workoutTheme"; // keep path consistent with your project
import theme from "../../../theme/mfpDark";
// Single root navigator; no nested overlay helpers needed
import scaleSize from "../../../helper/scaleSize";
import { strong as haptic } from "../../../utils/haptics";
// Removed unused bounceable/touchable imports to keep things lean

const RING_SIZE = ss(126);
const RING_STROKE = 11;
const CARD_MIN_HEIGHT = RING_SIZE + scaleSize(36); // allow room for label + SVG stroke bleed
const DIVIDER_HEIGHT = RING_SIZE - scaleSize(10);
const CARD_RADIUS = scaleSize(30);

function HubRowCmp({
    afterPaint,
    fill,
    todayCalories,
    caloriesGoal,
    workoutsThisWeek,
    weeklyGoal,
    onPress,
}) {
    const scale = useRef(new Animated.Value(1)).current;
    const interactive = typeof onPress === "function";

    const animateTo = useCallback(
        (value) => {
            Animated.spring(scale, {
                toValue: value,
                useNativeDriver: true,
                speed: 18,
                bounciness: 8,
            }).start();
        },
        [scale],
    );

    const handlePressIn = useCallback(() => animateTo(0.97), [animateTo]);
    const handlePressOut = useCallback(() => animateTo(1), [animateTo]);
    const handlePress = useCallback(() => {
        if (!interactive) return;
        try {
            haptic();
        } catch {
            // best-effort haptic fire
        }
        onPress();
    }, [interactive, onPress]);
    // Hard-guard every numeric prop sent into Animated components
    const safeFill =
        Number.isFinite(fill) ? Math.max(0, Math.min(100, Number(fill))) : 0;
    const safeToday = Number.isFinite(todayCalories) ? todayCalories : 0;
    const safeGoal = Number.isFinite(caloriesGoal) ? Math.max(1, caloriesGoal) : 1;
    const safeWeeklyCount = Number.isFinite(workoutsThisWeek) ? Math.max(0, workoutsThisWeek) : 0;
    const safeWeeklyGoal = Number.isFinite(weeklyGoal) ? Math.max(0, weeklyGoal) : 0;
    const weeklyFill = safeWeeklyGoal > 0 ? Math.min(100, (safeWeeklyCount / safeWeeklyGoal) * 100) : 0;
    const workoutsDisplay = safeWeeklyGoal > 0 ? `${safeWeeklyCount}/${safeWeeklyGoal}` : `${safeWeeklyCount}`;
    const cardContent = (
        <View style={styles.metricsRow}>
            <View style={styles.metric}>
                {/* <View style={[styles.headerRow, styles.headerRowStart, { paddingLeft: scaleSize(10) }]}>
                    <Text style={styles.macrosCaption}>Today’s Calories</Text>
                </View> */}
                <View style={styles.ringWrap}>
                    {afterPaint ? (
                        <AnimatedCircularProgress
                            size={RING_SIZE}
                            width={RING_STROKE}
                            fill={safeFill}
                            tintColor="#2D9EFF"
                            backgroundColor="#bbdbff4f"
                            lineCap="round"
                            arcSweepAngle={360}
                            rotation={0}
                        >
                            {() => (
                                <View style={styles.ringCenter}>
                                    <Text style={styles.kcalValue}>{Math.max(0, safeToday)}</Text>
                                    <Text style={styles.kcalSub}>/ {safeGoal} kcal</Text>
                                </View>
                            )}
                        </AnimatedCircularProgress>
                    ) : (
                        <View style={styles.ringCenter}>
                            <Text style={styles.kcalValue}>{Math.max(0, safeToday)}</Text>
                            <Text style={styles.kcalSub}>/ {safeGoal} kcal</Text>
                        </View>
                    )}
                </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.metric}>
                {/* <View style={[styles.headerRow, styles.headerRowStart]}>
                    <Text style={styles.macrosCaption}>Workouts this week</Text>
                </View> */}
                <View style={styles.ringWrap}>
                    {afterPaint ? (
                        <AnimatedCircularProgress
                            size={RING_SIZE}
                            width={RING_STROKE}
                            fill={weeklyFill}
                            tintColor="#2D9EFF"
                            backgroundColor="#bbdbff4f"
                            lineCap="round"
                            arcSweepAngle={360}
                            rotation={0}
                        >
                            {() => (
                                <View style={styles.ringCenter}>
                                    <Text style={styles.workoutsValue}>{workoutsDisplay}</Text>
                                    <Text style={styles.workoutsSub}>Sessions{"\n"}this week</Text>
                                </View>
                            )}
                        </AnimatedCircularProgress>
                    ) : (
                        <View style={styles.ringCenter}>
                            <Text style={styles.workoutsValue}>{workoutsDisplay}</Text>
                            <Text style={styles.workoutsSub}>Sessions{"\n"}this week</Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.hubRow}>
            {interactive ? (
                <Pressable
                    style={styles.pressable}
                    hitSlop={scaleSize(8)}
                    android_ripple={{ color: "rgba(255,255,255,0.08)", borderless: false }}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !interactive }}
                    onPress={handlePress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                >
                    <Animated.View style={[styles.card, styles.cardPressable, { transform: [{ scale }] }]}>
                        {cardContent}
                    </Animated.View>
                </Pressable>
            ) : (
                <View style={styles.card}>{cardContent}</View>
            )}
        </View>
    );
}

const areEqual = (a, b) => (
    a.afterPaint === b.afterPaint &&
    a.fill === b.fill &&
    a.todayCalories === b.todayCalories &&
    a.caloriesGoal === b.caloriesGoal &&
    a.workoutsThisWeek === b.workoutsThisWeek &&
    a.weeklyGoal === b.weeklyGoal
);

export default memo(HubRowCmp, areEqual);

const styles = StyleSheet.create({
    hubRow: { paddingHorizontal: scaleSize(16), marginTop: scaleSize(6) },
    pressable: { borderRadius: CARD_RADIUS },
    card: {
        flex: 1,
        backgroundColor: theme.surface,
        borderRadius: CARD_RADIUS,
        paddingHorizontal: scaleSize(16),
        paddingVertical: scaleSize(16),
        justifyContent: "center",
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
    cardPressable: { overflow: "hidden" },
    metricsRow: { flexDirection: "row", alignItems: "stretch", gap: scaleSize(16) },
    metric: { flex: 1, justifyContent: "center" },
    divider: {
        width: 2,
        backgroundColor: "rgba(255,255,255,0.14)",
        alignSelf: "center",
        height: DIVIDER_HEIGHT,
    },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: scaleSize(12) },
    headerRowStart: { justifyContent: "flex-start", gap: scaleSize(6) },

    macrosCaption: { color: "#ffffffff", fontSize: scaleSize(12), fontFamily: "Outfit_700Bold" },

    ringWrap: { alignItems: "center", justifyContent: "center", marginTop: 0, paddingVertical: scaleSize(8), minHeight: RING_SIZE + scaleSize(10) },
    ringCenter: { alignItems: "center", justifyContent: "center", marginTop: 0 },
    // Match NutritionSummaryCard ring text styles
    kcalValue: { color: theme.textPrimary, fontSize: scaleSize(23), fontFamily: "Outfit_800ExtraBold", marginBottom: scaleSize(2) },
    kcalSub: { color: theme.textSecondary, fontSize: scaleSize(11), fontFamily: "Outfit_700Bold", marginBottom: scaleSize(2) },
    workoutsValue: { color: theme.textPrimary, fontSize: scaleSize(23), fontFamily: "Outfit_800ExtraBold", marginBottom: scaleSize(4) },
    workoutsSub: {
        color: theme.textPrimary,
        opacity: 0.8,
        fontSize: scaleSize(11),
        fontFamily: "Outfit_600SemiBold",
        textAlign: "center",
        lineHeight: scaleSize(13),
        marginTop: scaleSize(-2)
    },
});
