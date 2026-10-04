// Styles for the WeightMeasurements screen.
import { StyleSheet } from "react-native";

import { scaleSize, ts } from "../components/2_Competition/layoutConstants";
import theme from "../theme/mfpDark";

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    container: {
        flex: 1,
        paddingTop: scaleSize(12),
        paddingBottom: scaleSize(24),
        backgroundColor: theme.bg,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: scaleSize(20),
        paddingHorizontal: scaleSize(20),
    },
    backButton: {
        width: scaleSize(38),
        height: scaleSize(38),
        borderRadius: scaleSize(19),
        backgroundColor: "transparent",
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitleWrapper: {
        position: "absolute",
        left: scaleSize(20),
        right: scaleSize(20),
        height: scaleSize(38),
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(16),
        color: theme.textPrimary ?? "#F6F8FF",
        textAlign: "center",
    },
    headerAddButton: {
        paddingHorizontal: scaleSize(12),
        paddingVertical: scaleSize(6),
        borderRadius: scaleSize(999),
        backgroundColor: "rgba(45, 158, 255, 0.16)",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(90, 170, 255, 0.45)",
    },
    headerAddLabel: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(12),
        color: theme.primary ?? "#2D9EFF",
    },
    list: {
        flex: 1,
    },
    listContent: {
        paddingBottom: scaleSize(32),
    },
    entryCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: scaleSize(16),
        paddingRight: scaleSize(16),
        paddingLeft: scaleSize(26),
        borderRadius: 0,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.08)",
        backgroundColor: theme.surface,
        marginBottom: 0,
        width: "100%",
    },
    entryInfo: {
        flex: 1,
        marginRight: scaleSize(12),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    entryWeight: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(15),
        color: theme.textPrimary ?? "#F6F8FF",
    },
    entryTimestampWrap: {
        alignItems: "flex-end",
        justifyContent: "center",
        minWidth: scaleSize(110),
    },
    entryDate: {
        fontFamily: "Outfit_500Medium",
        fontSize: ts(11),
        color: "rgba(216, 226, 255, 0.85)",
        textAlign: "right",
    },
    entryTime: {
        marginTop: scaleSize(3),
        fontFamily: "Outfit_400Regular",
        fontSize: ts(10),
        color: "rgba(216, 226, 255, 0.55)",
        textAlign: "right",
    },
    entryActionsContainer: {
        justifyContent: "center",
        alignItems: "flex-end",
        height: "100%",
        width: scaleSize(96),
        backgroundColor: "transparent",
    },
    entryDeleteSwipe: {
        height: "100%",
        width: "100%",
        backgroundColor: "rgba(242,113,113,0.16)",
        alignItems: "center",
        justifyContent: "center",
    },
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyTitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(16),
        color: theme.textPrimary ?? "#F6F8FF",
    },
    emptySubtitle: {
        marginTop: scaleSize(6),
        fontFamily: "Outfit_400Regular",
        fontSize: ts(12),
        color: "rgba(216, 226, 255, 0.7)",
        textAlign: "center",
    },
});

export default styles;
