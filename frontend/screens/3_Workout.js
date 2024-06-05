import React, { useRef, useState } from "react";
import { Text, StyleSheet, View, ScrollView } from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import BottomSheet from "react-native-gesture-bottom-sheet";
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

export default function Workout({ navigation }) {
    const [workout, setWorkout] = useState(null);
    const newWorkoutBottomSheet = useRef();
    const joinWorkoutBottomSheet = useRef();
    const [newWorkoutBkgColor, setNewWorkoutBkgColor] = useState('#000');
    const [joinWorkoutBkgColor, setJoinWorkoutBkgColor] = useState('#000');

    const userData = global.userData;
    global.openWorkoutModal = (user) => {
        navigation.navigate('Workout');
        newWorkoutBottomSheet.current.show()
    }

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

    useFocusEffect(
        React.useCallback(() => {
            const interval = setInterval(() => {
                let panY1 = parseInt(JSON.stringify(newWorkoutBottomSheet.current.state.pan.y));
                let animatedHeight1 = parseInt(JSON.stringify(newWorkoutBottomSheet.current.state.animatedHeight));
                let realHeight1 = Math.max(panY1, 1100 - animatedHeight1);
                setNewWorkoutBkgColor(`rgba(0, 0, 0, ${0.7 - 0.75 * (realHeight1 / 800)})`)

                let panY2 = parseInt(JSON.stringify(joinWorkoutBottomSheet.current.state.pan.y));
                let animatedHeight2 = parseInt(JSON.stringify(joinWorkoutBottomSheet.current.state.animatedHeight));
                let realHeight2 = Math.max(panY2, 325 - animatedHeight2);
                setJoinWorkoutBkgColor(`rgba(0, 0, 0, ${0.55 - 0.6 * (realHeight2 / 275)})`)
            }, 50);

            return () => {
                clearInterval(interval);
            };
        }, [])
    );

    return (
        <View style={styles.main_ctnr}>
            <BottomSheet
                hasDraggableIcon
                ref={newWorkoutBottomSheet}
                height={800}
                sheetBackgroundColor={'#fff'}
                backgroundColor={newWorkoutBkgColor}
            // Todo edit draggable option to allow scrolling
            // draggable={false} 
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
            // Todo edit draggable option to allow scrolling
            // draggable={false} 
            >
                <JoinWorkoutModal />
            </BottomSheet>


            <View style={styles.body}>
                <Text style={styles.title_text}>Workouts</Text>
                <StartWorkoutButton startWorkout={startNewWorkout} />
                <JoinWorkoutButton joinWorkout={() => joinWorkoutBottomSheet.current.show()} />

                <Text style={styles.subtitle_text}>Templates</Text>
                <ScrollView>
                    <TemplateCard />
                    <TemplateCard />
                </ScrollView>
            </View>

            {workout &&
                <WorkoutFooter userData={userData} />
            }

            <Footer navigation={navigation} currentScreenName={'Workout'} />
        </View>
    );
};

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: '#fff'
    },
    body: {
        flex: 1,
        paddingHorizontal: 18,
        marginTop: 60
    },
    title_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 22,
        paddingHorizontal: 4,
        paddingBottom: 6
    },
    subtitle_text: {
        marginTop: 24,
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 18,
        paddingHorizontal: 4,
        paddingBottom: 6
    }
});
