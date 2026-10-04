// Background and text styles of the set-type pill (warm-up, drop set, failure, left, right).

import { StyleSheet } from "react-native";
import theme from "../../../theme/mfpDark";
import { normalizeSetType } from "./setTypeUtils";

export function typePillBg(type) {
    switch (normalizeSetType(type)) {
        case "warmup":
            return { backgroundColor: "rgba(251,146,60,0.45)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(251,146,60,0.7)" };
        case "dropset":
            return { backgroundColor: "rgba(168,85,247,0.45)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(168,85,247,0.7)" };
        case "failure":
            return { backgroundColor: "rgba(244,63,94,0.45)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(244,63,94,0.7)" };
        case "left":
            return { backgroundColor: "rgba(14,165,233,0.45)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(14,165,233,0.7)" };
        case "right":
            return { backgroundColor: "rgba(52,211,153,0.45)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(52,211,153,0.7)" };
        default:
            return { backgroundColor: theme.field };
    }
}

export function typePillText(type) {
    switch (normalizeSetType(type)) {
        case "warmup":
        case "dropset":
        case "failure":
        case "left":
        case "right":
            return { color: "#FFFFFF" };
        default:
            return { color: theme.textPrimary };
    }
}
