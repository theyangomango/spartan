import { StyleSheet } from "react-native";
import scaleSize from "../../../../helper/scaleSize";
import theme from "../../../../theme/mfpDark";

const SHEET_BG = theme.bg;
const SURFACE = theme.surface;
const BUTTON_BG = theme.field;
const TEXT_PRIMARY = "#F6F8FF";
const TEXT_SECONDARY = "#9CA9C2";
const ICON_COLOR = "#D5E0F6";
const CHIP_BG_ACTIVE = "rgba(87, 185, 255, 0.18)";
const CHIP_BORDER_ACTIVE = "#57B9FF";

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
    },
    wrapper: {
        flex: 1,
        backgroundColor: SHEET_BG,
        borderTopLeftRadius: scaleSize(28),
        borderTopRightRadius: scaleSize(28),
        overflow: "hidden",
    },
    sheet: {
        flex: 1,
    },
    sheetInner: {
        flex: 1,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: scaleSize(6),
        paddingHorizontal: scaleSize(20),
    },
    headerTitle: {
        flex: 1,
        marginLeft: scaleSize(10),
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(16),
        color: TEXT_PRIMARY,
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
    },
    circleButton: {
        width: scaleSize(34),
        height: scaleSize(34),
        borderRadius: scaleSize(17),
        backgroundColor: BUTTON_BG,
        alignItems: "center",
        justifyContent: "center",
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: scaleSize(4),
        marginBottom: scaleSize(12),
        backgroundColor: SURFACE,
        borderRadius: scaleSize(18),
        paddingHorizontal: scaleSize(18),
        marginHorizontal: scaleSize(20),
        paddingVertical: scaleSize(12),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(90, 176, 255, 0.28)",
    },
    searchInput: {
        flex: 1,
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(14),
        color: TEXT_PRIMARY,
    },
    muscleFilterSection: {
        height: scaleSize(88),
        justifyContent: "center",
    },
    muscleFilterScroll: {
        height: scaleSize(72),
        paddingHorizontal: scaleSize(10),
    },
    muscleFilterContent: {
        paddingLeft: scaleSize(10),
        paddingRight: scaleSize(20),
        alignItems: "center",
    },
    muscleFilterRow: {
        flexDirection: "row",
        alignItems: "center",
        flexGrow: 0,
    },
    muscleFilterChip: {
        width: scaleSize(68),
        height: scaleSize(68),
        alignItems: "center",
        justifyContent: "center",
        marginRight: scaleSize(10),
        paddingVertical: 0,
        flexShrink: 0,
        flexGrow: 0,
    },
    muscleFilterChipLast: {
        marginRight: scaleSize(16),
    },
    muscleFilterChipActive: {},
    muscleFilterIconWrap: {
        width: scaleSize(56),
        height: scaleSize(56),
        borderRadius: scaleSize(28),
        backgroundColor: "rgba(89, 169, 255, 0.12)",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    muscleFilterIconWrapActive: {
        backgroundColor: CHIP_BG_ACTIVE,
        borderColor: CHIP_BORDER_ACTIVE,
        shadowColor: "#57B9FF",
        shadowOpacity: 0.25,
        shadowRadius: scaleSize(6),
    },
    muscleFilterIconInner: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    muscleFilterIconZoom: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    sectionTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(14),
        color: TEXT_PRIMARY,
        marginTop: scaleSize(10),
        marginBottom: scaleSize(8),
        paddingHorizontal: scaleSize(20)
    },
    listWrapper: {
        flex: 1,
    },
    bookmarkedSection: {
        paddingBottom: scaleSize(6),
    },
    bookmarkedGrid: {
        flexDirection: "column",
        marginBottom: scaleSize(4),
    },
    bookmarkedRow: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: scaleSize(6),
    },
    bookmarkedCardWrapper: {
        flexGrow: 0,
        flexShrink: 0,
        width: "32.5%",
        maxWidth: "32.5%",
    },
    bookmarkedCard: {
        width: "100%",
        maxWidth: "100%",
    },
    bookmarkedSpacer: {
        width: "32.5%",
        maxWidth: "32.5%",
        flexGrow: 0,
        flexShrink: 0,
        opacity: 0,
    },
    bookmarkedEmpty: {
        marginBottom: scaleSize(12),
        paddingHorizontal: scaleSize(16),
        paddingVertical: scaleSize(14),
        borderRadius: scaleSize(18),
        marginHorizontal: scaleSize(6),
        backgroundColor: theme.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(90, 176, 255, 0.14)",
    },
    bookmarkedEmptyText: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12),
        color: TEXT_SECONDARY,
        lineHeight: scaleSize(16),
    },
    sectionTitleSpacer: {
        marginTop: scaleSize(16),
    },
    footer: {
        paddingTop: scaleSize(12),
        paddingHorizontal: scaleSize(10),

    },
});

export { ICON_COLOR, TEXT_SECONDARY };

export default styles;
