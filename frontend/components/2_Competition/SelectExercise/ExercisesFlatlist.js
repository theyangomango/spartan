import React from 'react';
import { StyleSheet, FlatList } from 'react-native';
import ExerciseCard from './ExerciseCard';

import scaleSize from "../../../helper/scaleSize";

const ExercisesFlatlist = React.memo(({ exercises = [], selectExercise, deselectExercise }) => {
    return (
        <FlatList
            data={Array.isArray(exercises) ? exercises : []}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
                <ExerciseCard
                    name={item.name}
                    muscleGroup={item.muscleGroup}
                    selectExercise={selectExercise}
                    userStats={(global?.userData?.statsExercises && global.userData.statsExercises[item.name]) || null}
                    deselectExercise={deselectExercise}
                />
            )}
        />
    );
});

const styles = StyleSheet.create({
    listContainer: {
        paddingHorizontal: scaleSize(10),
    },
});

export default ExercisesFlatlist;
