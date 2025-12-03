import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { RANK_TIER_THEMES } from "../1_Feed/FeedSnapshotCard";
import { scaleSize } from "./layoutConstants";
import { deriveBadgeDetailColors, resolveLevelStage, withAlpha } from "./rankBadgeLevelHelpers";

const DEFAULT_BADGE_SIZE = scaleSize(30);
const DEFAULT_THEME = RANK_TIER_THEMES.bronze;

const resolveTheme = (tier) => {
    const normalized = typeof tier === "string" ? tier.trim().toLowerCase() : "";
    return RANK_TIER_THEMES[normalized] || DEFAULT_THEME;
};

const RankTierMiniBadge = ({ tier, level, size = DEFAULT_BADGE_SIZE, style }) => {
    const safeSize = Math.max(scaleSize(20), size || DEFAULT_BADGE_SIZE);
    const innerSize = safeSize * 0.8;
    const coreSize = innerSize * 0.78;
    const gemSize = coreSize * 0.42;
    const gemInnerSize = gemSize * 0.58;
    const theme = resolveTheme(tier);
    const stage = resolveLevelStage(level);
    const detailColors = deriveBadgeDetailColors(theme, DEFAULT_THEME);
    const { ringColor, sparkleColor, wingColor, accentPrimary } = detailColors;
    const minimalShellColor = withAlpha(accentPrimary, 0.18);
    const minimalShellBorder = withAlpha(accentPrimary, 0.45);
    const showSeedGem = stage === 1;
    const showGem = stage >= 2;
    const showInnerShell = stage >= 3;
    const showOuterShell = stage >= 4;
    const showWingDetails = stage >= 5;
    const sparkleSize = coreSize * 0.2;

    const coreStyle = [
        styles.core,
        !showInnerShell && !showOuterShell ? styles.coreExpanded : null,
        {
            width: showInnerShell || showOuterShell ? coreSize : innerSize * 0.9,
            height: showInnerShell || showOuterShell ? coreSize : innerSize * 0.9,
            borderRadius: (showInnerShell || showOuterShell ? coreSize : innerSize * 0.9) / 2,
            backgroundColor: theme.badgeCoreColor || DEFAULT_THEME.badgeCoreColor,
            shadowColor: theme.badgeCoreShadowColor || DEFAULT_THEME.badgeCoreShadowColor,
        },
    ];

    const gemStyle = [
        styles.gem,
        !showInnerShell && !showOuterShell ? styles.gemExpanded : null,
        {
            width: showInnerShell || showOuterShell ? gemSize : gemSize * 1.12,
            height: showInnerShell || showOuterShell ? gemSize : gemSize * 1.12,
            borderRadius: (showInnerShell || showOuterShell ? gemSize : gemSize * 1.12) / 4,
            backgroundColor: theme.badgeGemColor || DEFAULT_THEME.badgeGemColor,
            borderColor: theme.badgeGemBorderColor || DEFAULT_THEME.badgeGemBorderColor,
        },
    ];

    const gemInnerStyle = [
        styles.gemInner,
        !showInnerShell && !showOuterShell ? styles.gemInnerExpanded : null,
        {
            width: showInnerShell || showOuterShell ? gemInnerSize : gemInnerSize * 1.12,
            height: showInnerShell || showOuterShell ? gemInnerSize : gemInnerSize * 1.12,
            borderRadius: (showInnerShell || showOuterShell ? gemInnerSize : gemInnerSize * 1.12) / 4,
            backgroundColor: theme.badgeGemInnerColor || DEFAULT_THEME.badgeGemInnerColor,
            borderColor: theme.badgeGemInnerBorderColor || DEFAULT_THEME.badgeGemInnerBorderColor,
        },
    ];

    const renderCore = () => (
        <View style={coreStyle}>
            <View style={styles.detailLayer} pointerEvents="none">
                {stage >= 2 && (
                    <View
                        style={[
                            styles.levelRing,
                            {
                                width: coreSize * 0.88,
                                height: coreSize * 0.88,
                                borderRadius: (coreSize * 0.88) / 2,
                                borderColor: ringColor,
                            },
                        ]}
                    />
                )}
                {stage >= 3 && (
                    <View style={styles.levelStar}>
                        <View
                            style={[
                                styles.levelStarArm,
                                {
                                    width: coreSize * 0.5,
                                    backgroundColor: sparkleColor,
                                },
                            ]}
                        />
                        <View
                            style={[
                                styles.levelStarArm,
                                {
                                    width: coreSize * 0.5,
                                    backgroundColor: sparkleColor,
                                    transform: [{ rotate: "90deg" }],
                                },
                            ]}
                        />
                    </View>
                )}
                {stage >= 4 && (
                    <>
                        <View
                            style={[
                                styles.levelSparkle,
                                {
                                    width: sparkleSize,
                                    height: sparkleSize,
                                    borderRadius: sparkleSize / 2,
                                    top: coreSize * 0.18,
                                    left: coreSize * 0.18,
                                    backgroundColor: sparkleColor,
                                    shadowColor: sparkleColor,
                                },
                            ]}
                        />
                        <View
                            style={[
                                styles.levelSparkle,
                                {
                                    width: sparkleSize * 0.65,
                                    height: sparkleSize * 0.65,
                                    borderRadius: (sparkleSize * 0.65) / 2,
                                    top: coreSize * 0.15,
                                    right: coreSize * 0.18,
                                    backgroundColor: sparkleColor,
                                    shadowColor: sparkleColor,
                                },
                            ]}
                        />
                    </>
                )}
                {showWingDetails && (
                    <>
                        <View
                            style={[
                                styles.levelWing,
                                styles.levelWingLeft,
                                {
                                    width: coreSize * 0.55,
                                    height: Math.max(scaleSize(4), coreSize * 0.18),
                                    borderRadius: coreSize * 0.12,
                                    backgroundColor: wingColor,
                                    shadowColor: wingColor,
                                },
                            ]}
                        />
                        <View
                            style={[
                                styles.levelWing,
                                styles.levelWingRight,
                                {
                                    width: coreSize * 0.55,
                                    height: Math.max(scaleSize(4), coreSize * 0.18),
                                    borderRadius: coreSize * 0.12,
                                    backgroundColor: wingColor,
                                    shadowColor: wingColor,
                                },
                            ]}
                        />
                    </>
                )}
            </View>
            {showSeedGem && (
                <View
                    style={[
                        styles.seedGem,
                        {
                            backgroundColor: accentPrimary,
                        },
                    ]}
                />
            )}
            {showGem && (
                <>
                    <View style={gemStyle} />
                    <View style={gemInnerStyle} />
                </>
            )}
        </View>
    );

    const renderShell = () => {
        if (showOuterShell) {
            return (
                <LinearGradient
                    colors={theme.badgeOuterGradient || DEFAULT_THEME.badgeOuterGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                        styles.outer,
                        {
                            width: safeSize,
                            height: safeSize,
                            borderRadius: safeSize / 2,
                        },
                    ]}
                >
                    <LinearGradient
                        colors={theme.badgeInnerGradient || DEFAULT_THEME.badgeInnerGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                            styles.inner,
                            {
                                width: innerSize,
                                height: innerSize,
                                borderRadius: innerSize / 2,
                            },
                        ]}
                    >
                        {renderCore()}
                    </LinearGradient>
                </LinearGradient>
            );
        }

        if (showInnerShell) {
            return (
                <LinearGradient
                    colors={theme.badgeInnerGradient || DEFAULT_THEME.badgeInnerGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                        styles.innerStandalone,
                        {
                            width: innerSize,
                            height: innerSize,
                            borderRadius: innerSize / 2,
                        },
                    ]}
                >
                    {renderCore()}
                </LinearGradient>
            );
        }

        return (
            <View
                style={[
                    styles.minimalShell,
                    {
                        width: innerSize,
                        height: innerSize,
                        borderRadius: innerSize / 2,
                        backgroundColor: minimalShellColor,
                        borderColor: minimalShellBorder,
                    },
                ]}
            >
                {renderCore()}
            </View>
        );
    };

    return (
        <View style={[styles.container, style, { width: safeSize, height: safeSize }]}>
            {renderShell()}
        </View>
    );
};

