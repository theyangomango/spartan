// Styles for the MuscleGroupExercises screen.
import { StyleSheet } from "react-native";

import { scaleSize, ts } from "../../components/2_Competition/layoutConstants";
import theme from "../../theme/mfpDark";

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    container: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(16),
        paddingVertical: scaleSize(14),
        backgroundColor: theme.bg,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.08)",
    },
    backButton: {
        width: scaleSize(36),
        height: scaleSize(36),
        alignItems: "center",
        justifyContent: "center",
    },
    headerHandle: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    headerBadge: {
        width: scaleSize(44),
        height: scaleSize(44),
        borderRadius: scaleSize(22),
        backgroundColor: "rgba(89, 169, 255, 0.12)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: scaleSize(10),
        overflow: "hidden",
    },
    headerBadgeInner: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    headerLabel: {
        fontFamily: "Outfit_700Bold",
        fontSize: ts(16),
        color: theme.textPrimary ?? "#F6F8FF",
    },
    headerSpacer: {
        width: scaleSize(36),
        height: scaleSize(36),
    },
    listContent: {
        paddingHorizontal: 0,
        paddingVertical: scaleSize(12),
    },
    exerciseCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: theme.bg,
        borderRadius: scaleSize(14),
        paddingHorizontal: scaleSize(14),
        paddingVertical: scaleSize(12),
        shadowColor: "rgba(0,0,0,0.35)",
        shadowOpacity: 0.5,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
        elevation: 6,
    },
    exerciseLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginRight: scaleSize(12),
    },
    exerciseImageWrap: {
        width: scaleSize(50),
        height: scaleSize(50),
        borderRadius: scaleSize(12),
        backgroundColor: "transparent",
        alignItems: "center",
        justifyContent: "center",
        marginRight: scaleSize(10),
        overflow: "hidden",
    },
    exerciseImage: {
        backgroundColor: "transparent",
    },
    exerciseText: {
        flex: 1,
    },
    exerciseTitle: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: ts(12),
        color: theme.textPrimary ?? "#F6F8FF",
        marginBottom: scaleSize(4),
    },
    exerciseSub: {
        fontFamily: "Outfit_700Bold",
        fontSize: ts(11),
        color: "rgba(216,226,255,0.64)",
    },
    waveWrap: {
        justifyContent: "center",
        alignItems: "flex-end",
    },
    separator: {
        height: scaleSize(6),
    },
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scaleSize(32),
        paddingTop: scaleSize(60),
    },
    emptyTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: ts(16),
        color: theme.textPrimary ?? "#F6F8FF",
        marginBottom: scaleSize(6),
    },
    emptySubtitle: {
        fontFamily: "Outfit_500Medium",
        fontSize: ts(13),
        color: "rgba(216,226,255,0.68)",
        textAlign: "center",
        lineHeight: ts(18),
    },
});

export default styles;
