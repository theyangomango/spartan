import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase.config';

const toMillisSafe = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (value instanceof Date) {
        const ms = value.getTime();
        return Number.isFinite(ms) ? ms : null;
    }
    if (typeof value === 'object') {
        if (typeof value.toMillis === 'function') {
            const ms = value.toMillis();
            return Number.isFinite(ms) ? ms : null;
        }
        const seconds = Number(value.seconds ?? value._seconds);
        if (Number.isFinite(seconds)) {
            const nanos = Number(value.nanoseconds ?? value._nanoseconds ?? value.nanos ?? 0);
            const extra = Number.isFinite(nanos) ? Math.floor(nanos / 1e6) : 0;
            return seconds * 1000 + extra;
        }
    }
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : null;
};

export const workoutIdentityKey = (workout) => {
    if (!workout || typeof workout !== 'object') return null;
    const wid =
        workout?.wid ??
        workout?.id ??
        workout?.workoutId ??
        workout?.sessionId ??
        workout?.workoutUid ??
        null;
    if (wid !== null && wid !== undefined) return `wid:${String(wid)}`;

    const createdMs =
        toMillisSafe(workout?.completedAt) ??
        toMillisSafe(workout?.finishedAt) ??
        toMillisSafe(workout?.created) ??
        null;

    if (createdMs !== null) {
        const owner =
            workout?.creatorUID ??
            workout?.creatorUid ??
            workout?.uid ??
            workout?.ownerUid ??
            '';
        const name = typeof workout?.name === 'string' ? workout.name.toLowerCase() : '';
        return `time:${createdMs}:${owner}:${name}`;
    }

    try {
        return `json:${JSON.stringify(workout)}`;
    } catch {
        return null;
    }
};

export async function linkCompletedWorkoutToPost(uid, workout, pid) {
    if (!uid || !pid || !workout) return;
    const key = workoutIdentityKey(workout);
    if (!key) return;

    const userRef = doc(db, 'usersPrivate', uid);
    await runTransaction(db, async (txn) => {
        const snap = await txn.get(userRef);
        if (!snap.exists()) return;
        const data = snap.data() || {};
        const list = Array.isArray(data.completedWorkouts) ? data.completedWorkouts : [];
        let changed = false;
        const linkedAt = Date.now();
        const updated = list.map((entry) => {
            const entryKey = workoutIdentityKey(entry);
            if (!entryKey) return entry;
            if (entryKey !== key) return entry;
            if (entry?.postPid === pid) return entry;
            changed = true;
            const updatedEntry = {
                ...entry,
                postPid: pid,
                postPidLinkedAt: linkedAt,
            };
            if (updatedEntry.pid !== pid) {
                updatedEntry.pid = pid;
            }
            return updatedEntry;
        });
        if (!changed) return;
        txn.update(userRef, { completedWorkouts: updated });
    });
}

export function syncLocalCompletedWorkoutsPost(workout, pid) {
    if (!workout || !pid) return;
    const key = workoutIdentityKey(workout);
    if (!key) return;
    try {
        if (!global?.userData) return;
        const list = Array.isArray(global.userData.completedWorkouts)
            ? global.userData.completedWorkouts
            : [];
        let changed = false;
        const linkedAt = Date.now();
        const updated = list.map((entry) => {
            const entryKey = workoutIdentityKey(entry);
            if (!entryKey) return entry;
            if (entryKey !== key) return entry;
            if (entry?.postPid === pid) return entry;
            changed = true;
            const updatedEntry = {
                ...entry,
                postPid: pid,
                postPidLinkedAt: linkedAt,
            };
            if (updatedEntry.pid !== pid) {
                updatedEntry.pid = pid;
            }
            return updatedEntry;
        });
        if (changed) {
            global.userData.completedWorkouts = updated;
        }
    } catch { }
}

export default {
    workoutIdentityKey,
    linkCompletedWorkoutToPost,
    syncLocalCompletedWorkoutsPost,
};
