const fallbackCompletedWorkouts = () => {
    try {
        return global?.userData?.completedWorkouts;
    } catch {
        return null;
    }
};

const normalizeExerciseName = (nameLike) => {
    if (nameLike === null || nameLike === undefined) return "";
    return String(nameLike).trim().toLowerCase();
};

const extractExerciseName = (exercise) => {
    if (!exercise || typeof exercise !== "object") return "";
    const raw =
        exercise.name ??
        exercise.title ??
        exercise.exercise ??
        exercise.displayName ??
        null;
    return normalizeExerciseName(raw);
};

const EMPTY_WORKOUTS = [];
let cachedWorkoutsRef = EMPTY_WORKOUTS;
let cachedUsageLookup = Object.create(null);

const ensureWorkoutsArray = (input) => (Array.isArray(input) ? input : EMPTY_WORKOUTS);

export const buildExerciseUsageLookup = (completedWorkoutsInput) => {
    const workoutsSource =
        completedWorkoutsInput !== undefined
            ? completedWorkoutsInput
            : fallbackCompletedWorkouts();
    const workouts = ensureWorkoutsArray(workoutsSource);

    if (workouts === cachedWorkoutsRef && cachedUsageLookup) {
        return cachedUsageLookup;
    }

    const usage = Object.create(null);

    workouts.forEach((workout) => {
        if (!workout || typeof workout !== "object" || !Array.isArray(workout.exercises)) return;
        const seenInWorkout = new Set();
        workout.exercises.forEach((exercise) => {
            const nameLc = extractExerciseName(exercise);
            if (!nameLc || seenInWorkout.has(nameLc)) return;
            seenInWorkout.add(nameLc);
            usage[nameLc] = (usage[nameLc] || 0) + 1;
        });
    });

    cachedWorkoutsRef = workouts;
    cachedUsageLookup = usage;

    return usage;
};

export const countCompletedWorkoutsWithExercise = (exerciseName, completedWorkoutsInput) => {
    const normalized = normalizeExerciseName(exerciseName);
    if (!normalized) return 0;
    const lookup = buildExerciseUsageLookup(completedWorkoutsInput);
    return lookup[normalized] || 0;
};

export default countCompletedWorkoutsWithExercise;
