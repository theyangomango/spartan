import { StyleSheet } from 'react-native';

import theme from '../../theme/mfpDark';
import { scaleSize, ts } from '../2_Competition/layoutConstants';

export const chartPointerStyles = StyleSheet.create({
    container: {
        position: 'absolute',
    },
    root: {
        width: scaleSize(184),
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    bubbleWrapper: {
        width: '100%',
        paddingHorizontal: scaleSize(8),
        marginTop: scaleSize(4),
        marginBottom: scaleSize(4),
    },
    alignLeft: {
        alignItems: 'flex-start',
    },
    alignRight: {
        alignItems: 'flex-end',
    },
    bubble: {
        maxWidth: '100%',
        minWidth: scaleSize(140),
        paddingHorizontal: scaleSize(14),
        paddingVertical: scaleSize(10),
        borderRadius: scaleSize(16),
        backgroundColor: 'rgba(9, 12, 18, 0.92)',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.12)',
    },
});

export const chartTypography = StyleSheet.create({
    pointerTitle: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: ts(16),
        color: theme.textPrimary ?? '#F6F8FF',
    },
    pointerSubtitle: {
        fontFamily: 'Outfit_500Medium',
        fontSize: ts(12),
        color: 'rgba(216,226,255,0.75)',
    },
    pointerBody: {
        fontFamily: 'Outfit_500Medium',
        fontSize: ts(11),
        color: 'rgba(216,226,255,0.75)',
    },
    pointerAccentGreen: {
        color: '#65F2B6',
    },
    pointerAccentBlue: {
        color: '#7FB7FF',
    },
    pointerTimestamp: {
        fontFamily: 'Outfit_400Regular',
        fontSize: ts(11),
        color: 'rgba(216,226,255,0.55)',
    },
    pointerDeltaNegative: {
        color: '#FF6B6B',
    },
    pointerDeltaNeutral: {
        color: 'rgba(216, 226, 255, 0.82)',
    },
    axisLabel: {
        fontFamily: 'Outfit_400Regular',
        fontSize: ts(11),
        color: '#aaa',
    },
});

export const chartCardTypography = StyleSheet.create({
    sectionTitle: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: ts(16),
        color: theme.textPrimary ?? '#F6F8FF',
    },
    hint: {
        fontFamily: 'Outfit_400Regular',
        fontSize: ts(11),
        color: 'rgba(216, 226, 255, 0.55)',
    },
    metricValue: {
        fontFamily: 'Outfit_700Bold',
        fontSize: ts(22),
        color: theme.textPrimary ?? '#F6F8FF',
        lineHeight: ts(23),
    },
    metricUnit: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: ts(16),
        color: theme.textPrimary ?? '#F6F8FF',
    },
    summary: {
        fontFamily: 'Outfit_400Regular',
        fontSize: ts(12),
        color: 'rgba(255,255,255,0.55)',
    },
    deltaValue: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: ts(16),
        color: theme.textPrimary ?? '#F6F8FF',
        lineHeight: ts(18),
    },
});
