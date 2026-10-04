// Builds the rank fields written to the user documents after a completed workout is edited or deleted.
import { computeRankProgressFromData } from "../../shared/rankProgress.js";

const buildRankFields = (completedWorkouts, statsHexagon) => {
    const rankProgress = computeRankProgressFromData({
        completedWorkouts,
        statsHexagon,
    });
    const currentRankEntry = rankProgress.currentRankEntry;
    const currentRankData = currentRankEntry
        ? {
              key: currentRankEntry.key,
              tier: currentRankEntry.rankTier,
              level: currentRankEntry.rankLevel,
              label: currentRankEntry.rankLabel,
              index: rankProgress.currentRankIndexDesc,
          }
        : null;
    const rankFields = currentRankData
        ? {
              currentRank: currentRankData,
              rankTier: currentRankData.tier,
              rankLabel: currentRankData.label,
              rankLevel: currentRankData.level,
          }
        : {
              currentRank: null,
              rankTier: null,
              rankLabel: null,
              rankLevel: null,
          };
    return rankFields;
};

export { buildRankFields };
