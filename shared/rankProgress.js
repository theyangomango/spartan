import rankLevelPromotionRequirements from "./rankLevelTasks.js";

const DISPLAY_TITLES = {
    bronze: "Bronze",
    silver: "Silver",
    gold: "Gold",
    ruby: "Ruby",
    platinum: "Platinum",
    diamond: "Diamond",
};

const TIER_ORDER_ASC = ["bronze", "silver", "gold", "ruby", "platinum", "diamond"];
const TIER_ORDER_DESC = [...TIER_ORDER_ASC].slice().reverse();
const LEVEL_ORDER_ASC = ["I", "II", "III", "IV", "V"];
const LEVEL_ORDER_DESC = [...LEVEL_ORDER_ASC].slice().reverse();

const buildLadder = (tiers, levels) =>
    tiers.flatMap((tier) =>
        levels.map((level) => {
            const label = `${DISPLAY_TITLES[tier] || tier} ${level}`;
            return {
                key: `${tier}-${level}`,
                rankTier: tier,
                rankLabel: label,
                rankLevel: level,
            };
        })
    );

const LADDER_LEVELS_DESC = buildLadder(TIER_ORDER_DESC, LEVEL_ORDER_DESC);
const LADDER_LEVELS_ASC = [...LADDER_LEVELS_DESC].slice().reverse();

const LADDER_LEVELS = LADDER_LEVELS_DESC;

const BODY_KEY_MAP = {
    shoulders: "shoulders",
    legs: "legs",
    chest: "chest",
    arms: "arms",
    abs: "abs",
    core: "abs",
    back: "back",
};

export const buildLevelKey = (tier, rankLabel) => {
    const normalizedTier = String(tier || "").toLowerCase().trim();
    if (!normalizedTier) return null;
    const tokens = String(rankLabel || "").trim().split(" ");
    const levelToken =
        tokens[tokens.length - 1]?.toLowerCase()?.replace(/[^iv]+/g, "") ||
        tokens[tokens.length - 1]?.toLowerCase();
    const normalizedLevel = levelToken || tokens[tokens.length - 1]?.toLowerCase();
    if (!normalizedLevel) return null;
    return `${normalizedTier}-${normalizedLevel}`;
};

export const parseRequirementTask = (taskLabel) => {
    const label = typeof taskLabel === "string" ? taskLabel.trim() : "";
    if (!label) return { type: "generic", label: taskLabel };
    const logMatch = label.match(/^Log\s+(\d+)\s+Workouts/i);
    if (logMatch) {
        return { type: "workouts", target: Number(logMatch[1]), label };
    }
    const scoreOverallMatch = label.match(/^[A-Za-z]+\s+([\d.]+)\+\s+Score\s+Overall/i);
    if (scoreOverallMatch) {
        return { type: "score", key: "overall", target: Number(scoreOverallMatch[1]), label };
    }
    const scoreBodyMatch = label.match(/^[A-Za-z]+\s+([\d.]+)\+\s+Score\s+in\s+([A-Za-z]+)/i);
    if (scoreBodyMatch) {
        const key = BODY_KEY_MAP[scoreBodyMatch[2].toLowerCase()] || scoreBodyMatch[2].toLowerCase();
        return { type: "score", key, target: Number(scoreBodyMatch[1]), label };
    }
    const liftMatch = label.match(/^Lift\s+([\d,]+)\s+lbs\s+Total/i);
    if (liftMatch) {
        return {
            type: "volume",
            target: Number(liftMatch[1].replace(/,/g, "")),
            label,
        };
    }
    return { type: "generic", label };
};

export const normalizeStatsHexagon = (rawStats) => {
    if (!rawStats || typeof rawStats !== "object") return {};
    return Object.entries(rawStats).reduce((acc, [key, value]) => {
        const normalizedKey = String(key || "").toLowerCase();
        const numericValue = Number(value);
        acc[normalizedKey] = Number.isFinite(numericValue) ? numericValue : 0;
        return acc;
    }, {});
};

const extractWorkoutVolume = (workout) => {
    if (!workout || typeof workout !== "object") return 0;
    const candidates = [
        workout.volume,
        workout.totalVolume,
        workout?.stats?.volume,
        workout?.stats?.totalVolume,
        workout?.stats?.Volume,
    ];
    for (let i = 0; i < candidates.length; i += 1) {
        const candidate = Number(candidates[i]);
        if (Number.isFinite(candidate) && candidate > 0) {
            return candidate;
        }
    }
    return 0;
};

export const computeTotalLiftedVolume = (workouts) => {
    if (!Array.isArray(workouts)) return 0;
    return workouts.reduce((sum, workout) => sum + extractWorkoutVolume(workout), 0);
};

