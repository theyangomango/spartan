import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import theme from "../../theme/mfpDark";
import scaleSize from "../../helper/scaleSize";
// import { subscribeUserData } from "../../utils/userDataEvents";
import { strong as triggerStrongHaptic } from "../../utils/haptics";
import HumanMuscleOutline from "../../assets/human_muscle_outline";
import HumanMuscleBackOutline from "../../assets/human_muscle_back_outline";

const RANK_TAB_CONFIG = [
    {
        key: "rank",
        label: "Your Rank",
    },
    {
        key: "bodygraph",
        label: "Your Body",
        placeholderTitle: "Bodygraph Insights",
        placeholderSubtitle: "Coming soon: visualize weekly trends and body stats here.",
    },
    {
        key: "leagues",
        label: "Leagues",
        placeholderTitle: "Leagues Overview",
        placeholderSubtitle: "Track upcoming league placements and unlock rewards soon.",
    },
];

const scaled = (value) => scaleSize(value);
const BODYGRAPH_OUTLINE_COLOR = "#40485c";
const BODYGRAPH_KEY_ITEMS = [
    {
        label: "High volume",
        description: "Most trained groups",
        color: "#fcb653",
    },
    {
        label: "Maintaining",
        description: "Steady weekly work",
        color: "#5cc6ff",
    },
    {
        label: "Recovery",
        description: "Needs more focus",
        color: "#8189a8",
    },
];


