import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import scaleSize from "../../helper/scaleSize";
import { subscribeUserData } from "../../utils/userDataEvents";
import formatHexStat from "../../utils/formatHexStat";
import { strong as triggerStrongHaptic } from "../../utils/haptics";
import HumanMuscleOutline from "../../assets/human_muscle_outline";
import HumanMuscleBackOutline from "../../assets/human_muscle_back_outline";
import { resolveLevelStage, withAlpha } from "../2_Competition/rankBadgeLevelHelpers";
import RankBadgeEmblem from "../2_Competition/RankBadgeEmblem";
import { buildMuscleFillMap, DEFAULT_MUSCLE_SEGMENTS as MUSCLE_SEGMENTS, BODYGRAPH_OUTLINE_COLOR } from "../../utils/muscleTierColors";
import { RANK_TIER_THEMES, goldTheme } from "./rankTierThemes";
import styles from "./FeedSnapshotCard.styles";

export { RANK_TIER_THEMES };

const RANK_TAB_CONFIG = [
    {
        key: "rank",
        label: "Your Rank",
    },
    {
        key: "bodygraph",
        label: "Your Body",
    },
];

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
            const distance = scaleSize(100 + Math.random() * 180);
            const origin = originPoints[index % originPoints.length];
            return {
                key: `rank-particle-${index}`,
                offsetX: Math.cos(baseAngle) * distance,
                offsetY: Math.sin(baseAngle) * distance,
                size: scaleSize(4 + Math.random() * 8),
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
                                <RankBadgeEmblem rankTheme={rankTheme} stage={rankLevelStage} size={scaleSize(104)} />
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
                                <Ionicons name="chevron-forward" size={scaleSize(14)} color={rankAccentColor} />
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
                    ) : null)}
            </View>
        </View>
    );
}
