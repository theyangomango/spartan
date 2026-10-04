// Pure helpers of the ProfileWorkoutsAndPosts screen: a workout's id and newest-first ordering of posts and workouts.
import { stringCandidates } from "../../utils/feedItemUtils";

export const extractWidFromWorkout = (workout) => stringCandidates([
    workout?.wid,
    workout?.workoutWid,
    workout?.workoutId,
    workout?.workoutID,
    workout?.id,
]);

export const sortPostsByCreated = (list) => {
    if (!Array.isArray(list)) return [];
    return [...list].sort((a, b) => {
        const left = Number(a?.created ?? a?.createdAt ?? a?.timestamp ?? 0) || 0;
        const right = Number(b?.created ?? b?.createdAt ?? b?.timestamp ?? 0) || 0;
        return right - left;
    });
};

const getWorkoutTimestamp = (workout = {}) => {
    const candidates = [
        workout.finishedAt,
        workout.completedAt,
        workout.createdAt,
        workout.created,
        workout.startedAt,
    ];
    for (const value of candidates) {
        if (value == null) continue;
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value?.toMillis === 'function') {
            const millis = value.toMillis();
            if (Number.isFinite(millis)) return millis;
        }
        const parsed = new Date(value).getTime();
        if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
};

export const sortWorkoutsByTimestamp = (list) => {
    if (!Array.isArray(list)) return [];
    return [...list].sort((a, b) => getWorkoutTimestamp(b) - getWorkoutTimestamp(a));
};
