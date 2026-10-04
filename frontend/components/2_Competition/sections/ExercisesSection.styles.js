// Styles for the Ladder tab (ExercisesSection) and its quest panels.
import { StyleSheet } from "react-native";

import theme from "../../../theme/mfpDark";
import { scaleSize } from "../layoutConstants";

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    content: {
        paddingTop: scaleSize(6),
        paddingBottom: scaleSize(140),
    },
    topNoticeText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(13),
        color: "#f5f6ff",
        letterSpacing: 0.3,
        textAlign: "center",
        marginBottom: scaleSize(10),
    },
    firstCard: {
        marginTop: scaleSize(8),
    },
    dimmedCard: {
        opacity: 0.4,
    },
    questPanel: {
        marginTop: scaleSize(14),
        marginBottom: scaleSize(18),
        marginHorizontal: scaleSize(14),
        borderRadius: scaleSize(20),
        borderWidth: 1,
        backgroundColor: theme.surface,
        overflow: "hidden",
    },
    questPanelGlow: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: scaleSize(72),
    },
    questPanelHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: scaleSize(16),
        paddingTop: scaleSize(16),
        paddingBottom: scaleSize(12),
    },
    questPanelEyebrow: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(10.5),
        color: theme.textSecondary,
        letterSpacing: 1.2,
        textTransform: "uppercase",
        marginBottom: scaleSize(3),
    },
    questPanelTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(18),
        color: theme.textPrimary,
    },
    questCountPill: {
        paddingHorizontal: scaleSize(11),
        paddingVertical: scaleSize(5),
        borderRadius: scaleSize(12),
    },
    questCountText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(12),
        fontVariant: ["tabular-nums"],
    },
    questSegments: {
        flexDirection: "row",
        gap: scaleSize(5),
        paddingHorizontal: scaleSize(16),
    },
    questSegment: {
        flex: 1,
        height: scaleSize(4),
        borderRadius: scaleSize(2),
        backgroundColor: "rgba(255,255,255,0.1)",
    },
    questList: {
        padding: scaleSize(10),
        paddingTop: scaleSize(12),
        gap: scaleSize(6),
    },
    questTile: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: scaleSize(7),
        paddingHorizontal: scaleSize(10),
        borderRadius: scaleSize(13),
        backgroundColor: "rgba(255,255,255,0.045)",
    },
    questText: {
        flex: 1,
        paddingHorizontal: scaleSize(10),
    },
    questTitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(14),
        lineHeight: scaleSize(17),
        color: theme.textPrimary,
    },
    questGoal: {
        fontFamily: "Outfit_400Regular",
        fontSize: scaleSize(12),
        lineHeight: scaleSize(15),
        color: theme.textSecondary,
    },
    questValue: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(15),
        color: theme.textPrimary,
        fontVariant: ["tabular-nums"],
    },
    questValueTarget: {
        fontFamily: "Outfit_400Regular",
        fontSize: scaleSize(12),
        color: theme.muted,
    },
});

export default styles;
