import { useEffect, useState } from "react";
import { StyleSheet, View, Text, Modal, TouchableOpacity, ScrollView } from "react-native";
import millisToMinutesAndSeconds from "../../../helper/milliesToMinutesAndSeconds";
import ExerciseLog from "./ExerciseLog";
import SelectExerciseModal from "./SelectExerciseModal";

export default function NewWorkoutModal({ workout, setWorkout, closeModal, cancelWorkout, updateWorkout, finishWorkout }) {
    const [selectExerciseModalVisible, setSelectExerciseModalVisible] = useState(false);
    const [timer, setTimer] = useState('0:00');

    useEffect(() => {
        init();
    }, []);

    async function init() {
        setInterval(() => {
            let diff = Date.now() - workout.created;
            setTimer(millisToMinutesAndSeconds(diff));
        }, 1000);
    }

    function showSelectExerciseModal() {
        setSelectExerciseModalVisible(true);
    }

    function closeSelectExerciseModal() {
        setSelectExerciseModalVisible(false);
    }

    function appendExercises(exercises) {
        for (exercise of exercises) {
            workout.exercises.push({
                name: exercise,
                sets: []
            })
        }
        updateWorkout(workout);
    }

    return (
        <ScrollView style={styles.main_ctnr}>
            <Modal
                animationType='fade'
                transparent={true}
                visible={selectExerciseModalVisible}>
                <SelectExerciseModal
                    closeModal={closeSelectExerciseModal}
                    appendExercises={appendExercises}
                />
            </Modal>

            <View style={styles.header}>
                <TouchableOpacity onPress={cancelWorkout} style={styles.cancel_btn}>
                    <Text style={styles.cancel_btn_text}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={finishWorkout} style={styles.finish_btn}>
                    <Text style={styles.finish_btn_text}>Finish</Text>
                </TouchableOpacity>
            </View>

            <View>
                <Text style={styles.title_text}>April 20th Workout</Text>
                <Text style={styles.stopwatch_text}>{timer}</Text>
            </View>

            {
                workout.exercises.map((ex, index) => {
                    return (
                        <ExerciseLog name={ex.name} key={index} />
                    )
                })
            }

            <TouchableOpacity onPress={showSelectExerciseModal} style={styles.add_exercise_btn}>
                <Text style={styles.add_exercise_text}>Add Exercise</Text>
            </TouchableOpacity>
        </ScrollView >
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: '#fff',
        paddingHorizontal: 22,
    },
    header: {
        height: 40,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between'
    },
    cancel_btn: {
        width: 70,
        height: 30,
        borderRadius: 6,
        backgroundColor: '#E34040',
        justifyContent: 'center',
        alignItems: 'center'
    },
    cancel_btn_text: {
        fontFamily: 'Lato_700Bold',
        fontSize: 14,
        color: 'white',
    },
    finish_btn: {
        width: 70,
        height: 30,
        borderRadius: 6,
        backgroundColor: '#51c971',
        justifyContent: 'center',
        alignItems: 'center'
    },
    finish_btn_text: {
        fontFamily: 'Lato_700Bold',
        fontSize: 14,
        color: 'white',
    },
    title_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 22,
        paddingTop: 40
    },
    stopwatch_text: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 18,
        color: '#888'
    },
    add_exercise_btn: {
        width: '100%',
        height: 35,
        marginVertical: 16,
        borderRadius: 15,
        backgroundColor: '#51B8FF',
        justifyContent: 'center',
        alignItems: 'center'
    },
    add_exercise_text: {
        fontSize: 16,
        fontFamily: 'SourceSansPro_600SemiBold',
        color: 'white'
    }
});