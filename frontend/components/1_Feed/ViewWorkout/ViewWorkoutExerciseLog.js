import { View, StyleSheet, Text, Pressable, Image, Animated, Dimensions } from "react-native";
import scaleSize from '../../../helper/scaleSize';
import { useState, useEffect, useRef, memo } from "react";
import ViewWorkoutSetRow from "./ViewWorkoutSetRow";

const { height: screenHeight } = Dimensions.get('window');
const scaledSize = (size) => scaleSize(size);

const ViewWorkoutExerciseLog = memo(({ name, muscle, sets, userStats }) => {
    const previousSetsRef = useRef([]);

    useEffect(() => {
        const stats = userStats || {};
        if (stats && stats[name]) {
            const exerciseSets = Array.isArray(stats[name].sets) ? stats[name].sets : [];
            const lastWid = exerciseSets.length ? exerciseSets[exerciseSets.length - 1]?.wid : null;
            const matchingSets = [];
            for (let i = exerciseSets.length - 1; i >= 0; i--) {
                if (!lastWid || exerciseSets[i].wid !== lastWid) break;
                matchingSets.push(exerciseSets[i]);
            }
            previousSetsRef.current = matchingSets;
        }
    }, [name, userStats]);

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
        <View style={styles.main_ctnr}>
            <View style={[styles.header]}>
                <View style={styles.nameContainer}>
                    <Text style={styles.exercise_text} numberOfLines={1}>{name}</Text>
                    <View style={[styles.muscle_ctnr, { backgroundColor: muscleColors[muscle] }]}>
                        <Text style={styles.muscle_text}>{muscle}</Text>
                    </View>
                </View>

                <View style={styles.pfpContainer}>
                    <Image style={styles.pfp} source={{ uri: global.userData.image }} />
                    <Image style={[styles.pfp, styles.pfpOverlap]} source={{ uri: global.userData.image }} />
                    <Image style={[styles.pfp, styles.pfpOverlap]} source={{ uri: global.userData.image }} />
                </View>
            </View>
            <View style={[styles.labels]}>
                <View style={styles.set_ctnr}>
                    <Text style={styles.label_text}>Set</Text>
                </View>
                <View style={styles.previous_ctnr}>
                    <Text style={styles.label_text}>Previous</Text>
                </View>
                <View style={styles.weight_unit_ctnr}>
                    <Text style={styles.label_text}>lbs</Text>
                </View>
                <View style={styles.reps_ctnr}>
                    <Text style={styles.label_text}>Reps</Text>
                </View>
            </View>
            <View>
                {sets.map((set, index) => (
                    <ViewWorkoutSetRow 
                        key={index}
                        previousSet={previousSetsRef.current[index]}
                        set={set}
                        index={index}
                        // isDone={isDoneState[index]} 
                        isDone={true}
                    />
                ))}
            </View>
        </View>
    );
});

export default ViewWorkoutExerciseLog;

const styles = StyleSheet.create({
    main_ctnr: {
        marginTop: scaleSize(scaledSize(16)),
        marginBottom: scaleSize(scaledSize(6)),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: scaleSize(scaledSize(20)),
        paddingBottom: scaleSize(scaledSize(10)),
        marginHorizontal: scaleSize(scaledSize(2.5)),
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
        marginRight: scaleSize(scaledSize(10)),
    },
    exercise_text: {
        fontFamily: 'Mulish_800ExtraBold',
        color: '#0699FF',
        fontSize: scaleSize(15),
        flexShrink: 1,
    },
    muscle_ctnr: {
        borderRadius: scaleSize(scaledSize(15)),
        height: scaleSize(scaledSize(23.5)),
        paddingHorizontal: scaleSize(scaledSize(12)),
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: scaleSize(scaledSize(5)),
    },
    muscle_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: scaleSize(12),
        color: '#fff'
    },
    pfpContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 'auto',
        marginRight: scaleSize(scaledSize(10)),
        opacity: 0.4
    },
    pfp: {
        width: scaleSize(scaledSize(34)),
        aspectRatio: 1,
        borderRadius: scaleSize(scaledSize(20)),
        borderWidth: scaleSize(scaledSize(2)),
        borderColor: '#f4f4f4',
    },
    pfpOverlap: {
        marginLeft: scaleSize(scaledSize(-24)),
    },
    labels: {
        flexDirection: 'row',
        paddingBottom: scaleSize(scaledSize(5)),
        marginHorizontal: scaleSize(scaledSize(2.5)),
    },
    set_ctnr: {
        marginLeft: '5%',
        width: '8%',
        alignItems: 'center'
    },
    previous_ctnr: {
        width: '38%',
        alignItems: 'center',
    },
    weight_unit_ctnr: {
        width: '18%',
        alignItems: 'center',
    },
    reps_ctnr: {
        width: '18%',
        alignItems: 'center',
    },
    label_text: {
        fontFamily: 'Mulish_800ExtraBold',
        fontSize: scaleSize(14),
    },
});
