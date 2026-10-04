// Styles of the exercise card (ExerciseLog).
import { StyleSheet } from "react-native";

import scaleSize from "../../../../helper/scaleSize";
import theme from "../../../../theme/mfpDark";

const styles = StyleSheet.create({
    main_ctnr: { marginTop: scaleSize(16), marginBottom: scaleSize(6), position: "relative" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingLeft: scaleSize(20),
        paddingRight: scaleSize(14),
        paddingBottom: scaleSize(10),
        marginHorizontal: scaleSize(2.5),
    },
    nameContainer: { flexDirection: "row", alignItems: "center", flexShrink: 1, marginRight: scaleSize(10), paddingBottom: scaleSize(4), flex: 1 },
    avatar: { marginRight: scaleSize(10) },
    nameText: { flexShrink: 1, fontSize: scaleSize(14), lineHeight: scaleSize(20) },
    labels: { flexDirection: "row", paddingBottom: scaleSize(5), marginHorizontal: scaleSize(2.5) },
    set_col: { marginLeft: "5%", width: "8%", alignItems: "center" },
    prev_col: { width: "38%", alignItems: "center" },
    w_col: { width: "18%", alignItems: "center" },
    weightLabelWrapper: { flexDirection: "row", alignItems: "center" },
    weightLabelIcon: { marginRight: scaleSize(4) },
    r_col: { width: "18%", alignItems: "center" },
    add_set_btn_ctnr: { paddingHorizontal: scaleSize(20) },
    add_set_btn: {
        width: "100%",
        marginTop: scaleSize(8),
        alignSelf: "center",
        height: scaleSize(28),
        borderRadius: scaleSize(20),
        backgroundColor: theme.addSetBg,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
    },
    add_set_text: { marginLeft: scaleSize(1), marginRight: scaleSize(5) },
});

export default styles;
