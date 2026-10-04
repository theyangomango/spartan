// Indexed exercise catalogue for the exercise picker: search fields, lookup by exact name, logged-set count.
import { exercises } from "./EXERCISES";

export const EXERCISE_CATALOG = exercises.map((ex) => ({
    ...ex,
    nameLc: String(ex?.name || "").toLowerCase(),
    mgLc: String(ex?.muscleGroup || "").toLowerCase(),
}));

export const EXERCISE_LOOKUP_BY_NAME = EXERCISE_CATALOG.reduce((acc, ex) => {
    if (!ex?.name) return acc;
    acc[ex.name] = ex;
    return acc;
}, {});

export const getSetCount = (statsMap = {}, name) => {
    const exerciseStats = statsMap?.[name];
    if (!exerciseStats) return 0;
    const sets = exerciseStats?.sets;
    if (Array.isArray(sets)) return sets.length;
    if (typeof sets === "number") return sets;
    const fallback = exerciseStats?.setCount ?? exerciseStats?.totalSets;
    return typeof fallback === "number" ? fallback : 0;
};
