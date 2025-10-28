// logic/exerciseCatalog.js
// Centralized family mapping, anchors, distributions, and equipment normalization.
// This file is designed to be data-first: add/update families, regexes, anchors, and distributions here.
// Anchors are "barbell-equivalent" peak-performance references used to scale scores to ~0–100.
//
// NOTES ON ANCHORS:
// - These are intentionally conservative vs absolute WRs so advanced users can still approach 100.
// - Benchmarks reflect typical elite/top-end gym performance rather than strict powerlifting records.
// - Adjust per your userbase as you collect real data (e.g., medians/95th percentile).
//
// HOW TO EXTEND:
// 1) Add a new FAMILY entry with:
//    - id: unique slug
//    - primaryGroup: one of: shoulders | chest | arms | legs | back | abs | full
//    - anchor: barbell-equivalent max (kg) for a "100 score" reference for that family
//    - nameRegex: regex that matches your exercise names (case-insensitive)
//    - distribution: object mapping group->weight (default is 100% primaryGroup)
// 2) (Optional) Add equipment override with "equipHint" if the family is known to be usually done with specific equipment
// 3) (Optional) Add secondary muscles via "distribution", e.g. bench: { chest:0.7, shoulders:0.2, arms:0.1 }
//
// AUDIT FLOW:
// - Use `auditExerciseDefs(EXERCISE_DEFS)` to produce:
//     covered: [{name, familyId, primaryGroup}], inferred: [...], unknown: [...], duplicates: [...]
//
// EQUIPMENT NORMALIZATION PHILOSOPHY:
// - Convert loads to a "barbell-equivalent" intensity so comparisons are fair.
// - Dumbbells: assume logged per-hand unless flagged single-arm; x2 + modest stability bonus.
// - Machines/cables/bands: reduce intensity compared to free weights due to guided paths/assistance.
// - Trap bar: slightly lower multiplier than straight bar for hinge patterns.

export const GROUP_KEYS = ["shoulders", "chest", "arms", "legs", "back", "abs"];

// Default world-ish anchors for groups used when we have no specific family match.
// (kg; keep conservative but meaningful)
export const GROUP_WR = { chest: 350, shoulders: 235, back: 501, legs: 500, arms: 120, abs: 200 };

// Default distribution for "full body" patterns
export const FULL_BODY_DIST = { legs: 0.35, back: 0.30, shoulders: 0.20, arms: 0.10, abs: 0.05, chest: 0.0 };

// -------- Equipment normalization --------

/**
 * Returns [barbellEquivalentWeight, multiplierApplied, flags]
 * - flags.singleArmDetected: whether we detected unilateral hint
 */
export function normalizeEquipment(exerciseName, equipment, rawWeight) {
  const n = String(exerciseName || "").toLowerCase();
  const eq = String(equipment || "").toLowerCase();
  let w = Number(rawWeight) || 0;
  let mult = 1.0;
  const flags = { singleArmDetected: false };

  // Single-arm hints
  const isSingleArm = /single[- ]?arm|one[- ]?arm|alternating|unilateral/.test(n);
  if (isSingleArm) flags.singleArmDetected = true;

  // Dumbbells: treat per-hand, x2 if not single-arm; stability premium
  if (eq.includes("dumbbell") || /(^|\W)(db|dumbbell)(\W|$)/.test(n)) {
    if (!isSingleArm) w = w * 2;
    mult *= 1.12; // modest stability bonus
  }

  // Smith / machine / cable / band / trap bar adjustments
  if (eq.includes("smith") || n.includes("smith")) mult *= 0.90;
  if (eq.includes("machine") || n.includes("machine")) mult *= 0.92;
  if (eq.includes("cable") || n.includes("cable")) mult *= 0.92;
  if (eq.includes("band") || n.includes("band")) mult *= 0.85;
  if (eq.includes("trap bar") || n.includes("trap bar")) mult *= 0.95;

  return [w * mult, mult, flags];
}

// -------- Family catalog --------

// Utility to build a simple single-group distribution
const D = (g) => ({ [g]: 1 });

