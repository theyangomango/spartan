// MyFitnessPal-inspired dark palette
// Slate-blue dark palette (matches earlier design), nudged lighter for readability.

// Lighten helper: blends a hex color toward white by `amount` (0..1).
const lightenColor = (hex, amount = 0.1) => {
    if (typeof hex !== 'string') return hex;
    let h = hex.replace('#', '').trim();
    let a = 1;
    if (h.length === 8) { // RGBA hex
        const aa = h.slice(6, 8);
        a = Math.max(0, Math.min(1, parseInt(aa, 16) / 255));
        h = h.slice(0, 6);
    }
    if (h.length !== 6) return hex;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const mix = (c) => Math.round(c + (255 - c) * amount);
    const rr = mix(r), gg = mix(g), bb = mix(b);
    return `rgba(${rr}, ${gg}, ${bb}, ${a})`;
};

const MFP_DARK = {
    // Surfaces (MyFitnessPal-like)
    // Neutral slate greys (subtle blue cast)
    bg: '#181b28',            // solid to ensure StatusBar matches
    surface: '#343740ff',       // darker card tone for cohesion with bg (will be lightened below)
    card: '#47516A',          // alias for surface (kept; will be aligned below)
    field: '#2e3138',         // inputs/chips slightly lighter than surface (will be lightened below)

    // Lines & shadows
    hairline: 'rgba(255,255,255,0.27)',

    // Text
    textPrimary: '#EAF0F7',
    textSecondary: '#BBC4D2',

    // Accents
    primary: '#2D9EFF',     // existing brand blue
    accentBlue: '#7FBEFF',
    success: '#3FD396',     // slightly cooler green to match brand
    // Slightly brighter greens for completed rows/inputs
    successBg: 'rgba(64,217,155,0.18)',
    successRowBg: 'rgba(64,217,155,0.24)',

    // Misc UI tints
    muted: '#96A1B2',
    ringBg: '#CFD7E4',        // progress tracks
    chipBg: '#606C88',
    addBtnBg: '#5D6A86',      // neutral pill backgrounds
    // High-contrast yet on-brand utility tints
    // Add a subtle blue-tinted background for the rest timer chip
    restPillBg: 'rgba(45, 158, 255, 0.22)',
    // Warmer, slightly desaturated amber for group button background
    groupAmber: '#EAC56E',
};
// Derive a slightly lighter canvas for screens (used across top-level screens)
// Keep the original bg for Footer and legacy areas.
MFP_DARK.screenBg = lightenColor(MFP_DARK.bg, 0.10);

// Nudge common surfaces a touch lighter to match the new canvas
MFP_DARK.surface = lightenColor(MFP_DARK.surface, 0.06);
MFP_DARK.card = MFP_DARK.surface;
MFP_DARK.field = lightenColor(MFP_DARK.field, 0.06);

export default MFP_DARK;
export { MFP_DARK };
