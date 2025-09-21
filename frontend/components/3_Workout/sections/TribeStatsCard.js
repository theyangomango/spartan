import React, { memo } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import theme from "../../../theme/mfpDark";
import scaleSize from "../../../helper/scaleSize";

const CARD_BG = theme.surface;
const CARD_BORDER = theme.hairline;
const BADGE_BG = "rgba(45, 158, 255, 0.18)";
const BADGE_BORDER = theme.primaryHairline;
const BADGE_TEXT = theme.primary;

const MOCK_STATS = [
    { key: "reps", label: "Total Reps", value: "14,320" },
    { key: "pounds", label: "Lbs Lifted", value: "98.6k" },
    { key: "pbs", label: "PRs", value: "28" },
];

function TribeStatsCardCmp() {
    return (
        <View style={styles.wrap}>
            <View style={styles.card}>
                <View style={styles.metaColumn}>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>Spartan</Text>
                    </View>
                    <Text style={styles.subtitle}>24h tribe totals</Text>
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
            </View>
        </View>
    );
}

export default memo(TribeStatsCardCmp);

const CARD_RADIUS = scaleSize(20);

const styles = StyleSheet.create({
    wrap: { paddingHorizontal: scaleSize(16), marginBottom: scaleSize(6) },
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: CARD_BG,
        borderRadius: CARD_RADIUS,
        paddingVertical: scaleSize(16),
        paddingLeft: 12,
        paddingRight: 4,
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
    metaColumn: { gap: scaleSize(4), width: scaleSize(70), alignItems: "flex-start", justifyContent: "center" },
    badge: {
        paddingHorizontal: scaleSize(10),
        paddingVertical: scaleSize(4),
        borderRadius: scaleSize(999),
        backgroundColor: BADGE_BG,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: BADGE_BORDER,
    },
    badgeText: { fontFamily: "Outfit_700Bold", fontSize: scaleSize(10), color: BADGE_TEXT, letterSpacing: 0.4 },
    subtitle: { fontFamily: "Outfit_600SemiBold", fontSize: scaleSize(9.5), color: theme.textSecondary, letterSpacing: 0.28 },
    statsRow: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginLeft: scaleSize(14),
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
        borderLeftWidth: StyleSheet.hairlineWidth,
        borderRightWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(234, 240, 247, 0.16)",
        paddingHorizontal: scaleSize(6),
    },
    statColCompact: {
        flexGrow: 30,
        minWidth: 0,
        alignItems: "center",
        justifyContent: "center",
    },
    statValue: { fontFamily: "Outfit_800ExtraBold", fontSize: scaleSize(18), color: theme.textPrimary, letterSpacing: 0.24 },
    statValueCompact: { fontSize: scaleSize(18) },
    statLabel: {
        marginTop: scaleSize(2),
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(11),
        color: theme.textSecondary,
        letterSpacing: 0.24,
    },
    statLabelCompact: { fontSize: scaleSize(11) },
});
