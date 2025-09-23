import React, { memo, useRef, useCallback } from "react";
import { View, Text, StyleSheet, Platform, Pressable, Animated } from "react-native";
import scaleSize from "../../../helper/scaleSize";
import { strong as haptic } from "../../../utils/haptics";

const CARD_BG = "#433422";
const CARD_BORDER = "rgba(255, 210, 156, 0.58)";
const TEXT_PRIMARY = "#FFF5E2";
const TEXT_SECONDARY = "rgba(255, 235, 205, 0.82)";
const DIVIDER_COLOR = "rgba(255, 222, 180, 0.42)";

const MOCK_STATS = [
    { key: "reps", label: "Total Reps", value: "14,320" },
    { key: "pounds", label: "Lbs Lifted", value: "98.6k" },
    { key: "pbs", label: "PRs", value: "28" },
];

function TribeStatsCardCmp({ onPress }) {
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
        <View style={styles.wrap}>
            <Pressable
                disabled={!interactive}
                android_ripple={{ color: "rgba(255, 218, 170, 0.24)" }}
                style={styles.pressable}
                accessibilityRole="button"
                accessibilityLabel="Open friends activity"
                accessibilityState={{ disabled: !interactive }}
                hitSlop={scaleSize(8)}
                onPress={handlePress}
                onPressIn={interactive ? handlePressIn : undefined}
                onPressOut={interactive ? handlePressOut : undefined}
            >
                <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
                    <View style={styles.metaColumn}>
                        <Text style={styles.subtitle}>
                            Your community's totals this week.
                            <Text style={styles.subtitleAction}>{'\n'}View friends</Text>
                        </Text>
                    </View>
                    <View style={styles.statsRow}>
                        {MOCK_STATS.map((stat, idx) => (
                            <View
                                // eslint-disable-next-line react/no-array-index-key
                                key={stat.key || idx}
                                style={[
                                    styles.statCol,
                                    idx === 2 ? styles.statColCompact : styles.statColWide,
                                    idx === 1 && styles.statColMiddle,
                                ]}
                            >
                                <Text
                                    style={[styles.statValue, idx === 2 && styles.statValueCompact]}
                                    numberOfLines={1}
                                    ellipsizeMode="clip"
                                >
                                    {stat.value}
                                </Text>
                                <Text
                                    style={[styles.statLabel, idx === 2 && styles.statLabelCompact]}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                >
                                    {stat.label}
                                </Text>
                            </View>
                        ))}
                    </View>
                </Animated.View>
            </Pressable>
        </View>
    );
}

export default memo(TribeStatsCardCmp);

const CARD_RADIUS = scaleSize(24);

const styles = StyleSheet.create({
    wrap: { paddingHorizontal: scaleSize(16), marginBottom: scaleSize(6) },
    pressable: { borderRadius: CARD_RADIUS },
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: CARD_BG,
        borderRadius: CARD_RADIUS,
        paddingVertical: scaleSize(20),
        paddingLeft: scaleSize(16),
        paddingRight: scaleSize(4),
        borderWidth: scaleSize(1),
        borderColor: CARD_BORDER,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOpacity: 0.12,
                shadowRadius: scaleSize(14),
                shadowOffset: { width: 0, height: scaleSize(6) },
            },
            android: {
                elevation: 4,
            },
        }),
    },
    metaColumn: {
        gap: scaleSize(2),
        maxWidth: scaleSize(120),
        alignItems: "flex-start",
        justifyContent: "center",
        paddingRight: scaleSize(8),
        flexShrink: 1,
    },
    subtitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(10),
        color: TEXT_SECONDARY,
        letterSpacing: 0.28,
    },
    subtitleAction: {
        color: TEXT_PRIMARY,
        fontFamily: "Outfit_700Bold",
    },
    statsRow: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginLeft: scaleSize(6),
        paddingRight: scaleSize(4),
    },
    statCol: {
        flexBasis: 0,
        flexGrow: 0,
        flexShrink: 1,
        minWidth: 0,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scaleSize(2),
    },
    statColWide: {
        flexGrow: 35,
    },
    statColMiddle: {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderColor: DIVIDER_COLOR,
        paddingHorizontal: scaleSize(6),
    },
    statColCompact: {
        flexGrow: 30,
        minWidth: 0,
        alignItems: "center",
        justifyContent: "center",
    },
    statValue: { fontFamily: "Outfit_800ExtraBold", fontSize: scaleSize(18), color: TEXT_PRIMARY, letterSpacing: 0.24 },
    statValueCompact: { fontSize: scaleSize(18) },
    statLabel: {
        marginTop: scaleSize(2),
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(11),
        color: TEXT_SECONDARY,
        letterSpacing: 0.24,
    },
    statLabelCompact: { fontSize: scaleSize(11) },
});
