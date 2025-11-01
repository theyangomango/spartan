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

const toNumber = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return 0;
        const direct = Number(trimmed);
        if (Number.isFinite(direct)) return direct;
        const cleaned = parseFloat(trimmed.replace(/[^0-9.\-]/g, ""));
        return Number.isFinite(cleaned) ? cleaned : 0;
    }
    if (typeof value === "object") {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) return numeric;
    }
    return 0;
};

const computeExerciseVolume = (exercise) => {
    const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
    if (!sets.length) return 0;

    let total = 0;
    let hasMeaningfulSet = false;

    sets.forEach((set) => {
        if (!set || typeof set !== "object") return;
        if (set?.isDone === false) return;

        const reps = toNumber(
            set?.reps ??
                set?.rep ??
                set?.r ??
                set?.count ??
                set?.value?.reps ??
                set?.data?.reps
        );
        const weight = toNumber(
            set?.weight ??
                set?.lbs ??
                set?.lb ??
                set?.kg ??
                set?.kgs ??
                set?.load ??
                set?.value?.weight ??
                set?.data?.weight
        );

        if (reps <= 0 || weight <= 0) return;
        hasMeaningfulSet = true;
        total += weight * reps;
    });

    return hasMeaningfulSet ? total : 0;
};

const parseTimestamp = (value) => {
    if (value === null || value === undefined) return null;
    const asNumber = Number(value);
    if (Number.isFinite(asNumber) && asNumber > 0) return asNumber;
    if (typeof value === "string") {
        const parsed = Date.parse(value);
        if (!Number.isNaN(parsed)) return parsed;
    }
    return null;
};

const resolveTimestamp = (workout, fallbackOrder) => {
    if (!workout || typeof workout !== "object") return fallbackOrder;
    const candidates = [
        workout?.completedAt,
        workout?.finishedAt,
        workout?.updatedAt,
        workout?.timestamp,
        workout?.createdAt,
        workout?.created,
        workout?.startedAt,
        workout?.started,
        workout?.performedAt,
        workout?.date,
    ];

    for (const candidate of candidates) {
        const ts = parseTimestamp(candidate);
        if (ts !== null) return ts;
    }
    return fallbackOrder;
};

const EMPTY_WORKOUTS = [];
let cachedWorkoutsRef = EMPTY_WORKOUTS;
let cachedUsageMetadata = null;

const ensureWorkoutsArray = (input) => (Array.isArray(input) ? input : EMPTY_WORKOUTS);

const ensureUsageMetadata = (completedWorkoutsInput) => {
    const workoutsSource =
        completedWorkoutsInput !== undefined
            ? completedWorkoutsInput
            : fallbackCompletedWorkouts();
    const workouts = ensureWorkoutsArray(workoutsSource);

    if (workouts === cachedWorkoutsRef && cachedUsageMetadata) {
        return cachedUsageMetadata;
    }

    const counts = Object.create(null);
    const lastVolumes = Object.create(null);
    const lastTimestamps = Object.create(null);

    workouts.forEach((workout, index) => {
        if (!workout || typeof workout !== "object" || !Array.isArray(workout.exercises)) return;

        const seenInWorkout = new Set();
        const volumeTotals = Object.create(null);

        workout.exercises.forEach((exercise) => {
            if (!exercise || typeof exercise !== "object") return;
            const nameLc = extractExerciseName(exercise);
            if (!nameLc) return;

            if (!seenInWorkout.has(nameLc)) {
                seenInWorkout.add(nameLc);
                counts[nameLc] = (counts[nameLc] || 0) + 1;
            }

            const computedVolume = computeExerciseVolume(exercise);
            if (!Number.isFinite(computedVolume)) return;
            volumeTotals[nameLc] = (volumeTotals[nameLc] || 0) + Math.max(0, computedVolume);
        });

        const timestamp = resolveTimestamp(workout, index);
        Object.keys(volumeTotals).forEach((name) => {
            const volume = volumeTotals[name];
            if (volume < 0) return;
            const prevTimestamp = lastTimestamps[name];
            if (prevTimestamp === undefined || timestamp >= prevTimestamp) {
                lastTimestamps[name] = timestamp;
                lastVolumes[name] = volume;
            }
        });
    });

    cachedWorkoutsRef = workouts;
    cachedUsageMetadata = { counts, lastVolumes, lastTimestamps };
    return cachedUsageMetadata;
};

export const buildExerciseUsageLookup = (completedWorkoutsInput) =>
    ensureUsageMetadata(completedWorkoutsInput).counts;

export const getLastExerciseVolume = (exerciseName, completedWorkoutsInput) => {
    const normalized = normalizeExerciseName(exerciseName);
    if (!normalized) return 0;
    const metadata = ensureUsageMetadata(completedWorkoutsInput);
    return metadata.lastVolumes[normalized] ?? 0;
};

export const countCompletedWorkoutsWithExercise = (exerciseName, completedWorkoutsInput) => {
    const normalized = normalizeExerciseName(exerciseName);
    if (!normalized) return 0;
    const lookup = buildExerciseUsageLookup(completedWorkoutsInput);
    return lookup[normalized] || 0;
};

export default countCompletedWorkoutsWithExercise;
