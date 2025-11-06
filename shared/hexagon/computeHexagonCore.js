// shared/hexagon/computeHexagonCore.js
// Canonical hexagon computation used across client and backend environments.

import { lookupCatalogMeta } from "./exerciseCatalogMeta.js";

export const GROUP_KEYS = ["shoulders", "chest", "arms", "legs", "back", "abs"];

export const FULL_BODY_DIST = {
  legs: 0.35,
  back: 0.3,
  shoulders: 0.2,
  arms: 0.1,
  abs: 0.05,
  chest: 0,
};

export const FAMILY_ANCHORS = [
  // Chest
  { fam: "bench_barbell", group: "chest", rx: /bench.*barbell|bench press \(barbell\)/i, anchor: 350 },
  { fam: "bench_incline", group: "chest", rx: /incline.*bench/i, anchor: 300 },
  { fam: "bench_decline", group: "chest", rx: /decline.*bench/i, anchor: 290 },
  { fam: "bench_dumbbell", group: "chest", rx: /bench.*dumbbell|bench press \(dumbbell\)/i, anchor: 250 },
  { fam: "fly", group: "chest", rx: /fly|pec deck/i, anchor: 120 },
  { fam: "dip", group: "chest", rx: /dip/i, anchor: 220 },
  { fam: "pushup", group: "chest", rx: /push-?up/i, anchor: 180 },

  // Shoulders
  { fam: "ohp_barbell", group: "shoulders", rx: /(overhead|military).*press|shoulder press \(barbell\)/i, anchor: 235 },
  { fam: "ohp_dumbbell", group: "shoulders", rx: /shoulder press \(dumbbell\)|arnold press/i, anchor: 200 },
  { fam: "upright_row", group: "shoulders", rx: /upright row/i, anchor: 140 },
  { fam: "shrug", group: "shoulders", rx: /shrug/i, anchor: 400 },
  { fam: "lateral_raise", group: "shoulders", rx: /lateral raise/i, anchor: 120 },
  { fam: "front_raise", group: "shoulders", rx: /front raise/i, anchor: 130 },

  // Back + Legs (deads are legs-dominant)
  { fam: "deadlift", group: "legs", rx: /deadlift(?!.*romanian|.*stiff|.*sumo)/i, anchor: 501 },
  { fam: "sumo_deadlift", group: "legs", rx: /sumo deadlift/i, anchor: 480 },
  { fam: "rdl", group: "legs", rx: /romanian deadlift|stiff-?leg deadlift/i, anchor: 350 },
  { fam: "row_barbell", group: "back", rx: /barbell row|pendlay|seal row|t-?bar row/i, anchor: 240 },
  { fam: "pullup", group: "back", rx: /pull-?up|chin-?up/i, anchor: 130 },
  { fam: "lat_pulldown", group: "back", rx: /lat pulldown/i, anchor: 120 },
  { fam: "shrug_back", group: "back", rx: /shrug/i, anchor: 400 },

  // Legs (non-deadlift)
  { fam: "squat_highbar", group: "legs", rx: /(high|olympic).*squat|back squat/i, anchor: 477 },
  { fam: "squat_lowbar", group: "legs", rx: /low bar.*squat|lowbar/i, anchor: 525 },
  { fam: "front_squat", group: "legs", rx: /front squat/i, anchor: 350 },
  { fam: "leg_press", group: "legs", rx: /leg press|hack squat/i, anchor: 1000 },
  { fam: "lunge", group: "legs", rx: /lunge|split squat/i, anchor: 250 },
  { fam: "leg_extension", group: "legs", rx: /leg extension/i, anchor: 200 },
  { fam: "leg_curl", group: "legs", rx: /leg curl|hamstring curl/i, anchor: 180 },
  { fam: "calf_raise", group: "legs", rx: /calf raise|seated calf/i, anchor: 500 },
  { fam: "glute_hinge", group: "legs", rx: /hip thrust|glute-?ham|good morning/i, anchor: 350 },

  // Arms
  { fam: "curl_barbell", group: "arms", rx: /bicep.*curl \(barbell\)|barbell curl|curl \(barbell\)/i, anchor: 110 },
  { fam: "curl_dumbbell", group: "arms", rx: /curl \(dumbbell\)|hammer curl|incline curl/i, anchor: 120 },
  { fam: "curl_machine", group: "arms", rx: /preacher curl|curl \(machine\)/i, anchor: 100 },
  { fam: "tricep_extension", group: "arms", rx: /tricep.*extension|skullcrusher|overhead extension/i, anchor: 120 },
  { fam: "cg_bench", group: "arms", rx: /close-?grip bench/i, anchor: 300 },
  { fam: "forearms", group: "arms", rx: /wrist curl|reverse wrist|wrist roller/i, anchor: 50 },

  // Abs
  { fam: "cable_crunch", group: "abs", rx: /crunch \(cable\)|cable.*crunch/i, anchor: 200 },
  { fam: "machine_abs", group: "abs", rx: /ab.*machine|torso rotation|seated crunch/i, anchor: 180 },
  { fam: "bodyweight_abs", group: "abs", rx: /sit-?up|crunch|leg raise|v-?up|russian twist|plank|side plank|ab wheel|rollout|twist/i, anchor: 160 },
];

