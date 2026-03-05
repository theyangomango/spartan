// utils/nutrition.js

/** Turn "0.5" or "1/3" (or number) into a positive number; defaults to 1 */
export const coercePortion = (q) => {
    if (q == null) return 1;
    if (typeof q === 'number') return Number.isFinite(q) && q > 0 ? q : 1;
    const s = String(q).trim();
    if (!s) return 1;
    if (s.includes('/')) {
        const [a, b] = s.split('/').map(Number);
        const v = a && b ? a / b : NaN;
        return Number.isFinite(v) && v > 0 ? v : 1;
    }
    const v = Number(s);
    return Number.isFinite(v) && v > 0 ? v : 1;
};

const toNumberString = (n) => {
    // show integers without decimals; else up to 2 decimals
    return Math.abs(n - Math.round(n)) < 1e-6 ? String(Math.round(n)) : String(+n.toFixed(2));
};

const gcd = (a, b) => {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { const t = b; b = a % b; a = t; }
    return a || 1;
};

const toSimpleFraction = (x, maxDen = 64) => {
    if (!Number.isFinite(x) || x <= 0) return null;
    // handle whole numbers simply
    if (Math.abs(x - Math.round(x)) < 1e-6) return String(Math.round(x));
    // try rational approximation
    let bestNum = 1, bestDen = 1, bestErr = Infinity;
    for (let den = 1; den <= maxDen; den++) {
        const num = Math.round(x * den);
        const err = Math.abs(x - num / den);
        if (err < bestErr) { bestNum = num; bestDen = den; bestErr = err; }
        if (bestErr < 1e-6) break;
    }
    const g = gcd(bestNum, bestDen);
    bestNum /= g; bestDen /= g;

    // represent as mixed or proper fraction (favor simple “a/b” for < 1)
    if (bestNum >= bestDen) {
        const whole = Math.floor(bestNum / bestDen);
        const rem = bestNum % bestDen;
        if (rem === 0) return String(whole);
        return `${whole} ${rem}/${bestDen}`;
    }
    return `${bestNum}/${bestDen}`;
};

export const scaleMacros = (m = {}, quantity = 1) => {
    const q = coercePortion(quantity);
    const c = m.calories || 0, p = m.protein || 0, cb = m.carbs || 0, f = m.fat || 0;
    return {
        calories: c * q,
        protein: p * q,
        carbs: cb * q,
        fat: f * q,
    };
};

/**
 * Parse macros from a description string (FatSecret-style) and scale by `quantity`.
 * - `quantity` can be a number (e.g., 0.5) or a string ("1/3", "0.4").
 */
export const parseMacrosFromDescription = (desc = '', quantity = 1) => {
    const text = String(desc);

    let cal = 0;
    const calLabel = text.match(/calories?\s*:\s*(\d+(?:\.\d+)?)/i);
    const calBare = text.match(/(\d+(?:\.\d+)?)\s*(?:kcal|cal)\b/i);
    if (calLabel) cal = parseFloat(calLabel[1]);
    else if (calBare) cal = parseFloat(calBare[1]);

    const prot = (() => {
        const m = text.match(/protein\s*:\s*(\d+(?:\.\d+)?)\s*g/i);
        return m ? parseFloat(m[1]) : 0;
    })();
    const carbs = (() => {
        const m = text.match(/carb(?:s|ohydrate)?\s*:\s*(\d+(?:\.\d+)?)\s*g/i);
        return m ? parseFloat(m[1]) : 0;
    })();
    const fat = (() => {
        const m = text.match(/fat\s*:\s*(\d+(?:\.\d+)?)\s*g/i);
        return m ? parseFloat(m[1]) : 0;
    })();

    const base = {
        calories: Number.isFinite(cal) ? cal : 0,
        protein: Number.isFinite(prot) ? prot : 0,
        carbs: Number.isFinite(carbs) ? carbs : 0,
        fat: Number.isFinite(fat) ? fat : 0,
    };

    return scaleMacros(base, quantity);
};

/**
 * Attempt to parse additional nutrition facts from a FatSecret-style description
 * and scale by quantity.
 * - Returns grams for sugar/fiber/saturated fat and mg for sodium/cholesterol.
 * - Any field not present will be `null` so callers can show an empty-state.
 */
