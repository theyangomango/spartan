import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ExerciseImagePreview from './ExerciseImagePreview';

export default function ExerciseCard({ name, muscleGroup, lastDone = 'July 13th', timesCompleted = 12, selectExercise, deselectExercise, showExerciseInfo }) {
    const [isSelected, setIsSelected] = useState(false);

    const muscleColors = {
        Chest: '#FFAFB8',
        Shoulders: '#A1CDEE',
        Biceps: '#CBBCFF',
        Back: '#95E0C8',
        Triceps: '#FFD580',
        Legs: '#FFB347',
        Abs: '#FF6961',
        // Add more muscle groups and colors as needed
    };

    function toggleSelected() {
        if (isSelected) {
            deselectExercise(name);
        } else {
            selectExercise(name);
        }
        setIsSelected(!isSelected);
    }

    return (
        <Pressable onPress={toggleSelected} style={[styles.card, isSelected && styles.selected]}>
            <View style={styles.leftContainer}>
                {/* <ExerciseImagePreview exercise={'shrug-dumbell'} /> */}
                <ExerciseImagePreview exercise={'standing-preacher-curl-dumbbell'} />

                <View style={styles.textContainer}>
                    {/* <View style={styles.row}> */}
                        <Text style={styles.exerciseName}>{name}</Text>

                    {/* </View> */}
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
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 66,
        paddingLeft: 12,
        paddingRight: 8,
        // paddingHorizontal: 8,
        justifyContent: 'space-between',
        position: 'relative', // Added to ensure border is positioned relative to the card
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    border: {
        position: 'absolute',
        bottom: 0,
        left: 13,
        right: 13,
        height: 0.7,
        backgroundColor: '#ccc',
    },
    textContainer: {
        flexDirection: 'column', // Changed to column to stack name, muscle group, and last done date
        height: '100%',
        paddingVertical: 10,
        justifyContent: 'center',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    selected: {
        backgroundColor: '#E1F0FF',
    },
    exerciseName: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 16,
        // marginRight: 4, // Added margin to separate from muscle group
        marginLeft: 0.8,
        marginVertical: 5,
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
        fontSize: 10,
        color: '#fff',
    },
    lastDone: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 14,
        color: '#666',
        // marginTop: 2,
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 5,
    },
    timesCompleted: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 19,
        marginRight: 8,
        color: '#888'
    },
    icon_ctnr: {
        marginTop: 1
    }
});
