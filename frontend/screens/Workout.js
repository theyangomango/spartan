import React, { useRef, useState } from "react";
import { Text, StyleSheet, View } from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import BottomSheet from "react-native-gesture-bottom-sheet";
import NewWorkoutModal from "../components/workout/new_workout/NewWorkoutModal";
import Footer from "../components/Footer";
import TemplateCard from "../components/workout/TemplateCard";
import StartWorkoutButton from "../components/workout/StartWorkoutButton";
import JoinWorkoutButton from "../components/workout/JoinWorkoutButton";
import initWorkout from "../../backend/initWorkout";
import makeID from "../../backend/helper/makeID";
import eraseDoc from "../../backend/helper/firebase/eraseDoc";
import updateDoc from "../../backend/helper/firebase/updateDoc";
import WorkoutFooter from "../components/workout/WorkoutFooter";
import JoinWorkoutModal from "../components/workout/JoinWorkoutModal";

export default function Workout({ navigation }) {
    const userData = global.userData;
    const [newWorkoutBkgColor, setNewWorkoutBkgColor] = useState('#000');
    const [joinWorkoutBkgColor, setJoinWorkoutBkgColor] = useState('#000');
    const newWorkoutBottomSheet = useRef();
    const joinWorkoutBottomSheet = useRef();
    const [workout, setWorkout] = useState(null);
    global.workout = workout;
    global.openWorkoutModal = (user) => {
        navigation.navigate('Workout', {
            userData: user
        });
        newWorkoutBottomSheet.current.show()
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
                let realHeight2 = Math.max(panY2, 475 - animatedHeight2);
                setJoinWorkoutBkgColor(`rgba(0, 0, 0, ${0.55 - 0.6 * (realHeight2 / 425)})`)
            }, 50);

            return () => {
                clearInterval(interval);
            };
        }, [])
    );

    function showJoinWorkout() {
        joinWorkoutBottomSheet.current.show();
    }

    function startNewWorkout() {
        let newWID = makeID();
        initWorkout(newWID, userData.uid);
        setWorkout({
            wid: newWID,
            creatorUID: userData.uid,
            created: Date.now(),
            users: [],
            exercises: []
        })
        newWorkoutBottomSheet.current.show();
    }

    function updateNewWorkout(workout) {
        updateDoc('workouts', workout.wid, workout);
    }

    function cancelNewWorkout() {
        eraseDoc('workouts', workout.wid);
        closeNewWorkoutModal();
    }

    function finishNewWorkout() {
        setWorkout(null);
        closeNewWorkoutModal();
    }

    function closeNewWorkoutModal() {
        newWorkoutBottomSheet.current.close();
    }

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
                    closeModal={(closeNewWorkoutModal)}
                    cancelWorkout={cancelNewWorkout}
                    updateWorkout={updateNewWorkout}
                    finishWorkout={finishNewWorkout}
                />
            </BottomSheet>

            <BottomSheet
                hasDraggableIcon
                ref={joinWorkoutBottomSheet}
                height={475}
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
                <JoinWorkoutButton joinWorkout={showJoinWorkout} />

                <Text style={styles.subtitle_text}>Templates</Text>
                <TemplateCard />
            </View>

            {workout &&
                <WorkoutFooter userData={userData} />
            }

            <Footer navigation={navigation} currentScreenName={'Workout'}/>
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
