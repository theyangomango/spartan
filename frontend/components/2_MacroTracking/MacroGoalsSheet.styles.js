// Styles of MacroGoalsSheet (the sheet and the input styles it hands to LabeledNumber).
import { StyleSheet } from 'react-native';

import scaleSize from '../../helper/scaleSize';
import theme from '../../theme/mfpDark';

const makeStyles = (COLORS) => {
    // Slightly lift contrasts so inputs/buttons stand out better on dark
    const text = COLORS?.text ?? COLORS?.textPrimary ?? '#E5E7EB';
    const subtext = COLORS?.subtext ?? COLORS?.textSecondary ?? '#A1A7B3';
    // Brighter hairline for clearer edges in dark mode
    // Use a locally tuned hairline/field shade for stronger separation in sheets
    const hairline = 'rgba(255,255,255,0.14)';
    const accent = COLORS?.accentBlue ?? '#6FB8FF';
    const streakColor = COLORS?.streak ?? '#FF6C1A';

    return StyleSheet.create({
        sheetBackground: { backgroundColor: theme.bg, borderTopLeftRadius: scaleSize(24), borderTopRightRadius: scaleSize(24), borderWidth: StyleSheet.hairlineWidth, borderColor: hairline },
        sheetHandleContainer: { paddingVertical: scaleSize(14), alignItems: 'center' },
        sheetHandle: { backgroundColor: 'rgba(255,255,255,0.9)', width: scaleSize(44), height: scaleSize(4), borderRadius: scaleSize(2) },

        modeWrap: { ...StyleSheet.absoluteFillObject },

        scrollContent: { paddingHorizontal: scaleSize(18), paddingTop: scaleSize(18), paddingBottom: scaleSize(32) },

        headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scaleSize(12) },
        sheetTitle: { fontSize: scaleSize(18), fontFamily: 'Outfit_700Bold', color: text },
        sheetDescription: { fontSize: scaleSize(12.5), fontFamily: 'Outfit_400Regular', color: subtext, lineHeight: scaleSize(18) },

        row: { flexDirection: 'row', alignItems: 'flex-start' },
        macroInputsRow: { marginTop: scaleSize(18), paddingVertical: scaleSize(6) },
        totalCaloriesRow: { flexDirection: 'row', alignItems: 'baseline', gap: scaleSize(6), marginTop: scaleSize(22) },
        totalCaloriesInline: { fontSize: scaleSize(15), fontFamily: 'Outfit_500Medium', color: subtext },

        inputLabel: { fontSize: scaleSize(13), color: subtext, marginBottom: scaleSize(6), fontFamily: 'Outfit_400Regular' },
        inputBox: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.surface,
            borderRadius: scaleSize(14),
            borderWidth: scaleSize(1),
            borderColor: hairline,
            paddingHorizontal: scaleSize(12),
            paddingVertical: scaleSize(12),
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowOffset: { width: 0, height: scaleSize(1) },
            shadowRadius: scaleSize(4),
        },
        editableInputBox: {
            borderColor: accent,
            backgroundColor: 'rgba(111,184,255,0.08)',
            borderWidth: scaleSize(1.2),
        },
        input: { flex: 1, fontSize: scaleSize(16), fontFamily: 'Outfit_400Regular', color: text, paddingVertical: 0 },
        totalCaloriesValue: { fontSize: scaleSize(18), fontFamily: 'Outfit_600SemiBold', color: streakColor },
        totalCaloriesUnit: { fontSize: scaleSize(15), fontFamily: 'Outfit_400Regular', color: streakColor },
        // Make placeholder slightly brighter for readability
        placeholder: { color: '#BAC3D2' },
        accent: { color: accent },
        inputSuffix: { marginLeft: scaleSize(8), color: subtext, fontFamily: 'Outfit_400Regular', fontSize: scaleSize(13) },
        macroColumn: { flex: 1, paddingVertical: scaleSize(4) },
        macroCaloriesText: { marginTop: scaleSize(8), fontSize: scaleSize(12), color: subtext, fontFamily: 'Outfit_500Medium' },

        autoCalcRow: {
            marginTop: scaleSize(24),
            paddingHorizontal: scaleSize(14),
            paddingVertical: scaleSize(18),
            borderRadius: scaleSize(14),
            backgroundColor: theme.surface,
            borderWidth: scaleSize(1),
            borderColor: hairline,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        autoCalcLeft: { flexDirection: 'row', alignItems: 'center' },
        autoCalcIconWrap: {
            width: scaleSize(28),
            height: scaleSize(28),
            borderRadius: scaleSize(14),
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.surface,
            borderWidth: scaleSize(1),
            borderColor: hairline,
            marginRight: scaleSize(10),
        },
        autoCalcText: { fontFamily: 'Outfit_600SemiBold', fontSize: scaleSize(13), color: text },

        sheetButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: scaleSize(10), marginTop: scaleSize(28) },
        btn: { paddingVertical: scaleSize(12), paddingHorizontal: scaleSize(16), borderRadius: scaleSize(12) },
        // Give ghost button a clearer outline against the sheet
        btnGhost: { backgroundColor: theme.surface, borderWidth: scaleSize(1), borderColor: hairline },
        btnPrimary: { backgroundColor: accent },
        btnText: { fontFamily: 'Outfit_600SemiBold', fontSize: scaleSize(15) },
        btnGhostText: { color: text },
        btnPrimaryText: { color: '#fff' },
    });
};

export default makeStyles;
