import React, { useCallback, useEffect, useRef, useState } from "react";
import { Text, StyleSheet, View } from "react-native";
import DraggableFlatList, { ScaleDecorator } from "react-native-draggable-flatlist";
import Footer from "../components/Footer";
import TemplateCard from "../components/3_Workout/Template/TemplateCard";
import StartWorkoutButton from "../components/3_Workout/StartWorkoutButton";
import JoinWorkoutButton from "../components/3_Workout/JoinWorkoutButton";
import makeID from "../../backend/helper/makeID";
import WorkoutDates from "../components/3_Workout/WorkoutDates/WorkoutDates";
import WorkoutInfoPanel from "../components/3_Workout/WorkoutDates/WorkoutInfoPanel";
import NewWorkoutBottomSheet from "../components/3_Workout/NewWorkout/NewWorkoutBottomSheet";
import CurrentWorkoutPanel from "../components/3_Workout/CurrentWorkoutPanel";
import millisToMinutesAndSeconds from "../helper/milliesToMinutesAndSeconds";
import EditTemplateBottomSheet from "../components/3_Workout/Template/EditTemplateBottomSheet";

const lastUsedDate = "July 6th";
const initialExercises = [
    { name: "Incline Bench (Barbell)", muscle: "Chest", sets: [{ reps: 10, weight: 12 }, { reps: 10, weight: 12 }, { reps: 10, weight: 12 }] },
    { name: "Decline Bench (Barbell)", muscle: "Chest", sets: [{ reps: 8, weight: 10 }, { reps: 8, weight: 10 }, { reps: 8, weight: 10 }] },
    { name: "Chest Flys", muscle: "Chest", sets: [{ reps: 12, weight: 8 }, { reps: 12, weight: 8 }, { reps: 12, weight: 8 }] },
    { name: "Pull Ups", muscle: "Back", sets: [{ reps: 5, weight: 'bodyweight' }, { reps: 5, weight: 'bodyweight' }, { reps: 5, weight: 'bodyweight' }] },
    { name: "Bicep Curls (Dumbell)", muscle: "Biceps", sets: [{ reps: 10, weight: 15 }, { reps: 10, weight: 15 }, { reps: 10, weight: 15 }] },
    { name: "Lateral Raises", muscle: "Shoulders", sets: [{ reps: 12, weight: 10 }, { reps: 12, weight: 10 }, { reps: 12, weight: 10 }] },
    { name: "Shoulder Press (Dumbell)", muscle: "Shoulders", sets: [{ reps: 8, weight: 20 }, { reps: 8, weight: 20 }, { reps: 8, weight: 20 }] },
    { name: "Reverse Curls (Barbell)", muscle: "Biceps", sets: [{ reps: 10, weight: 12 }, { reps: 10, weight: 12 }, { reps: 10, weight: 12 }] }
];

const initialTemplates = [
    { id: '1', lastUsedDate, exercises: initialExercises, name: 'Chest & Back' },
    { id: '2', lastUsedDate, exercises: initialExercises, name: 'Full Upper Body' },
    { id: '3', lastUsedDate, exercises: initialExercises, name: 'Leg Day!!!' },
    { id: '4', lastUsedDate, exercises: initialExercises, name: 'Full Body' },
    { id: '5', lastUsedDate, exercises: initialExercises, name: 'Cardio' },
    { id: '6', lastUsedDate, exercises: initialExercises, name: 'Full Upper Body' }
];

