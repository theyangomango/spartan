import React, { memo, useRef, useCallback } from "react";
import { View, Text, StyleSheet, Platform, Pressable, Animated } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import theme from "../../../theme/mfpDark";
// Single root navigator; no nested overlay helpers needed
import scaleSize from "../../../helper/scaleSize";
import { strong as haptic } from "../../../utils/haptics";
// Removed unused bounceable/touchable imports to keep things lean

const CARD_MIN_HEIGHT = scaleSize(170);
const CARD_RADIUS = scaleSize(30);

const CARD_GRADIENT = ["#1D2437", "#121926"];
const CARD_BORDER = "rgba(92, 162, 255, 0.24)";
const CARD_SHEEN = "rgba(120, 180, 255, 0.12)";
const BADGE_BG = "rgba(45, 158, 255, 0.16)";
const BADGE_BORDER = "rgba(45, 158, 255, 0.45)";
const PROGRESS_TRACK = "rgba(64, 96, 146, 0.35)";
const PROGRESS_FILL = "#2D9EFF";

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
    const caloriesFillWidth = afterPaint ? `${safeFill}%` : "0%";
    const weeklyFillWidth = afterPaint ? `${weeklyFill}%` : "0%";
    const cardContent = (
        <View style={styles.cardBody}>
            <View style={styles.cardTop}>
                <Text style={styles.headerTitle}>Your Progress</Text>
                <View style={styles.headerBadge}>
                    <View style={styles.headerDot} />
                    <Text style={styles.headerBadgeText}>VIEW LOGS</Text>
                    <Feather name="chevron-right" size={scaleSize(12)} color={theme.textPrimary} style={styles.headerIcon} />
                </View>
            </View>

            <View style={styles.statsList}>
                <View style={styles.statRow}>
                    <View style={styles.statHeadingRow}>
                        <Text style={styles.statLabel}>Calories today</Text>
                        <Text style={styles.statValue}>
                            {Math.max(0, safeToday)}
                            <Text style={styles.statValueSub}> / {safeGoal} kcal</Text>
                        </Text>
                    </View>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: caloriesFillWidth }]} />
                    </View>
                </View>
                <View style={styles.statRow}>
                    <View style={styles.statHeadingRow}>
                        <Text style={styles.statLabel}>Sessions this week</Text>
                        <Text style={styles.statValue}>{workoutsDisplay}</Text>
                    </View>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: weeklyFillWidth }]} />
                    </View>
                </View>
            </View>
        </View>
    );

    const animatedCardStyle = interactive ? { transform: [{ scale }] } : null;

    const cardShell = (
        <Animated.View style={[styles.cardShadow, animatedCardStyle]}>
            <LinearGradient
                colors={CARD_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
            >
                <View pointerEvents="none" style={styles.cardSheen} />
                {cardContent}
            </LinearGradient>
        </Animated.View>
    );

    return (
        <View style={styles.hubRow}>
            {interactive ? (
                <Pressable
                    style={styles.pressable}
                    hitSlop={scaleSize(8)}
                    android_ripple={{ color: "rgba(82, 150, 255, 0.18)", borderless: false }}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !interactive }}
                    onPress={handlePress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                >
                    {cardShell}
                </Pressable>
            ) : (
                cardShell
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
    cardShadow: {
        width: "100%",
        borderRadius: CARD_RADIUS,
        minHeight: CARD_MIN_HEIGHT,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOpacity: 0.22,
                shadowRadius: scaleSize(12),
                shadowOffset: { width: 0, height: scaleSize(6) },
            },
            android: {
                elevation: 4,
            },
        }),
    },
    cardGradient: {
        flex: 1,
        borderRadius: CARD_RADIUS,
        paddingHorizontal: scaleSize(18),
        paddingVertical: scaleSize(18),
        borderWidth: scaleSize(1),
        borderColor: CARD_BORDER,
        backgroundColor: theme.primaryDeep,
        overflow: "hidden",
    },
    cardSheen: {
        position: "absolute",
        top: -scaleSize(48),
        right: -scaleSize(16),
        width: scaleSize(188),
        height: scaleSize(188),
        borderRadius: scaleSize(94),
        backgroundColor: CARD_SHEEN,
        opacity: 0.35,
        transform: [{ rotate: "28deg" }],
    },
    cardBody: {
        flex: 1,
        gap: scaleSize(16),
    },
    cardTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(18),
        color: theme.textPrimary,
        letterSpacing: 0.2,
    },
    headerBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: scaleSize(5),
        paddingHorizontal: scaleSize(10),
        borderRadius: scaleSize(999),
        backgroundColor: BADGE_BG,
        borderWidth: 1,
        borderColor: BADGE_BORDER,
        gap: scaleSize(6),
    },
    headerDot: {
        width: scaleSize(6),
        height: scaleSize(6),
        borderRadius: scaleSize(3),
        backgroundColor: theme.primary,
    },
    headerBadgeText: {
        color: theme.textPrimary,
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(10),
        letterSpacing: 0.6,
        textTransform: "uppercase",
    },
    headerIcon: {
        marginLeft: scaleSize(2),
        marginTop: scaleSize(1),
    },
    statsList: {
        gap: scaleSize(12),
    },
    statRow: {
        gap: scaleSize(8),
    },
    statHeadingRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    statLabel: {
        color: theme.textSecondary,
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(11),
        letterSpacing: 0.4,
        textTransform: "uppercase",
    },
    statValue: {
        color: theme.textPrimary,
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(16),
        letterSpacing: 0.2,
    },
    statValueSub: {
        color: theme.textSecondary,
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(12),
    },
    progressTrack: {
        height: scaleSize(8),
        borderRadius: scaleSize(999),
        backgroundColor: PROGRESS_TRACK,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        backgroundColor: PROGRESS_FILL,
        borderRadius: scaleSize(999),
    },
});
