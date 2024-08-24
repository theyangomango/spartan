import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Text, Pressable, TextInput, Animated, Dimensions } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import RNBounceable from "@freakycoder/react-native-bounceable";
import { exercises } from './EXERCISES';
import ExercisesFlatlist from './ExercisesFlatlist';
import AnimatedButton from './AnimatedButton';

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // Scaling factor based on iPhone 13 height

const scaledSize = (size) => Math.round(size * scale);

export default function SelectExerciseModal({ closeModal, appendExercises }) {
    const selectedExercisesRef = useRef([]);
    const [searchQuery, setSearchQuery] = useState('');
    const opacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.timing(opacity, {
            toValue: selectedExercisesRef.current.length === 0 ? 0.5 : 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [searchQuery]);

    function selectExercise(ex) {
        selectedExercisesRef.current = [...selectedExercisesRef.current, { ...ex }];
        triggerOpacityUpdate();
    }

    function deselectExercise(ex) {
        selectedExercisesRef.current = selectedExercisesRef.current.filter(e => e.name !== ex.name);
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
                    <Ionicons name="search" size={scaledSize(20)} color="#888" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search exercises..."
                        placeholderTextColor="#999"
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
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    outside_pressable: {
        flex: 1,
        width: '100%',
    },
    main_ctnr: {
        width: '94%',
        height: '81%',
        backgroundColor: '#fff',
        borderRadius: scaledSize(20),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaledSize(2) },
        shadowOpacity: 0.8,
        shadowRadius: scaledSize(3),
        paddingTop: scaledSize(10),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: scaledSize(15),
        paddingTop: scaledSize(10),
        paddingBottom: scaledSize(10),
    },
    newButton: {
        backgroundColor: '#e0e0e0',
        paddingHorizontal: scaledSize(20),
        paddingVertical: scaledSize(4.5),
        borderRadius: scaledSize(8),
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.5,
    },
    newButtonText: {
        color: '#333',
        fontFamily: 'Outfit_700Bold',
        fontSize: scaledSize(14),
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e0e0e0',
        borderRadius: scaledSize(8),
        marginHorizontal: scaledSize(15),
        paddingHorizontal: scaledSize(8),
        marginBottom: scaledSize(10),
        alignSelf: 'center',
    },
    searchIcon: {
        marginRight: scaledSize(8),
    },
    searchInput: {
        flex: 1,
        padding: scaledSize(8),
        fontSize: scaledSize(14),
        color: '#333',
        fontFamily: 'Outfit_700Bold',
    },
    filterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: scaledSize(10),
        marginBottom: scaledSize(10),
    },
    filterButton: {
        flex: 1,
        alignItems: 'center',
        padding: scaledSize(5),
        marginHorizontal: scaledSize(5),
        borderRadius: scaledSize(10),
        backgroundColor: '#E1E1E1',
        opacity: 0.5,
    },
    filterButtonText: {
        fontSize: scaledSize(13),
        color: '#333',
        fontFamily: 'Outfit_700Bold',
    },
});
