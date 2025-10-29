// logic/computeHexagonStats.js
// Client wrapper around the shared hexagon computation with catalog-aware metadata.

import { exercises as EXERCISE_DEFS } from "../components/3_Workout/NewWorkout/SelectExercise/EXERCISES";
import calculate1RM from "../helper/calculate1RM";
import computeHexagonCore, { defaultResolveMeta } from "../../shared/hexagon/computeHexagonCore.js";

const META_BY_NAME = (() => {
  const map = Object.create(null);
  (EXERCISE_DEFS || []).forEach((exercise) => {
    if (!exercise) return;
    const name = String(exercise?.name || "").trim();
    if (!name) return;
    const mg = String(exercise?.muscleGroup || exercise?.muscle || "").toLowerCase();
    const equipment = String(exercise?.equipment || "").trim();

    const group =
      mg.includes("shoulder")
        ? "shoulders"
        : mg === "chest"
        ? "chest"
        : mg === "arms"
        ? "arms"
        : mg === "legs"
        ? "legs"
        : mg === "back"
        ? "back"
        : mg === "abs" || mg.includes("core")
        ? "abs"
        : mg === "full body" || mg.includes("full")
        ? "full"
        : null;

    map[name] = { group, equipment };
  });
  return map;
})();

const resolveMetaWithCatalog = (name) => {
  const key = String(name || "").trim();
  const fallback = defaultResolveMeta(name);
  const fromCatalog = key ? META_BY_NAME[key] : null;
  if (!fromCatalog) return fallback;
  return {
    ...fallback,
    ...fromCatalog,
    group: fromCatalog.group ?? fallback.group,
    equipment: fromCatalog.equipment ?? fallback.equipment,
  };
};

export default function computeHexagonStats(options = {}) {
  return computeHexagonCore(options, {
    resolveMeta: resolveMetaWithCatalog,
    calculate1RM,
    includeDebug: true,
    clampLegacy: true,
  });
}
