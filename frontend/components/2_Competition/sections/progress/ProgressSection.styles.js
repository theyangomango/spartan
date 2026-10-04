// StyleSheet of the Progress tab: the section itself, its body pager, muscle list and metric toggle.
import { StyleSheet } from "react-native";

import theme from "../../../../theme/mfpDark";
import { scaleSize, ts } from "../../layoutConstants";

const styles = StyleSheet.create({
    scroll: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    container: {
        paddingTop: scaleSize(10),
        paddingBottom: 0,
        backgroundColor: theme.bg,
    },
    metricToggleRowContainer: {
        marginTop: scaleSize(20),
        alignSelf: "stretch",
    },
    metricToggleRow: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    metricToggleButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(16),
        paddingVertical: scaleSize(8),
        borderRadius: scaleSize(999),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.22)",
        backgroundColor: "rgba(12, 18, 28, 0.55)",
        marginRight: scaleSize(10),
        marginBottom: scaleSize(10),
    },
    metricToggleButtonActive: {
        backgroundColor: "rgba(45, 158, 255, 0.22)",
        borderColor: theme.primary ?? "#2D9EFF",
    },
    metricToggleButtonMuted: {
        opacity: 0.6,
    },
    metricToggleIcon: {
        marginRight: scaleSize(6),
    },
    metricToggleLabel: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(13),
        color: "rgba(216, 226, 255, 0.78)",
    },
    metricToggleLabelActive: {
        color: theme.textPrimary ?? "#F6F8FF",
    },
    metricToggleLabelMuted: {
        color: "rgba(216, 226, 255, 0.5)",
    },
    bodyCard: {
        paddingVertical: scaleSize(20),
        paddingHorizontal: scaleSize(18),
        marginBottom: 0,
        backgroundColor: theme.bg,
        minHeight: scaleSize(430),
        justifyContent: "center",
    },
    topPagerCard: {
        borderTopWidth: 0,
        borderBottomWidth: 0,
    },
    bodyFiguresRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: scaleSize(6),
        marginTop: scaleSize(-10),
    },
    muscleList: {
        marginTop: 0,
    },
    topPagerContainer: {
        marginBottom: 0,
        position: "relative",
    },
    bodyLabelOverlayContainer: {
        position: "absolute",
        top: scaleSize(12),
        left: scaleSize(24),
        zIndex: 2,
    },
    bodyLabelOverlay: {
        fontFamily: "Outfit_700Bold",
        fontSize: ts(16),
        color: "#FFFFFF",
    },
    bodyLabelSubtitle: {
        marginTop: scaleSize(2),
        fontFamily: "Outfit_500Medium",
        fontSize: ts(12),
        color: "rgba(255,255,255,0.76)",
    },
    topPagerPage: {
        paddingHorizontal: 0,
        minHeight: scaleSize(420),
    },
    topPagerDots: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: scaleSize(6),
        marginBottom: 0,
        gap: scaleSize(6),
        paddingBottom: 0,
        backgroundColor: theme.bg,
    },
    topPagerDot: {
        width: scaleSize(7),
        height: scaleSize(7),
        borderRadius: scaleSize(4),
        backgroundColor: "rgba(255,255,255,0.25)",
    },
    topPagerDotActive: {
        backgroundColor: "#6DB7FF",
    },
    muscleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: scaleSize(10),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.06)",
    },
    muscleListCard: {
        marginTop: 0,
        paddingTop: scaleSize(6),
        paddingHorizontal: scaleSize(18),
        borderTopWidth: 0,
    },
    muscleLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    muscleLabelColumn: {
        justifyContent: "center",
    },
    muscleRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: scaleSize(12),
    },
    muscleBadge: {
        width: scaleSize(48),
        height: scaleSize(48),
        borderRadius: scaleSize(24),
        backgroundColor: "rgba(89, 169, 255, 0.12)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: scaleSize(11),
        overflow: "hidden",
    },
    muscleIconContainer: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: scaleSize(26),
        overflow: "hidden",
    },
    muscleIconZoom: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    muscleLabel: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(15),
        color: theme.textPrimary ?? "#F6F8FF",
    },
    muscleValue: {
        fontFamily: "Outfit_700Bold",
        fontSize: ts(15),
        color: theme.textPrimary ?? "#F6F8FF",
    },
    muscleLabelOverall: {
        color: "#6DB7FF",
        fontSize: ts(15),
    },
    muscleValueOverall: {
        color: "#6DB7FF",
        fontSize: ts(15),
    },
    hexCard: {
        backgroundColor: theme.bg,
        paddingBottom: scaleSize(16),
        minHeight: scaleSize(430),
    },
    hexGraphWrap: {
        alignItems: "center",
        justifyContent: "center",
        marginTop: scaleSize(40),
        marginBottom: scaleSize(-25),
    },
    ovrPill: {
        position: "absolute",
        top: scaleSize(10),
        right: scaleSize(24),
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(12),
        paddingVertical: scaleSize(8),
        backgroundColor: "rgba(109, 183, 255, 0.14)",
        borderRadius: scaleSize(16),
        zIndex: 2,
    },
    ovrPillLabel: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: ts(11),
        color: "#6DB7FF",
        letterSpacing: 0.4,
        marginRight: scaleSize(6),
    },
    ovrPillValue: {
        fontFamily: "Outfit_700Bold",
        fontSize: ts(15),
        color: theme.textPrimary ?? "#F6F8FF",
    },
    bodyFigureSlot: {
        flex: 1,
        height: scaleSize(440),
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible",
        transform: [{ translateY: scaleSize(46) }],
    },
    bodyFigureSlotFront: {
        marginRight: scaleSize(18),
    },
    bodyFigureSlotBack: {
        marginLeft: scaleSize(18),
    },
    bodyFigure: {
        width: "100%",
        height: "100%",
        transform: [{ translateY: scaleSize(-12) }],
    },
    contentSurface: {
        backgroundColor: theme.bg,
        paddingBottom: scaleSize(130),
    },
    chartDivider: {
        height: scaleSize(12),
        width: "100%",
        backgroundColor: theme.surface,
    },
    card: {
        backgroundColor: theme.bg,
        paddingHorizontal: scaleSize(18)
    },
    weightCard: {
        backgroundColor: theme.bg,
    },
    volumeCard: {
    },
    header: {},
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
    },
    sectionTitle: {
        color: theme.textPrimary ?? "#F6F8FF",
    },
    addButton: {
        paddingHorizontal: scaleSize(12),
        paddingVertical: scaleSize(6),
        backgroundColor: "rgba(45, 158, 255, 0.16)",
        borderRadius: scaleSize(999),
    },
    addButtonLabel: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(12),
        color: theme.primary ?? "#2D9EFF",
    },
    metricsRow: {},
    weightGroup: {},
    deltaGroup: {
        paddingBottom: scaleSize(3),
    },
    deltaIcon: {
        marginRight: scaleSize(4),
        marginBottom: scaleSize(2),
    },
    weightUnit: {
        color: theme.textPrimary ?? "#F6F8FF",
        marginLeft: scaleSize(6),
        marginBottom: scaleSize(4),
        textTransform: "lowercase",
    },
    summaryText: {
        color: "rgba(255,255,255,0.55)",
        maxWidth: "50%",
        flexShrink: 1,
        marginLeft: scaleSize(12),
        textAlign: "right",
        paddingVertical: scaleSize(2)
    },
    autoUpdateHintWrapper: {
        alignItems: "flex-end",
    },
    autoUpdateHint: {
        color: "rgba(216, 226, 255, 0.55)",
    },
    chartWrapper: {
        justifyContent: "center",
        alignSelf: "center",
        overflow: "visible",
    },
    chartContent: {
        flexDirection: "row",
    },
    yAxisLabelsContainer: {
        position: "relative",
        justifyContent: "center",
    },
    yAxisLabel: {
        position: "absolute",
        right: scaleSize(6),
        textAlign: "right",
        fontSize: ts(12),
    },
    xAxisLabelsOverlay: {
        position: "absolute",
        bottom: 0,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    xAxisLabel: {
        minWidth: scaleSize(40),
        textAlign: "center",
    },
    chartCanvas: {
        flex: 1,
        position: "relative",
    },
    chartEmptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    measurementsRowContainer: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.08)",
    },
    measurementsRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: scaleSize(20),
        paddingRight: scaleSize(8),
        paddingLeft: scaleSize(12),
        borderRadius: scaleSize(14),
    },
    measurementsRowPressed: {
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: scaleSize(14),
    },
    measurementsTextWrap: {
        flex: 1,
    },
    measurementsTitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(14),
        color: theme.textPrimary ?? "#F6F8FF",
    },
    measurementsSubtitle: {
        marginTop: scaleSize(2),
        fontFamily: "Outfit_400Regular",
        fontSize: ts(11),
        color: "rgba(216, 226, 255, 0.72)",
    },
    measurementsChevron: {
        marginLeft: scaleSize(12),
    },
    placeholderText: {
        fontFamily: "Outfit_500Medium",
        fontSize: ts(13),
        color: "rgba(255,255,255,0.55)",
    },
});

export default styles;
