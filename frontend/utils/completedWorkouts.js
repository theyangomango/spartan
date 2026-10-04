// Reads a user's completed-workout list: drops empty entries and resolves a workout's timestamp.

import { toMillisSafe } from "./date";

const WORKOUT_TIMESTAMP_FIELDS = ["created"];

export const resolveWorkoutTimestamp = (workout) => {
    if (!workout || typeof workout !== "object") return 0;
    for (const field of WORKOUT_TIMESTAMP_FIELDS) {
        const ms = toMillisSafe(workout?.[field]);
        if (ms) return ms;
    }
    return 0;
};

export const sanitizeCompletedWorkouts = (raw) => {
    if (!Array.isArray(raw)) return [];
    return raw.filter(Boolean);
};
