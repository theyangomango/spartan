// logic/computeHexagonStats.js
// Nuanced algorithm to compute hexagon stats per muscle group
// using exercise history (statsExercises), equipment adjustments, and recency decay.

import { exercises as EXERCISE_DEFS } from "../components/3_Workout/NewWorkout/SelectExercise/EXERCISES";
import calculate1RM from "../helper/calculate1RM";

// Core groups in Hexagon order used across the app
const GROUP_KEYS = ["shoulders", "chest", "arms", "legs", "back", "abs"];

// Normalize exercise meta
const META_BY_NAME = (() => {
  const map = Object.create(null);
  (EXERCISE_DEFS || []).forEach((ex) => {
    const name = String(ex?.name || "").trim();
    if (!name) return;
    const mg = String(ex?.muscleGroup || ex?.muscle || "").toLowerCase();
    const eq = String(ex?.equipment || "").trim();
    // Normalize muscle group to our hexagon groups
    const m = mg.includes("shoulder")
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
    map[name] = { group: m, equipment: eq };
  });
  return map;
})();

// Fallback name heuristics when exercise not found in catalog
function inferMetaByName(name) {
  const n = String(name || "").toLowerCase();
  let group = null;
  if (/shoulder|overhead|press|raise|shrug|upright row/.test(n)) group = "shoulders";
  else if (/bench|chest|fly|push-up|push up/.test(n)) group = "chest";
  else if (/curl|tricep|skullcrusher|preacher/.test(n)) group = "arms";
  else if (/squat|deadlift|lunge|leg\s|calf/.test(n)) group = "legs";
  else if (/row|pull[- ]?up|chin[- ]?up|lat|trap/.test(n)) group = "back";
  else if (/ab|core|crunch|sit[- ]?up|plank|twist|leg raise|v[- ]?up/.test(n)) group = "abs";
  const equipment =
    n.includes("dumbbell") || n.includes("db")
      ? "Dumbbell"
      : n.includes("barbell")
      ? "Barbell"
      : n.includes("smith")
      ? "Smith Machine"
      : n.includes("machine")
      ? "Machine"
      : n.includes("cable")
      ? "Cable"
      : n.includes("band")
      ? "Band"
      : n.includes("trap bar")
      ? "Trap Bar"
      : n.includes("body") || n.includes("push-up") || n.includes("pull-up") || n.includes("chin-up") || n.includes("dip")
      ? "Body Weight"
      : "";
  return { group, equipment };
}

function getMeta(name) {
  const meta = META_BY_NAME[name];
  if (meta && meta.group) return meta;
  const inferred = inferMetaByName(name);
  return inferred;
}

// Equipment normalization: convert set to a comparable “barbell-equivalent” intensity.
// Returns [equivalentWeight, multiplierApplied]
function normalizeEquipment(name, equipment, weight) {
  const n = String(name || "").toLowerCase();
  const eq = String(equipment || "");
  let w = Number(weight) || 0;
  let mult = 1.0;

  // Dumbbell: typically weight is per-hand; most bilateral lifts deserve x2 and small stability bonus.
  const isSingleArm = /single[- ]?arm|one[- ]?arm|alternating|unilateral/.test(n);
  if (/dumbbell/i.test(eq) || /dumbbell/.test(n) || /db/.test(n)) {
    if (!isSingleArm) w = w * 2; // assume bilateral unless explicitly single-arm
    mult *= 1.12; // stability bonus
  }

  // Machines
  if (/smith/i.test(eq) || /smith/.test(n)) mult *= 0.90;
  if (/machine/i.test(eq)) mult *= 0.92;
  if (/cable/i.test(eq)) mult *= 0.92;
  if (/band/i.test(eq)) mult *= 0.85;
  if (/trap bar/i.test(eq) || /trap bar/.test(n)) mult *= 0.95;

  return [w * mult, mult];
}

// Distribution for full-body compounds
const FULL_BODY_DIST = { legs: 0.35, back: 0.30, shoulders: 0.20, arms: 0.10, abs: 0.05, chest: 0.0 };

// Normalization anchors (crude but reasonable defaults for 100 score)
const NORM_1RM = {
  chest: 315, // bench eq
  shoulders: 185, // strict OHP eq
  back: 455, // deadlift/row/pull-up eq
  legs: 405, // squat/deadlift eq
  arms: 135, // curl/CG bench proxy
  abs: 180, // assumed heavy weighted core work eq
};

// 30-day volume anchors (weight*reps across last 30d)
const NORM_VOL_30D = {
  chest: 22000,
  shoulders: 15000,
  back: 28000,
  legs: 34000,
  arms: 12000,
  abs: 10000,
};

