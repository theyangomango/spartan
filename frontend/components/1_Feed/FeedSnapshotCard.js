import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import theme from "../../theme/mfpDark";
import scaleSize from "../../helper/scaleSize";
import { subscribeUserData } from "../../utils/userDataEvents";
import formatHexStat from "../../utils/formatHexStat";
import { strong as triggerStrongHaptic } from "../../utils/haptics";
import HumanMuscleOutline from "../../assets/human_muscle_outline";
import HumanMuscleBackOutline from "../../assets/human_muscle_back_outline";
import { deriveBadgeDetailColors, resolveLevelStage, withAlpha } from "../2_Competition/rankBadgeLevelHelpers";

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
    // Temporarily hide the Leagues pill until the feature is ready.
    // {
    //     key: "leagues",
    //     label: "Leagues",
    //     placeholderTitle: "Leagues Overview",
    //     placeholderSubtitle: "Track upcoming league placements and unlock rewards soon.",
    // },
];

const scaled = (value) => scaleSize(value);
const BODYGRAPH_OUTLINE_COLOR = "#40485c";
const BODYGRAPH_STATS_CONFIG = [
    { key: "shoulders", label: "Shoulders" },
    { key: "chest", label: "Chest" },
    { key: "arms", label: "Arms" },
    { key: "back", label: "Back" },
    { key: "legs", label: "Legs" },
    { key: "abs", label: "Abs" },
];

const getInitialStatsHexagon = () => {
    try {
        const stats = global?.userData?.statsHexagon;
        if (stats && typeof stats === "object") {
            return { ...stats };
        }
    } catch {
        // ignore missing globals during cold start
    }
    return null;
};

const shallowEqualHex = (a, b) => {
    if (a === b) return true;
    if (!a || !b) return !a && !b;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (let i = 0; i < keysA.length; i += 1) {
        const key = keysA[i];
        if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
        if (a[key] !== b[key]) return false;
    }
    return true;
};

const bronzeTheme = {
    key: "bronze",
    displayName: "Bronze III",
    overallRating: 68,
    gradientColors: ["#fde6d6", "#d28b52", "#6d3413"],
    gradientLocations: [0, 0.55, 1],
    particleColors: [
        "rgba(255, 215, 189, 0.75)",
        "rgba(210, 139, 82, 0.6)",
        "rgba(109, 52, 19, 0.55)",
    ],
    borderColor: "#f0b078",
    wingGradient: ["rgba(255,255,255,0.45)", "rgba(255,255,255,0.08)"],
    badgeOuterGradient: ["#ffe0c4", "#d6904f"],
    badgeInnerGradient: ["#fae1c4", "#e2a667"],
    badgeCoreColor: "#e8a05d",
    badgeCoreShadowColor: "#5a2408",
    badgeGemColor: "#ffe8d4",
    badgeGemBorderColor: "rgba(122, 53, 13, 0.45)",
    badgeGemInnerColor: "#d98241",
    badgeGemInnerBorderColor: "rgba(255,255,255,0.5)",
    titleColor: "#fff7ef",
    titleSecondaryColor: "#ffce9c",
};

const silverTheme = {
    key: "silver",
    displayName: "Silver II",
    overallRating: 76,
    gradientColors: ["#e3e8f3", "#8ea0bb", "#4a5873"],
    gradientLocations: [0, 0.55, 1],
    particleColors: [
        "rgba(226,232,245,0.8)",
        "rgba(157,176,205,0.65)",
        "rgba(88,108,138,0.55)",
    ],
    borderColor: "#b7c8dd",
    wingGradient: ["rgba(255,255,255,0.5)", "rgba(255,255,255,0.08)"],
    badgeOuterGradient: ["#d9e2f0", "#94a5bd"],
    badgeInnerGradient: ["#dbe1ee", "#a5b7d0"],
    badgeCoreColor: "#9fb3cb",
    badgeCoreShadowColor: "#3d4a60",
    badgeGemColor: "#dfe8f5",
    badgeGemBorderColor: "rgba(86,106,135,0.5)",
    badgeGemInnerColor: "#8aa1c3",
    badgeGemInnerBorderColor: "rgba(255,255,255,0.5)",
    titleColor: "#f5f8ff",
    titleSecondaryColor: "#cdd8ec",
};

