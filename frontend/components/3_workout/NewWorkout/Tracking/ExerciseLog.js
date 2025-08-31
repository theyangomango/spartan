import React, { useState, useEffect, useRef, memo } from "react";
import { View, StyleSheet, Text, Pressable, Animated, Dimensions } from "react-native";
import { MaterialCommunityIcons, Entypo } from "@expo/vector-icons";
import RNBounceable from "@freakycoder/react-native-bounceable";
import SetRow from "./SetRow";
import ExerciseOptionsPanel from "./ExerciseOptionsPanel";

const { height: screenHeight } = Dimensions.get("window");
const scale = screenHeight / 844;
const scaledSize = (size) => Math.round(size * scale);

const ExerciseLog = memo(function ExerciseLog({
    name,
    muscle,
    exerciseIndex,
    updateSets,
    sets,
    replaceExercise,
    deleteExercise,
    isDoneState,
    toggleIsDone,
    userWorkoutStats,
    readOnly = false, // ← passed from NewWorkoutModal when viewing a friend
}) {
    const previousSetsRef = useRef([]);
    useEffect(() => {
        if (userWorkoutStats && userWorkoutStats[name]) {
            const exerciseSets = userWorkoutStats[name].sets || [];
            const lastWid = exerciseSets[exerciseSets.length - 1]?.wid;
            const matching = [];
            for (let i = exerciseSets.length - 1; i >= 0; i--) {
                if (exerciseSets[i].wid === lastWid) matching.push(exerciseSets[i]);
                else break;
            }
            previousSetsRef.current = matching;
        }
    }, [name, userWorkoutStats]);

    const [isPanelVisible, setIsPanelVisible] = useState(false);
    const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const muscleColors = {
        Chest: "#FFAFB8",
        Shoulders: "#A1CDEE",
        Arms: "#CBBCFF",
        Back: "#95E0C8",
        Triceps: "#FFD580",
        Legs: "#FFB347",
        Abs: "#FF6961",
    };

    const togglePanel = (event) => {
        if (readOnly) return; // block in viewing mode
        if (isPanelVisible) setIsPanelVisible(false);
        else {
            setIsPanelVisible(true);
            setPanelPosition({
                top: event?.nativeEvent?.pageY + 25,
                left: scaledSize(18),
            });
        }
    };

    function addSet() {
        updateSets(exerciseIndex, [
            ...sets,
            { weight: 0, reps: 0, isDone: false },
        ]);
    }
    function updateSet(index, newSet) {
        const next = [...sets];
        next[index] = newSet;
        updateSets(exerciseIndex, next);
    }
    function deleteSetAt(index) {
        const next = sets.filter((_, i) => i !== index);
        updateSets(exerciseIndex, next);
    }

    return (
        <View style={styles.main_ctnr}>
            {/* Only mount options panel when editable */}
            {!readOnly && (
                <ExerciseOptionsPanel
                    visible={isPanelVisible}
                    onClose={() => setIsPanelVisible(false)}
                    position={panelPosition}
                    replaceExercise={() => replaceExercise(exerciseIndex)}
                    deleteExercise={() => deleteExercise(exerciseIndex)}
                />
            )}

            <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                <Pressable
                    style={styles.nameContainer}
                    onPress={togglePanel}
                    disabled={readOnly}
                >
                    <Text style={styles.exercise_text} numberOfLines={1}>{name}</Text>
                    <View style={[styles.muscle_ctnr, { backgroundColor: muscleColors[muscle] || "#CBD5E1" }]}>
                        <Text style={styles.muscle_text}>{muscle}</Text>
                    </View>
                </Pressable>
            </Animated.View>

            <Animated.View style={[styles.labels, { opacity: fadeAnim }]}>
                <View style={styles.set_col}><Text style={styles.label_text}>Set</Text></View>
                <View style={styles.prev_col}><Text style={styles.label_text}>Previous</Text></View>
                <View style={styles.w_col}><Text style={styles.label_text}>lbs</Text></View>
                <View style={styles.r_col}><Text style={styles.label_text}>Reps</Text></View>
            </Animated.View>

            <Animated.View style={{ opacity: fadeAnim }}>
                {sets.map((set, index) => (
                    <SetRow
                        key={index}
                        previousSet={previousSetsRef.current[index]}
                        set={set}
                        index={index}
                        updateSet={updateSet}
                        handleDelete={() => deleteSetAt(index)}
                        isDone={isDoneState[index]}
                        toggleIsDone={() => toggleIsDone(exerciseIndex, index)}
                        readOnly={readOnly}            // ← NEW: pass through
                    />
                ))}
            </Animated.View>

            {/* Hide “Add Set” in read-only */}
            {!readOnly && (
                <Animated.View style={[styles.add_set_btn_ctnr, { opacity: fadeAnim }]}>
                    <RNBounceable activeOpacity={0.5} onPress={addSet} style={styles.add_set_btn}>
                        <Entypo name="plus" size={scaledSize(18)} color="#000" />
                        <Text style={styles.add_set_text}>Add Set</Text>
                        <MaterialCommunityIcons name="arm-flex" size={scaledSize(20)} color="#aaa" />
                    </RNBounceable>
                </Animated.View>
            )}
        </View>
    );
});

export default ExerciseLog;

const styles = StyleSheet.create({
    main_ctnr: { marginTop: scaledSize(16), marginBottom: scaledSize(6), position: "relative" },
    header: { flexDirection: "row", alignItems: "center", paddingLeft: scaledSize(20), paddingBottom: scaledSize(10), marginHorizontal: scaledSize(2.5) },
    nameContainer: { flexDirection: "row", alignItems: "center", flexShrink: 1, marginRight: scaledSize(10) },
    exercise_text: { fontFamily: "Mulish_800ExtraBold", color: "#0699FF", fontSize: scaledSize(15), flexShrink: 1 },
    muscle_ctnr: { borderRadius: scaledSize(15), height: scaledSize(23.5), paddingHorizontal: scaledSize(12), alignItems: "center", justifyContent: "center", marginLeft: scaledSize(5) },
    muscle_text: { fontFamily: "Poppins_700Bold", fontSize: scaledSize(12), color: "#fff" },
    labels: { flexDirection: "row", paddingBottom: scaledSize(5), marginHorizontal: scaledSize(2.5) },
    set_col: { marginLeft: "5%", width: "8%", alignItems: "center" },
    prev_col: { width: "38%", alignItems: "center" },
    w_col: { width: "18%", alignItems: "center" },
    r_col: { width: "18%", alignItems: "center" },
    label_text: { fontFamily: "Mulish_800ExtraBold", fontSize: scaledSize(14) },
    add_set_btn_ctnr: { paddingHorizontal: scaledSize(20) },
    add_set_btn: { width: "100%", marginTop: scaledSize(8), alignSelf: "center", height: scaledSize(28), borderRadius: scaledSize(20), backgroundColor: "#eaeaea", justifyContent: "center", alignItems: "center", flexDirection: "row" },
    add_set_text: { fontFamily: "Outfit_600SemiBold", color: "#000", fontSize: scaledSize(15), marginLeft: scaledSize(1), marginRight: scaledSize(5) },
});
