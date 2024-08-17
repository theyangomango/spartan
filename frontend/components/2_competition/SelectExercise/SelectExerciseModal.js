import React, { useState, useEffect, useRef, memo } from "react";
import { StyleSheet, View, Text, Pressable, TextInput, Animated } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import RNBounceable from "@freakycoder/react-native-bounceable";
import ExercisesFlatlist from './ExercisesFlatlist';
import { exercises } from "../../3_Workout/NewWorkout/SelectExercise/EXERCISES";

const SelectExerciseModal = memo(({ closeModal, setComparedExercise }) => {
    const [searchQuery, setSearchQuery] = useState('');

    function selectExercise(name) {
        closeModal();
        setComparedExercise(name);
    }

    function handleSearch(query) {
        setSearchQuery(query);
    }

    const filteredExercises = exercises.filter(exercise =>
        exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <View style={styles.modal_outside}>
            <Pressable onPress={closeModal} style={styles.outside_pressable} />
            <View style={styles.main_ctnr}>
                <View style={styles.header}>
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
                <ExercisesFlatlist
                    exercises={filteredExercises}
                    selectExercise={selectExercise}
                />
            </View>
            <Pressable onPress={closeModal} style={styles.outside_pressable} />
        </View>
    );
});

export default SelectExerciseModal;

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
        paddingTop: 5
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
        backgroundColor: '#E1E1E1',
        opacity: 0.5
    },
    filterButtonText: {
        fontSize: 13,
        color: '#333',
        fontFamily: 'Outfit_700Bold'
    }
});