const goldTheme = {
    key: "gold",
    displayName: "Gold III",
    overallRating: 87,
    gradientColors: ["#ffea9cdf", "#d29b2eff", "#955e23ff"],
    gradientLocations: [0, 0.55, 1],
    particleColors: [
        "rgba(230, 220, 147, 0.65)",
        "rgba(255, 209, 93, 0.6)",
        "rgba(255, 157, 43, 0.55)",
    ],
    borderColor: "#f9d564",
    wingGradient: ["rgba(255,255,255,0.5)", "rgba(255,255,255,0.08)"],
    badgeOuterGradient: ["#fff4bf", "#f8c34a"],
    badgeInnerGradient: ["#fdf6d7", "#f9d667"],
    badgeCoreColor: "#f9d564",
    badgeCoreShadowColor: "#a45900",
    badgeGemColor: "#fff5c1",
    badgeGemBorderColor: "rgba(166,106,13,0.4)",
    badgeGemInnerColor: "#f1b739",
    badgeGemInnerBorderColor: "rgba(255,255,255,0.5)",
    titleColor: "#fffef4",
    titleSecondaryColor: "#f9da73ff",
};

const platinumTheme = {
    key: "platinum",
    displayName: "Platinum I",
    overallRating: 94,
    gradientColors: ["#fdf7ff", "#c9e4ff", "#6da0ff"],
    gradientLocations: [0, 0.55, 1],
    particleColors: [
        "rgba(251, 245, 255, 0.75)",
        "rgba(201, 228, 255, 0.62)",
        "rgba(119, 164, 255, 0.55)",
    ],
    borderColor: "#cbe4ff",
    wingGradient: ["rgba(255,255,255,0.65)", "rgba(255,255,255,0.18)"],
    badgeOuterGradient: ["#ffffff", "#cde3ff"],
    badgeInnerGradient: ["#f1f5ff", "#d2e5ff"],
    badgeCoreColor: "#dceaff",
    badgeCoreShadowColor: "#4a5c85",
    badgeGemColor: "#f9fcff",
    badgeGemBorderColor: "rgba(123, 156, 212, 0.45)",
    badgeGemInnerColor: "#a3c5ff",
    badgeGemInnerBorderColor: "rgba(255,255,255,0.65)",
    titleColor: "#f7fbff",
    titleSecondaryColor: "#d4ecff",
};

const rubyTheme = {
    key: "ruby",
    displayName: "Ruby II",
    overallRating: 92,
    gradientColors: ["#ffe4ec", "#ff4f78", "#3d0713"],
    gradientLocations: [0, 0.6, 1],
    particleColors: [
        "rgba(255, 218, 232, 0.75)",
        "rgba(255, 108, 140, 0.6)",
        "rgba(69, 10, 22, 0.55)",
    ],
    borderColor: "#ff87a3",
    wingGradient: ["rgba(255,255,255,0.42)", "rgba(255,255,255,0.13)"],
    badgeOuterGradient: ["#ffc6d6", "#ff5c7c"],
    badgeInnerGradient: ["#ffdbe6", "#ff7b97"],
    badgeCoreColor: "#ff5e81",
    badgeCoreShadowColor: "#36030f",
    badgeGemColor: "#ffe6ef",
    badgeGemBorderColor: "rgba(181, 45, 76, 0.5)",
    badgeGemInnerColor: "#ff8aa7",
    badgeGemInnerBorderColor: "rgba(255,255,255,0.55)",
    titleColor: "#fff2f6",
    titleSecondaryColor: "#ffb6ca",
};

