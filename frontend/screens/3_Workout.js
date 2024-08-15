import React, { useCallback, useEffect, useRef, useState } from "react";
import { Text, StyleSheet, View, Pressable } from "react-native";
import Footer from "../components/Footer";
import StartWorkoutButton from "../components/3_Workout/StartWorkoutButton";
import JoinWorkoutButton from "../components/3_Workout/JoinWorkoutButton";
import makeID from "../../backend/helper/makeID";
import NewWorkoutBottomSheet from "../components/3_Workout/NewWorkout/NewWorkoutBottomSheet";
import CurrentWorkoutPanel from "../components/3_Workout/CurrentWorkoutPanel";
import millisToMinutesAndSeconds from "../helper/milliesToMinutesAndSeconds";
import EditTemplateBottomSheet from "../components/3_Workout/Template/EditTemplateBottomSheet";
import updateDoc from '../../backend/helper/firebase/updateDoc';
import { Entypo } from '@expo/vector-icons';
import arrayAppend from '../../backend/helper/firebase/arrayAppend'
import TemplateList from "../components/3_Workout/Template/TemplateList";
import WorkoutSummaryModal from "../components/3_Workout/WorkoutSummaryModal";
import GroupModalBottomSheet from '../components/3_Workout/NewWorkout/Group/GroupModalBottomSheet'
import calculate1RM from "../helper/calculate1RM";
import formatDate from "../helper/formatDate";

