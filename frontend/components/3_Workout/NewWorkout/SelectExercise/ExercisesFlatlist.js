import React, { useCallback, useMemo } from "react";
import { FlatList } from "react-native";
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
    }) => {
        const renderItem = useCallback(
            ({ item }) => (
                <ExerciseCard
                    name={item.name}
                    muscleGroup={item.muscleGroup}
                    selectExercise={selectExercise}
                    deselectExercise={deselectExercise}
                    isSelected={Boolean(selectedLookup?.[item.name])}
                    isSaved={Boolean(savedLookup?.[item.name])}
                    toggleSaved={toggleSavedExercise}
                    touchable={!!animatedPress}
                />
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

        const columnStyle = useMemo(
            () => ({
                justifyContent: "space-between",
                paddingHorizontal: 0,
                marginBottom: 0,
            }),
            []
        );

        return (
            <FlatList
                style={scrollEnabled ? { flex: 1 } : null}
                data={Array.isArray(exercises) ? exercises : []}
                keyExtractor={(item, index) => String(item?.name || index)}
                renderItem={renderItem}
                initialNumToRender={12}
                windowSize={9}
                maxToRenderPerBatch={20}
                removeClippedSubviews
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                numColumns={3}
                columnWrapperStyle={columnStyle}
                contentContainerStyle={contentPadding}
                extraData={{ selectedLookup, savedLookup }}
                scrollEnabled={scrollEnabled}
                ListHeaderComponent={listHeaderComponent}
            />
        );
    }
);

export default ExercisesFlatlist;
