// Pure helpers that derive an active workout's totals (volume, reps, PBs, calories) and keep them on the workout object.
import calculate1RM from "../../../helper/calculate1RM";
import { estimateWorkoutCalories } from "../../../helper/estimateWorkoutCalories";
import { resolveUserBodyweight } from "../../../utils/bodyweight";
import { getPreviousOneRm } from "../../../logic/workoutFinishStats";

const getUserExerciseStats = () => {
    try {
        const source = global?.userData?.statsExercises;
        return (source && typeof source === "object") ? source : {};
    } catch {
        return {};
    }
};

const deriveWorkoutMetrics = (workout) => {
    if (!workout || typeof workout !== "object") {
        return { volume: 0, reps: 0, PBs: 0 };
    }

    const statsMap = getUserExerciseStats();
    const exercises = Array.isArray(workout?.exercises) ? workout.exercises : [];

    let totalVolume = 0;
    let totalReps = 0;
    let totalPBs = 0;

    exercises.forEach((exercise) => {
        const name = typeof exercise?.name === "string" ? exercise.name : "";
        const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
        if (!sets.length) return;

        const validSets = sets.filter((set) => {
            const reps = Number(set?.reps) || 0;
            const weight = Number(set?.weight) || 0;
            const isDone = !!set?.isDone;
            return isDone && reps > 0 && weight > 0;
        });

        if (!validSets.length) return;

        const previousMax = getPreviousOneRm(statsMap, name);

        let hitPB = previousMax <= 0;

        validSets.forEach((set) => {
            const reps = Number(set?.reps) || 0;
            const weight = Number(set?.weight) || 0;
            totalVolume += weight * reps;
            totalReps += reps;
            if (!hitPB) {
                const estimate = calculate1RM(weight, reps);
                if (estimate > previousMax) {
                    hitPB = true;
                }
            }
        });

        if (hitPB) totalPBs += 1;
    });

    return {
        volume: Number.isFinite(totalVolume) ? totalVolume : 0,
        reps: Number.isFinite(totalReps) ? totalReps : 0,
        PBs: Number.isFinite(totalPBs) ? totalPBs : 0,
    };
};

const normalizeCalorieValue = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};

const buildExercisesForCalories = (workout) => {
    const exercises = Array.isArray(workout?.exercises) ? workout.exercises : [];
    return exercises
        .map((exercise) => {
            const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
            const doneSets = sets.filter((set) => !!set?.isDone);
            if (!doneSets.length) return null;
            return { ...exercise, sets: doneSets };
        })
        .filter(Boolean);
};

const resolveDurationForCalories = (workout) => {
    const explicit = Number(workout?.duration);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    const created = Number(workout?.created);
    if (Number.isFinite(created) && created > 0) {
        return Math.max(0, Date.now() - created);
    }
    return 0;
};

const computeWorkoutCalories = (workout) => {
    const sanitizedExercises = buildExercisesForCalories(workout);
    if (!sanitizedExercises.length) return null;
    let userData = null;
    try {
        userData = global?.userData || null;
    } catch {
        userData = null;
    }
    const weightLb = resolveUserBodyweight(userData, null, { measurementsOnly: true });
    if (!weightLb || weightLb <= 0) return null;
    const payload = {
        ...workout,
        duration: resolveDurationForCalories(workout),
        exercises: sanitizedExercises,
    };
    const estimate = estimateWorkoutCalories(payload, { weightLb, user: userData });
    const calories = Number(estimate?.calories);
    return Number.isFinite(calories) ? calories : null;
};

export const ensureWorkoutMetrics = (workout) => {
    if (!workout || typeof workout !== "object") return workout;

    const { volume, reps, PBs } = deriveWorkoutMetrics(workout);
    const hasVolumeProp = Object.prototype.hasOwnProperty.call(workout, "volume");
    const hasRepsProp = Object.prototype.hasOwnProperty.call(workout, "reps");
    const hasPBsProp = Object.prototype.hasOwnProperty.call(workout, "PBs");
    const prevVolume = Number(workout?.volume) || 0;
    const prevReps = Number(workout?.reps) || 0;
    const prevPBs = Number(workout?.PBs ?? workout?.pbs) || 0;
    const needsUpdate =
        !hasVolumeProp ||
        !hasRepsProp ||
        !hasPBsProp ||
        typeof workout.volume !== "number" ||
        typeof workout.reps !== "number" ||
        typeof workout.PBs !== "number" ||
        prevVolume !== volume ||
        prevReps !== reps ||
        prevPBs !== PBs;

    const nextCalories = computeWorkoutCalories(workout);
    const prevCalories = normalizeCalorieValue(workout?.calories);
    const caloriesChanged = nextCalories !== prevCalories;

    if (!needsUpdate && !caloriesChanged) return workout;

    const nextWorkout = { ...workout };
    if (needsUpdate) {
        nextWorkout.volume = volume;
        nextWorkout.reps = reps;
        nextWorkout.PBs = PBs;
        if (Object.prototype.hasOwnProperty.call(nextWorkout, "pbs")) {
            delete nextWorkout.pbs;
        }
    }
    if (caloriesChanged) {
        nextWorkout.calories = nextCalories;
    }
    return nextWorkout;
};
