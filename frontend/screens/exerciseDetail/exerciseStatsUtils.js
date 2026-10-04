// Turns the user's exercise stats and completed workouts into the ExerciseDetail history sessions and chart entries.
import calculate1RM from '../../helper/calculate1RM';
import { toMillisSafe } from '../../utils/date';
import { resolveWorkoutTimestamp, sanitizeCompletedWorkouts } from '../../utils/completedWorkouts';
import { formatWeightValue } from './exerciseDetailUtils';

const HISTORY_SESSION_LIMIT = 15;

const parseDayKeyToDate = (dayKey) => {
    if (typeof dayKey !== 'string') return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey.trim());
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    const candidate = new Date(year, month, day);
    return Number.isNaN(candidate.getTime()) ? null : candidate;
};

const firstAvailableString = (...values) => {
    for (const value of values) {
        if (value === null || value === undefined) continue;
        if (typeof value === 'string' || typeof value === 'number') {
            const str = String(value).trim();
            if (str) return str;
        }
    }
    return '';
};

const deriveSessionTitle = (workout, timestamp) => {
    const candidate = firstAvailableString(
        workout?.templateName,
        workout?.template?.name,
        workout?.name,
        workout?.title,
        workout?.caption
    );
    if (candidate) return candidate;

    const date = timestamp ? new Date(timestamp) : null;
    if (date && !Number.isNaN(date.getTime())) {
        const hours = date.getHours();
        if (hours < 12) return 'Morning session';
        if (hours < 17) return 'Afternoon session';
        return 'Evening session';
    }
    return 'Workout session';
};

const buildSessionMeta = (timestamp, dayKey) => {
    let dateObj = null;
    if (timestamp) {
        const candidate = new Date(timestamp);
        if (!Number.isNaN(candidate.getTime())) dateObj = candidate;
    }
    if (!dateObj) {
        const parsed = parseDayKeyToDate(dayKey);
        if (parsed) dateObj = parsed;
    }
    if (!dateObj) return '';

    let datePart = '';
    let timePart = '';
    try {
        datePart = dateObj.toLocaleDateString(undefined, {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        datePart = '';
    }
    if (timestamp) {
        try {
            timePart = dateObj.toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
            });
        } catch {
            timePart = '';
        }
    }
    if (datePart && timePart) return `${datePart} at ${timePart}`;
    return datePart || timePart || '';
};

const setKeyForStatSet = (set) => {
    if (!set || typeof set !== 'object') return '';
    const weight = Number(set.weight);
    const reps = Number(set.reps);
    if (!Number.isFinite(weight) || !Number.isFinite(reps)) return '';
    return `${Math.round(weight * 1000)}:${Math.round(reps * 1000)}`;
};

const normalizeStatSet = (rawSet) => {
    if (!rawSet || typeof rawSet !== 'object') return null;
    const weight = Number(rawSet.weight ?? rawSet.kg ?? rawSet.lbs ?? rawSet.load ?? 0);
    const reps = Number(rawSet.reps ?? rawSet.rep ?? rawSet.r ?? 0);
    if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(reps) || reps <= 0) return null;
    const normalized = { weight, reps };

    if (typeof rawSet.date === 'string' && rawSet.date.trim()) normalized.date = rawSet.date.trim();

    if (rawSet.wid !== null && rawSet.wid !== undefined) {
        try {
            const widStr = String(rawSet.wid).trim();
            if (widStr) normalized.wid = widStr;
        } catch {
            // ignore
        }
    }

    const ts = toMillisSafe(rawSet.timestamp ?? rawSet.ts ?? null);
    if (ts) normalized.timestamp = ts;

    if (typeof rawSet.privacyMode === 'string' && rawSet.privacyMode.trim()) {
        normalized.privacyMode = rawSet.privacyMode.trim();
    }

    return normalized;
};

