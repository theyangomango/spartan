import React, { memo } from "react";
import { Pressable, TouchableOpacity, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import scaleSize from "../../../../helper/scaleSize";
import ExerciseImagePreview from "./ExerciseImagePreview";
import { strong as haptic } from "../../../../utils/haptics";
import theme from '../../../../theme/mfpDark'

const scaledSize = (size) => scaleSize(size);

const COLORS = {
    cardBg: theme.surface,
    border: "rgba(255, 255, 255, 0.04)",
    borderActive: "#57B9FF",
    text: "#F7F9FF",
    subtext: "#9BA8BF",
    accent: "#FF6B7A",
};

const ExerciseCard = memo(
    ({ name, muscleGroup, selectExercise, deselectExercise, showExerciseInfo, isSelected = false, touchable = false }) => {
        const Wrapper = touchable ? TouchableOpacity : Pressable;
        const wrapperProps = touchable ? { activeOpacity: 0.78 } : {};

        const handlePress = () => {
            try {
                haptic();
            } catch {
                // no-op haptic failure
            }
            if (isSelected) {
                deselectExercise({ name, muscle: muscleGroup });
            } else {
                selectExercise({ name, muscle: muscleGroup });
            }
        };

        return (
            <Wrapper {...wrapperProps} onPress={handlePress} style={[styles.card, isSelected && styles.cardActive]}>
                <View style={styles.iconRow}>
                    <Ionicons
                        name={isSelected ? "bookmark" : "bookmark-outline"}
                        size={scaledSize(18)}
                        color={isSelected ? COLORS.accent : COLORS.subtext}
                    />
                    <Pressable
                        onPress={() => showExerciseInfo?.(name)}
                        style={styles.infoButton}
                        hitSlop={8}
                    >
                        <Ionicons name="help-circle-outline" size={scaledSize(22)} color={COLORS.subtext} />
                    </Pressable>
                </View>

                <View style={styles.previewWrapper}>
                    <ExerciseImagePreview exercise={name} size={scaledSize(140)} />
                </View>

                <View style={styles.infoSection}>
                    <Text style={styles.exerciseName} numberOfLines={2}>
                        {name}
                    </Text>
                    <Text style={styles.muscleGroupText}>{muscleGroup}</Text>
                </View>
            </Wrapper>
        );
    }
);

export default ExerciseCard;

const styles = StyleSheet.create({
    card: {
        width: "49%",
        backgroundColor: COLORS.cardBg,
        borderRadius: scaledSize(18),
        paddingTop: scaledSize(8),
        paddingBottom: scaleSize(12),
        paddingHorizontal: scaledSize(14),
        marginBottom: scaledSize(8),
        borderWidth: 1.5,
        borderColor: COLORS.border,
        overflow: "hidden",
    },
    cardActive: {
        borderColor: COLORS.borderActive,
        shadowColor: "#57B9FF",
    },
    iconRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    infoButton: {
        padding: scaledSize(4),
    },
    previewWrapper: {
        marginTop: scaledSize(12),
        alignItems: "center",
        justifyContent: "center",
    },
    infoSection: {
        marginTop: scaledSize(14),
    },
    exerciseName: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(13),
        color: COLORS.text,
        marginBottom: scaledSize(4),
    },
    muscleGroupText: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(13),
        color: COLORS.subtext,
    },
});
