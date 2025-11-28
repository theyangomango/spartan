import { StyleSheet } from "react-native";
import scaleSize from "../../../../helper/scaleSize";
import theme from "../../../../theme/mfpDark";

const OVERLAY_BG = "rgba(4, 6, 12, 0.72)";
const SHEET_BG = theme.bg;
const SURFACE = theme.surface;
const BUTTON_BG = theme.field;
const BUTTON_BG_ACTIVE = "rgba(90, 101, 128, 0.42)";
const TEXT_PRIMARY = "#F6F8FF";
const TEXT_SECONDARY = "#9CA9C2";
const ICON_COLOR = "#D5E0F6";
const CHIP_BG = "rgba(30, 40, 58, 0.9)";
const CHIP_BG_ACTIVE = "rgba(87, 185, 255, 0.18)";
const CHIP_BORDER_ACTIVE = "#57B9FF";
const PANEL_BG = "rgba(14, 20, 32, 0.96)";

const scaledSize = (size) => scaleSize(size);

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
    },
    wrapper: {
        flex: 1,
        backgroundColor: SHEET_BG,
        borderTopLeftRadius: scaledSize(28),
        borderTopRightRadius: scaledSize(28),
        overflow: "hidden",
    },
    sheet: {
        flex: 1,
    },
    sheetInner: {
        flex: 1,
    },
    dragHandle: {
        alignSelf: "center",
        width: scaledSize(52),
        height: scaledSize(5),
        borderRadius: scaledSize(3),
        backgroundColor: "rgba(255, 255, 255, 0.16)",
        marginBottom: scaledSize(12),
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: scaledSize(6),
        paddingHorizontal: scaledSize(20),
    },
    headerTitle: {
        flex: 1,
        marginLeft: scaledSize(10),
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(16),
        color: TEXT_PRIMARY,
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
    },
    headerActionButton: {
        marginLeft: scaledSize(8),
    },
    circleButton: {
        width: scaledSize(34),
        height: scaledSize(34),
        borderRadius: scaledSize(17),
        backgroundColor: BUTTON_BG,
        alignItems: "center",
        justifyContent: "center",
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: scaledSize(4),
        marginBottom: scaledSize(12),
        backgroundColor: SURFACE,
        borderRadius: scaledSize(18),
        paddingHorizontal: scaledSize(18),
        marginHorizontal: scaleSize(20),
        paddingVertical: scaledSize(12),
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
        height: scaledSize(88),
        justifyContent: "center",
    },
    muscleFilterScroll: {
        height: scaledSize(72),
        paddingHorizontal: scaledSize(10),
    },
    muscleFilterContent: {
        paddingLeft: scaledSize(10),
        paddingRight: scaledSize(20),
        alignItems: "center",
    },
    muscleFilterRow: {
        flexDirection: "row",
        alignItems: "center",
        flexGrow: 0,
    },
    muscleFilterChip: {
        width: scaledSize(68),
        height: scaledSize(68),
        alignItems: "center",
        justifyContent: "center",
        marginRight: scaledSize(10),
        paddingVertical: 0,
        flexShrink: 0,
        flexGrow: 0,
    },
    muscleFilterChipLast: {
        marginRight: scaledSize(16),
    },
    muscleFilterChipActive: {},
    muscleFilterIconWrap: {
        width: scaledSize(56),
        height: scaledSize(56),
        borderRadius: scaledSize(28),
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
        shadowRadius: scaledSize(6),
    },
    muscleFilterIconInner: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    muscleFilterIconZoom: {
        transform: [{ scale: 1.1 }],
    },
    filterPanel: {
        backgroundColor: PANEL_BG,
        borderRadius: scaledSize(18),
        paddingVertical: scaledSize(14),
        paddingHorizontal: scaledSize(14),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(90, 176, 255, 0.18)",
        marginTop: scaledSize(6),
    },
    filterPanelTitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(13),
        color: TEXT_PRIMARY,
        marginBottom: scaledSize(12),
    },
    filterChipWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    equipmentChip: {
        paddingHorizontal: scaledSize(12),
        paddingVertical: scaledSize(8),
        borderRadius: scaledSize(16),
        backgroundColor: CHIP_BG,
        marginRight: scaledSize(10),
        marginBottom: scaledSize(10),
    },
    equipmentChipActive: {
        backgroundColor: CHIP_BG_ACTIVE,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: CHIP_BORDER_ACTIVE,
    },
    equipmentChipText: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(11.5),
        color: TEXT_SECONDARY,
    },
    equipmentChipTextActive: {
        color: TEXT_PRIMARY,
    },
    sectionTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(14),
        color: TEXT_PRIMARY,
        marginTop: scaledSize(10),
        marginBottom: scaledSize(8),
        paddingHorizontal: scaleSize(20)
    },
    listWrapper: {
        flex: 1,
    },
    bookmarkedSection: {
        paddingBottom: scaledSize(6),
    },
    bookmarkedGrid: {
        flexDirection: "column",
        marginBottom: scaledSize(4),
    },
    bookmarkedRow: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: scaledSize(6),
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
        marginBottom: scaledSize(12),
        paddingHorizontal: scaledSize(16),
        paddingVertical: scaledSize(14),
        borderRadius: scaledSize(18),
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
        marginTop: scaledSize(16),
    },
    footer: {
        paddingTop: scaledSize(12),
        paddingHorizontal: scaledSize(10),

    },
});

export { ICON_COLOR, TEXT_SECONDARY };

export default styles;
