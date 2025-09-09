// MyFitnessPal-inspired dark palette
// Slate-blue dark palette (matches earlier design), nudged lighter for readability.

const MFP_DARK = {
    // Surfaces (MyFitnessPal-like)
    // Neutral slate greys (subtle blue cast)
    bg: '#181b28fb',            // a bit darker to match screenshots (still a touch lighter)
    surface: '#32353fff',       // darker card tone for cohesion with bg
    card: '#47516A',          // alias for surface
    field: '#2e3138ff',         // inputs/chips slightly lighter than surface

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

export default MFP_DARK;
export { MFP_DARK };
