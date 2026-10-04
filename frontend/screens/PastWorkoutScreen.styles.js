// Styles of the PastWorkout screen, plus the header icon size that the header JSX shares with the sheet.

import { StyleSheet } from "react-native";

import theme from "../theme/mfpDark";
import scaleSize from "../helper/scaleSize";

export const HEADER_ICON_SIZE = scaleSize(20);

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    safeAreaLive: {
        backgroundColor: theme.bg,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(18),
        paddingVertical: scaleSize(12),
    },
    headerLive: {
        backgroundColor: theme.bg,
    },
    headerBackButton: {
        padding: scaleSize(4),
    },
    headerTitle: {
        flex: 1,
        textAlign: "center",
        color: theme.textPrimary,
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(17),
    },
    headerRight: {
        width: HEADER_ICON_SIZE + scaleSize(12),
        alignItems: "flex-end",
    },
    content: {
        paddingBottom: scaleSize(28),
    },
    contentLive: {
        backgroundColor: "transparent",
    },
    detailSection: {
        paddingVertical: scaleSize(14),
        backgroundColor: theme.surface,
    },
    detailSectionLive: {
        backgroundColor: theme.surface,
    },
    sectionHeader: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.hairline,
        paddingBottom: scaleSize(12),
        marginBottom: scaleSize(6),
    },
    sectionHeaderLive: {
        borderBottomColor: theme.hairline,
    },
    sectionTop: {
        paddingHorizontal: scaleSize(18),
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        marginLeft: scaleSize(8),
    },
    avatarWrap: {
        width: scaleSize(34),
        aspectRatio: 1,
        borderRadius: scaleSize(23),
        overflow: "hidden",
        marginRight: scaleSize(10),
    },
    avatar: {
        width: "100%",
        height: "100%",
        borderRadius: scaleSize(23),
        backgroundColor: theme.field,
    },
    avatarFallback: {
        alignItems: "center",
        justifyContent: "center",
    },
    avatarInitials: {
        color: theme.textPrimary,
        fontFamily: "Poppins_600SemiBold",
        fontSize: scaleSize(15),
    },
    headerTextCol: {
        flex: 1,
        minWidth: 0,
    },
    namePressable: {
        flexShrink: 1,
    },
    nameHandle: {
        flexDirection: "row",
        alignItems: "center",
        flexShrink: 1,
    },
    nameText: {
        color: theme.textPrimary,
        fontFamily: "Poppins_700Bold",
        fontSize: scaleSize(13),
    },
    timestampText: {
        color: theme.textSecondary,
        fontFamily: "Outfit_400Regular",
        fontSize: scaleSize(11.5),
        marginTop: scaleSize(2),
    },
    timestampLiveText: {
        color: "#FF8596",
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(11.5),
        marginTop: scaleSize(2),
    },
    moreButton: {
        paddingHorizontal: scaleSize(4),
        paddingVertical: scaleSize(4),
    },
    cheerButton: {
        paddingHorizontal: scaleSize(12),
        paddingVertical: scaleSize(4),
        borderRadius: scaleSize(12),
        backgroundColor: "rgba(255,77,103,0.18)",
        marginRight: scaleSize(8),
    },
    cheerButtonText: {
        color: "#FF8596",
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(10.5),
        letterSpacing: 0.4,
        textTransform: "uppercase",
    },
    titleBlock: {
        marginTop: scaleSize(12),
        paddingBottom: scaleSize(5),
    },
    titleText: {
        color: theme.textPrimary,
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(13),
    },
    workoutTitleText: {
        color: "#74abf7ff",
    },
    captionText: {
        color: theme.textPrimary,
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(13),
        marginTop: scaleSize(4),
    },
    metricsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: scaleSize(10),
        marginLeft: scaleSize(30),
        marginRight: scaleSize(20),
        alignItems: "center",
    },
    metricsFigures: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        flex: 1.8,
        paddingLeft: 0,
    },
    metricsFigureSlot: {
        flex: 1,
        maxWidth: "94%",
        height: scaleSize(240),
        alignItems: "center",
        justifyContent: "center",
    },
    metricsFigureFront: {
        marginRight: scaleSize(20),
    },
    metricsFigureBack: {
        marginLeft: scaleSize(20),
    },
    metricsFigure: {
        width: "125%",
        height: "125%",
    },
    metricsColumnStack: {
        flex: 0.65,
        alignSelf: "stretch",
        justifyContent: "space-between",
        paddingBottom: scaleSize(10),
    },
    metricTopStack: {
        width: "100%",
        gap: scaleSize(10),
    },
    metricStackRow: {
        alignSelf: "stretch",
        marginBottom: scaleSize(10),
        alignItems: "flex-end",
    },
    metricStackRowLast: {
        marginBottom: 0,
    },
    metricLabel: {
        color: "rgba(255,255,255,0.58)",
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(11),
        letterSpacing: 0.2,
        paddingBottom: scaleSize(1.5),
        textAlign: "right",
    },
    metricLabelRight: {
        textAlign: "right",
    },
    metricLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingBottom: scaleSize(1.5),
        alignSelf: "stretch",
        justifyContent: "flex-end",
    },
    metricLiveDot: {
        width: scaleSize(6.5),
        height: scaleSize(6.5),
        borderRadius: scaleSize(3.25),
        backgroundColor: "#FF4D67",
        marginRight: scaleSize(6),
        shadowColor: "#FF4D67",
        shadowOpacity: 0.35,
        shadowRadius: scaleSize(6),
        shadowOffset: { width: 0, height: 0 },
    },
    metricValue: {
        color: theme.textPrimary,
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(14),
        textAlign: "right",
    },
    metricValueRight: {
        textAlign: "right",
    },
    metricValueRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    metricValueRowRight: {
        justifyContent: "flex-end",
    },
    metricInfoIcon: {
        marginLeft: scaleSize(6),
        padding: scaleSize(2),
    },
    recordsValueRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    recordsValueText: {
        marginLeft: scaleSize(6),
    },
    noExercisesText: {
        paddingHorizontal: scaleSize(18),
        paddingVertical: scaleSize(14),
        color: theme.textSecondary,
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12.5),
    },
    emptyState: {
        marginHorizontal: scaleSize(16),
        marginVertical: scaleSize(24),
        padding: scaleSize(18),
        borderRadius: scaleSize(14),
        backgroundColor: theme.surface,
    },
    emptyStateTitle: {
        color: theme.textPrimary,
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(17),
        marginBottom: scaleSize(8),
    },
    emptyStateSubtitle: {
        color: theme.textSecondary,
        fontFamily: "Outfit_400Regular",
        fontSize: scaleSize(14),
    },
});

export default styles;
