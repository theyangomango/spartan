// StyleSheet and colour aliases of the Chat screen.
import { StyleSheet } from "react-native";

import theme from "../theme/mfpDark";
import scaleSize from "../helper/scaleSize";

export const COLORS = { hairline: theme.hairline, bg: theme.bg, text: theme.textPrimary, subtext: theme.textSecondary, field: theme.field };

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: COLORS.bg },
    container: { flex: 1, backgroundColor: COLORS.bg },
    surface: {
        flex: 1,
        backgroundColor: COLORS.bg,
        borderTopColor: COLORS.hairline,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    list: { flex: 1 },
    uploadOverlay: {
        position: "absolute",
        right: scaleSize(16),
        bottom: scaleSize(80),
        paddingVertical: scaleSize(8),
        paddingHorizontal: scaleSize(10),
        borderRadius: scaleSize(12),
        // dim using a tone close to theme.bg, with alpha
        backgroundColor: "rgba(24,27,40,0.75)",
    },
    blockedBanner: {
        paddingHorizontal: scaleSize(16),
        paddingVertical: scaleSize(8),
        backgroundColor: "rgba(255, 95, 95, 0.15)",
        borderRadius: scaleSize(10),
        marginHorizontal: scaleSize(12),
        marginBottom: scaleSize(6),
    },
    blockedBannerText: {
        color: COLORS.subtext,
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12),
        textAlign: "center",
    },

    // date chip styles (same sleek vibe)
    dateWrap: { width: "100%", alignItems: "center", paddingVertical: scaleSize(10) },
    dateChip: {
        paddingHorizontal: scaleSize(10),
        paddingVertical: scaleSize(6),
        backgroundColor: COLORS.field,
        borderRadius: scaleSize(14),
        borderWidth: scaleSize(1),
        borderColor: COLORS.hairline,
    },
    dateText: {
        color: COLORS.subtext,
        fontSize: scaleSize(12),
        fontFamily: "Outfit_500Medium",
        letterSpacing: 0.2,
    },
});

export default styles;