export default memo(RankTierMiniBadge);

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        justifyContent: "center",
    },
    outer: {
        alignItems: "center",
        justifyContent: "center",
    },
    inner: {
        alignItems: "center",
        justifyContent: "center",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.24)",
    },
    innerStandalone: {
        alignItems: "center",
        justifyContent: "center",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.2)",
    },
    minimalShell: {
        alignItems: "center",
        justifyContent: "center",
        borderWidth: StyleSheet.hairlineWidth,
    },
    core: {
        alignItems: "center",
        justifyContent: "center",
        shadowOpacity: 0.4,
        shadowOffset: { width: 0, height: scaleSize(2) },
        shadowRadius: scaleSize(3),
        elevation: 2,
    },
    coreExpanded: {
        shadowOpacity: 0.3,
    },
    gem: {
        alignItems: "center",
        justifyContent: "center",
        transform: [{ rotate: "45deg" }],
        borderWidth: StyleSheet.hairlineWidth,
    },
    gemExpanded: {
        borderWidth: scaleSize(1),
    },
    gemInner: {
        position: "absolute",
        transform: [{ rotate: "45deg" }],
        borderWidth: StyleSheet.hairlineWidth,
    },
    seedGem: {
        position: "absolute",
        width: scaleSize(10),
        height: scaleSize(10),
        borderRadius: scaleSize(2.2),
        transform: [{ rotate: "45deg" }],
        opacity: 0.75,
    },
    gemInnerExpanded: {
        borderWidth: StyleSheet.hairlineWidth,
    },
    detailLayer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        justifyContent: "center",
    },
    levelRing: {
        position: "absolute",
        borderWidth: StyleSheet.hairlineWidth,
    },
    levelStar: {
        position: "absolute",
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
        justifyContent: "center",
    },
    levelStarArm: {
        position: "absolute",
        height: scaleSize(2),
        borderRadius: scaleSize(1),
    },
    levelSparkle: {
        position: "absolute",
        shadowOpacity: 0.45,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: scaleSize(2),
    },
    levelWing: {
        position: "absolute",
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: scaleSize(1) },
        shadowRadius: scaleSize(1.5),
    },
    levelWingLeft: {
        left: -scaleSize(6),
        transform: [{ rotate: "-12deg" }],
    },
    levelWingRight: {
        right: -scaleSize(6),
        transform: [{ rotate: "12deg" }],
    },
});
