import React, { memo } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import { usePfp } from "../../../helper/usePFPs";
import { ss } from "./workoutTheme"; // keep path consistent with your project
import MiniPodium from "./MiniPodium";

const PodiumPreview = memo(function PodiumPreview({ top3 = [] }) {
    // keep this super cheap
    const data = (top3 || []).slice(0, 3).map((u) => ({
        pfp: usePfp(u?.uid) || u?.fallbackPfp || "",
        handle: u?.handle || "",
        stat: u?.stat || 0,
    }));
    return <MiniPodium data={data} />;
});

export default function HubRow({
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
                style={styles.card}
                onPress={() => navigation.navigate("MacroTrackingOverlay")}
                android_ripple={{ color: "rgba(2,6,23,0.08)", radius: 120, borderless: false }}
            >
                <Text style={styles.macrosCaption}>Today’s Calories</Text>
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
            <View style={styles.card}>
                <Text style={styles.podiumCaption}>{PREVIEW_LABEL}</Text>
                {afterPaint ? <PodiumPreview top3={top3} /> : null}
            </View>
        </View>
    );
}

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

    macrosCaption: { color: "#64748B", fontSize: 12, fontFamily: "Outfit_700Bold", marginBottom: 18 },
    podiumCaption: { color: "#64748B", fontSize: 12, fontFamily: "Outfit_700Bold", marginBottom: 8 },

    ringWrap: { alignItems: "center", justifyContent: "center" },
    ringCenter: { alignItems: "center", justifyContent: "center" },
    kcalValue: { color: "#0F172A", fontSize: ss(26), fontFamily: "Outfit_800ExtraBold", marginTop: -3, letterSpacing: 0.2 },
    kcalSub: { color: "#64748B", fontSize: ss(12.5), fontFamily: "Outfit_600SemiBold" },
});
