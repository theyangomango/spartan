import React, { useCallback, useEffect, useRef, useState } from "react";
import { Text, StyleSheet, View, Pressable } from "react-native";
import Footer from "../components/Footer";
import StartWorkoutButton from "../components/3_Workout/StartWorkoutButton";
import JoinWorkoutButton from "../components/3_Workout/JoinWorkoutButton";
import makeID from "../../backend/helper/makeID";
import WorkoutDates from "../components/3_Workout/WorkoutDates/WorkoutDates";
import WorkoutInfoPanel from "../components/3_Workout/WorkoutDates/WorkoutInfoPanel";
import NewWorkoutBottomSheet from "../components/3_Workout/NewWorkout/NewWorkoutBottomSheet";
import CurrentWorkoutPanel from "../components/3_Workout/CurrentWorkoutPanel";
import millisToMinutesAndSeconds from "../helper/milliesToMinutesAndSeconds";
import EditTemplateBottomSheet from "../components/3_Workout/Template/EditTemplateBottomSheet";
import updateDoc from '../../backend/helper/firebase/updateDoc';
import { Entypo } from '@expo/vector-icons';
import arrayAppend from '../../backend/helper/firebase/arrayAppend'
import TemplateList from "../components/3_Workout/Template/TemplateList";

function Workout({ navigation }) {
    const [workout, setWorkout] = useState(global.userData.currentWorkout);
    const [templates, setTemplates] = useState(global.userData.templates);
    const [isPanelVisible, setIsPanelVisible] = useState(false);
    const [panelDate, setPanelDate] = useState(null);
    const [isNewWorkoutBottomSheetVisible, setIsNewWorkoutBottomSheetVisible] = useState(false);
    const [isEditTemplateBottomSheetVisible, setIsEditTemplateBottomSheetVisible] = useState(false);
    const [isCurrentWorkoutPanelVisible, setIsCurrentWorkoutPanelVisible] = useState(!!workout);
    const [selectedScheduleTemplate, setSelectedScheduleTemplate] = useState(null);
    const openedTemplateRef = useRef(null);
    const workoutTimeInterval = useRef(null);
    const timerRef = useRef(workout ? millisToMinutesAndSeconds(Date.now() - workout.created) : '00:00');

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

    const startNewWorkout = useCallback(async () => {
        if (!workout) {
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
        setWorkout(null);
        setIsNewWorkoutBottomSheetVisible(false);
        clearInterval(workoutTimeInterval.current);
        setIsCurrentWorkoutPanelVisible(false);
        timerRef.current = '00:00';
    }, []);

    const finishWorkout = useCallback(() => {
        arrayAppend('users', global.userData.uid, 'completedWorkouts', workout);

        setWorkout(null);
        setIsNewWorkoutBottomSheetVisible(false);
        clearInterval(workoutTimeInterval.current);
        setIsCurrentWorkoutPanelVisible(false);
        timerRef.current = '00:00';
    }, []);

    const scheduleWorkout = useCallback((date) => {
        setIsPanelVisible(true);
        setPanelDate(date);
    }, []);

    const descheduleWorkout = useCallback(() => {
        setIsPanelVisible(false);
    }, []);

    const openEditTemplateBottomSheet = useCallback((index) => {
        openedTemplateRef.current = templates[index];
        setIsEditTemplateBottomSheetVisible(true);
    }, [templates]);

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
        updateDoc('users', global.userData.uid, {
            templates: templates
        });
    }, [templates]);

    return (
        <View style={styles.mainContainer}>
            <View style={styles.body}>
                <View style={{ height: 55 }} />
                <WorkoutDates
                    scheduleWorkout={scheduleWorkout}
                    descheduleWorkout={descheduleWorkout}
                    isPanelVisible={isPanelVisible}
                    selectedDate={panelDate}
                />
                <WorkoutInfoPanel
                    isVisible={isPanelVisible}
                    onClose={descheduleWorkout}
                    date={panelDate}
                    selectedTemplate={selectedScheduleTemplate}
                    setSelectedTemplate={setSelectedScheduleTemplate}
                />
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
                        <JoinWorkoutButton joinWorkout={() => joinWorkoutBottomSheet.current.expand()} />
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
                    isPanelVisible={isPanelVisible}
                    setSelectedScheduleTemplate={setSelectedScheduleTemplate}
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
            />

            <EditTemplateBottomSheet
                isVisible={isEditTemplateBottomSheetVisible}
                setIsVisible={setIsEditTemplateBottomSheetVisible}
                openedTemplateRef={openedTemplateRef}
                updateTemplate={updateTemplate}
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
        paddingTop: 125
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
