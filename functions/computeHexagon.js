const GROUP_KEYS = ["shoulders", "chest", "arms", "legs", "back", "abs"];

function inferMetaByName(name = "") {
  const n = String(name || "").toLowerCase();
  let group = null;
  if (/shoulder|overhead|press|raise|shrug|upright row/.test(n)) group = "shoulders";
  else if (/bench|chest|fly|push-?up/.test(n)) group = "chest";
  else if (/curl|tricep|skullcrusher|preacher|bicep/.test(n)) group = "arms";
  else if (/squat|deadlift|lunge|leg\s|calf|thruster|zercher|hamstring/.test(n)) group = "legs";
  else if (/row|pull[- ]?up|chin[- ]?up|lat|t\-?bar|good ?morning|snatch pull|clean pull/.test(n)) group = "back";
  else if (/ab|core|crunch|sit[- ]?up|plank|twist|rotation|leg raise|v[- ]?up|wheel/.test(n)) group = "abs";
  const equipment =
    n.includes("dumbbell") || n.includes("db") ? "Dumbbell" :
    n.includes("barbell") ? "Barbell" :
    n.includes("smith") ? "Smith Machine" :
    n.includes("machine") ? "Machine" :
    n.includes("cable") ? "Cable" :
    n.includes("band") ? "Band" :
    n.includes("trap bar") ? "Trap Bar" :
    (n.includes("body") || n.includes("push-up") || n.includes("pull-up") || n.includes("chin-up") || n.includes("dip")) ? "Body Weight" : "";
  return { group, equipment };
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

const NORM_1RM = { chest: 315, shoulders: 185, back: 455, legs: 405, arms: 135, abs: 180 };
const NORM_VOL_30D = { chest: 22000, shoulders: 15000, back: 28000, legs: 34000, arms: 12000, abs: 10000 };
const CONSIST_TARGET_30D = 8;

function toDayKey(d) {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  x.setHours(0,0,0,0);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
function parseDayKey(k) {
  if (!k) return 0;
  try { const [y,m,d] = String(k).split('-').map(Number); const dt = new Date(y,(m||1)-1,d||1); dt.setHours(0,0,0,0); return dt.getTime(); } catch { return 0; }
}
function daysSince(ts) { if (!ts) return Number.POSITIVE_INFINITY; return Math.max(0, Math.floor((Date.now() - ts)/(24*3600*1000))); }
function decayFactorFromDays(d) { if (d<=7) return 1; if (d<=21) return Math.max(0.6, 1 - 0.005*(d-7)); const v = 1 - 0.005*14 - 0.01*(d-21); return Math.max(0.6, v); }
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const r = (v) => Math.round(v);

function calculate1RM(weight, reps) { return weight / (1.0278 - 0.0278 * reps); }

function looksLegacy(hex) {
  try {
    if (!hex || typeof hex !== 'object') return false;
    const vals = [Number(hex?.shoulders), Number(hex?.chest), Number(hex?.arms), Number(hex?.legs), Number(hex?.back), Number(hex?.abs)];
    if (vals.some((v)=>!Number.isFinite(v))) return false;
    const allSame = vals.every((v)=>v===vals[0]);
    const sameOverall = Number(hex?.overall) === vals[0];
    return allSame && sameOverall && (vals[0] === 69 || vals[0] === 0);
  } catch { return false; }
}

function computeHexagonFromStats(statsExercises = {}, prevHexagon = {}, trainedExerciseNames = []) {
  const trainedGroups = new Set();
  (Array.isArray(trainedExerciseNames)?trainedExerciseNames:[]).forEach((nm)=>{
    const meta = inferMetaByName(nm) || {};
    if (meta.group && GROUP_KEYS.includes(meta.group)) trainedGroups.add(meta.group);
    if (meta.group === 'full') Object.entries(FULL_BODY_DIST).forEach(([g,f]) => f>0 && trainedGroups.add(g));
  });

  const bestEq1RM = { shoulders:0, chest:0, arms:0, legs:0, back:0, abs:0 };
  const vol30 = { shoulders:0, chest:0, arms:0, legs:0, back:0, abs:0 };
  const daysSet = { shoulders:new Set(), chest:new Set(), arms:new Set(), legs:new Set(), back:new Set(), abs:new Set() };
  const lastTs = { shoulders:0, chest:0, arms:0, legs:0, back:0, abs:0 };

  const now = Date.now();
  const cutoff30 = now - 30*24*3600*1000;

  for (const exName of Object.keys(statsExercises || {})) {
    const entry = statsExercises[exName] || {};
    const meta = inferMetaByName(exName) || {};
    const baseGroup = meta.group;
    if (!baseGroup) continue;

    let best = Number(entry['1RM'] || 0);
    if (!best && Array.isArray(entry.sets)) {
      const sets = entry.sets.length > 50 ? entry.sets.slice(-50) : entry.sets;
      for (const s of sets) {
        const w = Number(s?.weight)||0, rp = Number(s?.reps)||0; if (w>0 && rp>0) best = Math.max(best, calculate1RM(w, rp));
      }
    }
    const [eq1rm] = normalizeEquipment(exName, meta.equipment, best);
    const dist = baseGroup === 'full' ? FULL_BODY_DIST : { [baseGroup]: 1 };
    for (const [g,f] of Object.entries(dist)) {
      if (!GROUP_KEYS.includes(g)) continue; bestEq1RM[g] = Math.max(bestEq1RM[g], eq1rm * (f||1));
    }

    const timeline = Array.isArray(entry.progress1RM) ? entry.progress1RM : [];
    if (timeline.length) {
      for (const p of timeline) {
        const ts = parseDayKey(p?.date);
        if (!ts || ts < cutoff30) continue;
        const vol = Number(p?.volume||0);
        for (const [g,f] of Object.entries(dist)) {
          if (!GROUP_KEYS.includes(g)) continue; vol30[g] += vol * Math.sqrt(Math.max(0.5, f)); daysSet[g].add(p?.date); lastTs[g] = Math.max(lastTs[g], ts);
        }
      }
    } else if (Array.isArray(entry.sets)) {
      const sets = entry.sets.length > 50 ? entry.sets.slice(-50) : entry.sets;
      for (const s of sets) {
        const ts = parseDayKey(s?.date || toDayKey(now));
        const dk = s?.date || toDayKey(ts);
        if (!ts || ts < cutoff30) continue;
        const vol = (Number(s?.weight)||0) * (Number(s?.reps)||0);
        for (const [g,f] of Object.entries(dist)) {
          if (!GROUP_KEYS.includes(g)) continue; vol30[g] += vol * Math.sqrt(Math.max(0.5, f)); daysSet[g].add(dk); lastTs[g] = Math.max(lastTs[g], ts);
        }
      }
    }
  }

  const scores = { shoulders:0, chest:0, arms:0, legs:0, back:0, abs:0 };
  const decayFactors = {};
  for (const g of GROUP_KEYS) {
    const sNorm = clamp(Math.pow((bestEq1RM[g] || 0) / Math.max(1, NORM_1RM[g]||200), 0.9) * 100, 0, 100);
    const wNorm = clamp(Math.sqrt(Math.max(0, vol30[g]||0) / Math.max(1, NORM_VOL_30D[g]||10000)) * 100, 0, 100);
    const cNorm = clamp(((daysSet[g]||new Set()).size / CONSIST_TARGET_30D) * 100, 0, 100);
    const raw = 0.7*sNorm + 0.2*wNorm + 0.1*cNorm;
    const d = daysSince(lastTs[g] || 0); const df = decayFactorFromDays(d); decayFactors[g] = df;
    scores[g] = clamp(raw * df, 0, 100);
  }

  const prev = looksLegacy(prevHexagon) ? {} : (prevHexagon || {});
  const next = { ...scores };
  for (const g of GROUP_KEYS) {
    const prevVal = Number(prev?.[g] || 0);
    if (trainedGroups.has(g)) next[g] = Math.max(prevVal, next[g]);
    else next[g] = Math.max(prevVal * (decayFactors[g] || 1), next[g]);
  }

  const overall = r((Number(next.shoulders||0)+Number(next.chest||0)+Number(next.arms||0)+Number(next.legs||0)+Number(next.back||0)+Number(next.abs||0))/6);
  const rounded = { shoulders:r(next.shoulders||0), chest:r(next.chest||0), arms:r(next.arms||0), legs:r(next.legs||0), back:r(next.back||0), abs:r(next.abs||0), overall };
  const lastTrained = GROUP_KEYS.reduce((acc,g)=>{ acc[g] = lastTs[g]||0; return acc; }, {});
  return { statsHexagon: rounded, lastTrained };
}

module.exports = { computeHexagonFromStats };

