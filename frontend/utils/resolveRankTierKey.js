const normalizeId = (value) => {
    if (value === null || value === undefined) return "";
    const str = String(value).trim();
    return str;
};

const collectRankCandidates = (source) => {
    if (!source || typeof source !== "object") return [];
    return [
        source?.rankTier,
        source?.currentRank?.tier,
        source?.currentRank?.rankTier,
        source?.rank?.tier,
        source?.rank?.rankTier,
    ];
};

const RANK_TITLE_MAP = {
    bronze: "Bronze",
    silver: "Silver",
    gold: "Gold",
    ruby: "Ruby",
    emerald: "Emerald",
    diamond: "Diamond",
};

/**
 * Resolve a user's rank tier key, prioritizing the viewer's fresh data
 * when the entry refers to the signed-in user (helps override stale
 * snapshots embedded in posts, chats, etc).
 */
export const resolveRankTierKey = (entry, extraCandidates = []) => {
    const candidates = [];

    // If this entry refers to the current viewer, prioritize the latest global values.
    try {
        const viewer = global?.userData || null;
        const viewerId = normalizeId(viewer?.uid ?? viewer?.id);
        const entryId = normalizeId(entry?.uid ?? entry?.id ?? entry?.user?.uid ?? entry?.user?.id);
        if (viewerId && entryId && viewerId === entryId) {
            candidates.push(...collectRankCandidates(viewer));
        }
    } catch {
        // ignore global access errors
    }

    if (Array.isArray(extraCandidates) && extraCandidates.length) {
        candidates.push(...extraCandidates);
    }

    candidates.push(...collectRankCandidates(entry));

    for (const val of candidates) {
        if (typeof val === "string" && val.trim()) {
            return val.trim().toLowerCase();
        }
    }
    return null;
};

const formatTierTitle = (tierKey) => {
    const normalized = typeof tierKey === "string" ? tierKey.trim().toLowerCase() : "";
    if (!normalized) return "";
    if (RANK_TITLE_MAP[normalized]) return RANK_TITLE_MAP[normalized];
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

export const resolveRankLabel = (entry, rankTierKey = null, rankTheme = null) => {
    const labelCandidates = [
        entry?.currentRank?.label,
        entry?.currentRank?.rankLabel,
        entry?.rankLabel,
        entry?.rank?.label,
        entry?.rank?.rankLabel,
    ];
    for (const candidate of labelCandidates) {
        if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    }

    const levelCandidates = [
        entry?.currentRank?.level,
        entry?.currentRank?.rankLevel,
        entry?.rankLevel,
        entry?.rank?.level,
        entry?.rank?.rankLevel,
    ];
    const resolvedLevel = levelCandidates.find((lvl) => typeof lvl === "string" && lvl.trim());
    const resolvedTierKey = rankTierKey || resolveRankTierKey(entry);
    const tierTitle = formatTierTitle(resolvedTierKey);

    if (tierTitle && resolvedLevel) return `${tierTitle} ${resolvedLevel.trim()}`;
    if (rankTheme?.displayName) return rankTheme.displayName;
    return tierTitle || null;
};

export default resolveRankTierKey;
