import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, InteractionManager } from "react-native";
import {
    setDoc,
    doc,
    serverTimestamp,
    getDoc,
    updateDoc as fsUpdateDoc,
    arrayRemove,
    arrayUnion,
    increment,
    deleteDoc,
    collection,
    getDocs,
    query,
    where,
    writeBatch,
    runTransaction,
} from "firebase/firestore";
import { db } from "../../firebase.config";
import updateDoc from "../../backend/helper/firebase/updateDoc";
import sendNotification from "../../backend/sendNotification";
// removed per consolidation: incrementDocValue, arrayAppend
import useWorkoutStore, { WORKOUT_SHEET_STATES } from "../state/workoutStore";
import makeID from "../../backend/helper/makeID";
import calculate1RM from "../helper/calculate1RM";
import computeHexagonStats from "./computeHexagonStats"; // retained for local fallback only
// Cloud Functions disabled: compute hex locally and write directly
import { emitHexagonUpdate } from "../utils/hexagonEvents";
import { coercePrivacyMode } from "../utils/workoutPrivacy";
import { emitUserDataUpdate } from "../utils/userDataEvents";
import { resolvePhotoURL } from "../utils/profilePhoto";
import { estimateWorkoutCalories } from "../helper/estimateWorkoutCalories";
import { resolveUserBodyweight } from "../utils/bodyweight";

/* ---------------- helpers ---------------- */
const toMillis = (v) => {
    if (typeof v === "number") return v;
    if (v instanceof Date) return v.getTime();
    if (v?.toMillis) return v.toMillis();
    if (typeof v?.seconds === "number") return v.seconds * 1000;
    const n = new Date(v).getTime();
    return Number.isFinite(n) ? n : 0;
};
const normalizePrevPayload = (prev) => {
    if (!prev || typeof prev !== "object") return null;
    return {
        weight: Number(prev?.weight) || 0,
        reps: Number(prev?.reps) || 0,
    };
};
const extractFollowerUids = () => {
    try {
        const followers = Array.isArray(global?.userData?.followers) ? global.userData.followers : [];
        const deduped = new Set();
        const uids = [];
        followers.forEach((entry) => {
            let uid = "";
            if (typeof entry === "string" || typeof entry === "number") {
                uid = String(entry).trim();
            } else if (entry && typeof entry === "object") {
                uid = String(entry.uid || entry.id || entry.userUid || entry.followerUid || "").trim();
            }
            if (!uid) return;
            if (deduped.has(uid)) return;
            deduped.add(uid);
            uids.push(uid);
        });
        return uids;
    } catch {
        return [];
    }
};
const normalizeCalories = (value) => {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};

