import { exercises as EXERCISE_DEFS } from "../components/3_Workout/NewWorkout/SelectExercise/EXERCISES";

export const BODYWEIGHT_DEFAULT_LB = 150;

const buildLookup = (predicate) => {
  const set = new Set();
  (EXERCISE_DEFS || []).forEach((exercise) => {
    if (!exercise || typeof exercise !== "object") return;
    const name = String(exercise?.name || "").trim();
    if (!name) return;
    if (predicate(exercise)) {
      set.add(name.toLowerCase());
    }
  });
  return set;
};

const BODYWEIGHT_NAME_SET = buildLookup(
  (ex) =>
    String(ex?.equipment || "").toLowerCase().includes("body weight") ||
    String(ex?.equipment || "").toLowerCase().includes("bodyweight") ||
    String(ex?.weighted || "").toLowerCase() === "weighted bodyweight"
);

const BODYWEIGHT_ASSISTED_NAME_SET = buildLookup((ex) => {
  const nameLc = String(ex?.name || "").toLowerCase();
  if (String(ex?.weighted || "").toLowerCase() === "assisted bodyweight") return true;
  return nameLc.includes("assisted");
});

const EXERCISE_WEIGHTING_MAP = (() => {
  const map = new Map();
  (EXERCISE_DEFS || []).forEach((exercise) => {
    if (!exercise || typeof exercise !== "object") return;
    const name = String(exercise?.name || "").trim().toLowerCase();
    if (!name) return;
    const weighting = String(exercise?.weighted || "").trim().toLowerCase();
    if (!weighting) return;
    map.set(name, weighting);
  });
  return map;
})();

const toKey = (value) => String(value || "").trim().toLowerCase();

export function inferBodyweightMode(name, equipment) {
  const nameKey = toKey(name);
  const equipKey = toKey(equipment);
  if (!nameKey && !equipKey) return null;

  const weighted = EXERCISE_WEIGHTING_MAP.get(nameKey);
  if (weighted === "assisted bodyweight") return "assisted";
  if (weighted === "weighted bodyweight") return "bodyweight";

  if (BODYWEIGHT_ASSISTED_NAME_SET.has(nameKey) || nameKey.includes("assisted")) {
    return "assisted";
  }

  if (BODYWEIGHT_NAME_SET.has(nameKey)) {
    return "bodyweight";
  }

  if (equipKey.includes("bodyweight") || equipKey.includes("body weight")) {
    return "bodyweight";
  }

  return null;
}

const getGlobalUser = () => {
  try {
    return global?.userData || null;
  } catch {
    return null;
  }
};

const coerceWeight = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
};

const KG_TO_LB = 2.2046226218488;

const weightEntrySources = (user) => [
  user?.weightEntries,
  user?.bodyweightEntries,
  user?.bodyweightLog,
  user?.progress?.weightEntries,
  user?.progress?.bodyweightEntries,
  user?.privateData?.weightEntries,
];

const pickLatestEntry = (entries) => {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  let latest = null;
  entries.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    const weight = coerceWeight(entry?.weight ?? entry?.value);
    if (!weight) return;
    const recordedAt = Number(
      entry?.recordedAt ??
        entry?.updatedAt ??
        entry?.createdAt ??
        entry?.created ??
        entry?.timestamp
    );
    if (!Number.isFinite(recordedAt)) return;
    if (!latest || recordedAt > latest.recordedAt) {
      latest = {
        weight,
        unit: String(entry?.unit || entry?.units || "").toLowerCase(),
        recordedAt,
      };
    }
  });
  return latest;
};

export function resolveUserBodyweight(userInput, fallback = BODYWEIGHT_DEFAULT_LB) {
  const user = userInput ?? getGlobalUser();
  if (!user || typeof user !== "object") {
    return fallback;
  }

  const directCandidates = [
    user.bodyweight,
    user.bodyWeight,
    user.weight,
    user.currentBodyweight,
    user.currentWeight,
    user?.personalInfo?.weight,
    user?.stats?.bodyweight,
    user?.stats?.weight,
    user?.publicWeight,
  ];

  for (const candidate of directCandidates) {
    const numeric = coerceWeight(candidate);
    if (numeric) return numeric;
  }

  for (const source of weightEntrySources(user)) {
    const latest = pickLatestEntry(source);
    if (!latest) continue;
    if (latest.unit.startsWith("kg")) {
      return latest.weight * KG_TO_LB;
    }
    return latest.weight;
  }

  return fallback;
}

export function getCurrentUserBodyweight(fallback = BODYWEIGHT_DEFAULT_LB) {
  return resolveUserBodyweight(getGlobalUser(), fallback);
}

export const isBodyweightMode = (mode) => mode === "bodyweight";
export const isBodyweightAssistedMode = (mode) => mode === "assisted";

export function resolveExerciseWeighting(name, equipment) {
  const nameKey = toKey(name);
  const fromDefs = nameKey ? EXERCISE_WEIGHTING_MAP.get(nameKey) : null;
  if (fromDefs === "weighted bodyweight") return "weighted bodyweight";
  if (fromDefs === "assisted bodyweight") return "assisted bodyweight";

  const inferred = inferBodyweightMode(name, equipment);
  if (inferred === "assisted") return "assisted bodyweight";
  if (inferred === "bodyweight") return "weighted bodyweight";
  return "standard";
}
