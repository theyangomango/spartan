import React, { memo } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import { ss } from "./workoutTheme"; // keep path consistent with your project
import theme from "../../../theme/mfpDark";
// Single root navigator; no nested overlay helpers needed
import scaleSize from "../../../helper/scaleSize";
// Removed unused bounceable/touchable imports to keep things lean

const RING_SIZE = ss(132);
const RING_STROKE = 11;
const CARD_MIN_HEIGHT = RING_SIZE + scaleSize(70); // allow room for label + SVG stroke bleed

function HubRowCmp({
    afterPaint,
    fill,
    todayCalories,
    caloriesGoal,
    workoutsThisWeek,
    weeklyGoal,
}) {
    // Hard-guard every numeric prop sent into Animated components
    const safeFill =
        Number.isFinite(fill) ? Math.max(0, Math.min(100, Number(fill))) : 0;
    const safeToday = Number.isFinite(todayCalories) ? todayCalories : 0;
    const safeGoal = Number.isFinite(caloriesGoal) ? Math.max(1, caloriesGoal) : 1;
    const safeWeeklyCount = Number.isFinite(workoutsThisWeek) ? Math.max(0, workoutsThisWeek) : 0;
    const safeWeeklyGoal = Number.isFinite(weeklyGoal) ? Math.max(0, weeklyGoal) : 0;
    const weeklyFill = safeWeeklyGoal > 0 ? Math.min(100, (safeWeeklyCount / safeWeeklyGoal) * 100) : 0;
    const workoutsDisplay = safeWeeklyGoal > 0 ? `${safeWeeklyCount}/${safeWeeklyGoal}` : `${safeWeeklyCount}`;

    return (
        <View style={styles.hubRow}>
            {/* Calories card */}
            <View style={styles.card}>
                <View style={[styles.headerRow, styles.headerRowStart]}>
                    <Text style={styles.macrosCaption}>Today’s Calories</Text>
                </View>
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

            {/* Weekly workouts */}
            <View style={styles.card}>
                <View style={[styles.headerRow, styles.headerRowStart]}>
                    <Text style={styles.macrosCaption}>Workouts this week</Text>
                </View>
                <View style={styles.ringWrap}>
                    {afterPaint ? (
                        <AnimatedCircularProgress
                            size={RING_SIZE}
                            width={RING_STROKE}
                            fill={weeklyFill}
                            tintColor="#68CF5C"
                            backgroundColor="#c3f2c34f"
                            lineCap="round"
                            arcSweepAngle={360}
                            rotation={0}
                        >
                            {() => (
                                <View style={styles.ringCenter}>
                                    <Text style={styles.workoutsValue}>{workoutsDisplay}</Text>
                                    <Text style={styles.workoutsSub}>sessions</Text>
                                </View>
                            )}
                        </AnimatedCircularProgress>
                    ) : (
                        <View style={styles.ringCenter}>
                            <Text style={styles.workoutsValue}>{workoutsDisplay}</Text>
                            <Text style={styles.workoutsSub}>sessions</Text>
                        </View>
                    )}
                </View>
            </View>
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
    hubRow: { flexDirection: "row", gap: scaleSize(12), paddingHorizontal: scaleSize(16), marginTop: scaleSize(6) },
    card: {
        flex: 1,
        backgroundColor: theme.surface,
        borderRadius: scaleSize(22),
        padding: scaleSize(14),
        borderWidth: StyleSheet.hairlineWidth,
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
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: scaleSize(12) },
    headerRowStart: { justifyContent: "flex-start", gap: scaleSize(6) },

    macrosCaption: { color: "#ffffffff", fontSize: scaleSize(12), fontFamily: "Outfit_700Bold" },

    ringWrap: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: 0, paddingVertical: scaleSize(6), minHeight: RING_SIZE + scaleSize(12) },
    ringCenter: { alignItems: "center", justifyContent: "center", marginTop: scaleSize(2) },
    // Match NutritionSummaryCard ring text styles
    kcalValue: { color: theme.textPrimary, fontSize: scaleSize(25), fontFamily: "Outfit_800ExtraBold", marginBottom: 0 },
    kcalSub: { color: theme.textSecondary, fontSize: scaleSize(12), fontFamily: "Outfit_700Bold", marginBottom: scaleSize(4) },
    workoutsValue: { color: theme.textPrimary, fontSize: scaleSize(25), fontFamily: "Outfit_800ExtraBold", marginBottom: 0 },
    workoutsSub: { color: theme.textSecondary, fontSize: scaleSize(12), fontFamily: "Outfit_700Bold", marginBottom: scaleSize(4) },
});