export const GROUP_WR = { chest: 350, shoulders: 235, back: 501, legs: 500, arms: 120, abs: 200 };

const NORM_VOL_30D = { chest: 22000, shoulders: 15000, back: 28000, legs: 34000, arms: 12000, abs: 10000 };
const CONSIST_TARGET_30D = 8;
const DIFFICULTY_MULTIPLIER = 0.85;

const defaultCalculate1RM = (weight, reps) => {
  const w = Number(weight) || 0;
  const r = Number(reps) || 0;
  if (w <= 0 || r <= 0) return 0;
  // Brzycki formula aligns with client helper.
  return w / (1.0278 - 0.0278 * r);
};

export function normalizeEquipment(name, equipment, weight) {
  const n = String(name || "").toLowerCase();
  const eq = String(equipment || "");
  let w = Number(weight) || 0;
  let mult = 1;

  const isSingleArm = /single[- ]?arm|one[- ]?arm|alternating|unilateral/.test(n);
  if (/dumbbell/i.test(eq) || /dumbbell/.test(n) || /db/.test(n)) {
    if (!isSingleArm) w = w * 2;
    mult *= 1.12;
  }
  if (/smith/i.test(eq) || /smith/.test(n)) mult *= 0.9;
  if (/machine/i.test(eq)) mult *= 0.92;
  if (/cable/i.test(eq)) mult *= 0.92;
  if (/band/i.test(eq)) mult *= 0.85;
  if (/trap bar/i.test(eq) || /trap bar/.test(n)) mult *= 0.95;

  return [w * mult, mult];
}

export function familyAnchorFor(name, group) {
  const normalized = String(name || "");
  for (const f of FAMILY_ANCHORS) {
    if (f.rx.test(normalized)) return { anchor: f.anchor, fam: f.fam, group: f.group || group };
  }
  return { anchor: GROUP_WR[group] || 200, fam: "generic", group };
}

export function defaultResolveMeta(name) {
  const original = String(name || "").trim();
  if (!original) return { group: null, equipment: "" };
  const n = original.toLowerCase();

  const catalog = lookupCatalogMeta(original);
  if (catalog) {
    return {
      group: catalog.group ?? null,
      equipment: catalog.equipment ?? "",
    };
  }

  const group =
    /shoulder|overhead|press|raise|shrug|upright row/.test(n)
      ? "shoulders"
      : /bench|chest|fly|push-up|push up/.test(n)
      ? "chest"
      : /curl|tricep|skullcrusher|preacher/.test(n)
      ? "arms"
      : /squat|deadlift|lunge|leg\s|calf/.test(n)
      ? "legs"
      : /row|pull[- ]?up|chin[- ]?up|lat|trap/.test(n)
      ? "back"
      : /ab|core|crunch|sit[- ]?up|plank|twist|leg raise|v[- ]?up/.test(n)
      ? "abs"
      : null;

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

const toDayKey = (timestamp) => {
  if (!timestamp && timestamp !== 0) return "";
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return "";
  d.setHours(0, 0, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const parseDayKey = (key) => {
  if (!key) return 0;
  try {
    const [y, m, d] = String(key).split("-").map((x) => Number(x));
    const dt = new Date(y, (m || 1) - 1, d || 1);
    dt.setHours(0, 0, 0, 0);
    return dt.getTime();
  } catch {
    return 0;
  }
};

const daysSince = (ts, nowTs) => {
  if (!ts) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((nowTs - ts) / (24 * 3600 * 1000)));
};

const decayFactorFromDays = (days) => {
  if (!Number.isFinite(days) || days <= 7) return 1;
  if (days <= 21) return Math.max(0.6, 1 - 0.005 * (days - 7));
  const value = 1 - 0.005 * 14 - 0.01 * (days - 21);
  return Math.max(0.6, value);
};

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));

