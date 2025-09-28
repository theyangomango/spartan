// functions/computeHexagon.js (ESM)
// Server-side hexagon computation used by legacy onUserStatsWrite Cloud Function.
// Mirrors the client logic in frontend/logic/computeHexagonStats.js, but avoids
// importing app-specific exercise catalogs. Uses name heuristics only.

const GROUP_KEYS = ["shoulders", "chest", "arms", "legs", "back", "abs"];

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

function calculate1RM(w, r) {
  const weight = Number(w) || 0;
  const reps = Number(r) || 0;
  if (weight <= 0 || reps <= 0) return 0;
  // Epley
  return weight * (1 + reps / 30);
}

function normalizeEquipment(name, equipment, weight) {
  const n = String(name || "").toLowerCase();
  const eq = String(equipment || "");
  let w = Number(weight) || 0;
  let mult = 1.0;
  const isSingleArm = /single[- ]?arm|one[- ]?arm|alternating|unilateral/.test(n);
  if (/dumbbell/i.test(eq) || /dumbbell/.test(n) || /db/.test(n)) {
    if (!isSingleArm) w = w * 2;
    mult *= 1.12;
  }
  if (/smith/i.test(eq) || /smith/.test(n)) mult *= 0.90;
  if (/machine/i.test(eq)) mult *= 0.92;
  if (/cable/i.test(eq)) mult *= 0.92;
  if (/band/i.test(eq)) mult *= 0.85;
  if (/trap bar/i.test(eq) || /trap bar/.test(n)) mult *= 0.95;
  return [w * mult, mult];
}

const FULL_BODY_DIST = { legs: 0.35, back: 0.30, shoulders: 0.20, arms: 0.10, abs: 0.05, chest: 0.0 };

// Family/world-class anchors — barbell-equivalent kg that map ~100
export const FAMILY_ANCHORS = [
  // Chest
  { fam: 'bench_barbell', group: 'chest', rx: /bench.*barbell|bench press \(barbell\)/i, anchor: 350 },
  { fam: 'bench_incline', group: 'chest', rx: /incline.*bench/i, anchor: 300 },
  { fam: 'bench_decline', group: 'chest', rx: /decline.*bench/i, anchor: 290 },
  { fam: 'bench_dumbbell', group: 'chest', rx: /bench.*dumbbell|bench press \(dumbbell\)/i, anchor: 250 },
  { fam: 'fly', group: 'chest', rx: /fly|pec deck/i, anchor: 120 },
  { fam: 'dip', group: 'chest', rx: /dip/i, anchor: 220 },
  { fam: 'pushup', group: 'chest', rx: /push-?up/i, anchor: 180 },

  // Shoulders
  { fam: 'ohp_barbell', group: 'shoulders', rx: /(overhead|military).*press|shoulder press \(barbell\)/i, anchor: 235 },
  { fam: 'ohp_dumbbell', group: 'shoulders', rx: /shoulder press \(dumbbell\)|arnold press/i, anchor: 200 },
  { fam: 'upright_row', group: 'shoulders', rx: /upright row/i, anchor: 140 },
  { fam: 'shrug', group: 'shoulders', rx: /shrug/i, anchor: 400 },
  { fam: 'lateral_raise', group: 'shoulders', rx: /lateral raise/i, anchor: 120 },
  { fam: 'front_raise', group: 'shoulders', rx: /front raise/i, anchor: 130 },

  // Back + Legs (deads are legs-dominant)
  { fam: 'deadlift', group: 'legs', rx: /deadlift(?!.*romanian|.*stiff|.*sumo)/i, anchor: 501 },
  { fam: 'sumo_deadlift', group: 'legs', rx: /sumo deadlift/i, anchor: 480 },
  { fam: 'rdl', group: 'legs', rx: /romanian deadlift|stiff-?leg deadlift/i, anchor: 350 },
  { fam: 'row_barbell', group: 'back', rx: /barbell row|pendlay|seal row|t-?bar row/i, anchor: 240 },
  { fam: 'pullup', group: 'back', rx: /pull-?up|chin-?up/i, anchor: 130 },
  { fam: 'lat_pulldown', group: 'back', rx: /lat pulldown/i, anchor: 120 },
  { fam: 'shrug_back', group: 'back', rx: /shrug/i, anchor: 400 },

  // Legs
  { fam: 'squat_highbar', group: 'legs', rx: /(high|olympic).*squat|back squat/i, anchor: 477 },
  { fam: 'squat_lowbar', group: 'legs', rx: /low bar.*squat|lowbar/i, anchor: 525 },
  { fam: 'front_squat', group: 'legs', rx: /front squat/i, anchor: 350 },
  { fam: 'leg_press', group: 'legs', rx: /leg press|hack squat/i, anchor: 1000 },
  { fam: 'lunge', group: 'legs', rx: /lunge|split squat/i, anchor: 250 },
  { fam: 'leg_extension', group: 'legs', rx: /leg extension/i, anchor: 200 },
  { fam: 'leg_curl', group: 'legs', rx: /leg curl|hamstring curl/i, anchor: 180 },
  { fam: 'calf_raise', group: 'legs', rx: /calf raise|seated calf/i, anchor: 500 },
  { fam: 'glute_hinge', group: 'legs', rx: /hip thrust|glute-?ham|good morning/i, anchor: 350 },

  // Arms
  { fam: 'curl_barbell', group: 'arms', rx: /bicep.*curl \(barbell\)|barbell curl|curl \(barbell\)/i, anchor: 110 },
  { fam: 'curl_dumbbell', group: 'arms', rx: /curl \(dumbbell\)|hammer curl|incline curl/i, anchor: 120 },
  { fam: 'curl_machine', group: 'arms', rx: /preacher curl|curl \(machine\)/i, anchor: 100 },
  { fam: 'tricep_extension', group: 'arms', rx: /tricep.*extension|skullcrusher|overhead extension/i, anchor: 120 },
  { fam: 'cg_bench', group: 'arms', rx: /close-?grip bench/i, anchor: 300 },
  { fam: 'forearms', group: 'arms', rx: /wrist curl|reverse wrist|wrist roller/i, anchor: 50 },

  // Abs
  { fam: 'cable_crunch', group: 'abs', rx: /crunch \(cable\)|cable.*crunch/i, anchor: 200 },
  { fam: 'machine_abs', group: 'abs', rx: /ab.*machine|torso rotation|seated crunch/i, anchor: 180 },
  { fam: 'bodyweight_abs', group: 'abs', rx: /sit-?up|crunch|leg raise|v-?up|russian twist|plank|side plank|ab wheel|rollout|twist/i, anchor: 160 },
];