export const normalizeStatsExercises = (raw) => {
    if (!raw || typeof raw !== 'object') return {};
    return Object.entries(raw).reduce((acc, [key, value]) => {
        if (!value || typeof value !== 'object') return acc;
        const sets = Array.isArray(value.sets) ? value.sets.map(normalizeStatSet).filter(Boolean) : [];
        acc[key] = { ...value, sets };
        return acc;
    }, {});
};

export const extractWid = (workout) => {
    if (!workout || typeof workout !== 'object') return '';
    const candidates = [workout?.wid, workout?.id, workout?.workoutId, workout?.pid];
    for (const candidate of candidates) {
        if (candidate === null || candidate === undefined) continue;
        const str = String(candidate).trim();
        if (str) return str;
    }
    return '';
};

const resolveSetTimestamp = (set, workoutsByWid) => {
    if (!set || typeof set !== 'object') return 0;
    const wid = set?.wid ? String(set.wid).trim() : '';
    if (wid && workoutsByWid && workoutsByWid.has(wid)) {
        const workout = workoutsByWid.get(wid);
        const workoutTs = resolveWorkoutTimestamp(workout);
        if (workoutTs) return workoutTs;
    }
    return 0;
};

export const statsExercisesSignature = (map) => {
    if (!map || typeof map !== 'object') return '';
    const entries = Object.keys(map)
        .sort((a, b) => a.localeCompare(b))
        .map((key) => {
            const entry = map[key] || {};
            const sets = Array.isArray(entry.sets) ? entry.sets : [];
            const last = sets[sets.length - 1] || {};
            return [
                key,
                Number(entry?.['1RM'] || 0) || 0,
                sets.length,
                Number(last?.weight || 0) || 0,
                Number(last?.reps || 0) || 0,
                last?.date || null,
                last?.wid || null,
            ];
        });
    return JSON.stringify(entries);
};

export const completedWorkoutsSignature = (list) => {
    if (!Array.isArray(list)) return '';
    const sample = list.slice(0, 40).map((workout) => {
        const wid = extractWid(workout);
        const ts = resolveWorkoutTimestamp(workout);
        return [wid, ts];
    });
    return JSON.stringify(sample);
};

export const getInitialStatsExercises = () => {
    try {
        return normalizeStatsExercises(global?.userData?.statsExercises);
    } catch {
        return {};
    }
};

export const getInitialCompletedWorkouts = () => {
    try {
        return sanitizeCompletedWorkouts(global?.userData?.completedWorkouts);
    } catch {
        return [];
    }
};

export const findStatsEntry = (statsMap, exerciseName) => {
    if (!statsMap || typeof statsMap !== 'object') return null;
    if (!exerciseName) return null;
    if (statsMap[exerciseName]) return statsMap[exerciseName];
    const lower = exerciseName.toLowerCase();
    const match = Object.keys(statsMap).find((key) => key.toLowerCase() === lower);
    return match ? statsMap[match] : null;
};

