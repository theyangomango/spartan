import { StyleSheet, View, Text, Pressable, ScrollView, TouchableOpacity } from "react-native";
import ExerciseCard from "./ExerciseCard";
import { Add } from 'iconsax-react-native'
import { Ionicons } from '@expo/vector-icons'
import { useState } from "react";

export default function SelectExerciseModal({ closeModal, appendExercises }) {
    const [selectedExercises, setSelectedExercises] = useState([]);

    function selectExercise(name) {
        setSelectedExercises([...selectedExercises, name]);
    }

    function deselectExercise(name) {
        setSelectedExercises(selectedExercises.filter(exercise => {
            exercise != name
        }));
    }

    function handleFinish() {
        if (selectedExercises.length == 0) return;
        appendExercises(selectedExercises);
        closeModal();
    }

    return (
        <View style={styles.modal_outside}>
            <Pressable onPress={() => closeModal()} style={styles.outside_pressable} />
            <View style={styles.main_ctnr}>
                <View style={styles.header}>
                    <View style={styles.add_icon_ctnr}>
                        <Add size={30} color={'#777'} />
                    </View>
                    <TouchableOpacity onPress={handleFinish} style={styles.done_icon_ctnr}>
                        <Ionicons
                            name="checkmark-done"
                            size={26}
                            color={selectedExercises.length == 0 ? '#777' : '#0699FF'}
                        />
                    </TouchableOpacity>
                </View>
                <ScrollView>
                    <ExerciseCard name={'Lateral Raise'} selectExercise={selectExercise} deselectExercise={deselectExercise} />
                    <ExerciseCard name={'Bench Press'} selectExercise={selectExercise} deselectExercise={deselectExercise} />
                    <ExerciseCard name={'Dumbell Press'} selectExercise={selectExercise} deselectExercise={deselectExercise} />
                    <ExerciseCard name={'Ab Wheel'} selectExercise={selectExercise} deselectExercise={deselectExercise} />
                </ScrollView>
            </View>
            <Pressable onPress={() => closeModal()} style={styles.outside_pressable} />
        </View>
    );
}

const styles = StyleSheet.create({
    modal_outside: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)'
    },
    outside_pressable: {
        flex: 1,
        width: '100%',
    },
    main_ctnr: {
        width: '85%',
        height: '80%',
        backgroundColor: '#fff',
        borderRadius: 20,

        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 3,
        paddingVertical: 10
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 10
    },
    add_icon_ctnr: {
        padding: 3
    },
    done_icon_ctnr: {
        padding: 5
    }
});
