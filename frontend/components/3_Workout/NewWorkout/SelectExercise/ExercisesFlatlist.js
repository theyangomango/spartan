import React, { useCallback } from 'react';
import { FlatList } from 'react-native';
import ExerciseCard from './ExerciseCard';

const ExercisesFlatlist = React.memo(({ exercises = [], selectExercise, deselectExercise, animatedPress = false }) => {
    const renderItem = useCallback(({ item }) => (
        <ExerciseCard
            name={item.name}
            muscleGroup={item.muscleGroup}
            selectExercise={selectExercise}
            userStats={(global?.userData?.statsExercises && global.userData.statsExercises[item.name]) || null}
            deselectExercise={deselectExercise}
            touchable={!!animatedPress}
        />
    ), [selectExercise, deselectExercise, animatedPress]);

    return (
        <FlatList
            data={Array.isArray(exercises) ? exercises : []}
            keyExtractor={(item, index) => String(item?.name || index)}
            renderItem={renderItem}
            initialNumToRender={14}
            windowSize={9}
            maxToRenderPerBatch={20}
            removeClippedSubviews
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        />
    );
});

export default ExercisesFlatlist;
