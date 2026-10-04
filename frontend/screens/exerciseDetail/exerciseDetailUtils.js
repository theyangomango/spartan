// Helpers of the ExerciseDetail screen: saved-exercise map, how-to steps, number, weight and unit formatting.

const STEP_SOURCE_KEYS = ['howToSteps', 'instructions', 'steps', 'howTo'];

export const normalizeSavedExercises = (raw) => {
    if (!raw) return {};
    if (Array.isArray(raw)) {
        return raw.reduce((acc, entry) => {
            if (!entry) return acc;
            const name = String(entry?.name || entry).trim();
            if (!name) return acc;
            const muscleGroup = entry?.muscleGroup ?? entry?.muscle ?? null;
            acc[name] = {
                name,
                muscleGroup,
                muscle: entry?.muscle ?? entry?.muscleGroup ?? muscleGroup ?? null,
                slug: entry?.slug ?? null,
            };
            return acc;
        }, {});
    }
    if (typeof raw === 'object') {
        return Object.entries(raw).reduce((acc, [key, value]) => {
            if (!value && value !== 0) return acc;
            const name = String(value?.name || key).trim();
            if (!name) return acc;
            const muscleGroup = value?.muscleGroup ?? value?.muscle ?? null;
            acc[name] = {
                name,
                muscleGroup,
                muscle: value?.muscle ?? value?.muscleGroup ?? muscleGroup ?? null,
                slug: value?.slug ?? null,
            };
            return acc;
        }, {});
    }
    return {};
};

export const savedExercisesSignature = (map) => {
    if (!map || typeof map !== 'object') return '';
    const entries = Object.keys(map)
        .sort((a, b) => a.localeCompare(b))
        .map((key) => {
            const value = map[key] || {};
            return [
                key,
                value?.muscleGroup ?? null,
                value?.muscle ?? null,
                value?.slug ?? null,
            ];
        });
    return JSON.stringify(entries);
};

export const getInitialSavedExercises = () => {
    try {
        return normalizeSavedExercises(global?.userData?.savedExercises);
    } catch {
        return {};
    }
};

const normalizeHowToSteps = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
        return raw
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter(Boolean);
    }
    if (typeof raw === 'string') {
        return raw
            .split(/\r?\n+/)
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return [];
};

export const resolveProvidedHowToSteps = (exercise = {}) => {
    for (const key of STEP_SOURCE_KEYS) {
        const candidate = normalizeHowToSteps(exercise?.[key]);
        if (candidate.length) return candidate;
    }

    const howToObject = exercise?.howTo;
    if (howToObject && typeof howToObject === 'object') {
        const fromObject = normalizeHowToSteps(howToObject.steps || howToObject.items || howToObject.list || howToObject);
        if (fromObject.length) return fromObject;
    }

    return [];
};

export const buildFallbackHowToSteps = ({ title, muscleGroup, equipment }) => {
    const safeTitle = typeof title === 'string' && title.trim() ? title.trim() : 'this exercise';

    let sanitizedEquipment =
        typeof equipment === 'string' && equipment.trim() && equipment.trim() !== '—'
            ? equipment.trim()
            : null;
    if (sanitizedEquipment) {
        const lowered = sanitizedEquipment.toLowerCase();
        if (['body weight', 'bodyweight', 'none', 'no equipment'].includes(lowered)) {
            sanitizedEquipment = null;
        }
    }
    const sanitizedMuscle =
        typeof muscleGroup === 'string' && muscleGroup.trim() && muscleGroup.trim() !== '—'
            ? muscleGroup.trim().toLowerCase()
            : 'target muscles';

    return [
        sanitizedEquipment
            ? `Set up for ${safeTitle} and position your equipment (${sanitizedEquipment}).`
            : `Set up for ${safeTitle} by getting into a strong, stable starting position.`,
        `Keep your ${sanitizedMuscle} engaged and move through a controlled range of motion.`,
        `Breathe steadily, focus on smooth reps, and reset before starting the next set.`,
    ];
};

export const formatNumberCompact = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '0';
    const rounded = Math.round(num * 10) / 10;
    if (Math.abs(rounded - Math.round(rounded)) < 1e-6) return String(Math.round(rounded));
    return rounded.toFixed(1).replace(/\.0$/, '');
};

export const formatWeightValue = (weight) => {
    const num = Number(weight);
    if (!Number.isFinite(num) || num <= 0) return '—';
    return formatNumberCompact(num);
};

export const resolvePreferredWeightUnit = (payload) => {
    const source = payload || (() => {
        try {
            return global?.userData || null;
        } catch {
            return null;
        }
    })();
    try {
        const raw = source?.settings?.units ?? source?.units;
        if (!raw) return 'lb';
        const normalized = String(raw).trim().toLowerCase();
        return normalized === 'kg' ? 'kg' : 'lb';
    } catch {
        return 'lb';
    }
};

export const buildMetricDeltaDisplay = (delta, unitLabel, formatter = formatNumberCompact) => {
    const numericDelta = Number(delta);
    if (!Number.isFinite(numericDelta) || numericDelta === 0) return null;
    const absValue = Math.abs(numericDelta);
    const formattedValue = formatter(absValue);
    const sign = numericDelta > 0 ? '+' : '-';
    const icon = numericDelta > 0 ? 'arrow-up' : 'arrow-down';
    const color = numericDelta > 0 ? '#65F2B6' : '#FF6B6B';
    return {
        icon,
        color,
        text: `${sign}${formattedValue}`,
    };
};
