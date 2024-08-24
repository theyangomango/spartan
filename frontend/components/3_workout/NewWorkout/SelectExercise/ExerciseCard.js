import React, { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ExerciseImagePreview from './ExerciseImagePreview';

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // Scaling factor based on iPhone 13 height

const scaledSize = (size) => Math.round(size * scale);

const ExerciseCard = memo(({ name, muscleGroup, selectExercise, deselectExercise, showExerciseInfo, userStats }) => {
    const [isSelected, setIsSelected] = useState(false);

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
    };

    function toggleSelected() {
        if (isSelected) {
            deselectExercise({ name: name, muscle: muscleGroup });
        } else {
            selectExercise({ name: name, muscle: muscleGroup });
        }
        setIsSelected(!isSelected);
    }

    return (
        <Pressable onPress={toggleSelected} style={[styles.card, isSelected && styles.selected]}>
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
                    <Ionicons name="information-circle-outline" size={scaledSize(26)} color="#2D9EFF" />
                </Pressable>
            </View>
            <View style={styles.border} />
        </Pressable>
    );
});

export default ExerciseCard;

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        paddingLeft: scaledSize(20),
        paddingRight: scaledSize(18),
        justifyContent: 'space-between',
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    border: {
        position: 'absolute',
        bottom: 0,
        left: scaledSize(13),
        right: scaledSize(13),
        height: scaledSize(1.5),
        backgroundColor: '#eaeaea',
    },
    textContainer: {
        flexDirection: 'column',
        paddingVertical: scaledSize(8),
        justifyContent: 'center',
        flex: 1,
        paddingLeft: scaledSize(10),
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
        fontSize: scaledSize(14),
        marginVertical: scaledSize(3.5),
        flexWrap: 'wrap',
    },
    muscle_ctnr: {
        marginLeft: scaledSize(5),
        borderRadius: scaledSize(20),
        paddingHorizontal: scaledSize(10),
        height: scaledSize(20),
        alignItems: 'center',
        justifyContent: 'center',
    },
    muscle_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: scaledSize(11),
        color: '#fff',
    },
    lastDone: {
        fontFamily: 'Outfit_500Medium',
        fontSize: scaledSize(14),
        color: '#999',
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: scaledSize(10),
    },
    timesCompleted: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaledSize(17),
        marginRight: scaledSize(8),
        color: '#aaa',
    },
    icon_ctnr: {
        marginTop: scaledSize(1),
        opacity: 0.3,
    },
});