function Workout({ navigation }) {
    const [workout, setWorkout] = useState(global.userData.currentWorkout);
    const [templates, setTemplates] = useState(global.userData.templates);
    const [isCurrentWorkoutPanelVisible, setIsCurrentWorkoutPanelVisible] = useState(!!workout);
    const [isNewWorkoutBottomSheetVisible, setIsNewWorkoutBottomSheetVisible] = useState(false);
    const [groupModalExpandFlag, setGroupModalExpandFlag] = useState(false);
    const [isEditTemplateBottomSheetVisible, setIsEditTemplateBottomSheetVisible] = useState(false);
    const [completedWorkout, setCompletedWorkout] = useState(null);
    const [isSummaryModalVisible, setIsSummaryModalVisible] = useState(false);

    const openedTemplateRef = useRef(null);
    const workoutTimeInterval = useRef(null);
    const timerRef = useRef(workout ? millisToMinutesAndSeconds(Date.now() - workout.created) : '00:00');

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            if (workout) {
                setTimeout(() => {
                    setIsNewWorkoutBottomSheetVisible(true);                    
                }, 100);
            }
        });

        return unsubscribe;
    }, [navigation]);


    // Update the timerRef every second when workout is not null
    useEffect(() => {
        if (workout) {
            workoutTimeInterval.current = setInterval(() => {
                const diff = Date.now() - workout.created;
                timerRef.current = millisToMinutesAndSeconds(diff);
            }, 1000);
        }

        return () => clearInterval(workoutTimeInterval.current);
    }, [workout]);

    // New Workout
    const startNewWorkout = useCallback(async () => {
        if (!workout) {
            global.isCurrentlyWorkingOut = true;
            const newWID = makeID();
            const newWorkout = {
                wid: newWID,
                creatorUID: userData.uid,
                created: Date.now(),
                users: [],
                exercises: []
            };
            setWorkout(newWorkout);
            setIsNewWorkoutBottomSheetVisible(true);
            setTimeout(() => {
                setIsCurrentWorkoutPanelVisible(true);
            }, 500);
        } else {
            setIsNewWorkoutBottomSheetVisible(true);
        }
    }, [workout, userData]);

    const startWorkoutFromTemplate = useCallback(async (index) => {
        if (!workout) {
            global.isCurrentlyWorkingOut = true;
            const newWID = makeID();
            const selectedTemplate = { ...templates[index] }; // Create a shallow copy of the selected template
            const newWorkout = {
                wid: newWID,
                creatorUID: userData.uid,
                created: Date.now(),
                users: [], // Assuming this is intended to be an empty array initially
                exercises: [...selectedTemplate.exercises], // Create a shallow copy of the exercises array
            };

            setWorkout(newWorkout);
            setIsNewWorkoutBottomSheetVisible(true);
            setTimeout(() => {
                setIsCurrentWorkoutPanelVisible(true);
            }, 500);
        } else {
            setIsNewWorkoutBottomSheetVisible(true);
        }
    }, [workout, templates]);

    const updateNewWorkout = useCallback((newWorkout) => {
        setWorkout(newWorkout);
    }, []);

    const cancelWorkout = useCallback(() => {
        global.isCurrentlyWorkingOut = false;
        setWorkout(null);
        setIsNewWorkoutBottomSheetVisible(false);
        clearInterval(workoutTimeInterval.current);
        setIsCurrentWorkoutPanelVisible(false);
        timerRef.current = '00:00';
    }, []);

    const finishWorkout = useCallback(() => {
        global.isCurrentlyWorkingOut = false;
        if (!workout) return;

        // Make a deep copy of the workout object to avoid issues with immutability
        const workoutCopy = JSON.parse(JSON.stringify(workout));

        // Calculate the duration and add it to the workout object
        const duration = Date.now() - workoutCopy.created;

        // Calculate the total volume of the workout
        const volume = workoutCopy.exercises.reduce((totalVolume, exercise) => {
            const exerciseVolume = exercise.sets.reduce((exerciseTotal, set) => {
                return exerciseTotal + (set.weight * set.reps);
            }, 0);
            return totalVolume + exerciseVolume;
        }, 0);

        // Add the duration and volume to the copied workout object
        const completedWorkoutData = { ...workoutCopy, duration, volume };

        // Update the state with the completed workout
        setCompletedWorkout(completedWorkoutData);

        // Append the completed workout to the user's data
        arrayAppend('users', global.userData.uid, 'completedWorkouts', completedWorkoutData);

        // Reset the workout state
        setWorkout(null);
        setIsNewWorkoutBottomSheetVisible(false);
        clearInterval(workoutTimeInterval.current);
        setIsCurrentWorkoutPanelVisible(false);
        timerRef.current = '00:00';
        setIsSummaryModalVisible(true); // Show the summary modal when the workout is finished
    }, [workout]);

    function postWorkout() {
        setIsSummaryModalVisible(false);
        navigation.navigate('ProfileStack', { screen: 'SelectPhotos', workout: completedWorkout });
    }

    // Templates
    function initTemplate() {
        const tid = makeID();
        const newTemplate = {
            name: 'Untitled Template',
            exerciseCount: 0,
            exercises: [],
            lastDate: 'August 3rd',
            tid: tid
        };

        setTemplates([...templates, newTemplate]);
        openedTemplateRef.current = newTemplate;
        setIsEditTemplateBottomSheetVisible(true);
    }

    const openEditTemplateBottomSheet = useCallback((index) => {
        openedTemplateRef.current = templates[index];
        setIsEditTemplateBottomSheetVisible(true);
    }, [templates]);

    function updateTemplate() {
        setTemplates(prevTemplates => {
            const index = prevTemplates.findIndex(template => template.tid === openedTemplateRef.current.tid);
            if (index !== -1) {
                // Create a new array with the updated template
                const updatedTemplates = [...prevTemplates];
                updatedTemplates[index] = { ...openedTemplateRef.current };
                return updatedTemplates;
            }
            return prevTemplates; // If not found, return the original state
        });
    }

    useEffect(() => {
        updateDoc('users', global.userData.uid, {
            currentWorkout: workout
        });
    }, [workout]);

    useEffect(() => {
        if (completedWorkout) {
            let newExerciseStats = { ...global.userData.statsExercises };
            const today = formatDate(new Date());

            completedWorkout.exercises.forEach(ex => {
                const prev1RM = (ex.name in newExerciseStats && '1RM' in newExerciseStats[ex.name]) ? newExerciseStats[ex.name]['1RM'] : 0;

                // Ensure newExerciseStats[ex.name] and its sets array are initialized
                newExerciseStats[ex.name] = newExerciseStats[ex.name] || { sets: [], progress1RM: [] };
                newExerciseStats[ex.name].sets = newExerciseStats[ex.name].sets || [];
                newExerciseStats[ex.name].progress1RM = newExerciseStats[ex.name].progress1RM || [];

                let maxSet1RM = prev1RM; // Track the max 1RM for today's sets

                ex.sets.forEach(set => {
                    newExerciseStats[ex.name].sets.push({
                        weight: set.weight,
                        reps: set.reps
                    });

                    const set1RM = calculate1RM(set.weight, set.reps);

                    if (set1RM > prev1RM) {
                        newExerciseStats[ex.name]['1RM'] = set1RM;
                        newExerciseStats[ex.name]['bestSet'] = {
                            weight: set.weight,
                            reps: set.reps
                        }
                    }

                    // Update maxSet1RM if the current set1RM is greater
                    if (set1RM > maxSet1RM) {
                        maxSet1RM = set1RM;
                    }
                });

                // Add today's date and max 1RM to the progress1RM array
                newExerciseStats[ex.name].progress1RM.push({
                    date: today,
                    '1RM': maxSet1RM
                });
            });

            updateDoc('users', global.userData.uid, {
                statsExercises: newExerciseStats
            });
        }
    }, [completedWorkout]);

    useEffect(() => {
        updateDoc('users', global.userData.uid, {
            templates: templates
        });
    }, [templates]);

    const showGroupModal = useCallback(() => {
        setGroupModalExpandFlag(prev => !prev);
    }, []);

    const closeGroupModal = useCallback(() => {
        setGroupModalExpandFlag(false);
    }, []);

    return (
        <View style={styles.mainContainer}>
            <View style={styles.body}>
                <View style={{ height: 55 }} />
                {isCurrentWorkoutPanelVisible && (
                    <CurrentWorkoutPanel
                        exerciseName={'8/8 Workout'}
                        timerRef={timerRef}
                        openWorkout={startNewWorkout}
                    />
                )}
                {!isCurrentWorkoutPanelVisible && (
                    <>
                        <Text style={styles.quickStartText}>Quick Start</Text>
                        <StartWorkoutButton startWorkout={startNewWorkout} />
                        <JoinWorkoutButton />
                    </>
                )}
                <View style={styles.templatesHeadingRow}>
                    <Text style={styles.templatesText}>Templates</Text>
                    <Pressable onPress={initTemplate}>
                        <Entypo name="plus" size={22} style={styles.addIcon} color={'#888'} />
                    </Pressable>
                </View>
                <TemplateList
                    templates={templates}
                    setTemplates={setTemplates}
                    openEditTemplateBottomSheet={openEditTemplateBottomSheet}
                    startWorkoutFromTemplate={startWorkoutFromTemplate}
                />
            </View>
            <Footer navigation={navigation} currentScreenName={'Workout'} />
            <NewWorkoutBottomSheet
                workout={workout}
                cancelNewWorkout={cancelWorkout}
                updateNewWorkout={updateNewWorkout}
                finishNewWorkout={finishWorkout}
                isVisible={isNewWorkoutBottomSheetVisible}
                setIsVisible={setIsNewWorkoutBottomSheetVisible}
                timerRef={timerRef}
                showGroupModal={showGroupModal}
            />

            <EditTemplateBottomSheet
                isVisible={isEditTemplateBottomSheetVisible}
                setIsVisible={setIsEditTemplateBottomSheetVisible}
                openedTemplateRef={openedTemplateRef}
                updateTemplate={updateTemplate}
            />

            <WorkoutSummaryModal
                isVisible={isSummaryModalVisible}
                workout={completedWorkout} // Pass the completed workout data
                onClose={() => setIsSummaryModalVisible(false)}
                postWorkout={postWorkout}
            />

            <GroupModalBottomSheet
                groupModalExpandFlag={groupModalExpandFlag}
                closeGroupModal={closeGroupModal}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    body: {
        flex: 1,
        paddingTop: 5,
    },
    quickStartText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 16,
        paddingBottom: 8,
        paddingHorizontal: 20,
    },
    templatesHeadingRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between'
    },
    templatesText: {
        marginTop: 24,
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 16,
        paddingHorizontal: 20
    },
    addIcon: {
        paddingHorizontal: 28
    }
});

export default Workout;
