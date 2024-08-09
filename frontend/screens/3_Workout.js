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
import updateDoc from '../../backend/helper/firebase/updateDoc'

function Workout({ navigation }) {
    const [workout, setWorkout] = useState(null);
    const [templates, setTemplates] = useState(global.userData.templates);
    const [isPanelVisible, setIsPanelVisible] = useState(false);
    const [panelDate, setPanelDate] = useState(null);
    const [isNewWorkoutBottomSheetVisible, setIsNewWorkoutBottomSheetVisible] = useState(false);
    const [isEditTemplateBottomSheetVisible, setIsEditTemplateBottomSheetVisible] = useState(false);
    const [isCurrentWorkoutPanelVisible, setIsCurrentWorkoutPanelVisible] = useState(false);
    const [selectedScheduleTemplate, setSelectedScheduleTemplate] = useState(null);
    const openedTemplateRef = useRef(null);
    const userData = global.userData;
    const workoutTimeInterval = useRef(null);
    const timerRef = useRef('00:00');

    console.log('Workout Screen Render');

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
            templates: templates
        });
    }, [templates]);

    const renderItem = useCallback(({ item, drag }) => {
        const index = templates.findIndex(template => template.id === item.id);
        return (
            <ScaleDecorator>
                <TemplateCard
                    lastUsedDate={item.lastDate}
                    exercises={item.exercises}
                    name={item.name}
                    handleLongPress={drag}
                    isPanelVisible={isPanelVisible}
                    setSelectedTemplate={setSelectedScheduleTemplate}
                    handlePressEditButton={() => openEditTemplateBottomSheet(index)}
                    index={index} // Pass the index to TemplateCard
                />
            </ScaleDecorator>
        );
    }, [isPanelVisible, setSelectedScheduleTemplate, openEditTemplateBottomSheet, templates]);

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
                    selectedTemplate={selectedScheduleTemplate}
                    setSelectedTemplate={setSelectedScheduleTemplate}
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
                    keyExtractor={(item, index) => index}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={<View />}
                    ListFooterComponentStyle={{ height: templates.length * 70 }}
                />
            </View>
            <Footer navigation={navigation} currentScreenName={'Workout'} />
            <NewWorkoutBottomSheet
                workout={workout}
                // setWorkout={setWorkout}
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
                openedTemplateRef={openedTemplateRef}
                updateTemplate={updateTemplate}
            />
        </View>
    );
}

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

export default Workout;