const diamondTheme = {
    key: "diamond",
    displayName: "Diamond I",
    overallRating: 98,
    gradientColors: ["#e1feff", "#80ecff", "#1f4b69"],
    gradientLocations: [0, 0.55, 1],
    particleColors: [
        "rgba(209, 255, 255, 0.75)",
        "rgba(128, 236, 255, 0.6)",
        "rgba(31, 75, 105, 0.55)",
    ],
    borderColor: "#72f0ff",
    wingGradient: ["rgba(255,255,255,0.7)", "rgba(255,255,255,0.24)"],
    badgeOuterGradient: ["#ddfeff", "#75ecff"],
    badgeInnerGradient: ["#c7fbff", "#8aefff"],
    badgeCoreColor: "#8ef5ff",
    badgeCoreShadowColor: "#1c4c5a",
    badgeGemColor: "#f0ffff",
    badgeGemBorderColor: "rgba(49, 132, 147, 0.45)",
    badgeGemInnerColor: "#6beaff",
    badgeGemInnerBorderColor: "rgba(255,255,255,0.7)",
    titleColor: "#f2ffff",
    titleSecondaryColor: "#8ff4ff",
};

export const RANK_TIER_THEMES = {
    bronze: bronzeTheme,
    silver: silverTheme,
    gold: goldTheme,
    platinum: platinumTheme,
    ruby: rubyTheme,
    sapphire: rubyTheme,
    saphire: rubyTheme,
    diamond: diamondTheme,
};

const NEXT_RANK_TARGET_SCORE = 100;


const sanitizeTabKey = (key) => {
    if (typeof key !== "string") return null;
    const normalized = key.trim().toLowerCase();
    return RANK_TAB_CONFIG.some((tab) => tab.key === normalized) ? normalized : null;
};

const extractLevelFromLabel = (label) => {
    if (typeof label !== "string") return null;
    const trimmed = label.trim();
    if (!trimmed) return null;
    const tokens = trimmed.split(/\s+/);
    const candidate = tokens[tokens.length - 1];
    if (!candidate) return null;
    const roman = candidate.replace(/[^ivIV]+/g, "");
    return roman || candidate;
};

