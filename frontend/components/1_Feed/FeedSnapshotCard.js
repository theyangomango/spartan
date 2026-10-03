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
import { resolveLevelStage, withAlpha } from "../2_Competition/rankBadgeLevelHelpers";
import RankBadgeEmblem from "../2_Competition/RankBadgeEmblem";
import { buildMuscleFillMap, DEFAULT_MUSCLE_SEGMENTS as MUSCLE_SEGMENTS } from "../../utils/muscleTierColors";

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

// A looped Animated.sequence restarts every step from JS, which costs a bridge call per step.
// Each cycle is baked into a single timing's easing curve instead, so the native driver can
// run the whole loop on its own.
const easeOutCubic = Easing.out(Easing.cubic);
const easeInOutCubic = Easing.inOut(Easing.cubic);

const BADGE_PULSE_CYCLE_MS = 1400;
// Rises 0 -> 1 over the first half of the cycle and falls back to 0 over the second.
const badgePulseEasing = (t) => (t < 0.5 ? easeInOutCubic(t * 2) : 1 - easeInOutCubic((t - 0.5) * 2));

const getParticleCycleMs = ({ delay, duration, cooldown }) => delay + duration + cooldown;
// One particle cycle: wait out the delay at 0, burst to 1, then hold at 1 through the cooldown.
const makeParticleCycleEasing = (particle) => {
    const cycleMs = getParticleCycleMs(particle);
    return (t) => {
        const elapsed = t * cycleMs;
        if (elapsed <= particle.delay) return 0;
        if (elapsed >= particle.delay + particle.duration) return 1;
        return easeOutCubic((elapsed - particle.delay) / particle.duration);
    };
};
const BODYGRAPH_OUTLINE_COLOR = "#40485c";

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
    displayName: "Bronze I",
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
    gradientColors: ["#fff7cb", "#f8d548", "#e1a72b"],
    gradientLocations: [0, 0.55, 1],
    particleColors: [
        "rgba(246, 228, 154, 0.7)",
        "rgba(248, 213, 72, 0.62)",
        "rgba(225, 167, 43, 0.58)",
    ],
    borderColor: "#f4d85c",
    wingGradient: ["rgba(255,255,255,0.5)", "rgba(255,255,255,0.08)"],
    badgeOuterGradient: ["#fff5cc", "#f3cf57"],
    badgeInnerGradient: ["#fff8dd", "#f5d96a"],
    badgeCoreColor: "#f4d85c",
    badgeCoreShadowColor: "#c7850a",
    badgeGemColor: "#fff7d6",
    badgeGemBorderColor: "rgba(207,151,33,0.4)",
    badgeGemInnerColor: "#f1c752",
    badgeGemInnerBorderColor: "rgba(255,255,255,0.5)",
    titleColor: "#fffef4",
    titleSecondaryColor: "#f5d14d",
};

