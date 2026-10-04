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
        paddingHorizontal: scaleSize(18),
        borderRadius: scaleSize(20),
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.07)",
        backgroundColor: theme.surface,
    },
    questPanelHeader: {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        paddingTop: scaleSize(18),
        paddingBottom: scaleSize(14),
    },
    questPanelEyebrow: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(11),
        color: theme.muted,
        letterSpacing: 1.4,
        textTransform: "uppercase",
        marginBottom: scaleSize(4),
    },
    questPanelTitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(19),
        letterSpacing: 0.2,
    },
    questCountText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(15),
        color: theme.textPrimary,
        fontVariant: ["tabular-nums"],
    },
    questCountTotal: {
        fontFamily: "Outfit_400Regular",
        color: theme.muted,
    },
    questList: {
        paddingBottom: scaleSize(6),
    },
    questListBare: {
        paddingTop: scaleSize(6),
    },
    questRowFirst: {
        borderTopWidth: 0,
    },
    questRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: scaleSize(12),
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: "rgba(255,255,255,0.1)",
    },
    questTitle: {
        flex: 1,
        paddingHorizontal: scaleSize(12),
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(15),
        color: theme.textPrimary,
    },
    questValue: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(15),
        color: theme.textPrimary,
        fontVariant: ["tabular-nums"],
    },
    questValueTarget: {
        fontFamily: "Outfit_400Regular",
        fontSize: scaleSize(15),
        color: theme.muted,
    },
});

export default styles;
