// frontend/logic/macroLogsIndexer.js
// Centralized builder for meals/totals from global.userData.loggedFoods with caching.

import { parseMacrosFromDescription } from '../utils/nutrition';
import { toDayKey } from '../utils/date';

// Module-level caches
const globalIndex = new Map(); // dayKey -> array of { id, entry }
const globalMealsCache = new Map(); // dayKey -> { meals, totals }
const macroParseCache = new Map(); // `${id}|${desc}|${qty}` -> macros
let lastSig = 0; // mirrors global.__loggedFoodsSig to know when to rebuild index

function rebuildGlobalIndexIfNeeded() {
  const map = global?.userData?.loggedFoods || {};
  const sig = Number(global?.__loggedFoodsSig || 0);
  if (sig === lastSig && globalIndex.size > 0) return;
  lastSig = sig;
  globalIndex.clear();
  globalMealsCache.clear();

  try {
    // Two supported shapes:
    // 1) Nested by day: { [dayKey]: { [entryId]: entry } }
    // 2) Flat legacy:   { [entryId]: entry(dayKey: ...) }
    const vals = Object.values(map);
    const looksNested = vals[0] && typeof vals[0] === 'object' && !('dayKey' in vals[0]);
    if (looksNested) {
      for (const [dk, entries] of Object.entries(map)) {
        const list = [];
        for (const [id, entry] of Object.entries(entries || {})) list.push({ id, entry });
        if (list.length) globalIndex.set(String(dk), list);
      }
    } else {
      for (const [id, entry] of Object.entries(map)) {
        const dk = String(entry?.dayKey || '');
        if (!dk) continue;
        if (!globalIndex.has(dk)) globalIndex.set(dk, []);
        globalIndex.get(dk).push({ id, entry });
      }
    }
  } catch { /* noop */ }
}

export function buildFromGlobal(dateObj) {
  const d = new Date(dateObj);
  if (Number.isNaN(d.getTime())) {
    return {
      meals: { Breakfast: [], Lunch: [], Dinner: [], Snacks: [] },
      totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    };
  }
  d.setHours(0, 0, 0, 0);
  const dk = toDayKey(d);

  rebuildGlobalIndexIfNeeded();

  const cached = globalMealsCache.get(dk);
  if (cached) return cached;

  const buckets = { Breakfast: [], Lunch: [], Dinner: [], Snacks: [] };
  const totalsObj = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  try {
    const rows = globalIndex.get(dk) || [];
    for (const { id, entry } of rows) {
      const mealKey = (() => {
        const t = String(entry?.meal || '').toLowerCase();
        if (t.startsWith('break')) return 'Breakfast';
        if (t.startsWith('lun')) return 'Lunch';
        if (t.startsWith('din')) return 'Dinner';
        return 'Snacks';
      })();
      const qty = typeof entry?.quantity === 'number' ? entry.quantity : 1;
      const m = entry?.macros || (() => {
        const key = `${id}|${entry?.desc || ''}|${qty}`;
        const hit = macroParseCache.get(key);
        if (hit) return hit;
        const parsed = parseMacrosFromDescription(entry?.desc || '', qty);
        macroParseCache.set(key, parsed);
        return parsed;
      })();
      const item = {
        key: id,
        name: entry?.name || 'Food',
        brand: entry?.brand || '',
        desc: entry?.desc || '',
        qty,
        foodId: entry?.foodId || entry?.food_id || '',
        macros: m,
      };
      if (!buckets[mealKey]) buckets[mealKey] = [];
      buckets[mealKey].push(item);
      totalsObj.calories += Number(m?.calories) || 0;
      totalsObj.protein += Number(m?.protein) || 0;
      totalsObj.carbs += Number(m?.carbs) || 0;
      totalsObj.fat += Number(m?.fat) || 0;
    }
  } catch { /* noop */ }

  const built = {
    meals: {
      Breakfast: buckets.Breakfast || [],
      Lunch: buckets.Lunch || [],
      Dinner: buckets.Dinner || [],
      Snacks: buckets.Snacks || [],
    },
    totals: {
      calories: Math.round(totalsObj.calories),
      protein: Math.round(totalsObj.protein),
      carbs: Math.round(totalsObj.carbs),
      fat: Math.round(totalsObj.fat),
    },
  };
  globalMealsCache.set(dk, built);
  return built;
}

export function invalidateMealsCache() {
  globalMealsCache.clear();
}

