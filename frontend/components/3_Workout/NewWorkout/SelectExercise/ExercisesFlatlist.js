import React, { useCallback } from "react";
import { FlatList } from "react-native";
import ExerciseCard from "./ExerciseCard";

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

        return (
            <FlatList
                style={{ flex: 1 }}
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
                columnWrapperStyle={{ justifyContent: "space-between", marginBottom: 0 }}
                contentContainerStyle={{ paddingBottom: bottomPadding, paddingTop: 8 }}
                extraData={{ selectedLookup, savedLookup }}
            />
        );
    }
);

export default ExercisesFlatlist;
