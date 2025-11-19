import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { RANK_TIER_THEMES } from "../1_Feed/FeedSnapshotCard";
import { scaleSize } from "./layoutConstants";

const DEFAULT_BADGE_SIZE = scaleSize(30);
const DEFAULT_THEME = RANK_TIER_THEMES.gold;

const resolveTheme = (tier) => {
    const normalized = typeof tier === "string" ? tier.trim().toLowerCase() : "";
    return RANK_TIER_THEMES[normalized] || DEFAULT_THEME;
};

const RankTierMiniBadge = ({ tier, size = DEFAULT_BADGE_SIZE, style }) => {
    const safeSize = Math.max(scaleSize(20), size || DEFAULT_BADGE_SIZE);
    const innerSize = safeSize * 0.8;
    const coreSize = innerSize * 0.78;
    const gemSize = coreSize * 0.42;
    const gemInnerSize = gemSize * 0.58;
    const theme = resolveTheme(tier);

    return (
        <View style={[styles.container, style, { width: safeSize, height: safeSize }]}>
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
                    <View
                        style={[
                            styles.core,
                            {
                                width: coreSize,
                                height: coreSize,
                                borderRadius: coreSize / 2,
                                backgroundColor: theme.badgeCoreColor || DEFAULT_THEME.badgeCoreColor,
                                shadowColor: theme.badgeCoreShadowColor || DEFAULT_THEME.badgeCoreShadowColor,
                            },
                        ]}
                    >
                        <View
                            style={[
                                styles.gem,
                                {
                                    width: gemSize,
                                    height: gemSize,
                                    borderRadius: gemSize / 4,
                                    backgroundColor: theme.badgeGemColor || DEFAULT_THEME.badgeGemColor,
                                    borderColor: theme.badgeGemBorderColor || DEFAULT_THEME.badgeGemBorderColor,
                                },
                            ]}
                        />
                        <View
                            style={[
                                styles.gemInner,
                                {
                                    width: gemInnerSize,
                                    height: gemInnerSize,
                                    borderRadius: gemInnerSize / 4,
                                    backgroundColor: theme.badgeGemInnerColor || DEFAULT_THEME.badgeGemInnerColor,
                                    borderColor:
                                        theme.badgeGemInnerBorderColor || DEFAULT_THEME.badgeGemInnerBorderColor,
                                },
                            ]}
                        />
                    </View>
                </LinearGradient>
            </LinearGradient>
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
    core: {
        alignItems: "center",
        justifyContent: "center",
        shadowOpacity: 0.4,
        shadowOffset: { width: 0, height: scaleSize(2) },
        shadowRadius: scaleSize(3),
        elevation: 2,
    },
    gem: {
        alignItems: "center",
        justifyContent: "center",
        transform: [{ rotate: "45deg" }],
        borderWidth: StyleSheet.hairlineWidth,
    },
    gemInner: {
        position: "absolute",
        transform: [{ rotate: "45deg" }],
        borderWidth: StyleSheet.hairlineWidth,
    },
});