// Catalog of families. Order matters: earlier items have priority if multiple regexes match.
export const FAMILIES = [
  // --- CHEST ---
  { id: "bench_barbell", primaryGroup: "chest", anchor: 350, nameRegex: /(^|\W)(barbell )?bench press(\W|$)|bench.*barbell/i, distribution: { chest: 0.7, shoulders: 0.2, arms: 0.1 } },
  { id: "bench_incline", primaryGroup: "chest", anchor: 300, nameRegex: /incline.*bench/i, distribution: { chest: 0.65, shoulders: 0.25, arms: 0.10 } },
  { id: "bench_decline", primaryGroup: "chest", anchor: 290, nameRegex: /decline.*bench/i, distribution: { chest: 0.75, shoulders: 0.15, arms: 0.10 } },
  { id: "bench_dumbbell", primaryGroup: "chest", anchor: 250, nameRegex: /bench.*dumbbell|bench press \(dumbbell\)/i, distribution: { chest: 0.7, shoulders: 0.2, arms: 0.1 } },
  { id: "fly", primaryGroup: "chest", anchor: 120, nameRegex: /(^|\W)(chest )?fly(\W|$)|pec deck|pec-deck/i, distribution: { chest: 0.9, shoulders: 0.1 } },
  { id: "dip", primaryGroup: "chest", anchor: 220, nameRegex: /(^|\W)dips?(\W|$)/i, distribution: { chest: 0.5, shoulders: 0.15, arms: 0.35 } },
  { id: "pushup", primaryGroup: "chest", anchor: 180, nameRegex: /push[- ]?ups?/i, distribution: { chest: 0.6, shoulders: 0.2, arms: 0.2 } },

  // --- SHOULDERS ---
  { id: "ohp_barbell", primaryGroup: "shoulders", anchor: 235, nameRegex: /(overhead|military).*press|shoulder press \(barbell\)/i, distribution: { shoulders: 0.75, arms: 0.15, chest: 0.10 } },
  { id: "ohp_dumbbell", primaryGroup: "shoulders", anchor: 200, nameRegex: /(^|\W)(db|dumbbell)\W.*(shoulder|overhead).*press|arnold press/i, distribution: { shoulders: 0.75, arms: 0.15, chest: 0.10 } },
  { id: "upright_row", primaryGroup: "shoulders", anchor: 140, nameRegex: /upright row/i, distribution: { shoulders: 0.8, arms: 0.2 } },
  { id: "shrug", primaryGroup: "shoulders", anchor: 400, nameRegex: /shrugs?/i, distribution: { shoulders: 1 } }, // traps here count into shoulders
  { id: "lateral_raise", primaryGroup: "shoulders", anchor: 120, nameRegex: /lateral raises?|side raises?/i, distribution: D("shoulders") },
  { id: "front_raise", primaryGroup: "shoulders", anchor: 130, nameRegex: /front raises?/i, distribution: D("shoulders") },
  { id: "rear_delt", primaryGroup: "shoulders", anchor: 110, nameRegex: /rear delt|reverse fly/i, distribution: D("shoulders") },
  { id: "face_pull", primaryGroup: "back", anchor: 100, nameRegex: /face pulls?/i, distribution: { back: 0.6, shoulders: 0.4 } },

  // --- BACK / ROW / PULL ---
  { id: "deadlift", primaryGroup: "legs", anchor: 501, nameRegex: /(^|\W)deadlifts?(\W|$)(?!.*(romanian|stiff|sumo))/i, distribution: { legs: 0.5, back: 0.45, abs: 0.05 } },
  { id: "deadlift_variation", primaryGroup: "legs", anchor: 400, nameRegex: /(romanian|stiff|sumo).*deadlift|snatch pull|clean pull/i, distribution: { legs: 0.55, back: 0.35, abs: 0.10 } },
  { id: "row_barbell", primaryGroup: "back", anchor: 300, nameRegex: /(^|\W)(barbell )?bent[- ]?over rows?(\W|$)|row \(barbell\)/i, distribution: { back: 0.85, arms: 0.15 } },
  { id: "row_dumbbell", primaryGroup: "back", anchor: 280, nameRegex: /one[- ]?arm rows?|row \(dumbbell\)/i, distribution: { back: 0.8, arms: 0.2 } },
  { id: "row_machine", primaryGroup: "back", anchor: 280, nameRegex: /seated rows?|t[- ]?bar rows?|row \(machine\)|row \(cable\)/i, distribution: { back: 0.85, arms: 0.15 } },
  { id: "pullup", primaryGroup: "back", anchor: 250, nameRegex: /pull[- ]?ups?|chin[- ]?ups?/i, distribution: { back: 0.75, arms: 0.25 } },
  { id: "lat_pulldown", primaryGroup: "back", anchor: 260, nameRegex: /lat pull[- ]?downs?/i, distribution: { back: 0.85, arms: 0.15 } },

  // --- LEGS (SQUAT / LUNGE / HINGE OTHER) ---
  { id: "squat_back", primaryGroup: "legs", anchor: 500, nameRegex: /(^|\W)(back )?squats?(\W|$)|squat \(barbell\)|zercher squats?/i, distribution: { legs: 0.75, abs: 0.15, back: 0.10 } },
  { id: "front_squat", primaryGroup: "legs", anchor: 350, nameRegex: /front squats?/i, distribution: { legs: 0.7, abs: 0.2, back: 0.1 } },
  { id: "leg_press", primaryGroup: "legs", anchor: 1000, nameRegex: /leg press|hack squats?/i, distribution: D("legs") },
  { id: "rdl", primaryGroup: "legs", anchor: 350, nameRegex: /romanian deadlifts?|stiff[- ]?leg deadlifts?/i, distribution: { legs: 0.6, back: 0.35, abs: 0.05 } },
  { id: "lunge", primaryGroup: "legs", anchor: 250, nameRegex: /lunges?|split squats?|bulgarian/i, distribution: D("legs") },
  { id: "leg_extension", primaryGroup: "legs", anchor: 200, nameRegex: /leg extensions?/i, distribution: D("legs") },
  { id: "leg_curl", primaryGroup: "legs", anchor: 180, nameRegex: /leg curls?|hamstring curls?/i, distribution: D("legs") },
  { id: "calf_raise", primaryGroup: "legs", anchor: 500, nameRegex: /calf raises?|seated calf/i, distribution: D("legs") },
  { id: "glute_hinge", primaryGroup: "legs", anchor: 350, nameRegex: /hip thrusts?|glute[- ]?ham|good mornings?/i, distribution: { legs: 0.7, back: 0.2, abs: 0.1 } },

  // --- ARMS ---
  { id: "curl_barbell", primaryGroup: "arms", anchor: 110, nameRegex: /(^|\W)(barbell )?curls?(\W|$)|bicep.*curl \(barbell\)|curl \(barbell\)/i, distribution: D("arms") },
  { id: "curl_dumbbell", primaryGroup: "arms", anchor: 120, nameRegex: /curl \(dumbbell\)|hammer curls?|incline curls?/i, distribution: D("arms") },
  { id: "curl_machine", primaryGroup: "arms", anchor: 100, nameRegex: /preacher curls?|curl \(machine\)/i, distribution: D("arms") },
  { id: "tricep_extension", primaryGroup: "arms", anchor: 120, nameRegex: /tricep.*extensions?|skullcrushers?|overhead extensions?/i, distribution: D("arms") },
  { id: "cg_bench", primaryGroup: "arms", anchor: 300, nameRegex: /close[- ]?grip bench/i, distribution: { chest: 0.35, shoulders: 0.15, arms: 0.5 } },
  { id: "forearms", primaryGroup: "arms", anchor: 50, nameRegex: /wrist curls?|reverse wrists?|wrist rollers?/i, distribution: D("arms") },

  // --- ABS / CORE ---
  { id: "cable_crunch", primaryGroup: "abs", anchor: 200, nameRegex: /crunch \(cable\)|cable.*crunch/i, distribution: D("abs") },
  { id: "machine_abs", primaryGroup: "abs", anchor: 180, nameRegex: /ab.*machine|torso rotations?|seated crunch/i, distribution: D("abs") },
  { id: "bodyweight_abs", primaryGroup: "abs", anchor: 160, nameRegex: /sit[- ]?ups?|crunches?|leg raises?|v[- ]?ups?|russian twists?|planks?|side planks?|ab wheel|rollouts?|twists?/i, distribution: D("abs") },

  // --- FULL BODY / OLY / METCON ---
  { id: "clean_jerk", primaryGroup: "full", anchor: 300, nameRegex: /clean.*jerk|c&j/i, distribution: FULL_BODY_DIST },
  { id: "snatch", primaryGroup: "full", anchor: 220, nameRegex: /(^|\W)snatch(\W|$)/i, distribution: FULL_BODY_DIST },
  { id: "thruster", primaryGroup: "full", anchor: 180, nameRegex: /thrusters?/i, distribution: FULL_BODY_DIST },
  { id: "kb_swing", primaryGroup: "full", anchor: 120, nameRegex: /kettlebell swings?/i, distribution: FULL_BODY_DIST },
];

