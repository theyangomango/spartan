// Identifier matching, workout normalisation and per-workout metrics for the completed-workout update.
import { toMillis, deriveBestTimestamp } from "./updateCompletedWorkoutStats.js";
import { calculate1RM } from "./workoutStatsPrimitives.js";

const normalizeIdentifier = (input) => {
    if (!input && input !== 0) return null;
    if (typeof input === "string" || typeof input === "number") {
        const wid = String(input).trim();
        return wid ? { wid } : null;
    }
    if (typeof input !== "object") return null;
    const widRaw = input?.wid ?? input?.id ?? input?.workoutId ?? input?.widStr ?? null;
    const createdRaw = input?.created ?? input?.createdAt ?? input?.finishedAt ?? input?.completedAt ?? null;
    const wid = typeof widRaw === "string" ? widRaw.trim() : (widRaw != null ? String(widRaw).trim() : "");
    let created = 0;
    if (createdRaw != null) {
        const ms = toMillis(createdRaw);
        if (ms) created = ms;
    }
    return wid || created ? { wid: wid || null, created: created || 0 } : null;
};

const findWorkoutInList = (workouts, identifier) => {
    if (!Array.isArray(workouts) || workouts.length === 0) return { index: -1, workout: null };
    const targetWid = identifier?.wid ? String(identifier.wid) : null;
    const targetCreated = identifier?.created || 0;

    for (let i = 0; i < workouts.length; i += 1) {
        const workout = workouts[i];
        const wid = workout?.wid ?? workout?.id ?? workout?.workoutId ?? workout?.pid ?? null;
        const created = deriveBestTimestamp(workout);
        const widMatch = targetWid && wid != null && String(wid) === targetWid;
        const createdMatch = targetCreated && Math.abs(created - targetCreated) < 2000;
        if (widMatch || createdMatch) {
            return { index: i, workout };
        }
    }
    return { index: -1, workout: null };
};

const ensureExercisesAreArrays = (workout) => {
    if (!workout || typeof workout !== "object") return workout;
    const exercises = Array.isArray(workout.exercises)
        ? workout.exercises.map((exercise) => {
            if (!exercise || typeof exercise !== "object") return {};
            const sets = Array.isArray(exercise.sets) ? exercise.sets.map((set) => ({
                ...(set || {}),
            })) : [];
            return { ...exercise, sets };
        })
        : [];
    return { ...workout, exercises };
};

const getPreviousOneRm = (statsMap = {}, rawName) => {
    if (!statsMap || typeof statsMap !== "object") return 0;
    const name = typeof rawName === "string" ? rawName.trim() : "";
    if (!name) return 0;
    const direct = statsMap[name] || statsMap[name.toLowerCase?.()] || null;
    const entry = direct || Object.values(statsMap).find((item) => {
        const key = String(item?.name || "").trim().toLowerCase();
        return key && key === name.toLowerCase();
    });
    if (!entry || typeof entry !== "object") return 0;
    const directOneRm = Number(entry?.["1RM"] ?? entry?.oneRM ?? entry?.oneRm ?? entry?.max);
    return Number.isFinite(directOneRm) ? directOneRm : 0;
};

const deriveWorkoutMetrics = (workout, statsMap = {}) => {
    if (!workout || typeof workout !== "object") {
        return { volume: 0, reps: 0, PBs: 0 };
    }

    const exercises = Array.isArray(workout.exercises) ? workout.exercises : [];

    let totalVolume = 0;
    let totalReps = 0;
    let totalPBs = 0;

    exercises.forEach((exercise) => {
        if (!exercise || typeof exercise !== "object") return;
        const sets = Array.isArray(exercise.sets) ? exercise.sets : [];
        if (!sets.length) return;

        const name = typeof exercise?.name === "string" ? exercise.name.trim() : "";
        const previousOneRm = getPreviousOneRm(statsMap, name);
        let hitPB = previousOneRm <= 0;
        let bestEstimate = previousOneRm;

        sets.forEach((set) => {
            if (!set || typeof set !== "object") return;
            const reps = Number(set?.reps ?? set?.rep ?? set?.r ?? 0);
            const weight = Number(set?.weight ?? set?.lbs ?? set?.kg ?? set?.load ?? 0);
            const isDone = Object.prototype.hasOwnProperty.call(set, "isDone") ? !!set.isDone : true;
            if (!isDone || reps <= 0 || weight <= 0) return;

            totalVolume += weight * reps;
            totalReps += reps;

            const estimate = calculate1RM(weight, reps);
            if (estimate > bestEstimate) {
                bestEstimate = estimate;
                if (!hitPB && estimate > previousOneRm) {
                    hitPB = true;
                }
            }
        });

        if (hitPB && bestEstimate > previousOneRm) {
            totalPBs += 1;
        }
    });

    return {
        volume: Number.isFinite(totalVolume) ? totalVolume : 0,
        reps: Number.isFinite(totalReps) ? totalReps : 0,
        PBs: Number.isFinite(totalPBs) ? totalPBs : 0,
    };
};

export { normalizeIdentifier, findWorkoutInList, ensureExercisesAreArrays, deriveWorkoutMetrics };
