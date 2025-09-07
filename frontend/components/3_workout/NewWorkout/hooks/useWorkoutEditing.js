// hooks/useWorkoutEditing.js
import { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------ utils ------------------------------ */
const genId = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const normalizeSet = (s) => ({
    id: s?.id || genId(),
    weight: Number(s?.weight) || 0,
    reps: Number(s?.reps) || 0,
    isDone: !!s?.isDone,
    type: s?.type ?? null,
});

const sameLength = (a = [], b = []) => a.length === b.length;

/** returns true IFF arrays are same length and every element is the same reference */
const refEqualArray = (a = [], b = []) =>
    sameLength(a, b) && a.every((x, i) => x === b[i]);

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

    /* ----------- micro-batched commit (reduces re-renders) ----------- */
    const pendingRef = useRef(null);  // last computed "next workout"
    const timerRef = useRef(0);
    const MICRO_DELAY = 80; // ms; batches multiple quick edits (typing/toggles)

    const flush = useCallback(() => {
        timerRef.current = 0;
        const next = pendingRef.current;
        pendingRef.current = null;
        if (next) updateWorkoutRef.current(next);
    }, []);

    /** Queue an update in a short micro-batch window. If producer returns the *same* object, skip. */
    const commit = useCallback((producer) => {
        if (!viewingSelfRef.current) return; // block in read-only
        const current = workoutRef.current;
        const next = producer(current);
        if (!next || next === current) return; // nothing changed
        pendingRef.current = next; // only the latest wins
        if (!timerRef.current) {
            timerRef.current = setTimeout(flush, MICRO_DELAY);
        }
    }, [flush]);

    // cancel pending timer on unmount
    useEffect(() => () => {
        if (timerRef.current) clearTimeout(timerRef.current);
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
                const prev = prevSets[i] || null;
                const id = s?.id || prev?.id || genId();
                const weight = Number(s?.weight) || 0;
                const reps = Number(s?.reps) || 0;
                const isDone = !!s?.isDone;
                const type = (s && Object.prototype.hasOwnProperty.call(s, "type"))
                    ? s.type
                    : (prev?.type ?? null);

                // preserve object identity if *all* fields are equal
                if (prev &&
                    prev.id === id &&
                    prev.weight === weight &&
                    prev.reps === reps &&
                    !!prev.isDone === isDone &&
                    prev.type === type) {
                    return prev;
                }
                return { id, weight, reps, isDone, type };
            });

            // If lengths differ, it's definitely a change; if equal and all refs equal, skip
            const noChange =
                sameLength(nextSets, prevSets) && refEqualArray(nextSets, prevSets);

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
        (sets = []) => sets.map(() => normalizeSet({ weight: 0, reps: 0, isDone: false })),
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
