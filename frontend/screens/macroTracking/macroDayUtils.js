// Pure date, workout-calorie and form helpers for the MacroTracking screen.
import { toDayKey, toMillis } from '../../utils/date';

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (value) => {
    const date = value instanceof Date ? new Date(value) : new Date(value ?? Date.now());
    if (Number.isNaN(date.getTime())) {
        const fallback = new Date();
        fallback.setHours(0, 0, 0, 0);
        return fallback;
    }
    date.setHours(0, 0, 0, 0);
    return date;
};

export const clampDateToToday = (value) => {
    const candidate = startOfDay(value);
    const today = startOfDay(new Date());
    return candidate.getTime() > today.getTime() ? today : candidate;
};

export const clampForwardDelta = (delta, baseDate) => {
    if (delta <= 0) return delta;
    const today = startOfDay(new Date());
    const start = startOfDay(baseDate);
    const diffDays = Math.floor((today.getTime() - start.getTime()) / DAY_MS);
    const maxForward = Math.max(0, diffDays);
    return Math.min(delta, maxForward);
};

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const toDayKeyString = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return null;
        if (DAY_KEY_PATTERN.test(trimmed)) return trimmed;
        const parsed = new Date(trimmed);
        if (!Number.isNaN(parsed.getTime())) {
            parsed.setHours(0, 0, 0, 0);
            return toDayKey(parsed);
        }
        return null;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            parsed.setHours(0, 0, 0, 0);
            return toDayKey(parsed);
        }
        return null;
    }
    if (value instanceof Date) {
        const copy = new Date(value);
        if (!Number.isNaN(copy.getTime())) {
            copy.setHours(0, 0, 0, 0);
            return toDayKey(copy);
        }
    }
    return null;
};

const resolveWorkoutTimestamp = (workout) => {
    if (!workout || typeof workout !== 'object') return 0;
    const candidates = [
        workout?.completedAt,
        workout?.finishedAt,
        workout?.endedAt,
        workout?.timestamp,
        workout?.updatedAt,
        workout?.createdAt,
        workout?.created,
        workout?.startedAt,
    ];
    for (const candidate of candidates) {
        const millis = toMillis(candidate);
        if (millis) return millis;
    }
    return toMillis(workout?.date) || 0;
};

const resolveWorkoutDayKey = (workout) => {
    const direct = toDayKeyString(workout?.dayKey ?? workout?.date ?? workout?.day);
    if (direct) return direct;
    const millis = resolveWorkoutTimestamp(workout);
    if (!millis) return null;
    const d = new Date(millis);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return toDayKey(d);
};

const parseCaloriesValue = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return 0;
        const numeric = Number(trimmed);
        if (Number.isFinite(numeric)) return numeric;
        const cleaned = Number(trimmed.replace(/[^0-9.\-]/g, ''));
        return Number.isFinite(cleaned) ? cleaned : 0;
    }
    if (typeof value === 'object') {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) return numeric;
    }
    return 0;
};

const getCompletedWorkoutsArray = () => {
    try {
        if (Array.isArray(global?.userData?.completedWorkouts)) {
            return global.userData.completedWorkouts;
        }
    } catch { }
    return [];
};

export const sumWorkoutCaloriesForDay = (dateObj) => {
    const day = startOfDay(dateObj || new Date());
    const dk = toDayKey(day);
    const workouts = getCompletedWorkoutsArray();
    if (!workouts.length) return 0;
    let total = 0;
    workouts.forEach((workout) => {
        const workoutDay = resolveWorkoutDayKey(workout);
        if (!workoutDay || workoutDay !== dk) return;
        const calories = parseCaloriesValue(
            workout?.calories ??
            workout?.caloriesBurned ??
            workout?.calories_burned
        );
        if (calories > 0) total += calories;
    });
    return Math.round(Math.max(0, total));
};

export const computeCompletedWorkoutsSignature = (src) => {
    const list = Array.isArray(src) ? src : getCompletedWorkoutsArray();
    if (!list.length) return 'len:0';
    const parts = [`len:${list.length}`];
    const tail = list.slice(-10);
    tail.forEach((workout, idx) => {
        const ts = resolveWorkoutTimestamp(workout) || idx;
        const cal = Math.round(parseCaloriesValue(workout?.calories ?? workout?.caloriesBurned));
        const id = workout?.wid ?? workout?.id ?? workout?.pid ?? idx;
        parts.push(`${id}:${ts}:${cal}`);
    });
    return parts.join('|');
};

export const scaleGoalsWithBurn = (baseGoals, caloriesBurned) => {
    const safeGoals = baseGoals || {};
    const baseCalories = Math.max(1, Number(safeGoals.calories) || 0);
    const bonus = Math.max(0, Number(caloriesBurned) || 0);
    if (bonus <= 0) return safeGoals;
    const nextCalories = Math.round(baseCalories + bonus);
    const multiplier = nextCalories / baseCalories;
    return {
        calories: nextCalories,
        protein: Math.round((Number(safeGoals.protein) || 0) * multiplier),
        carbs: Math.round((Number(safeGoals.carbs) || 0) * multiplier),
        fat: Math.round((Number(safeGoals.fat) || 0) * multiplier),
    };
};

// Allow focusing a specific date via navigation params
export const parseFocusParam = (param) => {
    if (!param) return null;
    try {
        let d = null;
        if (typeof param === 'number') {
            d = new Date(param);
        } else if (typeof param === 'string') {
            if (/^\d{4}-\d{2}-\d{2}$/.test(param)) {
                const [y, m, dd] = param.split('-').map((n) => parseInt(n, 10));
                d = new Date(y, (m || 1) - 1, dd || 1);
            } else {
                const tmp = new Date(param);
                if (!Number.isNaN(tmp.getTime())) d = tmp;
            }
        } else if (param instanceof Date) {
            d = new Date(param);
        }
        if (!d || Number.isNaN(d.getTime())) return null;
        d.setHours(0, 0, 0, 0);
        return clampDateToToday(d);
    } catch { return null; }
};

export const formatDate = (date) =>
    date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

export const clampInt = (s, min, max) => {
    const n = parseInt(s || '0', 10);
    if (Number.isNaN(n)) return min;
    return Math.max(min, Math.min(max, n));
};
