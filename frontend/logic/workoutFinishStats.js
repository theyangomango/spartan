// Stats helpers for finishing a workout: per-exercise stat deltas, hexagon compute and snapshot, previous 1RM lookup.
import calculate1RM from "../helper/calculate1RM";
import computeHexagonStats from "./computeHexagonStats"; // retained for local fallback only
// Cloud Functions disabled: compute hex locally and write directly
import { normalizeExerciseName } from "./workoutSanitize";

export const cloneHexagon = (hex = {}) => ({
    shoulders: Number(hex.shoulders || 0),
    chest: Number(hex.chest || 0),
    arms: Number(hex.arms || 0),
    legs: Number(hex.legs || 0),
    back: Number(hex.back || 0),
    abs: Number(hex.abs || 0),
    overall: Number(hex.overall || 0),
});

export const buildExerciseStatDeltas = ({ exercises, prevStats, todayKey }) => {
    const namesTouched = new Set();
    const atomicUpdates = {};
    const localPatch = {};

    (Array.isArray(exercises) ? exercises : []).forEach((exercise) => {
        const name = normalizeExerciseName(exercise?.name);
        if (!name) return;
        namesTouched.add(name);

        const prev = prevStats?.[name] || {};
        const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
        const repsInc = sets.reduce((acc, s) => acc + (Number(s?.reps) || 0), 0);
        const volInc = sets.reduce((acc, s) => acc + (Number(s?.reps) || 0) * (Number(s?.weight) || 0), 0);
        const nextReps = (Number(prev["Reps"]) || 0) + repsInc;
        const nextVol = (Number(prev["Volume"]) || 0) + volInc;

        let best1RM = Number(prev["1RM"] || 0);
        let bestSet = prev?.bestSet || null;
        sets.forEach((set) => {
            const reps = Number(set?.reps) || 0;
            const weight = Number(set?.weight) || 0;
            if (reps > 0 && weight > 0) {
                const est = calculate1RM(weight, reps);
                if (est > best1RM) {
                    best1RM = est;
                    bestSet = { weight, reps };
                }
            }
        });

        const progress = Array.isArray(prev?.progress1RM) ? prev.progress1RM.slice() : [];
        const lastEntry = progress.length ? progress[progress.length - 1] : null;
        if (lastEntry && lastEntry.date === todayKey) {
            lastEntry["1RM"] = Math.max(Number(lastEntry["1RM"] || 0), best1RM);
            lastEntry["volume"] = (Number(lastEntry["volume"] || 0) + volInc);
            progress[progress.length - 1] = lastEntry;
        } else {
            progress.push({ date: todayKey, "1RM": best1RM || (Number(prev["1RM"]) || 0), volume: volInc });
        }

        atomicUpdates[`statsExercises.${name}.Reps`] = nextReps;
        atomicUpdates[`statsExercises.${name}.Volume`] = nextVol;
        if (best1RM > Number(prev["1RM"] || 0)) {
            atomicUpdates[`statsExercises.${name}.1RM`] = best1RM;
            if (bestSet) atomicUpdates[`statsExercises.${name}.bestSet`] = bestSet;
        }
        atomicUpdates[`statsExercises.${name}.progress1RM`] = progress;

        const updatedEntry = { ...(prev || {}), Reps: nextReps, Volume: nextVol, progress1RM: progress };
        if (best1RM > Number(prev["1RM"] || 0)) {
            updatedEntry["1RM"] = best1RM;
            if (bestSet) updatedEntry.bestSet = bestSet;
        }
        localPatch[name] = updatedEntry;
    });

    return { namesTouched, atomicUpdates, localPatch };
};

export const runHexagonCompute = async ({ namesTouched, statsExercises, prevHexagon }) => {
    if (!namesTouched || namesTouched.size === 0) return null;
    return computeHexagonStats({
        statsExercises,
        prevStatsHexagon: prevHexagon,
        trainedExerciseNames: Array.from(namesTouched),
    });
};

export const captureHexSnapshot = (fromHex, toHex = null) => {
    try {
        const fromClone = cloneHexagon(fromHex || {});
        const toClone = toHex == null ? null : cloneHexagon(toHex);
        global.__hexChangeFrom = fromClone;
        global.__hexChangeTo = toClone;
        global.__hexSnapshot = { from: fromClone, to: toClone };
    } catch { }
};

const findStatsEntryForExercise = (statsMap, rawName) => {
    if (!statsMap || typeof statsMap !== "object") return null;
    const name = normalizeExerciseName(rawName);
    if (!name) return null;
    if (statsMap[name]) return statsMap[name];
    const lowered = name.toLowerCase();
    const matchKey = Object.keys(statsMap).find(
        (key) => typeof key === "string" && key.trim().toLowerCase() === lowered
    );
    return matchKey ? statsMap[matchKey] : null;
};

export const getPreviousOneRm = (statsMap, rawName) => {
    const entry = findStatsEntryForExercise(statsMap, rawName);
    if (!entry || typeof entry !== "object") return 0;
    const direct = Number(entry?.["1RM"]);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const fallback = Number(entry?.oneRM ?? entry?.oneRm ?? entry?.max ?? 0);
    return Number.isFinite(fallback) && fallback > 0 ? fallback : 0;
};
