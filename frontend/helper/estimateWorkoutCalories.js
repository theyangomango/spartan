import { resolveUserBodyweight, resolveExerciseWeighting, BODYWEIGHT_DEFAULT_LB } from "../utils/bodyweight";
import { normalizeSetType } from "../components/3_Workout/shared/setTypeUtils";
import { exercises as EXERCISE_DEFS } from "../components/3_Workout/NewWorkout/SelectExercise/EXERCISES";

const KG_PER_LB = 0.45359237;
const RESTING_MET = 2;
const MIN_MET = 3;
const MAX_MET = 10;
const CATEGORY_DEFAULTS = {
  compound_strength: { baseMet: 6, tempo: 5, rest: 90 },
  accessory_strength: { baseMet: 4.5, tempo: 4, rest: 60 },
  bodyweight_skill: { baseMet: 5, tempo: 3.5, rest: 45 },
  hiit: { baseMet: 8.5, tempo: 2.5, rest: 30 },
  cardio: { baseMet: 7.5, tempo: 2, rest: 20 },
  mobility: { baseMet: 3.2, tempo: 3, rest: 15 },
};
const CATEGORY_KEYWORDS = [
  { match: /(run|tread|bike|cycle|row|erg|elliptical|ski|stair)/, category: "cardio" },
  { match: /(burpee|battle|slam|hiit|amrap|emom|circuit)/, category: "hiit" },
  { match: /(squat|deadlift|bench|press|snatch|clean|thrust|jerk)/, category: "compound_strength" },
  { match: /(stretch|mobility|yoga|rehab)/, category: "mobility" },
];

const toKey = (value) => String(value || "").trim().toLowerCase();

const categorizeFromDefinition = (exerciseDef) => {
  const nameLower = toKey(exerciseDef?.name);
  const equipmentLower = toKey(exerciseDef?.equipment);
  const muscleLower = toKey(exerciseDef?.muscleGroup);
  const weightingLower = String(exerciseDef?.weighted || "").toLowerCase();

  for (const { match, category } of CATEGORY_KEYWORDS) {
    if (match.test(nameLower)) {
      return category;
    }
  }

  if (equipmentLower.includes("tread") || equipmentLower.includes("bike") || equipmentLower.includes("row") || equipmentLower.includes("erg") || equipmentLower.includes("ski")) {
    return "cardio";
  }
  if (weightingLower.includes("bodyweight")) {
    return "bodyweight_skill";
  }
  if (muscleLower === "full body") {
    return equipmentLower.includes("body") || equipmentLower.includes("kettlebell") ? "hiit" : "compound_strength";
  }
  if (["legs", "back", "chest", "shoulders"].includes(muscleLower) && (equipmentLower.includes("barbell") || equipmentLower.includes("machine") || equipmentLower.includes("smith"))) {
    return "compound_strength";
  }
  if (["abs", "arms"].includes(muscleLower) && equipmentLower.includes("body")) {
    return "bodyweight_skill";
  }
  return "accessory_strength";
};

const EXERCISE_CATEGORY_MAP = (() => {
  const map = new Map();
  (EXERCISE_DEFS || []).forEach((exercise) => {
    const key = toKey(exercise?.name);
    if (!key) return;
    map.set(key, categorizeFromDefinition(exercise));
  });
  return map;
})();

const toMillis = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value?.toMillis) {
    try {
      return value.toMillis();
    } catch {
      return 0;
    }
  }
  if (typeof value === "object") {
    const seconds = Number(value?.seconds ?? value?._seconds);
    if (Number.isFinite(seconds)) {
      const nanos = Number(value?.nanoseconds ?? value?._nanoseconds ?? 0);
      const ms = seconds * 1000 + (Number.isFinite(nanos) ? Math.floor(nanos / 1e6) : 0);
      return ms;
    }
  }
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalizeNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const resolveDurationMs = (workout) => {
  const durationField = normalizeNumber(workout?.duration);
  if (durationField > 0) {
    return durationField;
  }
  const start = toMillis(workout?.startedAt ?? workout?.createdAt ?? workout?.created);
  const end = toMillis(workout?.finishedAt ?? workout?.completedAt ?? workout?.endedAt);
  if (end && start && end > start) {
    return end - start;
  }
  return 0;
};

