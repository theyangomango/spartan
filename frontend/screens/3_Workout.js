import React, { useCallback, useRef, useState, useEffect } from "react";
import { Text, StyleSheet, View, TouchableOpacity, Dimensions, Animated, Image } from "react-native";
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
import { Feather } from '@expo/vector-icons';

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
    const [panelZIndex, setPanelZIndex] = useState(0);
    const panelOpacity = useRef(new Animated.Value(0)).current;

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

    const scheduleWorkout = useCallback(() => {
        setPanelZIndex(1);
        Animated.timing(panelOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start(() => setIsPanelVisible(true));
    });

    const descheduleWorkout = useCallback(() => {
        Animated.timing(panelOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setIsPanelVisible(false);
            setPanelZIndex(0);
        });
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
                />
                <Animated.View style={[styles.panel, { opacity: panelOpacity, zIndex: panelZIndex }]}>
                    <View style={styles.panelHeader}>
                        <View style={styles.panelHeaderTextContainer}>
                            <Text style={styles.panelHeaderText}>7/9 Workout</Text>
                            <View style={styles.pfp_ctnr}>
                                <Image
                                    source={{ uri: global.userData.image }}
                                    style={styles.profileImage}
                                />
                            </View>
                        </View>
                        <RNBounceable onPress={descheduleWorkout}>
                            <Feather name="check-circle" size={22} color="#000" />
                        </RNBounceable>
                    </View>
                    <View style={styles.panelButtonsRow}>
                        <RNBounceable style={styles.panelButton}>
                            <Text style={styles.panelButtonText}>Select Template</Text>
                        </RNBounceable>
                        <RNBounceable style={styles.panelButton}>
                            <Text style={styles.panelButtonText}>6:00 - 7:00 PM</Text>
                        </RNBounceable>
                    </View>
                </Animated.View>
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
    panel: {
        position: 'absolute',
        top: 170,
        left: 10,
        right: 10,
        height: 90,
        borderRadius: 15,
        backgroundColor: '#f6f6f6',
        flexDirection: 'column',
        paddingLeft: 10,
        paddingTop: 12,
    },
    panelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 7,
        paddingLeft: 8,
        paddingRight: 14
    },
    panelHeaderTextContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    panelHeaderText: {
        fontSize: 15,
        fontFamily: 'Poppins_600SemiBold',
        marginRight: 8,
    },
    pfp_ctnr: {
        paddingBottom: 2
    },
    profileImage: {
        width: 26,
        aspectRatio: 1,
        borderRadius: 15,
    },
    panelButtonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    panelButton: {
        borderRadius: 12,
        backgroundColor: '#ddd',
        paddingVertical: 8,
        paddingHorizontal: 14,
        marginRight: 6,
    },
    panelButtonText: {
        fontSize: 13,
        fontFamily: 'Inter_600SemiBold'
    },
});