// -------- Lookup helpers --------

export function familyForExerciseName(name) {
  if (!name) return null;
  for (const f of FAMILIES) {
    if (f.nameRegex.test(name)) return f;
  }
  return null;
}

export function familyAnchorFor(name, fallbackGroup) {
  const fam = familyForExerciseName(name);
  if (fam) return { anchor: fam.anchor, familyId: fam.id, primaryGroup: fam.primaryGroup, distribution: fam.distribution || D(fam.primaryGroup) };
  const anchor = GROUP_WR[fallbackGroup] || 200;
  return { anchor, familyId: "generic", primaryGroup: fallbackGroup, distribution: D(fallbackGroup) };
}

/**
 * Infer muscle group & crude equipment from a name when EXERCISE_DEFS lacks structured data.
 */
export function inferMetaByName(name) {
  const n = String(name || "").toLowerCase();
  let group = null;
  if (/shoulder|overhead|press|raise|shrug|upright row/.test(n)) group = "shoulders";
  else if (/bench|chest|fly|push[- ]?up/.test(n)) group = "chest";
  else if (/curl|tricep|skullcrusher|preacher/.test(n)) group = "arms";
  else if (/squat|deadlift|lunge|leg\s|calf|thrust/.test(n)) group = "legs";
  else if (/row|pull[- ]?up|chin[- ]?up|lat|trap|face pull/.test(n)) group = "back";
  else if (/ab|core|crunch|sit[- ]?up|plank|twist|leg raise|v[- ]?up|rollout|wheel/.test(n)) group = "abs";

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
      : n.includes("body") || /push[- ]?up|pull[- ]?up|chin[- ]?up|dip/.test(n)
      ? "Body Weight"
      : "";

  return { group, equipment };
}

