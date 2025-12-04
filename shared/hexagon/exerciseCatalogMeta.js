// shared/hexagon/exerciseCatalogMeta.js
// Provides catalog-backed metadata lookup for exercises based on the shared EXERCISES list.
// eslint-disable-next-line import/no-relative-packages
import { exercises as RAW_EXERCISES } from "../../frontend/components/3_Workout/NewWorkout/SelectExercise/EXERCISES.js";

const toKey = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");

const toLooseKey = (value) => {
  const base = toKey(value);
  if (!base) return "";
  return base.replace(/\(([^)]+)\)/g, " $1 ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
};

const normalizeGroup = (value) => {
  const g = toKey(value);
  if (!g) return null;
  if (g.includes("shoulder") || g.includes("delt")) return "shoulders";
  if (g === "chest" || g.includes("pec")) return "chest";
  if (g === "arms" || g.includes("bicep") || g.includes("tricep")) return "arms";
  if (g === "legs" || g.includes("lower body") || g.includes("glute")) return "legs";
  if (g === "back" || g.includes("lats")) return "back";
  if (g === "abs" || g.includes("core")) return "abs";
  if (g === "full body" || g.includes("full")) return "full";
  return null;
};

const catalogMetaByName = new Map();

const register = (rawName, meta) => {
  const candidates = new Set([toKey(rawName), toLooseKey(rawName)]);
  const simplified = typeof rawName === "string" ? rawName.replace(/\s*\(([^)]+)\)\s*/g, " ").trim() : "";
  if (simplified) {
    candidates.add(toKey(simplified));
    candidates.add(toLooseKey(simplified));
  }

  candidates.forEach((key) => {
    if (key && !catalogMetaByName.has(key)) {
      catalogMetaByName.set(key, meta);
    }
  });
};

const EXERCISES_LIST = Array.isArray(RAW_EXERCISES) ? RAW_EXERCISES : [];

EXERCISES_LIST.forEach((exercise) => {
  if (!exercise) return;
  const name = typeof exercise.name === "string" ? exercise.name.trim() : "";
  if (!name) return;
  const group = normalizeGroup(exercise.muscleGroup ?? exercise.muscle);
  const equipment = typeof exercise.equipment === "string" ? exercise.equipment.trim() : "";
  const meta = { group, equipment };
  register(name, meta);
});

export const lookupCatalogMeta = (name) => {
  const key = toKey(name);
  const loose = toLooseKey(name);
  if (!key && !loose) return null;
  return catalogMetaByName.get(key) || catalogMetaByName.get(loose) || null;
};

export const hasCatalogMeta = (name) => lookupCatalogMeta(name) != null;

export const catalogEntryCount = catalogMetaByName.size;

export const resolveMetaUsingCatalog = (name, fallbackResolver) => {
  const fallback = typeof fallbackResolver === "function" ? fallbackResolver(name) : { group: null, equipment: "" };
  const catalog = lookupCatalogMeta(name);
  if (!catalog) return fallback || { group: null, equipment: "" };
  const base = fallback && typeof fallback === "object" ? fallback : { group: null, equipment: "" };
  return {
    ...base,
    ...catalog,
    group: catalog.group ?? base.group ?? null,
    equipment: catalog.equipment ?? base.equipment ?? "",
  };
};
