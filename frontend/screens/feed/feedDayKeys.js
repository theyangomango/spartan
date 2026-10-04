// Day-key (YYYY-MM-DD) helpers of the Feed calendar: workout days of a user and the day a post belongs to.

const dateToDayKey = (date) => {
    if (!(date instanceof Date)) return null;
    const ms = date.getTime();
    if (!Number.isFinite(ms)) return null;
    const normalized = new Date(ms);
    normalized.setHours(0, 0, 0, 0);
    return `${normalized.getFullYear()}-${String(normalized.getMonth() + 1).padStart(2, "0")}-${String(normalized.getDate()).padStart(2, "0")}`;
};

export const dayKeyToTimestamp = (key) => {
    if (typeof key !== "string" || !key) return null;
    const parts = key.split("-");
    if (parts.length !== 3) return null;
    const [yearStr, monthStr, dayStr] = parts;
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date.getTime();
};

export const toDayKeyString = (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
        const parsed = new Date(trimmed);
        return dateToDayKey(parsed);
    }
    if (value instanceof Date) {
        return dateToDayKey(value);
    }
    if (typeof value === "number" && Number.isFinite(value)) {
        return dateToDayKey(new Date(value));
    }
    if (typeof value?.toDate === "function") {
        try {
            const parsed = value.toDate();
            return dateToDayKey(parsed);
        } catch {
            return null;
        }
    }
    if (typeof value?.toMillis === "function") {
        try {
            const millis = value.toMillis();
            if (Number.isFinite(millis)) {
                return dateToDayKey(new Date(millis));
            }
        } catch {
            return null;
        }
    }
    if (typeof value === "object") {
        const seconds = Number(value?.seconds);
        if (Number.isFinite(seconds)) {
            const millis = (seconds * 1000) + (Number(value?.nanoseconds) / 1000000 || 0);
            return dateToDayKey(new Date(millis));
        }
    }
    return null;
};

const deriveWorkoutDayKey = (workout) => {
    if (!workout || typeof workout !== "object") return null;

    const explicit = [
        workout.dayKey,
        workout.logDay,
        workout.logDate,
        workout.date,
        workout.day,
        workout.completedDay,
        workout.finishedDay,
    ];
    for (const entry of explicit) {
        const key = toDayKeyString(entry);
        if (key) return key;
    }

    const timestamps = [
        workout.startedAt,
        workout.createdAt,
        workout.created,
        workout.finishedAt,
        workout.completedAt,
        workout.updatedAt,
    ];
    for (const entry of timestamps) {
        const key = toDayKeyString(entry);
        if (key) return key;
    }
    return null;
};

export const buildWorkoutDaySet = (user) => {
    const set = new Set();
    if (!user) return set;

    const workouts = Array.isArray(user?.completedWorkouts) ? user.completedWorkouts : [];
    workouts.forEach((wk) => {
        const key = deriveWorkoutDayKey(wk);
        if (key) set.add(key);
    });

    if (set.size > 0) return set;

    const workoutsByDate = user?.workoutsByDate;
    if (workoutsByDate && typeof workoutsByDate === "object") {
        Object.keys(workoutsByDate).forEach((key) => {
            const normalized = toDayKeyString(key);
            if (normalized) set.add(normalized);
        });
    }

    return set;
};

export const getWorkoutDayKeyFromPost = (post) => {
    if (!post) return null;
    const workout = post?.workout || null;
    const workoutKey = deriveWorkoutDayKey(workout);
    if (workoutKey) return workoutKey;

    const postCandidates = [
        post.dayKey,
        post.date,
        post.createdAt,
        post.created,
    ];

    for (const entry of postCandidates) {
        const key = toDayKeyString(entry);
        if (key) return key;
    }

    return null;
};
