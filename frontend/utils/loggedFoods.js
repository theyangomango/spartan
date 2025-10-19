import { toDayKey, toMillis } from "./date";
import { parseMacrosFromDescription } from "./nutrition";

const safeNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};

export const countLoggedFoods = (source) => {
    if (!source || typeof source !== "object") return 0;
    try {
        const entries = Object.values(source);
        if (!entries.length) return 0;
        const looksNested = entries.some((entry) => entry && typeof entry === "object" && !("dayKey" in entry));
        if (!looksNested) return Object.keys(source).length;
        return entries.reduce((acc, day) => {
            if (!day || typeof day !== "object") return acc;
            return acc + Object.keys(day).length;
        }, 0);
    } catch {
        return 0;
    }
};

const normalizeDayKey = (explicitDayKey, fallbackTimestamp) => {
    if (explicitDayKey) return String(explicitDayKey);
    const millis = toMillis(fallbackTimestamp);
    if (!millis) return "";
    const date = new Date(millis);
    if (Number.isNaN(date.getTime())) return "";
    return toDayKey(date);
};

const ensureMacros = (entry) => {
    if (entry?.macros && typeof entry.macros === "object") {
        const m = entry.macros;
        return {
            calories: safeNumber(m.calories),
            protein: safeNumber(m.protein),
            carbs: safeNumber(m.carbs),
            fat: safeNumber(m.fat),
        };
    }
    const qty = safeNumber(entry?.quantity ?? entry?.qty, 1) || 1;
    const parsed = parseMacrosFromDescription(entry?.desc || "", qty);
    return {
        calories: safeNumber(parsed?.calories),
        protein: safeNumber(parsed?.protein),
        carbs: safeNumber(parsed?.carbs),
        fat: safeNumber(parsed?.fat),
    };
};

const deriveTimestamp = (entry) => {
    const millis = toMillis(
        entry?.updatedAt ??
        entry?.createdAt ??
        entry?.timestamp ??
        entry?.loggedAt ??
        entry?.created ??
        entry?.date ??
        0
    );
    if (millis) return millis;
    const fallback = entry?.dayKey ? new Date(`${entry.dayKey}T00:00:00Z`).getTime() : 0;
    return Number.isFinite(fallback) ? fallback : 0;
};

export const flattenLoggedFoods = (source) => {
    const rows = [];
    if (!source || typeof source !== "object") return rows;
    try {
        const pairs = Object.entries(source);
        if (!pairs.length) return rows;
        const looksNested = pairs.some(([, value]) => value && typeof value === "object" && !("dayKey" in value));
        if (looksNested) {
            pairs.forEach(([dayKey, dayEntries]) => {
                if (!dayEntries || typeof dayEntries !== "object") return;
                Object.entries(dayEntries).forEach(([entryKey, entry]) => {
                    if (!entry || typeof entry !== "object") return;
                    const normalizedDay = normalizeDayKey(entry?.dayKey || dayKey, entry?.createdAt || entry?.updatedAt);
                    if (!normalizedDay) return;
                    const quantity = safeNumber(entry?.quantity ?? entry?.qty, 1) || 1;
                    const macros = ensureMacros(entry);
                    rows.push({
                        key: String(entryKey),
                        dayKey: normalizedDay,
                        meal: entry?.meal || "Snacks",
                        name: entry?.name || "Food",
                        brand: entry?.brand || "",
                        desc: entry?.desc || "",
                        quantity,
                        macros,
                        extrasPerServing: entry?.extrasPerServing || null,
                        timestamp: deriveTimestamp(entry),
                        raw: entry,
                    });
                });
            });
        } else {
            pairs.forEach(([entryKey, entry]) => {
                if (!entry || typeof entry !== "object") return;
                const normalizedDay = normalizeDayKey(entry?.dayKey, entry?.createdAt || entry?.updatedAt);
                if (!normalizedDay) return;
                const quantity = safeNumber(entry?.quantity ?? entry?.qty, 1) || 1;
                const macros = ensureMacros(entry);
                rows.push({
                    key: String(entryKey),
                    dayKey: normalizedDay,
                    meal: entry?.meal || "Snacks",
                    name: entry?.name || "Food",
                    brand: entry?.brand || "",
                    desc: entry?.desc || "",
                    quantity,
                    macros,
                    extrasPerServing: entry?.extrasPerServing || null,
                    timestamp: deriveTimestamp(entry),
                    raw: entry,
                });
            });
        }
    } catch {
        // no-op
    }
    return rows;
};

export const groupLoggedFoodsByDay = (source) => {
    const rows = flattenLoggedFoods(source);
    if (!rows.length) return [];
    const byDay = new Map();
    rows.forEach((row) => {
        const current = byDay.get(row.dayKey) || [];
        current.push(row);
        byDay.set(row.dayKey, current);
    });
    return Array.from(byDay.entries())
        .map(([dayKey, items]) => ({
            dayKey,
            items: items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)),
        }))
        .sort((a, b) => {
            const left = new Date(`${a.dayKey}T00:00:00Z`).getTime();
            const right = new Date(`${b.dayKey}T00:00:00Z`).getTime();
            return (right || 0) - (left || 0);
        });
};

