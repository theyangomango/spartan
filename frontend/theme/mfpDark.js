// MyFitnessPal-inspired dark palette
// Lighter than the previous near-black theme, with neutral blue-slate tones.

const MFP_DARK = {
    // Surfaces (MyFitnessPal-like)
    // Neutral slate greys (less blue, MFP-like)
    bg: '#343B49',          // slight lift in background
    surface: '#444b5aff',     // slightly lighter cards/surfaces for contrast
    card: '#444b5aff',        // alias for surface
    field: '#545E6D',       // inputs and subtle chips

    // Lines & shadows
    hairline: 'rgba(255,255,255,0.22)',

    // Text
    textPrimary: '#EAEFF6',
    textSecondary: '#AEB5C0',

    // Accents
    primary: '#2D9EFF',     // existing brand blue
    accentBlue: '#6FB8FF',
    success: '#40D99B',
    successBg: 'rgba(64,217,155,0.12)',
    successRowBg: 'rgba(64,217,155,0.14)',

    // Misc UI tints
    muted: '#8B95A5',
    ringBg: '#646D7C',      // progress tracks (neutral, slightly lighter)
    chipBg: '#687282',
    addBtnBg: '#636E7F',    // neutral pill backgrounds (lighter)
};

export default MFP_DARK;
export { MFP_DARK };