const resolveExerciseCategory = (name, equipment) => {
  const key = toKey(name);
  if (key && EXERCISE_CATEGORY_MAP.has(key)) {
    return EXERCISE_CATEGORY_MAP.get(key);
  }

  const safeName = key || "";
  for (const { match, category } of CATEGORY_KEYWORDS) {
    if (match.test(safeName)) {
      return category;
    }
  }

  const equipLower = toKey(equipment);
  if (equipLower.includes("cardio") || equipLower.includes("bike") || equipLower.includes("row")) {
    return "cardio";
  }
  if (equipLower.includes("body weight") || equipLower.includes("bodyweight")) {
    return "bodyweight_skill";
  }
  if (equipLower.includes("band") || equipLower.includes("dumbbell") || equipLower.includes("cable")) {
    return "accessory_strength";
  }
  return "accessory_strength";
};

const getCategoryDefaults = (category) => CATEGORY_DEFAULTS[category] || CATEGORY_DEFAULTS.accessory_strength;

const deriveSetWeightKg = (set, weighting, userWeightKg) => {
  const rawWeight = normalizeNumber(set?.weight ?? set?.lbs ?? set?.kg ?? set?.load);
  if (rawWeight > 0) {
    const unit = String(set?.unit ?? set?.units ?? set?.weightUnit ?? "lb").toLowerCase();
    return unit.startsWith("kg") ? rawWeight : rawWeight * KG_PER_LB;
  }
  if (weighting === "weighted bodyweight") {
    const delta = normalizeNumber(set?.resistance ?? set?.weightDelta ?? set?.assist);
    return userWeightKg + delta * KG_PER_LB;
  }
  if (weighting === "assisted bodyweight") {
    const assist = normalizeNumber(set?.assist ?? set?.weightDelta ?? set?.resistance);
    return Math.max(userWeightKg - assist * KG_PER_LB, userWeightKg * 0.25);
  }
  if (weighting === "standard" && normalizeNumber(set?.reps) > 0) {
    return 0;
  }
  return 0;
};

const estimateSetDurationSec = (set, tempo) => {
  const explicit = normalizeNumber(set?.duration ?? set?.time);
  if (explicit > 0) {
    return explicit;
  }
  const reps = normalizeNumber(set?.reps ?? set?.rep ?? set?.r);
  if (reps > 0) {
    return Math.max(reps * tempo, tempo);
  }
  return tempo;
};

const adjustMet = (baseMet, density, setsLength, category) => {
  let met = baseMet;
  if (density > 0.6) {
    met += 0.4 * ((density - 0.6) / 0.15);
  }
  if (setsLength > 4) {
    met += 0.2 * (setsLength - 4);
  }
  if (category === "hiit" && density > 0.8) {
    met += 0.5;
  }
  if (category === "mobility") {
    met -= 0.5;
  }
  return clamp(met, MIN_MET, MAX_MET);
};

const aggregateExercise = (exercise, userWeightKg) => {
  const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
  const category = resolveExerciseCategory(exercise?.name, exercise?.equipment);
  const weighting = resolveExerciseWeighting(exercise?.name, exercise?.equipment);
  const defaults = getCategoryDefaults(category);
  let activeSeconds = 0;
  let loadScore = 0;
  let missingSignals = 0;

  sets.forEach((set) => {
    const type = normalizeSetType(set?.type);
    const tempo = type === "warmup" ? Math.max(2.5, defaults.tempo * 0.6) : defaults.tempo;
    const durationSec = estimateSetDurationSec(set, tempo);
    activeSeconds += durationSec;

    const reps = normalizeNumber(set?.reps ?? set?.rep ?? set?.r);
    const setWeightKg = deriveSetWeightKg(set, weighting, userWeightKg);
    if (setWeightKg > 0 && reps > 0) {
      loadScore += setWeightKg * reps;
    } else if ((category === "cardio" || category === "hiit") && durationSec > 0) {
      loadScore += userWeightKg * (durationSec / tempo);
    } else {
      missingSignals += 1;
    }
  });

  if (!sets.length) {
    missingSignals += 1;
    activeSeconds += defaults.tempo * 4;
  }

  const density = activeSeconds > 0 ? (loadScore / activeSeconds) / userWeightKg : 0;
  const met = adjustMet(defaults.baseMet, density, sets.length, category);
  return {
    category,
    met,
    activeSeconds,
    missingSignals,
    calories: met * userWeightKg * (activeSeconds / 3600),
  };
};

