// Pure number helpers of MacroGoalsSheet: macro-to-calorie maths, input sanitising and display rounding.

const parseMacroNumber = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) return 0;
    return numeric;
};

export const getMacroCalories = (protein, carbs, fat) => {
    const proteinCalories = Math.round(parseMacroNumber(protein) * 4);
    const carbCalories = Math.round(parseMacroNumber(carbs) * 4);
    const fatCalories = Math.round(parseMacroNumber(fat) * 9);
    return {
        protein: proteinCalories,
        carbs: carbCalories,
        fat: fatCalories,
        total: proteinCalories + carbCalories + fatCalories,
    };
};

export const sanitizeDecimalInput = (s) => {
    if (!s) return '';
    const filtered = s.replace(/[^0-9.]/g, '');
    if (!filtered) return '';
    const firstDot = filtered.indexOf('.');
    if (firstDot === -1) {
        return filtered.replace(/^0+(\d)/, '$1');
    }
    const beforeDot = filtered.slice(0, firstDot).replace(/^0+(\d)/, '$1');
    const afterDot = filtered.slice(firstDot + 1).replace(/\./g, '');
    return `${beforeDot || '0'}.${afterDot}`;
};

export const roundDisplayMacro = (value) => {
    if (value == null) return '';
    if (typeof value === 'string' && value.trim() === '') return '';
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '';
    return String(Math.max(0, Math.round(numeric)));
};

export const caloriesFromMacros = (protein, carbs, fat) => {
    return String(getMacroCalories(protein, carbs, fat).total);
};
