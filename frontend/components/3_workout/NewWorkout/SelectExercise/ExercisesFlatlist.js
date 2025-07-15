import React from 'react';
import { FlatList } from 'react-native';
import ExerciseCard from './ExerciseCard';

const ExercisesFlatlist = React.memo(({ exercises, selectExercise, deselectExercise, userWorkoutStats }) => {

    return (
        <FlatList
            data={exercises}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
                <ExerciseCard
                    name={item.name}
                    muscleGroup={item.muscleGroup}
                    selectExercise={selectExercise}
                    userStats={[item.name] in userWorkoutStats && userWorkoutStats[item.name]}
                    deselectExercise={deselectExercise}
                />
            )}
        />
    );
});

export default ExercisesFlatlist;
