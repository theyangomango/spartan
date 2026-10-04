// Styles of the stats preview: the body / hexagon pager and the Volume / Reps / PRs chart card.
import { StyleSheet } from "react-native";

import theme from "../../../theme/mfpDark";
import { scaleSize, DEVICE_WIDTH, ts } from "../layoutConstants";

const PREVIEW_HORIZONTAL_PAD = scaleSize(17);

const styles = StyleSheet.create({
    previewContainer: {
        alignSelf: "center",
        width: DEVICE_WIDTH,
        marginBottom: scaleSize(12),
        marginHorizontal: -PREVIEW_HORIZONTAL_PAD,
    },
    topPagerContainer: {
        marginBottom: 0,
        position: "relative",
    },
    surfaceGap: {
        height: scaleSize(14),
        width: "100%",
        backgroundColor: theme.surface,
    },
    pagerContent: {
        paddingHorizontal: 0,
    },
    topPagerPage: {
        paddingHorizontal: 0,
        minHeight: scaleSize(420),
    },
    topPagerDots: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: scaleSize(2),
        gap: scaleSize(6),
        paddingBottom: scaleSize(12),
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
    card: {
        backgroundColor: theme.bg,
        paddingHorizontal: scaleSize(18),
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerActions: {
        alignItems: "flex-end",
    },
    autoUpdateHintWrapper: {
        alignItems: "flex-end",
    },
    autoUpdateHint: {
        color: "rgba(216, 226, 255, 0.55)",
    },
    sectionTitle: {
        color: theme.textPrimary,
    },
    summaryRow: {
        alignItems: "center",
        paddingHorizontal: 0,
        paddingVertical: scaleSize(4),
    },
    summaryValueWrap: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: scaleSize(6),
    },
    summaryUnit: {
        color: "rgba(255,255,255,0.7)",
    },
    summaryInfo: {
        color: "rgba(255,255,255,0.55)",
        maxWidth: "50%",
        flexShrink: 1,
        marginLeft: scaleSize(12),
        textAlign: "right",
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
    chartCanvas: {
        flex: 1,
        position: "relative",
    },
    pointerBubbleDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: "rgba(255,255,255,0.08)",
        marginTop: scaleSize(10),
        marginBottom: scaleSize(6),
    },
    pointerBubbleLineSpacing: {
        marginTop: scaleSize(4),
    },
    pointerBubbleTimestampSpacing: {
        marginTop: scaleSize(2),
    },
    xAxisLabelsOverlay: {
        position: "absolute",
        bottom: 0,
        flexDirection: "row",
        alignItems: "flex-start",
    },
    xAxisLabel: {
        minWidth: scaleSize(40),
        textAlign: "center",
        color: "rgba(255,255,255,0.65)",
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(11),
    },
    chartEmptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    placeholderText: {
        color: "rgba(255,255,255,0.55)",
        fontFamily: "Outfit_600SemiBold",
    },
    bodyCard: {
        paddingVertical: scaleSize(20),
        paddingHorizontal: scaleSize(18),
        marginBottom: 0,
        backgroundColor: theme.bg,
        minHeight: scaleSize(430),
        justifyContent: "center",
        borderTopWidth: 0,
        borderBottomWidth: 0,
    },
    bodyFiguresRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        alignItems: "center",
        paddingHorizontal: scaleSize(6),
        marginTop: scaleSize(-34),
    },
    bodyFigureSlot: {
        flex: 1,
        height: scaleSize(440),
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible",
        transform: [{ translateY: scaleSize(18) }],
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
    },
    hexCard: {
        backgroundColor: theme.bg,
        paddingBottom: scaleSize(16),
        minHeight: scaleSize(430),
        alignItems: "center",
        justifyContent: "center",
        borderTopWidth: 0,
        borderBottomWidth: 0,
    },
    hexGraphWrap: {
        alignItems: "center",
        justifyContent: "center",
        marginTop: scaleSize(-14),
        marginBottom: scaleSize(-18),
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
        fontSize: scaleSize(13),
        color: "rgba(216, 226, 255, 0.78)",
    },
    metricToggleLabelActive: {
        color: theme.textPrimary ?? "#F6F8FF",
    },
    metricToggleLabelMuted: {
        color: "rgba(216, 226, 255, 0.5)",
    },
});

export default styles;
