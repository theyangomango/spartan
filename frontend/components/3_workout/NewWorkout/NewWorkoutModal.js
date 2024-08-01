import React, { useState } from "react";
import { StyleSheet, View, Text, Modal, TouchableOpacity, ScrollView } from "react-native";
import ProgressBanner from "./ProgressBanner";
import ExerciseLog from "./ExerciseLog";
import SelectExerciseModal from './SelectExerciseModal'
import RNBounceable from "@freakycoder/react-native-bounceable";
import { Weight } from 'iconsax-react-native';
import { MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import GroupModal from "./GroupModal";

export default function NewWorkoutModal({ workout, setWorkout, closeModal, cancelWorkout, updateWorkout, finishWorkout, timer }) {
    const [selectExerciseModalVisible, setSelectExerciseModalVisible] = useState(false);
    const [groupModalVisible, setGroupModalVisible] = useState(false);
    const [headerShadow, setHeaderShadow] = useState(false);

    function showSelectExerciseModal() {
        setSelectExerciseModalVisible(true);
    }

    function closeSelectExerciseModal() {
        setSelectExerciseModalVisible(false);
    }

    function showGroupModal() {
        setGroupModalVisible(true);
    }

    function closeGroupModal() {
        setGroupModalVisible(false);
    }

    function appendExercises(exercises) {
        let newWorkout = workout;
        for (let exercise of exercises) {
            newWorkout.exercises.push({
                name: exercise,
                sets: []
            });
        }
        updateWorkout(newWorkout);
    }

    function updateSets(index, newSets) {
        let newWorkout = workout;
        newWorkout.exercises[index].sets = newSets;
        updateWorkout(newWorkout);
    }

    function handleScroll(event) {
        const scrollPosition = event.nativeEvent.contentOffset.y;
        setHeaderShadow(scrollPosition > 98);
    }

    return (
        <View style={styles.main_ctnr}>
            <View style={[styles.header, headerShadow && styles.headerShadow]}>
                <RNBounceable style={styles.iconWrapper}>
                    <MaterialCommunityIcons name="timer-outline" size={24} color="#0499FE" />
                </RNBounceable>
                <Text style={styles.header_time_text}>{timer}</Text>
                <View style={styles.header_right}>
                    <RNBounceable style={styles.group_btn} onPress={showGroupModal}>
                        <FontAwesome name="group" size={17} color="#FFBB3D" />
                    </RNBounceable>
                    <RNBounceable onPress={finishWorkout} style={styles.finish_btn}>
                        <Text style={styles.finish_btn_text}>Finish</Text>
                    </RNBounceable>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                style={styles.scrollview}
            >
                <ProgressBanner />
                {workout.exercises.map((ex, index) => (
                    <ExerciseLog name={ex.name} index={index} key={index} updateSets={updateSets}/>
                ))}
                <RNBounceable onPress={showSelectExerciseModal} style={styles.add_exercise_btn}>
                    <Text style={styles.add_exercise_text}>Add Exercises</Text>
                    <Weight size="22" color="#5DBDFF" variant='Bold' />
                </RNBounceable>

                <RNBounceable onPress={cancelWorkout} style={styles.cancel_btn}>
                    <Text style={styles.cancel_btn_text}>Cancel Workout</Text>
                </RNBounceable>

                <View style={{ height: 150 }} />
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

            <Modal
                animationType='fade'
                transparent={true}
                visible={groupModalVisible}
                onRequestClose={closeGroupModal}
            >
                <GroupModal closeGroupModal={closeGroupModal}/>
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
        paddingBottom: 6,
        paddingHorizontal: 22,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        zIndex: 1,
    },
    headerShadow: {
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
        top: 5,
        textAlign: 'center'
    },
    header_right: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    group_btn: {
        width: 35,
        height: 35,
        borderRadius: 12,
        backgroundColor: '#FFE8BC',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    finish_btn: {
        width: 80,
        height: 35,
        borderRadius: 12,
        backgroundColor: '#DCFFE3',
        justifyContent: 'center',
        alignItems: 'center'
    },
    finish_btn_text: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 15.5,
        color: '#40D99B',
    },
    scrollview: {
        paddingTop: 5
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
    },
});

