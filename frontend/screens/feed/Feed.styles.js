// Styles of the Feed screen and of its floating create-post menu.
import { Dimensions, StyleSheet } from "react-native";

import theme from "../../theme/mfpDark";
import scaleSize from "../../helper/scaleSize";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
// Clamp floating create menu width so share option subtext consistently stays on two lines.
const CREATE_POST_MENU_WIDTH = Math.max(
    0,
    Math.min(210, Math.round(SCREEN_WIDTH - scaleSize(48))),
);

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    headerWrap: {
        backgroundColor: theme.bg,
        zIndex: 2,
        elevation: 2,
    },
    list: {
        flex: 1,
    },
    listContent: {
        flexGrow: 1,
    },
    listFooter: {
        paddingVertical: scaleSize(24),
    },
    snapshotCardContainer: {
        marginTop: scaleSize(6),
        marginBottom: scaleSize(18),
    },
    createPostButton: {
        width: scaleSize(56),
        height: scaleSize(56),
        borderRadius: scaleSize(28),
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
    },
    createPostButtonActive: {
        backgroundColor: theme.primary,
    },
    createPostActionsWrapper: {
        position: "absolute",
        right: scaleSize(24),
        alignItems: "flex-end",
        zIndex: 3,
    },
    createPostBackdrop: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 2,
        backgroundColor: "rgba(0, 0, 0, 0.35)",
    },
    createPostMenu: {
        marginBottom: scaleSize(16),
        width: CREATE_POST_MENU_WIDTH,
    },
    createPostMenuButton: {
        borderRadius: scaleSize(14),
        paddingVertical: scaleSize(14),
        paddingHorizontal: scaleSize(20),
        alignItems: "flex-start",
        justifyContent: "center",
        marginBottom: scaleSize(12),
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 7,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
    },
    createPostMenuButtonPost: {
        backgroundColor: "#1B1F29",
    },
    createPostMenuRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    createPostMenuLabelWrap: {
        flex: 1,
    },
    createPostMenuText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(15),
        color: "#0A0E14",
    },
    createPostMenuTextDark: {
        color: "#E7ECF5",
    },
    createPostMenuSubtext: {
        fontFamily: "Outfit_400Regular",
        fontSize: scaleSize(13),
        marginTop: scaleSize(4),
        color: "#A0A8BA",
    },
    createPostMenuSubtextDark: {
        color: "#CCD1DE",
    },
    createPostMenuIconBadgeDark: {
        backgroundColor: "rgba(255, 255, 255, 0.12)",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.25)",
        marginLeft: scaleSize(12),
        padding: scaleSize(8),
        borderRadius: scaleSize(999),
        alignItems: "center",
        justifyContent: "center",
    },
    emptyState: {
        alignItems: "center",
        paddingHorizontal: scaleSize(28),
        paddingTop: scaleSize(36),
    },
    emptyIcon: {
        width: scaleSize(60),
        height: scaleSize(60),
        borderRadius: scaleSize(30),
        backgroundColor: theme.primaryDeep,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: scaleSize(18),
    },
    emptyTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(16),
        color: theme.textPrimary,
        marginBottom: scaleSize(6),
    },
    emptySubtitle: {
        fontFamily: "Outfit_400Regular",
        fontSize: scaleSize(13),
        color: theme.textSecondary,
        textAlign: "center",
        lineHeight: scaleSize(18),
    },
});

export default styles;
