import React, { useCallback, useRef, useState } from "react";
import { Text, StyleSheet, View, Dimensions } from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import BottomSheet from "react-native-gesture-bottom-sheet";
import DraggableFlatList, { ScaleDecorator } from "react-native-draggable-flatlist";
import NewWorkoutModal from "../components/3_workout/new_workout/NewWorkoutModal";
import Footer from "../components/Footer";
import TemplateCard from "../components/3_workout/TemplateCard";
import StartWorkoutButton from "../components/3_workout/StartWorkoutButton";
import JoinWorkoutButton from "../components/3_workout/JoinWorkoutButton";
import initWorkout from "../../backend/initWorkout";
import makeID from "../../backend/helper/makeID";
import eraseDoc from "../../backend/helper/firebase/eraseDoc";
import updateDoc from "../../backend/helper/firebase/updateDoc";
import WorkoutFooter from "../components/3_workout/WorkoutFooter";
import JoinWorkoutModal from "../components/3_workout/JoinWorkoutModal";
import WorkoutHeader from "../components/3_workout/WorkoutHeader";
import GoalBanner from "../components/3_workout/GoalBanner";
import CalendarBanner from "../components/3_workout/CalendarBanner";
import { SafeAreaView } from "react-native-safe-area-context";
import WorkoutDates from "../components/3_workout/WorkoutDates";
import RNBounceable from "@freakycoder/react-native-bounceable";
import Panel from "../components/3_workout/Panel";

const { height } = Dimensions.get('window');

const lastUsedDate = "July 6th";
const initialExercises = [
    { name: "3 x Incline Bench (Barbell)", muscle: "Chest" },
    { name: "3 x Decline Bench (Barbell)", muscle: "Chest" },
    { name: "3 x Chest Flys", muscle: "Chest" },
    { name: "5 x Pull Ups", muscle: "Back" },
    { name: "3 x Bicep Curls (Dumbell)", muscle: "Biceps" },
    { name: "3 x Lateral Raises", muscle: "Shoulders" },
    { name: "3 x Shoulder Press (Dumbell)", muscle: "Shoulders" },
    { name: "5 x Reverse Curls (Barbell)", muscle: "Biceps" }
];

const initialTemplates = [
    { id: '1', lastUsedDate, exercises: initialExercises, name: 'Chest & Back' },
    { id: '2', lastUsedDate, exercises: initialExercises, name: 'Full Upper Body' },
    { id: '3', lastUsedDate, exercises: initialExercises, name: 'Leg Day!!!' },
    { id: '4', lastUsedDate, exercises: initialExercises, name: 'Full Body' },
    { id: '5', lastUsedDate, exercises: initialExercises, name: 'Cardio' },
    { id: '6', lastUsedDate, exercises: initialExercises, name: 'Full Upper Body' }
];

