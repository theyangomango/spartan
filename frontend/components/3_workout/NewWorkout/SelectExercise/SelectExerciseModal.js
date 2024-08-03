import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Text, Pressable, ScrollView, TextInput, Animated } from "react-native";
import ExerciseCard from "./ExerciseCard";
import { Ionicons } from '@expo/vector-icons';
import RNBounceable from "@freakycoder/react-native-bounceable";

export default function SelectExerciseModal({ closeModal, appendExercises }) {
    const [selectedExercises, setSelectedExercises] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const opacity = useRef(new Animated.Value(1)).current;

    const exercises = [
        { name: 'Standing Tricep Extension (Dumbell)', muscleGroup: 'Shoulders' },
        { name: 'Dumbell Squat', muscleGroup: 'Chest' },
        { name: 'Standing Preacher Curl (Dumbell)', muscleGroup: 'Chest' },
        { name: 'Lateral Raise (Dumbell)', muscleGroup: 'Abs' },
        // Add more exercises as needed
    ];

    useEffect(() => {
        Animated.timing(opacity, {
            toValue: selectedExercises.length === 0 ? 0.5 : 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [selectedExercises]);

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
                    <RNBounceable style={styles.newButton}>
                        <Text style={styles.newButtonText}>New</Text>
                    </RNBounceable>
                    <Animated.View style={{ opacity }}>
                        <RNBounceable onPress={handleFinish} style={styles.addButton}>
                            <Text style={styles.addButtonText}>
                                {`Add${selectedExercises.length > 0 ? ` (${selectedExercises.length})` : ''}`}
                            </Text>
                        </RNBounceable>
                    </Animated.View>
                </View>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search exercises..."
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                </View>
                <View style={styles.filterContainer}>
                    <RNBounceable style={styles.filterButton}>
                        <Text style={styles.filterButtonText}>Any Body Part</Text>
                    </RNBounceable>
                    <RNBounceable style={styles.filterButton}>
                        <Text style={styles.filterButtonText}>All Equipment</Text>
                    </RNBounceable>
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
        width: '94%',
        height: '81%',
        backgroundColor: '#fff',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 3,
        paddingVertical: 10
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingTop: 10,
        paddingBottom: 10
    },
    newButton: {
        backgroundColor: '#e0e0e0',
        paddingHorizontal: 20,
        paddingVertical: 4.5,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center'
    },
    newButtonText: {
        color: '#333',
        fontFamily: 'Outfit_700Bold',
        fontSize: 14,
    },
    addButton: {
        backgroundColor: '#51A9FF',
        paddingHorizontal: 20,
        paddingVertical: 4.5,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center'
    },
    addButtonText: {
        color: '#fff',
        fontFamily: 'Outfit_700Bold',
        fontSize: 14,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e0e0e0',
        borderRadius: 8,
        marginHorizontal: 15,
        paddingHorizontal: 8,
        marginBottom: 10,
        alignSelf: 'center',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        padding: 8,
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
        padding: 5,
        marginHorizontal: 5,
        borderRadius: 10,
        backgroundColor: '#E1E1E1'
    },
    filterButtonText: {
        fontSize: 13,
        color: '#333',
        fontFamily: 'Outfit_700Bold'
    }
});
