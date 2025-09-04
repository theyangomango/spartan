// components/3_Workout/NewWorkout/Tracking/ExerciseLog.js
import React, { useState, useEffect, useRef, memo, useCallback } from "react";
import { View, StyleSheet, Text, Pressable, Animated, Dimensions, LayoutAnimation, Platform, UIManager } from "react-native";
import { MaterialCommunityIcons, Entypo } from "@expo/vector-icons";
import RNBounceable from "@freakycoder/react-native-bounceable";
import SetRow from "./SetRow";
import ExerciseOptionsPanel from "./ExerciseOptionsPanel";

const { height: screenHeight } = Dimensions.get("window");
const scale = screenHeight / 844;
const s = (n) => Math.round(n * scale);

// simple debounce
const useDebounced = (fn, delay = 120) => {
    const fnRef = useRef(fn);
    const tRef = useRef(null);
    useEffect(() => { fnRef.current = fn; }, [fn]);
    const schedule = useCallback((...args) => {
        if (tRef.current) clearTimeout(tRef.current);
        tRef.current = setTimeout(() => fnRef.current(...args), delay);
    }, [delay]);
    const flush = useCallback((...args) => {
        if (tRef.current) clearTimeout(tRef.current);
        fnRef.current(...args);
    }, []);
    useEffect(() => () => { if (tRef.current) clearTimeout(tRef.current); }, []);
    return { schedule, flush };
};

