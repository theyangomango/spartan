import React, { useEffect, useState, useCallback, useRef } from "react";
import { StyleSheet, View, Modal, ScrollView, Text, Animated } from "react-native";
import ProgressBanner from "./Tracking/ProgressBanner";
import ExerciseLog from "./Tracking/ExerciseLog";
import SelectExerciseModal from './SelectExercise/SelectExerciseModal';
import RNBounceable from "@freakycoder/react-native-bounceable";
import { Weight } from 'iconsax-react-native';
import { MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import GroupModalBottomSheet from "./Group/GroupModalBottomSheet";
import TimerDisplay from "./TimerDisplay";

const NewWorkoutModal = ({ workout, closeModal, cancelWorkout, updateWorkout, finishWorkout, timerRef }) => {
    const [selectExerciseModalVisible, setSelectExerciseModalVisible] = useState(false);
    const [groupModalExpandFlag, setGroupModalExpandFlag] = useState(false);
    const [totalReps, setTotalReps] = useState(0);
    const [totalVolume, setTotalVolume] = useState(0);
    const [personalBests, setPersonalBests] = useState(0);
    const scrollY = useRef(new Animated.Value(0)).current;

    // Initialize the isDone state
    const [isDoneState, setIsDoneState] = useState(() =>
        workout.exercises.map(exercise =>
            exercise.sets.map(() => false)
        )
    );

    console.log({ isDoneState });

    const calculateStats = useCallback(() => {
        let reps = 0;
        let volume = 0;

        workout.exercises.forEach((exercise, exerciseIndex) => {
            exercise.sets.forEach((set, setIndex) => {
                if (isDoneState[exerciseIndex][setIndex]) { // Check if the set is done
                    reps += set.reps;
                    volume += (set.reps * set.weight);
                }
            });
        });

        setTotalReps(reps);
        setTotalVolume(volume);
    }, [workout.exercises, isDoneState]);

    const showSelectExerciseModal = useCallback(() => {
        setSelectExerciseModalVisible(true);
    }, []);

    const closeSelectExerciseModal = useCallback(() => {
        setSelectExerciseModalVisible(false);
    }, []);

    const showGroupModal = useCallback(() => {
        setGroupModalExpandFlag(prev => !prev);
    }, []);

    const closeGroupModal = useCallback(() => {
        setGroupModalExpandFlag(false);
    }, []);

    const appendExercises = useCallback((exercises) => {
        const newWorkout = {
            ...workout, exercises: [...workout.exercises, ...exercises.map(ex => ({
                name: ex, sets: [{
                    weight: 0,
                    reps: 0,
                    previous: '405 lb x 12'
                }]
            }))]
        };
        updateWorkout(newWorkout);
        setIsDoneState(prevState =>
            prevState.concat(exercises.map(() => [false]))
        );
    }, [workout, updateWorkout]);

    const updateSets = useCallback((index, newSets) => {
        updateWorkout(prevWorkout => {
            // Create a new workout object with updated exercises
            const updatedExercises = prevWorkout.exercises.map((exercise, i) => {
                if (i === index) {
                    // Replace the sets of the specific exercise
                    return { ...exercise, sets: newSets };
                }
                return exercise; // Return other exercises unchanged
            });

            // Return the new workout object with updated exercises
            return { ...prevWorkout, exercises: updatedExercises };
        });

        newSets.forEach(nset => {
            
        });
    }, [updateWorkout]);


    useEffect(() => {
        calculateStats();
    }, [calculateStats]);

    const borderOpacity = scrollY.interpolate({
        inputRange: [0, 98],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    const replaceExercise = useCallback((index) => {

    }, [workout, updateWorkout, calculateStats]);

    const deleteExercise = useCallback((index) => {
        const newWorkout = { ...workout };
        newWorkout.exercises = newWorkout.exercises.filter((_, i) => i !== index);
        updateWorkout(newWorkout);
        setIsDoneState(prevState => prevState.filter((_, i) => i !== index)); // Remove isDone states for deleted exercise
        calculateStats(); // Update stats after deletion
    }, [workout, updateWorkout, calculateStats]);

    const toggleIsDone = useCallback((exerciseIndex, setIndex) => {
        setIsDoneState(prevState => {
            const newState = [...prevState];
            newState[exerciseIndex][setIndex] = !newState[exerciseIndex][setIndex];
            return newState;
        });
        calculateStats();
    }, [calculateStats]);


    return (
        <View style={styles.main_ctnr}>
            <View style={styles.header}>
                <RNBounceable style={styles.iconWrapper}>
                    <MaterialCommunityIcons name="timer-outline" size={24} color="#0499FE" />
                </RNBounceable>
                <View style={styles.timer_text_ctnr}>
                    <TimerDisplay timerRef={timerRef} />
                </View>
                <View style={styles.header_right}>
                    <RNBounceable style={styles.group_btn} onPress={showGroupModal}>
                        <FontAwesome name="group" size={17} color="#FFBB3D" />
                    </RNBounceable>
                    <RNBounceable onPress={finishWorkout} style={styles.finish_btn}>
                        <Text style={styles.finish_btn_text}>Finish</Text>
                    </RNBounceable>
                </View>
                <Animated.View style={[styles.headerShadow, { opacity: borderOpacity }]} />
            </View>

            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
                style={styles.scrollview}
            >
                <ProgressBanner totalReps={totalReps} totalVolume={totalVolume} personalBests={personalBests} />
                {workout.exercises.map((ex, exerciseIndex) => (
                    <ExerciseLog
                        name={ex.name}
                        exerciseIndex={exerciseIndex}
                        key={ex.name + exerciseIndex} // Unique key to force re-render
                        updateSets={updateSets}
                        sets={ex.sets}
                        replaceExercise={replaceExercise}
                        deleteExercise={() => deleteExercise(exerciseIndex)}
                        calculateStats={calculateStats} // Pass calculateStats function
                        isDoneState={isDoneState[exerciseIndex]} // Pass isDone state
                        toggleIsDone={toggleIsDone} // Pass toggleIsDone function
                    />
                ))}
                <RNBounceable onPress={showSelectExerciseModal} style={styles.add_exercise_btn}>
                    <Text style={styles.add_exercise_text}>Add Exercises</Text>
                    <Weight size="22" color="#5DBDFF" variant='Bold' />
                </RNBounceable>

                <RNBounceable onPress={cancelWorkout} style={styles.cancel_btn}>
                    <Text style={styles.cancel_btn_text}>Cancel Workout</Text>
                </RNBounceable>

                <View style={{ height: 150 }} />
            </Animated.ScrollView>

            <Modal
                animationType='fade'
                transparent={true}
                visible={selectExerciseModalVisible}>
                <SelectExerciseModal
                    closeModal={closeSelectExerciseModal}
                    appendExercises={appendExercises}
                />
            </Modal>

            <GroupModalBottomSheet
                groupModalExpandFlag={groupModalExpandFlag}
                closeGroupModal={closeGroupModal}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
    },
    header: {
        paddingBottom: 6,
        paddingHorizontal: 22,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        zIndex: 1,
        position: 'relative'
    },
    headerShadow: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 2,
        backgroundColor: '#eaeaea',
    },
    iconWrapper: {
        padding: 6,
        borderRadius: 12,
        backgroundColor: '#E1F0FF',
    },
    timer_text_ctnr: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 5,
    },
    header_right: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    group_btn: {
        width: 35,
        height: 35,
        borderRadius: 12,
        backgroundColor: '#FFE8BC',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    finish_btn: {
        width: 80,
        height: 35,
        borderRadius: 12,
        backgroundColor: '#DCFFE3',
        justifyContent: 'center',
        alignItems: 'center'
    },
    finish_btn_text: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 15.5,
        color: '#40D99B',
    },
    scrollview: {
        paddingTop: 5
    },
    add_exercise_btn: {
        marginHorizontal: 20,
        marginTop: 18,
        height: 35,
        borderRadius: 12,
        backgroundColor: '#E1F0FF',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row'
    },
    add_exercise_text: {
        fontSize: 16,
        fontFamily: 'Outfit_700Bold',
        color: '#0499FE',
        marginRight: 4.5
    },
    cancel_btn: {
        marginHorizontal: 20,
        marginTop: 18,
        height: 35,
        borderRadius: 12,
        backgroundColor: '#FFECEC',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row'
    },
    cancel_btn_text: {
        fontSize: 16,
        fontFamily: 'Outfit_700Bold',
        color: '#F27171',
        marginRight: 4.5
    },
});

export default NewWorkoutModal;