const toDayKeySafe = (value) => {
    const msRaw = toMillis(value ?? Date.now());
    const ms = Number.isFinite(msRaw) && msRaw > 0 ? msRaw : Date.now();
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const sanitizeWorkout = (w) => {
    if (!w) return null;
    const created = toMillis(w.created ?? w.createdAt);
    const cleanObj = (obj) => Object.fromEntries(Object.entries(obj || {}).filter(([_, v]) => v !== undefined));
    const normalizeSets = (sets) =>
        Array.isArray(sets)
            ? sets.map((s) => ({
                // Never write undefined to Firestore
                id: (s?.id != null && s?.id !== undefined) ? String(s.id) : null,
                weight: Number(s?.weight) || 0,
                reps: Number(s?.reps) || 0,
                isDone: !!s?.isDone,
                type: (s?.type != null && s?.type !== undefined) ? s.type : null,
                prev: normalizePrevPayload(s?.prev),
            }))
            : [];
    const exercises = Array.isArray(w.exercises)
        ? w.exercises.map((ex) => cleanObj({ ...ex, sets: normalizeSets(ex?.sets) }))
        : [];
    // Strip ephemeral local-only flags
    const { __justStarted, __focusTitle, ...rest } = w;
    // Enforce a valid privacy mode and remove undefined values before persisting
    const enforced = { ...rest, privacyMode: coercePrivacyMode(rest?.privacyMode) };
    const restClean = cleanObj(enforced);
    return {
        ...restClean,
        created,
        exercises,
        volume: Number(w?.volume) || 0,
        reps: Number(w?.reps) || 0,
        PBs: Number(w?.PBs) || 0,
        calories: normalizeCalories(w?.calories),
    };
};

// robust equality against array elements that could be string/number/object
const asUid = (x) => {
    if (typeof x === "string" || typeof x === "number") return String(x);
    if (x && typeof x === "object") return String(x.uid || x.id || "");
    return "";
};
const filterOutUid = (arr, uidStr) =>
    (Array.isArray(arr) ? arr : []).filter((v) => asUid(v) !== uidStr);

const stripUndefined = (obj) =>
    Object.fromEntries(
        Object.entries(obj || {}).filter(([, value]) => value !== undefined)
    );

const perfNow = () => {
    const { performance: perfGlobal } = typeof global !== "undefined" ? global : {};
    const perf = perfGlobal || (typeof performance !== "undefined" ? performance : null);
    if (perf && typeof perf.now === "function") {
        return perf.now();
    }
    return Date.now();
};

const normalizeExerciseName = (value) => (typeof value === "string" ? value.trim() : "");

const cloneHexagon = (hex = {}) => ({
    shoulders: Number(hex.shoulders || 0),
    chest: Number(hex.chest || 0),
    arms: Number(hex.arms || 0),
    legs: Number(hex.legs || 0),
    back: Number(hex.back || 0),
    abs: Number(hex.abs || 0),
    overall: Number(hex.overall || 0),
});

const buildRankPayload = (completedWorkouts, statsHexagon) => {
    try {
        const progress = computeRankProgressFromData({
            completedWorkouts,
            statsHexagon,
        });
        const entry = progress?.currentRankEntry;
        if (!entry) return null;
        const currentRank = {
            key: entry.key,
            tier: entry.rankTier,
            level: entry.rankLevel,
            label: entry.rankLabel,
            index: progress?.currentRankIndexDesc,
        };
        return {
            currentRank,
            rankTier: entry.rankTier,
            rankLabel: entry.rankLabel,
            rankLevel: entry.rankLevel,
        };
    } catch (error) {
        console.warn("buildRankPayload failed", error?.message || error);
        return null;
    }
};

const getTodayKey = () => {
    return toDayKeySafe(Date.now());
};

const buildExerciseStatDeltas = ({ exercises, prevStats, todayKey }) => {
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

const runHexagonCompute = async ({ namesTouched, statsExercises, prevHexagon }) => {
    if (!namesTouched || namesTouched.size === 0) return null;
    return computeHexagonStats({
        statsExercises,
        prevStatsHexagon: prevHexagon,
        trainedExerciseNames: Array.from(namesTouched),
    });
};

const captureHexSnapshot = (fromHex, toHex = null) => {
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

const getPreviousOneRm = (statsMap, rawName) => {
    const entry = findStatsEntryForExercise(statsMap, rawName);
    if (!entry || typeof entry !== "object") return 0;
    const direct = Number(entry?.["1RM"]);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const fallback = Number(entry?.oneRM ?? entry?.oneRm ?? entry?.max ?? 0);
    return Number.isFinite(fallback) && fallback > 0 ? fallback : 0;
};

export default function useWorkoutManager({ uid, navigation, millisToHMS }) {
    const [completedWorkout, setCompletedWorkout] = useState(null);
    const [isSummaryModalVisible, setIsSummaryModalVisible] = useState(false);
    const pendingHeavyRef = useRef(null);
    const [isNewWorkoutVisible, setInternalSheetVisible] = useState(false);
    const lastCancelAtRef = useRef(0);

    const setIsNewWorkoutVisible = useCallback((value) => {
        setInternalSheetVisible(!!value);
    }, []);

    const setWorkoutInStore = useCallback((value) => {
        try { useWorkoutStore.getState().setWorkout(value); } catch { }
    }, []);

    const setSheetState = useCallback((value) => {
        try { useWorkoutStore.getState().setSheetState(value || WORKOUT_SHEET_STATES.HIDDEN); } catch { }
    }, []);

    const setTimerString = useCallback((value) => {
        try { useWorkoutStore.getState().setTimer(value); } catch { }
    }, []);

    /* ------------ timer ------------ */
    const timerRef = useRef("");
    const timerIdRef = useRef(null);
    const setTimerNow = useCallback(
        (createdMs) => {
            if (!createdMs) {
                timerRef.current = "";
                setTimerString("");
                return;
            }
            const diff = Date.now() - createdMs;
            const formatted = millisToHMS(Math.max(1000, diff));
            timerRef.current = formatted;
            setTimerString(formatted);
        },
        [millisToHMS, setTimerString]
    );
    const stopTimer = useCallback(() => {
        try { if (timerIdRef.current) clearInterval(timerIdRef.current); } catch { }
        timerIdRef.current = null;
        timerRef.current = "";
        setTimerString("");
    }, [setTimerString]);
    const startTimer = useCallback(
        (createdMs) => {
            stopTimer();
            setTimerNow(createdMs);
            timerIdRef.current = setInterval(() => setTimerNow(createdMs), 1000);
        },
        [setTimerNow, stopTimer]
    );

    const defaultWorkoutName = useCallback((tplOrNull, createdMs) => {
        const tplName = tplOrNull?.name || tplOrNull?.title || tplOrNull?.templateName || null;
        if (tplName && String(tplName).trim()) return String(tplName).trim();
        try {
            const d = new Date(createdMs || Date.now());
            const hours = d.getHours();
            let prefix;
            if (hours < 12) {
                prefix = "Morning";
            } else if (hours < 17) {
                prefix = "Afternoon";
            } else {
                prefix = "Evening";
            }
            return `${prefix} Workout`;
        } catch {
            return "Workout";
        }
    }, []);

    const HEAVY_DELAY_MS = 900; // allow summary modal to animate and settle

    // When the summary modal closes, run any pending heavy task
    useEffect(() => {
        if (!isSummaryModalVisible && pendingHeavyRef.current) {
            const fn = pendingHeavyRef.current;
            pendingHeavyRef.current = null;
            try {
                setTimeout(() => {
                    try { InteractionManager.runAfterInteractions(fn); }
                    catch { setTimeout(fn, 0); }
                }, HEAVY_DELAY_MS);
            } catch { /* ignore */ }
        }
    }, [isSummaryModalVisible]);

    /* ------------ persist currentWorkout (debounced) ------------ */
    const saveCurrentWorkoutDebouncedRef = useRef(null);
    const pendingPersistValueRef = useRef(null);
    const lastPersistSentAtRef = useRef(0);
    const lastPersistSentHashRef = useRef("");
    const prevSetsCacheRef = useRef({ timestamp: 0, map: new Map() });
    const PERSIST_DEBOUNCE_MS = 900;
    const PREV_CACHE_TTL_MS = 30000;
    const clearPersistDebounce = useCallback((resetPending = true) => {
        if (saveCurrentWorkoutDebouncedRef.current) {
            clearTimeout(saveCurrentWorkoutDebouncedRef.current);
            saveCurrentWorkoutDebouncedRef.current = null;
        }
        if (resetPending) {
            pendingPersistValueRef.current = null;
        }
    }, []);
    const ensurePrevSetsCache = useCallback(() => {
        const t0 = perfNow();
        const now = Date.now();
        const cache = prevSetsCacheRef.current;
        if (cache && cache.map instanceof Map && (now - (cache.timestamp || 0) < PREV_CACHE_TTL_MS)) {
            return cache.map;
        }

        const nextMap = new Map();

        try {
            const stats = (global?.userData?.statsExercises || {});
            Object.keys(stats).forEach((name) => {
                const entry = stats[name] || {};
                const sets = Array.isArray(entry.sets) ? entry.sets : [];
                if (!sets.length) return;
                const lastWid = sets[sets.length - 1]?.wid;
                if (!lastWid) return;
                const collected = [];
                for (let i = sets.length - 1; i >= 0; i--) {
                    const row = sets[i];
                    if (row?.wid !== lastWid) break;
                    collected.push({
                        weight: Number(row?.weight) || 0,
                        reps: Number(row?.reps) || 0,
                    });
                }
                collected.reverse();
                if (collected.length) nextMap.set(name, collected);
            });
        } catch { }

        try {
            if (nextMap.size === 0) {
                const completed = Array.isArray(global?.userData?.completedWorkouts) ? global.userData.completedWorkouts : [];
                for (let i = completed.length - 1; i >= 0 && i >= completed.length - 12; i--) {
                    const wk = completed[i];
                    const exs = Array.isArray(wk?.exercises) ? wk.exercises : [];
                    for (const ex of exs) {
                        const name = normalizeExerciseName(ex?.name);
                        if (!name || nextMap.has(name)) continue;
                        const sets = Array.isArray(ex?.sets) ? ex.sets : [];
                        if (!sets.length) continue;
                        const sanitized = sets.map((row) => ({
                            weight: Number(row?.weight) || 0,
                            reps: Number(row?.reps) || 0,
                        }));
                        if (sanitized.length) nextMap.set(name, sanitized);
                    }
                    if (nextMap.size > 24) break;
                }
            }
        } catch { }

        prevSetsCacheRef.current = { timestamp: now, map: nextMap };
        if (__DEV__) {
            const duration = perfNow() - t0;
            try {
                console.log(
                    `[perf] ensurePrevSetsCache took ${duration.toFixed(1)} ms (mapSize=${nextMap.size})`
                );
            } catch { }
        }
        return nextMap;
    }, []);
    const upsertWorkoutDoc = useCallback(
        async (workoutLike, { active = true, sanitized = false, markCompleted = false } = {}) => {
            if (!workoutLike) return;
            const normalized = sanitized ? workoutLike : sanitizeWorkout(workoutLike);
            const wid = String(normalized?.wid || "");
            if (!wid) return;

            const docRef = doc(db, "workouts", wid);
            const trimmedName = typeof normalized?.name === "string" ? normalized.name.trim() : "";
            const basePayload = {
                wid,
                active: !!active,
                updatedAt: serverTimestamp(),
                volume: Number(normalized?.volume || 0),
                reps: Number(normalized?.reps || 0),
                PBs: Number(normalized?.PBs ?? normalized?.pbs ?? 0),
                calories: normalizeCalories(normalized?.calories),
                privacyMode: normalized?.privacyMode,
                exercises: Array.isArray(normalized?.exercises) ? normalized.exercises : [],
            };

            if (trimmedName) basePayload.name = trimmedName;
            if (normalized?.creatorUid) basePayload.creatorUid = normalized.creatorUid;
            if (normalized?.creatorUID) basePayload.creatorUID = normalized.creatorUID;
            if (normalized?.templateName) basePayload.templateName = normalized.templateName;

            const durationVal = Number(normalized?.duration);
            if (Number.isFinite(durationVal) && durationVal > 0) basePayload.duration = durationVal;

            if (normalized?.startedAt) basePayload.startedAt = normalized.startedAt;
            if (normalized?.finishedAt) basePayload.finishedAt = normalized.finishedAt;

            if (markCompleted) {
                basePayload.active = false;
                basePayload.completedAt = serverTimestamp();
                if (basePayload.finishedAt === undefined) {
                    basePayload.finishedAt = serverTimestamp();
                }
            }

            const cleanedPayload = stripUndefined(basePayload);
            if (!Object.prototype.hasOwnProperty.call(cleanedPayload, "exercises")) {
                cleanedPayload.exercises = Array.isArray(basePayload.exercises) ? basePayload.exercises : [];
            }

            try {
                await fsUpdateDoc(docRef, cleanedPayload);
            } catch (err) {
                try {
                    await setDoc(docRef, cleanedPayload, { merge: true });
                } catch (err2) {
                    console.log("upsertWorkoutDoc error", err2?.message || err2);
                }
            }
        },
        [db]
    );
    const performPersist = useCallback((latest) => {
        if (!uid || !latest) return;

        InteractionManager.runAfterInteractions(() => {
            try {
                const payload = sanitizeWorkout(latest);

                // Previous-set context travels with each set via `prev`, so we just forward the workout as-is here.

                try {
                    const hash = JSON.stringify(payload);
                    if (hash === lastPersistSentHashRef.current) return;
                    lastPersistSentHashRef.current = hash;
                    lastPersistSentAtRef.current = Date.now();
                    if (__DEV__) {
                        try {
                            console.debug(
                                "[WorkoutManager] Persist currentWorkout ->",
                                payload?.wid || "(no wid)",
                                payload?.name || ""
                            );
                        } catch { /* ignore console issues */ }
                    }
                    (async () => {
                        try {
                            await syncCurrentWorkoutRemote(payload);
                        } catch { /* noop */ }
                        try {
                            await upsertWorkoutDoc(payload, { active: true, sanitized: true });
                        } catch (e) {
                            console.log("upsert workout doc (persist) error", e?.message || e);
                        }
                    })();
                } catch { }
            } catch { /* best effort */ }
        });
    }, [uid, ensurePrevSetsCache, upsertWorkoutDoc, syncCurrentWorkoutRemote]);
    const persistCurrentWorkout = useCallback(
        (value, options = {}) => {
            if (!uid) return;
            if (!value) {
                pendingPersistValueRef.current = null;
                clearPersistDebounce();
                if (__DEV__) {
                    try {
                        console.debug("[WorkoutManager] Persist currentWorkout -> clearing");
                    } catch { /* noop */ }
                }
                (async () => {
                    try {
                        await syncCurrentWorkoutRemote(null);
                    } catch { /* noop */ }
                })();
                return;
            }

            const immediate = !!options.immediate;
            pendingPersistValueRef.current = value;

            if (immediate) {
                const latest = pendingPersistValueRef.current;
                clearPersistDebounce();
                performPersist(latest);
                pendingPersistValueRef.current = null;
                return;
            }

            clearPersistDebounce(false);
            saveCurrentWorkoutDebouncedRef.current = setTimeout(() => {
                saveCurrentWorkoutDebouncedRef.current = null;
                const latest = pendingPersistValueRef.current;
                if (!latest) return;
                performPersist(latest);
                pendingPersistValueRef.current = null;
            }, PERSIST_DEBOUNCE_MS);
        },
        [uid, clearPersistDebounce, performPersist, syncCurrentWorkoutRemote]
    );

    /* ------------ helpers ------------ */
    const readCreatorDetails = () => {
        const safeTrim = (value) => (typeof value === "string" ? value.trim() : "");
        const safeUid = uid ? String(uid) : "";
        let userDetails = null;
        try {
            userDetails = global?.userData || null;
        } catch {
            userDetails = null;
        }

        const handle = safeTrim(userDetails?.handle);
        const name = safeTrim(userDetails?.name);
        const pfp = safeTrim(userDetails?.image);

        const versionSource = userDetails?.pfpVersion ?? userDetails?.pfp_version ?? userDetails?.pfpVer ?? userDetails?.version;
        const parsedVersion = Number(versionSource);
        const pfpVersion = Number.isFinite(parsedVersion) && parsedVersion >= 0 ? parsedVersion : 0;

        return { uid: safeUid, handle, name, pfp, pfpVersion };
    };

    const createWorkoutDoc = useCallback(
        async (wid, name, privacyMode) => {
            const { uid: creatorUidStr, handle: creatorHandle, name: creatorName, pfp: creatorPfp, pfpVersion } = readCreatorDetails();
            const creatorPayload = {
                uid: creatorUidStr,
                ...(creatorHandle ? { handle: creatorHandle } : {}),
                ...(creatorName ? { name: creatorName } : {}),
                ...(creatorPfp ? { pfp: creatorPfp } : {}),
                pfpVersion,
            };
            await setDoc(
                doc(db, "workouts", wid),
                {
                    wid,
                    creatorUid: creatorUidStr || uid,
                    creatorUID: creatorUidStr || uid,
                    createdAt: serverTimestamp(),
                    active: true,
                    members: [creatorUidStr || uid],
                    updatedAt: serverTimestamp(),
                    ...(name ? { name: String(name) } : {}),
                    privacyMode: coercePrivacyMode(privacyMode),
                    ...(creatorHandle ? { creatorHandle } : {}),
                    ...(creatorName ? { creatorName } : {}),
                    ...(creatorPfp ? { pfp: creatorPfp, creatorPfp } : {}),
                    pfpVersion,
                    creator: creatorPayload,
                },
                { merge: true }
            );
        },
        [uid]
    );

    const syncCurrentWorkoutRemote = useCallback(async (value) => {
        if (!uid) return;
        const payload = { currentWorkout: value ?? null };
        const targets = ["users", "usersPublic", "usersPrivate"];
        await Promise.allSettled(
            targets.map(async (collection) => {
                try {
                    await setDoc(doc(db, collection, uid), payload, { merge: true });
                } catch (error) {
                    console.log(`setDoc ${collection}.currentWorkout error`, error);
                    try {
                        await updateDoc(collection, uid, payload);
                    } catch (fallbackError) {
                        console.log(`${collection}.currentWorkout fallback error`, fallbackError);
                    }
                }
            })
        );
    }, [uid]);

    const appendCompletedWorkoutRemote = useCallback(async (workout, incVolume = 0, incHours = 0) => {
        if (!uid || !workout) return;
        const payload = {
            currentWorkout: null,
            completedWorkouts: arrayUnion(workout),
            statsTotalWorkouts: increment(1),
            statsTotalVolume: increment(incVolume),
            statsTotalHours: increment(incHours),
        };
        const targets = ["users", "usersPublic", "usersPrivate"];
        await Promise.allSettled(
            targets.map(async (collection) => {
                try {
                    await fsUpdateDoc(doc(db, collection, uid), payload);
                } catch (error) {
                    try {
                        await updateDoc(collection, uid, payload);
                    } catch (fallbackError) {
                        console.log(`${collection}.appendCompletedWorkout error`, fallbackError);
                    }
                }
            })
        );
    }, [uid]);

    const persistHexagonStats = useCallback(async (payload) => {
        if (!uid || !payload) return;
        const targets = ["usersPublic", "users", "usersPrivate"];
        for (const collection of targets) {
            try {
                await fsUpdateDoc(doc(db, collection, uid), payload);
            } catch (error) {
                try {
                    await updateDoc(collection, uid, payload);
                } catch (fallbackError) {
                    console.log(`${collection}.hexagon update error`, fallbackError);
                }
            }
        }
    }, [uid]);

    const clearCurrentWorkoutLocally = useCallback(() => {
        try {
            global.isCurrentlyWorkingOut = false;
            if (global?.userData) {
                global.userData.currentWorkout = null;
                // Suppress brief Firestore rehydration of stale currentWorkout
                try { global.__suppressCurrentWorkoutUntil = Date.now() + 15000; } catch {}
            }
        } catch { }
        stopTimer();
        setIsNewWorkoutVisible(false);
        setWorkoutInStore(null);
        setSheetState(WORKOUT_SHEET_STATES.HIDDEN);
    }, [stopTimer, setSheetState, setWorkoutInStore, setIsNewWorkoutVisible]);

    /**
     * Purge *all* traces of this user from a group workout across backend.
     * Handles mixed-type members arrays (string/number/object).
     */
    const leaveWorkoutGroup = useCallback(
        async (wid) => {
            if (!wid || !uid) return;
            const widStr = String(wid);
            const my = String(uid);

            // Transactionally rewrite arrays so we remove string/number/object variants
            try {
                await runTransaction(db, async (tx) => {
                    const ref = doc(db, "workouts", widStr);
                    const snap = await tx.get(ref);
                    if (!snap.exists()) return;

                    const data = snap.data() || {};
                    const nextMembers = filterOutUid(data.members, my);
                    const nextUsers = filterOutUid(data.users, my);

                    const updatePayload = {
                        members: nextMembers,
                        users: nextUsers,
                        updatedAt: serverTimestamp(),
                    };
                    if ((nextMembers.length + nextUsers.length) === 0) {
                        updatePayload.active = false;
                    }

                    tx.update(ref, updatePayload);
                });
            } catch (e) {
                console.log("leaveWorkoutGroup: tx rewrite failed, fallback arrayRemove", e);
                // fallback — best effort
                try {
                    await fsUpdateDoc(doc(db, "workouts", widStr), {
                        members: arrayRemove(my),
                        users: arrayRemove(my),
                        updatedAt: serverTimestamp(),
                    });
                } catch { }
            }

            // Delete presence
            try { await deleteDoc(doc(db, "workouts", widStr, "live", my)); } catch { }

            // Delete any invites related to this wid & user (either side)
            try {
                const qFrom = query(collection(db, "workoutInvites"), where("wid", "==", widStr), where("fromUid", "==", my));
                const qTo = query(collection(db, "workoutInvites"), where("wid", "==", widStr), where("toUid", "==", my));
                const [sFrom, sTo] = await Promise.all([getDocs(qFrom), getDocs(qTo)]);
                const batch = writeBatch(db);
                sFrom.forEach((d) => batch.delete(d.ref));
                sTo.forEach((d) => batch.delete(d.ref));
                await batch.commit();
            } catch (e) {
                console.log("leaveWorkoutGroup: invite cleanup err", e);
            }
        },
        [uid]
    );

    /* ------------ public API ------------ */
    const startNewWorkoutFromTemplate = useCallback(
        (tplOrNull, options = {}) => {
            const {
                privacyMode: privacyOverride,
                forceFresh = false,
                skipUI = false,
            } = options || {};

            if (!uid) { Alert.alert("Sign in required", "Please log in to start a workout."); return; }

            const t0 = __DEV__ ? perfNow() : 0;
            try {
            const recentlyCancelled = (Date.now() - (lastCancelAtRef.current || 0)) < 2000;
            const existing = useWorkoutStore.getState().workout;
            if (forceFresh || !existing || recentlyCancelled) {
                if (recentlyCancelled) {
                    // Make sure no stale state remains before creating the new workout
                    setWorkoutInStore(null);
                    setSheetState(WORKOUT_SHEET_STATES.HIDDEN);
                }
                global.isCurrentlyWorkingOut = true;
                const wid = makeID();
                const created = Date.now();
                const name = defaultWorkoutName(tplOrNull, created);
                const appliedPrivacy = coercePrivacyMode(privacyOverride || "global");

                const normalizeSets = (sets) =>
                    Array.isArray(sets) && sets.length
                        ? sets.map((s) => ({
                            id: s?.id || `${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`,
                            weight: Number(s?.weight) || 0,
                            reps: Number(s?.reps) || 0,
                            isDone: !!s?.isDone,
                            type: s?.type || null,
                            prev: normalizePrevPayload(s?.prev),
                        }))
                        : [{
                            id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`,
                            weight: 0,
                            reps: 0,
                            isDone: false,
                            type: null,
                            prev: null,
                        }];

                const exercisesFromTpl = tplOrNull?.exercises
                    ? tplOrNull.exercises.map((ex) => ({ ...ex, sets: normalizeSets(ex?.sets) }))
                    : [];
                const {
                    uid: creatorUidStr,
                    handle: creatorHandle,
                    name: creatorDisplayName,
                    pfp: creatorPfp,
                    pfpVersion: creatorPfpVersion,
                } = readCreatorDetails();
                const creatorMetadata = {
                    uid: creatorUidStr,
                    ...(creatorHandle ? { handle: creatorHandle } : {}),
                    ...(creatorDisplayName ? { name: creatorDisplayName } : {}),
                    ...(creatorPfp ? { pfp: creatorPfp } : {}),
                    pfpVersion: creatorPfpVersion,
                };

                const newWorkout = {
                    wid,
                    creatorUID: creatorUidStr || uid,
                    created,
                    name,
                    users: [],
                    exercises: exercisesFromTpl,
                    tid: tplOrNull?.tid || tplOrNull?.id || null,
                    volume: 0,
                    reps: 0,
                    PBs: 0,
                    calories: null,
                    privacyMode: appliedPrivacy,
                    ...(creatorHandle ? { creatorHandle } : {}),
                    ...(creatorDisplayName ? { creatorName: creatorDisplayName } : {}),
                    ...(creatorPfp ? { pfp: creatorPfp, creatorPfp } : {}),
                    pfpVersion: creatorPfpVersion,
                    creator: creatorMetadata,
                };

                const localWorkout = { ...newWorkout, __justStarted: true, __focusTitle: true };
                try {
                    console.log?.("[WorkoutManager] setWorkoutInStore start");
                    console.time?.("useWorkoutManager::setWorkoutInStore");
                } catch {}
                setWorkoutInStore(localWorkout);
                try {
                    console.timeEnd?.("useWorkoutManager::setWorkoutInStore");
                    console.log?.("[WorkoutManager] setWorkoutInStore done");
                } catch {}
                setSheetState(skipUI ? WORKOUT_SHEET_STATES.COLLAPSED : WORKOUT_SHEET_STATES.EXPANDED);
                if (!skipUI) {
                    try { global.openCurrentWorkoutSignal = Date.now(); } catch {}
                    setIsNewWorkoutVisible(true);
                } else {
                    setIsNewWorkoutVisible(false);
                }
                try { global.__showWorkoutReminderForWid = wid; } catch {}
                startTimer(created);

                clearPersistDebounce();
                const scheduleRemotePersist = () => {
                    syncCurrentWorkoutRemote(newWorkout).catch(() => { /* noop */ });
                    createWorkoutDoc(wid, name, appliedPrivacy).catch((e) => console.log("createWorkoutDoc error", e));
                };
                if (InteractionManager?.runAfterInteractions) {
                    InteractionManager.runAfterInteractions(scheduleRemotePersist);
                } else {
                    scheduleRemotePersist();
                }

                const followerUids = extractFollowerUids().filter((fUid) => fUid && fUid !== (creatorUidStr || uid));
                if (followerUids.length) {
                    const eventBase = {
                        uid: creatorUidStr || uid,
                        handle: creatorHandle,
                        name: creatorDisplayName,
                        pfp: creatorPfp,
                        pfpVersion: creatorPfpVersion,
                        type: "friend-workout-started",
                        wid,
                        workoutName: name,
                        timestamp: Date.now(),
                    };
                    (async () => {
                        try {
                            await Promise.all(
                                followerUids.map((targetUid) => sendNotification(targetUid, { ...eventBase }))
                            );
                        } catch (notifyErr) {
                            console.log("notifyFollowers workout start error", notifyErr?.message || notifyErr);
                        }
                    })();
                }
            } else {
                if (!skipUI) {
                    setIsNewWorkoutVisible(true);
                    setSheetState(WORKOUT_SHEET_STATES.EXPANDED);
                }
            }
            } catch (e) {
                console.log("startWorkout error", e);
                Alert.alert("Couldn't start workout", e?.message || "Please try again.");
            } finally {
                if (__DEV__) {
                    const dt = perfNow() - t0;
                    try {
                        console.log(`[perf] startNewWorkoutFromTemplate sync took ${dt.toFixed(1)} ms`);
                    } catch { }
                }
            }
        },
        [uid, startTimer, clearPersistDebounce, createWorkoutDoc, defaultWorkoutName, setSheetState, setWorkoutInStore, setIsNewWorkoutVisible, syncCurrentWorkoutRemote]
    );

    const updateNewWorkout = useCallback((next) => {
        setWorkoutInStore(next);
        persistCurrentWorkout(next);
    }, [persistCurrentWorkout, setWorkoutInStore]);

    const cancelWorkout = useCallback(async () => {
        try {
            // Mark cancel time to tolerate immediate re-start without races
            try { lastCancelAtRef.current = Date.now(); } catch {}
            clearPersistDebounce();

            // capture now; we clear local state immediately after
            const curr = useWorkoutStore.getState().workout;
            const wid = String(curr?.wid || global?.userData?.currentWorkout?.wid || "");

            // 1) Local/optimistic clear so *my* UI pops closed immediately
            clearCurrentWorkoutLocally();

            // 2) Backend purge so everyone else’s GroupMenu updates immediately via snapshots
            if (wid) await leaveWorkoutGroup(wid);

            // 3) Clear my user doc (authoritative)
            if (uid) {
                const clearRemote = async () => {
                    try { await syncCurrentWorkoutRemote(null); } catch { /* noop */ }
                };
                if (InteractionManager?.runAfterInteractions) {
                    InteractionManager.runAfterInteractions(clearRemote);
                } else {
                    await clearRemote();
                }
            }
        } catch (e) {
            console.log("cancelWorkout error", e);
        }
    }, [uid, clearCurrentWorkoutLocally, clearPersistDebounce, leaveWorkoutGroup, syncCurrentWorkoutRemote]);

    const finishWorkout = useCallback(async () => {
        try {
            const currW = useWorkoutStore.getState().workout;
            if (currW) {
                captureHexSnapshot(global?.userData?.statsHexagon || {}, null);
                const exercisesForCalories = (Array.isArray(currW.exercises) ? currW.exercises : [])
                    .map((ex) => ({
                        ...ex,
                        sets: (Array.isArray(ex.sets) ? ex.sets : []).filter((s) => !!s?.isDone),
                    }))
                    .filter((ex) => Array.isArray(ex.sets) && ex.sets.length > 0);

                const cleanedExercises = exercisesForCalories
                    .map((ex) => ({
                        ...ex,
                        sets: (Array.isArray(ex.sets) ? ex.sets : []).filter((s) => {
                            const reps = Number(s?.reps) || 0;
                            const weight = Number(s?.weight) || 0;
                            return reps > 0 && weight > 0;
                        }),
                    }))
                    .filter((ex) => ex.sets && ex.sets.length > 0);

                const finishedAtMs = Date.now();
                const startedAtMs = toMillis(currW?.created ?? currW?.startedAt ?? currW?.createdAt);
                const duration = Math.max(0, finishedAtMs - (startedAtMs || finishedAtMs));
                const finishedAtDate = new Date(finishedAtMs);
                const finishedDayKey = toDayKeySafe(finishedAtMs);
                const startDayKey = toDayKeySafe(startedAtMs || finishedAtMs);

                // Derive totals (reps, volume, PBs) for the completed workout
                let totalReps = 0;
                let totalVolume = 0;
                let totalPBs = 0;
                try {
                    const stats = (global?.userData?.statsExercises || {});
                    for (const ex of cleanedExercises) {
                        const prevMax = getPreviousOneRm(stats, ex?.name);
                        let hitPB = prevMax <= 0;
                        for (const s of (ex?.sets || [])) {
                            const r = Number(s?.reps) || 0;
                            const w = Number(s?.weight) || 0;
                            totalReps += r;
                            totalVolume += r * w;
                            if (!hitPB && r > 0 && w > 0) {
                                const est = calculate1RM(w, r);
                                if (est > prevMax) { hitPB = true; }
                            }
                        }
                        if (hitPB) totalPBs += 1;
                    }
                } catch { /* keep zeros on failure */ }

                let calories = null;
                try {
                    const latestWeightLb = resolveUserBodyweight(global?.userData, null);
                    const calorieSource = {
                        ...currW,
                        duration,
                        exercises: exercisesForCalories,
                    };
                    const estimate = estimateWorkoutCalories(calorieSource, {
                        weightLb: latestWeightLb,
                        user: global?.userData || null,
                    });
                    if (Number.isFinite(estimate?.calories)) {
                        calories = estimate.calories;
                    }
                } catch { /* leave calories null on failure */ }

                // Ensure a stable name exists on the completed workout
                const ensuredName = (currW?.name && String(currW.name).trim())
                    ? String(currW.name).trim()
                    : defaultWorkoutName({ name: currW?.templateName || currW?.template?.name || null }, currW?.created);
                const completed = {
                    ...currW,
                    name: ensuredName,
                    duration,
                    exercises: cleanedExercises,
                    reps: totalReps,
                    volume: totalVolume,
                    PBs: totalPBs,
                    calories,
                    privacyMode: coercePrivacyMode(currW?.privacyMode),
                    finishedAt: finishedAtDate,
                    completedAt: finishedAtDate,
                    ...(startDayKey ? { dayKey: startDayKey } : {}),
                };

                // Only persist/share if there's meaningful work
                const hasWork = cleanedExercises.length > 0 || totalVolume > 0 || totalReps > 0;

                if (hasWork) {
                    // 1) Push completed workout locally + UI (make UI snappy first)
                    try {
                        const arr = Array.isArray(global?.userData?.completedWorkouts) ? [...global.userData.completedWorkouts] : [];
                        arr.push(completed);
                        if (global?.userData) {
                            global.userData.completedWorkouts = arr;
                            const dk = startDayKey || finishedDayKey || getTodayKey();
                            if (dk) {
                                global.userData.workoutsByDate = { ...(global.userData.workoutsByDate || {}), [dk]: true };
                            }
                            emitUserDataUpdate();
                        }
                    } catch { }

                    setCompletedWorkout(completed);
                    setIsSummaryModalVisible(true);
                    // Clear local immediately so header/footer and store reset without waiting
                    clearCurrentWorkoutLocally();

                    // Combine completedWorkouts append + totals + clear currentWorkout into one user doc update (reduces triggers)
                    try {
                        if (uid) {
                            const uref = doc(db, 'usersPrivate', uid);
                            const incVol = Number(completed?.volume || 0);
                            const incHrs = Number(completed?.duration || 0) / 3600000;
                            fsUpdateDoc(uref, {
                                currentWorkout: null,
                                completedWorkouts: arrayUnion(completed),
                                statsTotalWorkouts: increment(1),
                                statsTotalVolume: increment(incVol),
                                statsTotalHours: increment(incHrs),
                            }).catch(() => updateDoc('usersPrivate', uid, {
                                currentWorkout: null,
                                completedWorkouts: arrayUnion(completed),
                                statsTotalWorkouts: increment(1),
                                statsTotalVolume: increment(incVol),
                                statsTotalHours: increment(incHrs),
                            }));
                            appendCompletedWorkoutRemote(completed, incVol, incHrs);
                        }
                    } catch { }

                    try {
                        const arr = Array.isArray(global?.userData?.currentWorkouts) ? [...global.userData.currentWorkouts] : [];
                        arr.push(completed);
                        if (global?.userData) global.userData.currentWorkouts = arr;
                    } catch { }

                    try {
                        await upsertWorkoutDoc(completed, { active: false, markCompleted: true });
                    } catch (e) {
                        console.log("upsert workout doc (finish) error", e?.message || e);
                    }
                }

                // Defer statsExercises patch + hexagon recompute after interactions to avoid blocking UI
                try {
                    const prevStats = (global?.userData?.statsExercises || {});
                    const todayKey = getTodayKey();
                    const { namesTouched, atomicUpdates, localPatch } = buildExerciseStatDeltas({
                        exercises: cleanedExercises,
                        prevStats,
                        todayKey,
                    });

                    const scheduleHeavy = async () => {
                        try {
                            // Persist minimal stats deltas (currentWorkout already cleared in base update)
                            if (uid && namesTouched.size > 0) {
                                const uref = doc(db, 'usersPrivate', uid);
                                const combined = {
                                    ...atomicUpdates,
                                    currentWorkout: null,
                                };
                                try {
                                    await fsUpdateDoc(uref, combined);
                                } catch (e) {
                                    await updateDoc('usersPrivate', uid, {
                                        currentWorkout: null,
                                        statsExercises: localPatch,
                                    });
                                }
                            }
                            try { if (global?.userData) global.userData.statsExercises = { ...(global?.userData?.statsExercises || {}), ...localPatch }; } catch {}

                            // Compute hexagon stats via Cloud Function (with local fallback) and persist the result
                            try {
                                const prevHex = global?.__hexChangeFrom || (global?.userData?.statsHexagon || {});
                                const result = await runHexagonCompute({
                                    namesTouched,
                                    statsExercises: (global?.userData?.statsExercises || {}),
                                    prevHexagon: prevHex,
                                });
                                if (result) {
                                    const { statsHexagon: nextHex, lastTrained } = result;
                                    const rankPayload = buildRankPayload(
                                        global?.userData?.completedWorkouts || [],
                                        nextHex || global?.userData?.statsHexagon || {}
                                    );
                                    const basePayload = {
                                        statsHexagon: nextHex,
                                        statsHexagonMeta: { lastTrainedByGroup: lastTrained, updatedAt: serverTimestamp() },
                                    };
                                    const payload = stripUndefined(
                                        rankPayload ? { ...basePayload, ...rankPayload } : basePayload
                                    );
                                    await persistHexagonStats(payload);
                                    captureHexSnapshot(prevHex, nextHex);
                                    if (global?.userData) {
                                        global.userData.statsHexagon = cloneHexagon(nextHex);
                                        if (rankPayload) {
                                            global.userData.currentRank = rankPayload.currentRank;
                                            global.userData.rankTier = rankPayload.rankTier;
                                            global.userData.rankLabel = rankPayload.rankLabel;
                                            global.userData.rankLevel = rankPayload.rankLevel;
                                        }
                                    }
                                    emitHexagonUpdate();
                                    emitUserDataUpdate();
                                }
                            } catch (err) {
                                console.warn("finishWorkout: hexagon compute failed", err?.message || err);
                            }
                        } catch (e) {
                            console.log('finishWorkout heavy updates error', e?.message || e);
                        }
                    };

                    // Precompute the preview hexagon immediately so the summary sheet shows fresh numbers
                    if (namesTouched.size > 0) {
                        try {
                            const prevHexPreview = global?.__hexChangeFrom || (global?.userData?.statsHexagon || {});
                            const tempStatsPreview = { ...(global?.userData?.statsExercises || {}), ...localPatch };
                            (async () => {
                                try {
                                    const result = await runHexagonCompute({
                                        namesTouched,
                                        statsExercises: tempStatsPreview,
                                        prevHexagon: prevHexPreview,
                                    });
                                    if (result) {
                                        const { statsHexagon: previewHex } = result;
                                        captureHexSnapshot(prevHexPreview, previewHex);
                                        try { if (global?.userData) global.userData.statsHexagon = cloneHexagon(previewHex); } catch {}
                                        emitHexagonUpdate();
                                    }
                                } catch (err) {
                                    console.warn("hexagon preview compute failed", err?.message || err);
                                }
                            })();
                        } catch {
                            // ignore preview errors; final write still happens via heavy schedule
                        }
                    }

                    // Defer heavy stats delta + hexagon until after the summary closes to avoid jank
                    pendingHeavyRef.current = () => { try { scheduleHeavy(); } catch {} };

                    // Locally reflect raw set history immediately for UI; persist via CF after
                    const applyLocalSetsHistory = () => {
                        try {
                            const prevStats2 = (global?.userData?.statsExercises || {});
                            const todayKey2 = getTodayKey();
                            const nextStats = { ...prevStats2 };
                            for (const ex of (cleanedExercises || [])) {
                                const name = normalizeExerciseName(ex?.name); if (!name) continue;
                                const entryPrev = nextStats?.[name] || {};
                                const entry = { ...entryPrev };
                                entry.sets = Array.isArray(entry.sets) ? entry.sets.slice() : [];
                                const setPrivacy = coercePrivacyMode(completed?.privacyMode ?? currW?.privacyMode);
                                for (const s of (ex?.sets || [])) {
                                    const r = Number(s?.reps) || 0;
                                    const w = Number(s?.weight) || 0;
                                    if (r > 0 && w > 0) {
                                        entry.sets.push({
                                            weight: w,
                                            reps: r,
                                            date: todayKey2,
                                            wid: completed?.wid || currW?.wid,
                                            privacyMode: setPrivacy,
                                        });
                                    }
                                }
                                nextStats[name] = entry;
                            }
                            try { if (global?.userData) global.userData.statsExercises = nextStats; } catch {}
                        } catch {}
                    };

                    // After close: append raw set history directly to Firestore (arrayUnion)
                    const persistSetsHistory = () => {
                        try {
                            if (!uid) return;
                            const uref = doc(db, 'usersPrivate', uid);
                            const todayKey2 = getTodayKey();
                            const updateFields = {};
                            for (const ex of (cleanedExercises || [])) {
                                const name = normalizeExerciseName(ex?.name); if (!name) continue;
                                const payloadSets = [];
                                const setPrivacy = coercePrivacyMode(completed?.privacyMode ?? currW?.privacyMode);
                                for (const s of (Array.isArray(ex?.sets) ? ex.sets : [])) {
                                    const r = Number(s?.reps) || 0;
                                    const w = Number(s?.weight) || 0;
                                    if (r > 0 && w > 0) {
                                        payloadSets.push({
                                            weight: w,
                                            reps: r,
                                            date: todayKey2,
                                            wid: completed?.wid || currW?.wid,
                                            privacyMode: setPrivacy,
                                        });
                                    }
                                }
                                if (payloadSets.length) updateFields[`statsExercises.${name}.sets`] = arrayUnion(...payloadSets);
                            }
                            if (Object.keys(updateFields).length) fsUpdateDoc(uref, updateFields).catch(() => updateDoc('usersPrivate', uid, updateFields));
                        } catch {}
                    };
                    // Immediate local sets for UI responsiveness
                    try { applyLocalSetsHistory(); } catch {}

                    // Chain: first heavy stats delta, then persist sets history
                    const prevPending = pendingHeavyRef.current;
                    pendingHeavyRef.current = () => { try { prevPending?.(); } catch {}; try { persistSetsHistory(); } catch {} };
                } catch {}
            }

            const wid = String((useWorkoutStore.getState().workout?.wid) || "");
            // Fire-and-forget backend cleanup
            try { if (wid) leaveWorkoutGroup(wid).catch(() => {}); } catch {}
            // currentWorkout is cleared in the combined user doc update above
        } catch (e) {
            console.log("finishWorkout error", e);
        }
    }, [uid, clearCurrentWorkoutLocally, leaveWorkoutGroup, defaultWorkoutName, upsertWorkoutDoc, appendCompletedWorkoutRemote, syncCurrentWorkoutRemote]);

    const postWorkout = useCallback(async () => {
        setIsSummaryModalVisible(false);
        try {
            const { jumpToTab } = require('../../navigationRef');
            jumpToTab('Profile');
            navigation.navigate('PostOptions', { images: [], workout: completedWorkout });
        } catch { }
    }, [completedWorkout, navigation]);

    /**
     * Join helper: accepts (wid, seed) or ({ wid, seedWorkout })
     */
    const joinExternalWorkout = useCallback(async (arg1, arg2) => {
        try {
            const me = String(uid || global?.userData?.uid || "");
            if (!me) return;

            let wid = null;
            let seed = null;
            if (arg1 && typeof arg1 === "object") {
                wid = String(arg1.wid || "");
                seed = arg1.seedWorkout || arg1.seed || null;
            } else {
                wid = String(arg1 || "");
                seed = arg2 || null;
            }
            if (!wid) return;

            const baseSnap = seed ? null : await getDoc(doc(db, "workouts", wid));
            const base = seed || (baseSnap.exists() ? baseSnap.data() : {}) || {};
            // If we already have an active workout, preserve its progress but move it under the new wid
            let existing = null;
            try { existing = useWorkoutStore.getState().workout || null; } catch { existing = null; }
            if (!existing) {
                try { existing = sanitizeWorkout(global?.userData?.currentWorkout); } catch { existing = null; }
            }

            let createdForTimer = Date.now();
            let joined;
            let localJoined;
            if (existing && existing.created) {
                // Preserve exercises, volume, reps, PBs, created time, etc. Only swap wid and ensure creatorUID
                const preservedBase = { ...existing, wid, creatorUID: existing?.creatorUID || base?.creatorUid || base?.creatorUID || me };
                // Ensure name
                if (!preservedBase?.name) {
                    const nm = base?.name || base?.templateName || base?.template?.name || base?.title || defaultWorkoutName(null, preservedBase?.created);
                    preservedBase.name = nm;
                }
                const preserved = sanitizeWorkout(preservedBase);
                joined = preserved;
                localJoined = { ...preserved }; // do NOT set __justStarted when carrying over
                createdForTimer = Number(preserved.created) || Date.now();
            } else {
                // No active workout: behave like a fresh join
                const createdNow = Date.now();
                createdForTimer = createdNow;
                const name = base?.name || base?.templateName || base?.template?.name || base?.title || defaultWorkoutName(null, createdNow);
                joined = sanitizeWorkout({
                    wid,
                    creatorUID: base?.creatorUid || base?.creatorUID || me,
                    created: createdNow,
                    name,
                    users: [],
                    exercises: [],
                    tid: null,
                    volume: 0, reps: 0, PBs: 0, calories: null,
                });
                // Tag locally as just started/joined so UI can show reminder once.
                localJoined = { ...joined, __justStarted: true, __focusTitle: true };
                // Also set a global one-shot flag for safety (consumed by ActiveWorkoutModal)
                try { global.__showWorkoutReminderForWid = String(wid); } catch {}
            }

            // Update local store and UI immediately
            setWorkoutInStore(localJoined);
            setSheetState(WORKOUT_SHEET_STATES.EXPANDED);
            setIsNewWorkoutVisible(true);
            startTimer(createdForTimer);
            try { global.isCurrentlyWorkingOut = true; } catch {}
            try { if (global?.userData) global.userData.currentWorkout = localJoined; } catch { }
            // Signal ActiveWorkoutModal to enable live streaming/presence immediately for this wid
            try { global.__enableLiveForWid = String(wid); } catch {}
            try { global.__forceWorkoutSelfViewWid = String(wid); } catch {}

            // Persist to user doc
            try {
                await syncCurrentWorkoutRemote(joined);
            } catch (e) {
                console.log("joinExternalWorkout: set currentWorkout error", e);
            }

            // Auto-publish presence right away (best-effort); ongoing lifecycle handled by ActiveWorkoutModal hook
            try {
                const presencePhoto = resolvePhotoURL(global?.userData, "");
                await setDoc(
                    doc(db, "workouts", String(wid), "live", String(me)),
                    {
                        uid: String(me),
                        handle: global?.userData?.handle || "",
                        image: presencePhoto,
                        photoURL: presencePhoto,
                        pfpVersion: global?.userData?.pfpVersion || 0,
                        updatedAt: serverTimestamp(),
                    },
                    { merge: true }
                );
            } catch (e) {
                // non-fatal; the hook will publish soon after
            }
        } catch (e) {
            console.log("joinExternalWorkout error", e);
        }
    }, [uid, startTimer, setSheetState, setWorkoutInStore, setIsNewWorkoutVisible, syncCurrentWorkoutRemote]);

    /* ------------ Rehydrate from Firestore user doc ------------ */
    useEffect(() => {
        const suppressUntil = Number(global?.__suppressCurrentWorkoutUntil || 0);
        if (Date.now() < suppressUntil) return; // ignore brief stale rehydrate
        const remote = sanitizeWorkout(global?.userData?.currentWorkout);
        if (!useWorkoutStore.getState().workout && remote && remote.created) {
            setWorkoutInStore(remote);
            setSheetState(WORKOUT_SHEET_STATES.COLLAPSED);
            startTimer(remote.created);
            try {
                global.isCurrentlyWorkingOut = true;
                if (global?.userData) global.userData.currentWorkout = remote;
            } catch { }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [global?.userData?.currentWorkout]);

    useEffect(() => {
        const unsubscribe = useWorkoutStore.subscribe(
            (state) => state.workout,
            (next) => {
                try {
                    if (InteractionManager?.runAfterInteractions) {
                        InteractionManager.runAfterInteractions(() => persistCurrentWorkout(next));
                    } else {
                        persistCurrentWorkout(next);
                    }
                } catch { /* ignore transient issues */ }
            }
        );
        try {
            const currentWorkout = useWorkoutStore.getState().workout;
            if (InteractionManager?.runAfterInteractions) {
                InteractionManager.runAfterInteractions(() => persistCurrentWorkout(currentWorkout));
            } else {
                persistCurrentWorkout(currentWorkout);
            }
        } catch { /* best effort */ }
        return () => {
            try { unsubscribe?.(); } catch { }
        };
    }, [persistCurrentWorkout]);

    useEffect(() => () => stopTimer(), [stopTimer]);

    return {
        // Do not return workout to avoid parent rerenders; consumers should subscribe via store
        timerRef,
        isNewWorkoutVisible, setIsNewWorkoutVisible,
        isSummaryModalVisible, setIsSummaryModalVisible,
        completedWorkout,
        startNewWorkoutFromTemplate,
        updateNewWorkout,
        cancelWorkout,
        finishWorkout,
        postWorkout,
        joinExternalWorkout,
        persistCurrentWorkout,
    };
}
