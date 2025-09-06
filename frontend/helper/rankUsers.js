export default function rankUsers(users, exercise, metric = '1RM') {
    const key = metric === '1RM' ? '1RM' : metric; // 'Volume' or 'Reps'
    const list = Array.isArray(users) ? users.slice() : [];
    list.sort((a, b) => {
        const aEx = (a?.statsExercises && a.statsExercises[exercise]) || {};
        const bEx = (b?.statsExercises && b.statsExercises[exercise]) || {};
        const aVal = Number(aEx?.[key] || 0);
        const bVal = Number(bEx?.[key] || 0);
        return bVal - aVal;
    });
    return list;
}