function Workout({ navigation }) {
    const [workout, setWorkout] = useState(null);
    const [templates, setTemplates] = useState(initialTemplates);
    const [isPanelVisible, setIsPanelVisible] = useState(false);
    const [panelDate, setPanelDate] = useState(null);
    const [isNewWorkoutBottomSheetVisible, setIsNewWorkoutBottomSheetVisible] = useState(false);
    const [isEditTemplateBottomSheetVisible, setIsEditTemplateBottomSheetVisible] = useState(false);
    const workoutTimeInterval = useRef(null);
    const [isCurrentWorkoutPanelVisible, setIsCurrentWorkoutPanelVisible] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const userData = global.userData;
    const timerRef = useRef('00:00');

    const startNewWorkout = useCallback(async () => {
        if (!workout) {
            const newWID = makeID();
            setWorkout({
                wid: newWID,
                creatorUID: userData.uid,
                created: Date.now(),
                users: [],
                exercises: []
            });
            setIsNewWorkoutBottomSheetVisible(true);
            const initialTime = Date.now();
            workoutTimeInterval.current = setInterval(() => {
                const diff = Date.now() - initialTime;
                timerRef.current = millisToMinutesAndSeconds(diff);
            }, 1000);
            setTimeout(() => {
                setIsCurrentWorkoutPanelVisible(true);
            }, 500);
        } else {
            setIsNewWorkoutBottomSheetVisible(true);
        }
    }, [workout, userData]);

    const updateNewWorkout = useCallback((newWorkout) => {
        setWorkout(newWorkout);
    }, []);

    const cancelNewWorkout = useCallback(() => {
        setWorkout(null);
        setIsNewWorkoutBottomSheetVisible(false);
        clearInterval(workoutTimeInterval.current);
        setIsCurrentWorkoutPanelVisible(false);
        timerRef.current = '00:00';
    }, []);

    const finishNewWorkout = useCallback(() => {
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
        setIsEditTemplateBottomSheetVisible(true);
    });

    const renderItem = useCallback(({ item, drag, index }) => (
        <ScaleDecorator>
            <TemplateCard
                lastUsedDate={item.lastUsedDate}
                exercises={item.exercises}
                name={item.name}
                handleLongPress={drag}
                isPanelVisible={isPanelVisible}
                setSelectedTemplate={setSelectedTemplate}
                handlePressEditButton={() => openEditTemplateBottomSheet(index)}
            />
        </ScaleDecorator>
    ), [isPanelVisible, setSelectedTemplate]);

    return (
        <View style={styles.main_ctnr}>
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
                    selectedTemplate={selectedTemplate}
                    setSelectedTemplate={setSelectedTemplate}
                />
                {isCurrentWorkoutPanelVisible &&
                    <CurrentWorkoutPanel
                        exerciseName={'8/8 Workout'}
                        timerRef={timerRef}
                        openWorkout={startNewWorkout}
                    />
                }
                {!isCurrentWorkoutPanelVisible &&
                    <>
                        <Text style={styles.quick_start_text}>Quick Start</Text>
                        <StartWorkoutButton startWorkout={startNewWorkout} />
                        <JoinWorkoutButton joinWorkout={() => joinWorkoutBottomSheet.current.expand()} />
                    </>
                }
                <Text style={styles.templates_text}>Templates</Text>
                <DraggableFlatList
                    data={templates}
                    onDragEnd={({ data }) => setTemplates(data)}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={<View />}
                    ListFooterComponentStyle={{ height: templates.length * 70 }}
                />
            </View>
            <Footer navigation={navigation} currentScreenName={'Workout'} />
            <NewWorkoutBottomSheet
                workout={workout}
                cancelNewWorkout={cancelNewWorkout}
                updateNewWorkout={updateNewWorkout}
                finishNewWorkout={finishNewWorkout}
                isVisible={isNewWorkoutBottomSheetVisible}
                setIsVisible={setIsNewWorkoutBottomSheetVisible}
                timerRef={timerRef}
            />

            <EditTemplateBottomSheet 
                isVisible={isEditTemplateBottomSheetVisible}
                setIsVisible={setIsEditTemplateBottomSheetVisible}
            />
        </View>
    );
}

export default React.memo(Workout);

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: '#fff',
    },
    body: {
        flex: 1,
        paddingTop: 125
    },
    quick_start_text: {
        fontFamily: 'Poppins_600SemiBold',
        letterSpacing: -0.2,
        fontSize: 16,
        paddingBottom: 8,
        paddingHorizontal: 20,
    },
    templates_text: {
        marginTop: 24,
        fontFamily: 'Poppins_600SemiBold',
        letterSpacing: -0.3,
        fontSize: 16,
        paddingHorizontal: 20
    },
});