/**
 * Build a normalized meta map from your EXERCISE_DEFS (name → {group, equipment})
 * falling back to inference if missing.
 */
export function buildMetaFromDefs(EXERCISE_DEFS) {
  const map = Object.create(null);
  (EXERCISE_DEFS || []).forEach((ex) => {
    const name = String(ex?.name || "").trim();
    if (!name) return;
    const mg = String(ex?.muscleGroup || ex?.muscle || "").toLowerCase();
    const eq = String(ex?.equipment || "").trim();
    // Normalize group names to our six buckets
    const group =
      mg.includes("shoulder") ? "shoulders" :
      mg === "chest" ? "chest" :
      mg === "arms" ? "arms" :
      mg === "legs" ? "legs" :
      mg === "back" ? "back" :
      (mg === "abs" || mg.includes("core")) ? "abs" :
      (mg === "full body" || mg.includes("full")) ? "full" : null;

    if (group) {
      map[name] = { group, equipment: eq };
    } else {
      map[name] = inferMetaByName(name);
    }
  });
  return map;
}

/**
 * Audit EXERCISE_DEFS coverage against FAMILIES.
 * Returns: { covered, inferred, unknown, duplicates }
 */
export function auditExerciseDefs(EXERCISE_DEFS) {
  const seen = new Map();
  const covered = [];
  const inferred = [];
  const unknown = [];
  const duplicates = [];

  (EXERCISE_DEFS || []).forEach((ex) => {
    const name = String(ex?.name || "").trim();
    if (!name) return;

    if (seen.has(name)) {
      duplicates.push({ name, firstIndex: seen.get(name), duplicateIndex: duplicates.length });
    } else {
      seen.set(name, covered.length + inferred.length + unknown.length);
    }

    const meta = buildMetaFromDefs([ex])[name];
    const fam = familyForExerciseName(name);

    if (fam) {
      covered.push({ name, familyId: fam.id, primaryGroup: fam.primaryGroup });
    } else if (meta?.group) {
      // Has a group but no explicit family match: we can still anchor via group fallback.
      inferred.push({ name, primaryGroup: meta.group, note: "No explicit FAMILY regex match; using group fallback anchor" });
    } else {
      unknown.push({ name, note: "No group detected; update EXERCISE_DEFS or add a FAMILY regex" });
    }
  });

  return { covered, inferred, unknown, duplicates };
}

