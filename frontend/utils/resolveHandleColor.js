import theme from "../theme/mfpDark";
import { RANK_TIER_THEMES } from "../components/1_Feed/FeedSnapshotCard";
import resolveRankTierKey from "./resolveRankTierKey";

/**
 * Resolve the accent color used for user handles across the app.
 * Mirrors the palette used in ProfileHeader and keeps a single source of truth.
 */
export default function resolveHandleColor(entry, options = {}) {
    const {
        rankTierKey: forcedRankTierKey,
        rankTheme: forcedRankTheme,
        extraRankTierCandidates = [],
        fallback = theme.textPrimary,
    } = options;

    const rankTierKey = forcedRankTierKey || resolveRankTierKey(entry, extraRankTierCandidates);
    const rankTheme = forcedRankTheme || (() => {
        const key = rankTierKey || "gold";
        return RANK_TIER_THEMES[key] || RANK_TIER_THEMES.gold;
    })();

    const bronzeAccent =
        rankTierKey === "bronze"
            ? (Array.isArray(rankTheme?.gradientColors) ? rankTheme.gradientColors[1] : "#b94f1f")
            : null;

    const candidates = [
        bronzeAccent,
        Array.isArray(rankTheme?.gradientColors) ? rankTheme.gradientColors[1] : null,
        Array.isArray(rankTheme?.gradientColors) ? rankTheme.gradientColors[2] : null,
        rankTheme?.borderColor,
        rankTheme?.titleSecondaryColor,
    ];

    for (const color of candidates) {
        if (typeof color === "string" && color.trim()) return color;
    }

    return fallback;
}
