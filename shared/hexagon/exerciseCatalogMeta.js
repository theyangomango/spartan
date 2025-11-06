// shared/hexagon/exerciseCatalogMeta.js
// Provides catalog-backed metadata lookup for exercises based on the shared EXERCISES list.
// eslint-disable-next-line import/no-relative-packages
import { exercises as RAW_EXERCISES } from "../../frontend/components/3_Workout/NewWorkout/SelectExercise/EXERCISES.js";

const toKey = (value) => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return normalized;
};

const normalizeGroup = (value) => {
  const g = toKey(value);
  if (!g) return null;
  if (g.includes("shoulder")) return "shoulders";
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
  const key = toKey(rawName);
  if (!key || catalogMetaByName.has(key)) return;
  catalogMetaByName.set(key, meta);
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
  const simplified = name.replace(/\s*\(([^)]+)\)\s*/g, "").trim();
  if (simplified && simplified !== name) {
    register(simplified, meta);
  }
});

export const lookupCatalogMeta = (name) => {
  const key = toKey(name);
  if (!key) return null;
  return catalogMetaByName.get(key) || null;
};

export const hasCatalogMeta = (name) => lookupCatalogMeta(name) != null;

export const catalogEntryCount = catalogMetaByName.size;
