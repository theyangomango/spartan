// StyleSheet of the Messages (conversation list) screen.
import { StyleSheet } from "react-native";

import theme from "../theme/mfpDark";
import scaleSize from "../helper/scaleSize";

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    cardsContainer: {
        flex: 1,
    },
    cardsScrollView: {
        marginTop: scaleSize(6),
    },
    cardsContent: {
        paddingBottom: scaleSize(18),
    },
    emptyStateContainer: {
        paddingVertical: scaleSize(60),
        paddingHorizontal: scaleSize(24),
        alignItems: "center",
        gap: scaleSize(10),
    },
    emptyStateTitle: {
        color: theme.textPrimary,
        fontSize: scaleSize(18),
        fontFamily: "Outfit_600SemiBold",
        marginBottom: scaleSize(8),
        textAlign: "center",
    },
    emptyStateSubtitle: {
        color: theme.textSecondary,
        fontSize: scaleSize(14),
        fontFamily: "Outfit_400Regular",
        textAlign: "center",
    },
    emptyStateLoadingLabel: {
        color: theme.textSecondary,
        fontSize: scaleSize(13),
        fontFamily: "Outfit_400Regular",
        textAlign: "center",
    },
});

export default styles;
