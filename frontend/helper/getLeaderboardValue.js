const HEX_KEYS = new Set(['overall', 'chest', 'shoulders', 'abs', 'back', 'legs', 'arms']);

function safeBodyweight(user) {
    return (
        Number(user?.personalInfo?.weight ?? 0) ||
        Number(user?.bodyweight ?? 0) ||
        Number(user?.bodyWeight ?? 0) ||
        Number(user?.weight ?? 0) ||
        Number(user?.stats?.bodyweight ?? 0) ||
        Number(user?.stats?.weight ?? 0) ||
        0
    );
}

export function getLeaderboardValue(user, options = {}) {
    const {
        mode = 'exercise',
        key = '',
        metric = '1RM',
        normalizeByBodyweight = false,
    } = options;

    const targetKey = typeof key === 'string' ? key.trim() : '';
    const metricKey = metric === '1RM' ? '1RM' : metric;

    if (mode === 'hex') {
        const normalizedHex = targetKey.toLowerCase();
        const raw = Number(user?.statsHexagon?.[normalizedHex] ?? 0);
        const value = Number.isFinite(raw) ? raw : 0;
        return { value, missingWeightData: false };
    }

    const exerciseStats = (user?.statsExercises && user.statsExercises[targetKey]) || {};
    let rawValue = Number(exerciseStats?.[metricKey] ?? 0);
    let missingWeightData = false;

    if (normalizeByBodyweight) {
        const weight = safeBodyweight(user);
        if (weight > 0) {
            rawValue = rawValue / weight;
        } else {
            missingWeightData = true;
        }
    }

    const value = Number.isFinite(rawValue) ? rawValue : 0;
    return { value, missingWeightData };
}

export { HEX_KEYS };
