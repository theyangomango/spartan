// MyFitnessPal-inspired dark palette
// Lightened slightly for overall brighter feel while keeping contrast.

const MFP_DARK = {
    // Surfaces (MyFitnessPal-like)
    // Neutral slate greys (less blue, MFP-like)
    bg: '#3A4252',            // + ~8% lighter background
    surface: '#4A5366ff',     // + ~8% lighter surfaces/cards
    card: '#4A5366ff',        // alias for surface
    field: '#5B667Aff',       // inputs and subtle chips (slightly lighter)

    // Lines & shadows
    hairline: 'rgba(255,255,255,0.22)',

    // Text
    textPrimary: '#EAEFF6',
    textSecondary: '#B8C0CC',

    // Accents
    primary: '#2D9EFF',     // existing brand blue
    accentBlue: '#7FBEFF',
    success: '#40D99B',
    // Slightly brighter greens for completed rows/inputs
    successBg: 'rgba(64,217,155,0.18)',
    successRowBg: 'rgba(64,217,155,0.24)',

    // Misc UI tints
    muted: '#96A1B2',
    ringBg: '#C2CADBff',      // progress tracks (slightly lighter)
    chipBg: '#707B8F',
    addBtnBg: '#6A768B',      // neutral pill backgrounds (lighter)
    // High-contrast yet on-brand utility tints
    restPillBg: '#4F5A70',    // more contrast for rest timer chip
    groupAmber: '#F5D086',    // softer amber for group button background
};

export default MFP_DARK;
export { MFP_DARK };