export default function FeedSnapshotCard({ onPressOverall, onPressCard }) {

    const [activeRankTab, setActiveRankTab] = useState(RANK_TAB_CONFIG[0].key);
    const handleRankTabPress = useCallback(
        (nextTabKey) => {
            setActiveRankTab((currentTabKey) => {
                if (currentTabKey === nextTabKey) return currentTabKey;
                triggerStrongHaptic();
                return nextTabKey;
            });
        },
        [setActiveRankTab, triggerStrongHaptic]
    );
    const activeRankTabConfig = useMemo(
        () => RANK_TAB_CONFIG.find((tab) => tab.key === activeRankTab) || RANK_TAB_CONFIG[0],
        [activeRankTab]
    );
    const isRankTabActive = activeRankTabConfig.key === "rank";
    const isBodygraphTabActive = activeRankTabConfig.key === "bodygraph";
    const placeholderCopy =
        !isRankTabActive && !isBodygraphTabActive
            ? {
                  title: activeRankTabConfig.placeholderTitle || activeRankTabConfig.label,
                  subtitle: activeRankTabConfig.placeholderSubtitle || "Content coming soon.",
              }
            : null;

    const particles = useMemo(() => {
        const particleCount = 48;
        const colors = ["rgba(230, 220, 147, 0.65)", "rgba(255,209,93,0.6)", "rgba(255,157,43,0.55)"];
        const originPoints = [
            { top: "50%", left: "34%" },
            { top: "46%", left: "48%" },
            { top: "58%", left: "45%" },
            { top: "53%", left: "60%" },
        ];
        return Array.from({ length: particleCount }).map((_, index) => {
            const baseAngle = (Math.PI * 2 * index) / particleCount;
            const distance = scaled(120 + Math.random() * 160);
            const origin = originPoints[index % originPoints.length];
            return {
                key: `rank-particle-${index}`,
                offsetX: Math.cos(baseAngle) * distance,
                offsetY: Math.sin(baseAngle) * distance,
                size: scaled(5 + Math.random() * 9),
                color: colors[index % colors.length],
                blur: 6 + Math.random() * 12,
                origin,
                opacity: 0.3 + Math.random() * 0.35,
            };
        });
    }, []);

    const isCardPressable = typeof onPressCard === "function";
    const CardWrapper = isCardPressable ? TouchableOpacity : View;
    const cardWrapperProps = isCardPressable
        ? {
              onPress: onPressCard,
              activeOpacity: 0.88,
              accessibilityRole: "button",
              accessibilityLabel: "View detailed progress",
              hitSlop: { top: scaleSize(6), bottom: scaleSize(6), left: scaleSize(8), right: scaleSize(8) },
          }
        : {};

    return (
        <View style={styles.wrapper}>
            <View style={styles.rankSection}>
                <View style={styles.rankTabsRow}>
                    {RANK_TAB_CONFIG.map((tab) => {
                        const isActive = tab.key === activeRankTabConfig.key;
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                style={[styles.rankTab, isActive ? styles.rankTabActive : styles.rankTabInactive]}
                                onPress={() => handleRankTabPress(tab.key)}
                                activeOpacity={0.85}
                                accessibilityRole="button"
                                accessibilityLabel={tab.label}
                            >
                                <Text
                                    style={[
                                        styles.rankTabText,
                                        isActive ? styles.rankTabTextActive : styles.rankTabTextInactive,
                                    ]}
                                >
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                {isRankTabActive ? (
                    <LinearGradient
                        colors={["#ffea9cdf", "#d29b2eff", "#955e23ff"]}
                        locations={[0, 0.55, 1]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.rankCard}
                    >
                        <View pointerEvents="none" style={styles.rankParticleLayer}>
                            {particles.map((particle) => (
                                <View
                                    key={particle.key}
                                    style={[
                                        styles.rankParticle,
                                        {
                                            top: particle.origin.top,
                                            left: particle.origin.left,
                                            width: particle.size,
                                            height: particle.size,
                                            marginLeft: -particle.size / 2,
                                            marginTop: -particle.size / 2,
                                            backgroundColor: particle.color,
                                            shadowColor: particle.color,
                                            shadowRadius: scaleSize(particle.blur),
                                            opacity: particle.opacity,
                                            transform: [
                                                { translateX: particle.offsetX },
                                                { translateY: particle.offsetY },
                                            ],
                                        },
                                    ]}
                                />
                            ))}
                        </View>
                        <View style={styles.rankCardContent}>
                            <View style={styles.rankBadgeCluster}>
                                <LinearGradient
                                    colors={["rgba(255,255,255,0.5)", "rgba(255,255,255,0.08)"]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={[styles.rankWing, styles.rankWingLeft]}
                                />
                                <LinearGradient
                                    colors={["rgba(255,255,255,0.5)", "rgba(255,255,255,0.08)"]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={[styles.rankWing, styles.rankWingRight]}
                                />
                                <LinearGradient
                                    colors={["#fff4bf", "#f8c34a"]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.rankBadgeOuter}
                                >
                                    <LinearGradient
                                        colors={["#fdf6d7", "#f9d667"]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.rankBadgeInner}
                                    >
                                        <View style={styles.rankBadgeCore}>
                                            <View style={styles.rankBadgeGem} />
                                            <View style={styles.rankBadgeGemInner} />
                                        </View>
                                    </LinearGradient>
                                </LinearGradient>
                            </View>
                            <Text style={styles.rankTitle}>
                                GOLD III
                                <Text style={styles.rankTitleSecondary}> · 87 OVR</Text>
                            </Text>
                        </View>
                        <View pointerEvents="none" style={styles.rankCardBorderTop} />
                        <View pointerEvents="none" style={styles.rankCardBorderBottom} />
                    </LinearGradient>
                ) : isBodygraphTabActive ? (
                    <View style={[styles.rankCard, styles.bodygraphCard]}>
                        <View style={styles.bodygraphContent}>
                            <View style={styles.bodygraphLegend}>
                                {BODYGRAPH_KEY_ITEMS.map((item, index) => {
                                    const isLast = index === BODYGRAPH_KEY_ITEMS.length - 1;
                                    return (
                                        <View
                                            key={item.label}
                                            style={[
                                                styles.bodygraphLegendRow,
                                                !isLast && styles.bodygraphLegendRowSpacing,
                                            ]}
                                        >
                                            <View
                                                style={[
                                                    styles.bodygraphLegendSwatch,
                                                    { backgroundColor: item.color },
                                                ]}
                                            />
                                            <View style={styles.bodygraphLegendCopy}>
                                                <Text style={styles.bodygraphLegendLabel}>{item.label}</Text>
                                                {!!item.description && (
                                                    <Text style={styles.bodygraphLegendSubtitle}>
                                                        {item.description}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                            <View style={styles.bodygraphFigures}>
                                <View style={[styles.bodygraphFigureSlot, styles.bodygraphFigureSlotFront]}>
                                    <HumanMuscleOutline
                                        color={BODYGRAPH_OUTLINE_COLOR}
                                        width="100%"
                                        height="100%"
                                        preserveAspectRatio="xMidYMax slice"
                                        style={[styles.bodygraphFigure, styles.bodygraphFigureFront]}
                                    />
                                </View>
                                <View style={[styles.bodygraphFigureSlot, styles.bodygraphFigureSlotBack]}>
                                    <HumanMuscleBackOutline
                                        color={BODYGRAPH_OUTLINE_COLOR}
                                        width="100%"
                                        height="100%"
                                        preserveAspectRatio="xMidYMax slice"
                                        style={[styles.bodygraphFigure, styles.bodygraphFigureBack]}
                                    />
                                </View>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={[styles.rankCard, styles.rankPlaceholderCard]}>
                        <Text style={styles.rankPlaceholderTitle}>
                            {placeholderCopy?.title || activeRankTabConfig.label}
                        </Text>
                        <Text style={styles.rankPlaceholderSubtitle}>
                            {placeholderCopy?.subtitle || "Feature preview coming soon."}
                        </Text>
                    </View>
                )}
            </View>
            {/* <CardWrapper style={styles.card} {...cardWrapperProps}>
                <View style={styles.headerRow}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.title}>Your Weekly Snapshot</Text>
                        <Text style={styles.subtitle}>{snapshot.rangeLabel}</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.workoutCountText}>{snapshot.workoutCountLabel}</Text>
                        <Ionicons
                            name="chevron-forward"
                            size={scaled(18)}
                            color="rgba(234, 240, 247, 0.65)"
                        />
                    </View>
                </View>

                <View style={styles.metricsRow}>
                    {metrics.map((metric) => {
                        const metricStyles = [
                            styles.metricItem,
                            metric.accent ? styles.metricAccent : styles.metricStandard,
                            metric.showDivider ? styles.metricDivider : null,
                        ].filter(Boolean);
                        const isPressable = metric.accent && typeof onPressOverall === "function";
                        if (isPressable) {
                            return (
                                <RNBounceable
                                    key={metric.key}
                                    style={metricStyles}
                                    onPress={onPressOverall}
                                    activeScale={0.94}
                                    accessibilityRole="button"
                                    accessibilityLabel="Open detailed hexagon stats"
                                >
                                    <Text style={[styles.metricValue, styles.metricValueAccent]}>
                                        {metric.value}
                                    </Text>
                                    <Text style={[styles.metricLabel, styles.metricLabelAccent]}>
                                        {metric.label}
                                    </Text>
                                </RNBounceable>
                            );
                        }
                        return (
                            <View key={metric.key} style={metricStyles}>
                                <Text style={[styles.metricValue, metric.accent ? styles.metricValueAccent : null]}>
                                    {metric.value}
                                </Text>
                                <Text style={[styles.metricLabel, metric.accent ? styles.metricLabelAccent : null]}>
                                    {metric.label}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </CardWrapper> */}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        paddingHorizontal: 0,
        paddingBottom: scaled(10),
    },
    rankSection: {
        paddingBottom: scaled(16),
        backgroundColor: theme.bg,
    },
    rankTabsRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(12),
        paddingTop: scaled(4),
        paddingBottom: scaled(8),
        marginBottom: scaled(2),
    },
    rankTab: {
        paddingVertical: scaled(7),
        paddingHorizontal: scaled(16),
        borderRadius: scaled(20),
        marginRight: scaled(6),
        borderWidth: scaleSize(2),
    },
    rankTabActive: {
        backgroundColor: "#59a9ff",
        borderColor: "#59a9ff",
        shadowColor: "#59a9ff",
        shadowOpacity: 0.35,
        shadowRadius: scaleSize(12),
        shadowOffset: { width: 0, height: 4 },
    },
    rankTabInactive: {
        backgroundColor: "rgba(8,8,21,0.92)",
        borderColor: "rgba(255,255,255,0.18)",
    },
    rankTabText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaled(14),
        letterSpacing: 0.3,
    },
    rankTabTextActive: {
        color: "#05060f",
    },
    rankTabTextInactive: {
        color: "rgba(255,255,255,0.7)",
    },
    rankCard: {
        borderRadius: 0,
        paddingVertical: scaled(26),
        paddingHorizontal: scaleSize(24),
        justifyContent: "center",
        position: "relative",
        minHeight: scaleSize(220),
        height: scaleSize(220),
    },
    rankCardBorderTop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: scaled(5),
        backgroundColor: "#f9d564",
        zIndex: 5,
    },
    rankCardBorderBottom: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: scaled(5),
        backgroundColor: "#f9d564",
        zIndex: 5,
    },
    rankCardContent: {
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: scaleSize(4),
        zIndex: 2,
    },
    rankBadgeCluster: {
        width: scaled(96),
        height: scaled(88),
        justifyContent: "center",
        alignItems: "center",
        marginBottom: scaled(14),
        position: "relative",
    },
    rankParticleLayer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
    },
    rankParticle: {
        position: "absolute",
        borderRadius: 999,
        shadowOpacity: 0.75,
        shadowOffset: { width: 0, height: 0 },
    },
    rankPlaceholderCard: {
        backgroundColor: "rgba(6, 8, 18, 0.85)",
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.14)",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: scaleSize(40),
    },
    rankPlaceholderTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaled(18),
        color: "#f1f3ff",
        letterSpacing: 0.5,
        textAlign: "center",
    },
    rankPlaceholderSubtitle: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaled(13),
        color: "rgba(255,255,255,0.75)",
        textAlign: "center",
        marginTop: scaleSize(6),
        lineHeight: scaled(18),
    },
    rankBadgeOuter: {
        width: "100%",
        height: "90%",
        borderRadius: scaleSize(26),
        justifyContent: "center",
        alignItems: "center",
    },
    rankBadgeInner: {
        width: "80%",
        height: "78%",
        borderRadius: scaleSize(22),
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.08)",
        borderWidth: scaleSize(1),
        borderColor: "rgba(255,255,255,0.25)",
    },
    rankBadgeCore: {
        width: "78%",
        height: "74%",
        backgroundColor: "#f9d564",
        borderRadius: scaleSize(20),
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#a45900",
        shadowOpacity: 0.35,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: scaleSize(10),
        elevation: 4,
    },
    rankBadgeGem: {
        width: scaled(28),
        height: scaled(28),
        backgroundColor: "#fff5c1",
        transform: [{ rotate: "45deg" }],
        borderRadius: scaleSize(6),
        borderWidth: scaleSize(1),
        borderColor: "rgba(166,106,13,0.4)",
    },
    rankBadgeGemInner: {
        position: "absolute",
        width: scaled(14),
        height: scaled(14),
        backgroundColor: "#f1b739",
        transform: [{ rotate: "45deg" }],
        borderRadius: scaleSize(3),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.5)",
        top: "50%",
        left: "50%",
        marginLeft: -scaled(7),
        marginTop: -scaled(7),
    },
    rankWing: {
        position: "absolute",
        width: scaled(36),
        height: scaled(52),
        borderRadius: scaleSize(14),
        opacity: 0.8,
    },
    rankWingLeft: {
        left: -scaleSize(22),
        transform: [{ rotate: "-10deg" }],
    },
    rankWingRight: {
        right: -scaleSize(22),
        transform: [{ rotate: "10deg" }],
    },
    rankTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaled(20),
        color: "#fffef4",
        marginTop: scaled(6),
        letterSpacing: 0.25,
        textAlign: "center",
        textTransform: "uppercase",
    },
    rankTitleSecondary: {
        fontFamily: "Outfit_600SemiBold",
        color: "#f9da73ff",
        fontSize: scaled(20),
    },
    bodygraphCard: {
        backgroundColor: "#050609",
        borderWidth: 0,
        paddingHorizontal: scaleSize(20),
        justifyContent: "center",
    },
    bodygraphContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        flex: 1,
    },
    bodygraphLegend: {
        width: "40%",
        paddingRight: scaleSize(12),
    },
    bodygraphLegendRow: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    bodygraphLegendRowSpacing: {
        marginBottom: scaleSize(16),
    },
    bodygraphLegendSwatch: {
        width: scaled(16),
        height: scaled(16),
        borderRadius: scaleSize(4),
        marginRight: scaleSize(10),
        marginTop: scaleSize(3),
    },
    bodygraphLegendCopy: {
        flex: 1,
    },
    bodygraphLegendLabel: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaled(14),
        color: "#f7f8ff",
        letterSpacing: 0.15,
    },
    bodygraphLegendSubtitle: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaled(11),
        color: "rgba(255,255,255,0.72)",
        marginTop: scaleSize(2),
    },
    bodygraphFigures: {
        flex: 1,
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-evenly",
        gap: scaleSize(16),
        minHeight: scaleSize(170),
    },
    bodygraphFigureSlot: {
        flex: 1,
        alignItems: "center",
        justifyContent: "flex-end",
        height: "100%",
    },
    bodygraphFigureSlotFront: {
        paddingRight: scaleSize(6),
    },
    bodygraphFigureSlotBack: {
        flex: 1,
        height: "100%",
        paddingLeft: scaleSize(6),
    },
    bodygraphFigure: {
        width: "100%",
        height: "100%",
    },
    bodygraphFigureFront: {
        transform: [{ scale: 1.18 }, { translateY: scaleSize(6) }],
    },
    bodygraphFigureBack: {
        transform: [{ scale: 1.18 }, { translateY: scaleSize(6) }],
    },
    card: {
        backgroundColor: theme.surface,
        width: "100%",
        paddingHorizontal: scaleSize(0),
        paddingTop: scaleSize(14),
        paddingBottom: scaleSize(8),
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: scaleSize(32),
    },
    headerLeft: {
        flexShrink: 1,
        paddingRight: scaleSize(8),
    },
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
    },
    title: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaled(14),
        color: theme.textPrimary,
        letterSpacing: 0.15,
    },
    subtitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaled(12),
        color: "rgba(234, 240, 247, 0.56)",
        marginTop: scaleSize(2),
    },
    workoutCountText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaled(13),
        color: theme.textPrimary,
        marginRight: scaleSize(8),
        letterSpacing: 0.2,
    },
    metricsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: scaled(8),
        paddingRight: scaleSize(8)
    },
    metricItem: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    metricStandard: {
        paddingVertical: 0,
        paddingHorizontal: 0,
        borderRadius: 0,
        backgroundColor: "transparent",
        marginHorizontal: 0,
    },
    metricAccent: {
        backgroundColor: "rgba(45, 158, 255, 0.16)",
        borderColor: "rgba(45, 158, 255, 0.28)",
        borderWidth: StyleSheet.hairlineWidth,
        paddingVertical: scaled(8),
        paddingHorizontal: scaled(8),
        borderRadius: scaled(12),
        flex: 0.7
    },
    metricDivider: {
        borderLeftWidth: StyleSheet.hairlineWidth,
        borderLeftColor: "rgba(255,255,255,0.18)",
    },
    metricValue: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaled(14),
        color: theme.primary,
    },
    metricValueAccent: {
        color: theme.primary,
    },
    metricLabel: {
        marginTop: scaled(4),
        fontFamily: "Outfit_500Medium",
        fontSize: scaled(9),
        color: theme.textSecondary,
        letterSpacing: 0.3,
        textTransform: "uppercase",
    },
    metricLabelAccent: {
        color: theme.primary,
    },
});
