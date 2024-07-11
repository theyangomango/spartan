import { useEffect, useState } from "react";
import { StyleSheet, View, Text, Modal, TouchableOpacity, ScrollView, Pressable } from "react-native";
import millisToMinutesAndSeconds from "../../../helper/milliesToMinutesAndSeconds";
import ProgressBanner from "./ProgressBanner";
import ExerciseLog from "./ExerciseLog";
import SelectExerciseModal from './SelectExerciseModal'
import RNBounceable from "@freakycoder/react-native-bounceable";
import { Weight } from 'iconsax-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function NewWorkoutModal({ workout, setWorkout, closeModal, cancelWorkout, updateWorkout, finishWorkout }) {
    const [selectExerciseModalVisible, setSelectExerciseModalVisible] = useState(false);
    const [timer, setTimer] = useState('0:00');
    const [headerShadow, setHeaderShadow] = useState(false);

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
        for (let exercise of exercises) {
            workout.exercises.push({
                name: exercise,
                sets: []
            });
        }
        updateWorkout(workout);
    }

    function handleScroll(event) {
        const scrollPosition = event.nativeEvent.contentOffset.y;
        if (scrollPosition > 98) {
            setHeaderShadow(true);
        } else {
            setHeaderShadow(false);
        }
    }

    return (
        <View style={styles.main_ctnr}>
            <View style={[styles.header, headerShadow && styles.headerShadow]}>
                <View style={styles.iconWrapper}>
                    <MaterialCommunityIcons name="timer-outline" size={24} color="#0499FE" />
                </View>
                <Text style={styles.header_time_text}>{timer}</Text>
                <TouchableOpacity onPress={finishWorkout} style={styles.finish_btn}>
                    <Text style={styles.finish_btn_text}>Finish</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16} // This ensures the onScroll event is called at a reasonable rate
            >
                <ProgressBanner />
                {
                    workout.exercises.map((ex, index) => (
                        <ExerciseLog name={ex.name} key={index} />
                    ))
                }
                <RNBounceable onPress={showSelectExerciseModal} style={styles.add_exercise_btn}>
                    <Text style={styles.add_exercise_text}>Add Exercises</Text>
                    <Weight size="22" color="#5DBDFF" variant='Bold' />
                </RNBounceable>

                <RNBounceable onPress={cancelWorkout} style={styles.cancel_btn}>
                    <Text style={styles.cancel_btn_text}>Cancel Workout</Text>
                    {/* <Weight size="22" color="#5DBDFF" variant='Bold' /> */}
                </RNBounceable>

                <View style={{height: 150}}></View>
            </ScrollView>

            <Modal
                animationType='fade'
                transparent={true}
                visible={selectExerciseModalVisible}>
                <SelectExerciseModal
                    closeModal={closeSelectExerciseModal}
                    appendExercises={appendExercises}
                />
            </Modal>
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        height: 48,
        paddingHorizontal: 22,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 8,
        backgroundColor: '#fff', // To ensure the shadow is visible
        zIndex: 1, // Make sure the header is above the ScrollView content
    },
    headerShadow: {
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.3,
        // shadowRadius: 5,
        // elevation: 4,
        borderBottomWidth: 2,
        borderBottomColor: '#eaeaea'
    },
    iconWrapper: {
        padding: 6,
        borderRadius: 12,
        backgroundColor: '#E1F0FF',
    },
    header_time_text: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 18,
        color: '#aaa',
        position: 'absolute',
        left: 0,
        right: 0,
        textAlign: 'center'
    },
    finish_btn: {
        width: 80,
        height: 35,
        borderRadius: 12,
        backgroundColor: '#DCFFDA',
        justifyContent: 'center',
        alignItems: 'center'
    },
    finish_btn_text: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 15.5,
        color: '#4ACF59',
    },
    title_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 22,
        paddingTop: 40,
        paddingHorizontal: 22,
    },
    stopwatch_text: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 18,
        color: '#888',
        paddingHorizontal: 22,
    },
    add_exercise_btn: {
        marginHorizontal: 20,
        marginTop: 18,
        height: 35,
        borderRadius: 12,
        backgroundColor: '#E1F0FF',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row'
    },
    add_exercise_text: {
        fontSize: 16,
        fontFamily: 'Outfit_700Bold',
        color: '#0499FE',
        marginRight: 4.5
    },
    cancel_btn: {
        marginHorizontal: 20,
        marginTop: 18,
        height: 35,
        borderRadius: 12,
        backgroundColor: '#FFECEC',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row'
    },
    cancel_btn_text: {
        fontSize: 16,
        fontFamily: 'Outfit_700Bold',
        color: '#F27171',
        marginRight: 4.5
    }
});
