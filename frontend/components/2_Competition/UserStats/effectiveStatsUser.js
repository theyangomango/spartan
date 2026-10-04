import { coercePrivacyMode } from "../../../utils/workoutPrivacy";

const toDayKey = (d) => {
    try {
        const x = new Date(typeof d === 'number' || typeof d === 'string' ? d : (d?.toMillis?.() ? d.toMillis() : Date.now()));
        x.setHours(0, 0, 0, 0);
        return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    } catch { return ''; }
};

/**
 * The user record the stats views should render. For the signed-in user, the latest completed
 * workout's sets and the freshest hexagon are folded in (in memory only), since the stored
 * stats can lag behind a workout that just finished. Other users are returned unchanged.
 */
export default function buildEffectiveStatsUser(user) {
    const u = user || global?.userData;
    const me = global?.userData;
    if (!u || !me) return u;
    if (String(u?.uid || '') !== String(me?.uid || '')) return u; // viewing someone else

    // Merge latest completed workout sets into statsExercises (in-memory only)
    const stats = { ...(u?.statsExercises || {}) };
    try {
        const cws = Array.isArray(me?.completedWorkouts) ? me.completedWorkouts : [];
        if (cws.length) {
            const cw = cws[cws.length - 1];
            const wid = String(cw?.wid || cw?.id || '');
            const dk = toDayKey(cw?.created || cw?.createdAt || Date.now());
            const exs = Array.isArray(cw?.exercises) ? cw.exercises : [];
            for (const ex of exs) {
                const name = String(ex?.name || '').trim(); if (!name) continue;
                const sets = Array.isArray(ex?.sets) ? ex.sets : [];
                if (!sets.length) continue;
                const entry = { ...(stats[name] || {}) };
                const list = Array.isArray(entry.sets) ? entry.sets.slice() : [];
                const lastWid = list.length ? list[list.length - 1]?.wid : null;
                if (lastWid !== wid) {
                    const setPrivacy = coercePrivacyMode(cw?.privacyMode);
                    for (const s of sets) {
                        const r = Number(s?.reps) || 0; const w = Number(s?.weight) || 0;
                        if (r > 0 && w > 0) list.push({ weight: w, reps: r, date: dk, wid, privacyMode: setPrivacy });
                    }
                    entry.sets = list;
                    stats[name] = entry;
                }
            }
        }
    } catch { }
    const latestHex = me?.statsHexagon || u?.statsHexagon || null;
    return { ...u, statsExercises: stats, ...(latestHex ? { statsHexagon: latestHex } : {}) };
}
