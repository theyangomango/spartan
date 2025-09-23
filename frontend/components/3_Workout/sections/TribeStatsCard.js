import React, { memo, useRef, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Platform, Pressable, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import scaleSize from "../../../helper/scaleSize";
import { strong as haptic } from "../../../utils/haptics";
import { useCommunityStats, refreshCommunityStats } from "../../../logic/communityStats";

const CARD_BG = "#5A3C1F";
const CARD_BORDER = "rgba(248, 201, 129, 0.44)";
const TEXT_PRIMARY = "#FFF3DB";
const TEXT_SECONDARY = "rgba(255, 230, 186, 0.72)";
const DIVIDER_COLOR = "rgba(248, 201, 129, 0.38)";
const RIPPLE_COLOR = "rgba(248, 201, 129, 0.26)";
const CARD_GRADIENT = ["#5A3C1F", "#2C2620"];

const formatWithSeparators = (value) => {
    const n = Math.round(Number(value) || 0);
    try { return n.toLocaleString(); } catch { return String(n); }
};

const formatCompact = (value) => {
    const n = Number(value) || 0;
    if (!Number.isFinite(n) || n <= 0) return "0";
    if (n >= 1_000_000) {
        const scaled = n / 1_000_000;
        const decimals = scaled >= 10 ? 0 : 1;
        return `${scaled.toFixed(decimals)}M`;
    }
    if (n >= 1_000) {
        const scaled = n / 1_000;
        const decimals = scaled >= 10 ? 0 : 1;
        return `${scaled.toFixed(decimals)}k`;
    }
    return formatWithSeparators(n);
};

function TribeStatsCardCmp({ onPress }) {
    const scale = useRef(new Animated.Value(1)).current;
    const { stats, loading, ready, updatedAt } = useCommunityStats();

    const hasSnapshot = updatedAt > 0 || ready;

    const statsDisplay = useMemo(() => {
        const base = hasSnapshot ? stats || { reps: 0, volume: 0, pbs: 0 } : { reps: 0, volume: 0, pbs: 0 };
        return [
            {
                key: "reps",
                label: "Total Reps",
                value: hasSnapshot ? formatWithSeparators(base.reps) : "--",
            },
            {
                key: "volume",
                label: "Lbs Lifted",
                value: hasSnapshot ? formatCompact(base.volume) : "--",
            },
            {
                key: "pbs",
                label: "PRs",
                value: hasSnapshot ? formatWithSeparators(base.pbs) : "--",
            },
        ];
    }, [hasSnapshot, stats]);

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
        try {
            const maybeRefresh = refreshCommunityStats({ force: true });
            if (maybeRefresh && typeof maybeRefresh.catch === "function") {
                maybeRefresh.catch(() => {});
            }
        } catch {}
        if (!onPress) return;
        try { haptic(); } catch { }
        onPress();
    }, [onPress]);

    const interactive = typeof onPress === "function";

    return (
        <View style={styles.wrap}>
            <Pressable
                disabled={!interactive}
                android_ripple={{ color: RIPPLE_COLOR }}
                style={styles.pressable}
                accessibilityRole="button"
                accessibilityLabel="Open friends activity"
                accessibilityState={{ disabled: !interactive }}
                hitSlop={scaleSize(8)}
                onPress={handlePress}
                onPressIn={interactive ? handlePressIn : undefined}
                onPressOut={interactive ? handlePressOut : undefined}
            >
                <Animated.View style={[styles.cardShadow, { transform: [{ scale }] }] }>
                    <LinearGradient
                        colors={CARD_GRADIENT}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.card}
                    >
                        <View style={styles.metaColumn}>
                            <Text style={styles.subtitle}>
                                Your community's totals this week.
                                <Text style={styles.subtitleAction}>{'\n'}View friends</Text>
                            </Text>
                        </View>
                        <View style={styles.statsRow}>
                            {statsDisplay.map((stat, idx) => (
                                <View
                                    // eslint-disable-next-line react/no-array-index-key
                                    key={stat.key || idx}
                                    style={[
                                        styles.statCol,
                                        idx === 2 ? styles.statColCompact : styles.statColWide,
                                        idx === 1 && styles.statColMiddle,
                                        loading && !hasSnapshot && styles.statColLoading,
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
                    </LinearGradient>
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
    cardShadow: {
        borderRadius: CARD_RADIUS,
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
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: CARD_BG,
        borderRadius: CARD_RADIUS,
        paddingVertical: scaleSize(20),
        paddingLeft: scaleSize(20),
        paddingRight: scaleSize(4),
        borderWidth: scaleSize(1),
        borderColor: CARD_BORDER,
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
        fontSize: scaleSize(scaleSize(10)),
        color: TEXT_SECONDARY,
        letterSpacing: 0.28,
    },
    subtitleAction: {
        color: TEXT_PRIMARY,
        fontFamily: "Outfit_800ExtraBold",
    },
    statsRow: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginLeft: scaleSize(4),
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
    statColLoading: {
        opacity: 0.7,
    },
    statValue: { fontFamily: "Outfit_800ExtraBold", fontSize: scaleSize(scaleSize(18)), color: TEXT_PRIMARY, letterSpacing: 0.24 },
    statValueCompact: { fontSize: scaleSize(scaleSize(18)) },
    statLabel: {
        marginTop: scaleSize(2),
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(scaleSize(11)),
        color: TEXT_SECONDARY,
        letterSpacing: 0.24,
    },
    statLabelCompact: { fontSize: scaleSize(scaleSize(11))},
});