// Consistency anchor: 8 sessions in last 30 days ~ 100
const CONSIST_TARGET_30D = 8;

function toDayKey(d) {
  if (!d && d !== 0) return "";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  x.setHours(0, 0, 0, 0);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

function parseDayKey(k) {
  if (!k) return 0;
  try {
    const [y, m, d] = String(k).split("-").map((x) => Number(x));
    const dt = new Date(y, (m || 1) - 1, d || 1);
    dt.setHours(0, 0, 0, 0);
    return dt.getTime();
  } catch { return 0; }
}

function daysSince(ts) {
  if (!ts) return Number.POSITIVE_INFINITY;
  const ms = Date.now() - ts;
  return Math.max(0, Math.floor(ms / (24 * 3600 * 1000)));
}

// Soft decay: 0% until day 7, then 0.5%/day until day 21, then 1%/day; floor 60%
function decayFactorFromDays(d) {
  if (!Number.isFinite(d) || d <= 7) return 1.0;
  if (d <= 21) return Math.max(0.6, 1 - 0.005 * (d - 7));
  const v = 1 - 0.005 * 14 - 0.01 * (d - 21);
  return Math.max(0.6, v);
}

// Utility to clamp and round
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const r = (v) => Math.round(v);

// Main export
function looksLegacy(hex) {
  try {
    if (!hex || typeof hex !== 'object') return false;
    const vals = [
      Number(hex?.shoulders),
      Number(hex?.chest),
      Number(hex?.arms),
      Number(hex?.legs),
      Number(hex?.back),
      Number(hex?.abs),
    ];
    if (vals.some((v) => !Number.isFinite(v))) return false;
    const allSame = vals.every((v) => v === vals[0]);
    const sameAsOverall = Number(hex?.overall) === vals[0];
    // Treat 69 or any single flat value (e.g., legacy seeds) as legacy
    return allSame && sameAsOverall && (vals[0] === 69 || vals[0] === 0);
  } catch { return false; }
}

export default function computeHexagonStats({
  statsExercises,
  prevStatsHexagon,
  trainedExerciseNames, // from the just-finished workout
} = {}) {
  const stats = statsExercises || {};

  const trainedGroups = new Set();
  (Array.isArray(trainedExerciseNames) ? trainedExerciseNames : []).forEach((nm) => {
    const meta = getMeta(nm) || {};
    if (meta?.group && GROUP_KEYS.includes(meta.group)) trainedGroups.add(meta.group);
    if (meta?.group === "full") Object.entries(FULL_BODY_DIST).forEach(([g, f]) => f > 0 && trainedGroups.add(g));
  });

  // Aggregators per group
  const bestEq1RM = { shoulders: 0, chest: 0, arms: 0, legs: 0, back: 0, abs: 0 };
  const vol30 = { shoulders: 0, chest: 0, arms: 0, legs: 0, back: 0, abs: 0 };
  const daysSet = { shoulders: new Set(), chest: new Set(), arms: new Set(), legs: new Set(), back: new Set(), abs: new Set() };
  const lastTs = { shoulders: 0, chest: 0, arms: 0, legs: 0, back: 0, abs: 0 };

  const now = Date.now();
  const cutoff30 = now - 30 * 24 * 3600 * 1000;

  Object.keys(stats).forEach((exName) => {
    const entry = stats[exName] || {};
    const meta = getMeta(exName) || {};
    const baseGroup = meta?.group;
    if (!baseGroup) return;

    // Derive an equipment-adjusted best 1RM for this exercise
    let best = Number(entry?.["1RM"] || 0);
    if (!best && Array.isArray(entry?.sets) && entry.sets.length) {
      for (const s of entry.sets) {
        const w = Number(s?.weight) || 0, rp = Number(s?.reps) || 0;
        if (w > 0 && rp > 0) {
          best = Math.max(best, calculate1RM(w, rp));
        }
      }
    }
    const [eq1rm] = normalizeEquipment(exName, meta?.equipment, best);

    const dist = baseGroup === "full" ? FULL_BODY_DIST : { [baseGroup]: 1 };
    Object.entries(dist).forEach(([g, f]) => {
      if (!GROUP_KEYS.includes(g)) return;
      bestEq1RM[g] = Math.max(bestEq1RM[g], eq1rm * (f || 1));
    });

    // Rolling 30-day volume accumulation per exercise day (use progress1RM timeline if present)
    const timeline = Array.isArray(entry?.progress1RM) ? entry.progress1RM : [];
    for (const p of timeline) {
      const dk = p?.date;
      const ts = parseDayKey(dk);
      if (!ts || ts < cutoff30) continue;
      const vol = Number(p?.volume || 0);
      Object.entries(dist).forEach(([g, f]) => {
        if (!GROUP_KEYS.includes(g)) return;
        vol30[g] += vol * Math.sqrt(Math.max(0.5, f)); // softer share for FB distribution
        daysSet[g].add(dk);
        lastTs[g] = Math.max(lastTs[g], ts);
      });
    }

    // If no timeline, use presence of sets to mark recency (fallback)
    if (!timeline.length) {
      // Fallback: cap to last N sets to avoid large scans on big histories
      const setsAll = Array.isArray(entry?.sets) ? entry.sets : [];
      const sets = setsAll.length > 50 ? setsAll.slice(-50) : setsAll;
      for (const s of sets) {
        const ts = parseDayKey(s?.date || toDayKey(now));
        const dk = s?.date || toDayKey(ts);
        if (!ts || ts < cutoff30) continue;
        const vol = (Number(s?.weight) || 0) * (Number(s?.reps) || 0);
        Object.entries(dist).forEach(([g, f]) => {
          if (!GROUP_KEYS.includes(g)) return;
          vol30[g] += vol * Math.sqrt(Math.max(0.5, f));
          daysSet[g].add(dk);
          lastTs[g] = Math.max(lastTs[g], ts);
        });
      }
    }
  });

  // Compute per-group sub-scores
  const scores = { shoulders: 0, chest: 0, arms: 0, legs: 0, back: 0, abs: 0 };
  const strengthScores = {};
  const workScores = {};
  const consistencyScores = {};
  const decayFactors = {};

  GROUP_KEYS.forEach((g) => {
    // Strength: compare to anchor with gentle compression (power 0.9)
    const anchor = Math.max(1, NORM_1RM[g] || 200);
    const sNorm = clamp(Math.pow((bestEq1RM[g] || 0) / anchor, 0.9) * 100, 0, 100);
    strengthScores[g] = sNorm;

    // Work capacity (30d volume): compress via sqrt to avoid domination
    const vAnchor = Math.max(1, NORM_VOL_30D[g] || 10000);
    const wNorm = clamp(Math.sqrt(Math.max(0, vol30[g] || 0) / vAnchor) * 100, 0, 100);
    workScores[g] = wNorm;

    // Consistency: unique training days in last 30d
    const c = (daysSet[g] || new Set()).size;
    const cNorm = clamp((c / CONSIST_TARGET_30D) * 100, 0, 100);
    consistencyScores[g] = cNorm;

    // Blended raw score
    const raw = 0.7 * sNorm + 0.2 * wNorm + 0.1 * cNorm;

    // Recency decay based on lastTs (if none, treat as old)
    const d = daysSince(lastTs[g] || 0);
    const df = decayFactorFromDays(d);
    decayFactors[g] = df;
    scores[g] = clamp(raw * df, 0, 100);
  });

  // Enforce non-decrease for groups trained in this workout (vs previous stored value before decay)
  // Legacy guard: if previous looks like the old seeded flat value (e.g., 69s),
  // ignore it for non-decrease enforcement so the new algorithm can establish a baseline.
  const prev = looksLegacy(prevStatsHexagon) ? {} : (prevStatsHexagon || {});
  const next = { ...scores };
  GROUP_KEYS.forEach((g) => {
    const prevVal = Number(prev?.[g] || 0);
    if (trainedGroups.has(g)) next[g] = Math.max(prevVal, next[g]);
    else {
      // For non-trained groups, allow decay but do not drop below prev decayed-in-place
      const decayedPrev = prevVal * (decayFactors[g] || 1);
      next[g] = Math.max(decayedPrev, next[g]);
    }
  });

  // Overall: simple average
  const overall = r(
    (Number(next.shoulders || 0) +
      Number(next.chest || 0) +
      Number(next.arms || 0) +
      Number(next.legs || 0) +
      Number(next.back || 0) +
      Number(next.abs || 0)) /
      6
  );

  const rounded = {
    shoulders: r(next.shoulders || 0),
    chest: r(next.chest || 0),
    arms: r(next.arms || 0),
    legs: r(next.legs || 0),
    back: r(next.back || 0),
    abs: r(next.abs || 0),
    overall,
  };

  // Last trained timestamps (for optional metadata)
  const lastTrained = GROUP_KEYS.reduce((acc, g) => {
    acc[g] = lastTs[g] || 0;
    return acc;
  }, {});

  return {
    statsHexagon: rounded,
    lastTrained,
    debug: {
      bestEq1RM,
      vol30,
      strengthScores,
      workScores,
      consistencyScores,
      decayFactors,
    },
  };
}