const deriveConfidence = ({ totalSets, missingSignals, durationWasMeasured, totalExercises }) => {
  if (totalExercises === 0) return 0.2;
  let score = 0.95;
  const missingRatio = missingSignals / Math.max(1, totalSets || totalExercises);
  score -= missingRatio * 0.4;
  if (!durationWasMeasured) score -= 0.07;
  if (totalSets < 4) score -= 0.05;
  return clamp(Number(score.toFixed(2)), 0.2, 0.95);
};

export const estimateWorkoutCalories = (workout, options = {}) => {
  const emptyEstimate = { calories: null, confidence: 0, breakdown: { exercises: [] } };
  if (!workout) {
    return { ...emptyEstimate, confidence: 0.2 };
  }
  const explicitWeight = normalizeNumber(options?.weightLb);
  const resolvedWeightLb = explicitWeight > 0 ? explicitWeight : resolveUserBodyweight(options?.user, null);
  if (!resolvedWeightLb || resolvedWeightLb <= 0) {
    return emptyEstimate;
  }
  const userWeightKg = resolvedWeightLb * KG_PER_LB;
  const durationMs = resolveDurationMs(workout);
  const exercises = Array.isArray(workout?.exercises) ? workout.exercises : [];
  const breakdown = [];
  let totalActiveSeconds = 0;
  let exerciseCalories = 0;
  let missingSignals = 0;
  let totalSets = 0;

  exercises.forEach((exercise) => {
    const aggregate = aggregateExercise(exercise, userWeightKg);
    totalActiveSeconds += aggregate.activeSeconds;
    exerciseCalories += aggregate.calories;
    missingSignals += aggregate.missingSignals;
    totalSets += Array.isArray(exercise?.sets) ? exercise.sets.length : 0;
    breakdown.push({
      name: exercise?.name || "Exercise",
      category: aggregate.category,
      seconds: Math.round(aggregate.activeSeconds),
      met: Number(aggregate.met.toFixed(2)),
      calories: Math.round(aggregate.calories),
    });
  });

  const durationSeconds = durationMs > 0 ? durationMs / 1000 : totalActiveSeconds;
  const restSeconds = Math.max(0, durationSeconds - totalActiveSeconds);
  const restCalories = restSeconds ? RESTING_MET * userWeightKg * (restSeconds / 3600) : 0;
  const totalCalories = Math.round(exerciseCalories + restCalories);
  const confidence = deriveConfidence({
    totalSets,
    missingSignals,
    durationWasMeasured: durationMs > 0,
    totalExercises: exercises.length,
  });

  return {
    calories: totalCalories,
    confidence,
    breakdown: {
      exercises: breakdown,
      restSeconds: Math.round(restSeconds),
      restCalories: Math.round(restCalories),
    },
  };
};

export const evaluateCalorieEstimates = (samples = []) => {
  if (!Array.isArray(samples) || samples.length === 0) {
    return {
      mae: 0,
      mape: 0,
      bias: 0,
      perCategory: {},
    };
  }
  let totalAbsError = 0;
  let totalPercError = 0;
  let percCount = 0;
  let bias = 0;
  const perCategory = {};

  samples.forEach((sample) => {
    const est = normalizeNumber(sample?.estimated);
    const observed = normalizeNumber(sample?.observed);
    const error = est - observed;
    const absError = Math.abs(error);
    totalAbsError += absError;
    bias += error;
    if (observed > 0) {
      totalPercError += absError / observed;
      percCount += 1;
    }
    const category = sample?.category || "unknown";
    if (!perCategory[category]) {
      perCategory[category] = { count: 0, mae: 0, bias: 0 };
    }
    perCategory[category].count += 1;
    perCategory[category].mae += absError;
    perCategory[category].bias += error;
  });

  Object.values(perCategory).forEach((entry) => {
    entry.mae = Number((entry.mae / entry.count).toFixed(1));
    entry.bias = Number((entry.bias / entry.count).toFixed(1));
  });

  return {
    mae: Number((totalAbsError / samples.length).toFixed(1)),
    mape: percCount ? Number(((totalPercError / percCount) * 100).toFixed(1)) : 0,
    bias: Number((bias / samples.length).toFixed(1)),
    perCategory,
  };
};
