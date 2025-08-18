// utils/nutrition.js
export const parseMacrosFromDescription = (desc = '') => {
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

    return {
        calories: Number.isFinite(cal) ? cal : 0,
        protein: Number.isFinite(prot) ? prot : 0,
        carbs: Number.isFinite(carbs) ? carbs : 0,
        fat: Number.isFinite(fat) ? fat : 0,
    };
};

export const formatPortion = (qty, unit) => {
    const u = (unit || '').trim().toLowerCase();
    if (/^g(ram|rams)?$/.test(u)) return `${qty}g`;
    if (/^(mg|milligram|milligrams)$/.test(u)) return `${qty}mg`;
    if (/^(kg|kilogram|kilograms)$/.test(u)) return `${qty}kg`;
    return `${qty} ${unit?.trim?.() ?? ''}`;
};

export const summarizeFood = (desc = '', brand = '') => {
    const kcalMatch = desc.match(/(\d+)\s?(?:kcal|cal(?:ories)?)\b/i);
    const calories = kcalMatch ? `${kcalMatch[1]} kcal` : '';

    const perServing = /\bper\b\s*(?:\d+(?:\s*\/\s*\d+)?(?:\.\d+)?)?\s*serving\b/i.test(desc);
    if (perServing) return [calories, brand].filter(Boolean).join(', ');

    const perFraction = desc.match(/\bper\b\s*(\d+\s*\/\s*\d+)\s*([a-zA-Z]+(?:\s+[a-zA-Z]+){0,2})/i);
    if (perFraction) {
        const qty = perFraction[1].replace(/\s*/g, '');
        const unit = perFraction[2].trim();
        if (unit.toLowerCase() !== 'serving') {
            return [calories, formatPortion(qty, unit), brand].filter(Boolean).join(', ');
        }
    }

    const perUnit = desc.match(/\bper\b\s*(\d+(?:\.\d+)?)\s*([a-zA-Z]+(?:\s+[a-zA-Z]+){0,2})/i);
    if (perUnit) {
        const qty = perUnit[1];
        const unit = perUnit[2].trim();
        if (unit.toLowerCase() !== 'serving') {
            return [calories, formatPortion(qty, unit), brand].filter(Boolean).join(', ');
        }
    }

    const gramMatch = desc.match(/(\d+)\s?g\b/i);
    const grams = gramMatch ? `${gramMatch[1]}g` : '';

    return [calories, grams, brand].filter(Boolean).join(', ');
};
