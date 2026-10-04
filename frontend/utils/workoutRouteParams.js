// Serialisable copies of workouts and post entries, safe to pass as navigation route params.

export const sanitizeWorkoutForRoute = (workout) => {
    if (!workout || typeof workout !== "object") return null;

    const replacer = (_key, value) => (typeof value === "function" ? undefined : value);

    try {
        return JSON.parse(JSON.stringify(workout, replacer));
    } catch {
        const clone = { ...workout };
        clone.exercises = Array.isArray(workout.exercises)
            ? workout.exercises.map((exercise) => {
                if (!exercise || typeof exercise !== "object") return {};
                const sets = Array.isArray(exercise.sets)
                    ? exercise.sets.map((set) => {
                        if (!set || typeof set !== "object") return {};
                        const { weight, reps, unit, units, weightUnit, kg, lbs, ...rest } = set;
                        const normalized = {
                            ...rest,
                            weight: Number(weight ?? kg ?? lbs ?? 0) || 0,
                            reps: Number(reps ?? set?.rep ?? set?.r ?? 0) || 0,
                        };
                        const resolvedUnit = unit || units || weightUnit || (kg != null ? "kg" : undefined);
                        if (resolvedUnit) normalized.unit = resolvedUnit;
                        normalized.prev = Object.prototype.hasOwnProperty.call(set, "prev")
                            ? (set?.prev && typeof set.prev === "object"
                                ? {
                                    weight: Number(set.prev?.weight) || 0,
                                    reps: Number(set.prev?.reps) || 0,
                                }
                                : null)
                            : null;
                        return normalized;
                    })
                    : [];
                return { ...exercise, sets };
            })
            : [];
        return clone;
    }
};

// Differs from sanitizeWorkoutForRoute only in the fallback taken when the workout cannot be JSON-serialised
// (the sets are shallow-copied without onComplete/onDelete instead of being rebuilt). Deliberately not merged.
export const sanitizeWorkoutForRouteShallow = (workout) => {
    if (!workout || typeof workout !== "object") return null;
    const replacer = (_key, value) => (typeof value === "function" ? undefined : value);
    try {
        return JSON.parse(JSON.stringify(workout, replacer));
    } catch {
        const clone = { ...workout };
        if (Array.isArray(workout.exercises)) {
            clone.exercises = workout.exercises.map((exercise) => {
                if (!exercise || typeof exercise !== "object") return {};
                const safeExercise = { ...exercise };
                if (Array.isArray(exercise.sets)) {
                    safeExercise.sets = exercise.sets.map((set) => {
                        if (!set || typeof set !== "object") return {};
                        const safeSet = { ...set };
                        delete safeSet.onComplete;
                        delete safeSet.onDelete;
                        return safeSet;
                    });
                }
                return safeExercise;
            });
        }
        return clone;
    }
};

export const sanitizeEntry = (entry) => {
    if (!entry || typeof entry !== "object") return entry;
    try {
        return JSON.parse(JSON.stringify(entry, (_key, value) => (typeof value === "function" ? undefined : value)));
    } catch {
        return { ...entry };
    }
};
