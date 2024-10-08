import { View, StyleSheet, Text, Pressable, Image, Animated, Dimensions } from "react-native";
import { useState, useEffect, useRef, memo } from "react";
import ViewWorkoutSetRow from "./ViewWorkoutSetRow";

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // Scaling factor based on iPhone 13 height

const scaledSize = (size) => Math.round(size * scale);

const ViewWorkoutExerciseLog = memo(({ name, muscle, sets }) => {
    const previousSetsRef = useRef([]);

    useEffect(() => {
        if (global.userData.statsExercises && global.userData.statsExercises[name]) {
            const exerciseSets = global.userData.statsExercises[name].sets;
            const lastWid = exerciseSets[exerciseSets.length - 1]?.wid;

            const matchingSets = [];

            for (let i = exerciseSets.length - 1; i >= 0; i--) {
                if (exerciseSets[i].wid === lastWid) {
                    matchingSets.push(exerciseSets[i]);
                } else {
                    break;
                }
            }

            previousSetsRef.current = matchingSets;
        }
    }, [name]);

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
        marginTop: scaledSize(16),
        marginBottom: scaledSize(6),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: scaledSize(20),
        paddingBottom: scaledSize(10),
        marginHorizontal: scaledSize(2.5),
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
        marginRight: scaledSize(10),
    },
    exercise_text: {
        fontFamily: 'Mulish_800ExtraBold',
        color: '#0699FF',
        fontSize: scaledSize(15),
        flexShrink: 1,
    },
    muscle_ctnr: {
        borderRadius: scaledSize(15),
        height: scaledSize(23.5),
        paddingHorizontal: scaledSize(12),
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: scaledSize(5),
    },
    muscle_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: scaledSize(12),
        color: '#fff'
    },
    pfpContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 'auto',
        marginRight: scaledSize(10),
        opacity: 0.4
    },
    pfp: {
        width: scaledSize(34),
        aspectRatio: 1,
        borderRadius: scaledSize(20),
        borderWidth: scaledSize(2),
        borderColor: '#f4f4f4',
    },
    pfpOverlap: {
        marginLeft: scaledSize(-24),
    },
    labels: {
        flexDirection: 'row',
        paddingBottom: scaledSize(5),
        marginHorizontal: scaledSize(2.5),
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
        fontSize: scaledSize(14),
    },
});