export const parseExtraNutrientsFromDescription = (desc = '', quantity = 1) => {
    const text = String(desc);
    const q = coercePortion(quantity);

    const pickNumber = (regex) => {
        const m = text.match(regex);
        if (!m) return null;
        const v = parseFloat(m[1]);
        if (!Number.isFinite(v)) return null;
        return v * q;
    };

    // Total sugars (g)
    const sugar_g = pickNumber(/\b(?:sugars?|sugar)\s*:?\s*(\d+(?:\.\d+)?)\s*g\b/i);
    // Added sugars (g)
    const added_sugars =
        pickNumber(/\badded\s+sugars?\s*:?\s*(\d+(?:\.\d+)?)\s*g\b/i)
        ?? pickNumber(/\bincludes\s*(\d+(?:\.\d+)?)\s*g\s+added\s+sugars?\b/i);
    // Dietary fiber (g)
    const fiber_g = pickNumber(/\b(?:dietary\s+fiber|fiber)\s*:?\s*(\d+(?:\.\d+)?)\s*g\b/i);
    // Sodium (mg)
    const sodium_mg = pickNumber(/\bsodium\s*:?\s*(\d+(?:\.\d+)?)\s*mg\b/i);
    // Potassium (mg)
    const potassium_mg = pickNumber(/\bpotassium\s*:?\s*(\d+(?:\.\d+)?)\s*mg\b/i);
    // Saturated fat (g)
    const satFat_g = pickNumber(/\b(?:saturated\s+fat|sat\.?\s*fat)\s*:?\s*(\d+(?:\.\d+)?)\s*g\b/i);
    // Trans fat (g)
    const transFat_g = pickNumber(/\b(?:trans\s+fat|trans-fat)\s*:?\s*(\d+(?:\.\d+)?)\s*g\b/i);
    // Monounsaturated fat (g)
    const monoFat_g = pickNumber(/\b(?:monounsaturated\s+fat|mono\.?\s*fat)\s*:?\s*(\d+(?:\.\d+)?)\s*g\b/i);
    // Polyunsaturated fat (g)
    const polyFat_g = pickNumber(/\b(?:polyunsaturated\s+fat|poly\.?\s*fat)\s*:?\s*(\d+(?:\.\d+)?)\s*g\b/i);
    // Cholesterol (mg)
    const cholesterol_mg = pickNumber(/\bcholesterol\s*:?\s*(\d+(?:\.\d+)?)\s*mg\b/i);
    // Vitamin D (mcg)
    const vitamin_d = pickNumber(/\bvitamin\s*d\s*:?\s*(\d+(?:\.\d+)?)\s*(?:mcg|ug|μg)\b/i);
    // Vitamin A/C, calcium, iron are commonly provided as percentages in labels/FatSecret payloads.
    const vitamin_a = pickNumber(/\bvitamin\s*a\s*:?\s*(\d+(?:\.\d+)?)\s*%\b/i);
    const vitamin_c = pickNumber(/\bvitamin\s*c\s*:?\s*(\d+(?:\.\d+)?)\s*%\b/i);
    const calcium = pickNumber(/\bcalcium\s*:?\s*(\d+(?:\.\d+)?)\s*%\b/i);
    const iron = pickNumber(/\biron\s*:?\s*(\d+(?:\.\d+)?)\s*%\b/i);

    return {
        sugar_g,
        added_sugars,
        fiber_g,
        sodium_mg,
        potassium_mg,
        satFat_g,
        transFat_g,
        monoFat_g,
        polyFat_g,
        cholesterol_mg,
        vitamin_d,
        vitamin_a,
        vitamin_c,
        calcium,
        iron,
    };
};

export const formatPortion = (qty, unit) => {
    const u = (unit || '').trim().toLowerCase();
    if (/^g(ram|rams)?$/.test(u)) return `${qty}g`;
    if (/^(mg|milligram|milligrams)$/.test(u)) return `${qty}mg`;
    if (/^(kg|kilogram|kilograms)$/.test(u)) return `${qty}kg`;
    return `${qty} ${unit?.trim?.() ?? ''}`;
};

/**
 * Summarize a description string and SCALE all numerics by `quantity`.
 * Examples when quantity = 0.5:
 *  - "100 g"      -> "50 g"
 *  - "20 kcal"    -> "10 kcal"
 *  - "Per 1/4 cup"-> "Per 1/8 cup"
 */
export const summarizeFood = (desc = '', brand = '', quantity = 1) => {
    const q = coercePortion(quantity);
    const text = String(desc);

    // Calories anywhere (prefer first seen)
    const kcalMatch = text.match(/(\d+(?:\.\d+)?)\s?(?:kcal|cal(?:ories)?)\b/i);
    const scaledCalories = kcalMatch ? `${toNumberString(parseFloat(kcalMatch[1]) * q)} kcal` : '';

    // "per serving" case → just show scaled calories + brand
    const perServing = /\bper\b\s*(?:\d+(?:\s*\/\s*\d+)?(?:\.\d+)?)?\s*serving\b/i.test(text);
    if (perServing) return [scaledCalories, brand].filter(Boolean).join(', ');

    // Prefer fraction units: "Per 1/4 cup"
    const perFraction = text.match(/\bper\b\s*(\d+\s*\/\s*\d+)\s*([a-zA-Z]+(?:\s+[a-zA-Z]+){0,2})/i);
    if (perFraction) {
        const [_, frac, unitRaw] = perFraction;
        const [num, den] = frac.replace(/\s*/g, '').split('/').map(Number);
        const baseQty = (num && den) ? (num / den) : 1;
        const scaledQty = baseQty * q;
        const fracOut = toSimpleFraction(scaledQty) || toNumberString(scaledQty);
        const unit = unitRaw.trim();
        if (unit.toLowerCase() !== 'serving') {
            return [scaledCalories, formatPortion(fracOut, unit), brand].filter(Boolean).join(', ');
        }
    }

    // Then decimals/integers: "Per 100 g", "Per 2 tbsp"
    const perUnit = text.match(/\bper\b\s*(\d+(?:\.\d+)?)\s*([a-zA-Z]+(?:\s+[a-zA-Z]+){0,2})/i);
    if (perUnit) {
        const qty = parseFloat(perUnit[1]);
        const unit = perUnit[2].trim();
        const scaledQty = qty * q;
        if (unit.toLowerCase() !== 'serving') {
            return [scaledCalories, formatPortion(toNumberString(scaledQty), unit), brand].filter(Boolean).join(', ');
        }
    }

    // Fallback grams anywhere → scale them
    const gramMatch = text.match(/(\d+(?:\.\d+)?)\s?g\b/i);
    const grams = gramMatch ? `${toNumberString(parseFloat(gramMatch[1]) * q)}g` : '';

    return [scaledCalories, grams, brand].filter(Boolean).join(', ');
};
