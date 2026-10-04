// Muted metallics keep the muscle outlines legible on dark backgrounds.
const HEX_TIER_COLORS = {
    bronze: "#c77a43",
    silver: "#83a5cbff",
    gold: "#e6c24f",
    ruby: "#ff5e81",
    emerald: "#6be6b1",
    diamond: "#5ed0ff",
};

const TIER_THRESHOLDS_DESC = [
    { min: 89, key: "diamond" },
    { min: 84, key: "emerald" },
    { min: 74, key: "ruby" },
    { min: 62, key: "gold" },
    { min: 45, key: "silver" },
    { min: 0, key: "bronze" },
];

const DEFAULT_MUSCLE_SEGMENTS = {
    shoulders: ["shoulders"],
    chest: ["chest"],
    arms: ["arms", "forearms"],
    back: ["back", "traps"],
    abs: ["abs", "obliques"],
    legs: ["quads", "calves"],
};

const toNumberOrNull = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};

const resolveHexTierColor = (score) => {
    const value = toNumberOrNull(score);
    if (value === null || value <= 0) return null;
    const threshold = TIER_THRESHOLDS_DESC.find((entry) => value >= entry.min);
    if (!threshold) return null;
    return HEX_TIER_COLORS[threshold.key] || null;
};

const normalizeHexagonStats = (stats) => {
    if (!stats || typeof stats !== "object") return {};
    return Object.entries(stats).reduce((acc, [key, value]) => {
        const normalizedKey = String(key || "").toLowerCase();
        acc[normalizedKey] = toNumberOrNull(value);
        return acc;
    }, {});
};

const buildMuscleFillMap = (statsHexagon, muscleSegments = DEFAULT_MUSCLE_SEGMENTS) => {
    const normalized = normalizeHexagonStats(statsHexagon);
    const fills = {};
    Object.entries(muscleSegments || {}).forEach(([groupKey, segments]) => {
        const color = resolveHexTierColor(normalized[groupKey]);
        if (!color) return;
        (segments || []).forEach((segment) => {
            fills[segment] = color;
        });
    });
    return fills;
};

export {
    buildMuscleFillMap,
    DEFAULT_MUSCLE_SEGMENTS,
};

export const BODYGRAPH_OUTLINE_COLOR = "#40485c";
