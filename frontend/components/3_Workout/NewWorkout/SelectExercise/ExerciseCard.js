import React, { memo, useState } from 'react';
import { Pressable, TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import scaleSize from '../../../../helper/scaleSize';
// import { Ionicons } from '@expo/vector-icons';
import ExerciseImagePreview from './ExerciseImagePreview';

const scaledSize = (size) => scaleSize(size);

const COLORS = {
    cardBg: '#272c35ff',
    text: '#F7F9FF',
    subtext: '#bcc8de9b',
    accent: '#7FD1FF',
    hairline: 'rgba(93, 104, 113, 0.45)',
    selectedBg: 'rgba(102, 202, 255, 0.32)',
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
                    {/* <Text style={styles.lastDone}>{lastDone}</Text> */}
                    <Text style={styles.muscleGroupText}>{muscleGroup}</Text>
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
        paddingTop: scaleSize(1),
        paddingBottom: scaleSize(4)
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
        // paddingVertical: scaleSize(scaledSize(8)),
        justifyContent: 'center',
        flex: 1,
        paddingLeft: scaleSize(scaledSize(14)),
    },
    selected: { backgroundColor: COLORS.selectedBg },
    exerciseName: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(14),
        color: COLORS.text,
        marginVertical: scaleSize(scaledSize(3)),
        flexWrap: 'wrap',
    },
    muscleGroupText: {
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(12.5),
        color: COLORS.subtext,
        marginTop: scaleSize(scaledSize(2)),
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
