// Hex colour helpers of NotificationCard (mixing and alpha); other colour helpers in the app have different contracts.

const HEX_LENGTHS = new Set([3, 4, 6, 8]);

const clamp = (value, min = 0, max = 1) => {
    if (Number.isNaN(value)) return min;
    return Math.min(Math.max(value, min), max);
};

const normalizeHex = (color) => {
    if (typeof color !== "string" || !color.startsWith("#")) return null;
    const hex = color.slice(1);
    if (!HEX_LENGTHS.has(hex.length)) return null;

    // Expand shorthand forms (#RGB, #RGBA) to full length.
    if (hex.length === 3 || hex.length === 4) {
        const chars = hex.split("");
        const expanded = chars.map((char) => char + char).join("");
        return expanded.length === 6 ? expanded : expanded.slice(0, 8);
    }

    return hex;
};

const hexToRgba = (color) => {
    const normalized = normalizeHex(color);
    if (!normalized) return null;

    const hasAlpha = normalized.length === 8;
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    const a = hasAlpha ? parseInt(normalized.slice(6, 8), 16) / 255 : 1;

    return { r, g, b, a };
};

const componentToHex = (value) => value.toString(16).padStart(2, "0");

export const mixHex = (colorA, colorB, weight = 0.5) => {
    const a = hexToRgba(colorA);
    const b = hexToRgba(colorB);

    if (!a || !b) return colorA && colorA.startsWith("#") ? colorA : colorB;

    const w = clamp(weight);
    const r = Math.round(a.r + (b.r - a.r) * w);
    const g = Math.round(a.g + (b.g - a.g) * w);
    const bl = Math.round(a.b + (b.b - a.b) * w);

    return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(bl)}`;
};

export const withAlpha = (color, alpha = 1) => {
    const rgba = hexToRgba(color);
    if (!rgba) return color;

    const a = clamp(typeof alpha === "number" ? alpha : rgba.a);
    return `rgba(${rgba.r},${rgba.g},${rgba.b},${a})`;
};
