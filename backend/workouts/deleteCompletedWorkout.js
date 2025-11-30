import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase.config";
import computeHexagonFromStats from "../../shared/computeHexagon.js";
import { computeRankProgressFromData } from "../../shared/rankProgress.js";
import updateDoc from "../helper/firebase/updateDoc.js";

const toNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};

const calculate1RM = (weight, reps) => {
    const w = Number(weight) || 0;
    const r = Number(reps) || 0;
    if (w <= 0 || r <= 0) return 0;
    // Brzycki formula (matches client-side helper)
    return w / (1.0278 - 0.0278 * r);
};

const toMillis = (value) => {
    if (value == null) return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (value?.toMillis) {
        try {
            return value.toMillis();
        } catch {
            return 0;
        }
    }
    const ts = new Date(value).getTime();
    return Number.isFinite(ts) ? ts : 0;
};

const toDayKey = (value) => {
    const ms = toMillis(value);
    if (!ms) return "";
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return "";
    d.setHours(0, 0, 0, 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const parseDayKey = (key) => {
    if (!key) return 0;
    try {
        const [y, m, d] = String(key).split("-").map((x) => Number(x));
        const dt = new Date(y, (m || 1) - 1, d || 1);
        dt.setHours(0, 0, 0, 0);
        const ts = dt.getTime();
        return Number.isFinite(ts) ? ts : 0;
    } catch {
        return 0;
    }
};

const inferGroup = (name) => {
    const n = String(name || "").toLowerCase();
    if (!n) return null;
    if (/shoulder|overhead|press|raise|shrug|upright row/.test(n)) return "shoulders";
    if (/bench|chest|fly|push-up|push up/.test(n)) return "chest";
    if (/curl|tricep|skullcrusher|preacher|extension/.test(n)) return "arms";
    if (/squat|deadlift|lunge|leg\s|calf|hip thrust|glute/.test(n)) return "legs";
    if (/row|pull[- ]?up|chin[- ]?up|lat|trap/.test(n)) return "back";
    if (/ab|core|crunch|sit[- ]?up|plank|twist|leg raise|v[- ]?up/.test(n)) return "abs";
    if (/full body|total body|circuit/.test(n)) return "full";
    return null;
};

const distributeFullBody = (tsMap, ts, weight = 1) => {
    const dist = { legs: 0.35, back: 0.3, shoulders: 0.2, arms: 0.1, abs: 0.05, chest: 0 };
    Object.entries(dist).forEach(([group, factor]) => {
        const prev = tsMap[group] || 0;
        const candidate = Number(ts) || 0;
        if (candidate > prev && factor > 0) {
            tsMap[group] = candidate;
        }
    });
};

const deriveBestTimestamp = (workout) => (
    Math.max(
        toMillis(workout?.finishedAt),
        toMillis(workout?.completedAt),
        toMillis(workout?.updatedAt),
        toMillis(workout?.startedAt),
        toMillis(workout?.createdAt),
        toMillis(workout?.created),
        0,
    )
);

const normalizeIdentifier = (input) => {
    if (!input && input !== 0) return null;
    if (typeof input === "string" || typeof input === "number") {
        const wid = String(input).trim();
        return wid ? { wid } : null;
    }
    if (typeof input !== "object") return null;
    const widRaw = input?.wid ?? input?.id ?? input?.workoutId ?? input?.widStr ?? null;
    const createdRaw = input?.created ?? input?.createdAt ?? input?.finishedAt ?? null;
    const wid = typeof widRaw === "string" ? widRaw.trim() : (widRaw != null ? String(widRaw).trim() : "");
    let created = 0;
    if (createdRaw != null) {
        const ms = toMillis(createdRaw);
        if (ms) created = ms;
    }
    return wid || created ? { wid: wid || null, created: created || 0 } : null;
};

const removeWorkoutFromList = (workouts, identifier) => {
    if (!Array.isArray(workouts) || workouts.length === 0) {
        return { remaining: [], removed: null };
    }
    const targetWid = identifier?.wid ? String(identifier.wid) : null;
    const targetCreated = identifier?.created || 0;
    let removed = null;
    const remaining = [];
    for (const workout of workouts) {
        if (removed) {
            remaining.push(workout);
            continue;
        }
        const wid = workout?.wid ?? workout?.id ?? workout?.workoutId ?? workout?.pid ?? null;
        const created = deriveBestTimestamp(workout);
        const widMatch = targetWid && wid != null && String(wid) === targetWid;
        const createdMatch = targetCreated && Math.abs(created - targetCreated) < 2000; // tolerate ms drift
        if (widMatch || createdMatch) {
            removed = workout;
        } else {
            remaining.push(workout);
        }
    }
    return { remaining, removed };
};

const sanitizeWorkoutForPublic = (workout) => {
    if (!workout || typeof workout !== "object") return null;
    try {
        return JSON.parse(JSON.stringify(workout));
    } catch {
        return { ...workout };
    }
};

const rebuildStatsFromWorkouts = (workouts) => {
    const statsMap = Object.create(null);
    let totalVolume = 0;
    let totalHours = 0;
    const workoutsByDate = {};

    (Array.isArray(workouts) ? workouts : []).forEach((workout) => {
        const wid = workout?.wid ?? workout?.id ?? workout?.workoutId ?? workout?.pid ?? null;
        const widStr = wid != null ? String(wid).trim() : "";
        const dayKey = toDayKey(deriveBestTimestamp(workout));
        if (dayKey) workoutsByDate[dayKey] = true;

        const exercises = Array.isArray(workout?.exercises) ? workout.exercises : [];
        let workoutVolume = toNumber(workout?.volume);
        if (!workoutVolume && exercises.length) {
            workoutVolume = exercises.reduce((acc, exercise) => {
                const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
                return acc + sets.reduce((sum, set) => sum + toNumber(set?.reps ?? set?.rep ?? set?.r) * toNumber(set?.weight ?? set?.lbs ?? set?.kg ?? set?.load), 0);
            }, 0);
        }
        totalVolume += workoutVolume;

        let durationMs = toNumber(workout?.duration);
        if (!durationMs) {
            const startTs = toMillis(workout?.startedAt ?? workout?.createdAt ?? workout?.created);
            const endTs = toMillis(workout?.finishedAt ?? workout?.completedAt ?? workout?.endedAt);
            if (endTs && startTs && endTs > startTs) {
                durationMs = endTs - startTs;
            }
        }
        totalHours += durationMs / 3600000;

        exercises.forEach((exercise) => {
            const name = String(exercise?.name || "").trim();
            if (!name) return;
            const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
            if (!sets.length) return;
            const entry = statsMap[name] || { sets: [] };
            sets.forEach((set) => {
                const reps = toNumber(set?.reps ?? set?.rep ?? set?.r);
                const weight = toNumber(set?.weight ?? set?.lbs ?? set?.kg ?? set?.load);
                if (reps <= 0 || weight <= 0) return;
                const setDay = dayKey || toDayKey(workout?.created);
                entry.sets.push({
                    weight,
                    reps,
                    date: setDay,
                    wid: widStr || undefined,
                    privacyMode: workout?.privacyMode ?? "followers",
                });
            });
            statsMap[name] = entry;
        });
    });

    const statsExercises = {};
    const lastTrainedTs = {
        shoulders: 0, chest: 0, arms: 0, legs: 0, back: 0, abs: 0,
    };

    Object.entries(statsMap).forEach(([name, entry]) => {
        const sets = entry.sets;
        if (!Array.isArray(sets) || sets.length === 0) return;

        let totalReps = 0;
        let totalVolumeEx = 0;
        let best1RM = 0;
        let bestSet = null;
        const timelineMap = new Map();

        sets.forEach((set) => {
            const reps = toNumber(set.reps);
            const weight = toNumber(set.weight);
            totalReps += reps;
            totalVolumeEx += reps * weight;
            const est = calculate1RM(weight, reps);
            if (est > best1RM) {
                best1RM = est;
                bestSet = { weight, reps };
            }
            const day = set.date || toDayKey(Date.now());
            if (!timelineMap.has(day)) {
                timelineMap.set(day, { volume: 0, best: 0 });
            }
            const dayEntry = timelineMap.get(day);
            dayEntry.volume += reps * weight;
            if (est > dayEntry.best) dayEntry.best = est;
        });

        const progress = [];
        const sortedDays = Array.from(timelineMap.keys()).sort();
        let runningBest = 0;
        sortedDays.forEach((day) => {
            const { volume, best } = timelineMap.get(day);
            runningBest = Math.max(runningBest, best);
            progress.push({ date: day, "1RM": runningBest || best || 0, volume });
        });

        const statsEntry = {
            sets,
            Reps: totalReps,
            Volume: totalVolumeEx,
            progress1RM: progress,
        };
        if (best1RM > 0) {
            statsEntry["1RM"] = best1RM;
            statsEntry.bestSet = bestSet;
        }

        statsExercises[name] = statsEntry;

        const group = inferGroup(name);
        if (!group) return;
        let latestTs = 0;
        progress.forEach((row) => {
            const ts = parseDayKey(row?.date);
            if (ts > latestTs) latestTs = ts;
        });
        if (!latestTs) {
            sets.forEach((set) => {
                const ts = parseDayKey(set?.date);
                if (ts > latestTs) latestTs = ts;
            });
        }
        if (!latestTs) return;
        if (group === "full") {
            distributeFullBody(lastTrainedTs, latestTs);
        } else if (lastTrainedTs[group] < latestTs) {
            lastTrainedTs[group] = latestTs;
        }
    });

    const { statsHexagon } = computeHexagonFromStats({
        statsExercises,
        prevStatsHexagon: {},
        trainedExerciseNames: Object.keys(statsExercises),
    });

    const lastTrainedByGroup = {};
    Object.entries(lastTrainedTs).forEach(([group, ts]) => {
        if (ts) {
            lastTrainedByGroup[group] = ts;
        }
    });

    return {
        statsExercises,
        statsHexagon,
        lastTrainedByGroup,
        statsTotalVolume: totalVolume,
        statsTotalHours: Number((totalHours).toFixed(3)),
        statsTotalWorkouts: Array.isArray(workouts) ? workouts.length : 0,
        workoutsByDate,
    };
};

export default async function deleteCompletedWorkout(uid, identifier) {
    const normalizedUid = typeof uid === "string" ? uid.trim() : "";
    if (!normalizedUid) throw new Error("deleteCompletedWorkout: missing uid");
    const id = normalizeIdentifier(identifier);
    if (!id) throw new Error("deleteCompletedWorkout: missing identifier");

    const userRef = doc(db, "users", normalizedUid);
    const publicRef = doc(db, "usersPublic", normalizedUid);
    const privateRef = doc(db, "usersPrivate", normalizedUid);

    const result = await runTransaction(db, async (tx) => {
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists()) throw new Error("User not found");
        const publicSnap = await tx.get(publicRef);
        const privateSnap = await tx.get(privateRef);
        const data = userSnap.data() || {};
        const workouts = Array.isArray(data?.completedWorkouts) ? data.completedWorkouts : [];
        const { remaining, removed } = removeWorkoutFromList(workouts, id);
        if (!removed) throw new Error("Workout not found");

        const rebuilt = rebuildStatsFromWorkouts(remaining);
        const sanitizedWorkouts = remaining.map((entry) => sanitizeWorkoutForPublic(entry)).filter(Boolean);
        const rankProgress = computeRankProgressFromData({
            completedWorkouts: sanitizedWorkouts,
            statsHexagon: rebuilt.statsHexagon,
        });
        const currentRankEntry = rankProgress.currentRankEntry;
        const currentRankData = currentRankEntry
            ? {
                  key: currentRankEntry.key,
                  tier: currentRankEntry.rankTier,
                  level: currentRankEntry.rankLevel,
                  label: currentRankEntry.rankLabel,
                  index: rankProgress.currentRankIndexDesc,
              }
            : null;
        const rankFields = currentRankData
            ? {
                  currentRank: currentRankData,
                  rankTier: currentRankData.tier,
                  rankLabel: currentRankData.label,
                  rankLevel: currentRankData.level,
              }
            : {
                  currentRank: null,
                  rankTier: null,
                  rankLabel: null,
                  rankLevel: null,
              };

        const userUpdatePayload = {
            completedWorkouts: remaining,
            statsExercises: rebuilt.statsExercises,
            statsHexagon: rebuilt.statsHexagon,
            statsHexagonMeta: {
                lastTrainedByGroup: rebuilt.lastTrainedByGroup,
                updatedAt: serverTimestamp(),
            },
            statsTotalVolume: rebuilt.statsTotalVolume,
            statsTotalHours: rebuilt.statsTotalHours,
            statsTotalWorkouts: rebuilt.statsTotalWorkouts,
            workoutsByDate: rebuilt.workoutsByDate,
            ...rankFields,
        };

        const publicUpdatePayload = {
            completedWorkouts: sanitizedWorkouts,
            statsExercises: rebuilt.statsExercises,
            statsHexagon: rebuilt.statsHexagon,
            statsHexagonMeta: {
                lastTrainedByGroup: rebuilt.lastTrainedByGroup,
                updatedAt: serverTimestamp(),
            },
            statsTotalVolume: rebuilt.statsTotalVolume,
            statsTotalHours: rebuilt.statsTotalHours,
            statsTotalWorkouts: rebuilt.statsTotalWorkouts,
            workoutsByDate: rebuilt.workoutsByDate,
            ...rankFields,
        };

        const privateUpdatePayload = {
            completedWorkouts: sanitizedWorkouts,
            statsExercises: rebuilt.statsExercises,
            statsHexagon: rebuilt.statsHexagon,
            statsHexagonMeta: {
                lastTrainedByGroup: rebuilt.lastTrainedByGroup,
                updatedAt: serverTimestamp(),
            },
            statsTotalVolume: rebuilt.statsTotalVolume,
            statsTotalHours: rebuilt.statsTotalHours,
            statsTotalWorkouts: rebuilt.statsTotalWorkouts,
            workoutsByDate: rebuilt.workoutsByDate,
            ...rankFields,
        };

        tx.update(userRef, userUpdatePayload);
        if (publicSnap.exists()) {
            tx.update(publicRef, publicUpdatePayload);
        } else {
            tx.set(publicRef, publicUpdatePayload, { merge: true });
        }
        if (privateSnap.exists()) {
            tx.update(privateRef, privateUpdatePayload);
        } else {
            tx.set(privateRef, privateUpdatePayload, { merge: true });
        }

        const postPidInsideTx = removed?.postPid ?? removed?.pid ?? null;

        return {
            removedWorkout: removed,
            completedWorkouts: remaining,
            statsExercises: rebuilt.statsExercises,
            statsHexagon: rebuilt.statsHexagon,
            statsHexagonMeta: {
                lastTrainedByGroup: rebuilt.lastTrainedByGroup,
                updatedAt: Date.now(),
            },
            statsTotalVolume: rebuilt.statsTotalVolume,
            statsTotalHours: rebuilt.statsTotalHours,
            statsTotalWorkouts: rebuilt.statsTotalWorkouts,
            workoutsByDate: rebuilt.workoutsByDate,
            ...rankFields,
            postPid: postPidInsideTx,
        };
    });

    const { postPid, ...rest } = result || {};

    if (postPid) {
        try {
            await updateDoc("posts", postPid, {
                workout: null,
                workoutDeletedAt: Date.now(),
            });
        } catch (error) {
            if (error?.code === "permission-denied" || error?.code === "not-found") {
                console.warn("deleteCompletedWorkout: linked post already removed or inaccessible", {
                    postPid,
                    code: error?.code,
                });
            } else {
                console.warn("deleteCompletedWorkout: failed to update linked post", {
                    postPid,
                    error,
                });
            }
        }
    }

    return { ok: true, ...rest };
}
