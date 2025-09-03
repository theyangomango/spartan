import React, { memo } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import { usePfp } from "../../../helper/usePFPs";
import { ss } from "./workoutTheme"; // keep path consistent with your project
import MiniPodium from "./MiniPodium";
import { navigationRef } from "../../../../navigationRef";
import { StackActions } from "@react-navigation/native";
// Removed unused bounceable/touchable imports to keep things lean

const PodiumPreview = memo(function PodiumPreview({ top3 = [] }) {
    // keep this super cheap
    const data = (top3 || []).slice(0, 3).map((u) => ({
        pfp: usePfp(u?.uid) || u?.fallbackPfp || "",
        handle: u?.handle || "",
        stat: u?.stat || 0,
    }));
    return <MiniPodium data={data} />;
});

function HubRowCmp({
    navigation,
    afterPaint,
    fill,
    todayCalories,
    caloriesGoal,
    top3,
    PREVIEW_LABEL,
}) {
    // Hard-guard every numeric prop sent into Animated components
    const safeFill =
        Number.isFinite(fill) ? Math.max(0, Math.min(100, Number(fill))) : 0;
    const safeToday = Number.isFinite(todayCalories) ? todayCalories : 0;
    const safeGoal = Number.isFinite(caloriesGoal) ? Math.max(1, caloriesGoal) : 1;

    return (
        <View style={styles.hubRow}>
            {/* Calories card */}
            <Pressable
                accessibilityRole="button"
                android_ripple={{ color: "rgba(2,6,23,0.08)", radius: 140, borderless: false }}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPressIn={() => {
                    // Prefer root ref push to ensure correct transition
                    try {
                        if (navigationRef?.isReady?.()) {
                            navigationRef.dispatch(StackActions.push('MacroTrackingOverlay'));
                            return;
                        }
                    } catch {}
                    // Fallbacks to reach the root overlay in nested stacks
                    try {
                        const rootNav = navigation?.getParent?.('ROOT');
                        if (rootNav?.push) rootNav.push('MacroTrackingOverlay');
                        else if (rootNav?.navigate) rootNav.navigate('MacroTrackingOverlay');
                        else navigation.navigate('MacroTrackingOverlay');
                    } catch {
                        navigation.navigate('MacroTrackingOverlay');
                    }
                }}
            >
                <View style={[styles.headerRow, styles.headerRowStart]}>
                    <Text style={styles.chevronLeft}>‹</Text>
                    <Text style={styles.macrosCaption}>Today’s Calories</Text>
                </View>
                <View style={styles.ringWrap}>
                    {afterPaint ? (
                        <AnimatedCircularProgress
                            size={ss(140)}
                            width={13}
                            fill={safeFill}
                            tintColor="#6FB8FF"
                            backgroundColor="#E2E8F0"
                            lineCap="round"
                            arcSweepAngle={360}
                            rotation={0}
                        >
                            {() => (
                                <View style={styles.ringCenter}>
                                    <Text style={styles.kcalValue}>{safeToday.toLocaleString()}</Text>
                                    <Text style={styles.kcalSub}>/ {safeGoal.toLocaleString()} kcal</Text>
                                </View>
                            )}
                        </AnimatedCircularProgress>
                    ) : (
                        <View style={styles.ringCenter}>
                            <Text style={styles.kcalValue}>{safeToday.toLocaleString()}</Text>
                            <Text style={styles.kcalSub}>/ {safeGoal.toLocaleString()} kcal</Text>
                        </View>
                    )}
                </View>
            </Pressable>

            {/* Mini podium */}
            <Pressable
                accessibilityRole="button"
                android_ripple={{ color: "rgba(2,6,23,0.08)", radius: 140, borderless: false }}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPressIn={() => navigation.navigate("CompetitionOverlay")}
            >
                <View style={styles.headerRow}>
                    <Text style={styles.podiumCaption}>{PREVIEW_LABEL}</Text>
                    <Text style={styles.chevronRight}>›</Text>
                </View>
                {afterPaint ? <PodiumPreview top3={top3} /> : null}
            </Pressable>
        </View>
    );
}

const areEqual = (a, b) => (
    a.afterPaint === b.afterPaint &&
    a.fill === b.fill &&
    a.todayCalories === b.todayCalories &&
    a.caloriesGoal === b.caloriesGoal &&
    a.PREVIEW_LABEL === b.PREVIEW_LABEL &&
    a.top3 === b.top3
);

export default memo(HubRowCmp, areEqual);

const styles = StyleSheet.create({
    hubRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginTop: 6 },
    card: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 22,
        padding: 14,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(2,6,23,0.06)",
        ...Platform.select({
            ios: { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
            android: { elevation: 2 },
        }),
    },
    cardPressed: {
        transform: [{ scale: 0.985 }],
        backgroundColor: "#F8FAFC",
        borderColor: "rgba(2,6,23,0.12)",
        ...Platform.select({
            ios: { shadowOpacity: 0.09, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
            android: { elevation: 4 },
        }),
    },

    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
    headerRowStart: { justifyContent: "flex-start", gap: 6 },

    macrosCaption: { color: "#64748B", fontSize: 12, fontFamily: "Outfit_700Bold" },
    podiumCaption: { color: "#64748B", fontSize: 12, fontFamily: "Outfit_700Bold" },
    chevronRight: { color: "#94A3B8", fontSize: 18, lineHeight: 18, includeFontPadding: false },
    chevronLeft: { color: "#94A3B8", fontSize: 18, lineHeight: 18, includeFontPadding: false },

    ringWrap: { alignItems: "center", justifyContent: "center" },
    ringCenter: { alignItems: "center", justifyContent: "center" },
    kcalValue: { color: "#0F172A", fontSize: ss(26), fontFamily: "Outfit_800ExtraBold", marginTop: -3, letterSpacing: 0.2 },
    kcalSub: { color: "#64748B", fontSize: ss(12.5), fontFamily: "Outfit_600SemiBold" },
});
