// Pure set helpers shared by the workout editors: id generation and previous-set normalisation. Keep free of imports.

export const genId = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const normalizePrevKeepZero = (prev) => {
    if (!prev || typeof prev !== "object") return null;
    return {
        weight: Number(prev?.weight) || 0,
        reps: Number(prev?.reps) || 0,
    };
};

export const normalizePrevOrNull = (value) => {
    if (!value || typeof value !== "object") return null;
    const weight = Number(value?.weight) || 0;
    const reps = Number(value?.reps) || 0;
    if (!weight && !reps) return null;
    return { weight, reps };
};
