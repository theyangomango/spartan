import React, { memo } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import { usePfp } from "../../../helper/usePFPs";
import { ss } from "./workoutTheme"; // keep path consistent with your project
import MiniPodium from "./MiniPodium";
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
                android_ripple={{ color: "rgba(2,6,23,0.08)", radius: 140, borderless: false }}
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
    podiumCaptionClamp: { flex: 1, marginRight: 8, maxWidth: '85%' },
    chevronRight: { color: "#94A3B8", fontSize: 18, lineHeight: 18, includeFontPadding: false },
    chevronLeft: { color: "#94A3B8", fontSize: 18, lineHeight: 18, includeFontPadding: false },

    ringWrap: { alignItems: "center", justifyContent: "center", marginTop: scaleSize(5) },
    ringCenter: { alignItems: "center", justifyContent: "center" },
    kcalValue: { color: "#0F172A", fontSize: ss(26), fontFamily: "Outfit_800ExtraBold", marginTop: -3, letterSpacing: 0.2 },
    kcalSub: { color: "#64748B", fontSize: ss(12.5), fontFamily: "Outfit_600SemiBold" },
});
