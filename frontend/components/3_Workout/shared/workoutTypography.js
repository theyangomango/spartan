import { StyleSheet } from "react-native";
import scaleSize from "../../../helper/scaleSize";
import theme from "../../../theme/mfpDark";

export const workoutTypography = StyleSheet.create({
    exerciseName: {
        fontFamily: "Mulish_800ExtraBold",
        color: theme.primary,
        fontSize: scaleSize(14),
        flexShrink: 1,
    },
    muscleLabel: {
        fontFamily: "Poppins_700Bold",
        fontSize: scaleSize(11),
        color: "#fff",
    },
    columnLabel: {
        fontFamily: "Mulish_800ExtraBold",
        fontSize: scaleSize(13),
        color: theme.textPrimary,
    },
    addSet: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(13),
        color: theme.textPrimary,
    },
    setNumber: {
        fontFamily: "Poppins_700Bold",
        fontSize: scaleSize(12),
        color: theme.textPrimary,
    },
    setLetter: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(12.5),
        color: theme.textPrimary,
    },
    previousStat: {
        fontFamily: "Poppins_700Bold",
        fontSize: scaleSize(13),
        color: theme.textPrimary,
    },
    statValue: {
        fontFamily: "Poppins_700Bold",
        fontSize: scaleSize(15),
        color: theme.textPrimary,
    },
    emptyRow: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12),
        color: theme.textSecondary,
    },
});

export default workoutTypography;
