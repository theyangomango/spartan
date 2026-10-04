import React from "react";
import { View } from "react-native";

import resolveRankTierKey, { resolveRankLabel } from "../../../utils/resolveRankTierKey";
import { RANK_TIER_THEMES } from "../../1_Feed/rankTierThemes";
import RankBadgeEmblem from "../../2_Competition/RankBadgeEmblem";
import { resolveLevelStage } from "../../2_Competition/rankBadgeLevelHelpers";

/** A user's rank emblem, sized to sit among the profile header icons. */
export default function ProfileRankBadge({ user, size, style }) {
    const rankTierKey = resolveRankTierKey(user) || "bronze";
    const rankTheme = RANK_TIER_THEMES[rankTierKey] || RANK_TIER_THEMES.bronze;
    const rankLabel = resolveRankLabel(user, rankTierKey, rankTheme) || rankTheme.displayName;
    const rankStage = resolveLevelStage(String(rankLabel || "").trim().split(/\s+/).pop());

    return (
        <View style={style} accessible accessibilityRole="image" accessibilityLabel={`Rank: ${rankLabel}`}>
            <RankBadgeEmblem rankTheme={rankTheme} stage={rankStage} size={size} />
        </View>
    );
}
