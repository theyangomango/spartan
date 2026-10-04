// StyleSheet of MessageItem and MediaTile, plus the bubble width limit they share.
import { StyleSheet, Dimensions } from "react-native";

import theme from "../../theme/mfpDark";
import scaleSize, { ts } from "../../helper/scaleSize";

const W = Dimensions.get("window").width;
export const BUBBLE_MAX_W = Math.min(360, W * 0.72);

const styles = StyleSheet.create({
    row: { width: "100%", paddingHorizontal: scaleSize(4), marginBottom: scaleSize(6), position: 'relative', overflow: 'visible' },
    rowSelf: { alignItems: "flex-end" },
    rowOther: { alignItems: "flex-start" },
    hRow: { flexDirection: "row", alignItems: "center" },
    avatarSlot: { width: scaleSize(28), marginRight: scaleSize(8), alignItems: 'flex-start' },
    avatar: { width: scaleSize(24), height: scaleSize(24), borderRadius: scaleSize(12), backgroundColor: theme.field },
    avatarFallback: { backgroundColor: theme.field },
    wrap: { position: "relative", overflow: 'visible' },

    bubble: { borderRadius: scaleSize(18), paddingHorizontal: scaleSize(12), paddingVertical: scaleSize(8), position: "relative" },
    bubbleSelf: {
        backgroundColor: theme.primary,
        shadowColor: theme.primary,
        shadowOpacity: 0.18,
        shadowRadius: scaleSize(10),
        shadowOffset: { width: 0, height: scaleSize(4) },
        elevation: 2,
    },
    bubbleOther: {
        backgroundColor: theme.surface,
        borderWidth: scaleSize(1),
        borderColor: theme.hairline,
        position: "relative",
    },

    mediaOnly: { borderRadius: scaleSize(12), overflow: "visible", position: "relative" },

    groupSelf: { borderBottomRightRadius: scaleSize(7) },
    groupOther: { borderBottomLeftRadius: scaleSize(7) },

    text: { fontSize: scaleSize(14), lineHeight: scaleSize(ts(18)), letterSpacing: 0.1, fontFamily: "Outfit_500Medium" },
    textSelf: { color: theme.textPrimary },
    textOther: { color: theme.textPrimary },

    mediaWrap: { flexDirection: "row", flexWrap: "wrap", gap: scaleSize(6), marginTop: scaleSize(6) },
    media: {
        width: scaleSize((BUBBLE_MAX_W - 6) / 2),
        height: scaleSize(180),
        borderRadius: scaleSize(12),
        backgroundColor: theme.field,
    },
    videoOuter: { overflow: "hidden", borderRadius: scaleSize(12), backgroundColor: theme.bg },

    // reply preview
    replyPreview: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: scaleSize(1),
        paddingHorizontal: scaleSize(10),
        paddingVertical: scaleSize(8),
        borderRadius: scaleSize(12),
    },
    replySelf: { backgroundColor: "rgba(45,158,255,0.40)" },
    replyOther: { backgroundColor: theme.field },
    replyBar: { width: scaleSize(3), height: scaleSize(30), borderRadius: scaleSize(2), marginRight: scaleSize(8) },
    replyTextCol: { flexShrink: 1, minWidth: 0 },
    replySnippet: { fontSize: scaleSize(12), fontFamily: "Outfit_500Medium", color: theme.textSecondary },

    // reactions badge
    reactionInline: {
        position: "absolute",
        top: scaleSize(-18),
        flexDirection: "row",
        alignItems: "center",
        minWidth: scaleSize(28),
        height: scaleSize(28),
        paddingHorizontal: scaleSize(8),
        justifyContent: "center",
        backgroundColor: theme.surface,
        borderRadius: scaleSize(999),
        borderWidth: scaleSize(1),
        borderColor: theme.hairline,
        shadowColor: "#000",
        shadowOpacity: 0.14,
        shadowRadius: scaleSize(6),
        shadowOffset: { width: 0, height: scaleSize(3) },
        elevation: 1,
        zIndex: 5,
    },
    reactionLeft: { left: scaleSize(-12) },
    reactionRight: { right: scaleSize(-12) },
    reactionEmoji: { fontSize: scaleSize(12.5), color: theme.textPrimary },

    // timestamps outside bubble, slide in
    timeRight: {
        position: "absolute",
        right: scaleSize(-70),
        bottom: scaleSize(2),
        zIndex: 2,
        fontSize: scaleSize(11),
        lineHeight: scaleSize(13),
        fontFamily: "Outfit_500Medium",
        letterSpacing: 0.1,
        color: theme.textSecondary,
    },
    timeLeftOuter: {
        position: "absolute",
        left: scaleSize(-78),
        bottom: scaleSize(2),
        zIndex: 2,
        fontSize: scaleSize(11),
        lineHeight: scaleSize(13),
        fontFamily: "Outfit_500Medium",
        letterSpacing: 0.1,
        color: theme.textSecondary,
    },
});

export default styles;
