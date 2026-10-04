// Styles, palette and layout constants of the bottom tab bar (Footer).
import { StyleSheet } from 'react-native';

import scaleSize from '../helper/scaleSize';
import theme from '../theme/mfpDark';

const FOOTER_BASE_HEIGHT = scaleSize(87);
export const FOOTER_HIDE_OFFSET = FOOTER_BASE_HEIGHT + scaleSize(18);

export const COLORS = {
    active: theme.textPrimary,
    // Darker inactive for stronger selected contrast
    inactive: '#4F5A69',
    bg: theme.bg,
    actionCircle: '#4F9DFF',
    actionCircleActive: '#4F9DFF',
    selectedIconBg: 'rgba(34, 61, 100, 0.32)',
};

const styles = StyleSheet.create({
    outer_view: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: FOOTER_BASE_HEIGHT,
        justifyContent: 'flex-end',
        zIndex: 2147483647,
        elevation: 2147483647,
    },
    main_ctnr: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        height: FOOTER_BASE_HEIGHT,
        paddingHorizontal: scaleSize(13),
        paddingBottom: scaleSize(13),
        backgroundColor: COLORS.bg,
        borderTopLeftRadius: scaleSize(40),
        borderTopRightRadius: scaleSize(40),

        // Remove hairline to avoid visible white line at top
        borderTopWidth: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaleSize(-2) },
        shadowOpacity: 0.5,
        shadowRadius: scaleSize(6),
        elevation: 4,
    },
    icon_ctnr: { flex: 1, alignItems: 'center', padding: scaleSize(10) },
    workout_icon_ctnr: { flex: 1, alignItems: 'center', paddingHorizontal: scaleSize(10), paddingVertical: scaleSize(8.2) },
    workout_indicator_ctnr: { borderRadius: scaleSize(100), padding: scaleSize(4) },
    workout_action: {
        width: scaleSize(52),
        aspectRatio: 1,
        borderRadius: scaleSize(27),
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: 'rgba(7, 20, 54, 0.7)',
        shadowOffset: { width: 0, height: scaleSize(6) },
        shadowOpacity: 0.35,
        shadowRadius: scaleSize(10),
        elevation: scaleSize(5),
    },
    workout_action_active: {
        shadowOpacity: 0.45,
        shadowRadius: scaleSize(14),
        elevation: scaleSize(7),
    },
    icon: { padding: scaleSize(13.5), borderRadius: scaleSize(25) },
    selectedIcon: {
        padding: scaleSize(13.5),
        borderRadius: scaleSize(30),
        backgroundColor: COLORS.selectedIconBg,
    },
    dead_zone: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: scaleSize(35),
        backgroundColor: 'transparent',
        zIndex: 2147483647,
    },
    startPromptModalRoot: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    startPromptBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
    },
    startPromptSheet: {
        backgroundColor: theme.surface,
        paddingHorizontal: scaleSize(26),
        paddingTop: scaleSize(22),
        paddingBottom: scaleSize(28),
        borderTopLeftRadius: scaleSize(26),
        borderTopRightRadius: scaleSize(26),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.06)',
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: scaleSize(24),
        shadowOffset: { width: 0, height: -6 },
        elevation: 18,
    },
    startPromptItem: {
        paddingVertical: scaleSize(12),
        borderRadius: scaleSize(16),
    },
    startPromptItemPressed: {
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    startPromptItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    startPromptItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    startPromptItemIcon: {
        marginRight: scaleSize(10),
    },
    startPromptItemChevron: {
        marginLeft: scaleSize(6),
    },
    startPromptItemText: {
        textAlign: 'left',
        color: theme.textPrimary,
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(15),
        letterSpacing: 0.2,
    },
    startPromptStartText: {
        color: COLORS.actionCircle,
    },
    startPromptCancelText: {
        color: theme.textSecondary,
    },
    startPromptDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(255,255,255,0.12)',
        marginVertical: scaleSize(4),
    },
});

export default styles;
