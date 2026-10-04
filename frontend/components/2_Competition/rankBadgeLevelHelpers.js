const LEVEL_STAGE_MAP = {
    v: 5,
    iv: 4,
    iii: 3,
    ii: 2,
    i: 1,
};

const normalizeHex = (color) => {
    if (typeof color !== "string") return null;
    const trimmed = color.trim();
    if (!trimmed) return null;
    let hex = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
    if (!/^[0-9a-fA-F]+$/.test(hex)) return null;
    if (hex.length === 8) {
        hex = hex.slice(0, 6);
    }
    if (hex.length === 3) {
        hex = hex
            .split("")
            .map((ch) => ch + ch)
            .join("");
    }
    if (hex.length !== 6) return null;
    return hex;
};

const hexToRgb = (color) => {
    const hex = normalizeHex(color);
    if (!hex) return null;
    const intVal = parseInt(hex, 16);
    return {
        r: (intVal >> 16) & 255,
        g: (intVal >> 8) & 255,
        b: intVal & 255,
    };
};

const clampStage = (value) => {
    if (!Number.isFinite(value)) return 1;
    return Math.min(Math.max(Math.round(value), 1), 5);
};

const resolveLevelStage = (level) => {
    if (typeof level === "number") {
        return clampStage(level);
    }
    if (typeof level === "string") {
        const normalized = level.trim().toLowerCase();
        if (!normalized) return 1;
        const pureRoman = normalized.replace(/[^iv]+/g, "");
        const mapped = LEVEL_STAGE_MAP[pureRoman];
        if (mapped) return mapped;
        const numericCandidate = Number(normalized);
        if (Number.isFinite(numericCandidate)) return clampStage(numericCandidate);
    }
    return 1;
};

const withAlpha = (color, alpha = 1, fallback = { r: 255, g: 255, b: 255 }) => {
    const rgb = hexToRgb(color) || fallback;
    const safeAlpha = Number.isFinite(alpha) ? Math.min(Math.max(alpha, 0), 1) : 1;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${safeAlpha})`;
};

export { resolveLevelStage, withAlpha };
