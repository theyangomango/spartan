import { exercises as EXERCISE_DEFS } from "../../3_Workout/NewWorkout/SelectExercise/EXERCISES";

const safeNumber = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

const fmtK = (n) => {
    const v = safeNumber(n, 0);
    if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
    return `${Math.round(v)}`;
};

// Estimate 1RM via Epley if missing; picks best set by weight*reps
const estimate1RM = (exercise) => {
    const explicit = safeNumber(exercise?.["1RM"], NaN);
    if (Number.isFinite(explicit)) return Math.round(explicit);
    const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
    if (!sets.length) return 0;
    let best = 0;
    for (const s of sets) {
        const w = safeNumber(s?.weight, 0);
        const r = safeNumber(s?.reps, 0);
        const est = w * (1 + r / 30);
        if (est > best) best = est;
    }
    return Math.round(best || 0);
};

const computeVolume = (exercise) => {
    const explicit = safeNumber(exercise?.Volume, NaN);
    if (Number.isFinite(explicit)) return explicit;
    const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
    return sets.reduce((sum, s) => sum + safeNumber(s?.weight, 0) * safeNumber(s?.reps, 0), 0);
};

const computeTotalReps = (exercise) => {
    const explicit = safeNumber(exercise?.Reps ?? exercise?.totalReps ?? exercise?.total_reps, NaN);
    if (Number.isFinite(explicit)) return explicit;
    const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
    return sets.reduce((sum, s) => sum + safeNumber(s?.reps, 0), 0);
};

const extractWid = (entry) => {
    if (!entry) return "";
    const candidates = [entry?.wid, entry?.workoutWid, entry?.workoutId, entry?.workoutID, entry?.id];
    for (const candidate of candidates) {
        if (candidate || candidate === 0) {
            const str = String(candidate).trim();
            if (str) return str;
        }
    }
    return "";
};

const toMillis = (value) => {
    if (value == null) return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'object') {
        if (typeof value.toMillis === 'function') {
            const millis = value.toMillis();
            return Number.isFinite(millis) ? millis : 0;
        }
        if (Number.isFinite(value.seconds)) return value.seconds * 1000;
        if (Number.isFinite(value._seconds)) return value._seconds * 1000;
    }
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
};

const workoutSortTimestamp = (workout) => Math.max(
    toMillis(workout?.finishedAt),
    toMillis(workout?.completedAt),
    toMillis(workout?.completedAtMillis),
    toMillis(workout?.finishedAtMillis),
    toMillis(workout?.startedAt),
    toMillis(workout?.createdAt),
    toMillis(workout?.created),
    toMillis(workout?.updatedAt),
);

const ensureWorkoutPrivacy = (wk) => {
    if (!wk || typeof wk !== 'object') return null;
    if (Object.prototype.hasOwnProperty.call(wk, 'privacyMode') && wk.privacyMode) return wk;
    return { ...wk, privacyMode: wk?.privacyMode ?? 'hidden' };
};

const bestTopSet = (exercise) => {
    const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
    if (!sets.length) return null;
    let best = null;
    let bestScore = -Infinity;
    for (const s of sets) {
        const w = safeNumber(s?.weight, 0);
        const r = safeNumber(s?.reps, 0);
        const score = w * r;
        if (score > bestScore) {
            bestScore = score;
            best = { weight: Math.round(w), reps: Math.round(r) };
        }
    }
    return best;
};

// Order sections by common body-part groupings
const GROUP_ORDER = {
    Chest: 0,
    Back: 1,
    Shoulders: 2,
    Arms: 3,
    Legs: 4,
    Abs: 5,
    "Full Body": 6,
    Other: 7,
};

// Map exercise name -> muscle group once
const NAME_TO_GROUP = (() => {
    const map = new Map();
    try {
        (Array.isArray(EXERCISE_DEFS) ? EXERCISE_DEFS : []).forEach((e) => {
            if (e?.name) map.set(String(e.name), String(e.muscleGroup || "Other") || "Other");
        });
    } catch { }
    return map;
})();

const getExercisesGrouped = (user) => {
    const map = user?.statsExercises || {};
    const entries = Object.entries(map)
        .filter(([, ex]) => (Array.isArray(ex?.sets) ? ex.sets.length > 0 : (ex?.["1RM"] || ex?.Volume)))
        .map(([name, ex]) => ({ name, exercise: ex }));

    const grouped = new Map();
    for (const item of entries) {
        const group = NAME_TO_GROUP.get(item.name) || "Other";
        if (!grouped.has(group)) grouped.set(group, []);
        grouped.get(group).push(item);
    }

    const sortItems = (a, b) => {
        const aSets = Array.isArray(a.exercise?.sets) ? a.exercise.sets.length : 0;
        const bSets = Array.isArray(b.exercise?.sets) ? b.exercise.sets.length : 0;
        if (bSets !== aSets) return bSets - aSets;
        const rmDiff = estimate1RM(b.exercise) - estimate1RM(a.exercise);
        if (rmDiff !== 0) return rmDiff;
        return String(a.name).localeCompare(String(b.name));
    };
    for (const [, list] of grouped) list.sort(sortItems);

    const orderedGroups = Array.from(grouped.entries())
        .sort((a, b) => {
            const ga = GROUP_ORDER[a[0]] ?? 999;
            const gb = GROUP_ORDER[b[0]] ?? 999;
            if (ga !== gb) return ga - gb;
            return String(a[0]).localeCompare(String(b[0]));
        })
        .map(([group, items]) => ({ group, items }));

    return orderedGroups;
};

const toDate = (d) => {
    if (!d) return null;
    if (d instanceof Date) return d;
    if (typeof d === "object" && Number.isFinite(d.seconds)) return new Date(d.seconds * 1000);
    if (typeof d === "number") return new Date(d);
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? null : parsed;
};

const formatJoinDate = (raw) => {
    const date = toDate(raw ?? null);
    if (!date) return "Joined";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `Joined ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

export {
    safeNumber,
    fmtK,
    estimate1RM,
    computeVolume,
    computeTotalReps,
    extractWid,
    toMillis,
    workoutSortTimestamp,
    ensureWorkoutPrivacy,
    bestTopSet,
    getExercisesGrouped,
    formatJoinDate,
};
