import computeHexagonFromStats from "./computeHexagon.js";

const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const calculate1RM = (weight, reps) => {
  const w = Number(weight) || 0;
  const r = Number(reps) || 0;
  if (w <= 0 || r <= 0) return 0;
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
  if (typeof value === "object") {
    const seconds = Number(value.seconds ?? value._seconds);
    if (Number.isFinite(seconds)) {
      const nanos = Number(value.nanoseconds ?? value._nanoseconds ?? 0);
      const extra = Number.isFinite(nanos) ? Math.floor(nanos / 1e6) : 0;
      return seconds * 1000 + extra;
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

const normalizeSet = (set, { defaultDate = "", defaultWid } = {}) => {
  if (!set || typeof set !== "object") return null;
  const reps = toNumber(set?.reps ?? set?.rep ?? set?.r);
  const weight = toNumber(set?.weight ?? set?.lbs ?? set?.kg ?? set?.load);
  if (reps <= 0 || weight <= 0) return null;
  const date =
    set?.date ||
    set?.day ||
    set?.dayKey ||
    (set?.timestamp ? toDayKey(set.timestamp) : "") ||
    defaultDate ||
    toDayKey(Date.now());
  const widRaw = set?.wid ?? set?.workoutId ?? set?.widStr ?? defaultWid;
  const wid = widRaw != null ? String(widRaw).trim() : "";
  return {
    weight,
    reps,
    date,
    wid: wid || undefined,
    privacyMode: set?.privacyMode || undefined,
  };
};

const mergeProgressIntoTimeline = (timelineMap, progress) => {
  let bestFound = 0;
  (Array.isArray(progress) ? progress : []).forEach((row) => {
    const day = row?.date || row?.day || row?.dayKey || "";
    const ts = parseDayKey(day);
    if (!ts) return;
    const vol = toNumber(row?.volume ?? row?.Volume);
    const best = toNumber(row?.["1RM"] ?? row?.best ?? row?.oneRepMax);
    if (!timelineMap.has(day)) {
      timelineMap.set(day, { volume: Math.max(0, vol), best });
    } else {
      const bucket = timelineMap.get(day);
      if (vol > bucket.volume) bucket.volume = vol;
      if (best > bucket.best) bucket.best = best;
    }
    if (best > bestFound) bestFound = best;
  });
  return bestFound;
};

const inferGroup = (name) => {
  const n = String(name || "").toLowerCase();
  if (!n) return null;
  if (/bench|chest|fly|push-up|push up/.test(n)) return "chest";
  if (/shoulder|overhead|deltoid/.test(n) || (/press|raise|shrug|upright row/.test(n) && !/bench/.test(n))) return "shoulders";
  if (/curl|tricep|skullcrusher|preacher|extension/.test(n)) return "arms";
  if (/squat|deadlift|lunge|leg\s|calf|hip thrust|glute/.test(n)) return "legs";
  if (/row|pull[- ]?up|chin[- ]?up|lat|trap/.test(n)) return "back";
  if (/ab|core|crunch|sit[- ]?up|plank|twist|leg raise|v[- ]?up/.test(n)) return "abs";
  if (/full body|total body|circuit/.test(n)) return "full";
  return null;
};

const distributeFullBody = (tsMap, ts) => {
  const dist = { legs: 0.35, back: 0.3, shoulders: 0.2, arms: 0.1, abs: 0.05, chest: 0 };
  Object.entries(dist).forEach(([group, factor]) => {
    const prev = tsMap[group] || 0;
    const candidate = Number(ts) || 0;
    if (candidate > prev && factor > 0) {
      tsMap[group] = candidate;
    }
  });
};

export function rebuildStatsFromWorkouts(workouts) {
  const statsMap = Object.create(null);
  let totalVolume = 0;
  let totalHours = 0;
  const workoutsByDate = {};

  (Array.isArray(workouts) ? workouts : []).forEach((workout) => {
    const wid = workout?.wid ?? workout?.id ?? workout?.workoutId ?? workout?.pid ?? null;
    const widStr = wid != null ? String(wid).trim() : "";
    const dayKey = toDayKey(
      Math.max(
        toMillis(workout?.finishedAt),
        toMillis(workout?.completedAt),
        toMillis(workout?.updatedAt),
        toMillis(workout?.startedAt),
        toMillis(workout?.createdAt),
        toMillis(workout?.created),
        0
      )
    );
    if (dayKey) workoutsByDate[dayKey] = true;

    const exercises = Array.isArray(workout?.exercises)
      ? workout.exercises.map((exercise) => {
          if (!exercise || typeof exercise !== "object") return {};
          const sets = Array.isArray(exercise.sets)
            ? exercise.sets.map((set) => ({ ...(set || {}) }))
            : [];
          return { ...exercise, sets };
        })
      : [];

    let workoutVolume = toNumber(workout?.volume);
    if (!workoutVolume && exercises.length) {
      workoutVolume = exercises.reduce((acc, exercise) => {
        const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
        return (
          acc +
          sets.reduce(
            (sum, set) =>
              sum + toNumber(set?.reps ?? set?.rep ?? set?.r) * toNumber(set?.weight ?? set?.lbs ?? set?.kg ?? set?.load),
            0
          )
        );
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
        const normalized = normalizeSet(set, { defaultDate: dayKey, defaultWid: widStr });
        if (!normalized) return;
        entry.sets.push(normalized);
      });
      statsMap[name] = entry;
    });
  });

  const statsExercises = {};
  const lastTrainedTs = {
    shoulders: 0,
    chest: 0,
    arms: 0,
    legs: 0,
    back: 0,
    abs: 0,
  };

  Object.entries(statsMap).forEach(([name, entry]) => {
    const sets = Array.isArray(entry.sets) ? entry.sets : [];
    if (!sets.length) return;

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
      if (!timelineMap.has(day)) timelineMap.set(day, { volume: 0, best: 0 });
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

    const baseGroup = inferGroup(name);
    if (!baseGroup) return;
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
    if (baseGroup === "full") {
      distributeFullBody(lastTrainedTs, latestTs);
    } else if (lastTrainedTs[baseGroup] < latestTs) {
      lastTrainedTs[baseGroup] = latestTs;
    }
  });

  return {
    statsExercises,
    lastTrainedByGroup: lastTrainedTs,
    statsTotalVolume: totalVolume,
    statsTotalHours: Number(totalHours.toFixed(3)),
    statsTotalWorkouts: Array.isArray(workouts) ? workouts.length : 0,
    workoutsByDate,
  };
}

export function combineStatsExercises(existing = {}, rebuilt = {}) {
  const combined = {};
  const skipped = [];

  Object.entries(rebuilt || {}).forEach(([name, rebuiltEntry]) => {
    const existingEntry = existing?.[name] || {};
    const sets = Array.isArray(rebuiltEntry?.sets) ? rebuiltEntry.sets : [];

    if (!sets.length) {
      const fallbackSets = Array.isArray(existingEntry?.sets) ? existingEntry.sets : [];
      if (!fallbackSets.length && !toNumber(existingEntry?.["1RM"]) && !toNumber(existingEntry?.Volume)) {
        skipped.push(name);
        return;
      }
      combined[name] = { ...existingEntry };
      return;
    }

    const finalEntry = { ...existingEntry, ...rebuiltEntry };
    if (!Array.isArray(finalEntry.progress1RM) || finalEntry.progress1RM.length === 0) {
      if (Array.isArray(existingEntry?.progress1RM) && existingEntry.progress1RM.length) {
        finalEntry.progress1RM = existingEntry.progress1RM;
      }
    }
    if (finalEntry["1RM"] == null && existingEntry?.["1RM"]) {
      finalEntry["1RM"] = existingEntry["1RM"];
    }
    if (!finalEntry.bestSet && existingEntry?.bestSet) {
      finalEntry.bestSet = existingEntry.bestSet;
    }

    combined[name] = finalEntry;
  });

  Object.keys(existing || {}).forEach((name) => {
    if (!combined[name]) skipped.push(name);
  });

  return { combined, skipped };
}

export function computeHexagonFromUserData({
  completedWorkouts = [],
  statsExercises = {},
  prevStatsHexagon = {},
  trainedExerciseNames,
} = {}) {
  const rebuilt = rebuildStatsFromWorkouts(completedWorkouts);
  const { combined, skipped } = combineStatsExercises(statsExercises, rebuilt.statsExercises);
  const { statsHexagon, lastTrained } = computeHexagonFromStats({
    statsExercises: combined,
    prevStatsHexagon,
    trainedExerciseNames,
  });

  return {
    statsExercises: combined,
    statsHexagon,
    statsHexagonMeta: {
      lastTrainedByGroup: lastTrained,
    },
    statsTotalVolume: rebuilt.statsTotalVolume,
    statsTotalHours: rebuilt.statsTotalHours,
    statsTotalWorkouts: rebuilt.statsTotalWorkouts,
    workoutsByDate: rebuilt.workoutsByDate,
    lastTrainedByGroup: lastTrained,
    skippedExercises: skipped,
    rebuiltStatsExercises: rebuilt.statsExercises,
  };
}

export default {
  rebuildStatsFromWorkouts,
  combineStatsExercises,
  computeHexagonFromUserData,
};
