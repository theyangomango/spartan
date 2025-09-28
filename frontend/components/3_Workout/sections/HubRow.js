import React, { memo, useRef, useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Platform, Pressable, Animated, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import theme from "../../../theme/mfpDark";
// Single root navigator; no nested overlay helpers needed
import scaleSize from "../../../helper/scaleSize";
import { strong as haptic } from "../../../utils/haptics";
import { HUB_CARD_HEIGHT } from "./workoutTheme";
import updateDoc from "../../../../backend/helper/firebase/updateDoc";
// Removed unused bounceable/touchable imports to keep things lean
const CARD_MIN_HEIGHT = HUB_CARD_HEIGHT;
const CARD_RADIUS = scaleSize(30);
const MIN_WEEKLY_GOAL = 1;
const MAX_WEEKLY_GOAL = 14;

const CARD_GRADIENT = ["#26324B", "#1A2438"];
const CARD_BORDER = "rgba(110, 184, 255, 0.38)";
const CARD_SHEEN = "rgba(148, 208, 255, 0.18)";
const PROGRESS_TRACK = "rgba(82, 126, 188, 0.46)";
const PROGRESS_FILL = "#49AFFF";

function HubRowCmp({
    afterPaint,
    dataHydrated,
    fill,
    todayCalories,
    caloriesGoal,
    workoutsThisWeek,
    weeklyGoal,
    onPress,
    onReady,
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
    const [weeklyGoalOverride, setWeeklyGoalOverride] = useState(null);
    const displayWeeklyGoal = weeklyGoalOverride ?? safeWeeklyGoal;
    const normalizedWeeklyGoal = displayWeeklyGoal > 0 ? Math.round(displayWeeklyGoal) : 0;
    const [editGoalVisible, setEditGoalVisible] = useState(false);
    const [draftGoal, setDraftGoal] = useState(() => (normalizedWeeklyGoal > 0 ? normalizedWeeklyGoal : MIN_WEEKLY_GOAL));
    const getUserUid = useCallback(() => {
        try {
            return global?.userData?.uid || null;
        } catch {
            return null;
        }
    }, []);
    const weeklyFill = normalizedWeeklyGoal > 0 ? Math.min(100, (safeWeeklyCount / normalizedWeeklyGoal) * 100) : 0;
    const workoutsDisplay = normalizedWeeklyGoal > 0 ? `${safeWeeklyCount}/${normalizedWeeklyGoal}` : `${safeWeeklyCount}`;
    const caloriesFillWidth = afterPaint ? `${safeFill}%` : "0%";
    const weeklyFillWidth = afterPaint ? `${weeklyFill}%` : "0%";
    const withinCalorieGoal = safeGoal > 0 && Math.abs(safeToday - safeGoal) <= safeGoal * 0.1;
    const atOrAboveWeeklyGoal = normalizedWeeklyGoal > 0 && safeWeeklyCount >= normalizedWeeklyGoal;
    const caloriesFillStyle = [
        styles.progressFill,
        { width: caloriesFillWidth, backgroundColor: withinCalorieGoal ? theme.success : PROGRESS_FILL },
    ];
    const weeklyFillStyle = [
        styles.progressFill,
        { width: weeklyFillWidth, backgroundColor: atOrAboveWeeklyGoal ? theme.success : PROGRESS_FILL },
    ];
    const readyRef = useRef(false);
    const readyRafRef = useRef({ outer: null, inner: null });
    const clearReadyRafs = useCallback(() => {
        const { outer, inner } = readyRafRef.current;
        if (typeof outer === "number") {
            cancelAnimationFrame(outer);
        }
        if (typeof inner === "number") {
            cancelAnimationFrame(inner);
        }
        readyRafRef.current = { outer: null, inner: null };
    }, []);

    const scheduleReady = useCallback(() => {
        if (readyRef.current || !afterPaint || !dataHydrated) return;
        clearReadyRafs();
        const outer = requestAnimationFrame(() => {
            const inner = requestAnimationFrame(() => {
                if (readyRef.current || !afterPaint || !dataHydrated) return;
                readyRef.current = true;
                try {
                    onReady?.();
                } catch {
                    // noop — readiness signal is best-effort
                }
            });
            readyRafRef.current.inner = inner;
        });
        readyRafRef.current.outer = outer;
    }, [afterPaint, clearReadyRafs, dataHydrated, onReady]);

    useEffect(() => {
        if (!afterPaint || !dataHydrated) {
            readyRef.current = false;
            clearReadyRafs();
            return () => {
                clearReadyRafs();
            };
        }
        const metricsReady = Number.isFinite(safeGoal) && Number.isFinite(displayWeeklyGoal);
        if (!metricsReady) {
            return () => {
                clearReadyRafs();
            };
        }
        scheduleReady();
        return () => {
            clearReadyRafs();
        };
    }, [afterPaint, clearReadyRafs, dataHydrated, displayWeeklyGoal, safeFill, safeGoal, safeToday, safeWeeklyCount, scheduleReady, weeklyFill]);

    useEffect(() => {
        if (!editGoalVisible) {
            setDraftGoal(normalizedWeeklyGoal > 0 ? normalizedWeeklyGoal : MIN_WEEKLY_GOAL);
        }
    }, [editGoalVisible, normalizedWeeklyGoal]);

    useEffect(() => {
        setWeeklyGoalOverride(null);
    }, [safeWeeklyGoal]);

    const handleEditPress = useCallback(
        (event) => {
            event?.stopPropagation?.();
            setDraftGoal(normalizedWeeklyGoal > 0 ? normalizedWeeklyGoal : MIN_WEEKLY_GOAL);
            setEditGoalVisible(true);
        },
        [normalizedWeeklyGoal],
    );

    const handleCloseGoalModal = useCallback(() => {
        setEditGoalVisible(false);
    }, []);

    const handleIncreaseGoal = useCallback(() => {
        setDraftGoal((current) => Math.min(MAX_WEEKLY_GOAL, current + 1));
    }, []);

    const handleDecreaseGoal = useCallback(() => {
        setDraftGoal((current) => Math.max(MIN_WEEKLY_GOAL, current - 1));
    }, []);

    const saveGoalRemotely = useCallback(
        async (nextGoal, fallbackGoal) => {
            const uid = getUserUid();
            if (!uid) return;
            try {
                await updateDoc("users", uid, { weeklyWorkoutGoal: nextGoal });
            } catch (err) {
                console.warn("Failed to save weekly workout goal", err);
                setWeeklyGoalOverride(fallbackGoal);
                try {
                    global.userData = { ...(global.userData || {}), weeklyWorkoutGoal: fallbackGoal };
                } catch {}
            }
        },
        [getUserUid, setWeeklyGoalOverride],
    );

    const handleSaveGoal = useCallback(() => {
        const sanitized = Math.round(draftGoal);
        const clamped = Math.max(MIN_WEEKLY_GOAL, Math.min(MAX_WEEKLY_GOAL, sanitized));
        const previousGoal = normalizedWeeklyGoal > 0 ? normalizedWeeklyGoal : MIN_WEEKLY_GOAL;
        setWeeklyGoalOverride(clamped);
        try {
            global.userData = { ...(global.userData || {}), weeklyWorkoutGoal: clamped };
        } catch {}
        setEditGoalVisible(false);
        void saveGoalRemotely(clamped, previousGoal);
    }, [draftGoal, normalizedWeeklyGoal, saveGoalRemotely]);

    const atGoalMin = draftGoal <= MIN_WEEKLY_GOAL;
    const atGoalMax = draftGoal >= MAX_WEEKLY_GOAL;

    const cardContent = (
        <View style={styles.cardBody}>
            <View style={styles.cardTop}>
                <Text style={styles.headerTitle}>Your Progress</Text>
                <View style={styles.subtitleRow}>
                    <Ionicons
                        name="sparkles-outline"
                        size={scaleSize(14)}
                        color={theme.textSecondary}
                    />
                    <Text style={styles.headerSubtitle}>Tap to view logs</Text>
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
                        <View style={caloriesFillStyle} />
                    </View>
                </View>
                <View style={styles.statRow}>
                    <View style={styles.statHeadingRow}>
                        <Text style={styles.statLabel}>Workouts this week</Text>
                        <View style={styles.statValueRow}>
                            <Text style={styles.statValue}>{workoutsDisplay}</Text>
                            <Pressable
                                accessibilityRole="button"
                                hitSlop={{ top: scaleSize(6), right: scaleSize(6), bottom: scaleSize(6), left: scaleSize(6) }}
                                onPress={handleEditPress}
                                style={({ pressed }) => [
                                    styles.statEditPressable,
                                    pressed && styles.statEditPressablePressed,
                                ]}
                            >
                                <Text style={styles.statEditLabel}>Edit</Text>
                            </Pressable>
                        </View>
                    </View>
                    <View style={styles.progressTrack}>
                        <View style={weeklyFillStyle} />
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
            <Modal
                animationType="fade"
                visible={editGoalVisible}
                transparent
                onRequestClose={handleCloseGoalModal}
            >
                <View style={styles.goalModalBackdrop}>
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={handleCloseGoalModal}
                        accessibilityRole="button"
                        accessibilityLabel="Close goal editor"
                    />
                    <View style={styles.goalModalCard}>
                        <Text style={styles.goalModalTitle}>Adjust weekly goal</Text>
                        <Text style={styles.goalModalDescription}>
                            Set how many workouts you aim to complete each week.
                        </Text>
                        <View style={styles.goalAdjustRow}>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Decrease weekly goal"
                                disabled={atGoalMin}
                                onPress={handleDecreaseGoal}
                                style={({ pressed }) => [
                                    styles.goalAdjustButton,
                                    atGoalMin && styles.goalAdjustButtonDisabled,
                                    pressed && !atGoalMin && styles.goalAdjustButtonPressed,
                                ]}
                            >
                                <Text style={styles.goalAdjustButtonSymbol}>-</Text>
                            </Pressable>
                            <View style={styles.goalValueShell}>
                                <Text style={styles.goalValueText}>{draftGoal}</Text>
                                <Text style={styles.goalValueSuffix}>per week</Text>
                            </View>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Increase weekly goal"
                                disabled={atGoalMax}
                                onPress={handleIncreaseGoal}
                                style={({ pressed }) => [
                                    styles.goalAdjustButton,
                                    atGoalMax && styles.goalAdjustButtonDisabled,
                                    pressed && !atGoalMax && styles.goalAdjustButtonPressed,
                                ]}
                            >
                                <Text style={styles.goalAdjustButtonSymbol}>+</Text>
                            </Pressable>
                        </View>
                        <View style={styles.goalModalActions}>
                            <Pressable
                                accessibilityRole="button"
                                onPress={handleCloseGoalModal}
                                style={({ pressed }) => [
                                    styles.goalModalSecondaryButton,
                                    pressed && styles.goalModalSecondaryButtonPressed,
                                ]}
                            >
                                <Text style={styles.goalModalSecondaryText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                accessibilityRole="button"
                                onPress={handleSaveGoal}
                                style={({ pressed }) => [
                                    styles.goalModalPrimaryButton,
                                    pressed && styles.goalModalPrimaryButtonPressed,
                                ]}
                            >
                                <Text style={styles.goalModalPrimaryText}>Save</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );

}

const areEqual = (a, b) => (
    a.afterPaint === b.afterPaint &&
    a.dataHydrated === b.dataHydrated &&
    a.fill === b.fill &&
    a.todayCalories === b.todayCalories &&
    a.caloriesGoal === b.caloriesGoal &&
    a.workoutsThisWeek === b.workoutsThisWeek &&
    a.weeklyGoal === b.weeklyGoal &&
    a.onReady === b.onReady
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
        gap: scaleSize(14),
        paddingHorizontal: scaleSize(4),
    },
    cardTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(17),
        color: theme.textPrimary,
        letterSpacing: 0.2,
    },
    subtitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: scaleSize(6),
    },
    headerSubtitle: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12),
        color: theme.textSecondary,
        letterSpacing: 0.2,
    },
    statsList: {
        gap: scaleSize(10),
    },
    statRow: {
        gap: scaleSize(6),
    },
    statHeadingRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    statValueRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    statEditPressable: {
        paddingHorizontal: scaleSize(8),
        paddingVertical: scaleSize(4),
        borderRadius: scaleSize(999),
        backgroundColor: "transparent",
    },
    statEditPressablePressed: {
        backgroundColor: "rgba(73, 175, 255, 0.16)",
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
    statEditLabel: {
        color: theme.accentBlue,
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(13),
        letterSpacing: 0.3,
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
    goalModalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(9, 16, 27, 0.68)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: scaleSize(20),
    },
    goalModalCard: {
        width: "100%",
        maxWidth: scaleSize(300),
        borderRadius: scaleSize(24),
        paddingVertical: scaleSize(20),
        paddingHorizontal: scaleSize(22),
        backgroundColor: theme.primaryDeep,
        borderWidth: scaleSize(1),
        borderColor: "rgba(110, 184, 255, 0.42)",
        gap: scaleSize(16),
    },
    goalModalTitle: {
        color: theme.textPrimary,
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(17),
        textAlign: "center",
    },
    goalModalDescription: {
        color: theme.textSecondary,
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(13),
        lineHeight: scaleSize(18),
        textAlign: "center",
    },
    goalAdjustRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: scaleSize(16),
    },
    goalAdjustButton: {
        width: scaleSize(40),
        height: scaleSize(40),
        borderRadius: scaleSize(20),
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(79, 146, 211, 0.32)",
    },
    goalAdjustButtonPressed: {
        backgroundColor: "rgba(79, 146, 211, 0.5)",
    },
    goalAdjustButtonDisabled: {
        backgroundColor: "rgba(79, 146, 211, 0.18)",
    },
    goalAdjustButtonSymbol: {
        color: theme.textPrimary,
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(22),
        lineHeight: scaleSize(24),
        textAlign: "center",
    },
    goalValueShell: {
        alignItems: "center",
        gap: scaleSize(6),
    },
    goalValueText: {
        color: theme.textPrimary,
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(28),
        letterSpacing: 0.4,
    },
    goalValueSuffix: {
        color: theme.textSecondary,
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12),
        letterSpacing: 0.3,
    },
    goalModalActions: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: scaleSize(16),
    },
    goalModalSecondaryButton: {
        paddingVertical: scaleSize(10),
        paddingHorizontal: scaleSize(18),
        borderRadius: scaleSize(999),
        borderWidth: scaleSize(1),
        borderColor: "rgba(110, 184, 255, 0.42)",
        backgroundColor: "transparent",
    },
    goalModalSecondaryButtonPressed: {
        backgroundColor: "rgba(73, 175, 255, 0.18)",
    },
    goalModalPrimaryButton: {
        paddingVertical: scaleSize(10),
        paddingHorizontal: scaleSize(22),
        borderRadius: scaleSize(999),
        backgroundColor: PROGRESS_FILL,
    },
    goalModalPrimaryButtonPressed: {
        backgroundColor: "#64BEFF",
    },
    goalModalSecondaryText: {
        color: theme.textPrimary,
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(13),
        letterSpacing: 0.2,
    },
    goalModalPrimaryText: {
        color: theme.primaryDeep,
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(13),
        letterSpacing: 0.3,
    },
});
