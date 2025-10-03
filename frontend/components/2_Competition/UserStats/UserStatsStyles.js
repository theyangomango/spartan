import { StyleSheet, Dimensions } from 'react-native';
import scaleSize from '../../../helper/scaleSize';

const { width: screenWidth } = Dimensions.get('window');
const scaledSize = (n) => scaleSize(n);

const THEME = require('../../../theme/mfpDark').default;
const COLORS = {
    bg: THEME.bg,
    card: THEME.surface,
    text: THEME.textPrimary,
    subtext: THEME.textSecondary,
    accent: THEME.primary,
    hairline: THEME.hairline,
    iconBg: THEME.field,
    statBg: THEME.field,
    statBorder: THEME.hairline,
};

const HANDLE_FRIEND_ACCENT = '#E0A500';
const HANDLE_FRIEND_BACKGROUND = '#e0a4002c';
const GOLD = '#FACC15';
const GOLD_BG = 'rgba(250, 204, 21, 0.24)';
const GOLD_BORDER = 'rgba(250, 204, 21, 0.60)';
const DETAIL_HEADER_GRADIENT = ['#273756', '#101623'];
const DETAIL_METRIC_GRADIENT = ['rgba(62, 92, 149, 0.42)', 'rgba(18, 25, 38, 0.65)'];
const SHEET_HANDLE_GRADIENT = ['#303E5B', '#111926'];
const SHEET_HANDLE_GRADIENT_ACTIVE = ['#47619A', '#1A2438'];

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
        borderTopLeftRadius: scaledSize(24),
        borderTopRightRadius: scaledSize(24),
    },
    grabber: {
        alignSelf: "center",
        width: scaledSize(44),
        height: scaledSize(5),
        borderRadius: scaledSize(3),
        backgroundColor: "#D0D7E2",
        opacity: 0.8,
        marginTop: scaledSize(10),
        marginBottom: scaledSize(8),
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaledSize(22), // a little more horizontal padding
        paddingTop: scaledSize(8),
        marginBottom: scaledSize(8),
        justifyContent: "space-between",
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
    handle: {
        fontSize: scaleSize(17),
        fontFamily: "Outfit_600SemiBold",
        color: COLORS.text,
        letterSpacing: 0.2,
    },
    subHandle: {
        marginTop: scaledSize(2),
        fontSize: scaleSize(11.5),
        fontFamily: "Outfit_400Regular",
        color: COLORS.subtext,
    },

    // OVR pill
    ovrGlowWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
    ovrGlow: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: scaledSize(999),
        backgroundColor: 'transparent',
        shadowColor: '#FFFFFF',
        shadowOpacity: 0.42,
        shadowRadius: scaledSize(12),
        shadowOffset: { width: 0, height: 0 },
    },
    scorePill: {
        flexDirection: "row",
        alignItems: "baseline",
        paddingHorizontal: scaledSize(12),
        paddingVertical: scaledSize(7),
        borderRadius: scaledSize(999),
        borderWidth: scaleSize(1),
        borderColor: COLORS.hairline,
        backgroundColor: "rgba(255,255,255,0.06)",
        // Soft white glow around the pill
        shadowColor: '#FFFFFF',
        shadowOpacity: 0.28,
        shadowRadius: scaledSize(10),
        shadowOffset: { width: 0, height: 0 },
    },
    ovrRow: { flexDirection: 'row', alignItems: 'baseline' },
    scorePillLabel: {
        fontSize: scaleSize(11.5),
        fontFamily: "Outfit_600SemiBold",
        color: COLORS.subtext,
        marginRight: scaledSize(6),
        letterSpacing: 1,
    },
    scorePillValue: {
        fontSize: scaleSize(16),
        fontFamily: "Outfit_700Bold",
        color: COLORS.accent,
        letterSpacing: 0.2,
    },
    scorePillPrev: {
        fontSize: scaleSize(16),
        fontFamily: 'Outfit_700Bold',
        color: '#94A3B8',
        letterSpacing: 0.2,
    },
    scorePillArrow: {
        fontSize: scaleSize(16),
        fontFamily: 'Outfit_700Bold',
        color: '#94A3B8',
        letterSpacing: 0.2,
    },
    scorePillNew: {
        fontSize: scaleSize(17.5),
        fontFamily: 'Outfit_800ExtraBold',
        color: '#F2B84B',
        letterSpacing: 0.2,
    },

    scrollview: { flex: 1 },
    scrollContent: {
        paddingHorizontal: scaledSize(17), // a touch more
        paddingBottom: scaledSize(10),
    },

    // Hexagon wrapper (no card background)
    hexWrap: {
        paddingTop: scaledSize(26),
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
    accentBar: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        // Slightly wider for better visibility without overpowering
        width: scaledSize(5),
        borderTopLeftRadius: scaledSize(16),
        borderBottomLeftRadius: scaledSize(16),
    },

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
    cardChevronColumnLeft: {
        alignItems: 'flex-start',
        marginRight: scaledSize(12),
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
    detailHeaderCard: {
        borderRadius: 0,
        paddingHorizontal: scaledSize(18),
        paddingVertical: scaledSize(10),
        borderWidth: 0,
        shadowColor: 'transparent',
        overflow: 'hidden',
    },
    detailHeaderTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: scaledSize(34),
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
    detailOneRmPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scaledSize(9),
        paddingVertical: scaledSize(3),
        borderRadius: scaledSize(10),
        backgroundColor: 'rgba(250, 204, 21, 0.12)',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(250, 204, 21, 0.35)',
    },
    detailOneRmLabel: {
        fontSize: scaleSize(9.5),
        fontFamily: 'Outfit_600SemiBold',
        color: '#d6c87a',
        marginRight: scaledSize(3),
        letterSpacing: 0.4,
    },
    detailOneRmValue: {
        fontSize: scaleSize(14),
        fontFamily: 'Nunito_800ExtraBold',
        color: GOLD,
    },
    detailMetricsRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
        marginTop: scaledSize(8),
        borderRadius: scaledSize(12),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(115, 189, 255, 0.24)',
        overflow: 'hidden',
        backgroundColor: 'rgba(12, 20, 32, 0.6)',
    },
    detailMetric: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: scaledSize(6),
        paddingHorizontal: scaledSize(8),
        minWidth: 0,
    },
    detailMetricLabel: {
        marginTop: scaledSize(4),
        fontSize: scaleSize(9),
        fontFamily: 'Outfit_600SemiBold',
        color: 'rgba(205, 219, 255, 0.65)',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    detailMetricValue: {
        fontSize: scaleSize(15),
        fontFamily: 'Outfit_700Bold',
        color: '#E3EEFF',
        letterSpacing: 0.12,
        textShadowColor: 'rgba(15, 24, 38, 0.35)',
        textShadowOffset: { width: 0, height: scaleSize(1) },
        textShadowRadius: scaleSize(2),
    },
    detailMetricDivider: {
        width: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(110, 184, 255, 0.16)',
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
    GOLD,
    GOLD_BG,
    GOLD_BORDER,
    styles,
    DETAIL_HEADER_GRADIENT,
    DETAIL_METRIC_GRADIENT,
    SHEET_HANDLE_GRADIENT,
    SHEET_HANDLE_GRADIENT_ACTIVE,
};

export default styles;