const emeraldTheme = {
    key: "emerald",
    displayName: "Emerald I",
    overallRating: 94,
    gradientColors: ["#e8fff4", "#8df2bf", "#0d5c3f"],
    gradientLocations: [0, 0.55, 1],
    particleColors: [
        "rgba(214, 255, 234, 0.75)",
        "rgba(141, 242, 191, 0.62)",
        "rgba(23, 117, 81, 0.55)",
    ],
    borderColor: "#a6f0c9",
    wingGradient: ["rgba(255,255,255,0.65)", "rgba(255,255,255,0.18)"],
    badgeOuterGradient: ["#e9fff5", "#92f3c4"],
    badgeInnerGradient: ["#f2fff9", "#a9f2cc"],
    badgeCoreColor: "#90e5bc",
    badgeCoreShadowColor: "#0f5e43",
    badgeGemColor: "#f2fff9",
    badgeGemBorderColor: "rgba(45, 131, 96, 0.45)",
    badgeGemInnerColor: "#7ae2ac",
    badgeGemInnerBorderColor: "rgba(255,255,255,0.65)",
    titleColor: "#f3fff9",
    titleSecondaryColor: "#b8f2d4",
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
    emerald: emeraldTheme,
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
    rankTier = "bronze",
    rankLabel,
    rankLevel = null,
    overallRating = null,
    showOverallRating = true,
    pendingRequirementsCount = null,
    eyebrowLabel = null,
    showRankTabs = true,
    enableRankAnimations = true,
    onPressOverall,
    onPressCard,
    onPressBodyCard,
    initialTabKey = RANK_TAB_CONFIG[0].key,
    forceTabKey = null,
    statsHexagon: statsHexagonOverride = null,
}) {
    const normalizedRankTier = String(rankTier || "bronze").toLowerCase();
    const rankTheme = RANK_TIER_THEMES[normalizedRankTier] || RANK_TIER_THEMES.bronze;
    const resolvedRankLabel = rankLabel || rankTheme.displayName || normalizedRankTier;
    const resolvedRankLevel = rankLevel || extractLevelFromLabel(resolvedRankLabel);
    const resolvedOverallRating =
        (overallRating ?? rankTheme.overallRating ?? RANK_TIER_THEMES.bronze.overallRating);
    const resolvedShowOverall = showOverallRating !== false && resolvedOverallRating != null;
    const rankLevelStage = resolveLevelStage(resolvedRankLevel);
    // Dark surface washed with the tier colour, so the badge and title carry the saturation.
    const tierGlowColor = (rankTheme.gradientColors || goldTheme.gradientColors)[1];
    const rankCardGlowColors = [
        withAlpha(tierGlowColor, 0.42),
        withAlpha(tierGlowColor, 0.12),
        withAlpha(tierGlowColor, 0.03),
    ];
    const rankCardBorderColor = withAlpha(rankTheme.borderColor || goldTheme.borderColor, 0.32);
    const rankAccentColor = rankTheme.titleSecondaryColor || goldTheme.titleSecondaryColor;
    // Split "Bronze II" into the tier name and its numeral so the numeral can take the tier colour.
    const rankTitleParts = (() => {
        const label = String(resolvedRankLabel || "").trim();
        const lastSpace = label.lastIndexOf(" ");
        if (lastSpace <= 0) return { name: label, level: "" };
        return { name: label.slice(0, lastSpace), level: label.slice(lastSpace + 1) };
    })();
    const showRankHeader = !!eyebrowLabel || resolvedShowOverall;

    const pointsToNextRank = useMemo(() => {
        const ratingNumber = Number(resolvedOverallRating);
        if (!Number.isFinite(ratingNumber)) return null;
        const remaining = NEXT_RANK_TARGET_SCORE - ratingNumber;
        return remaining > 0 ? remaining : 0;
    }, [resolvedOverallRating]);

    const pointsToNextRankCopy = useMemo(() => {
        if (pendingRequirementsCount == null) return null;
        if (pendingRequirementsCount <= 0) return "Top of current rank";
        return `${pendingRequirementsCount} quest${pendingRequirementsCount === 1 ? "" : "s"} to next rank`;
    }, [pendingRequirementsCount]);

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

    const overallStatNumber = Number(statsHexagon?.overall);
    const hasOverallStat = Number.isFinite(overallStatNumber);
    const overallStatDisplay = hasOverallStat ? formatHexStat(overallStatNumber) : "--";
    const bodygraphFills = useMemo(
        () => buildMuscleFillMap(statsHexagon, MUSCLE_SEGMENTS),
        [statsHexagon]
    );

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
        badgePulseValue.setValue(0);
        if (!enableRankAnimations) return undefined;
        const pulseLoop = Animated.loop(
            Animated.timing(badgePulseValue, {
                toValue: 1,
                duration: BADGE_PULSE_CYCLE_MS,
                easing: badgePulseEasing,
                useNativeDriver: true,
            })
        );
        pulseLoop.start();
        return () => {
            pulseLoop.stop();
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

        const loops = particleAnimatedValues.map((value, index) => {
            const particle = particles[index];
            value.setValue(0);
            const loop = Animated.loop(
                Animated.timing(value, {
                    toValue: 1,
                    duration: getParticleCycleMs(particle),
                    easing: makeParticleCycleEasing(particle),
                    useNativeDriver: true,
                })
            );
            loop.start();
            return loop;
        });

        return () => {
            loops.forEach((loop) => loop.stop());
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
    const isBodyCardPressable = typeof onPressBodyCard === "function";
    const BodyCardWrapper = isBodyCardPressable ? TouchableOpacity : View;
    const bodyCardWrapperProps = isBodyCardPressable
        ? {
              onPress: onPressBodyCard,
              activeOpacity: 0.88,
              accessibilityRole: "button",
              accessibilityLabel: "Open progress insights",
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
                        colors={rankCardGlowColors}
                        locations={[0, 0.5, 1]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.rankCard, styles.rankCardFrame, styles.rankCardRank, { borderColor: rankCardBorderColor }]}
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
                        {showRankHeader && (
                            <View style={styles.rankHeaderRow}>
                                <Text style={styles.rankEyebrow}>{eyebrowLabel || ""}</Text>
                                {resolvedShowOverall ? (
                                    <View style={[styles.rankOvrChip, { backgroundColor: withAlpha(rankAccentColor, 0.14) }]}>
                                        <Text style={[styles.rankOvrLabel, { color: rankAccentColor }]}>OVR</Text>
                                        <Text style={styles.rankOvrValue}>{resolvedOverallRating}</Text>
                                    </View>
                                ) : null}
                            </View>
                        )}
                        <View style={[styles.rankCardContent, !showRankHeader && styles.rankCardContentNoHeader]}>
                            <Animated.View
                                style={[
                                    styles.rankBadgeCluster,
                                    enableRankAnimations ? { transform: [{ scale: badgePulseScale }] } : null,
                                ]}
                            >
                                <RankBadgeEmblem rankTheme={rankTheme} stage={rankLevelStage} size={scaled(104)} />
                            </Animated.View>
                            <Text style={[styles.rankTitle, { color: rankTheme.titleColor || goldTheme.titleColor }]}>
                                {rankTitleParts.name}
                                {rankTitleParts.level ? (
                                    <Text style={{ color: rankAccentColor }}>{` ${rankTitleParts.level}`}</Text>
                                ) : null}
                            </Text>
                        </View>
                        {pointsToNextRankCopy ? (
                            <View style={[styles.rankFooter, { borderTopColor: withAlpha(rankAccentColor, 0.18) }]}>
                                <Text style={[styles.rankProgressText, { color: rankAccentColor }]}>
                                    {pointsToNextRankCopy}
                                </Text>
                                <Ionicons name="chevron-forward" size={scaled(14)} color={rankAccentColor} />
                            </View>
                        ) : null}
                    </LinearGradient>
                </CardWrapper>
                {!isRankTabActive &&
                    (isBodygraphTabActive ? (
                        <BodyCardWrapper style={styles.rankCardWrapper} {...bodyCardWrapperProps}>
                            <View style={[styles.rankCard, styles.rankCardFrame, styles.bodygraphCard]}>
                                <View style={styles.bodygraphContent}>
                                    <View style={styles.bodygraphStatsColumn}>
                                        {hasOverallStat ? (
                                            <View style={styles.bodygraphOverallHero}>
                                                <Text style={[styles.bodygraphStatsLabel, styles.bodygraphOverallLabel]}>
                                                    Overall
                                                </Text>
                                                <Text
                                                    style={[styles.bodygraphStatsValue, styles.bodygraphOverallValue]}
                                                    numberOfLines={1}
                                                    adjustsFontSizeToFit
                                                    minimumFontScale={0.7}
                                                >
                                                    {overallStatDisplay}
                                                </Text>
                                            </View>
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
                                                fills={bodygraphFills}
                                                style={[styles.bodygraphFigure, styles.bodygraphFigureFront]}
                                            />
                                        </View>
                                        <View style={[styles.bodygraphFigureSlot, styles.bodygraphFigureSlotBack]}>
                                            <HumanMuscleBackOutline
                                                color={BODYGRAPH_OUTLINE_COLOR}
                                                width="90%"
                                                height="100%"
                                                preserveAspectRatio="xMidYMax slice"
                                                fills={bodygraphFills}
                                                style={[styles.bodygraphFigure, styles.bodygraphFigureBack]}
                                            />
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </BodyCardWrapper>
                    ) : (
                        <View style={[styles.rankCard, styles.rankCardFrame, styles.rankPlaceholderCard]}>
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
        paddingVertical: scaled(26),
        paddingHorizontal: scaleSize(24),
        justifyContent: "center",
        position: "relative",
        minHeight: scaleSize(220),
        height: scaleSize(220),
    },
    rankCardFrame: {
        marginHorizontal: scaleSize(14),
        borderRadius: scaleSize(20),
        borderWidth: 1,
        borderColor: theme.hairline,
        backgroundColor: theme.surface,
        overflow: "hidden",
    },
    rankCardRank: {
        height: "auto",
        minHeight: 0,
        paddingVertical: 0,
        paddingHorizontal: 0,
    },
    rankHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: scaleSize(16),
        paddingTop: scaleSize(14),
        minHeight: scaleSize(38),
        zIndex: 2,
    },
    rankEyebrow: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaled(11),
        color: theme.textSecondary,
        letterSpacing: 1.1,
        textTransform: "uppercase",
    },
    rankOvrChip: {
        flexDirection: "row",
        alignItems: "baseline",
        paddingHorizontal: scaleSize(10),
        paddingVertical: scaleSize(4),
        borderRadius: scaleSize(12),
    },
    rankOvrLabel: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: scaled(10),
        letterSpacing: 0.8,
        marginRight: scaleSize(5),
    },
    rankOvrValue: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaled(14),
        color: theme.textPrimary,
        fontVariant: ["tabular-nums"],
    },
    rankFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: scaleSize(16),
        paddingVertical: scaleSize(12),
        borderTopWidth: StyleSheet.hairlineWidth,
        backgroundColor: "rgba(0,0,0,0.16)",
        zIndex: 2,
    },
    rankCardWrapper: {
        width: "100%",
    },
    rankCardHidden: {
        display: "none",
    },
    rankCardContent: {
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: scaleSize(4),
        paddingBottom: scaleSize(20),
        zIndex: 2,
    },
    rankCardContentNoHeader: {
        paddingTop: scaleSize(22),
    },
    rankBadgeCluster: {
        width: scaled(130),
        height: scaled(104),
        justifyContent: "center",
        alignItems: "center",
        marginBottom: scaled(2),
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
    rankProgressText: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaled(13),
        color: "rgba(255,255,255,0.8)",
        letterSpacing: 0.2,
    },
    rankTitle: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: scaled(22),
        color: "#fffef4",
        marginTop: scaled(4),
        letterSpacing: 2,
        textAlign: "center",
        textTransform: "uppercase",
    },
    bodygraphCard: {
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
        width: "30%",
        paddingRight: scaleSize(10),
        justifyContent: "center",
    },
    bodygraphOverallHero: {
        gap: scaleSize(4),
    },
    bodygraphOverallLabel: {
        textTransform: "uppercase",
        fontFamily: "Outfit_700Bold",
        letterSpacing: 0.4,
        color: "rgba(247,248,255,0.9)",
        fontSize: scaled(14),
    },
    bodygraphOverallValue: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaled(40),
        lineHeight: scaled(44),
        color: theme.primary,
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
    bodygraphStatsEmptyText: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaled(12),
        color: "rgba(247,248,255,0.6)",
        letterSpacing: 0.25,
        maxWidth: "90%",
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
        transform: [{ scale: 1.18 }, { translateY: scaleSize(12) }, { translateX: scaleSize(6) }],
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
