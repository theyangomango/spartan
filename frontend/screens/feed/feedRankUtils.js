// Rank helpers of the Feed snapshot card: the viewer's current rank entry and rank progress derived from user data.
import { computeRankProgressFromData } from "../../../shared/rankProgress.js";

export const getInitialStatsHex = () => {
    try {
        return global?.userData?.statsHexagon || null;
    } catch {
        return null;
    }
};

export const deriveRankFromUserData = (user) => {
    try {
        const completedWorkouts = Array.isArray(user?.completedWorkouts)
            ? user.completedWorkouts.filter(Boolean)
            : [];
        const statsHexagon = user?.statsHexagon;
        const progress = computeRankProgressFromData({ completedWorkouts, statsHexagon });
        const entry = progress?.currentRankEntry;
        if (entry) {
            return {
                ...entry,
                tier: entry.rankTier,
                label: entry.rankLabel,
                level: entry.rankLevel,
            };
        }
    } catch {
        // fall back to stored rank if computation fails
    }
    return user?.currentRank || null;
};

export const buildRankSnapshot = (user) => {
    try {
        const completedWorkouts = Array.isArray(user?.completedWorkouts)
            ? user.completedWorkouts.filter(Boolean)
            : [];
        const statsHexagon = user?.statsHexagon;
        const progress = computeRankProgressFromData({ completedWorkouts, statsHexagon });
        const entry = progress?.currentRankEntry || null;
        const index = Number.isFinite(progress?.currentRankIndexDesc)
            ? progress.currentRankIndexDesc
            : null;
        return { entry, index, progress };
    } catch {
        return { entry: null, index: null, progress: null };
    }
};