export const buildHistorySessions = (exerciseStatsEntry, completedWorkouts, weightUnit) => {
    const entry = exerciseStatsEntry;
    const sets = Array.isArray(entry?.sets) ? entry.sets : [];
    if (!sets.length) return [];

    const workoutsArray = Array.isArray(completedWorkouts) ? completedWorkouts : [];
    const workoutsByWid = new Map();
    workoutsArray.forEach((workout) => {
        const wid = extractWid(workout);
        if (wid) workoutsByWid.set(wid, workout);
    });

    const grouped = new Map();
    sets.forEach((set) => {
        const wid = set?.wid ? String(set.wid) : '';
        const dayKey = typeof set?.date === 'string' && set.date ? set.date : null;
        const groupKey = wid ? `wid:${wid}` : `day:${dayKey || 'unknown'}`;
        let session = grouped.get(groupKey);
        if (!session) {
            const workout = wid ? workoutsByWid.get(wid) : null;
            session = {
                key: groupKey,
                dayKey,
                workout,
                sets: [],
                timestamps: [],
            };
            grouped.set(groupKey, session);
        }
        const timestamp = toMillisSafe(set?.timestamp);
        if (timestamp) session.timestamps.push(timestamp);
        session.sets.push({
            weight: Number(set.weight) || 0,
            reps: Number(set.reps) || 0,
            raw: set,
        });
    });

    let bestSetKey = '';
    if (entry?.bestSet) {
        bestSetKey = setKeyForStatSet(entry.bestSet);
    }
    const recordedBest1RM = Number(entry?.['1RM']) || 0;
    let bestOneRm = recordedBest1RM > 0 ? recordedBest1RM : 0;
    if ((!bestOneRm || bestOneRm <= 0) && entry?.bestSet) {
        const computed = calculate1RM(
            Number(entry.bestSet.weight) || 0,
            Number(entry.bestSet.reps) || 0
        );
        bestOneRm = Number.isFinite(computed) ? computed : 0;
    }

    const unitNormalized = typeof weightUnit === 'string' ? weightUnit.trim().toLowerCase() : '';
    const highlightUnit = unitNormalized === 'kg' ? 'kg' : unitNormalized === 'lb' ? 'lb' : '';
    const highlightValue = bestOneRm > 0 ? formatWeightValue(bestOneRm) : '';
    const highlightLabel =
        bestSetKey && highlightValue && highlightValue !== '—'
            ? `1RM (${highlightValue}${highlightUnit})`
            : '';

    let sessions = Array.from(grouped.values()).map((session) => {
        const workoutTs = resolveWorkoutTimestamp(session.workout);
        const setTs = session.timestamps.length ? Math.max(...session.timestamps) : 0;
        const dayDate = parseDayKeyToDate(session.dayKey);
        const fallbackTs = dayDate ? dayDate.getTime() : 0;
        const timestamp = workoutTs || setTs || fallbackTs;

        const title = deriveSessionTitle(session.workout, timestamp || fallbackTs);
        const meta = buildSessionMeta(timestamp || fallbackTs, session.dayKey);

        let highlightConsumed = false;
        const parsedSets = session.sets.map((item, index) => {
            const repsNumber = Number.isFinite(item.reps) ? item.reps : 0;
            const highlightMatch =
                !highlightConsumed &&
                bestSetKey &&
                setKeyForStatSet(item.raw) === bestSetKey;
            if (highlightMatch) highlightConsumed = true;

            return {
                key: `${session.key}-set-${index}`,
                index: index + 1,
                weightLabel: formatWeightValue(item.weight),
                repsLabel: repsNumber > 0 ? String(Math.round(repsNumber)) : '—',
                highlight: highlightMatch && highlightLabel ? highlightLabel : null,
            };
        });

        return {
            key: session.key,
            timestamp,
            title,
            meta,
            sets: parsedSets,
        };
    });

    sessions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    if (HISTORY_SESSION_LIMIT && sessions.length > HISTORY_SESSION_LIMIT) {
        sessions = sessions.slice(0, HISTORY_SESSION_LIMIT);
    }
    return sessions;
};