export default function Workout({ navigation }) {
    const [workout, setWorkout] = useState(null);
    const [templates, setTemplates] = useState(initialTemplates);
    const newWorkoutBottomSheet = useRef();
    const joinWorkoutBottomSheet = useRef();
    const [newWorkoutBkgColor, setNewWorkoutBkgColor] = useState('#000');
    const [joinWorkoutBkgColor, setJoinWorkoutBkgColor] = useState('#000');
    const [isPanelVisible, setIsPanelVisible] = useState(false);
    const [panelDate, setPanelDate] = useState(null);

    const userData = global.userData;
    global.openWorkoutModal = (user) => {
        navigation.navigate('Workout');
        newWorkoutBottomSheet.current.show();
    };

    async function startNewWorkout() {
        let newWID = makeID();
        initWorkout(newWID, userData.uid);
        await setWorkout({
            wid: newWID,
            creatorUID: userData.uid,
            created: Date.now(),
            users: [],
            exercises: []
        });
        global.workout = workout;
        newWorkoutBottomSheet.current.show();
    }

    function updateNewWorkout(workout) {
        updateDoc('workouts', workout.wid, workout);
    }

    function cancelNewWorkout() {
        eraseDoc('workouts', workout.wid);
        newWorkoutBottomSheet.current.close();
        setTimeout(() => {
            setWorkout(null);
        }, 1000);
    }

    function finishNewWorkout() {
        newWorkoutBottomSheet.current.close();
        setTimeout(() => {
            setWorkout(null);
        }, 1000);
    }

    const scheduleWorkout = useCallback((date) => {
        setIsPanelVisible(true);
        setPanelDate(date);
    });

    const descheduleWorkout = useCallback(() => {
        setIsPanelVisible(false);
        setPanelDate(null);
    });

    useFocusEffect(
        React.useCallback(() => {
            const interval = setInterval(() => {
                let panY1 = parseInt(JSON.stringify(newWorkoutBottomSheet.current.state.pan.y));
                let animatedHeight1 = parseInt(JSON.stringify(newWorkoutBottomSheet.current.state.animatedHeight));
                let realHeight1 = Math.max(panY1, 1100 - animatedHeight1);
                setNewWorkoutBkgColor(`rgba(0, 0, 0, ${0.7 - 0.75 * (realHeight1 / 800)})`);

                let panY2 = parseInt(JSON.stringify(joinWorkoutBottomSheet.current.state.pan.y));
                let animatedHeight2 = parseInt(JSON.stringify(joinWorkoutBottomSheet.current.state.animatedHeight));
                let realHeight2 = Math.max(panY2, 325 - animatedHeight2);
                setJoinWorkoutBkgColor(`rgba(0, 0, 0, ${0.55 - 0.6 * (realHeight2 / 275)})`);
            }, 10);

            return () => {
                clearInterval(interval);
            };
        }, [])
    );

    const renderItem = ({ item, drag, isActive }) => {
        return (
            <ScaleDecorator>
                <RNBounceable
                    onLongPress={drag}
                    disabled={isActive}
                >
                    <TemplateCard
                        lastUsedDate={item.lastUsedDate}
                        exercises={item.exercises}
                        name={item.name}
                    />
                </RNBounceable>
            </ScaleDecorator>
        );
    };

    return (
        <View style={styles.main_ctnr}>
            <BottomSheet
                hasDraggableIcon
                ref={newWorkoutBottomSheet}
                height={height - 60}
                sheetBackgroundColor={'#fff'}
                backgroundColor={newWorkoutBkgColor}
            >
                <NewWorkoutModal
                    workout={workout}
                    setWorkout={setWorkout}
                    closeModal={() => newWorkoutBottomSheet.current.close()}
                    cancelWorkout={cancelNewWorkout}
                    updateWorkout={updateNewWorkout}
                    finishWorkout={finishNewWorkout}
                />
            </BottomSheet>

            <BottomSheet
                hasDraggableIcon
                ref={joinWorkoutBottomSheet}
                height={275}
                sheetBackgroundColor={'#fff'}
                backgroundColor={joinWorkoutBkgColor}
            >
                <JoinWorkoutModal />
            </BottomSheet>

            <View style={styles.body}>
                <View style={{ height: 55 }} />

                <WorkoutDates
                    scheduleWorkout={scheduleWorkout}
                    descheduleWorkout={descheduleWorkout}
                    isPanelVisible={isPanelVisible}
                    selectedDate={panelDate}
                />
                <Panel isVisible={isPanelVisible} onClose={descheduleWorkout} date={panelDate}/>
                <Text style={styles.quick_start_text}>Quick Start</Text>

                <StartWorkoutButton startWorkout={startNewWorkout} />
                <JoinWorkoutButton joinWorkout={() => joinWorkoutBottomSheet.current.show()} />

                <Text style={styles.templates_text}>Templates</Text>
                <DraggableFlatList
                    data={templates}
                    onDragEnd={({ data }) => setTemplates(data)}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    ListFooterComponent={<View style={{ height: templates.length * 90 }} />}
                    showsVerticalScrollIndicator={false}
                />
            </View>

            <Footer navigation={navigation} currentScreenName={'Workout'} />
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: '#fff',
        paddingHorizontal: 4
    },
    body: {
        flex: 1,
        paddingTop: 100
    },
    quick_start_text: {
        marginTop: 24,
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 16,
        paddingBottom: 8,
        paddingHorizontal: 14,
    },
    templates_text: {
        marginTop: 24,
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 16,
        paddingBottom: 6,
        paddingHorizontal: 14
    },
});
