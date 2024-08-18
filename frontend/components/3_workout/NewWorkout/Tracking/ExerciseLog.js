import { View, StyleSheet, Text, Pressable, Image, Animated } from "react-native";
import { useState, useEffect, useRef, memo } from "react";
import SetRow from "./SetRow";
import { MaterialCommunityIcons, Entypo } from '@expo/vector-icons';
import RNBounceable from "@freakycoder/react-native-bounceable";
import ExerciseOptionsPanel from "./ExerciseOptionsPanel";

const ExerciseLog = memo(({ name, exerciseIndex, updateSets, sets, replaceExercise, deleteExercise, isDoneState, toggleIsDone }) => {
    const muscle = name === 'Lateral Raise' ? 'Shoulders' : 'Chest';
    const previousSetsRef = useRef([]);

    useEffect(() => {
        if (global.userData.statsExercises && global.userData.statsExercises[name]) {
            const exerciseSets = global.userData.statsExercises[name].sets;
            const lastWid = exerciseSets[exerciseSets.length - 1]?.wid;

            // Initialize previousSetsRef as an empty array
            const matchingSets = [];

            // Iterate from the last element backwards
            for (let i = exerciseSets.length - 1; i >= 0; i--) {
                if (exerciseSets[i].wid === lastWid) {
                    matchingSets.push(exerciseSets[i]);
                } else {
                    break; // Stop if we encounter a different `wid`
                }
            }

            // Update the previousSetsRef with the matched sets
            previousSetsRef.current = matchingSets;
        }
    }, [name]);

    const [isPanelVisible, setIsPanelVisible] = useState(false);
    const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });
    const fadeAnim = useRef(new Animated.Value(1)).current;

    console.log('Exercise Log Render ' + name, { sets });

    const muscleColors = {
        Chest: '#FFAFB8',
        Shoulders: '#A1CDEE',
        Biceps: '#CBBCFF',
        Back: '#95E0C8'
    };

    const togglePanel = (event) => {
        if (isPanelVisible) {
            setIsPanelVisible(false);
        } else {
            setIsPanelVisible(true);
            setPanelPosition({
                top: event.nativeEvent.pageY + 25,
                left: 18
            });
        }
    };

    function addSet() {
        updateSets(exerciseIndex, [...sets, {
            weight: 0,
            reps: 0
        }]);
    }

    function updateSet(index, newSet) {
        const newSets = [...sets];
        newSets[index] = newSet;
        updateSets(exerciseIndex, newSets);
    }

    function deleteSet(index) {
        const newSets = sets.filter((_, i) => i !== index);
        updateSets(exerciseIndex, newSets);
    }

    return (
        <View style={styles.main_ctnr}>
            <ExerciseOptionsPanel
                visible={isPanelVisible}
                onClose={() => {
                    setIsPanelVisible(false);
                }}
                position={panelPosition}
                replaceExercise={() => replaceExercise(exerciseIndex)}
                deleteExercise={() => deleteExercise(exerciseIndex)}
            />
            <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                <Pressable style={styles.nameContainer} onPress={togglePanel}>
                    <Text style={styles.exercise_text} numberOfLines={1}>{name}</Text>
                    <View style={[styles.muscle_ctnr, { backgroundColor: muscleColors[muscle] }]}>
                        <Text style={styles.muscle_text}>{muscle}</Text>
                    </View>
                </Pressable>

                <View style={styles.pfpContainer}>
                    <Image style={styles.pfp} source={{ uri: global.userData.image }} />
                    <Image style={[styles.pfp, styles.pfpOverlap]} source={{ uri: global.userData.image }} />
                    <Image style={[styles.pfp, styles.pfpOverlap]} source={{ uri: global.userData.image }} />
                </View>
            </Animated.View>
            <Animated.View style={[styles.labels, { opacity: fadeAnim }]}>
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
            </Animated.View>
            <Animated.View style={{ opacity: fadeAnim }}>
                {sets.map((set, index) => {
                    return (
                        <SetRow previousSet={previousSetsRef.current[index]} set={set} index={index} key={index} updateSet={updateSet} handleDelete={() => deleteSet(index)} isDone={isDoneState[index]} toggleIsDone={() => toggleIsDone(exerciseIndex, index)}/>
                    );
                })}
            </Animated.View>
            <Animated.View style={[styles.add_set_btn_ctnr, { opacity: fadeAnim }]}>
                <RNBounceable activeOpacity={0.5} onPress={addSet} style={styles.add_set_btn}>
                    <Entypo name="plus" size={18} color={'#000'} />
                    <Text style={styles.add_set_text}>Add Set</Text>
                    <MaterialCommunityIcons name="arm-flex" size={20} color={'#aaa'} />
                </RNBounceable>
            </Animated.View>
        </View>
    );
});

export default ExerciseLog;

const styles = StyleSheet.create({
    main_ctnr: {
        marginTop: 16,
        marginBottom: 6,
        position: 'relative', // To ensure the panel is positioned correctly
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 20,
        paddingBottom: 10,
        marginHorizontal: 2.5,
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
        marginRight: 10,
    },
    exercise_text: {
        fontFamily: 'Mulish_800ExtraBold',
        color: '#0699FF',
        fontSize: 15,
        flexShrink: 1,
    },
    muscle_ctnr: {
        borderRadius: 15,
        height: 23.5,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 5,
    },
    muscle_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 12,
        color: '#fff'
    },
    pfpContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 'auto',
        marginRight: 10,
        opacity: 0.4
    },
    pfp: {
        width: 34,
        aspectRatio: 1,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#f4f4f4',
    },
    pfpOverlap: {
        marginLeft: -24,
    },
    labels: {
        flexDirection: 'row',
        paddingBottom: 5,
        marginHorizontal: 2.5,
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
        fontSize: 14,
    },
    add_set_btn_ctnr: {
        paddingHorizontal: 20,
    },
    add_set_btn: {
        width: '100%',
        marginTop: 8,
        alignSelf: 'center',
        height: 28,
        borderRadius: 20,
        backgroundColor: '#eaeaea',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row'
    },
    add_set_text: {
        fontFamily: 'Outfit_600SemiBold',
        color: '#000',
        fontSize: 15,
        marginLeft: 1,
        marginRight: 5
    }
});
