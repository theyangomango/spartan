import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Text, Pressable, TextInput, Animated } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import RNBounceable from "@freakycoder/react-native-bounceable";
import { exercises } from './EXERCISES';
import ExercisesFlatlist from './ExercisesFlatlist';
import AnimatedButton from './AnimatedButton';

export default function SelectExerciseModal({ closeModal, appendExercises }) {
    const selectedExercisesRef = useRef([]); // Use ref for selected exercises
    const [searchQuery, setSearchQuery] = useState('');
    const opacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.timing(opacity, {
            toValue: selectedExercisesRef.current.length === 0 ? 0.5 : 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [searchQuery]); // Re-trigger animation when search query changes

    function selectExercise(ex) {
        selectedExercisesRef.current = [...selectedExercisesRef.current, { ...ex }];
        triggerOpacityUpdate();
    }

    function deselectExercise(ex) {
        selectedExercisesRef.current = selectedExercisesRef.current.filter(exercise => exercise.name !== ex.name);
        triggerOpacityUpdate();
    }

    function handleFinish() {
        if (selectedExercisesRef.current.length === 0) return;
        appendExercises(selectedExercisesRef.current);
        closeModal();
    }

    function handleSearch(query) {
        setSearchQuery(query);
    }

    function triggerOpacityUpdate() {
        // Force re-render to update opacity
        opacity.setValue(selectedExercisesRef.current.length === 0 ? 0.5 : 1);
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
                    <AnimatedButton
                        opacity={opacity}
                        selectedExercisesLength={selectedExercisesRef.current.length}
                        handleFinish={handleFinish}
                    />
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
                    deselectExercise={deselectExercise}
                />
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
