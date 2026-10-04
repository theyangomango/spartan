// Builds the estimated-1RM sparkline path shown on each row of the muscle-group exercise list.
import calculate1RM from "../../helper/calculate1RM";
import { formatWeightValue } from "./muscleGroupExercisesUtils";

const SPARK_WIDTH = 160;
const SPARK_HEIGHT = 60;
const SPARK_PAD_X = 6;
const SPARK_PAD_Y = 10;
const ONE_RM_EQUAL_EPSILON = 0.75;

const buildSparklinePath = (progress = [], fallbackValue = null, sets = [], workouts = []) => {
    const toMillisSafe = (value) => {
        if (value === null || value === undefined) return 0;
        if (typeof value === "number") return Number.isFinite(value) ? value : 0;
        if (value instanceof Date) return Number.isNaN(value.getTime()) ? 0 : value.getTime();
        if (typeof value?.toMillis === "function") {
            const result = Number(value.toMillis());
            return Number.isFinite(result) ? result : 0;
        }
        if (typeof value?.toDate === "function") {
            try {
                const dateResult = value.toDate();
                if (dateResult instanceof Date) {
                    const ms = dateResult.getTime();
                    if (Number.isFinite(ms)) return ms;
                }
            } catch { }
        }
        if (typeof value === "object" && typeof value.seconds === "number") {
            return value.seconds * 1000;
        }
        if (typeof value === "object" && typeof value._seconds === "number") {
            return value._seconds * 1000;
        }
        if (typeof value === "string") {
            const parsed = Date.parse(value);
            if (Number.isFinite(parsed)) return parsed;
            const numeric = Number(value);
            if (Number.isFinite(numeric)) return numeric;
        }
        return 0;
    };

    const resolveWorkoutTimestamp = (workout) => {
        if (!workout) return 0;
        const fields = ["created", "createdAt", "completedAt", "finishedAt", "startedAt", "updatedAt"];
        for (const field of fields) {
            const ts = toMillisSafe(workout?.[field]);
            if (ts) return ts;
        }
        return 0;
    };

    const workoutsByWid = new Map();
    (Array.isArray(workouts) ? workouts : []).forEach((wk) => {
        const wid = wk?.wid || wk?.workoutId || wk?.id || wk?.pid;
        if (wid !== null && wid !== undefined) {
            const str = String(wid).trim();
            if (str) workoutsByWid.set(str, wk);
        }
    });

    const normalizeTs = (input, idx) => {
        if (typeof input === "number" && Number.isFinite(input)) {
            if (input > 1e12) return input;
            if (input > 1e9) return input * 1000;
            return input;
        }
        if (typeof input === "string") {
            const parsed = Date.parse(input);
            if (Number.isFinite(parsed)) return parsed;
            const numeric = Number(input);
            if (Number.isFinite(numeric)) return numeric;
        }
        return idx;
    };

    const parseNumeric = (raw) => {
        if (typeof raw === "number") return raw;
        if (typeof raw === "string") {
            const cleaned = raw.replace(/[^\d.-]/g, "");
            const num = Number(cleaned);
            if (Number.isFinite(num)) return num;
        }
        if (raw && typeof raw === "object") {
            if ("value" in raw) return parseNumeric(raw.value);
            if ("val" in raw) return parseNumeric(raw.val);
            if ("weight" in raw && "reps" in raw) {
                const est = calculate1RM(parseNumeric(raw.weight), parseNumeric(raw.reps));
                if (Number.isFinite(est)) return est;
            }
        }
        return null;
    };

    const progressOneRmPoints = [];
    const setOneRmPoints = [];
    const volumePoints = [];

    const normalizeOneRmValue = (v) => {
        const num = Number(v);
        if (!Number.isFinite(num) || num <= 0) return 0;
        return Math.round(num * 10) / 10;
    };

    const resolveSetTimestamp = (set, idx) => {
        const wid = set?.wid ? String(set.wid).trim() : "";
        if (wid && workoutsByWid.has(wid)) {
            const ts = resolveWorkoutTimestamp(workoutsByWid.get(wid));
            if (ts) return ts;
        }
        const fallback = toMillisSafe(set?.timestamp ?? set?.ts ?? set?.date ?? set?.day ?? set?.dayKey);
        if (fallback) return fallback;
        return normalizeTs(null, idx);
    };

    const rows = Array.isArray(progress)
        ? progress
        : progress && typeof progress === "object"
            ? Object.entries(progress).map(([key, value]) => ({
                ...(value || {}),
                // Use key as date fallback when progress is a map keyed by day
                date: value?.date ?? value?.day ?? value?.dayKey ?? key,
            }))
            : [];

    rows.forEach((entry, idx) => {
        const oneRm = parseNumeric(
            entry?.["1RM"] ??
            entry?.oneRM ??
            entry?.oneRm ??
            entry?.value ??
            entry?.val ??
            entry
        );
        const volume = parseNumeric(entry?.volume ?? entry?.vol);
        const ts = normalizeTs(entry?.date ?? entry?.day ?? entry?.dayKey ?? entry?.ts ?? entry?.timestamp, idx);

        if (Number.isFinite(oneRm) && oneRm > 0) progressOneRmPoints.push({ ts, val: oneRm });
        if (Number.isFinite(volume) && volume > 0) volumePoints.push({ ts, val: volume });
    });

    const setMap = new Map();
    if (Array.isArray(sets)) {
        sets.forEach((set, idx) => {
            const weight = parseNumeric(set?.weight);
            const reps = parseNumeric(set?.reps);
            if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(reps) || reps <= 0) return;
            const ts = resolveSetTimestamp(set, rows.length + idx);
            const est = normalizeOneRmValue(calculate1RM(weight, reps));
            if (!Number.isFinite(est) || est <= 0) return;
            if (!setMap.has(ts) || setMap.get(ts) < est) {
                setMap.set(ts, est);
            }
        });
    }
    setMap.forEach((val, ts) => setOneRmPoints.push({ ts, val }));

    const pickSeries = (points) =>
        points
            .sort((a, b) => (Number(a?.ts) || 0) - (Number(b?.ts) || 0))
            .map((p) => p.val)
            .slice(-12);

    const oneRmSeriesFromSets = pickSeries(setOneRmPoints.length ? setOneRmPoints : progressOneRmPoints);
    const oneRmSeries = (() => {
        if (!oneRmSeriesFromSets.length) return [];
        const result = [];
        let prev = null;
        oneRmSeriesFromSets.forEach((val) => {
            const normalized = normalizeOneRmValue(val);
            if (!normalized) return;
            if (prev != null) {
                const delta = normalized - prev;
                const sameDisplay =
                    Math.abs(delta) <= ONE_RM_EQUAL_EPSILON ||
                    formatWeightValue(normalized) === formatWeightValue(prev);
                if (sameDisplay) return;
            }
            result.push(normalized);
            prev = normalized;
        });
        return result;
    })();
    const volumeSeries = pickSeries(volumePoints);

    // Prefer 1RM series even if flat; only fall back to volume when there is no 1RM data.
    let values = oneRmSeries.length ? oneRmSeries : volumeSeries;

    if (values.length === 1) values.push(values[0]);

    if (values.length === 0) {
        const fallbackNum = Number(fallbackValue);
        if (Number.isFinite(fallbackNum) && fallbackNum > 0) {
            values = [fallbackNum, fallbackNum];
        } else {
            return `M ${SPARK_PAD_X} ${SPARK_HEIGHT / 2} L ${SPARK_WIDTH - SPARK_PAD_X} ${SPARK_HEIGHT / 2}`;
        }
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const norm = values.map((v) => (v - min) / range);
    const innerWidth = SPARK_WIDTH - SPARK_PAD_X * 2;
    const innerHeight = SPARK_HEIGHT - SPARK_PAD_Y * 2;
    const step = innerWidth / (norm.length - 1 || 1);

    let path = "";
    norm.forEach((ratio, idx) => {
        const x = SPARK_PAD_X + step * idx;
        const y = SPARK_PAD_Y + innerHeight * (1 - ratio);
        path += `${idx === 0 ? "M" : " L"} ${x} ${y}`;
    });
    return path;
};

export { SPARK_WIDTH, SPARK_HEIGHT, buildSparklinePath };
