import React, { memo, useMemo } from "react";
import { Pressable, TouchableOpacity, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import scaleSize from "../../../../helper/scaleSize";
import ExerciseImagePreview from "./ExerciseImagePreview";
import { strong as haptic } from "../../../../utils/haptics";
import countCompletedWorkoutsWithExercise from "../../../../helper/countCompletedWorkoutsWithExercise";
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

const CARD_WIDTH = "100%";
const CARD_HEIGHT = scaledSize(220);

const ExerciseCard = memo(
    ({
        name,
        muscleGroup,
        slug,
        selectExercise,
        deselectExercise,
        isSelected = false,
        isSaved = false,
        toggleSaved,
        touchable = false,
        style = null,
    }) => {
        const completedWorkouts = (() => {
            try {
                return global?.userData?.completedWorkouts;
            } catch {
                return undefined;
            }
        })();

        const usageCount = useMemo(
            () => Math.max(0, countCompletedWorkoutsWithExercise(name, completedWorkouts)),
            [name, completedWorkouts]
        );

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

        const handleToggleSaved = (event) => {
            event?.stopPropagation?.();
            if (!toggleSaved) return;
            try {
                haptic();
            } catch {
                // no-op haptic failure
            }
            toggleSaved({ name, muscle: muscleGroup, slug });
        };

        return (
            <Wrapper
                {...wrapperProps}
                onPress={handlePress}
                style={[styles.card, style, isSelected && styles.cardActive]}
            >
                <View style={styles.iconRow}>
                    <Pressable
                        onPress={handleToggleSaved}
                        style={styles.bookmarkButton}
                        hitSlop={8}
                        disabled={!toggleSaved}
                    >
                        <Ionicons
                            name={isSaved ? "bookmark" : "bookmark-outline"}
                            size={scaledSize(16)}
                            color={isSaved ? COLORS.accent : COLORS.subtext}
                        />
                    </Pressable>
                    <View style={styles.rightControls}>
                        {usageCount > 0 ? (
                            <View style={styles.usageBadge}>
                                <Text style={styles.usageBadgeText}>{usageCount}</Text>
                            </View>
                        ) : null}
                    </View>
                </View>

                <View style={styles.previewWrapper}>
                    <ExerciseImagePreview exercise={name} size={scaledSize(110)} />
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
        width: CARD_WIDTH,
        maxWidth: CARD_WIDTH,
        height: CARD_HEIGHT,
        minHeight: CARD_HEIGHT,
        flexGrow: 0,
        flexShrink: 0,
        backgroundColor: COLORS.cardBg,
        borderRadius: scaledSize(14),
        paddingTop: scaledSize(6),
        paddingBottom: scaleSize(10),
        paddingHorizontal: scaledSize(12),
        borderWidth: 1.5,
        borderColor: COLORS.border,
        overflow: "hidden",
        flexDirection: "column",
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
    rightControls: {
        flexDirection: "row",
        alignItems: "center",
    },
    usageBadge: {
        minWidth: scaledSize(20),
        paddingHorizontal: scaledSize(6),
        paddingVertical: scaledSize(2),
        borderRadius: scaledSize(10),
        // backgroundColor: "rgba(87, 185, 255, 0.16)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 0,
    },
    usageBadgeText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(12),
        color: COLORS.text,
    },
    bookmarkButton: {
        paddingVertical: scaledSize(4),
    },
    previewWrapper: {
        flexGrow: 1,
        width: "100%",
        marginTop: scaledSize(6),
        marginBottom: scaledSize(4),
        alignItems: "center",
        justifyContent: "center",
    },
    infoSection: {
        marginTop: scaledSize(4),
    },
    exerciseName: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(12),
        color: COLORS.text,
        marginBottom: scaledSize(4),
    },
    muscleGroupText: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12),
        color: COLORS.subtext,
    },
});
