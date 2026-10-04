// Pure helpers of the PastWorkout screen: timestamp parsing and formatting, exercise catalogue and equipment lookups.

import { exercises as EXERCISE_LIBRARY } from "../../components/3_Workout/NewWorkout/SelectExercise/EXERCISES";

export const toMillis = (value) => {
    if (value === null || typeof value === "undefined") return null;
    if (typeof value === "number") {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : null;
    }
    if (typeof value === "string") {
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    if (typeof value === "object") {
        if (typeof value.toMillis === "function") {
            try {
                const ms = value.toMillis();
                return Number.isFinite(ms) ? ms : null;
            } catch {
                return null;
            }
        }
        if (typeof value.seconds === "number") {
            const ms = value.seconds * 1000 + (typeof value.nanoseconds === "number" ? value.nanoseconds / 1e6 : 0);
            return Number.isFinite(ms) ? ms : null;
        }
        if (typeof value._seconds === "number") {
            const ms = value._seconds * 1000 + (typeof value._nanoseconds === "number" ? value._nanoseconds / 1e6 : 0);
            return Number.isFinite(ms) ? ms : null;
        }
    }
    return null;
};

export const formatTimestamp = (value) => {
    const ms = toMillis(value);
    if (ms === null) return "";
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) return "";

    let datePart = "";
    let timePart = "";
    try {
        datePart = date.toLocaleDateString(undefined, {
            month: "long",
            day: "2-digit",
            year: "numeric",
        });
    } catch {
        datePart = "";
    }
    try {
        timePart = date.toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
        });
    } catch {
        timePart = "";
    }

    if (datePart && timePart) return `${datePart} at ${timePart}`;
    return datePart || timePart || "";
};

export const pickFirstString = (...values) => {
    for (const value of values) {
        if (typeof value !== "string") continue;
        const trimmed = value.trim();
        if (trimmed) return trimmed;
    }
    return "";
};

const EXERCISE_META_LOOKUP = (() => {
    const map = new Map();
    const register = (rawName, meta) => {
        const normalized = typeof rawName === "string" ? rawName.trim().toLowerCase() : "";
        if (!normalized || map.has(normalized)) return;
        map.set(normalized, meta);
    };
    (Array.isArray(EXERCISE_LIBRARY) ? EXERCISE_LIBRARY : []).forEach((exercise) => {
        if (!exercise) return;
        const name = typeof exercise.name === "string" ? exercise.name.trim() : "";
        if (!name) return;
        register(name, exercise);
        const simplified = name.replace(/\s*\(([^)]+)\)\s*/g, "").trim();
        if (simplified && simplified !== name) register(simplified, exercise);
    });
    return map;
})();

export const findExerciseMeta = (rawName) => {
    if (typeof rawName !== "string") return null;
    const normalized = rawName.trim().toLowerCase();
    if (!normalized) return null;
    const direct = EXERCISE_META_LOOKUP.get(normalized);
    if (direct) return direct;
    const simplified = normalized.replace(/\s*\(([^)]+)\)\s*/g, "").trim();
    if (simplified && simplified !== normalized) {
        return EXERCISE_META_LOOKUP.get(simplified) || null;
    }
    return null;
};

const extractEquipmentLabel = (value) => {
    if (value == null) return "";
    if (typeof value === "string") {
        return value.trim();
    }
    if (Array.isArray(value)) {
        const joined = value
            .map((item) => extractEquipmentLabel(item))
            .filter(Boolean)
            .join(", ");
        return joined.trim();
    }
    if (typeof value === "object") {
        const candidates = [
            value.label,
            value.name,
            value.title,
            value.type,
            value.category,
            value.value,
        ];
        for (const candidate of candidates) {
            if (candidate && candidate !== value) {
                const label = extractEquipmentLabel(candidate);
                if (label) return label;
            }
        }
        return "";
    }
    return String(value).trim();
};

export const resolveEquipmentLabel = (...candidates) => {
    for (const candidate of candidates) {
        const label = extractEquipmentLabel(candidate);
        if (label) return label;
    }
    return "";
};
