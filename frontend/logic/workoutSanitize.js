// Pure helpers that normalise a workout (sets, calories, day keys) before it is kept in the store or persisted.
import { coercePrivacyMode } from "../utils/workoutPrivacy";
import { toMillis } from "../utils/date";
import { normalizePrevKeepZero } from "../components/3_Workout/shared/workoutSetUtils";

export const normalizeCalories = (value) => {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};

export const toDayKeySafe = (value) => {
    const msRaw = toMillis(value ?? Date.now());
    const ms = Number.isFinite(msRaw) && msRaw > 0 ? msRaw : Date.now();
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const sanitizeWorkout = (w) => {
    if (!w) return null;
    const created = toMillis(w.created ?? w.createdAt);
    const normalizeSets = (sets) =>
        Array.isArray(sets)
            ? sets.map((s) => ({
                // Never write undefined to Firestore
                id: (s?.id != null && s?.id !== undefined) ? String(s.id) : null,
                weight: Number(s?.weight) || 0,
                reps: Number(s?.reps) || 0,
                isDone: !!s?.isDone,
                type: (s?.type != null && s?.type !== undefined) ? s.type : null,
                prev: normalizePrevKeepZero(s?.prev),
            }))
            : [];
    const exercises = Array.isArray(w.exercises)
        ? w.exercises.map((ex) => stripUndefined({ ...ex, sets: normalizeSets(ex?.sets) }))
        : [];
    // Strip ephemeral local-only flags
    const { __justStarted, __focusTitle, ...rest } = w;
    // Enforce a valid privacy mode and remove undefined values before persisting
    const enforced = { ...rest, privacyMode: coercePrivacyMode(rest?.privacyMode) };
    const restClean = stripUndefined(enforced);
    return {
        ...restClean,
        created,
        exercises,
        volume: Number(w?.volume) || 0,
        reps: Number(w?.reps) || 0,
        PBs: Number(w?.PBs) || 0,
        calories: normalizeCalories(w?.calories),
    };
};

export const stripUndefined = (obj) =>
    Object.fromEntries(
        Object.entries(obj || {}).filter(([, value]) => value !== undefined)
    );

export const normalizeExerciseName = (value) => (typeof value === "string" ? value.trim() : "");

export const getTodayKey = () => {
    return toDayKeySafe(Date.now());
};
