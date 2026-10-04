// Styles of the ExerciseDetail screen, its About and History tabs and its chart pointer labels.
import { StyleSheet } from 'react-native';

import theme from '../../theme/mfpDark';
import { scaleSize, ts } from '../../components/2_Competition/layoutConstants';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    safeTop: {
        backgroundColor: theme.bg,
    },
    safeArea: {
        flex: 1,
        backgroundColor: theme.bg,
        paddingTop: scaleSize(8),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scaleSize(18),
        paddingBottom: scaleSize(16),
    },
    backButton: {
        width: scaleSize(44),
        height: scaleSize(36),
        borderRadius: scaleSize(18),
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        fontFamily: 'Outfit_700Bold',
        fontSize: ts(14),
        color: theme.textPrimary,
        textAlign: 'center',
        marginHorizontal: scaleSize(10),
    },
    headerSideSpacer: {
        width: scaleSize(44),
        height: scaleSize(36),
    },
    tabBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: scaleSize(18),
        paddingBottom: scaleSize(10),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.12)',
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
    },
    tabLabel: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: ts(13),
        color: 'rgba(255,255,255,0.4)',
    },
    tabLabelActive: {
        color: 'rgba(255,255,255,0.95)',
    },
    tabIndicator: {
        height: scaleSize(3),
        backgroundColor: 'transparent',
        borderRadius: scaleSize(999),
        marginTop: scaleSize(6),
        width: '55%',
    },
    tabIndicatorActive: {
        backgroundColor: 'rgba(34, 61, 100, 0.9)',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 0,
    },
    sectionSpacing: {
        paddingTop: scaleSize(18),
        paddingHorizontal: scaleSize(12),
    },
    heroCard: {
        backgroundColor: theme.surface,
        borderRadius: scaleSize(26),
        overflow: 'hidden',
        padding: scaleSize(18),
        alignItems: 'center',
        marginBottom: scaleSize(18),
    },
    heroImageWrapper: {
        width: '100%',
        height: scaleSize(260),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.fieldDeep,
        borderRadius: scaleSize(22),
        paddingVertical: scaleSize(20),
        paddingHorizontal: scaleSize(12),
        overflow: 'hidden',
    },
    heroImagePreview: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroImage: {
        width: '92%',
        height: '92%',
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: scaleSize(18),
    },
    metaItem: {
        flex: 1,
        padding: scaleSize(14),
        backgroundColor: theme.surface,
        borderRadius: scaleSize(18),
    },
    metaItemLeft: {
        marginRight: scaleSize(10),
    },
    metaItemRight: {
        marginLeft: scaleSize(10),
    },
    metaLabel: {
        fontFamily: 'Outfit_500Medium',
        fontSize: ts(12),
        color: theme.textSecondary,
        marginBottom: scaleSize(6),
    },
    metaValue: {
        fontFamily: 'Outfit_700Bold',
        fontSize: ts(15),
        color: theme.textPrimary,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: scaleSize(20),
        paddingVertical: scaleSize(10),
        paddingHorizontal: scaleSize(18),
        marginBottom: scaleSize(14),
    },
    shareButton: {
        backgroundColor: '#E2EDFF',
        borderWidth: 0,
        shadowColor: '#000000',
        shadowOpacity: 0.12,
        shadowRadius: scaleSize(8),
        shadowOffset: { width: 0, height: scaleSize(4) },
        elevation: 3,
    },
    actionIcon: {
        width: scaleSize(30),
        height: scaleSize(30),
        borderRadius: scaleSize(15),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scaleSize(10),
    },
    shareIcon: {
        backgroundColor: 'rgba(9,9,9,0.08)',
    },
    favoriteIconActive: {
        backgroundColor: 'rgba(45, 158, 255, 0.22)',
    },
    shareText: {
        flex: 1,
        fontFamily: 'Outfit_700Bold',
        fontSize: ts(13),
        color: theme.surface,
        textAlign: 'center',
    },
    actionIconSpacer: {
        width: scaleSize(30),
        height: scaleSize(30),
        marginLeft: scaleSize(10),
        opacity: 0,
    },
    howToBlock: {
        backgroundColor: theme.surface,
        borderRadius: scaleSize(20),
        padding: scaleSize(18),
        marginBottom: scaleSize(20),
    },
    howToTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: ts(15),
        color: theme.textPrimary,
        marginBottom: scaleSize(12),
    },
    howToRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: scaleSize(10),
    },
    howToRowLast: {
        marginBottom: 0,
    },
    howToIndex: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: ts(13),
        color: theme.textPrimary,
        marginRight: scaleSize(10),
        lineHeight: ts(18),
    },
    howToText: {
        flex: 1,
        fontFamily: 'Outfit_400Regular',
        fontSize: ts(13),
        color: theme.textSecondary,
        lineHeight: ts(18),
    },
    progressSection: {
        paddingTop: scaleSize(12),
    },
    progressCard: {
        marginBottom: scaleSize(32),
    },
    progressSectionTitle: {
        color: theme.textPrimary,
    },
    progressAutoHintWrapper: {
        alignItems: 'flex-end',
    },
    progressAutoHint: {
        textAlign: 'right',
    },
    progressDeltaIcon: {
        marginRight: scaleSize(2),
        marginBottom: scaleSize(2),
    },
    progressUnit: {
        marginLeft: scaleSize(6),
        marginBottom: scaleSize(4),
        textTransform: 'lowercase',
    },
    progressSummaryText: {
        color: 'rgba(255,255,255,0.55)',
        maxWidth: '50%',
        flexShrink: 1,
        marginLeft: scaleSize(12),
        textAlign: 'right',
        paddingVertical: scaleSize(2),
    },
    progressChartWrapper: {
        justifyContent: 'center',
        alignSelf: 'center',
        overflow: 'visible',
    },
    progressChartContent: {
        flexDirection: 'row',
    },
    progressYAxisLabels: {
        position: 'relative',
        justifyContent: 'center',
    },
    progressYAxisLabel: {
        position: 'absolute',
        right: scaleSize(6),
        textAlign: 'right',
        fontSize: ts(12),
    },
    progressChartCanvas: {
        flex: 1,
        position: 'relative',
    },
    progressXAxisOverlay: {
        position: 'absolute',
        bottom: 0,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    progressXAxisLabel: {
        minWidth: scaleSize(40),
        textAlign: 'center',
    },
    progressPointerLineSpacing: {
        marginTop: scaleSize(4),
    },
    progressPointerTimestampSpacing: {
        marginTop: scaleSize(6),
    },
    metricToggleRowContainer: {
        marginTop: scaleSize(20),
        alignSelf: 'stretch',
    },
    metricToggleRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    metricToggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scaleSize(16),
        paddingVertical: scaleSize(8),
        borderRadius: scaleSize(999),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.22)',
        backgroundColor: 'rgba(12, 18, 28, 0.55)',
        marginRight: scaleSize(10),
        marginBottom: scaleSize(10),
    },
    metricToggleButtonActive: {
        backgroundColor: 'rgba(45, 158, 255, 0.22)',
        borderColor: theme.primary ?? '#2D9EFF',
    },
    metricToggleButtonMuted: {
        opacity: 0.6,
    },
    metricToggleIcon: {
        marginRight: scaleSize(6),
    },
    metricToggleLabel: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: ts(13),
        color: 'rgba(216, 226, 255, 0.78)',
    },
    metricToggleLabelActive: {
        color: theme.textPrimary ?? '#F6F8FF',
    },
    metricToggleLabelMuted: {
        color: 'rgba(216, 226, 255, 0.5)',
    },
    historySection: {
        paddingTop: scaleSize(18),
        paddingHorizontal: scaleSize(12),
    },
    historyCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: scaleSize(20),
        paddingVertical: scaleSize(16),
        paddingHorizontal: scaleSize(16),
        marginBottom: scaleSize(18),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    historyHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scaleSize(14),
        paddingHorizontal: scaleSize(6)
    },
    historyHeaderTextBlock: {
        flex: 1,
    },
    historyTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: ts(15),
        color: theme.textPrimary,
    },
    historySubtitle: {
        marginTop: scaleSize(4),
        fontFamily: 'Outfit_400Regular',
        fontSize: ts(12),
        color: theme.textSecondary,
    },
    historyTableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: scaleSize(8),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.12)',
        marginBottom: scaleSize(4),
    },
    historyTableHeaderText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: ts(11),
        letterSpacing: 0.4,
        color: 'rgba(255,255,255,0.6)',
        textTransform: 'uppercase',
    },
    historySetColumn: {
        width: scaleSize(52),
        alignItems: 'center',
        justifyContent: 'center',
    },
    historyWeightColumn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    historyWeightColumnWithBadge: {
        justifyContent: 'flex-start',
    },
    historyRepsColumn: {
        width: scaleSize(70),
        alignItems: 'center',
        justifyContent: 'center',
    },
    historyCellWithBadge: {
        justifyContent: 'flex-start',
    },
    historyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: scaleSize(10),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    historyRowLast: {
        borderBottomWidth: 0,
        paddingBottom: scaleSize(6),
    },
    historyRowWithBadge: {
        alignItems: 'flex-start',
        paddingTop: scaleSize(6),
        paddingBottom: scaleSize(12),
    },
    historySetValue: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: ts(13),
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
    },
    historyValueText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: ts(14),
        color: theme.textPrimary,
        textAlign: 'center',
    },
    historyBadge: {
        marginTop: scaleSize(4),
        paddingHorizontal: scaleSize(10),
        paddingVertical: scaleSize(4),
        borderRadius: scaleSize(12),
        backgroundColor: 'rgba(255,215,111,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    historyBadgeText: {
        fontFamily: 'Outfit_500Medium',
        fontSize: ts(11),
        color: '#FFD76F',
        textAlign: 'center',
    },
    placeholder: {
        paddingVertical: scaleSize(60),
        paddingHorizontal: scaleSize(18),
        alignItems: 'center',
    },
    placeholderTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: ts(16),
        color: theme.textPrimary,
        marginBottom: scaleSize(10),
        textAlign: 'center',
    },
    placeholderBody: {
        fontFamily: 'Outfit_400Regular',
        fontSize: ts(13),
        color: theme.textSecondary,
        textAlign: 'center',
        lineHeight: ts(18),
    },
});

export default styles;
