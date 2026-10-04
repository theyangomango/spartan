// Workout display helpers shared by the feed post card and the PastWorkout screen.

export const MUSCLE_HIGHLIGHT = "#ff6f67";
export const MUSCLE_SEGMENTS = {
    shoulders: ["shoulders"],
    chest: ["chest"],
    arms: ["arms", "forearms"],
    back: ["back", "traps"],
    abs: ["abs", "obliques"],
    legs: ["quads", "calves"],
};

export const formatDuration = (durationMs) => {
    const ms = Number(durationMs);
    if (!Number.isFinite(ms) || ms <= 0) return "--";
    const totalMinutes = Math.max(0, Math.round(ms / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    if (totalSeconds >= 60) {
        const mins = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${mins}m ${seconds}s`;
    }
    return `${totalSeconds}s`;
};

export const formatNumber = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "--";
    try {
        return num.toLocaleString();
    } catch {
        return String(num);
    }
};

export const resolveWorkoutTitle = (workout, caption) => (
    workout?.templateName ||
    workout?.template?.name ||
    workout?.name ||
    caption ||
    "Workout"
);

export const resolveWeightUnit = () => {
    try {
        const raw = global?.userData?.settings?.units || global?.userData?.units;
        if (!raw) return "lb";
        const normalized = String(raw).toLowerCase();
        return normalized === "kg" ? "kg" : "lb";
    } catch {
        return "lb";
    }
};

export const initialsFrom = (name = "") => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};
