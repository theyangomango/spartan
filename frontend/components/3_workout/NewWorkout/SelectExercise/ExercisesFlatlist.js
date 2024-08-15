import React from 'react';
import { StyleSheet, FlatList } from 'react-native';
import ExerciseCard from './ExerciseCard';

const ExercisesFlatlist = React.memo(({ exercises, selectExercise, deselectExercise }) => {
    return (
        <FlatList
            data={exercises}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
                <ExerciseCard
                    name={item.name}
                    muscleGroup={item.muscleGroup}
                    selectExercise={selectExercise}
                    deselectExercise={deselectExercise}
                />
            )}
        />
    );
});

export default ExercisesFlatlist;
