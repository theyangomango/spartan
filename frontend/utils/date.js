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
