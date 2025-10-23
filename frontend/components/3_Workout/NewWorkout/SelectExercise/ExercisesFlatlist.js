import React, { useCallback, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { FlashList } from "@shopify/flash-list";
import ExerciseCard from "./ExerciseCard";
import scaleSize from "../../../../helper/scaleSize";

const ITEMS_PER_ROW = 3;
const ESTIMATED_CARD_HEIGHT = scaleSize(220);
const ROW_SPACING = scaleSize(6);
const ESTIMATED_ROW_HEIGHT = ESTIMATED_CARD_HEIGHT + ROW_SPACING;

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
        onScroll = undefined,
    }) => {
        const rows = useMemo(() => {
            if (!Array.isArray(exercises)) return [];
            const chunked = [];
            for (let i = 0; i < exercises.length; i += ITEMS_PER_ROW) {
                chunked.push(exercises.slice(i, i + ITEMS_PER_ROW));
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
                                slug={exercise.slug}
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
                    {row.length < ITEMS_PER_ROW &&
                        Array.from({ length: ITEMS_PER_ROW - row.length }).map((_, fillerIndex) => (
                            <View key={`spacer-${rowIndex}-${fillerIndex}`} style={styles.cardSpacer} />
                        ))}
                </View>
            ),
            [
                selectExercise,
                deselectExercise,
                toggleSavedExercise,
                selectedLookup,
                savedLookup,
                animatedPress,
                hideInfoButton,
            ]
        );

        const keyExtractor = useCallback((row, index) => {
            const key = row
                .map((exercise) => exercise?.name || "exercise")
                .join("|")
                .toLowerCase();
            return `${key}-${index}`;
        }, []);

        const contentPadding = useMemo(
            () => ({
                paddingBottom: bottomPadding,
                paddingTop: scaleSize(8),
            }),
            [bottomPadding]
        );

        const containerStyle = scrollEnabled ? styles.flex : null;

        return (
            <View style={containerStyle}>
                <FlashList
                    data={rows}
                    keyExtractor={keyExtractor}
                    renderItem={renderRow}
                    estimatedItemSize={ESTIMATED_ROW_HEIGHT}
                    onScroll={onScroll}
                    scrollEventThrottle={16}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={contentPadding}
                    extraData={{ selectedLookup, savedLookup, hideInfoButton }}
                    scrollEnabled={scrollEnabled}
                    ListHeaderComponent={listHeaderComponent}
                />
            </View>
        );
    }
);

export default ExercisesFlatlist;

const styles = StyleSheet.create({
    row: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: ROW_SPACING,
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
    flex: {
        flex: 1,
    },
});
