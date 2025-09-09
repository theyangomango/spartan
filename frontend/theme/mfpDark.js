// MyFitnessPal-inspired dark palette
// Lighter than the previous near-black theme, with neutral blue-slate tones.

const MFP_DARK = {
    // Surfaces (MyFitnessPal-like)
    // Desaturated blue‑slate. Increase contrast between bg and cards.
    bg: '#1B2230',          // darker background
    surface: '#3A4354',     // lighter cards/surfaces
    card: '#3A4354',        // alias for surface
    field: '#2A3142',       // inputs and subtle chips (mid between bg and surface)

    // Lines & shadows
    hairline: 'rgba(255,255,255,0.14)',

    // Text
    textPrimary: '#EAEFF6',
    textSecondary: '#AEB5C0',

    // Accents
    primary: '#2D9EFF',     // existing brand blue
    accentBlue: '#6FB8FF',

    // Misc UI tints
    muted: '#8B95A5',
    ringBg: '#424C5E',      // progress tracks
    chipBg: '#3F4A5D',
    addBtnBg: '#274569',    // blue-tinted pill backgrounds
};

export default MFP_DARK;
export { MFP_DARK };
