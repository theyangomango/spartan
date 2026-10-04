// Sizing metrics and the StyleSheet shared by the feed header and its sub-components.
import { StyleSheet, Dimensions, Platform } from "react-native";
import { getFeedHeaderStyles } from "../../helper/getFeedHeaderStyles";
import theme from "../../theme/mfpDark";
import scaleSize, { ts, scaleWidth375 } from "../../helper/scaleSize";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const dynamicStyles = getFeedHeaderStyles(SCREEN_WIDTH, SCREEN_HEIGHT);

// Unified sizing metrics (reduces magic numbers)
const METRICS = (() => {
    const paddingH = dynamicStyles.paddingHorizontal;
    const paddingTop = scaleWidth375(0);
    const paddingBottom = scaleWidth375(4);
    const centerH = scaleWidth375(46);
    // Remove the extra top margin so the header sits flush with other screens
    const marginTop = 0;
    const logoPadTop = Math.max(0, scaleWidth375(0.5)); // visual alignment
    return { paddingH, paddingTop, paddingBottom, centerH, marginTop, logoPadTop };
})();

/* -------------------------------- Styles ------------------------------- */
const styles = StyleSheet.create({
    main_ctnr: {
        width: "100%",
        backgroundColor: theme.bg,
        flexDirection: "row",
        justifyContent: "center",
        paddingTop: METRICS.paddingTop,
        paddingBottom: METRICS.paddingBottom,
        alignItems: "center",
        paddingHorizontal: METRICS.paddingH,
        marginTop: METRICS.marginTop,
    },

    leftArea: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        height: METRICS.centerH,
        position: "relative",
    },

    centerArea: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        height: METRICS.centerH,
        position: "relative",
    },

    centerSlot: { paddingBottom: scaleSize(3.5), paddingHorizontal: scaleSize(scaleWidth375(14)), height: "100%", minWidth: scaleSize(scaleWidth375(156)), alignItems: "center", justifyContent: "center" },

    // Nudge the logo down slightly to align with side icons
    logoWrap: { height: "100%", flexDirection: "row", alignItems: "center", paddingTop: METRICS.logoPadTop },
    titleWrap: { height: "100%", alignItems: "center", justifyContent: "center" },
    logo_image_ctnr: { justifyContent: "center", alignItems: "center" },
    logo_image: { width: scaleSize(scaleWidth375(26.5)), height: scaleSize(scaleWidth375(26.5)) },
    logo_text: {
        paddingLeft: scaleSize(scaleWidth375(4)),
        fontFamily: "Inter_600SemiBold",
        fontSize: scaleSize(16),
        color: theme.textPrimary,
        includeFontPadding: false,
        ...Platform.select({ android: { lineHeight: scaleSize(scaleWidth375(19)) } }),
    },
    center_title_text_feed: {
        fontFamily: "Outfit_600SemiBold",
        letterSpacing: 0.35,
        fontSize: scaleSize(18),
        color: theme.textPrimary,
        includeFontPadding: false,
    },
    center_title_text_workout: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(17),
        color: theme.textPrimary,
        includeFontPadding: false,
    },
    scopeSelector: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scaleSize(scaleWidth375(6)),
        paddingVertical: scaleSize(scaleWidth375(3)),
        borderRadius: scaleSize(scaleWidth375(14)),
    },
    scopeSelectorIcon: {
        marginRight: scaleSize(scaleWidth375(4)),
        marginTop: scaleSize(2),
        fontWeight: "700",
    },
    scopeSelectorLabel: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(17),
        color: theme.textPrimary,
        includeFontPadding: false,
    },
    scopeModalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-start",
        alignItems: "center",
        paddingTop: scaleSize(scaleWidth375(84)),
        paddingHorizontal: scaleSize(18),
    },
    scopeModalCard: {
        width: "100%",
        maxWidth: scaleSize(240),
        borderRadius: scaleSize(scaleWidth375(18)),
        backgroundColor: theme.surface,
        padding: scaleSize(scaleWidth375(8)),
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: scaleSize(scaleWidth375(12)),
        shadowOffset: { width: 0, height: scaleSize(6) },
        elevation: 6,
    },
    scopeOption: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: scaleSize(14),
        paddingVertical: scaleSize(10),
        borderRadius: scaleSize(12),
        marginBottom: scaleSize(4),
    },
    scopeOptionLast: {
        marginBottom: 0,
    },
    scopeOptionActive: {
        backgroundColor: theme.field,
    },
    scopeOptionLabel: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(15),
        color: theme.textPrimary,
    },
    scopeOptionLabelActive: {
        fontFamily: "Outfit_700Bold",
        color: theme.primary,
    },

    right_icons: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        height: METRICS.centerH,
        position: "relative",
    },

    notificationBadge: { position: "absolute", right: scaleSize(-7.5), top: scaleSize(-5), backgroundColor: "#ef4444", borderRadius: scaleSize(8), width: scaleSize(16), height: scaleSize(16), justifyContent: "center", alignItems: "center" },
    notificationText: { color: "#fff", fontSize: scaleSize(8), fontFamily: "Outfit_600SemiBold" },
    message_button: { padding: scaleSize(1) },
    notification_button: { padding: scaleSize(1), position: "relative" },

    feedFlameButton: {
        marginLeft: scaleSize(19),
        padding: scaleSize(6),
        borderRadius: scaleSize((dynamicStyles.iconSize + 6) / 2),
        alignItems: "center",
        justifyContent: "center",
    },
    feedFlameIcon: {
        marginLeft: 0,
    },
    searchIconBtn: {
        width: scaleSize(dynamicStyles.iconSize + 6),
        height: scaleSize(dynamicStyles.iconSize + 6),
        borderRadius: scaleSize((dynamicStyles.iconSize + 6) / 2),
        alignItems: "center",
        justifyContent: "center",
    },
});

export { METRICS, dynamicStyles };
export default styles;
