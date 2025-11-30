// Muted metallics keep the muscle outlines legible on dark backgrounds.
const HEX_TIER_COLORS = {
    bronze: "#c77a43",
    silver: "#83a5cbff",
    gold: "#d6b25f",
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

const hexToRgba = (hexColor, alpha = 1) => {
    if (typeof hexColor !== "string") return null;
    const normalized = hexColor.trim().replace("#", "");
    if (![3, 6].includes(normalized.length)) return null;
    const full = normalized.length === 3
        ? normalized
            .split("")
            .map((ch) => ch + ch)
            .join("")
        : normalized;
    const intVal = parseInt(full, 16);
    const r = (intVal >> 16) & 255;
    const g = (intVal >> 8) & 255;
    const b = intVal & 255;
    const safeAlpha = Math.min(Math.max(Number(alpha) || 0, 0), 1);
    return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
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
    HEX_TIER_COLORS,
    resolveHexTierColor,
    buildMuscleFillMap,
    hexToRgba,
    DEFAULT_MUSCLE_SEGMENTS,
};
