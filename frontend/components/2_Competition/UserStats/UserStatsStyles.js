import { StyleSheet, Dimensions } from 'react-native';
import scaleSize from '../../../helper/scaleSize';
import THEME from '../../../theme/mfpDark';

const { width: screenWidth } = Dimensions.get('window');
const scaledSize = (n) => scaleSize(n);

const COLORS = {
    bg: THEME.bg,
    card: THEME.surface,
    text: THEME.textPrimary,
    subtext: THEME.textSecondary,
    accent: THEME.primary,
    hairline: THEME.hairline,
};

const HANDLE_FRIEND_ACCENT = '#E0A500';
const HANDLE_FRIEND_BACKGROUND = '#e0a4002c';
const GOLD = '#FACC15';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
        borderTopLeftRadius: scaledSize(24),
        borderTopRightRadius: scaledSize(24),
    },
    grabber: {
        alignSelf: "center",
        width: scaledSize(32),
        height: scaledSize(4),
        borderRadius: scaledSize(2),
        backgroundColor: "rgba(255,255,255,0.75)",
        opacity: 1,
        marginTop: scaledSize(8),
        marginBottom: scaledSize(6),
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaledSize(22), // a little more horizontal padding
        paddingTop: scaledSize(8),
        marginBottom: scaledSize(8),
        justifyContent: "space-between",
    },
    headerBack: {
        marginLeft: -scaledSize(10),
        marginRight: scaledSize(2),
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginRight: scaledSize(12),
    },
    pfp: {
        width: scaledSize(40),
        height: scaledSize(40),
        borderRadius: scaledSize(20),
        marginRight: scaledSize(12),
        backgroundColor: "#e8eef7",
    },
    pfpFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    handle: {
        fontSize: scaleSize(15),
        fontFamily: "Poppins_700Bold",
        color: COLORS.text,
        letterSpacing: 0.2,
    },
    handleRow: {
        flexShrink: 1,
        maxWidth: '100%',
    },
    subHandle: {
        marginTop: scaledSize(2),
        fontSize: scaleSize(11.5),
        fontFamily: "Outfit_400Regular",
        color: COLORS.subtext,
    },

    // OVR pill (match Progress screen)
    ovrGlowWrap: {
        alignItems: "center",
        justifyContent: "center",
    },
    ovrGlow: {
        width: 0,
        height: 0,
    },
    scorePill: {
        flexDirection: "row",
        alignItems: "baseline",
        paddingHorizontal: scaledSize(12),
        paddingVertical: scaledSize(8),
        borderRadius: scaledSize(16),
        backgroundColor: "rgba(109, 183, 255, 0.14)",
    },
    ovrRow: { flexDirection: 'row', alignItems: 'flex-end' },
    scorePillLabel: {
        fontSize: scaleSize(11),
        fontFamily: "Outfit_800ExtraBold",
        color: "#6DB7FF",
        marginRight: scaledSize(6),
        letterSpacing: 0.4,
    },
    scorePillValue: {
        fontSize: scaleSize(15),
        fontFamily: "Outfit_700Bold",
        color: COLORS.text,
        letterSpacing: 0.2,
    },
    scorePillPrevWrap: {
        position: 'relative',
        justifyContent: 'center',
        marginRight: scaledSize(8),
    },
    scorePillPrev: {
        fontSize: scaleSize(16),
        fontFamily: 'Outfit_700Bold',
        color: '#94A3B8',
        letterSpacing: 0.2,
    },
    scorePillPrevLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: '50%',
        height: scaleSize(2.4),
        backgroundColor: '#94A3B8',
        marginTop: -scaleSize(1.2),
        borderRadius: scaleSize(1.2),
    },
    scorePillNew: {
        fontSize: scaleSize(17.5),
        fontFamily: 'Outfit_800ExtraBold',
        color: '#F2B84B',
        letterSpacing: 0.2,
        marginLeft: scaledSize(4),
    },

    scrollview: { flex: 1 },
    scrollContent: {
        paddingHorizontal: scaledSize(17), // a touch more
        paddingBottom: scaledSize(10),
    },

    exerciseList: {
        marginHorizontal: -scaledSize(17),
    },

    // Group header within Exercises
    groupHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: scaledSize(20),
        paddingRight: scaleSize(26),
        paddingVertical: scaledSize(8),
    },
    groupHeaderRowSpacing: {
        marginTop: scaledSize(36),
    },
    groupHeader: {
        marginTop: scaledSize(2),
        marginBottom: scaledSize(2),
        fontSize: scaleSize(16),
        fontFamily: "Outfit_700Bold",
        color: COLORS.text,
        letterSpacing: 0.25,
    },

    // Empty state
    emptyCard: {
        backgroundColor: COLORS.card,
        borderRadius: scaledSize(14),
        borderWidth: scaleSize(1),
        borderColor: COLORS.hairline,
        paddingVertical: scaledSize(16),
        alignItems: "center",
    },
    emptyText: {
        fontSize: scaleSize(13.5),
        fontFamily: "Outfit_500Medium",
        color: COLORS.subtext,
    },

    // Exercise row (full-width list style)
    exerciseCard: {
        backgroundColor: COLORS.card,
        borderRadius: 0,
        marginVertical: 0,
        width: '100%',
        paddingHorizontal: scaledSize(18),
        paddingTop: scaledSize(12),
        paddingBottom: scaledSize(8),
        borderBottomWidth: 1.1,
        borderBottomColor: COLORS.hairline,
    },
    exerciseCardFirst: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.hairline,
    },
    exerciseCardPressed: { backgroundColor: "rgba(255,255,255,0.04)" },

    cardRow: { flexDirection: 'row', alignItems: 'center' },
    cardContentColumn: { flex: 1, minWidth: 0, gap: scaledSize(10) },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: scaleSize(4),
        paddingBottom: scaleSize(4)
    },
    cardChevronColumn: {
        width: scaledSize(28),
        justifyContent: 'center',
        alignItems: 'flex-end'
    },

    exerciseName: {
        flex: 1,
        fontSize: scaleSize(13),
        fontFamily: "Nunito_800ExtraBold",
        color: '#48aaffff',
    },
    oneRMRow: {
        flexDirection: 'row',
        marginRight: scaledSize(4),
    },
    oneRMLabel: {
        fontSize: scaleSize(10),
        fontFamily: 'Outfit_600SemiBold',
        color: COLORS.subtext,
        marginRight: scaledSize(6),
        letterSpacing: 0.2,
    },
    oneRMValue: {
        fontSize: scaleSize(14),
        fontFamily: 'Nunito_800ExtraBold',
        color: GOLD,
        lineHeight: scaledSize(18),
    },

    metaRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    metaCell: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 0,
        paddingVertical: scaledSize(1),
    },
    metaDivider: {
        width: StyleSheet.hairlineWidth,
        backgroundColor: COLORS.hairline,
        marginHorizontal: scaledSize(8),
        marginVertical: scaledSize(2),
    },
    metaLabel: {
        fontSize: scaleSize(11.5),
        fontFamily: "Outfit_600SemiBold",
        color: COLORS.subtext,
        letterSpacing: 0.2,
        textAlign: 'center',
    },
    metaValue: {
        fontSize: scaleSize(13),
        lineHeight: scaledSize(18),
        fontFamily: "Outfit_800ExtraBold",
        color: COLORS.text,
        marginTop: scaledSize(1),
        textAlign: 'center',
    },

    // Detail overlay
    detailOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: COLORS.bg,
        borderTopLeftRadius: scaledSize(24),
        borderTopRightRadius: scaledSize(24),
        overflow: 'hidden',
        paddingTop: scaledSize(26),
        paddingHorizontal: 0,
        paddingBottom: scaledSize(16),
        zIndex: 1,
    },
    workoutOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: COLORS.bg,
        borderTopLeftRadius: scaledSize(24),
        borderTopRightRadius: scaledSize(24),
        overflow: 'hidden',
        paddingTop: 0,
        zIndex: 2,
    },
    // Friend-view handle bar (yellow)
    viewerHandleWrap: {
        paddingTop: scaledSize(8),
        paddingBottom: scaledSize(6),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: HANDLE_FRIEND_BACKGROUND,
        borderTopLeftRadius: scaledSize(24),
        borderTopRightRadius: scaledSize(24),
    },
    viewerHandleIndicator: {
        width: scaledSize(40),
        height: scaledSize(4),
        borderRadius: scaledSize(999),
        backgroundColor: HANDLE_FRIEND_ACCENT,
    },
    // On a full screen the safe area already clears the status bar and there is no sheet
    // corner to round, so the overlay drops the sheet's extra top padding and radius.
    detailOverlayFullScreen: {
        paddingTop: 0,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
    },
    detailHeaderWrapper: {
        marginBottom: scaledSize(8),
    },
    detailHeaderSimpleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scaledSize(18),
        paddingVertical: scaledSize(12),
        backgroundColor: 'transparent',
    },
    detailBackButton: {
        width: scaledSize(28),
        height: scaledSize(28),
        borderRadius: scaledSize(14),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(18, 28, 44, 0.6)',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(110, 184, 255, 0.16)',
    },
    detailBackButtonPressed: {
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    detailHeaderTitleWrap: {
        flex: 1,
        marginHorizontal: scaledSize(10),
        minWidth: 0,
    },
    detailHeaderTitle: {
        fontSize: scaleSize(15),
        lineHeight: scaledSize(18),
        fontFamily: 'Outfit_700Bold',
        color: COLORS.text,
        letterSpacing: 0.2,
    },
    detailHeaderSubtitle: {
        marginTop: scaledSize(2),
        fontSize: scaleSize(10),
        fontFamily: 'Outfit_500Medium',
        color: 'rgba(208, 224, 255, 0.65)',
        letterSpacing: 0.32,
    },
    detailEmpty: {
        backgroundColor: COLORS.card,
        borderRadius: scaledSize(16),
        borderWidth: scaleSize(1),
        borderColor: COLORS.hairline,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: scaledSize(20),
    },
    detailListContent: { paddingBottom: scaledSize(56) },
    detailLoadingFooter: {
        paddingVertical: scaledSize(16),
        alignItems: 'center',
        justifyContent: 'center',
    },
    lockedWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scaledSize(28),
    },
    lockedTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaledSize(16),
        color: COLORS.text,
        marginBottom: scaledSize(6),
        textAlign: 'center',
    },
    lockedSubtitle: {
        fontFamily: 'Outfit_500Medium',
        fontSize: scaledSize(13),
        color: COLORS.subtext,
        textAlign: 'center',
    },
});

export {
    COLORS,
    scaledSize,
    screenWidth,
    HANDLE_FRIEND_ACCENT,
    HANDLE_FRIEND_BACKGROUND,
    styles,
};
