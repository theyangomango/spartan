// Pure helpers that read an exercise's previous sets from the user's exercise stats or from a completed workout.
import { normalizePrevKeepZero } from "../shared/workoutSetUtils";

export const extractLatestSetsFromStats = (entry) => {
    if (!entry || typeof entry !== "object") return [];
    const sets = Array.isArray(entry?.sets) ? entry.sets : [];
    if (!sets.length) return [];
    const lastWid = sets[sets.length - 1]?.wid;
    if (lastWid) {
        const collected = [];
        for (let i = sets.length - 1; i >= 0; i--) {
            const row = sets[i];
            if (row?.wid !== lastWid) break;
            const normalized = normalizePrevKeepZero(row);
            if (normalized) collected.push(normalized);
        }
        if (collected.length) return collected.reverse();
    }
    // Fallback when wid is missing: surface the most recent meaningful entries
    const trimmed = [];
    for (let i = sets.length - 1; i >= 0 && trimmed.length < 8; i--) {
        const normalized = normalizePrevKeepZero(sets[i]);
        if (normalized) trimmed.push(normalized);
    }
    return trimmed.reverse();
};

export const extractSetsFromCompletedWorkout = (exercise) => {
    if (!exercise || typeof exercise !== "object") return [];
    const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
    if (!sets.length) return [];
    const normalized = sets
        .map((row) => normalizePrevKeepZero(row))
        .filter(Boolean);
    return normalized;
};
