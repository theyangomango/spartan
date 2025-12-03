import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import theme from "../../theme/mfpDark";
import { RANK_TIER_THEMES } from "../1_Feed/FeedSnapshotCard";
import FeedSnapshotCard from "../1_Feed/FeedSnapshotCard";
import { DISPLAY_TITLES } from "../../../shared/rankProgress.js";
import { withAlpha } from "./rankBadgeLevelHelpers";
import { DEVICE_HEIGHT, DEVICE_WIDTH, scaleSize, ts } from "./layoutConstants";

const DEFAULT_RANK = { tier: "bronze", level: "I", label: "Bronze I" };
const DEFAULT_THEME = RANK_TIER_THEMES.bronze;

const capitalizeWord = (value) => {
    if (!value || typeof value !== "string") return "";
    return value.charAt(0).toUpperCase() + value.slice(1);
};

const extractLevelToken = (label) => {
    if (typeof label !== "string") return null;
    const tokens = label.trim().split(/\s+/);
    if (!tokens.length) return null;
    const candidate = tokens[tokens.length - 1];
    const roman = candidate.replace(/[^ivIV]+/g, "");
    return roman || candidate;
};

const formatRankLabel = (tier, level, label) => {
    if (label && typeof label === "string") return label;
    const title = DISPLAY_TITLES[tier] || capitalizeWord(tier);
    const levelSuffix = level ? ` ${level}` : "";
    return `${title}${levelSuffix}`.trim();
};

const normalizeRankEntry = (entry, fallback = DEFAULT_RANK) => {
    const fallbackTier = fallback?.tier || DEFAULT_RANK.tier;
    const rawTier = entry?.rankTier || entry?.tier || fallbackTier;
    const tier = typeof rawTier === "string" ? rawTier.trim().toLowerCase() : String(rawTier || fallbackTier).toLowerCase();
    const level =
        entry?.rankLevel ||
        extractLevelToken(entry?.rankLabel) ||
        extractLevelToken(entry?.label) ||
        extractLevelToken(entry?.key) ||
        fallback?.level ||
        DEFAULT_RANK.level;
    const label = formatRankLabel(tier, level, entry?.rankLabel || entry?.label);
    const themeForRank = RANK_TIER_THEMES[tier] || DEFAULT_THEME;
    const gradient = themeForRank.gradientColors?.length ? themeForRank.gradientColors : DEFAULT_THEME.gradientColors;
    const accent = themeForRank.borderColor || themeForRank.titleColor || DEFAULT_THEME.borderColor || "#7eb7ff";
    return {
        key: `${tier}-${level || "?"}`,
        tier,
        level,
        label,
        theme: themeForRank,
        gradient,
        accent,
    };
};

const buildShimmerLines = () => [
    { top: scaleSize(120), width: DEVICE_WIDTH * 1.2, left: -DEVICE_WIDTH * 0.1, rotate: "-10deg" },
    { top: scaleSize(210), width: DEVICE_WIDTH * 1.05, left: -DEVICE_WIDTH * 0.2, rotate: "-6deg" },
    { top: scaleSize(320), width: DEVICE_WIDTH * 1.1, left: -DEVICE_WIDTH * 0.05, rotate: "-12deg" },
];

