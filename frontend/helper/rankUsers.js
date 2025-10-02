const HEX_KEYS = new Set(['overall', 'chest', 'shoulders', 'abs', 'back', 'legs', 'arms']);

export default function rankUsers(users, exercise, metric = '1RM') {
    const list = Array.isArray(users) ? users.slice() : [];
    const exerciseKey = typeof exercise === 'string' ? exercise.trim() : '';
    const normalized = exerciseKey.toLowerCase();

    if (HEX_KEYS.has(normalized)) {
        list.sort((a, b) => {
            const aVal = Number(a?.statsHexagon?.[normalized] ?? 0);
            const bVal = Number(b?.statsHexagon?.[normalized] ?? 0);
            return (bVal || 0) - (aVal || 0);
        });
        return list;
    }

    const key = metric === '1RM' ? '1RM' : metric; // 'Volume' or 'Reps'
    list.sort((a, b) => {
        const aEx = (a?.statsExercises && a.statsExercises[exerciseKey]) || {};
        const bEx = (b?.statsExercises && b.statsExercises[exerciseKey]) || {};
        const aVal = Number(aEx?.[key] || 0);
        const bVal = Number(bEx?.[key] || 0);
        return bVal - aVal;
    });
    return list;
}
