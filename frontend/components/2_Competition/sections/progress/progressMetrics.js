// Pure helpers of the Progress tab: cumulative metric series, value and timestamp formatting, x-axis labels.
import dayjs from "dayjs";

import makeID from "../../../../../backend/helper/makeID";
import { resolveWorkoutTimestamp } from "../../../../utils/completedWorkouts";
import { toMillisSafe } from "../../../../utils/date";
import { formatVolumeValue } from "../../../charts/chartMath";

export const buildMetricDeltaDisplay = (delta, unitLabel, formatter = formatVolumeValue) => {
    const numericDelta = Number(delta);
    if (!Number.isFinite(numericDelta) || numericDelta === 0) return null;
    const absValue = Math.abs(numericDelta);
    const formattedValue = formatter(absValue);
    const sign = numericDelta > 0 ? "+" : "-";
    const icon = numericDelta > 0 ? "arrow-up" : "arrow-down";
    const color = numericDelta > 0 ? "#65F2B6" : "#FF6B6B";
    return {
        icon,
        color,
        text: `${sign}${formattedValue}`,
    };
};

export const formatWeightValue = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return "--";
    const rounded = Math.round(num * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

export const formatTimestamp = (value) => {
    const ms = toMillisSafe(value);
    if (!Number.isFinite(ms) || ms <= 0) return "No Logged Data";
    try {
        return dayjs(ms).format("MMM D, h:mm A");
    } catch {
        return "No Logged Data";
    }
};

export const sanitizePersonalRecordEntries = (completedWorkouts) => {
    if (!Array.isArray(completedWorkouts)) return [];

    const prelim = completedWorkouts
        .map((workout) => {
            const recordedAt = resolveWorkoutTimestamp(workout);
            if (!Number.isFinite(recordedAt) || recordedAt <= 0) return null;

            const rawIncrement = Number(workout?.PBs ?? workout?.pbs ?? 0);
            const increment = Number.isFinite(rawIncrement) && rawIncrement > 0 ? rawIncrement : 0;

            const id = workout?.id || workout?.wid || workout?.workoutId || makeID();
            const name =
                (typeof workout?.name === "string" && workout.name.trim()) ||
                (typeof workout?.templateName === "string" && workout.templateName.trim()) ||
                "Workout";
            const wid =
                (typeof workout?.wid === "string" && workout.wid.trim()) ||
                (workout?.wid ? String(workout.wid).trim() : '') ||
                (workout?.workoutId ? String(workout.workoutId).trim() : '') ||
                (workout?.id ? String(workout.id).trim() : '');

            return {
                id,
                recordedAt,
                increment,
                name,
                wid,
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.recordedAt - b.recordedAt);

    let runningTotal = 0;
    return prelim.map((entry) => {
        runningTotal += entry.increment;
        return {
            ...entry,
            value: runningTotal,
        };
    });
};

export const sanitizeVolumeEntries = (completedWorkouts) => {
    if (!Array.isArray(completedWorkouts)) return [];
    const prelim = completedWorkouts
        .map((workout) => {
            if (!workout) return null;
            const recordedAt = resolveWorkoutTimestamp(workout);
            const volume = Number(workout?.volume ?? workout?.totalVolume ?? workout?.stats?.volume ?? 0);
            if (!Number.isFinite(recordedAt) || recordedAt <= 0 || !Number.isFinite(volume) || volume <= 0) return null;
            return {
                id: workout.id || workout.wid || workout.workoutId || workout.sessionId || makeID(),
                increment: volume,
                recordedAt,
                name:
                    (typeof workout?.name === "string" && workout.name.trim())
                        ? workout.name.trim()
                        : workout?.templateName || "Workout",
                wid: (typeof workout?.wid === "string" && workout.wid.trim()) ||
                    (workout?.wid ? String(workout.wid).trim() : '') ||
                    (workout?.workoutId ? String(workout.workoutId).trim() : '') ||
                    (workout?.id ? String(workout.id).trim() : ''),
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.recordedAt - b.recordedAt);

    const result = [];
    let runningTotal = 0;
    prelim.forEach((entry) => {
        runningTotal += entry.increment;
        result.push({ ...entry, value: runningTotal });
    });

    return result;
};

export const sanitizeRepsEntries = (completedWorkouts) => {
    if (!Array.isArray(completedWorkouts)) return [];
    const prelim = completedWorkouts
        .map((workout) => {
            if (!workout) return null;
            const recordedAt = resolveWorkoutTimestamp(workout);
            const reps =
                Number(
                    workout?.reps ??
                    workout?.totalReps ??
                    workout?.stats?.reps ??
                    workout?.stats?.totalReps ??
                    workout?.stats?.Reps ??
                    workout?.Reps ??
                    workout?.metrics?.reps ??
                    0
                ) || 0;
            if (!Number.isFinite(recordedAt) || recordedAt <= 0 || !Number.isFinite(reps) || reps <= 0) return null;
            return {
                id: workout.id || workout.wid || workout.workoutId || workout.sessionId || makeID(),
                increment: reps,
                recordedAt,
                name:
                    (typeof workout?.name === "string" && workout.name.trim())
                        ? workout.name.trim()
                        : workout?.templateName || "Workout",
                wid: (typeof workout?.wid === "string" && workout.wid.trim()) ||
                    (workout?.wid ? String(workout.wid).trim() : '') ||
                    (workout?.workoutId ? String(workout.workoutId).trim() : '') ||
                    (workout?.id ? String(workout.id).trim() : ''),
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.recordedAt - b.recordedAt);

    const result = [];
    let runningTotal = 0;
    prelim.forEach((entry) => {
        runningTotal += entry.increment;
        result.push({ ...entry, value: runningTotal });
    });

    return result;
};

const DEFAULT_X_AXIS_LABEL_COUNT = 5;

const formatXAxisDateLabel = (timestamp, span) => {
    const dateInstance = dayjs(timestamp);
    if (!dateInstance.isValid()) return "";

    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const threeMonths = 90 * 24 * 60 * 60 * 1000;

    if (span <= oneWeek) return dateInstance.format("MMM D");
    if (span <= threeMonths) return dateInstance.format("MMM D");
    return dateInstance.format("MMM YYYY");
};

export const buildXAxisLabels = (domain, desiredCount = DEFAULT_X_AXIS_LABEL_COUNT) => {
    if (!domain || typeof domain !== "object") return [];
    const { minX, maxX } = domain;
    if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return [];

    const span = Math.max(maxX - minX, 0);

    if (span <= 0) {
        const label = formatXAxisDateLabel(minX, span);
        return label ? [{ label, timestamp: minX }] : [];
    }

    const count = Math.max(2, Number(desiredCount) || DEFAULT_X_AXIS_LABEL_COUNT);
    const step = span / (count - 1);
    const labels = [];

    for (let i = 0; i < count; i += 1) {
        const isLast = i === count - 1;
        const timestamp = isLast ? maxX : minX + step * i;
        const formatted = formatXAxisDateLabel(timestamp, span);
        if (formatted) {
            // Leave a repeated date blank: a short span would otherwise print the same day at every tick.
            const isRepeat = labels.some((entry) => entry.label === formatted);
            labels.push({ label: isRepeat ? "" : formatted, timestamp });
        }
    }

    return labels;
};
