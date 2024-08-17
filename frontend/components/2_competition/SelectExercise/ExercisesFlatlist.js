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
                    userStats={[item.name] in global.userData.statsExercises && global.userData.statsExercises[item.name]}
                    deselectExercise={deselectExercise}
                />
            )}
        />
    );
});

const styles = StyleSheet.create({
    listContainer: {
        paddingHorizontal: 10,
    },
});

export default ExercisesFlatlist;
