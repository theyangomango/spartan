import React, { useMemo, useCallback } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import useStableSafeAreaInsets from "../../../hooks/useStableSafeAreaInsets";
import theme from "../../../theme/mfpDark";
import ExerciseImagePreview from "../../3_Workout/NewWorkout/SelectExercise/ExerciseImagePreview";
import { exercises as ALL_EXERCISES } from "../../3_Workout/NewWorkout/SelectExercise/EXERCISES";
import { scaleSize, SIZES, DEVICE_WIDTH, scaleFont } from "../layoutConstants";

const EXERCISE_CARD_GAP = scaleSize(8, "w");
const EXERCISE_CARD_ASPECT_RATIO = 0.72;
const EXERCISE_GRID_COLUMNS = 2;

const EXERCISE_LIST_PADDING = scaleSize(6, "w");
const EXERCISE_CARD_WIDTH = Math.round(
    (DEVICE_WIDTH - EXERCISE_LIST_PADDING * 2 - EXERCISE_CARD_GAP * (EXERCISE_GRID_COLUMNS - 1)) /
        EXERCISE_GRID_COLUMNS
);

export default function ExercisesSection() {
    const insets = useStableSafeAreaInsets();
    const bottomPadding = useMemo(
        () => Math.max(scaleSize(32), (insets?.bottom || 0) + scaleSize(12)),
        [insets?.bottom]
    );

    const exerciseCards = useMemo(() => {
        const seen = new Set();
        return ALL_EXERCISES.reduce((acc, exercise) => {
            const rawName = typeof exercise?.name === "string" ? exercise.name.trim() : "";
            if (!rawName) return acc;
            const keyBase = rawName.toLowerCase();
            if (seen.has(keyBase)) return acc;
            seen.add(keyBase);
            const displayTitle =
                rawName.replace(/\s*\(([^)]+)\)/g, "").replace(/\s+/g, " ").trim() || rawName;
            acc.push({
                key: keyBase,
                name: rawName,
                title: displayTitle,
                muscle: exercise?.muscleGroup || exercise?.muscle || "—",
            });
            return acc;
        }, []);
    }, []);

    const renderExerciseCard = useCallback(({ item, index }) => {
        const isRowEnd = (index + 1) % EXERCISE_GRID_COLUMNS === 0;
        return (
            <View
                style={[
                    styles.exerciseCard,
                    {
                        width: EXERCISE_CARD_WIDTH,
                        aspectRatio: EXERCISE_CARD_ASPECT_RATIO,
                        marginRight: isRowEnd ? 0 : EXERCISE_CARD_GAP,
                        marginBottom: EXERCISE_CARD_GAP,
                    },
                ]}
            >
                <View style={styles.exerciseImageWrapper}>
                    <View style={styles.exerciseImageInner}>
                        <ExerciseImagePreview exercise={item.name} />
                    </View>
                </View>
                <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName} numberOfLines={2}>
                        {item.title}
                    </Text>
                    <Text style={styles.exerciseMuscle} numberOfLines={1}>
                        {item.muscle}
                    </Text>
                </View>
            </View>
        );
    }, []);

    return (
        <FlatList
            data={exerciseCards}
            keyExtractor={(item) => item.key}
            renderItem={renderExerciseCard}
            numColumns={EXERCISE_GRID_COLUMNS}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
                styles.exerciseListContent,
                { paddingBottom: bottomPadding },
            ]}
            columnWrapperStyle={styles.exerciseColumnWrapper}
            bounces
        />
    );
}

const styles = StyleSheet.create({
    exerciseListContent: {
        paddingHorizontal: EXERCISE_LIST_PADDING,
        paddingTop: scaleSize(12),
    },
    exerciseColumnWrapper: {
        justifyContent: "flex-start",
    },
    exerciseCard: {
        backgroundColor: theme.surface,
        borderRadius: scaleSize(16),
        overflow: "hidden",
        flexDirection: "column",
    },
    exerciseImageWrapper: {
        flex: 3,
        backgroundColor: theme.fieldDeep,
        alignItems: "center",
        justifyContent: "center",
    },
    exerciseImageInner: {
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        transform: [{ scale: 1.4 }],
    },
    exerciseInfo: {
        flex: 2,
        paddingHorizontal: scaleSize(10),
        paddingVertical: scaleSize(10),
        justifyContent: "center",
        backgroundColor: theme.surface,
    },
    exerciseName: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleFont(13),
        color: theme.textPrimary,
    },
    exerciseMuscle: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleFont(11),
        color: theme.textSecondary,
        marginTop: scaleSize(4),
    },
});
