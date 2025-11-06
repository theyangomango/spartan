const KG_TO_LB = 2.2046226218488;

const roundToTenth = (value) => {
    if (!Number.isFinite(value)) return null;
    const rounded = Math.round(value * 10) / 10;
    return Object.is(rounded, -0) ? 0 : rounded;
};

const normalizeUnit = (unit) => {
    if (typeof unit !== "string") return "lb";
    const trimmed = unit.trim().toLowerCase();
    if (trimmed.startsWith("k")) return "kg";
    if (trimmed === "lb" || trimmed === "lbs" || trimmed.includes("pound")) return "lb";
    return "lb";
};

export const selectLatestWeightEntry = (entries) => {
    if (!Array.isArray(entries) || entries.length === 0) return null;
    let latest = null;
    entries.forEach((entry) => {
        if (!entry || typeof entry !== "object") return;
        const recordedAt = Number(entry.recordedAt ?? entry.createdAt ?? entry.created ?? entry.timestamp);
        if (!Number.isFinite(recordedAt)) return;
        if (!latest || recordedAt > latest.recordedAt) {
            latest = {
                ...entry,
                recordedAt,
            };
        }
    });
    return latest;
};

export const derivePublicWeightFields = (entries) => {
    const defaults = {
        publicWeight: null,
        publicWeightKg: null,
        publicWeightUnit: null,
        publicWeightRecordedAt: null,
    };

    const latest = selectLatestWeightEntry(entries);
    if (!latest) return defaults;

    const weight = Number(latest.weight);
    if (!Number.isFinite(weight) || weight <= 0) return defaults;

    const unit = normalizeUnit(latest.unit);
    const weightLb = unit === "kg" ? weight * KG_TO_LB : weight;
    const weightKg = unit === "kg" ? weight : weight / KG_TO_LB;

    return {
        publicWeight: roundToTenth(weightLb),
        publicWeightKg: roundToTenth(weightKg),
        publicWeightUnit: unit,
        publicWeightRecordedAt: Number.isFinite(latest.recordedAt) ? latest.recordedAt : null,
    };
};

export default {
    derivePublicWeightFields,
    selectLatestWeightEntry,
};
