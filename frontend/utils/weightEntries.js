
const KG_TO_LB = 2.2046226218488;
// Upper bound for a body-weight entry, in either unit; catches typos such as an extra digit.
export const MAX_BODY_WEIGHT = 1500;

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

const selectLatestWeightEntry = (entries) => {
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

export const sanitizeEntries = (rawEntries) => {
    if (!Array.isArray(rawEntries)) return [];
    return rawEntries
        .map((entry) => {
            if (!entry) return null;
            const weight = Number(entry.weight);
            const recordedAt = Number(entry.recordedAt || entry.timestamp || entry.loggedAt);
            if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(recordedAt)) return null;
            const unit = (entry.unit || "").toString().toLowerCase().startsWith("k") ? "kg" : "lb";
            return {
                // Entries stored without an id get one derived from their content, so it is the same on every call
                // (a random id here made such entries impossible to edit or delete).
                id: entry.id || entry.key || `legacy-${recordedAt}-${weight}`,
                weight,
                unit,
                recordedAt,
                createdAt: Number(entry.createdAt || recordedAt || Date.now()),
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.recordedAt - b.recordedAt);
};

const normalizeEntryCollection = (source) => {
    if (!source) return [];
    if (Array.isArray(source)) return source;
    if (typeof source === "object") {
        return Object.values(source).filter(Boolean);
    }
    return [];
};

export const selectWeightEntrySource = (user) => {
    if (!user || typeof user !== "object") return [];
    const candidates = [
        user?.progress?.weightEntries,
        user?.weightEntries,
        user?.bodyweightEntries,
        user?.bodyweightLog,
        user?.progress?.bodyweightEntries,
    ];

    let firstObserved = null;
    for (const candidate of candidates) {
        const normalized = normalizeEntryCollection(candidate);
        if (!firstObserved && normalized.length >= 0) firstObserved = normalized;
        if (normalized.length > 0) return normalized;
    }
    return firstObserved || [];
};
