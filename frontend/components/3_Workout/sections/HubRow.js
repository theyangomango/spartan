import React, { memo } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import { usePfp } from "../../../helper/usePFPs";
import { ss } from "./workoutTheme"; // keep path consistent with your project
import MiniPodium from "./MiniPodium";
import theme from "../../../theme/mfpDark";
// Single root navigator; no nested overlay helpers needed
import scaleSize from "../../../helper/scaleSize";
// Removed unused bounceable/touchable imports to keep things lean

const PodiumPreview = memo(function PodiumPreview({ top3 = [] }) {
    // Call hooks a fixed number of times to avoid rules-of-hooks violations
    const u0 = top3?.[0] || null;
    const u1 = top3?.[1] || null;
    const u2 = top3?.[2] || null;
    const p0 = usePfp(u0?.uid, u0?.pfpVersion ?? 0);
    const p1 = usePfp(u1?.uid, u1?.pfpVersion ?? 0);
    const p2 = usePfp(u2?.uid, u2?.pfpVersion ?? 0);
    const data = [
        { present: !!u0, pfp: p0 || u0?.fallbackPfp || "", handle: u0?.handle || "", stat: u0?.stat || 0 },
        { present: !!u1, pfp: p1 || u1?.fallbackPfp || "", handle: u1?.handle || "", stat: u1?.stat || 0 },
        { present: !!u2, pfp: p2 || u2?.fallbackPfp || "", handle: u2?.handle || "", stat: u2?.stat || 0 },
    ];
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
                android_ripple={{ color: "rgba(255,255,255,0.06)", radius: 140, borderless: false }}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPressIn={() => {
                    try {
                        const rootNav = navigation?.getParent?.('ROOT');
                        if (rootNav?.navigate) rootNav.navigate('MacroTracking', { transition: 'slide-from-left' });
                        else navigation.navigate('MacroTracking', { transition: 'slide-from-left' });
                    } catch { }
                }}
            >
                <View style={[styles.headerRow, styles.headerRowStart]}>
                    <Text style={styles.chevronLeft}>‹</Text>
                    <Text style={styles.macrosCaption}>Today’s Calories</Text>
                </View>
                <View style={styles.ringWrap}>
                    {afterPaint ? (
                        <AnimatedCircularProgress
                            size={ss(132)}
                            width={11}
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
            </Pressable>

            {/* Mini podium */}
            <Pressable
                accessibilityRole="button"
                android_ripple={{ color: "rgba(255,255,255,0.06)", radius: 140, borderless: false }}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPressIn={() => {
                    try {
                        const rootNav = navigation?.getParent?.('ROOT');
                        if (rootNav?.navigate) rootNav.navigate('Competition', { transition: 'slide-from-right' });
                        else navigation.navigate('Competition', { transition: 'slide-from-right' });
                    } catch { }
                }}
            >
                <View style={styles.headerRow}>
                    <Text
                        style={[styles.podiumCaption, styles.podiumCaptionClamp]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {PREVIEW_LABEL}
                    </Text>
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
        backgroundColor: theme.surface,
        borderRadius: 22,
        padding: 14,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
        ...Platform.select({
            // Tone down card drop shadow for a flatter look
            ios: { shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
            android: { elevation: 1 },
        }),
    },
    cardPressed: {
        transform: [{ scale: 0.985 }],
        backgroundColor: "#232932",
        borderColor: "rgba(255,255,255,0.16)",
        ...Platform.select({
            ios: { shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
            android: { elevation: 1 },
        }),
    },

    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
    headerRowStart: { justifyContent: "flex-start", gap: 6 },

    macrosCaption: { color: "#ffffffff", fontSize: 12, fontFamily: "Outfit_700Bold" },
    podiumCaption: { color: "#ffffffff", fontSize: 12, fontFamily: "Outfit_700Bold" },
    podiumCaptionClamp: { flex: 1, marginRight: 8, maxWidth: '85%' },
    chevronRight: { color: "#ffffffff", fontSize: 18, lineHeight: 18, includeFontPadding: false },
    chevronLeft: { color: "#ffffffff", fontSize: 18, lineHeight: 18, includeFontPadding: false },

    ringWrap: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: 0 },
    ringCenter: { alignItems: "center", justifyContent: "center", marginTop: 2 },
    // Match NutritionSummaryCard ring text styles
    kcalValue: { color: theme.textPrimary, fontSize: 25, fontFamily: "Outfit_800ExtraBold", marginBottom: 0 },
    kcalSub: { color: theme.textSecondary, fontSize: 12, fontFamily: "Outfit_700Bold", marginBottom: 4 },
});
