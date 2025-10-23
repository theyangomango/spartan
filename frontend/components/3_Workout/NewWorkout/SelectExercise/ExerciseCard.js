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
    countBg: "rgba(255, 255, 255, 0.08)",
    countText: "#F7F9FF",
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
        showExerciseInfo,
        isSelected = false,
        isSaved = false,
        toggleSaved,
        touchable = false,
        style = null,
        hideInfoButton = false,
        workoutCount = 0,
    }) => {
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

        const shouldShowInfo = !hideInfoButton && typeof showExerciseInfo === "function";
        const rawCount = Number(workoutCount);
        const safeCount = Number.isFinite(rawCount) && rawCount > 0 ? Math.floor(rawCount) : 0;
        const displayWorkoutCount = safeCount > 999 ? "999+" : String(safeCount);

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
                    <View style={styles.topRight}>
                        <View style={styles.workoutCountBadge}>
                            <Text
                                style={styles.workoutCountText}
                                accessibilityLabel={`${displayWorkoutCount} recent workouts`}
                            >
                                {displayWorkoutCount}
                            </Text>
                        </View>
                        {shouldShowInfo ? (
                            <Pressable
                                onPress={() => showExerciseInfo?.(name)}
                                style={styles.infoButton}
                                hitSlop={8}
                            >
                                <Ionicons
                                    name="help-circle-outline"
                                    size={scaledSize(19)}
                                    color={COLORS.subtext}
                                />
                            </Pressable>
                        ) : (
                            <View style={styles.infoButtonPlaceholder} />
                        )}
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
    topRight: {
        flexDirection: "row",
        alignItems: "center",
    },
    infoButton: {
        paddingVertical: scaledSize(4),
    },
    infoButtonPlaceholder: {
        width: scaledSize(24),
        height: scaledSize(24),
    },
    workoutCountBadge: {
        minWidth: scaledSize(22),
        paddingHorizontal: scaledSize(6),
        height: scaledSize(22),
        borderRadius: scaledSize(11),
        backgroundColor: COLORS.countBg,
        alignItems: "center",
        justifyContent: "center",
        marginRight: scaledSize(8),
    },
    workoutCountText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(11),
        color: COLORS.countText,
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
