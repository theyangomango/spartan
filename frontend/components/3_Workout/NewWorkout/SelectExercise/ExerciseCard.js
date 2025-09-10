import React, { memo, useState } from 'react';
import { Pressable, TouchableOpacity, StyleSheet, Text, View, Dimensions } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
import ExerciseImagePreview from './ExerciseImagePreview';

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // Scaling factor based on iPhone 13 height

const scaledSize = (size) => Math.round(size * scale);

const ACCENTS = ["#2D9EFF", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#06B6D4"]; // [blue, amber, green, red, purple, cyan]
const MUSCLE_ACCENT = {
    Chest: "#EF4444",
    Back: "#06B6D4",
    Shoulders: "#F59E0B",
    Arms: "#8B5CF6",
    Legs: "#10B981",
    Abs: "#2D9EFF",
};
const hexToRgb = (hex) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return { r: 45, g: 158, b: 255 };
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
};
const rgba = (hex, a) => { const { r, g, b } = hexToRgb(hex); return `rgba(${r}, ${g}, ${b}, ${a})`; };

const ExerciseCard = memo(({ name, muscleGroup, selectExercise, deselectExercise, showExerciseInfo, userStats, touchable = false }) => {
    const [isSelected, setIsSelected] = useState(false);

    const lastDone = userStats && Array.isArray(userStats.sets) && userStats.sets.length ? userStats.sets[userStats.sets.length - 1].date : 'N/A';
    const timesCompleted = userStats && Array.isArray(userStats.sets) ? userStats.sets.length : '';

    // Dark palette aligned with Competition
    const COLORS = {
        text: '#EAEAEA',
        subtext: '#AEB5C0',
        accent: '#6FB8FF',
        hairline: 'rgba(255,255,255,0.08)',
        statBg: '#1E232C',
        statBorder: 'rgba(255,255,255,0.10)',
        selectedBg: 'rgba(111,184,255,0.08)',
    };

    function toggleSelected() {
        if (isSelected) {
            deselectExercise({ name: name, muscle: muscleGroup });
        } else {
            selectExercise({ name: name, muscle: muscleGroup });
        }
        setIsSelected(!isSelected);
    }

    const Wrapper = touchable ? TouchableOpacity : Pressable;
    const wrapperProps = touchable ? { activeOpacity: 0.6 } : {};
    return (
        <Wrapper {...wrapperProps} onPress={toggleSelected} style={[styles.card, isSelected && styles.selected]}>
            <View style={styles.leftContainer}>
                <ExerciseImagePreview exercise={name} />
                <View style={styles.textContainer}>
                    <Text style={styles.exerciseName}>{name}</Text>
                    <View style={styles.row}>
                        {/* <Text style={styles.lastDone}>{lastDone}</Text> */}
                        {(() => {
                            const ACC = MUSCLE_ACCENT[muscleGroup] || ACCENTS[0];
                            return (
                                <View style={[
                                    styles.muscle_ctnr,
                                    { backgroundColor: rgba(ACC, 0.3), borderColor: rgba(ACC, 0.6) }
                                ]}>
                                    <Text style={[styles.muscle_text, { color: '#EAEAEA' }]}>{muscleGroup}</Text>
                                </View>
                            );
                        })()}
                        </View>
                    </View>
                </View>
            <View style={styles.rightContainer}>
                <Text style={styles.timesCompleted}>{timesCompleted}</Text>
                { /* Info icon hidden for this release
                <Pressable onPress={() => showExerciseInfo?.(name)} style={styles.icon_ctnr}>
                    <Ionicons name="information-circle-outline" size={scaledSize(26)} color="#2D9EFF" />
                </Pressable>
                */}
            </View>
            <View style={styles.border} />
        </Wrapper>
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
        height: scaledSize(1),
        backgroundColor: 'rgba(255,255,255,0.08)',
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
    selected: { backgroundColor: 'rgba(111,184,255,0.08)' },
    exerciseName: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaledSize(15),
        color: '#EAEAEA',
        marginVertical: scaledSize(3),
        flexWrap: 'wrap',
    },
    muscle_ctnr: {
        borderRadius: scaledSize(999),
        paddingHorizontal: scaledSize(12),
        height: scaledSize(22),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1E232C',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    muscle_text: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaledSize(12),
        color: '#EAEAEA',
    },
    lastDone: {
        fontFamily: 'Outfit_500Medium',
        fontSize: scaledSize(12.5),
        color: '#AEB5C0',
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: scaledSize(10),
    },
    timesCompleted: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaledSize(14.5),
        marginRight: scaledSize(8),
        color: '#6FB8FF',
    },
    icon_ctnr: { marginTop: scaledSize(1), opacity: 0.3 },
});