export default function LevelUpTransition({
    visible,
    fromRank,
    toRank,
    overallRating = null,
    onClose,
}) {
    const from = useMemo(() => normalizeRankEntry(fromRank || DEFAULT_RANK), [fromRank]);
    const to = useMemo(() => normalizeRankEntry(toRank || DEFAULT_RANK), [toRank]);
    const signature = `${from.key}->${to.key}`;

    const backdrop = useRef(new Animated.Value(0)).current;
    const swap = useRef(new Animated.Value(0)).current;
    const pulse = useRef(new Animated.Value(0)).current;
    const spin = useRef(new Animated.Value(0)).current;
    const sweep = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!visible) return;
        backdrop.setValue(0);
        swap.setValue(0);
        pulse.setValue(0);
        sweep.setValue(0);

        const intro = Animated.sequence([
            Animated.timing(backdrop, {
                toValue: 1,
                duration: 240,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.parallel([
                Animated.timing(swap, {
                    toValue: 1,
                    duration: 1200,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(sweep, {
                    toValue: 1,
                    duration: 1400,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
            ]),
        ]);
        intro.start();

        const pulseLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, {
                    toValue: 1,
                    duration: 900,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(pulse, {
                    toValue: 0.3,
                    duration: 850,
                    easing: Easing.in(Easing.quad),
                    useNativeDriver: true,
                }),
            ])
        );

        const spinLoop = Animated.loop(
            Animated.timing(spin, {
                toValue: 1,
                duration: 8200,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );

        pulseLoop.start();
        spinLoop.start();

        return () => {
            intro.stop();
            pulseLoop.stop();
            spinLoop.stop();
        };
    }, [visible, signature, backdrop, pulse, spin, swap, sweep]);

    const shimmerLines = useMemo(buildShimmerLines, []);
    const oldBgOpacity = swap.interpolate({
        inputRange: [0, 0.4, 1],
        outputRange: [1, 0.3, 0.1],
    });
    const newBgOpacity = swap.interpolate({
        inputRange: [0, 0.35, 1],
        outputRange: [0, 0.6, 1],
    });
    const headerTranslateY = swap.interpolate({
        inputRange: [0, 1],
        outputRange: [scaleSize(18), 0],
    });
    const headerOpacity = swap.interpolate({
        inputRange: [0, 0.2, 1],
        outputRange: [0, 1, 1],
    });
    const oldCardOpacity = swap.interpolate({
        inputRange: [0, 0.6, 1],
        outputRange: [1, 0.5, 0.25],
    });
    const oldCardTranslate = swap.interpolate({
        inputRange: [0, 1],
        outputRange: [0, DEVICE_HEIGHT * 0.7],
    });
    const newCardOpacity = swap.interpolate({
        inputRange: [0, 0.25, 1],
        outputRange: [0, 0.7, 1],
    });
    const newCardTranslate = swap.interpolate({
        inputRange: [0, 1],
        outputRange: [-DEVICE_HEIGHT * 0.7, 0],
    });
    const newCardScale = swap.interpolate({
        inputRange: [0, 0.55, 1],
        outputRange: [0.9, 1.06, 1],
    });
    const glowScale = pulse.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.18],
    });
    const glowOpacity = pulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.22, 0.45],
    });
    const sweepTranslate = sweep.interpolate({
        inputRange: [0, 1],
        outputRange: [-DEVICE_WIDTH * 0.9, DEVICE_WIDTH * 0.4],
    });
    const spinDeg = spin.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
    });

    return (
        <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
            <Pressable
                style={styles.modalRoot}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close rank up overlay"
            >
                <Animated.View style={[styles.fill, { opacity: backdrop }]}>
                    <View style={styles.baseLayer} />
                </Animated.View>

                <Animated.View style={[styles.gradientLayer, { opacity: oldBgOpacity }]}>
                    <LinearGradient
                        colors={from.gradient || DEFAULT_THEME.gradientColors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gradientFill}
                    />
                </Animated.View>

                <Animated.View style={[styles.gradientLayer, { opacity: newBgOpacity }]}>
                    <LinearGradient
                        colors={to.gradient || DEFAULT_THEME.gradientColors}
                        start={{ x: 1, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.gradientFill}
                    />
                </Animated.View>

                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.radiance,
                        {
                            backgroundColor: withAlpha(to.accent, 0.28),
                            transform: [{ scale: glowScale }],
                            opacity: glowOpacity,
                        },
                    ]}
                />

                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.rays,
                        {
                            opacity: newBgOpacity,
                            transform: [{ rotate: spinDeg }],
                        },
                    ]}
                >
                    <View
                        style={[
                            styles.ray,
                            { backgroundColor: withAlpha(to.accent, 0.12) },
                        ]}
                    />
                    <View
                        style={[
                            styles.ray,
                            styles.raySecondary,
                            { backgroundColor: withAlpha(to.accent, 0.09) },
                        ]}
                    />
                </Animated.View>

                {shimmerLines.map((line, idx) => (
                    <Animated.View
                        key={`line-${idx}`}
                        style={[
                            styles.shimmerLine,
                            {
                                top: line.top,
                                left: line.left,
                                width: line.width,
                                transform: [
                                    { rotate: line.rotate },
                                    { translateX: sweepTranslate },
                                ],
                                opacity: newBgOpacity,
                                backgroundColor: withAlpha(to.accent, 0.3),
                            },
                        ]}
                    />
                ))}

                <Animated.View
                    pointerEvents="box-none"
                    style={[
                        styles.content,
                        {
                            transform: [{ translateY: headerTranslateY }],
                            opacity: headerOpacity,
                        },
                    ]}
                >
                    <Text style={styles.pretitle}>Rank Up</Text>
                    <Text style={styles.title}>{to.label}</Text>
                    <Text style={styles.subtitle}>Promoted from {from.label}</Text>
                </Animated.View>

                <View style={styles.rankStack} pointerEvents="box-none">
                    <Animated.View
                        style={[
                            styles.cardWrap,
                            styles.cardPrevious,
                            {
                                opacity: oldCardOpacity,
                                transform: [{ translateY: oldCardTranslate }],
                            },
                        ]}
                    >
                        <FeedSnapshotCard
                            rankTier={from.tier}
                            rankLabel={from.label}
                            rankLevel={from.level}
                            overallRating={overallRating}
                            showOverallRating={overallRating != null}
                            showRankTabs={false}
                            forceTabKey="rank"
                            enableRankAnimations={false}
                            pendingRequirementsCount={null}
                        />
                    </Animated.View>

                    <Animated.View
                        style={[
                            styles.cardWrap,
                            styles.cardNew,
                            {
                                opacity: newCardOpacity,
                                transform: [
                                    { translateY: newCardTranslate },
                                    { scale: newCardScale },
                                ],
                                shadowColor: to.accent,
                            },
                        ]}
                    >
                        <FeedSnapshotCard
                            rankTier={to.tier}
                            rankLabel={to.label}
                            rankLevel={to.level}
                            overallRating={overallRating}
                            showOverallRating={overallRating != null}
                            showRankTabs={false}
                            forceTabKey="rank"
                            enableRankAnimations
                            pendingRequirementsCount={null}
                        />
                    </Animated.View>
                </View>

                <Animated.View style={[styles.ctaWrap, { opacity: newCardOpacity }]}>
                    <Pressable
                        onPress={onClose}
                        style={({ pressed }) => [
                            styles.ctaButton,
                            pressed && styles.ctaButtonPressed,
                            { borderColor: withAlpha(to.accent, 0.35) },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Close rank up animation"
                    >
                        <LinearGradient
                            colors={[
                                withAlpha(to.accent, 0.65),
                                withAlpha(to.accent, 0.42),
                            ]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.ctaGradient}
                        />
                        <Text style={styles.ctaText}>Continue</Text>
                        <Ionicons name="sparkles" size={scaleSize(16)} color="#f6f8ff" style={styles.ctaIcon} />
                    </Pressable>
                </Animated.View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalRoot: {
        flex: 1,
        backgroundColor: "rgba(4, 7, 13, 0.8)",
        alignItems: "center",
        justifyContent: "flex-start",
    },
    fill: {
        ...StyleSheet.absoluteFillObject,
    },
    baseLayer: {
        flex: 1,
        backgroundColor: theme.bg || "#05070d",
    },
    gradientLayer: {
        ...StyleSheet.absoluteFillObject,
    },
    gradientFill: {
        flex: 1,
    },
    radiance: {
        position: "absolute",
        width: DEVICE_WIDTH * 1.15,
        height: DEVICE_WIDTH * 1.15,
        borderRadius: DEVICE_WIDTH * 0.6,
        top: DEVICE_HEIGHT * 0.18,
        left: (DEVICE_WIDTH - DEVICE_WIDTH * 1.15) / 2,
        shadowColor: "#000000",
        shadowOpacity: 0.35,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: scaleSize(24),
    },
    rays: {
        position: "absolute",
        width: DEVICE_WIDTH * 1.4,
        height: DEVICE_WIDTH * 1.4,
        borderRadius: DEVICE_WIDTH * 0.7,
        top: DEVICE_HEIGHT * 0.05,
        left: (DEVICE_WIDTH - DEVICE_WIDTH * 1.4) / 2,
        alignItems: "center",
        justifyContent: "center",
    },
    ray: {
        position: "absolute",
        width: "72%",
        height: scaleSize(8),
        borderRadius: scaleSize(8),
        shadowOpacity: 0.4,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: scaleSize(10),
    },
    raySecondary: {
        transform: [{ rotate: "90deg" }],
    },
    shimmerLine: {
        position: "absolute",
        height: scaleSize(2.6),
        borderRadius: scaleSize(2),
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: scaleSize(5),
    },
    content: {
        position: "absolute",
        top: DEVICE_HEIGHT * 0.18,
        alignItems: "center",
        paddingHorizontal: scaleSize(24),
    },
    pretitle: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: ts(12),
        letterSpacing: 1.2,
        color: "rgba(244, 247, 255, 0.82)",
        textTransform: "uppercase",
        marginBottom: scaleSize(6),
    },
    title: {
        fontFamily: "Outfit_900Black",
        fontSize: ts(28),
        color: "#fdfdff",
        letterSpacing: 0.4,
        textShadowColor: "rgba(0,0,0,0.45)",
        textShadowOffset: { width: 0, height: scaleSize(3) },
        textShadowRadius: scaleSize(6),
    },
    subtitle: {
        marginTop: scaleSize(10),
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(13),
        color: "rgba(236, 242, 255, 0.9)",
        textShadowColor: "rgba(0,0,0,0.4)",
        textShadowOffset: { width: 0, height: scaleSize(2) },
        textShadowRadius: scaleSize(5),
    },
    rankStack: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scaleSize(8),
    },
    cardWrap: {
        width: Math.min(DEVICE_WIDTH - scaleSize(16), scaleSize(460)),
        borderRadius: scaleSize(18),
        overflow: "hidden",
        backgroundColor: "rgba(5,7,13,0.65)",
        shadowOpacity: 0.4,
        shadowOffset: { width: 0, height: scaleSize(10) },
        shadowRadius: scaleSize(18),
        position: "absolute",
    },
    cardPrevious: {
        zIndex: 1,
    },
    cardNew: {
        zIndex: 2,
    },
    ctaWrap: {
        position: "absolute",
        bottom: DEVICE_HEIGHT * 0.1,
        width: "100%",
        alignItems: "center",
        paddingHorizontal: scaleSize(24),
    },
    ctaButton: {
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: scaleSize(14),
        borderRadius: scaleSize(16),
        borderWidth: StyleSheet.hairlineWidth,
        overflow: "hidden",
        backgroundColor: "rgba(0, 0, 0, 0.25)",
    },
    ctaButtonPressed: {
        opacity: 0.9,
    },
    ctaGradient: {
        ...StyleSheet.absoluteFillObject,
        opacity: 1,
    },
    ctaText: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: ts(15),
        color: "#fdfdff",
        textShadowColor: "rgba(0,0,0,0.35)",
        textShadowOffset: { width: 0, height: scaleSize(1) },
        textShadowRadius: scaleSize(2),
    },
    ctaIcon: {
        position: "absolute",
        right: scaleSize(14),
    },
});
