// Pure helpers for the muscle-group exercise list: exercise metadata lookup, grouping and estimated 1RM.
import { exercises as EXERCISE_DEFS } from "../../components/3_Workout/NewWorkout/SelectExercise/EXERCISES";
import { toExerciseSlug } from "../../components/common/exerciseImageMap";
import calculate1RM from "../../helper/calculate1RM";
import { buildMetaFromDefs, inferMetaByName } from "../../logic/exerciseCatalog";

const EXERCISE_META_MAP = (() => {
    const defsMeta = buildMetaFromDefs(EXERCISE_DEFS);
    const map = new Map();
    const register = (name, meta) => {
        const key = String(name || "").trim().toLowerCase();
        if (!key || map.has(key)) return;
        map.set(key, meta || {});
        const simplified = key.replace(/\s*\(([^)]+)\)\s*/g, "").trim();
        if (simplified && !map.has(simplified)) {
            map.set(simplified, meta || {});
        }
    };
    Object.entries(defsMeta || {}).forEach(([name, meta]) => register(name, meta));
    return map;
})();

const normalizeGroupKey = (group) => {
    if (typeof group !== "string") return null;
    const key = group.trim().toLowerCase();
    if (!key) return null;
    if (key.startsWith("shoulder")) return "shoulders";
    if (key === "chest") return "chest";
    if (key === "arms" || key.includes("arm") || key.includes("bicep") || key.includes("tricep")) return "arms";
    if (key === "legs" || key.includes("leg") || key.includes("quad") || key.includes("calf") || key.includes("hamstring")) return "legs";
    if (key === "back" || key.includes("back") || key.includes("trap")) return "back";
    if (key === "abs" || key.includes("core")) return "abs";
    if (key === "full" || key.includes("full body")) return "overall";
    return key;
};

const resolveExerciseGroup = (name, entry) => {
    const fallbackFields = [entry?.muscleGroup, entry?.muscle];
    for (const field of fallbackFields) {
        const normalized = normalizeGroupKey(field);
        if (normalized) return normalized;
    }

    const normalizedName = String(name || "").trim().toLowerCase();
    if (normalizedName) {
        const directMeta = EXERCISE_META_MAP.get(normalizedName);
        if (directMeta?.group) {
            const normalized = normalizeGroupKey(directMeta.group);
            if (normalized) return normalized;
        }
        const simplified = normalizedName.replace(/\s*\(([^)]+)\)\s*/g, "").trim();
        if (simplified) {
            const simplifiedMeta = EXERCISE_META_MAP.get(simplified);
            if (simplifiedMeta?.group) {
                const normalized = normalizeGroupKey(simplifiedMeta.group);
                if (normalized) return normalized;
            }
        }
    }

    const inferred = inferMetaByName(name || "");
    return normalizeGroupKey(inferred?.group);
};

const buildExerciseList = (statsExercises, workouts, targetGroup) => {
    const target = normalizeGroupKey(targetGroup) || "overall";
    const seen = new Map();

    const record = (rawName, entry, source = "workout") => {
        const name = typeof rawName === "string" ? rawName.trim() : "";
        if (!name) return;
        const normalizedKey = name.toLowerCase();
        const existing = seen.get(normalizedKey);
        const resolvedGroup = normalizeGroupKey(resolveExerciseGroup(name, entry)) || "overall";
        if (target !== "overall" && resolvedGroup !== target) return;
        const next = existing ? { ...existing } : { name, group: resolvedGroup };
        if (source === "stats" && entry) {
            next.statsEntry = entry;
        }
        if (source === "workout" && entry) {
            const sets = Array.isArray(entry?.sets) ? entry.sets.filter(Boolean) : [];
            if (!next.workoutSets && sets.length) next.workoutSets = sets;
        }
        if (!next.slug) next.slug = toExerciseSlug(name);
        seen.set(normalizedKey, next);
    };

    Object.entries(statsExercises || {}).forEach(([name, entry]) => record(name, entry, "stats"));

    (Array.isArray(workouts) ? workouts : []).forEach((workout) => {
        const exercises = Array.isArray(workout?.exercises) ? workout.exercises : [];
        exercises.forEach((ex) => record(ex?.name, ex, "workout"));
    });

    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
};

const formatWeightValue = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return null;
    if (num >= 100) return Math.round(num).toString();
    const rounded = Math.round(num * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

const computeBestOneRmFromSets = (sets = []) => {
    if (!Array.isArray(sets) || !sets.length) return null;
    let best = 0;
    sets.forEach((set) => {
        const reps = Number(set?.reps) || 0;
        const weight = Number(set?.weight) || 0;
        if (reps > 0 && weight > 0) {
            const est = calculate1RM(weight, reps);
            if (est > best) best = est;
        }
    });
    return best > 0 ? best : null;
};

const resolveEstimatedOneRm = (item) => {
    const stats = item?.statsEntry || {};
    const direct = Number(stats?.["1RM"] ?? stats?.oneRM ?? stats?.oneRm ?? stats?.oneRepMax);
    if (Number.isFinite(direct) && direct > 0) return direct;

    if (stats?.bestSet) {
        const w = Number(stats.bestSet?.weight) || 0;
        const r = Number(stats.bestSet?.reps) || 0;
        if (w > 0 && r > 0) {
            const est = calculate1RM(w, r);
            if (Number.isFinite(est) && est > 0) return est;
        }
    }

    const fromStatsSets = computeBestOneRmFromSets(stats?.sets || []);
    if (fromStatsSets) return fromStatsSets;

    return computeBestOneRmFromSets(item?.workoutSets || []);
};

export { EXERCISE_META_MAP, buildExerciseList, formatWeightValue, resolveEstimatedOneRm };
