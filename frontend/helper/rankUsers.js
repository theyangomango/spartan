import { HEX_KEYS, getLeaderboardValue } from './getLeaderboardValue';

export default function rankUsers(users, exercise, metric = '1RM') {
    const list = Array.isArray(users) ? users.slice() : [];
    const exerciseKey = typeof exercise === 'string' ? exercise.trim() : '';
    const normalized = exerciseKey.toLowerCase();
    const isHexMode = HEX_KEYS.has(normalized);

    const enriched = list.map((user) => {
        const { value } = getLeaderboardValue(user, {
            mode: isHexMode ? 'hex' : 'exercise',
            key: isHexMode ? normalized : exerciseKey,
            metric,
        });
        return { user, value: Number.isFinite(value) ? value : 0 };
    });

    enriched.sort((a, b) => (b.value || 0) - (a.value || 0));
    return enriched.map(({ user }) => user);
}
