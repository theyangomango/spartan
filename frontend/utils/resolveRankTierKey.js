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

export default resolveRankTierKey;
