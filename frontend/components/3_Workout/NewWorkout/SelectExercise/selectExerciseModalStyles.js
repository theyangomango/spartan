import { StyleSheet } from "react-native";
import scaleSize from "../../../../helper/scaleSize";

const OVERLAY_BG = "rgba(4, 6, 12, 0.72)";
const SHEET_BG = "#0E141F";
const SURFACE = "rgba(24, 32, 48, 0.94)";
const BUTTON_BG = "rgba(32, 42, 63, 0.82)";
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
        backgroundColor: OVERLAY_BG,
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
        paddingHorizontal: scaledSize(20),
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
        marginTop: scaledSize(14),
        backgroundColor: SURFACE,
        borderRadius: scaledSize(16),
        paddingHorizontal: scaledSize(14),
        paddingVertical: scaledSize(10),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(90, 176, 255, 0.25)",
    },
    searchIcon: {
        marginRight: scaledSize(10),
    },
    searchInput: {
        flex: 1,
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(13),
        color: TEXT_PRIMARY,
    },
    muscleFilterSection: {
        height: scaledSize(88),
        justifyContent: "center",
    },
    muscleFilterScroll: {
        height: scaledSize(72),
    },
    muscleFilterContent: {
        paddingHorizontal: scaledSize(10),
        alignItems: "center",
    },
    muscleFilterRow: {
        flexDirection: "row",
        alignItems: "center",
        flexGrow: 0,
    },
    muscleFilterChip: {
        width: scaledSize(62),
        aspectRatio: 1,
        alignItems: "center",
        justifyContent: "center",
        marginRight: scaledSize(12),
        paddingVertical: 0,
        flexShrink: 0,
        flexGrow: 0,
    },
    muscleFilterChipLast: {
        marginRight: 0,
    },
    muscleFilterChipActive: {
        transform: [{ scale: 1.02 }],
    },
    muscleFilterIconWrap: {
        width: scaledSize(52),
        height: scaledSize(52),
        borderRadius: scaledSize(20),
        backgroundColor: CHIP_BG,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255, 255, 255, 0.06)",
    },
    muscleFilterIconWrapActive: {
        backgroundColor: CHIP_BG_ACTIVE,
        borderColor: CHIP_BORDER_ACTIVE,
        shadowColor: "#57B9FF",
        shadowOffset: { width: 0, height: scaledSize(4) },
        shadowOpacity: 0.25,
        shadowRadius: scaledSize(6),
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
        fontSize: scaleSize(13),
        color: TEXT_PRIMARY,
        marginTop: scaledSize(10),
        marginBottom: scaledSize(8),
    },
    listWrapper: {
        flex: 1,
    },
    footer: {
        paddingTop: scaledSize(12),
    },
});

export { ICON_COLOR, TEXT_SECONDARY };

export default styles;