export default function FeedSnapshotCard({
    rankTier = "gold",
    rankLabel,
    rankLevel = null,
    overallRating = null,
    showRankTabs = true,
    enableRankAnimations = true,
    onPressOverall,
    onPressCard,
    initialTabKey = RANK_TAB_CONFIG[0].key,
    forceTabKey = null,
    statsHexagon: statsHexagonOverride = null,
}) {
    const normalizedRankTier = String(rankTier || "gold").toLowerCase();
    const rankTheme = RANK_TIER_THEMES[normalizedRankTier] || RANK_TIER_THEMES.gold;
    const resolvedRankLabel = rankLabel || rankTheme.displayName || normalizedRankTier;
    const resolvedRankLevel = rankLevel || extractLevelFromLabel(resolvedRankLabel);
    const resolvedOverallRating =
        (overallRating ?? rankTheme.overallRating ?? RANK_TIER_THEMES.gold.overallRating);
    const rankLevelStage = resolveLevelStage(resolvedRankLevel);
    const badgeDetailColors = deriveBadgeDetailColors(rankTheme, RANK_TIER_THEMES.gold);
    const showSeedGem = rankLevelStage === 1;
    const showGem = rankLevelStage >= 2;
    const showInnerShell = rankLevelStage >= 3;
    const showOuterShell = rankLevelStage >= 4;
    const showBadgeWings = rankLevelStage >= 5;
    const minimalShellColor = withAlpha(badgeDetailColors.accentPrimary, 0.12);
    const minimalShellBorder = withAlpha(badgeDetailColors.accentPrimary, 0.45);

    const pointsToNextRank = useMemo(() => {
        const ratingNumber = Number(resolvedOverallRating);
        if (!Number.isFinite(ratingNumber)) return null;
        const remaining = NEXT_RANK_TARGET_SCORE - ratingNumber;
        return remaining > 0 ? remaining : 0;
    }, [resolvedOverallRating]);

    const pointsToNextRankCopy = useMemo(() => {
        if (pointsToNextRank == null) return null;
        if (pointsToNextRank === 0) return "Top of current rank";
        const requiresDecimal = pointsToNextRank < 10;
        const roundedValue = requiresDecimal
            ? Math.round(pointsToNextRank * 10) / 10
            : Math.round(pointsToNextRank);
        const formattedValue = requiresDecimal ? roundedValue.toFixed(1) : String(roundedValue);
        return `${formattedValue} pts to next rank`;
    }, [pointsToNextRank]);

    const [activeRankTab, setActiveRankTab] = useState(() => sanitizeTabKey(initialTabKey) || RANK_TAB_CONFIG[0].key);
    const forcedTabKey = sanitizeTabKey(forceTabKey);
    const resolvedActiveRankTabKey = forcedTabKey || activeRankTab;
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
        () => RANK_TAB_CONFIG.find((tab) => tab.key === resolvedActiveRankTabKey) || RANK_TAB_CONFIG[0],
        [resolvedActiveRankTabKey]
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

    const [viewerStatsHexagon, setViewerStatsHexagon] = useState(() => getInitialStatsHexagon());
    const statsHexagon = statsHexagonOverride || viewerStatsHexagon;
    const shouldSubscribeToStats = !statsHexagonOverride && (showRankTabs !== false || forcedTabKey === "bodygraph");

    useEffect(() => {
        if (!shouldSubscribeToStats) return undefined;
        const unsubscribe = subscribeUserData((payload) => {
            const nextHex = payload?.statsHexagon || null;
            setViewerStatsHexagon((prev) => {
                if (shallowEqualHex(prev, nextHex)) return prev;
                return nextHex ? { ...nextHex } : null;
            });
        });
        return unsubscribe;
    }, [shouldSubscribeToStats]);

    const bodygraphStats = useMemo(
        () =>
            BODYGRAPH_STATS_CONFIG.map((entry) => {
                const rawValue = statsHexagon?.[entry.key];
                const numericValue = Number(rawValue);
                const hasValue = Number.isFinite(numericValue);
                return {
                    ...entry,
                    hasValue,
                    displayValue: hasValue ? formatHexStat(numericValue) : "--",
                };
            }),
        [statsHexagon]
    );
    const hasBodygraphStats = bodygraphStats.some((stat) => stat.hasValue);
    const overallStatNumber = Number(statsHexagon?.overall);
    const hasOverallStat = Number.isFinite(overallStatNumber);
    const overallStatDisplay = hasOverallStat ? formatHexStat(overallStatNumber) : "--";

    const renderBadgeCore = () => (
        <View
            style={[
                styles.rankBadgeCore,
                !showInnerShell && !showOuterShell ? styles.rankBadgeCoreExpanded : null,
                {
                    backgroundColor: rankTheme.badgeCoreColor || goldTheme.badgeCoreColor,
                    shadowColor: rankTheme.badgeCoreShadowColor || goldTheme.badgeCoreShadowColor,
                },
            ]}
        >
            <View pointerEvents="none" style={styles.rankBadgeLevelLayer}>
                {rankLevelStage >= 2 && (
                    <View
                        style={[
                            styles.rankBadgeLevelRing,
                            { borderColor: badgeDetailColors.ringColor },
                        ]}
                    />
                )}
                {rankLevelStage >= 3 && (
                    <>
                        <View
                            style={[
                                styles.rankBadgeLevelRay,
                                { backgroundColor: badgeDetailColors.sparkleColor },
                            ]}
                        />
                        <View
                            style={[
                                styles.rankBadgeLevelRay,
                                styles.rankBadgeLevelRayVertical,
                                { backgroundColor: badgeDetailColors.sparkleColor },
                            ]}
                        />
                    </>
                )}
                {rankLevelStage >= 4 && (
                    <>
                        <View
                            style={[
                                styles.rankBadgeLevelSparkle,
                                styles.rankBadgeLevelSparkleTopLeft,
                                {
                                    backgroundColor: badgeDetailColors.sparkleColor,
                                    shadowColor: badgeDetailColors.sparkleColor,
                                },
                            ]}
                        />
                        <View
                            style={[
                                styles.rankBadgeLevelSparkle,
                                styles.rankBadgeLevelSparkleBottomRight,
                                {
                                    backgroundColor: badgeDetailColors.sparkleColor,
                                    shadowColor: badgeDetailColors.sparkleColor,
                                },
                            ]}
                        />
                    </>
                )}
                {showBadgeWings && (
                    <>
                        <View
                            style={[
                                styles.rankBadgeLevelFlare,
                                styles.rankBadgeLevelFlareLeft,
                                {
                                    backgroundColor: badgeDetailColors.wingColor,
                                    shadowColor: badgeDetailColors.wingColor,
                                },
                            ]}
                        />
                        <View
                            style={[
                                styles.rankBadgeLevelFlare,
                                styles.rankBadgeLevelFlareRight,
                                {
                                    backgroundColor: badgeDetailColors.wingColor,
                                    shadowColor: badgeDetailColors.wingColor,
                                },
                            ]}
                        />
                    </>
                )}
            </View>
            {showSeedGem && (
                <View
                    style={[
                        styles.rankBadgeSeedGem,
                        {
                            backgroundColor: badgeDetailColors.accentPrimary,
                        },
                    ]}
                />
            )}
            {showGem ? (
                <>
                    <View
                        style={[
                            styles.rankBadgeGem,
                            !showInnerShell && !showOuterShell ? styles.rankBadgeGemStandalone : null,
                            {
                                backgroundColor: rankTheme.badgeGemColor || goldTheme.badgeGemColor,
                                borderColor: rankTheme.badgeGemBorderColor || goldTheme.badgeGemBorderColor,
                            },
                        ]}
                    />
                    <View
                        style={[
                            styles.rankBadgeGemInner,
                            !showInnerShell && !showOuterShell ? styles.rankBadgeGemInnerStandalone : null,
                            {
                                backgroundColor:
                                    rankTheme.badgeGemInnerColor || goldTheme.badgeGemInnerColor,
                                borderColor:
                                    rankTheme.badgeGemInnerBorderColor || goldTheme.badgeGemInnerBorderColor,
                            },
                        ]}
                    />
                </>
            ) : null}
        </View>
    );

    const renderBadgeShell = () => {
        const core = renderBadgeCore();
        if (showOuterShell) {
            return (
                <LinearGradient
                    colors={rankTheme.badgeOuterGradient || goldTheme.badgeOuterGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.rankBadgeOuter}
                >
                    <LinearGradient
                        colors={rankTheme.badgeInnerGradient || goldTheme.badgeInnerGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.rankBadgeInner}
                    >
                        {core}
                    </LinearGradient>
                </LinearGradient>
            );
        }
        if (showInnerShell) {
            return (
                <LinearGradient
                    colors={rankTheme.badgeInnerGradient || goldTheme.badgeInnerGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.rankBadgeInnerStandalone}
                >
                    {core}
                </LinearGradient>
            );
        }
        return (
            <View
                style={[
                    styles.rankBadgeMinimalShell,
                    {
                        backgroundColor: minimalShellColor,
                        borderColor: minimalShellBorder,
                    },
                ]}
            >
                {core}
            </View>
        );
    };

    const particles = useMemo(() => {
        if (!enableRankAnimations) return [];
        const particleCount = 36;
        const colors = rankTheme.particleColors?.length ? rankTheme.particleColors : goldTheme.particleColors;
        const originPoints = [
            { top: "50%", left: "34%" },
            { top: "46%", left: "48%" },
            { top: "58%", left: "45%" },
            { top: "53%", left: "60%" },
        ];
        return Array.from({ length: particleCount }).map((_, index) => {
            const angleSeed = (Math.PI * 2 * (index / particleCount));
            const baseAngle = angleSeed + (Math.random() - 0.5) * (Math.PI / 2);
            const distance = scaled(100 + Math.random() * 180);
            const origin = originPoints[index % originPoints.length];
            return {
                key: `rank-particle-${index}`,
                offsetX: Math.cos(baseAngle) * distance,
                offsetY: Math.sin(baseAngle) * distance,
                size: scaled(4 + Math.random() * 8),
                color: colors[index % colors.length],
                blur: 6 + Math.random() * 10,
                origin,
                opacity: 0.45 + Math.random() * 0.35,
                delay: 120 + (index % originPoints.length) * 70 + Math.random() * 140,
                duration: 520 + Math.random() * 480,
                cooldown: 320 + Math.random() * 420,
                scaleFrom: 0.55 + Math.random() * 0.35,
                scaleTo: 1.3 + Math.random() * 0.5,
            };
        });
    }, [enableRankAnimations, rankTheme.key]);

    const particleAnimatedValues = useMemo(
        () => particles.map(() => new Animated.Value(0)),
        [particles]
    );

    const badgePulseValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!enableRankAnimations) {
            badgePulseValue.setValue(0);
            return undefined;
        }
        const pulseLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(badgePulseValue, {
                    toValue: 1,
                    duration: 700,
                    easing: Easing.inOut(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(badgePulseValue, {
                    toValue: 0,
                    duration: 700,
                    easing: Easing.inOut(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]),
            { resetBeforeIteration: true }
        );
        pulseLoop.start();
        return () => {
            pulseLoop.stop();
            badgePulseValue.stopAnimation();
        };
    }, [badgePulseValue, enableRankAnimations]);

    const badgePulseScale = enableRankAnimations
        ? badgePulseValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0.98, 1.07],
          })
        : 1;

    useEffect(() => {
        if (!enableRankAnimations || !particleAnimatedValues.length) return undefined;

        const loops = particleAnimatedValues
            .map((value, index) => {
                const particle = particles[index];
                if (!particle) return null;
                value.setValue(0);

                const burstSequence = Animated.sequence([
                    Animated.timing(value, {
                        toValue: 1,
                        duration: particle.duration,
                        delay: particle.delay,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                    }),
                    Animated.timing(value, {
                        toValue: 1,
                        duration: particle.cooldown,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    }),
                ]);

                const loop = Animated.loop(burstSequence, { resetBeforeIteration: true });
                if (loop && typeof loop.start === "function") {
                    loop.start();
                    return loop;
                }
                return null;
            })
            .filter(Boolean);

        return () => {
            loops.forEach((loop) => loop?.stop());
            particleAnimatedValues.forEach((value) =>
                value.stopAnimation(() => {
                    value.setValue(0);
                })
            );
        };
    }, [enableRankAnimations, particleAnimatedValues, particles]);

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
                {showRankTabs && (
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
                )}
                <CardWrapper
                    style={[styles.rankCardWrapper, !isRankTabActive && styles.rankCardHidden]}
                    {...cardWrapperProps}
                >
                    <LinearGradient
                        colors={rankTheme.gradientColors || goldTheme.gradientColors}
                        locations={rankTheme.gradientLocations || goldTheme.gradientLocations}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.rankCard}
                    >
                        {enableRankAnimations && (
                            <View pointerEvents="none" style={styles.rankParticleLayer}>
                                {particles.map((particle, index) => {
                                    const progress = particleAnimatedValues[index];
                                    if (!progress) return null;

                                    const translateX = progress.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, particle.offsetX],
                                    });
                                    const translateY = progress.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, particle.offsetY],
                                    });
                                    const opacity = progress.interpolate({
                                        inputRange: [0, 0.3, 0.75, 1],
                                        outputRange: [0, particle.opacity, particle.opacity * 0.45, 0],
                                    });
                                    const scale = progress.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [particle.scaleFrom, particle.scaleTo],
                                    });

                                    return (
                                        <Animated.View
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
                                                },
                                                {
                                                    opacity,
                                                    transform: [{ translateX }, { translateY }, { scale }],
                                                },
                                            ]}
                                        />
                                    );
                                })}
                            </View>
                        )}
                        <View style={styles.rankCardContent}>
                            <Animated.View
                                style={[
                                    styles.rankBadgeCluster,
                                    enableRankAnimations ? { transform: [{ scale: badgePulseScale }] } : null,
                                ]}
                            >
                                {showBadgeWings && (
                                    <LinearGradient
                                        colors={rankTheme.wingGradient || goldTheme.wingGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={[styles.rankWing, styles.rankWingLeft]}
                                    />
                                )}
                                {showBadgeWings && (
                                    <LinearGradient
                                        colors={rankTheme.wingGradient || goldTheme.wingGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={[styles.rankWing, styles.rankWingRight]}
                                    />
                                )}
                                {renderBadgeShell()}
                            </Animated.View>
                            <Text style={[styles.rankTitle, { color: rankTheme.titleColor || goldTheme.titleColor }]}>
                                {resolvedRankLabel}
                                <Text
                                    style={[
                                        styles.rankTitleSecondary,
                                        { color: rankTheme.titleSecondaryColor || goldTheme.titleSecondaryColor },
                                    ]}
                                >
                                    {` · ${resolvedOverallRating} OVR`}
                                </Text>
                            </Text>
                            {pointsToNextRankCopy ? (
                                <Text style={styles.rankProgressText}>{pointsToNextRankCopy}</Text>
                            ) : null}
                        </View>
                        <View
                            pointerEvents="none"
                            style={[
                                styles.rankCardBorderTop,
                                { backgroundColor: rankTheme.borderColor || goldTheme.borderColor },
                            ]}
                        />
                        <View
                            pointerEvents="none"
                            style={[
                                styles.rankCardBorderBottom,
                                { backgroundColor: rankTheme.borderColor || goldTheme.borderColor },
                            ]}
                        />
                    </LinearGradient>
                </CardWrapper>
                {!isRankTabActive &&
                    (isBodygraphTabActive ? (
                        <View style={[styles.rankCard, styles.bodygraphCard]}>
                            <View style={styles.bodygraphContent}>
                                <View style={styles.bodygraphStatsColumn}>
                                    {hasOverallStat ? (
                                        <>
                                            <View style={[styles.bodygraphStatsRow, styles.bodygraphOverallRow]}>
                                                <Text style={[styles.bodygraphStatsLabel, styles.bodygraphOverallLabel]}>
                                                    Overall
                                                </Text>
                                                <Text style={[styles.bodygraphStatsValue, styles.bodygraphOverallValue]}>
                                                    {overallStatDisplay}
                                                </Text>
                                            </View>
                                            <View style={[styles.bodygraphStatsDivider, styles.bodygraphOverallDivider]} />
                                        </>
                                    ) : null}
                                    {hasBodygraphStats ? (
                                        bodygraphStats.map((stat, index) => (
                                            <View key={stat.key}>
                                                <View style={styles.bodygraphStatsRow}>
                                                    <Text style={styles.bodygraphStatsLabel}>{stat.label}</Text>
                                                    <Text
                                                        style={[
                                                            styles.bodygraphStatsValue,
                                                            !stat.hasValue && styles.bodygraphStatsValueEmpty,
                                                        ]}
                                                    >
                                                        {stat.displayValue}
                                                    </Text>
                                                </View>
                                                {index < bodygraphStats.length - 1 && (
                                                    <View style={styles.bodygraphStatsDivider} />
                                                )}
                                            </View>
                                        ))
                                    ) : (
                                        <Text style={styles.bodygraphStatsEmptyText}>
                                            Log workouts to unlock insights.
                                        </Text>
                                    )}
                                </View>
                                <View style={styles.bodygraphFigures}>
                                    <View style={[styles.bodygraphFigureSlot, styles.bodygraphFigureSlotFront]}>
                                        <HumanMuscleOutline
                                            color={BODYGRAPH_OUTLINE_COLOR}
                                            width="90%"
                                            height="100%"
                                            preserveAspectRatio="xMidYMax slice"
                                            style={[styles.bodygraphFigure, styles.bodygraphFigureFront]}
                                        />
                                    </View>
                                    <View style={[styles.bodygraphFigureSlot, styles.bodygraphFigureSlotBack]}>
                                        <HumanMuscleBackOutline
                                            color={BODYGRAPH_OUTLINE_COLOR}
                                            width="90%"
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
                    ))}
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
        paddingBottom: 0,
    },
    rankSection: {
        backgroundColor: theme.bg,
    },
    rankTabsRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(12),
        paddingTop: scaled(4),
        paddingBottom: scaled(8),
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
    rankCardWrapper: {
        width: "100%",
    },
    rankCardHidden: {
        display: "none",
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
    rankBadgeInnerStandalone: {
        width: "80%",
        height: "78%",
        borderRadius: scaleSize(22),
        justifyContent: "center",
        alignItems: "center",
        borderWidth: scaleSize(1),
        borderColor: "rgba(255,255,255,0.25)",
    },
    rankBadgeMinimalShell: {
        width: "78%",
        height: "74%",
        borderRadius: scaleSize(22),
        justifyContent: "center",
        alignItems: "center",
        borderWidth: StyleSheet.hairlineWidth,
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
    rankBadgeCoreExpanded: {
        width: "86%",
        height: "80%",
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
    rankBadgeGemStandalone: {
        width: scaled(32),
        height: scaled(32),
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
    rankBadgeGemInnerStandalone: {
        width: scaled(16),
        height: scaled(16),
    },
    rankBadgeSeedGem: {
        position: "absolute",
        width: scaled(14),
        height: scaled(14),
        borderRadius: scaled(3),
        transform: [{ rotate: "45deg" }],
        opacity: 0.85,
    },
    rankProgressText: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaled(13),
        color: "rgba(255,255,255,0.8)",
        marginTop: scaleSize(4),
        letterSpacing: 0.2,
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
        paddingTop: scaleSize(6),
    },
    bodygraphStatsColumn: {
        width: "32%",
        paddingRight: scaleSize(12),
    },
    bodygraphOverallRow: {
        paddingBottom: scaleSize(2),
    },
    bodygraphOverallLabel: {
        textTransform: "uppercase",
        fontFamily: "Outfit_600SemiBold",
        letterSpacing: 0.25,
        color: "rgba(247,248,255,0.85)",
    },
    bodygraphOverallValue: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaled(20),
        color: "#f7f8ff",
    },
    bodygraphOverallDivider: {
        marginBottom: scaleSize(8),
    },
    bodygraphStatsRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: scaleSize(4),
    },
    bodygraphStatsLabel: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaled(12),
        color: "rgba(247,248,255,0.78)",
        letterSpacing: 0.25,
    },
    bodygraphStatsValue: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaled(13),
        color: "#f7f8ff",
        letterSpacing: 0.25,
    },
    bodygraphStatsValueEmpty: {
        color: "rgba(247,248,255,0.45)",
    },
    bodygraphStatsDivider: {
        height: Math.max(1, scaleSize(1)),
        backgroundColor: "rgba(255,255,255,0.08)",
    },
    bodygraphStatsEmptyText: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaled(12),
        color: "rgba(247,248,255,0.6)",
        letterSpacing: 0.25,
    },
    bodygraphFigures: {
        flex: 1,
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-evenly",
        gap: scaleSize(16),
        minHeight: scaleSize(190),
        paddingBottom: scaleSize(10),
    },
    bodygraphFigureSlot: {
        flex: 1,
        alignItems: "center",
        justifyContent: "flex-end",
        height: "100%",
        overflow: "visible",
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
        transform: [{ scale: 1.18 }, { translateY: scaleSize(12) }],
    },
    bodygraphFigureBack: {
        transform: [{ scale: 1.18 }, { translateY: scaleSize(12) }],
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
