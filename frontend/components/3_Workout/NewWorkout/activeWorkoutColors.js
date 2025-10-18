// Central accent used by the collapsed active workout sheet; tweak once to update all usages.
export const ACTIVE_WORKOUT_HIGHLIGHT_HEX = '2D9DFF';

const toAlphaHex = (alpha = 1) => {
    const numeric = Number.isFinite(alpha) ? alpha : 1;
    const clamped = Math.min(1, Math.max(0, numeric));
    return Math.round(clamped * 255)
        .toString(16)
        .padStart(2, '0')
        .toUpperCase();
};

export const activeWorkoutHighlight = (alpha = 1) => {
    const alphaHex = toAlphaHex(alpha);
    if (alphaHex === 'FF') {
        return `#${ACTIVE_WORKOUT_HIGHLIGHT_HEX}`;
    }
    return `#${ACTIVE_WORKOUT_HIGHLIGHT_HEX}${alphaHex}`;
};
