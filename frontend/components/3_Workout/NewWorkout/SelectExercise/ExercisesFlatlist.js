import React, { useCallback, useMemo } from "react";
import { FlatList, View, StyleSheet } from "react-native";
import ExerciseCard from "./ExerciseCard";
import scaleSize from "../../../../helper/scaleSize";

const ExercisesFlatlist = React.memo(
    ({
        exercises = [],
        selectExercise,
        deselectExercise,
        toggleSavedExercise,
        selectedLookup = {},
        savedLookup = {},
        animatedPress = false,
        bottomPadding = 120,
        scrollEnabled = true,
        listHeaderComponent = null,
        hideInfoButton = false,
    }) => {
        const rows = useMemo(() => {
            if (!Array.isArray(exercises)) return [];
            const chunked = [];
            for (let i = 0; i < exercises.length; i += 3) {
                chunked.push(exercises.slice(i, i + 3));
            }
            return chunked;
        }, [exercises]);

        const renderRow = useCallback(
            ({ item: row, index: rowIndex }) => (
                <View style={styles.row} key={`row-${rowIndex}`}>
                    {row.map((exercise, columnIndex) => (
                        <View
                            key={`${exercise?.name || "exercise"}-${columnIndex}`}
                            style={styles.cardWrapper}
                        >
                            <ExerciseCard
                                name={exercise.name}
                                muscleGroup={exercise.muscleGroup}
                                selectExercise={selectExercise}
                                deselectExercise={deselectExercise}
                                isSelected={Boolean(selectedLookup?.[exercise.name])}
                                isSaved={Boolean(savedLookup?.[exercise.name])}
                                toggleSaved={toggleSavedExercise}
                                touchable={!!animatedPress}
                                style={styles.card}
                                hideInfoButton={hideInfoButton}
                            />
                        </View>
                    ))}
                    {row.length < 3 &&
                        Array.from({ length: 3 - row.length }).map((_, fillerIndex) => (
                            <View key={`spacer-${rowIndex}-${fillerIndex}`} style={styles.cardSpacer} />
                        ))}
                </View>
            ),
            [selectExercise, deselectExercise, toggleSavedExercise, selectedLookup, savedLookup, animatedPress]
        );

        const contentPadding = useMemo(
            () => ({
                paddingBottom: bottomPadding,
                paddingTop: scaleSize(8),
            }),
            [bottomPadding]
        );

        return (
            <FlatList
                style={scrollEnabled ? { flex: 1 } : null}
                data={rows}
                keyExtractor={(row, index) =>
                    `${row.map((exercise) => exercise?.name).join("|") || "row"}-${index}`
                }
                renderItem={renderRow}
                initialNumToRender={12}
                windowSize={9}
                maxToRenderPerBatch={20}
                removeClippedSubviews
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={contentPadding}
                extraData={{ selectedLookup, savedLookup, rows, hideInfoButton }}
                scrollEnabled={scrollEnabled}
                ListHeaderComponent={listHeaderComponent}
            />
        );
    }
);

export default ExercisesFlatlist;

const styles = StyleSheet.create({
    row: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: scaleSize(6),
    },
    cardWrapper: {
        flexGrow: 0,
        flexShrink: 0,
        width: "32.5%",
        maxWidth: "32.5%",
    },
    card: {
        width: "100%",
        maxWidth: "100%",
    },
    cardSpacer: {
        width: "32.5%",
        maxWidth: "32.5%",
        flexGrow: 0,
        flexShrink: 0,
        opacity: 0,
    },
});
