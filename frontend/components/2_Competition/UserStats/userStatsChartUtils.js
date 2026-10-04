// Data helpers of the stats preview chart: series built from completed workouts, units, labels and metric metadata.
import dayjs from "dayjs";

import { toMillisSafe } from "../../../utils/date";

const DEFAULT_X_AXIS_LABEL_COUNT = 4;
export const CHART_ACCENTS = {
    volume: { r: 45, g: 158, b: 255 },
};

const resolveWorkoutTimestamp = (workout) => {
    if (!workout || typeof workout !== "object") return 0;
    const candidates = [workout.created, workout.createdAt, workout.timestamp];
    for (const candidate of candidates) {
        const ms = toMillisSafe(candidate);
        if (ms) return ms;
    }
    return 0;
};

export const sanitizeVolumeEntries = (completedWorkouts) => {
    if (!Array.isArray(completedWorkouts)) return [];
    const prelim = completedWorkouts
        .map((workout, idx) => {
            if (!workout) return null;
            const recordedAt = resolveWorkoutTimestamp(workout);
            const volume = Number(
                workout?.volume ??
                workout?.totalVolume ??
                workout?.stats?.volume ??
                workout?.metrics?.volume ??
                0
            );
            if (!Number.isFinite(recordedAt) || recordedAt <= 0 || !Number.isFinite(volume) || volume <= 0) return null;
            const wid =
                workout?.wid ||
                workout?.workoutId ||
                workout?.sessionId ||
                workout?.id ||
                workout?.workoutID ||
                workout?.workout_id;
            return {
                id: workout.id || workout.wid || workout.workoutId || workout.sessionId || `vol-${idx}`,
                wid: wid ? String(wid) : null,
                increment: volume,
                recordedAt,
                name:
                    (typeof workout?.name === "string" && workout.name.trim())
                        ? workout.name.trim()
                        : workout?.templateName || "Workout",
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.recordedAt - b.recordedAt);

    let runningTotal = 0;
    return prelim.map((entry) => {
        runningTotal += entry.increment;
        return { ...entry, value: runningTotal };
    });
};

export const sanitizeRepsEntries = (completedWorkouts) => {
    if (!Array.isArray(completedWorkouts)) return [];
    const prelim = completedWorkouts
        .map((workout, idx) => {
            if (!workout) return null;
            const recordedAt = resolveWorkoutTimestamp(workout);
            const reps = Number(
                workout?.reps ??
                workout?.totalReps ??
                workout?.stats?.reps ??
                workout?.stats?.totalReps ??
                workout?.metrics?.reps ??
                0
            );
            if (!Number.isFinite(recordedAt) || recordedAt <= 0 || !Number.isFinite(reps) || reps <= 0) return null;
            const wid =
                workout?.wid ||
                workout?.workoutId ||
                workout?.sessionId ||
                workout?.id ||
                workout?.workoutID ||
                workout?.workout_id;
            return {
                id: workout.id || workout.wid || workout.workoutId || workout.sessionId || `rep-${idx}`,
                wid: wid ? String(wid) : null,
                increment: reps,
                recordedAt,
                name:
                    (typeof workout?.name === "string" && workout.name.trim())
                        ? workout.name.trim()
                        : workout?.templateName || "Workout",
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.recordedAt - b.recordedAt);

    let runningTotal = 0;
    return prelim.map((entry) => {
        runningTotal += entry.increment;
        return { ...entry, value: runningTotal };
    });
};

export const sanitizePersonalRecordEntries = (completedWorkouts) => {
    if (!Array.isArray(completedWorkouts)) return [];
    const prelim = completedWorkouts
        .map((workout, idx) => {
            const recordedAt = resolveWorkoutTimestamp(workout);
            const rawIncrement = Number(workout?.PBs ?? workout?.pbs ?? 0);
            const increment = Number.isFinite(rawIncrement) && rawIncrement > 0 ? rawIncrement : 0;
            if (!Number.isFinite(recordedAt) || recordedAt <= 0 || increment <= 0) return null;
            const wid =
                workout?.wid ||
                workout?.workoutId ||
                workout?.sessionId ||
                workout?.id ||
                workout?.workoutID ||
                workout?.workout_id;
            return {
                id: workout.id || workout.wid || workout.workoutId || `pr-${idx}`,
                wid: wid ? String(wid) : null,
                increment,
                recordedAt,
                name:
                    (typeof workout?.name === "string" && workout.name.trim())
                        ? workout.name.trim()
                        : workout?.templateName || "Workout",
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.recordedAt - b.recordedAt);

    let runningTotal = 0;
    return prelim.map((entry) => {
        runningTotal += entry.increment;
        return { ...entry, value: runningTotal };
    });
};

export const resolvePreferredWeightUnit = (user) => {
    const rawUnit =
        user?.settings?.units ||
        user?.units ||
        user?.personalInfo?.weightUnit ||
        user?.stats?.weightUnit;
    if (typeof rawUnit === "string") {
        const normalized = rawUnit.trim().toLowerCase();
        if (normalized.startsWith("k")) return "kg";
    }
    return "lbs";
};

export const formatTimestamp = (value) => {
    const ms = toMillisSafe(value);
    if (!Number.isFinite(ms) || ms <= 0) return "No data yet";
    try {
        return dayjs(ms).format("MMM D, h:mm A");
    } catch {
        return "No data yet";
    }
};

export const buildXAxisLabels = (domain, desiredCount = DEFAULT_X_AXIS_LABEL_COUNT) => {
    if (!domain || typeof domain !== "object") return [];
    const { minX, maxX } = domain;
    if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return [];

    const span = Math.max(maxX - minX, 0);

    if (span <= 0) {
        const label = dayjs(minX).format("MMM D");
        return label ? [{ label, timestamp: minX }] : [];
    }

    const count = Math.max(2, Number(desiredCount) || DEFAULT_X_AXIS_LABEL_COUNT);
    const step = span / (count - 1);
    const labels = [];

    for (let i = 0; i < count; i += 1) {
        const isLast = i === count - 1;
        const timestamp = isLast ? maxX : minX + step * i;
        const formatted = dayjs(timestamp).format("MMM D");
        if (formatted) {
            labels.push({ label: formatted, timestamp });
        }
    }

    return labels;
};

export const BASE_METRIC_META = {
    volume: {
        key: "volume",
        label: "Volume",
        title: "Total Volume",
        accent: { r: 45, g: 158, b: 255 },
        unit: "lbs",
        hint: ["Auto-updates from", "completed workouts."],
        gradient: ["#7FB7FF", "#2D7BFF"],
        line: "#7FB7FF",
    },
    reps: {
        key: "reps",
        label: "Reps",
        title: "Total Reps",
        accent: { r: 45, g: 158, b: 255 },
        unit: "reps",
        hint: ["Auto-updates from", "completed workouts."],
        gradient: ["#7FB7FF", "#2D7BFF"],
        line: "#7FB7FF",
    },
    personalRecords: {
        key: "personalRecords",
        label: "PRs",
        title: "Total Personal Records",
        accent: { r: 45, g: 158, b: 255 },
        unit: "PRs",
        hint: ["Auto-updates when you", "hit new PRs."],
        gradient: ["#7FB7FF", "#2D7BFF"],
        line: "#7FB7FF",
    },
};

export const toDisplayWeightUnit = (unit, fallback = "lbs") => {
    if (typeof unit !== "string") return fallback;
    const normalized = unit.trim().toLowerCase();
    if (normalized.startsWith("k")) return "kg";
    if (normalized.startsWith("lb")) return "lbs";
    return fallback;
};