const GROUP_WR = { chest: 350, shoulders: 235, back: 501, legs: 500, arms: 120, abs: 200 };

export function familyAnchorFor(name, group) {
  for (const f of FAMILY_ANCHORS) {
    if (f.rx.test(String(name || ""))) return { anchor: f.anchor, fam: f.fam, group: f.group || group };
  }
  return { anchor: GROUP_WR[group] || 200, fam: 'generic', group };
}

const NORM_VOL_30D = { chest: 22000, shoulders: 15000, back: 28000, legs: 34000, arms: 12000, abs: 10000 };
const CONSIST_TARGET_30D = 8;

function toDayKey(d) {
  if (!d && d !== 0) return "";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  x.setHours(0, 0, 0, 0);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}
function parseDayKey(k) { if (!k) return 0; try { const [y, m, d] = String(k).split("-").map(Number); const dt = new Date(y, (m || 1) - 1, d || 1); dt.setHours(0,0,0,0); return dt.getTime(); } catch { return 0; } }
function daysSince(ts) { if (!ts) return Number.POSITIVE_INFINITY; const ms = Date.now() - ts; return Math.max(0, Math.floor(ms / (24*3600*1000))); }
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const roundTo3 = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 1000) / 1000;
};

export function computeHexagonFromStats({ statsExercises = {}, prevStatsHexagon = {}, trainedExerciseNames = [] } = {}) {
  const trainedGroups = new Set();
  (Array.isArray(trainedExerciseNames) ? trainedExerciseNames : []).forEach((nm) => {
    const meta = inferMetaByName(nm) || {};
    if (meta?.group && GROUP_KEYS.includes(meta.group)) trainedGroups.add(meta.group);
    if (meta?.group === "full") Object.keys(FULL_BODY_DIST).forEach((g) => trainedGroups.add(g));
  });

  const bestEq1RM = { shoulders: 0, chest: 0, arms: 0, legs: 0, back: 0, abs: 0 };
  const vol30 = { shoulders: 0, chest: 0, arms: 0, legs: 0, back: 0, abs: 0 };
  const daysSet = { shoulders: new Set(), chest: new Set(), arms: new Set(), legs: new Set(), back: new Set(), abs: new Set() };
  const lastTs = { shoulders: 0, chest: 0, arms: 0, legs: 0, back: 0, abs: 0 };

  const now = Date.now();
  const cutoff30 = now - 30 * 24 * 3600 * 1000;

  Object.keys(statsExercises || {}).forEach((exName) => {
    const entry = statsExercises[exName] || {};
    const meta = inferMetaByName(exName) || {};
    const baseGroup = meta?.group;
    if (!baseGroup) return;

    let best = Number(entry?.["1RM"] || 0);
    if (!best && Array.isArray(entry?.sets) && entry.sets.length) {
      for (const s of entry.sets) {
        const w = Number(s?.weight) || 0, rp = Number(s?.reps) || 0;
        if (w > 0 && rp > 0) best = Math.max(best, calculate1RM(w, rp));
      }
    }
    const [eq1rm] = normalizeEquipment(exName, meta?.equipment, best);
    const fam = familyAnchorFor(exName, baseGroup);
    const famAnchor = Math.max(1, Number(fam.anchor || 200));

    const dist = baseGroup === "full" ? FULL_BODY_DIST : { [baseGroup]: 1 };
    Object.entries(dist).forEach(([g, f]) => {
      if (!GROUP_KEYS.includes(g)) return;
      const pct = (eq1rm / famAnchor) * 100 * (f || 1);
      bestEq1RM[g] = Math.max(bestEq1RM[g], pct);
    });

    const timeline = Array.isArray(entry?.progress1RM) ? entry.progress1RM : [];
    for (const p of timeline) {
      const dk = p?.date; const ts = parseDayKey(dk); if (!ts || ts < cutoff30) continue;
      const vol = Number(p?.volume || 0);
      const dist2 = baseGroup === "full" ? FULL_BODY_DIST : { [baseGroup]: 1 };
      Object.entries(dist2).forEach(([g, f]) => {
        if (!GROUP_KEYS.includes(g)) return;
        vol30[g] += vol * Math.sqrt(Math.max(0.5, f));
        daysSet[g].add(dk);
        lastTs[g] = Math.max(lastTs[g], ts);
      });
    }

    if (!timeline.length) {
      const setsAll = Array.isArray(entry?.sets) ? entry.sets : [];
      const sets = setsAll.length > 50 ? setsAll.slice(-50) : setsAll;
      for (const s of sets) {
        const ts = parseDayKey(s?.date || toDayKey(now));
        const dk = s?.date || toDayKey(ts);
        if (!ts || ts < cutoff30) continue;
        const vol = (Number(s?.weight) || 0) * (Number(s?.reps) || 0);
        const dist2 = baseGroup === "full" ? FULL_BODY_DIST : { [baseGroup]: 1 };
        Object.entries(dist2).forEach(([g, f]) => {
          if (!GROUP_KEYS.includes(g)) return;
          vol30[g] += vol * Math.sqrt(Math.max(0.5, f));
          daysSet[g].add(dk);
          lastTs[g] = Math.max(lastTs[g], ts);
        });
      }
    }
  });

  const scores = { shoulders: 0, chest: 0, arms: 0, legs: 0, back: 0, abs: 0 };
  const decayFactors = {};

  GROUP_KEYS.forEach((g) => {
    const sNorm = clamp(bestEq1RM[g] || 0, 0, 100);
    const vAnchor = Math.max(1, NORM_VOL_30D[g] || 10000);
    const wNorm = clamp(Math.sqrt(Math.max(0, vol30[g] || 0) / vAnchor) * 100, 0, 100);
    const c = (daysSet[g] || new Set()).size;
    const cNorm = clamp((c / CONSIST_TARGET_30D) * 100, 0, 100);
    const raw = 0.7 * sNorm + 0.2 * wNorm + 0.1 * cNorm;
    const d = daysSince(lastTs[g] || 0);
    const df = d <= 7 ? 1 : (d <= 21 ? Math.max(0.6, 1 - 0.005 * (d - 7)) : Math.max(0.6, 1 - 0.005 * 14 - 0.01 * (d - 21)));
    decayFactors[g] = df;
    scores[g] = clamp(raw * df, 0, 100);
  });

  const next = { ...scores };
  GROUP_KEYS.forEach((g) => {
    const prevVal = Number(prevStatsHexagon?.[g] || 0);
    if (trainedGroups.has(g)) next[g] = Math.max(prevVal, next[g]);
    else next[g] = Math.max(prevVal * (decayFactors[g] || 1), next[g]);
  });

  const overall = roundTo3((Number(next.shoulders||0)+Number(next.chest||0)+Number(next.arms||0)+Number(next.legs||0)+Number(next.back||0)+Number(next.abs||0))/6);
  return { statsHexagon: {
    shoulders: roundTo3(next.shoulders || 0),
    chest: roundTo3(next.chest || 0),
    arms: roundTo3(next.arms || 0),
    legs: roundTo3(next.legs || 0),
    back: roundTo3(next.back || 0),
    abs: roundTo3(next.abs || 0),
    overall,
  }};
}

export default computeHexagonFromStats;
