// Styles of NotificationCard, one row of the notifications list.
import { StyleSheet } from "react-native";

import scaleSize from "../../../helper/scaleSize";
import theme from "../../../theme/mfpDark";

const styles = StyleSheet.create({
    pressable: {
        width: '100%',
        alignSelf: 'stretch',
    },
    pressablePressed: { opacity: 0.92 },
    card: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: 'flex-start',
        paddingHorizontal: scaleSize(24),
        paddingVertical: scaleSize(12),
        backgroundColor: theme.surface,
        borderBottomWidth: 0.75,
        borderColor: theme.hairline,
    },
    firstCard: { borderTopWidth: StyleSheet.hairlineWidth },
    lastCard: { borderBottomWidth: StyleSheet.hairlineWidth },
    pfpWrap: { position: "relative", marginRight: scaleSize(14) },
    pfp: {
        width: scaleSize(38),
        aspectRatio: 1,
        borderRadius: scaleSize(22),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
        backgroundColor: theme.field,
    },
    pfpPlaceholder: {
        backgroundColor: theme.field,
    },
    textContainer: { flex: 1, minWidth: 0, paddingRight: scaleSize(12) },
    topRow: { flexDirection: "row", alignItems: "center", marginBottom: scaleSize(1) },
    handleRow: { flexShrink: 1, maxWidth: '100%' },
    handle: {
        fontSize: scaleSize(13),
        fontFamily: "Outfit_600SemiBold",
        color: theme.textPrimary,
        maxWidth: '100%'
    },
    message: {
        fontSize: scaleSize(13),
        color: theme.textSecondary,
        fontFamily: "Outfit_400Regular",
        lineHeight: scaleSize(20),
    },
    trailingColumn: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingLeft: scaleSize(12),
        marginLeft: 'auto',
    },
    time: {
        fontSize: scaleSize(12),
        color: theme.textSecondary,
        fontFamily: "Outfit_500Medium",
    },
    unreadDot: { width: scaleSize(7), height: scaleSize(7), borderRadius: scaleSize(7) / 2, marginBottom: scaleSize(6) },

    actionButton: {
        paddingVertical: scaleSize(8),
        paddingHorizontal: scaleSize(12),
        borderRadius: scaleSize(14),
        marginLeft: scaleSize(12),
        borderWidth: scaleSize(1),
        alignItems: "center",
        justifyContent: "center",
    },
    actionLabel: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(12),
    },
    inviteAcceptBtn: {
        minWidth: scaleSize(74),
    },
    requestActionsWrap: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    requestActionBtn: {
        minWidth: scaleSize(74),
    },
    requestActionDisabled: {
        opacity: 0.6,
    },
    requestHandledText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(12),
        color: theme.muted,
    },
    requestHandledAcceptedText: {
        color: theme.primary,
    },
    actionHandledText: {
        marginLeft: scaleSize(12),
    },
});

export default styles;
