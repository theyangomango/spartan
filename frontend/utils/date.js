// utils/date.js
const pad2 = (n) => String(n).padStart(2, '0');
export const toDayKey = (d) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const toMillis = (value) => {
    if (value == null) return 0;
    if (typeof value === 'number') return value;
    if (value instanceof Date) return value.getTime();
    if (typeof value?.toMillis === 'function') {
        try { return value.toMillis(); } catch { /* ignore */ }
    }
    if (typeof value?.seconds === 'number') {
        return value.seconds * 1000;
    }
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
};

export const formatWorkoutTimestamp = (value) => {
    const millis = toMillis(value);
    if (!millis) return '';
    const date = new Date(millis);
    if (Number.isNaN(date.getTime())) return '';
    try {
        const datePart = date.toLocaleDateString(undefined, {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
        const timePart = date.toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
        });
        if (datePart && timePart) return `${datePart} at ${timePart}`;
        return datePart || timePart || '';
    } catch {
        return date.toISOString();
    }
};

export const toMillisSafe = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? 0 : value.getTime();
    if (typeof value?.toMillis === 'function') {
        const result = Number(value.toMillis());
        return Number.isFinite(result) ? result : 0;
    }
    if (typeof value?.toDate === 'function') {
        try {
            const dateResult = value.toDate();
            if (dateResult instanceof Date) {
                const ms = dateResult.getTime();
                if (Number.isFinite(ms)) return ms;
            }
        } catch {
            // ignore conversion issues
        }
    }
    if (typeof value === 'object' && typeof value.seconds === 'number') {
        const base = Number(value.seconds) * 1000;
        const fractional = Number.isFinite(Number(value.nanoseconds))
            ? Number(value.nanoseconds) / 1e6
            : 0;
        const total = base + fractional;
        return Number.isFinite(total) ? total : 0;
    }
    if (typeof value === 'object' && typeof value._seconds === 'number') {
        const base = Number(value._seconds) * 1000;
        const fractional = Number.isFinite(Number(value._nanoseconds))
            ? Number(value._nanoseconds) / 1e6
            : 0;
        const total = base + fractional;
        return Number.isFinite(total) ? total : 0;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return 0;
        const numeric = Number(trimmed);
        if (Number.isFinite(numeric)) return numeric;
        const parsed = new Date(trimmed).getTime();
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

export const formatClockTime = (seconds) => {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
};
