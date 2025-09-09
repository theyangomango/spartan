import React, { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ExerciseImagePreview from '../../3_Workout/NewWorkout/SelectExercise/ExerciseImagePreview';

// Small helpers to make semi-transparent accent backgrounds
const hexToRgb = (hex) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return { r: 45, g: 158, b: 255 };
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
};
const rgba = (hex, a) => { const { r, g, b } = hexToRgb(hex); return `rgba(${r}, ${g}, ${b}, ${a})`; };

const ExerciseCard = memo(({ name, muscleGroup, selectExercise, showExerciseInfo, userStats }) => {

    const setsArr = Array.isArray(userStats?.sets) ? userStats.sets : [];
    const lastDone = setsArr.length ? (setsArr[setsArr.length - 1]?.date || 'N/A') : 'N/A';
    const timesCompleted = setsArr.length ? setsArr.length : '';

    // Use strong accent colors for high-contrast pills (aligns with Workout selector)
    const MUSCLE_ACCENT = {
        Chest: '#EF4444',
        Back: '#06B6D4',
        Shoulders: '#F59E0B',
        Arms: '#8B5CF6',
        Legs: '#10B981',
        Abs: '#2D9EFF',
        Triceps: '#8B5CF6',
        Biceps: '#8B5CF6',
        Forearms: '#8B5CF6',
        Glutes: '#10B981',
        Quads: '#10B981',
        Hamstrings: '#10B981',
        Calves: '#10B981',
        'Full Body': '#2D9EFF',
    };

    return (
        <TouchableOpacity activeOpacity={0.65} onPress={() => selectExercise(name)} style={styles.card}>
            <View style={styles.leftContainer}>
                <ExerciseImagePreview exercise={name} />
                <View style={styles.textContainer}>
                    <Text style={styles.exerciseName} numberOfLines={2}>{name}</Text>
                    <View style={styles.row}>
                        <Text style={styles.lastDone}>{lastDone}</Text>
                        {(() => {
                            const ACC = MUSCLE_ACCENT[muscleGroup] || '#2D9EFF';
                            return (
                                <View style={[styles.muscle_ctnr, { backgroundColor: rgba(ACC, 0.22), borderColor: rgba(ACC, 0.45), borderWidth: StyleSheet.hairlineWidth }]}>
                                    <Text style={styles.muscle_text}>{muscleGroup}</Text>
                                </View>
                            );
                        })()}
                        
                    </View>
                </View>
            </View>
            <View style={styles.rightContainer}>
                <Text style={styles.timesCompleted}>{timesCompleted}</Text>
                <Pressable onPress={() => { try { showExerciseInfo?.(name); } catch {} }} style={styles.icon_ctnr}>
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
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.08)',
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
        fontFamily: 'Outfit_700Bold',
        fontSize: 15,
        color: '#EAEAEA',
        marginVertical: 3,
        flexWrap: 'wrap',
    },
    muscle_ctnr: {
        marginLeft: 6,
        borderRadius: 999,
        paddingHorizontal: 12,
        height: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    muscle_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 12,
        color: '#EAEAEA',
    },
    lastDone: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 12.5,
        color: '#AEB5C0',
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 10, // Add margin to separate from textContainer
    },
    timesCompleted: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 16,
        marginRight: 8,
        color: '#6FB8FF'
    },
    icon_ctnr: {
        marginTop: 1,
        opacity: 0.5
    }
});