const clampRatio = (value) => {
    if (!Number.isFinite(value)) return 0;
    return Math.min(1, Math.max(0, value));
};

export const evaluateRequirementProgress = (descriptor, metrics = {}) => {
    if (!descriptor || !descriptor.type) {
        return { complete: false, ratio: 0, currentValue: 0, targetValue: undefined };
    }
    const totalWorkouts = Number(metrics?.totalWorkouts) || 0;
    const totalVolume = Number(metrics?.totalVolume) || 0;
    const statsHexagon = metrics?.statsHexagon || {};

    if (descriptor.type === "workouts" && Number.isFinite(descriptor.target)) {
        const current = totalWorkouts;
        const complete = current >= descriptor.target;
        const ratio = clampRatio(descriptor.target > 0 ? current / descriptor.target : 0);
        return {
            complete,
            ratio,
            currentValue: current,
            targetValue: descriptor.target,
        };
    }

    if (descriptor.type === "score" && Number.isFinite(descriptor.target)) {
        const key = (descriptor.key || "overall").toLowerCase();
        const current = Number(statsHexagon[key] || 0);
        const complete = current >= descriptor.target;
        const ratio = clampRatio(descriptor.target > 0 ? current / descriptor.target : 0);
        return {
            complete,
            ratio,
            currentValue: current,
            targetValue: descriptor.target,
        };
    }

    if (descriptor.type === "volume" && Number.isFinite(descriptor.target)) {
        const current = totalVolume;
        const complete = current >= descriptor.target;
        const ratio = clampRatio(descriptor.target > 0 ? current / descriptor.target : 0);
        return {
            complete,
            ratio,
            currentValue: current,
            targetValue: descriptor.target,
        };
    }

    return {
        complete: false,
        ratio: 0,
        currentValue: 0,
        targetValue: descriptor.target,
    };
};

export const buildRequirementMetrics = (completedWorkouts, statsHexagon) => ({
    totalWorkouts: Array.isArray(completedWorkouts) ? completedWorkouts.length : 0,
    totalVolume: computeTotalLiftedVolume(completedWorkouts),
    statsHexagon: normalizeStatsHexagon(statsHexagon),
});

export const computeRankProgress = (metrics = {}) => {
    const promotionStatuses = new Map();
    const baseEntry = LADDER_LEVELS_ASC[0] || null;
    let currentRankKey = baseEntry?.key || null;

    for (let i = 0; i < LADDER_LEVELS_ASC.length - 1; i += 1) {
        const entry = LADDER_LEVELS_ASC[i];
        const nextEntry = LADDER_LEVELS_ASC[i + 1];
        const promotionKey = buildLevelKey(entry.rankTier, entry.rankLabel);
        if (!promotionKey) continue;
        const rawTasks = rankLevelPromotionRequirements[promotionKey]?.tasks || [];
        const tasks = rawTasks.map((task) => {
            const descriptor = parseRequirementTask(task);
            const evaluation = evaluateRequirementProgress(descriptor, metrics);
            return {
                label: task,
                descriptor,
                ...evaluation,
            };
        });
        const allComplete = tasks.length ? tasks.every((task) => task.complete) : true;
        promotionStatuses.set(nextEntry.key, {
            tasks,
            allComplete,
            fromKey: entry.key,
            toKey: nextEntry.key,
            requirementKey: promotionKey,
        });
        if (allComplete) {
            currentRankKey = nextEntry.key;
        } else {
            break;
        }
    }

    const currentRankEntry =
        LADDER_LEVELS_DESC.find((entry) => entry.key === currentRankKey) ||
        LADDER_LEVELS_DESC[LADDER_LEVELS_DESC.length - 1] ||
        null;
    const currentRankIndexDesc = (() => {
        const idx = LADDER_LEVELS_DESC.findIndex((entry) => entry.key === currentRankKey);
        return idx === -1 ? LADDER_LEVELS_DESC.length - 1 : idx;
    })();
    const currentRankIndexAsc = (() => {
        const idx = LADDER_LEVELS_ASC.findIndex((entry) => entry.key === currentRankKey);
        return idx === -1 ? 0 : idx;
    })();

    return {
        currentRankKey,
        currentRankEntry,
        currentRankIndexDesc,
        currentRankIndexAsc,
        promotionStatuses,
    };
};

export const computeRankProgressFromData = ({ completedWorkouts, statsHexagon } = {}) => {
    const metrics = buildRequirementMetrics(completedWorkouts, statsHexagon);
    const progress = computeRankProgress(metrics);
    return { ...progress, metrics };
};

export {
    DISPLAY_TITLES,
    LADDER_LEVELS,
    LADDER_LEVELS_ASC,
    LADDER_LEVELS_DESC,
};
