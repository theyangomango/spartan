import React, { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ExerciseImagePreview from '../../3_Workout/NewWorkout/SelectExercise/ExerciseImagePreview';

const ExerciseCard = memo(({ name, muscleGroup, selectExercise, showExerciseInfo, userStats }) => {

    const lastDone = userStats ? userStats.sets[userStats.sets.length - 1].date : 'N/A';
    const timesCompleted = userStats ? userStats.sets.length : '';

    const muscleColors = {
        Chest: '#FFAFB8',
        Shoulders: '#A1CDEE',
        Arms: '#CBBCFF',
        Back: '#95E0C8',
        Triceps: '#FFD580',
        Legs: '#FFB347',
        Abs: '#FF6961',
        // Add more muscle groups and colors as needed
    };

    return (
        <TouchableOpacity activeOpacity={0.5} onPress={() => selectExercise(name)} style={styles.card}>
            <View style={styles.leftContainer}>
                <ExerciseImagePreview exercise={name} />
                <View style={styles.textContainer}>
                    <Text style={styles.exerciseName}>{name}</Text>
                    <View style={styles.row}>
                        <Text style={styles.lastDone}>{lastDone}</Text>
                        <View style={[styles.muscle_ctnr, { backgroundColor: muscleColors[muscleGroup] || '#ccc' }]}>
                            <Text style={styles.muscle_text}>{muscleGroup}</Text>
                        </View>
                    </View>
                </View>
            </View>
            <View style={styles.rightContainer}>
                <Text style={styles.timesCompleted}>{timesCompleted}</Text>
                <Pressable onPress={() => showExerciseInfo(name)} style={styles.icon_ctnr}>
                    <Ionicons name="information-circle-outline" size={26} color="#2D9EFF" />
                </Pressable>
            </View>
            <View style={styles.border} />
        </TouchableOpacity>
    );
});

export default ExerciseCard;

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        paddingLeft: 15,
        paddingRight: 12,
        justifyContent: 'space-between',
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1, // Ensure leftContainer takes available space
    },
    border: {
        position: 'absolute',
        bottom: 0,
        left: 13,
        right: 13,
        height: 1.5,
        backgroundColor: '#eaeaea',
    },
    textContainer: {
        flexDirection: 'column',
        paddingVertical: 8,
        justifyContent: 'center',
        flex: 1, // Ensure textContainer takes available space
        paddingLeft: 10, // Add padding to avoid overlap with image
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    selected: {
        backgroundColor: '#E1F0FF',
    },
    exerciseName: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 14,
        marginVertical: 3.5,
        flexWrap: 'wrap', // Ensure text wraps
    },
    muscle_ctnr: {
        marginLeft: 5,
        borderRadius: 20,
        paddingHorizontal: 10,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    muscle_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 11,
        color: '#fff',
    },
    lastDone: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 14,
        color: '#999',
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 10, // Add margin to separate from textContainer
    },
    timesCompleted: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 17,
        marginRight: 8,
        color: '#888'
    },
    icon_ctnr: {
        marginTop: 1,
        opacity: 0.3
    }
});
