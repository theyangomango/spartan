// components/3_Workout/NewWorkout/Tracking/ExerciseLog.js
import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from "react";
import { View, StyleSheet, Text, Pressable, Animated, LayoutAnimation, Platform, UIManager } from "react-native";
import * as Haptics from "expo-haptics";
import RNBounceable from "@freakycoder/react-native-bounceable";
import SetRow from "./SetRow";
import theme from "../../../../theme/mfpDark";
import ExerciseOptionsPanel from "./ExerciseOptionsPanel";

import scaleSize from "../../../../helper/scaleSize";
import workoutTypography from "../../shared/workoutTypography";
import ExerciseAvatar from "../../../common/ExerciseAvatar";
const ENABLE_LAYOUT_ANIM = false;
const SYNC_DEBOUNCE_MS = 80;
const RAF_FALLBACK_MS = 24;

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

const normalizePrevCandidate = (candidate) => {
    if (!candidate || typeof candidate !== "object") return null;
    const weight = Number(candidate?.weight) || 0;
    const reps = Number(candidate?.reps) || 0;
    return { weight, reps };
};

function ExerciseLog({
    name,
    muscle,
    exerciseIndex,
    updateSets,          // parent setter
    sets,                // source of truth
    replaceExercise,
    deleteExercise,
    readOnly = false,
    showOptionsTriggerIcon = false,
    syncColumnOnEdit = false,
    onStatFocus,         // optional: notify parent when any set input is focused
    fallbackPreviousSets,
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
        SYNC_DEBOUNCE_MS
    );

    const rafFlushRef = useRef(null);
    const cancelPendingRafFlush = useCallback(() => {
        if (!rafFlushRef.current) return;
        if (typeof cancelAnimationFrame === "function") {
            cancelAnimationFrame(rafFlushRef.current);
        } else {
            clearTimeout(rafFlushRef.current);
        }
        rafFlushRef.current = null;
    }, []);

    const flushNextFrame = useCallback((payload) => {
        cancelPendingRafFlush();
        const raf = (typeof requestAnimationFrame === "function")
            ? requestAnimationFrame
            : (cb) => setTimeout(cb, RAF_FALLBACK_MS);
        rafFlushRef.current = raf(() => {
            rafFlushRef.current = null;
            flushSync(payload);
        });
    }, [cancelPendingRafFlush, flushSync]);

    useEffect(() => () => {
        // Ensure pending edits still sync if the row unmounts mid-typing
        cancelPendingRafFlush();
        flushSync(setsRef.current);
    }, [cancelPendingRafFlush, flushSync]);

    const handleReplaceExercise = useCallback(() => {
        if (replaceExercise) replaceExercise(exerciseIndex);
    }, [exerciseIndex, replaceExercise]);

    const handleDeleteExercise = useCallback(() => {
        if (deleteExercise) deleteExercise(exerciseIndex);
    }, [deleteExercise, exerciseIndex]);

    // ----- Previous sets (read-only display) -----
    const normalizedFallbackPrev = useMemo(() => {
        if (!Array.isArray(fallbackPreviousSets)) return [];
        return fallbackPreviousSets
            .map((row) => normalizePrevCandidate(row))
            .filter(Boolean);
    }, [fallbackPreviousSets]);

    const previousSets = useMemo(() => {
        const inlinePrev = Array.isArray(sets)
            ? sets.map((set) => normalizePrevCandidate(set?.prev))
            : [];
        const inlineHasData = inlinePrev.some(Boolean);

        if (inlineHasData) {
            if (!normalizedFallbackPrev.length) return inlinePrev;
            return inlinePrev.map((row, idx) => row || normalizedFallbackPrev[idx] || null);
        }

        if (!normalizedFallbackPrev.length) return inlinePrev;

        if (!Array.isArray(draft) || !draft.length) {
            return normalizedFallbackPrev;
        }

        return draft.map((_, idx) => normalizedFallbackPrev[idx] || null);
    }, [sets, normalizedFallbackPrev, draft]);

    // ----- Panel -----
    const [isPanelVisible, setIsPanelVisible] = useState(false);
    const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0, anchorX: null });
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const optionsAnchorRef = useRef(null);

    const togglePanel = (event) => {
        if (readOnly) return;
        if (isPanelVisible) setIsPanelVisible(false);
        else {
            const fallbackTop = scaleSize((event?.nativeEvent?.pageY ?? 0) + 25);
            const fallbackLeft = scaleSize(18);
            const openWithPosition = (pos) => {
                setPanelPosition(pos);
                setIsPanelVisible(true);
            };

            if (optionsAnchorRef.current?.measureInWindow) {
                try {
                    optionsAnchorRef.current.measureInWindow((x, y, width, height) => {
                        if (typeof x === "number" && typeof width === "number" && typeof y === "number") {
                            openWithPosition({
                                top: (y || 0) + (height || 0) + scaleSize(12),
                                anchorX: (x || 0) + (width || 0) / 2,
                            });
                        } else {
                            openWithPosition({ top: fallbackTop, left: fallbackLeft, anchorX: null });
                        }
                    });
                    return;
                } catch {
                    // fall back below
                }
            }

            openWithPosition({ top: fallbackTop, left: fallbackLeft, anchorX: null });
        }
    };

    // ----- Local mutations (no parent call) -----
    const withLayout = (fn) => (...args) => {
        if (ENABLE_LAYOUT_ANIM) { try { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); } catch {} }
        fn(...args);
    };

    const genLocalId = useCallback(() => `${name}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, [name]);

    const addSet = withLayout(() => {
        const current = setsRef.current || [];
        const lastSet = current[current.length - 1] || null;
        const defaultWeight = lastSet && Object.prototype.hasOwnProperty.call(lastSet, "weight")
            ? (lastSet.weight ?? "")
            : "";
        const defaultReps = lastSet && Object.prototype.hasOwnProperty.call(lastSet, "reps")
            ? (lastSet.reps ?? "")
            : "";
        const next = [...current, { id: genLocalId(), weight: defaultWeight, reps: defaultReps, isDone: false }];
        setDraft(next);
        setsRef.current = next;
        flushNextFrame(next);
        try { Haptics.selectionAsync?.(); } catch {}
    });

    const updateSetById = useCallback((sid, patch) => {
        const cur = setsRef.current || [];
        const idx = cur.findIndex((s) => (s?.id) === sid);
        if (idx < 0) return;
        const next = cur.slice();
        const prevRow = cur[idx] || {};
        const nextRow = { ...prevRow, ...patch, id: prevRow?.id || sid };
        const rowChanged = Object.keys(patch).some((key) => nextRow[key] !== prevRow[key]);
        next[idx] = rowChanged ? nextRow : prevRow;

        if (syncColumnOnEdit) {
            const shouldSyncWeight = Object.prototype.hasOwnProperty.call(patch, "weight") && patch.weight !== prevRow?.weight;
            const shouldSyncReps = Object.prototype.hasOwnProperty.call(patch, "reps") && patch.reps !== prevRow?.reps;

            if (shouldSyncWeight || shouldSyncReps) {
                for (let i = idx + 1; i < next.length; i++) {
                    const row = next[i];
                    if (!row || row.isDone) continue;
                    if (shouldSyncWeight && row.weight !== patch.weight) {
                        next[i] = { ...row, weight: patch.weight, id: row.id || `${name}-${i}` };
                    }
                    if (shouldSyncReps && row.reps !== patch.reps) {
                        const target = next[i] || row;
                        next[i] = { ...target, reps: patch.reps, id: (target.id || row.id || `${name}-${i}`) };
                    }
                }
            }
        }

        if (!rowChanged && next.every((item, i) => item === cur[i])) return;

        setDraft(next);
        setsRef.current = next;
        scheduleSync(next);
    }, [scheduleSync, syncColumnOnEdit, name]);

    const deleteSetById = withLayout((sid) => {
        const cur = setsRef.current || [];
        const next = cur.filter((s) => s?.id !== sid);
        setDraft(next);
        setsRef.current = next;
        flushNextFrame(next);
    });

    const toggleIsDoneById = useCallback((sid, nextStateParam) => {
        const cur = setsRef.current || [];
        const idx = cur.findIndex((s) => s?.id === sid);
        if (idx < 0) return;
        const row = cur[idx];
        if (!row.isDone && (isNaN(row.weight) || isNaN(row.reps))) return;

        const toggledDone = (typeof nextStateParam === "boolean") ? nextStateParam : !row.isDone;
        if (!!row.isDone === toggledDone) return;

        const next = cur.map((setItem, idxSet) => idxSet === idx ? { ...setItem, isDone: toggledDone } : setItem);
        setDraft(next);
        setsRef.current = next;
        flushNextFrame(next);

        if (toggledDone) { try { Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Light); } catch {} }
    }, [flushNextFrame]);

    return (
        <View style={styles.main_ctnr}>
            {!readOnly && (
                <ExerciseOptionsPanel
                    visible={isPanelVisible}
                    onClose={() => setIsPanelVisible(false)}
                    position={panelPosition}
                    replaceExercise={handleReplaceExercise}
                    deleteExercise={handleDeleteExercise}
                />
            )}

            <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                <Pressable
                    ref={optionsAnchorRef}
                    style={styles.nameContainer}
                    onPress={!readOnly ? togglePanel : undefined}
                    disabled={readOnly}
                >
                    <ExerciseAvatar name={name} size={scaleSize(46)} style={styles.avatar} />
                    <Text style={[workoutTypography.exerciseName, styles.nameText]} numberOfLines={1}>{name}</Text>
                </Pressable>
            </Animated.View>

            <Animated.View style={[styles.labels, { opacity: fadeAnim }]}>
                <View style={styles.set_col}><Text style={workoutTypography.columnLabel}>Set</Text></View>
                <View style={styles.prev_col}><Text style={workoutTypography.columnLabel}>Previous</Text></View>
                <View style={styles.w_col}><Text style={workoutTypography.columnLabel}>lbs</Text></View>
                <View style={styles.r_col}><Text style={workoutTypography.columnLabel}>Reps</Text></View>
            </Animated.View>

            <Animated.View style={{ opacity: fadeAnim }}>
                {(draft || []).map((item, index) => {
                    const sid = item?.id || `${name}-${index}`;
                    return (
                        <SetRow
                            key={sid}
                            itemKey={sid}
                            sid={sid}
                            previousSet={previousSets[index]}
                            set={item}
                            index={index}
                            onUpdateSetById={updateSetById}      // ← debounced parent sync
                            onDeleteSetById={deleteSetById}      // ← debounced parent sync
                            onToggleIsDoneById={toggleIsDoneById}// ← debounced parent sync
                            isDone={!!item?.isDone}
                            readOnly={readOnly}
                            onFocusInput={() => { try { onStatFocus?.(exerciseIndex, index); } catch {} }}
                        />
                    );
                })}
            </Animated.View>

            {!readOnly && (
                <Animated.View style={[styles.add_set_btn_ctnr, { opacity: fadeAnim }]}>
                    <RNBounceable activeOpacity={0.5} onPress={addSet} style={styles.add_set_btn}>
                        <Text style={[workoutTypography.addSet, styles.add_set_text]}>Add Set</Text>
                    </RNBounceable>
                </Animated.View>
            )}
        </View>
    );
}

const areEqual = (prev, next) => {
    // changes that should actually re-render this row group
    return (
        // parent-driven replacement of the whole sets array
        (prev.name === next.name &&
        prev.muscle === next.muscle &&
        prev.readOnly === next.readOnly &&
        prev.showOptionsTriggerIcon === next.showOptionsTriggerIcon &&
        prev.syncColumnOnEdit === next.syncColumnOnEdit &&
        prev.sets === next.sets &&
        prev.fallbackPreviousSets === next.fallbackPreviousSets)
    );
};

export default memo(ExerciseLog, areEqual);

const styles = StyleSheet.create({
    main_ctnr: { marginTop: scaleSize(16), marginBottom: scaleSize(6), position: "relative" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingLeft: scaleSize(20),
        paddingRight: scaleSize(14),
        paddingBottom: scaleSize(10),
        marginHorizontal: scaleSize(2.5),
    },
    nameContainer: { flexDirection: "row", alignItems: "center", flexShrink: 1, marginRight: scaleSize(10), paddingBottom: scaleSize(4), flex: 1 },
    avatar: { marginRight: scaleSize(10) },
    nameText: { flexShrink: 1, fontSize: scaleSize(14), lineHeight: scaleSize(20) },
    optionsButton: {
        backgroundColor: theme.restPillBg,
        borderRadius: scaleSize(10),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.primaryHairline,
        height: scaleSize(26),
        width: scaleSize(32),
        justifyContent: "center",
        alignItems: "center",
        mart: scaleSize(4)

    },
    labels: { flexDirection: "row", paddingBottom: scaleSize(5), marginHorizontal: scaleSize(2.5) },
    set_col: { marginLeft: "5%", width: "8%", alignItems: "center" },
    prev_col: { width: "38%", alignItems: "center" },
    w_col: { width: "18%", alignItems: "center" },
    r_col: { width: "18%", alignItems: "center" },
    add_set_btn_ctnr: { paddingHorizontal: scaleSize(20) },
    add_set_btn: {
        width: "100%",
        marginTop: scaleSize(8),
        alignSelf: "center",
        height: scaleSize(28),
        borderRadius: scaleSize(20),
        backgroundColor: theme.addSetBg,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
    },
    add_set_text: { marginLeft: scaleSize(1), marginRight: scaleSize(5) },
});
