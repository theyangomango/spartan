// hooks/useWorkoutEditing.js
import { useCallback, useEffect, useRef, useState } from "react";
import useWorkoutStore from "../../../../state/workoutStore";

/* ------------------------------ utils ------------------------------ */
const genId = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const normalizePrev = (prev) => {
    if (!prev || typeof prev !== "object") return null;
    return {
        weight: Number(prev?.weight) || 0,
        reps: Number(prev?.reps) || 0,
    };
};

const normalizeSet = (s) => ({
    id: s?.id || genId(),
    weight: Number(s?.weight) || 0,
    reps: Number(s?.reps) || 0,
    isDone: !!s?.isDone,
    type: s?.type ?? null,
    prev: normalizePrev(s?.prev),
});

const sameLength = (a = [], b = []) => a.length === b.length;

/** returns true IFF arrays are same length and every element is the same reference */
const refEqualArray = (a = [], b = []) =>
    sameLength(a, b) && a.every((x, i) => x === b[i]);

const setsEqualByValue = (a, b) => {
    if (!a || !b) return false;
    const idA = a.id ?? null;
    const idB = b.id ?? null;
    if (idA !== idB) return false;
    if (Number(a.weight) !== Number(b.weight)) return false;
    if (Number(a.reps) !== Number(b.reps)) return false;
    if (!!a.isDone !== !!b.isDone) return false;
    const aPrev = normalizePrev(a.prev);
    const bPrev = normalizePrev(b.prev);
    const prevWeightA = Number(aPrev?.weight) || 0;
    const prevWeightB = Number(bPrev?.weight) || 0;
    const prevRepsA = Number(aPrev?.reps) || 0;
    const prevRepsB = Number(bPrev?.reps) || 0;
    if (prevWeightA !== prevWeightB) return false;
    if (prevRepsA !== prevRepsB) return false;
    return (a.type ?? null) === (b.type ?? null);
};

/* ------------------------------ hook ------------------------------ */
export default function useWorkoutEditing({ workout, updateWorkout, viewingSelf }) {
    // latest refs so callbacks stay stable
    const workoutRef = useRef(workout);
    const updateWorkoutRef = useRef(updateWorkout);
    const viewingSelfRef = useRef(!!viewingSelf);

    useEffect(() => { workoutRef.current = workout; }, [workout]);
    useEffect(() => { updateWorkoutRef.current = updateWorkout; }, [updateWorkout]);
    useEffect(() => { viewingSelfRef.current = !!viewingSelf; }, [viewingSelf]);

    // UI helper for replace flow
    const [replaceIndex, setReplaceIndex] = useState(null);

    /** Apply immediately so backend never misses an edit. */
    const commit = useCallback((producer) => {
        if (!viewingSelfRef.current) return; // block in read-only
        const current = workoutRef.current;
        const next = producer(current);
        if (!next || next === current) return; // nothing changed
        workoutRef.current = next;
        updateWorkoutRef.current(next);
    }, []);

    /* ------------------------------ actions ------------------------------ */

    const appendExercises = useCallback((exercises) => {
        if (!Array.isArray(exercises) || exercises.length === 0) return;

        commit((w) => {
            if (!w) return w;
            const nextExercises = [
                ...(w.exercises || []),
                ...exercises.map((ex) => ({
                    name: ex.name,
                    muscle: ex.muscle,
                    sets: [normalizeSet({ weight: 0, reps: 0, isDone: false })],
                })),
            ];
            // if nothing actually added, skip (unlikely)
            if (refEqualArray(nextExercises, w.exercises || [])) return w;
            return { ...w, exercises: nextExercises };
        });
    }, [commit]);

    const updateSets = useCallback((exerciseIndex, newSets) => {
        commit((w) => {
            if (!w) return w;
            const exs = w.exercises || [];
            if (exerciseIndex < 0 || exerciseIndex >= exs.length) return w;

            const prevSets = exs[exerciseIndex]?.sets || [];

            // Build next sets preserving identity for unchanged rows
            const nextSets = (newSets || []).map((s, i) => {
                const prevRow = prevSets[i] || null;
                const id = s?.id || prevRow?.id || genId();
                const weight = Number(s?.weight) || 0;
                const reps = Number(s?.reps) || 0;
                const isDone = !!s?.isDone;
                const type = (s && Object.prototype.hasOwnProperty.call(s, "type"))
                    ? s.type
                    : (prevRow?.type ?? null);
                const prevPayload = Object.prototype.hasOwnProperty.call(s || {}, "prev")
                    ? normalizePrev(s?.prev)
                    : (prevRow?.prev ? normalizePrev(prevRow.prev) : null);

                // preserve object identity if *all* fields are equal
                if (prevRow &&
                    prevRow.id === id &&
                    prevRow.weight === weight &&
                    prevRow.reps === reps &&
                    !!prevRow.isDone === isDone &&
                    prevRow.type === type &&
                    setsEqualByValue({ ...prevRow, prev: prevPayload }, prevRow)) {
                    return prevRow;
                }
                return { id, weight, reps, isDone, type, prev: prevPayload };
            });

            // If lengths differ, it's definitely a change; if equal and all refs equal, skip
            const noChange =
                sameLength(nextSets, prevSets) &&
                nextSets.every((set, index) => setsEqualByValue(set, prevSets[index]));

            if (noChange) return w;

            // produce next exercises array, preserving references where possible
            const nextExercises = exs.map((ex, i) =>
                i === exerciseIndex ? { ...ex, sets: nextSets } : ex
            );

            return { ...w, exercises: nextExercises };
        });
    }, [commit]);

    const deleteExercise = useCallback((index) => {
        commit((w) => {
            if (!w) return w;
            const exs = w.exercises || [];
            if (index < 0 || index >= exs.length) return w;

            const filtered = exs.filter((_, i) => i !== index);
            if (refEqualArray(filtered, exs)) return w;
            return { ...w, exercises: filtered };
        });
    }, [commit]);

    const toggleIsDone = useCallback((exerciseIndex, setIndex) => {
        commit((w) => {
            if (!w) return w;
            const exs = w.exercises || [];
            if (exerciseIndex < 0 || exerciseIndex >= exs.length) return w;

            const sets = exs[exerciseIndex]?.sets || [];
            if (setIndex < 0 || setIndex >= sets.length) return w;

            const curr = sets[setIndex];
            if (!curr) return w;
            // guard against toggling incomplete rows (your original rule)
            if (!curr.isDone && (isNaN(curr.weight) || isNaN(curr.reps))) return w;

            const nextSet = { ...curr, isDone: !curr.isDone };
            if (nextSet.isDone === curr.isDone) return w; // no-op safety

            const nextSets = sets.map((s, i) => (i === setIndex ? nextSet : s));
            if (refEqualArray(nextSets, sets)) return w;

            const nextExercises = exs.map((ex, i) =>
                i === exerciseIndex ? { ...ex, sets: nextSets } : ex
            );

            return { ...w, exercises: nextExercises };
        });
    }, [commit]);

    /* ------------------------------ helpers ------------------------------ */

    const makeBlankSetsLike = useCallback(
        (sets = []) => sets.map((src) => normalizeSet({ weight: 0, reps: 0, isDone: false, prev: src?.prev })),
        []
    );

    /* ------------------------------ API ------------------------------ */
    return {
        // state
        replaceIndex,
        setReplaceIndex,

        // actions
        appendExercises,
        updateSets,
        deleteExercise,
        toggleIsDone,

        // helpers
        normalizeSet,
        makeBlankSetsLike,
    };
}
