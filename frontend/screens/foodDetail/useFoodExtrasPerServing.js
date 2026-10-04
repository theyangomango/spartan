// Loads the per-serving micronutrients of a food: entry cache, then local cache, then the FatSecret API.
import { useState, useEffect } from 'react';

import { getFoodExtrasPS, setFoodExtrasPS } from '../../utils/foodCache';
import { getFoodById } from '../fatsecretClient';

const normalizeExtrasObject = (source) => {
    if (!source || typeof source !== 'object') return null;
    const toNum = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    };
    const next = {
        sugar_g: toNum(source?.sugar_g),
        added_sugars: toNum(source?.added_sugars),
        fiber_g: toNum(source?.fiber_g),
        sodium_mg: toNum(source?.sodium_mg),
        potassium_mg: toNum(source?.potassium_mg),
        satFat_g: toNum(source?.satFat_g),
        transFat_g: toNum(source?.transFat_g),
        monoFat_g: toNum(source?.monoFat_g),
        polyFat_g: toNum(source?.polyFat_g),
        cholesterol_mg: toNum(source?.cholesterol_mg),
        vitamin_d: toNum(source?.vitamin_d),
        vitamin_a: toNum(source?.vitamin_a),
        vitamin_c: toNum(source?.vitamin_c),
        calcium: toNum(source?.calcium),
        iron: toNum(source?.iron),
    };
    return Object.values(next).some((v) => v != null) ? next : null;
};

const extractExtrasFromServing = (serving) => normalizeExtrasObject({
    sugar_g: serving?.sugar,
    added_sugars: serving?.added_sugars,
    fiber_g: serving?.fiber,
    sodium_mg: serving?.sodium,
    potassium_mg: serving?.potassium,
    satFat_g: serving?.saturated_fat,
    transFat_g: serving?.trans_fat,
    monoFat_g: serving?.monounsaturated_fat,
    polyFat_g: serving?.polyunsaturated_fat,
    cholesterol_mg: serving?.cholesterol,
    vitamin_d: serving?.vitamin_d,
    vitamin_a: serving?.vitamin_a,
    vitamin_c: serving?.vitamin_c,
    calcium: serving?.calcium,
    iron: serving?.iron,
});

export default function useFoodExtrasPerServing(mode, food, entry) {
    const [extrasPS, setExtrasPS] = useState(null); // cached micronutrients per default serving

    // Load extras per serving from entry cache → local cache → API
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const fid = mode === 'add'
                    ? String(food?.food_id || '').trim()
                    : String(entry?.foodId || entry?.food_id || '').trim();
                if (!fid) return;

                // 0) If search results already include per-serving micros, use them immediately.
                if (mode === 'add') {
                    const extrasFromResult = normalizeExtrasObject(
                        food?.extrasPerServing || food?.extras_per_serving || food?.extrasPS
                    );
                    if (extrasFromResult) {
                        if (!cancelled) setExtrasPS(extrasFromResult);
                        try { await setFoodExtrasPS(fid, extrasFromResult); } catch { }
                        return;
                    }
                    const servings = food?.servings?.serving;
                    const arr = Array.isArray(servings) ? servings : (servings ? [servings] : []);
                    const def = arr.find((s) => String(s?.is_default || '') === '1') || arr[0] || null;
                    const extrasFromServing = extractExtrasFromServing(def);
                    if (extrasFromServing) {
                        if (!cancelled) setExtrasPS(extrasFromServing);
                        try { await setFoodExtrasPS(fid, extrasFromServing); } catch { }
                        return;
                    }
                }

                // 1) If editing and entry already has per-serving extras cached, use them
                if (mode === 'edit' && entry?.extrasPerServing) {
                    if (!cancelled) setExtrasPS(entry.extrasPerServing);
                    // Prime local cache
                    try { await setFoodExtrasPS(fid, entry.extrasPerServing); } catch { }
                    return;
                }

                // 2) Try local cache
                try {
                    const cachedLocal = await getFoodExtrasPS(fid);
                    if (cachedLocal && !cancelled) { setExtrasPS(cachedLocal); return; }
                } catch { }

                // 3) Fetch from FatSecret API
                const res = await getFoodById(fid).catch(() => null);
                const f = res?.food || null;
                const servings = f?.servings?.serving;
                const arr = Array.isArray(servings) ? servings : (servings ? [servings] : []);
                if (!arr?.length) return;
                const def = arr.find((s) => String(s?.is_default || '') === '1') || arr[0];
                if (!def) return;
                const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
                const cached = {
                    sugar_g: toNum(def.sugar),
                    added_sugars: toNum(def.added_sugars),
                    fiber_g: toNum(def.fiber),
                    sodium_mg: toNum(def.sodium),
                    potassium_mg: toNum(def.potassium),
                    satFat_g: toNum(def.saturated_fat),
                    transFat_g: toNum(def.trans_fat),
                    monoFat_g: toNum(def.monounsaturated_fat),
                    polyFat_g: toNum(def.polyunsaturated_fat),
                    cholesterol_mg: toNum(def.cholesterol),
                    vitamin_d: toNum(def.vitamin_d),
                    vitamin_a: toNum(def.vitamin_a),
                    vitamin_c: toNum(def.vitamin_c),
                    calcium: toNum(def.calcium),
                    iron: toNum(def.iron),
                };
                if (!cancelled) {
                    setExtrasPS(cached);
                }
                // Save locally for next time
                try { await setFoodExtrasPS(fid, cached); } catch { }
            } catch { }
        })();
        return () => { cancelled = true; };
    }, [mode, food?.food_id, entry?.foodId, entry?.food_id]);

    return extrasPS;
}
