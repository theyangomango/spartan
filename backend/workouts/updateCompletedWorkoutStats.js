// Timestamp helpers and the stats rebuild used when a completed workout is edited.
import computeHexagonFromStats from "../../shared/computeHexagon.js";
import { toNumber, calculate1RM, parseDayKey, inferGroup, distributeFullBody } from "./workoutStatsPrimitives.js";

const toMillis = (value) => {
    if (value == null) return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (value?.toMillis) {
        try {
            return value.toMillis();
        } catch {
            return 0;
        }
    }
    if (typeof value === "object") {
        const seconds = Number(value.seconds ?? value._seconds);
        if (Number.isFinite(seconds)) {
            const nanos = Number(value.nanoseconds ?? value._nanoseconds ?? 0);
            const extra = Number.isFinite(nanos) ? Math.floor(nanos / 1e6) : 0;
            return seconds * 1000 + extra;
        }
    }
    const ts = new Date(value).getTime();
    return Number.isFinite(ts) ? ts : 0;
};

const toDayKey = (value) => {
    const ms = toMillis(value);
    if (!ms) return "";
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return "";
    d.setHours(0, 0, 0, 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// When the workout happened. updatedAt is left out on purpose: an edit must not move the workout to the edit day.
const deriveBestTimestamp = (workout) => (
    Math.max(
        toMillis(workout?.finishedAt),
        toMillis(workout?.completedAt),
        toMillis(workout?.startedAt),
        toMillis(workout?.createdAt),
        toMillis(workout?.created),
        0,
    )
);

const rebuildStatsFromWorkouts = (workouts) => {
    const statsMap = Object.create(null);
    let totalVolume = 0;
    let totalHours = 0;
    const workoutsByDate = {};

    (Array.isArray(workouts) ? workouts : []).forEach((workout) => {
        const wid = workout?.wid ?? workout?.id ?? workout?.workoutId ?? workout?.pid ?? null;
        const widStr = wid != null ? String(wid).trim() : "";
        const dayKey = toDayKey(deriveBestTimestamp(workout));
        if (dayKey) workoutsByDate[dayKey] = true;

        const exercises = Array.isArray(workout?.exercises) ? workout.exercises : [];
        let workoutVolume = toNumber(workout?.volume);
        if (!workoutVolume && exercises.length) {
            workoutVolume = exercises.reduce((acc, exercise) => {
                const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
                return acc + sets.reduce((sum, set) => sum + toNumber(set?.reps ?? set?.rep ?? set?.r) * toNumber(set?.weight ?? set?.lbs ?? set?.kg ?? set?.load), 0);
            }, 0);
        }
        totalVolume += workoutVolume;

        let durationMs = toNumber(workout?.duration);
        if (!durationMs) {
            const startTs = toMillis(workout?.startedAt ?? workout?.createdAt ?? workout?.created);
            const endTs = toMillis(workout?.finishedAt ?? workout?.completedAt ?? workout?.endedAt);
            if (endTs && startTs && endTs > startTs) {
                durationMs = endTs - startTs;
            }
        }
        totalHours += durationMs / 3600000;

        exercises.forEach((exercise) => {
            const name = String(exercise?.name || "").trim();
            if (!name) return;
            const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
            if (!sets.length) return;
            const entry = statsMap[name] || { sets: [] };
            sets.forEach((set) => {
                const reps = toNumber(set?.reps ?? set?.rep ?? set?.r);
                const weight = toNumber(set?.weight ?? set?.lbs ?? set?.kg ?? set?.load);
                if (reps <= 0 || weight <= 0) return;
                const setDay = toDayKey(set?.date) || dayKey || toDayKey(Date.now());
                entry.sets.push({
                    weight,
                    reps,
                    date: setDay,
                    wid: widStr || undefined,
                    privacyMode: workout?.privacyMode ?? "followers",
                });
            });
            statsMap[name] = entry;
        });
    });

    const statsExercises = {};
    const lastTrainedTs = {
        shoulders: 0, chest: 0, arms: 0, legs: 0, back: 0, abs: 0,
    };

    Object.entries(statsMap).forEach(([name, entry]) => {
        const sets = entry.sets;
        if (!Array.isArray(sets) || sets.length === 0) return;

        let totalReps = 0;
        let totalVolumeEx = 0;
        let best1RM = 0;
        let bestSet = null;
        const timelineMap = new Map();

        sets.forEach((set) => {
            const reps = toNumber(set.reps);
            const weight = toNumber(set.weight);
            totalReps += reps;
            totalVolumeEx += reps * weight;
            const est = calculate1RM(weight, reps);
            if (est > best1RM) {
                best1RM = est;
                bestSet = { weight, reps };
            }
            const day = set.date || toDayKey(Date.now());
            if (!timelineMap.has(day)) {
                timelineMap.set(day, { volume: 0, best: 0 });
            }
            const dayEntry = timelineMap.get(day);
            dayEntry.volume += reps * weight;
            if (est > dayEntry.best) dayEntry.best = est;
        });

        const progress = [];
        const sortedDays = Array.from(timelineMap.keys()).sort();
        let runningBest = 0;
        sortedDays.forEach((day) => {
            const { volume, best } = timelineMap.get(day);
            runningBest = Math.max(runningBest, best);
            progress.push({ date: day, "1RM": runningBest || best || 0, volume });
        });

        const statsEntry = {
            sets,
            Reps: totalReps,
            Volume: totalVolumeEx,
            progress1RM: progress,
        };
        if (best1RM > 0) {
            statsEntry["1RM"] = best1RM;
            statsEntry.bestSet = bestSet;
        }

        statsExercises[name] = statsEntry;

        const group = inferGroup(name);
        if (!group) return;
        let latestTs = 0;
        progress.forEach((row) => {
            const ts = parseDayKey(row?.date);
            if (ts > latestTs) latestTs = ts;
        });
        if (!latestTs) {
            sets.forEach((set) => {
                const ts = parseDayKey(set?.date);
                if (ts > latestTs) latestTs = ts;
            });
        }
        if (!latestTs) return;
        if (group === "full") {
            distributeFullBody(lastTrainedTs, latestTs);
        } else if (lastTrainedTs[group] < latestTs) {
            lastTrainedTs[group] = latestTs;
        }
    });

    const { statsHexagon } = computeHexagonFromStats({
        statsExercises,
        prevStatsHexagon: {},
        trainedExerciseNames: Object.keys(statsExercises),
    });

    const lastTrainedByGroup = {};
    Object.entries(lastTrainedTs).forEach(([group, ts]) => {
        if (ts) {
            lastTrainedByGroup[group] = ts;
        }
    });

    return {
        statsExercises,
        statsHexagon,
        lastTrainedByGroup,
        statsTotalVolume: totalVolume,
        statsTotalHours: Number(totalHours.toFixed(3)),
        statsTotalWorkouts: Array.isArray(workouts) ? workouts.length : 0,
        workoutsByDate,
    };
};

export { toMillis, deriveBestTimestamp, rebuildStatsFromWorkouts };