function ExerciseLog({
    name,
    muscle,
    exerciseIndex,
    updateSets,          // parent setter
    sets,                // source of truth
    replaceExercise,
    deleteExercise,
    toggleIsDone,        // we’ll still sync this, but via local draft
    userWorkoutStats,
    readOnly = false,
}) {
    // ----- Android layout animation enable -----
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
        try { UIManager.setLayoutAnimationEnabledExperimental(true); } catch { }
    }

    // ----- Local draft to avoid parent churn on every keystroke -----
    const [draft, setDraft] = useState(() => Array.isArray(sets) ? sets : []);
    const setsRef = useRef(draft);
    useEffect(() => { setsRef.current = draft; }, [draft]);

    // When parent changes (e.g., from other device / commit), refresh draft
    useEffect(() => {
        const b = Array.isArray(sets) ? sets : [];
        if (readOnly) {
            // Viewer mode: always mirror latest sets so spectators see updates instantly
            setDraft(b);
            return;
        }
        // Editor mode: shallow compare by length + ids to avoid blowing away in-progress typing
        const a = setsRef.current || [];
        const equalLength = a.length === b.length;
        const idsEqual = equalLength && a.every((x, i) => (x?.id || i) === (b[i]?.id || i));
        if (!equalLength || !idsEqual) setDraft(b);
    }, [sets, readOnly]);

    // Debounced parent sync
    const { schedule: scheduleSync, flush: flushSync } = useDebounced(
        (payload) => updateSets(exerciseIndex, payload),
        120
    );

    // Ensure we don’t drop the last few edits
    useEffect(() => () => { flushSync(setsRef.current); }, [flushSync]);

    // ----- Previous sets (read-only) -----
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

    // ----- Panel -----
    const [isPanelVisible, setIsPanelVisible] = useState(false);
    const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const togglePanel = (event) => {
        if (readOnly) return;
        if (isPanelVisible) setIsPanelVisible(false);
        else {
            setIsPanelVisible(true);
            setPanelPosition({ top: event?.nativeEvent?.pageY + 25, left: s(18) });
        }
    };

    // ----- Local mutations (no parent call) -----
    const withLayout = (fn) => (...args) => {
        try { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); } catch { }
        fn(...args);
    };

    const genLocalId = useCallback(() => `${name}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, [name]);

    const addSet = withLayout(() => {
        const next = [...(setsRef.current || []), { id: genLocalId(), weight: 0, reps: 0, isDone: false }];
        setDraft(next);
        scheduleSync(next);
    });

    const updateSetById = useCallback((sid, patch) => {
        const cur = setsRef.current || [];
        const idx = cur.findIndex((s) => (s?.id) === sid);
        if (idx < 0) return;
        const next = cur.slice();
        next[idx] = { ...(cur[idx] || {}), ...patch, id: cur[idx]?.id || sid };
        setDraft(next);
        scheduleSync(next);
    }, [scheduleSync]);

    const deleteSetById = withLayout((sid) => {
        const cur = setsRef.current || [];
        const next = cur.filter((s) => s?.id !== sid);
        setDraft(next);
        scheduleSync(next);
    });

    const toggleIsDoneById = useCallback((sid) => {
        const cur = setsRef.current || [];
        const idx = cur.findIndex((s) => s?.id === sid);
        if (idx < 0) return;
        const row = cur[idx];
        // optional guard (keep your rule)
        if (!row.isDone && (isNaN(row.weight) || isNaN(row.reps))) return;
        const next = cur.slice();
        next[idx] = { ...row, isDone: !row.isDone };
        setDraft(next);
        // immediate sync feels better for done/undone (still one update)
        scheduleSync(next);
    }, [scheduleSync]);

    return (
        <View style={styles.main_ctnr}>
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
                <Pressable style={styles.nameContainer} onPress={togglePanel} disabled={readOnly}>
                    <Text style={styles.exercise_text} numberOfLines={1}>{name}</Text>
                </Pressable>
            </Animated.View>

            <Animated.View style={[styles.labels, { opacity: fadeAnim }]}>
                <View style={styles.set_col}><Text style={styles.label_text}>Set</Text></View>
                <View style={styles.prev_col}><Text style={styles.label_text}>Previous</Text></View>
                <View style={styles.w_col}><Text style={styles.label_text}>lbs</Text></View>
                <View style={styles.r_col}><Text style={styles.label_text}>Reps</Text></View>
            </Animated.View>

            <Animated.View style={{ opacity: fadeAnim }}>
                {(draft || []).map((item, index) => {
                    const sid = item?.id || `${name}-${index}`;
                    return (
                        <SetRow
                            key={sid}
                            itemKey={sid}
                            sid={sid}
                            previousSet={previousSetsRef.current[index]}
                            set={item}
                            index={index}
                            onUpdateSetById={updateSetById}      // ← debounced parent sync
                            onDeleteSetById={deleteSetById}      // ← debounced parent sync
                            onToggleIsDoneById={toggleIsDoneById}// ← debounced parent sync
                            isDone={!!item?.isDone}
                            readOnly={readOnly}
                        />
                    );
                })}
            </Animated.View>

            {!readOnly && (
                <Animated.View style={[styles.add_set_btn_ctnr, { opacity: fadeAnim }]}>
                    <RNBounceable activeOpacity={0.5} onPress={addSet} style={styles.add_set_btn}>
                        <Entypo name="plus" size={s(18)} color="#000" />
                        <Text style={styles.add_set_text}>Add Set</Text>
                        <MaterialCommunityIcons name="arm-flex" size={s(20)} color="#aaa" />
                    </RNBounceable>
                </Animated.View>
            )}
        </View>
    );
}

const areEqual = (prev, next) => {
    // changes that should actually re-render this row group
    return (
        prev.name === next.name &&
        prev.muscle === next.muscle &&
        prev.readOnly === next.readOnly &&
        prev.sets === next.sets // parent-driven replacement of the whole sets array
    );
};

export default memo(ExerciseLog, areEqual);

const styles = StyleSheet.create({
    main_ctnr: { marginTop: s(16), marginBottom: s(6), position: "relative" },
    header: { flexDirection: "row", alignItems: "center", paddingLeft: s(20), paddingBottom: s(10), marginHorizontal: s(2.5) },
    nameContainer: { flexDirection: "row", alignItems: "center", flexShrink: 1, marginRight: s(10) },
    exercise_text: { fontFamily: "Mulish_800ExtraBold", color: "#0699FF", fontSize: s(15), flexShrink: 1 },
    muscle_ctnr: { borderRadius: s(15), height: s(23.5), paddingHorizontal: s(12), alignItems: "center", justifyContent: "center", marginLeft: s(5) },
    muscle_text: { fontFamily: "Poppins_700Bold", fontSize: s(12), color: "#fff" },
    labels: { flexDirection: "row", paddingBottom: s(5), marginHorizontal: s(2.5) },
    set_col: { marginLeft: "5%", width: "8%", alignItems: "center" },
    prev_col: { width: "38%", alignItems: "center" },
    w_col: { width: "18%", alignItems: "center" },
    r_col: { width: "18%", alignItems: "center" },
    label_text: { fontFamily: "Mulish_800ExtraBold", fontSize: s(14) },
    add_set_btn_ctnr: { paddingHorizontal: s(20) },
    add_set_btn: { width: "100%", marginTop: s(8), alignSelf: "center", height: s(28), borderRadius: s(20), backgroundColor: "#eaeaea", justifyContent: "center", alignItems: "center", flexDirection: "row" },
    add_set_text: { fontFamily: "Outfit_600SemiBold", color: "#000", fontSize: s(15), marginLeft: s(1), marginRight: s(5) },
});