export const buildExerciseProgressEntries = (exerciseStatsEntry, workoutsByWid) => {
    const sets = Array.isArray(exerciseStatsEntry?.sets) ? exerciseStatsEntry.sets : [];
    if (!sets.length)
        return {
            exerciseVolumeEntries: [],
            exerciseRepsEntries: [],
            exerciseOneRmEntries: [],
            exercisePersonalRecordEntries: [],
        };

    const volumeMap = new Map();
    const repsMap = new Map();
    // Track best set per workout to avoid multiple PR points from the same session.
    const personalRecordByWorkout = new Map();
    // Track best estimated 1RM per workout for progression charting.
    const oneRmByWorkout = new Map();

    sets.forEach((set) => {
        const recordedAt = resolveSetTimestamp(set, workoutsByWid);
        if (!recordedAt) return;
        const weight = Math.max(0, Number(set.weight) || 0);
        const reps = Math.max(0, Number(set.reps) || 0);
        if (weight <= 0 && reps <= 0) return;
        const wid = set?.wid ? String(set.wid).trim() : '';
        const workout = wid && workoutsByWid.has(wid) ? workoutsByWid.get(wid) : null;
        const workoutName = workout ? deriveSessionTitle(workout, recordedAt) : null;

        if (weight > 0) {
            const estOneRm = calculate1RM(weight, reps);
            if (Number.isFinite(estOneRm) && estOneRm > 0) {
                const oneRmKey = wid ? `wid:${wid}` : `ts:${recordedAt}`;
                const existingOneRm = oneRmByWorkout.get(oneRmKey);
                if (!existingOneRm || estOneRm > existingOneRm.value || (estOneRm === existingOneRm.value && reps > existingOneRm.reps)) {
                    oneRmByWorkout.set(oneRmKey, {
                        recordedAt,
                        value: estOneRm,
                        weight,
                        reps,
                        name: workoutName,
                        wid,
                    });
                }
            }

            const recordKey = wid ? `wid:${wid}` : `ts:${recordedAt}`;
            const existing = personalRecordByWorkout.get(recordKey);
            if (!existing || weight > existing.weight || (weight === existing.weight && reps > existing.reps)) {
                personalRecordByWorkout.set(recordKey, {
                    recordedAt,
                    weight,
                    reps,
                    name: workoutName,
                    wid,
                });
            }
        }

        const volumeIncrement = weight * reps;
        if (volumeIncrement > 0) {
            const key = String(recordedAt);
            const existing =
                volumeMap.get(key) || { recordedAt, increment: 0, name: workoutName, wid };
            existing.increment += volumeIncrement;
            if (!existing.name && workoutName) existing.name = workoutName;
            if (!existing.wid && wid) existing.wid = wid;
            volumeMap.set(key, existing);
        }
        if (reps > 0) {
            const key = String(recordedAt);
            const existing =
                repsMap.get(key) || { recordedAt, increment: 0, name: workoutName, wid };
            existing.increment += reps;
            if (!existing.name && workoutName) existing.name = workoutName;
            if (!existing.wid && wid) existing.wid = wid;
            repsMap.set(key, existing);
        }
    });

    const volumeEntries = Array.from(volumeMap.values())
        .filter((entry) => entry.increment > 0)
        .sort((a, b) => a.recordedAt - b.recordedAt);
    let runningVolume = 0;
    volumeEntries.forEach((entry) => {
        runningVolume += entry.increment;
        entry.value = runningVolume;
    });

    const repsEntries = Array.from(repsMap.values())
        .filter((entry) => entry.increment > 0)
        .sort((a, b) => a.recordedAt - b.recordedAt);
    let runningReps = 0;
    repsEntries.forEach((entry) => {
        runningReps += entry.increment;
        entry.value = runningReps;
    });

    const oneRmEntries = Array.from(oneRmByWorkout.values())
        .filter((entry) => Number.isFinite(entry.value) && entry.value > 0)
        .sort((a, b) => a.recordedAt - b.recordedAt)
        .map((entry) => ({ ...entry }));
    let previousOneRm = null;
    oneRmEntries.forEach((entry) => {
        const prevValue = Number.isFinite(previousOneRm) ? previousOneRm : null;
        entry.increment = prevValue == null ? 0 : entry.value - prevValue;
        previousOneRm = entry.value;
    });

    const personalRecordCandidates = Array.from(personalRecordByWorkout.values()).sort(
        (a, b) => a.recordedAt - b.recordedAt
    );
    let bestWeight = 0;
    let recordCount = 0;
    const personalRecordEntries = [];
    personalRecordCandidates.forEach((candidate) => {
        if (candidate.weight > bestWeight) {
            recordCount += 1;
            personalRecordEntries.push({
                recordedAt: candidate.recordedAt,
                value: recordCount,
                increment: 1,
                weight: candidate.weight,
                reps: candidate.reps,
                name: candidate.name || null,
                wid: candidate.wid || null,
            });
            bestWeight = candidate.weight;
        }
    });

    return {
        exerciseVolumeEntries: volumeEntries,
        exerciseRepsEntries: repsEntries,
        exerciseOneRmEntries: oneRmEntries,
        exercisePersonalRecordEntries: personalRecordEntries,
    };
};
