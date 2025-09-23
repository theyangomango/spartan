import React, { memo, useState } from 'react';
import { Pressable, TouchableOpacity, StyleSheet, Text, View, Dimensions } from 'react-native';
import scaleSize from '../../../../helper/scaleSize';
// import { Ionicons } from '@expo/vector-icons';
import ExerciseImagePreview from './ExerciseImagePreview';

const { height: screenHeight } = Dimensions.get('window');
const scaledSize = (size) => scaleSize(size);

const ACCENTS = ["#4FA6FF", "#F7B646", "#2DD4AE", "#F87171", "#A78BFA", "#38CFFF"]; // [blue, amber, teal, coral, violet, cyan]
const MUSCLE_ACCENT = {
    Chest: "#F87171",
    Back: "#38CFFF",
    Shoulders: "#F7B646",
    Arms: "#A78BFA",
    Legs: "#2DD4AE",
    Abs: "#4FA6FF",
};
const hexToRgb = (hex) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return { r: 45, g: 158, b: 255 };
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
};
const rgba = (hex, a) => { const { r, g, b } = hexToRgb(hex); return `rgba(${r}, ${g}, ${b}, ${a})`; };

const COLORS = {
    cardBg: '#29313eff',
    text: '#F7F9FF',
    subtext: '#BCC8DE',
    accent: '#7FD1FF',
    hairline: 'rgba(120, 198, 255, 0.45)',
    statBg: '#253F66',
    statBorder: 'rgba(122, 196, 255, 0.38)',
    selectedBg: 'rgba(102, 202, 255, 0.32)',
    pillText: '#F3F7FF',
};

const ExerciseCard = memo(({ name, muscleGroup, selectExercise, deselectExercise, showExerciseInfo, userStats, touchable = false }) => {
    const [isSelected, setIsSelected] = useState(false);

    const lastDone = userStats && Array.isArray(userStats.sets) && userStats.sets.length ? userStats.sets[userStats.sets.length - 1].date : 'N/A';
    const timesCompleted = userStats && Array.isArray(userStats.sets) ? userStats.sets.length : '';

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
                                    { backgroundColor: rgba(ACC, 0.75), borderColor: rgba(ACC, 0.42) }
                                ]}>
                                    <Text style={[styles.muscle_text, { color: COLORS.pillText }]}>{muscleGroup}</Text>
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
        paddingLeft: scaleSize(scaledSize(20)),
        paddingRight: scaleSize(scaledSize(18)),
        justifyContent: 'space-between',
        backgroundColor: COLORS.cardBg,
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    border: {
        position: 'absolute',
        bottom: 0,
        left: scaleSize(scaledSize(13)),
        right: scaleSize(scaledSize(13)),
        height: scaleSize(scaledSize(1)),
        backgroundColor: COLORS.hairline,
    },
    textContainer: {
        flexDirection: 'column',
        paddingVertical: scaleSize(scaledSize(8)),
        justifyContent: 'center',
        flex: 1,
        paddingLeft: scaleSize(scaledSize(10)),
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    selected: { backgroundColor: COLORS.selectedBg },
    exerciseName: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(15),
        color: COLORS.text,
        marginVertical: scaleSize(scaledSize(3)),
        flexWrap: 'wrap',
    },
    muscle_ctnr: {
        borderRadius: scaleSize(scaledSize(999)),
        paddingHorizontal: scaleSize(scaledSize(12)),
        height: scaleSize(scaledSize(22)),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.statBg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.statBorder,
    },
    muscle_text: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(12),
        color: COLORS.pillText,
    },
    lastDone: {
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(12.5),
        color: COLORS.subtext,
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: scaleSize(scaledSize(10)),
    },
    timesCompleted: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(14.5),
        marginRight: scaleSize(scaledSize(8)),
        color: COLORS.accent,
    },
});