const roundTo3 = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 1000) / 1000;
};

const looksLegacy = (hex) => {
  try {
    if (!hex || typeof hex !== "object") return false;
    const vals = GROUP_KEYS.map((key) => Number(hex?.[key]));
    if (vals.some((v) => !Number.isFinite(v))) return false;
    const allSame = vals.every((v) => v === vals[0]);
    const sameAsOverall = Number(hex?.overall) === vals[0];
    return allSame && sameAsOverall && (vals[0] === 69 || vals[0] === 0);
  } catch {
    return false;
  }
};

const emptyMap = () => GROUP_KEYS.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});

export function computeHexagonCore(
  { statsExercises = {}, prevStatsHexagon = {}, trainedExerciseNames = [] } = {},
  {
    resolveMeta = defaultResolveMeta,
    calculate1RM = defaultCalculate1RM,
    includeDebug = true,
    clampLegacy = true,
    now = () => Date.now(),
    fallbackSetLimit = 50,
  } = {}
) {
  const nowTs = Number(now()) || Date.now();
  const cutoff30 = nowTs - 30 * 24 * 3600 * 1000;

  const trainedGroups = new Set();
  (Array.isArray(trainedExerciseNames) ? trainedExerciseNames : []).forEach((nm) => {
    try {
      const meta = resolveMeta?.(nm) || {};
      const group = meta?.group;
      if (group && GROUP_KEYS.includes(group)) trainedGroups.add(group);
      const distribution =
        meta?.distribution && typeof meta.distribution === "object" ? meta.distribution : group === "full" ? FULL_BODY_DIST : null;
      if (distribution) {
        Object.entries(distribution).forEach(([g, weight]) => {
          if (weight > 0 && GROUP_KEYS.includes(g)) trainedGroups.add(g);
        });
      }
    } catch {
      /* ignore resolve errors */
    }
  });

  const bestEq1RM = emptyMap();
  const vol30 = emptyMap();
  const lastTs = emptyMap();
  const daysSet = GROUP_KEYS.reduce((acc, key) => ({ ...acc, [key]: new Set() }), {});

  Object.keys(statsExercises || {}).forEach((exerciseName) => {
    const entry = statsExercises[exerciseName] || {};
    let meta = null;
    try {
      meta = resolveMeta?.(exerciseName) || {};
    } catch {
      meta = {};
    }
    const baseGroup = meta?.group;
    const distribution =
      meta?.distribution && typeof meta.distribution === "object"
        ? meta.distribution
        : baseGroup === "full"
        ? FULL_BODY_DIST
        : baseGroup && GROUP_KEYS.includes(baseGroup)
        ? { [baseGroup]: 1 }
        : null;
    if (!distribution) return;

    let best = Number(entry?.["1RM"] || 0);
    if (!best) {
      const rawSets = [];
      if (Array.isArray(entry?.sets)) rawSets.push(...entry.sets);
      if (Array.isArray(entry?.recentSets)) rawSets.push(...entry.recentSets);
      rawSets.forEach((set) => {
        const w = Number(set?.weight) || 0;
        const r = Number(set?.reps) || 0;
        if (w > 0 && r > 0) best = Math.max(best, calculate1RM(w, r));
      });
    }
    const [eq1rm] = normalizeEquipment(exerciseName, meta?.equipment, best);
    const fam = familyAnchorFor(exerciseName, baseGroup);
    const famAnchor = Math.max(1, Number(fam.anchor || GROUP_WR[baseGroup] || 200));

    Object.entries(distribution).forEach(([group, factor]) => {
      if (!GROUP_KEYS.includes(group) || !Number.isFinite(factor) || factor <= 0) return;
      const pct = (eq1rm / famAnchor) * 100 * factor;
      bestEq1RM[group] = Math.max(bestEq1RM[group], pct);
    });

    const timeline = Array.isArray(entry?.progress1RM) ? entry.progress1RM : [];
    timeline.forEach((row) => {
      const dayKey = row?.date;
      const ts = parseDayKey(dayKey);
      if (!ts || ts < cutoff30) return;
      const volume = Number(row?.volume || 0);
      Object.entries(distribution).forEach(([group, factor]) => {
        if (!GROUP_KEYS.includes(group) || factor <= 0) return;
        const share = Math.sqrt(Math.max(0.5, factor));
        vol30[group] += volume * share;
        daysSet[group].add(dayKey);
        lastTs[group] = Math.max(lastTs[group], ts);
      });
    });

    if (!timeline.length) {
      const rawSets = [];
      if (Array.isArray(entry?.sets)) rawSets.push(...entry.sets);
      if (Array.isArray(entry?.recentSets)) rawSets.push(...entry.recentSets);
      if (rawSets.length) {
        const limited = rawSets.length > fallbackSetLimit ? rawSets.slice(-fallbackSetLimit) : rawSets;
        limited.forEach((set) => {
          const weight = Number(set?.weight) || 0;
          const reps = Number(set?.reps) || 0;
          if (weight <= 0 || reps <= 0) return;
          const ts = parseDayKey(set?.date) || parseDayKey(set?.day) || parseDayKey(set?.dayKey) || parseDayKey(toDayKey(nowTs));
          if (!ts || ts < cutoff30) return;
          const dayKey = set?.date || set?.day || set?.dayKey || toDayKey(ts);
          const volume = weight * reps;
          Object.entries(distribution).forEach(([group, factor]) => {
            if (!GROUP_KEYS.includes(group) || factor <= 0) return;
            const share = Math.sqrt(Math.max(0.5, factor));
            vol30[group] += volume * share;
            daysSet[group].add(dayKey);
            lastTs[group] = Math.max(lastTs[group], ts);
          });
        });
      }
    }
  });

  const strengthScores = {};
  const workScores = {};
  const consistencyScores = {};
  const decayFactors = {};
  const scores = {};

  GROUP_KEYS.forEach((group) => {
    const strength = clamp(bestEq1RM[group] || 0, 0, 100);
    strengthScores[group] = strength;

    const vAnchor = Math.max(1, NORM_VOL_30D[group] || 10000);
    const work = clamp(Math.sqrt(Math.max(0, vol30[group] || 0) / vAnchor) * 100, 0, 100);
    workScores[group] = work;

    const consistency = clamp((daysSet[group].size / CONSIST_TARGET_30D) * 100, 0, 100);
    consistencyScores[group] = consistency;

    const raw = 0.7 * strength + 0.2 * work + 0.1 * consistency;
    const decay = decayFactorFromDays(daysSince(lastTs[group] || 0, nowTs));
    decayFactors[group] = decay;
    scores[group] = clamp(raw * decay, 0, 100);
  });

  const prev = clampLegacy && looksLegacy(prevStatsHexagon) ? {} : prevStatsHexagon || {};
  const next = { ...scores };
  GROUP_KEYS.forEach((group) => {
    const prevValue = Number(prev?.[group] || 0);
    if (trainedGroups.has(group)) {
      next[group] = Math.max(prevValue, next[group]);
    } else {
      const decayedPrev = prevValue * (decayFactors[group] || 1);
      next[group] = Math.max(decayedPrev, next[group]);
    }
  });

  const scaled = GROUP_KEYS.reduce((acc, key) => {
    const value = Number(next[key] || 0);
    acc[key] = roundTo3(clamp(value * DIFFICULTY_MULTIPLIER, 0, 100));
    return acc;
  }, {});

  const overall = roundTo3(
    GROUP_KEYS.reduce((acc, key) => acc + Number(scaled[key] || 0), 0) / GROUP_KEYS.length
  );

  const statsHexagon = {
    shoulders: scaled.shoulders,
    chest: scaled.chest,
    arms: scaled.arms,
    legs: scaled.legs,
    back: scaled.back,
    abs: scaled.abs,
    overall,
  };

  const lastTrained = GROUP_KEYS.reduce((acc, group) => {
    const value = Number(lastTs[group] || 0);
    acc[group] = Number.isFinite(value) ? value : 0;
    return acc;
  }, {});

  const result = { statsHexagon, lastTrained };
  if (includeDebug) {
    result.debug = {
      bestEq1RM,
      vol30,
      strengthScores,
      workScores,
      consistencyScores,
      decayFactors,
      difficultyMultiplier: DIFFICULTY_MULTIPLIER,
    };
  }
  return result;
}

export default computeHexagonCore;
