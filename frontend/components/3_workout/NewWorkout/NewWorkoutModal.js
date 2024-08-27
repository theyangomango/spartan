import React, { useEffect, useState, useCallback, useRef } from "react";
import { StyleSheet, View, Modal, ScrollView, Text, Animated, Dimensions } from "react-native";
import ProgressBanner from "./Tracking/ProgressBanner";
import ExerciseLog from "./Tracking/ExerciseLog";
import SelectExerciseModal from './SelectExercise/SelectExerciseModal';
import RNBounceable from "@freakycoder/react-native-bounceable";
import { Weight } from 'iconsax-react-native';
import { MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import TimerDisplay from "./TimerDisplay";
import calculate1RM from "../../../helper/calculate1RM";

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // Scaling factor based on iPhone 13 height

const scaledSize = (size) => Math.round(size * scale);

const NewWorkoutModal = ({ workout, cancelWorkout, updateWorkout, finishWorkout, timerRef, showGroupModal }) => {
    const [selectExerciseModalVisible, setSelectExerciseModalVisible] = useState(false);
    const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] = useState(false); // State for delete confirmation modal
    const [totalReps, setTotalReps] = useState(0);
    const [totalVolume, setTotalVolume] = useState(0);
    const [personalBests, setPersonalBests] = useState(0);
    const [countdown, setCountdown] = useState(0); // State for the countdown timer
    const scrollY = useRef(new Animated.Value(0)).current;

    // Initialize the isDone state
    const [isDoneState, setIsDoneState] = useState(() =>
        workout.exercises.map(exercise =>
            exercise.sets.map(() => false)
        )
    );

    useEffect(() => {
        let timerInterval = null;
        if (countdown > 0) {
            timerInterval = setInterval(() => {
                setCountdown(prevCountdown => Math.max(prevCountdown - 1, 0));
            }, 1000);
        }
        return () => clearInterval(timerInterval);
    }, [countdown]);

    const handleAddTime = () => {
        setCountdown(prevCountdown => prevCountdown + 30); // Add 30 seconds to the countdown
    };

    const calculateStats = useCallback(() => {
        let reps = 0;
        let volume = 0;
        let PBs = 0;

        workout.exercises.forEach((exercise, exerciseIndex) => {
            let isPB = false;
            exercise.sets.forEach((set, setIndex) => {
                if (isDoneState[exerciseIndex][setIndex]) { // Check if the set is done
                    reps += Number(set.reps);
                    volume += (Number(set.reps) * Number(set.weight));
                    const max = calculate1RM(Number(set.weight), Number(set.reps));
                    const prevMax = (exercise.name in global.userData.statsExercises && '1RM' in global.userData.statsExercises[exercise.name]) ? global.userData.statsExercises[exercise.name]['1RM'] : 0;
                    console.log(prevMax);

                    if (max > prevMax && !isPB) {
                        PBs++;
                        isPB = true;
                    }
                }
            });
        });

        setTotalReps(reps);
        setTotalVolume(volume);
        setPersonalBests(PBs);

        // Update the workout object with the new total reps and volume
        updateWorkout(prevWorkout => ({
            ...prevWorkout,
            PBs,
            reps,   // Update the reps property
            volume, // Update the volume property
        }));
    }, [workout.exercises, isDoneState, updateWorkout]);

    const showSelectExerciseModal = useCallback(() => {
        setSelectExerciseModalVisible(true);
    }, []);

    const closeSelectExerciseModal = useCallback(() => {
        setSelectExerciseModalVisible(false);
    }, []);

    const appendExercises = useCallback((exercises) => {
        const newWorkout = {
            ...workout, exercises: [...workout.exercises, ...exercises.map(ex => ({
                name: ex.name,
                muscle: ex.muscle,
                sets: [{
                    weight: 0,
                    reps: 0,
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
        if (isDoneState[exerciseIndex][setIndex] === false) {
            if (isNaN(workout.exercises[exerciseIndex].sets[setIndex].weight) || isNaN(workout.exercises[exerciseIndex].sets[setIndex].reps)) {
                return;
            }
        }
        setIsDoneState(prevState => {
            const newState = [...prevState];
            newState[exerciseIndex][setIndex] = !newState[exerciseIndex][setIndex];
            return newState;
        });
        calculateStats();
    }, [calculateStats]);

    const confirmCancelWorkout = (() => {
        if (workout.exercises.length === 0) handleDeleteWorkout();
        else setDeleteConfirmModalVisible(true); // Show the delete confirmation modal
    });

    const handleDeleteWorkout = useCallback(() => {
        setDeleteConfirmModalVisible(false); // Hide the modal after confirmation
        cancelWorkout(); // Proceed with the original cancel workout functionality
    }, [cancelWorkout]);

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.header}>
                <View style={styles.rest_timer_ctnr}>
                    <RNBounceable style={styles.iconWrapper} onPress={handleAddTime}>
                        <MaterialCommunityIcons name="timer-outline" size={scaledSize(24)} color="#0499FE" />
                    </RNBounceable>

                    {countdown > 0 && (
                        <Text style={styles.countdownText}>
                            {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                        </Text>
                    )}
                </View>

                <View style={styles.timer_text_ctnr} pointerEvents="none">
                    <TimerDisplay timerRef={timerRef} />
                </View>
                <View style={styles.header_right}>
                    <RNBounceable style={styles.group_btn} onPress={showGroupModal}>
                        <FontAwesome name="group" size={scaledSize(17)} color="#FFBB3D" />
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
                        muscle={ex.muscle}
                        exerciseIndex={exerciseIndex}
                        key={ex.name + exerciseIndex}
                        updateSets={updateSets}
                        sets={ex.sets}
                        replaceExercise={replaceExercise}
                        deleteExercise={() => deleteExercise(exerciseIndex)}
                        calculateStats={calculateStats}
                        isDoneState={isDoneState[exerciseIndex]}
                        toggleIsDone={toggleIsDone}
                    />
                ))}
                <RNBounceable onPress={showSelectExerciseModal} style={styles.add_exercise_btn}>
                    <Text style={styles.add_exercise_text}>Add Exercises</Text>
                    <Weight size={scaledSize(22)} color="#5DBDFF" variant='Bold' />
                </RNBounceable>

                <RNBounceable onPress={confirmCancelWorkout} style={styles.cancel_btn}>
                    <Text style={styles.cancel_btn_text}>Cancel Workout</Text>
                </RNBounceable>

                <View style={{ height: scaledSize(150) }} />
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

            <Modal
                animationType="fade"
                transparent={true}
                visible={deleteConfirmModalVisible}
                onRequestClose={() => setDeleteConfirmModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalText}>Are you sure you want to delete this workout?</Text>
                        <RNBounceable onPress={handleDeleteWorkout} style={styles.deleteWorkoutBtn}>
                            <Text style={styles.deleteWorkoutText}>Delete Workout</Text>
                        </RNBounceable>
                        <RNBounceable onPress={() => setDeleteConfirmModalVisible(false)} style={styles.cancelDeleteBtn}>
                            <Text style={styles.cancelDeleteText}>Cancel</Text>
                        </RNBounceable>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
    },
    header: {
        paddingBottom: scaledSize(6),
        paddingHorizontal: scaledSize(22),
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
        height: scaledSize(2),
        backgroundColor: '#eaeaea',
    },
    rest_timer_ctnr: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: scaledSize(6),
        paddingHorizontal: scaledSize(10),
        borderRadius: scaledSize(12),
        backgroundColor: '#E1F0FF',
        position: 'relative',
    },
    iconWrapper: {},
    countdownText: {
        fontSize: scaledSize(16),
        color: '#0499FE',
        fontFamily: 'Outfit_700Bold',
        marginLeft: scaledSize(6)
    },
    timer_text_ctnr: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: scaledSize(5),
    },
    header_right: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    group_btn: {
        width: scaledSize(35),
        height: scaledSize(35),
        borderRadius: scaledSize(12),
        backgroundColor: '#FFE8BC',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: scaledSize(10),
    },
    finish_btn: {
        width: scaledSize(80),
        height: scaledSize(35),
        borderRadius: scaledSize(12),
        backgroundColor: '#DCFFE3',
        justifyContent: 'center',
        alignItems: 'center'
    },
    finish_btn_text: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaledSize(15.5),
        color: '#40D99B',
    },
    scrollview: {
        paddingTop: scaledSize(5)
    },
    add_exercise_btn: {
        marginHorizontal: scaledSize(20),
        marginTop: scaledSize(18),
        height: scaledSize(35),
        borderRadius: scaledSize(12),
        backgroundColor: '#E1F0FF',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row'
    },
    add_exercise_text: {
        fontSize: scaledSize(16),
        fontFamily: 'Outfit_700Bold',
        color: '#0499FE',
        marginRight: scaledSize(4.5)
    },
    cancel_btn: {
        marginHorizontal: scaledSize(20),
        marginTop: scaledSize(18),
        height: scaledSize(35),
        borderRadius: scaledSize(12),
        backgroundColor: '#FFECEC',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row'
    },
    cancel_btn_text: {
        fontSize: scaledSize(16),
        fontFamily: 'Outfit_700Bold',
        color: '#F27171',
        marginRight: scaledSize(4.5)
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        width: '80%',
        padding: scaledSize(20),
        backgroundColor: '#fff',
        borderRadius: scaledSize(15),
        alignItems: 'center',
    },
    modalText: {
        fontSize: scaledSize(16),
        color: '#333',
        fontFamily: 'Outfit_700Bold',
        marginBottom: scaledSize(20),
        textAlign: 'center',
    },
    deleteWorkoutBtn: {
        width: '100%',
        paddingVertical: scaledSize(8),
        backgroundColor: '#FFECEC',
        borderRadius: scaledSize(8),
        alignItems: 'center',
        marginBottom: scaledSize(10),
    },
    deleteWorkoutText: {
        color: '#F27171',
        fontSize: scaledSize(14),
        fontFamily: 'Outfit_700Bold',
    },
    cancelDeleteBtn: {
        width: '100%',
        paddingVertical: scaledSize(8),
        backgroundColor: '#eee',
        borderRadius: scaledSize(8),
        alignItems: 'center',
    },
    cancelDeleteText: {
        color: '#666',
        fontSize: scaledSize(14),
        fontFamily: 'Outfit_700Bold',
    },
});

export default NewWorkoutModal;
