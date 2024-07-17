import { StyleSheet, View, Text, Pressable, ScrollView, TouchableOpacity, TextInput } from "react-native";
import ExerciseCard from "./ExerciseCard";
import { Add } from 'iconsax-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from "react";

export default function SelectExerciseModal({ closeModal, appendExercises }) {
    const [selectedExercises, setSelectedExercises] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    const exercises = [
        { name: 'Lateral Raise', muscleGroup: 'Shoulders' },
        { name: 'Bench Press', muscleGroup: 'Chest' },
        { name: 'Dumbell Press', muscleGroup: 'Chest' },
        { name: 'Ab Wheel', muscleGroup: 'Abs' },
        // Add more exercises as needed
    ];

    function selectExercise(name) {
        setSelectedExercises([...selectedExercises, name]);
    }

    function deselectExercise(name) {
        setSelectedExercises(selectedExercises.filter(exercise => exercise !== name));
    }

    function handleFinish() {
        if (selectedExercises.length === 0) return;
        appendExercises(selectedExercises);
        closeModal();
    }

    function handleSearch(query) {
        setSearchQuery(query);
    }

    const filteredExercises = exercises.filter(exercise =>
        exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                            color={selectedExercises.length === 0 ? '#777' : '#0699FF'}
                        />
                    </TouchableOpacity>
                </View>
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search exercises..."
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                </View>
                <View style={styles.filterContainer}>
                    <TouchableOpacity style={styles.filterButton}>
                        <Text style={styles.filterButtonText}>Any Body Part</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.filterButton}>
                        <Text style={styles.filterButtonText}>Any Category</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView>
                    {filteredExercises.map((exercise, index) => (
                        <ExerciseCard
                            key={index}
                            name={exercise.name}
                            muscleGroup={exercise.muscleGroup}
                            selectExercise={selectExercise}
                            deselectExercise={deselectExercise}
                        />
                    ))}
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
        width: '92%',
        height: '81%',
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
    },
    searchContainer: {
        paddingHorizontal: 10,
        marginVertical: 10
    },
    searchInput: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10
    },
    filterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 10,
        marginBottom: 10
    },
    filterButton: {
        flex: 1,
        alignItems: 'center',
        padding: 10,
        marginHorizontal: 5,
        borderRadius: 5,
        backgroundColor: '#E1E1E1'
    },
    filterButtonText: {
        fontSize: 16,
        color: '#333'
    }
});
