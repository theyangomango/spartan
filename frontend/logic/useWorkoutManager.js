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
// removed per consolidation: incrementDocValue, arrayAppend
import useWorkoutStore, { WORKOUT_SHEET_STATES } from "../state/workoutStore";
import makeID from "../../backend/helper/makeID";
import calculate1RM from "../helper/calculate1RM";
import computeHexagonStats from "./computeHexagonStats"; // retained for local fallback only
// Cloud Functions disabled: compute hex locally and write directly
import { emitHexagonUpdate } from "../utils/hexagonEvents";
import { coercePrivacyMode } from "../utils/workoutPrivacy";

/* ---------------- helpers ---------------- */
const toMillis = (v) => {
    if (typeof v === "number") return v;
    if (v instanceof Date) return v.getTime();
    if (v?.toMillis) return v.toMillis();
    if (typeof v?.seconds === "number") return v.seconds * 1000;
    const n = new Date(v).getTime();
    return Number.isFinite(n) ? n : 0;
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
            }))
            : [];
    const exercises = Array.isArray(w.exercises)
        ? w.exercises.map((ex) => cleanObj({ ...ex, sets: normalizeSets(ex?.sets) }))
        : [];
    // Strip ephemeral local-only flags
    const { __justStarted, ...rest } = w;
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
    const lastPersistSentAtRef = useRef(0);
    const lastPersistSentHashRef = useRef("");
    const lastPrevInjectAtRef = useRef(0);
    const clearPersistDebounce = useCallback(() => {
        if (saveCurrentWorkoutDebouncedRef.current) {
            clearTimeout(saveCurrentWorkoutDebouncedRef.current);
            saveCurrentWorkoutDebouncedRef.current = null;
        }
    }, []);
    const persistCurrentWorkout = useCallback(
        (value) => {
            if (!uid) return;
            if (!value) {
                clearPersistDebounce();
                if (__DEV__) {
                    try {
                        console.debug("[WorkoutManager] Persist currentWorkout -> clearing");
                    } catch { /* noop */ }
                }
                (async () => {
                    try {
                        await setDoc(doc(db, "users", uid), { currentWorkout: null }, { merge: true });
                    } catch (e) {
                        console.log("setDoc users.currentWorkout (clear) error", e);
                        try { await updateDoc("users", uid, { currentWorkout: null }); } catch { }
                    }
                })();
                return;
            }

            clearPersistDebounce();

            const latest = value;
            const payload = sanitizeWorkout(latest);

            try {
                const now = Date.now();
                if (now - (lastPrevInjectAtRef.current || 0) > 5000) {
                    const completed = Array.isArray(global?.userData?.completedWorkouts) ? global.userData.completedWorkouts : [];
                    const stats = (global?.userData?.statsExercises || {});
                    const findPrevFromCompleted = (exName) => {
                        for (let i = completed.length - 1; i >= 0; i--) {
                            const wk = completed[i];
                            const arr = Array.isArray(wk?.exercises) ? wk.exercises : [];
                            const found = arr.find((e) => e?.name === exName && Array.isArray(e?.sets) && e.sets.length > 0);
                            if (found) return (found.sets || []).map((s) => ({ weight: Number(s?.weight) || 0, reps: Number(s?.reps) || 0 }));
                        }
                        return null;
                    };
                    const findPrevFromStats = (exName) => {
                        const exStats = stats?.[exName];
                        const sets = Array.isArray(exStats?.sets) ? exStats.sets : [];
                        if (!sets.length) return null;
                        const lastWid = sets[sets.length - 1]?.wid;
                        const matching = [];
                        for (let i = sets.length - 1; i >= 0; i--) {
                            if (sets[i]?.wid !== lastWid) break;
                            matching.push(sets[i]);
                        }
                        matching.reverse();
                        return matching.map((s) => ({ weight: Number(s?.weight) || 0, reps: Number(s?.reps) || 0 }));
                    };
                    payload.exercises = (payload.exercises || []).map((ex) => {
                        const prevA = findPrevFromCompleted(ex?.name);
                        const prevB = prevA && prevA.length ? prevA : findPrevFromStats(ex?.name);
                        if (prevB && prevB.length) {
                            return { ...ex, prev: prevB };
                        }
                        return ex;
                    });
                    lastPrevInjectAtRef.current = now;
                }
            } catch { /* non-fatal */ }

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
                InteractionManager.runAfterInteractions(() => {
                    (async () => {
                        try {
                            await setDoc(doc(db, "users", uid), { currentWorkout: payload }, { merge: true });
                        } catch (e) {
                            console.log("setDoc users.currentWorkout error", e);
                            try { await updateDoc("users", uid, { currentWorkout: payload }); } catch { }
                        }
                    })();
                });
            } catch { }
        },
        [uid, clearPersistDebounce]
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
            if (!uid) { Alert.alert("Sign in required", "Please log in to start a workout."); return; }

            try {
                const recentlyCancelled = (Date.now() - (lastCancelAtRef.current || 0)) < 2000;
                const existing = useWorkoutStore.getState().workout;
                if (!existing || recentlyCancelled) {
                    if (recentlyCancelled) {
                        // Make sure no stale state remains before creating the new workout
                        setWorkoutInStore(null);
                        setSheetState(WORKOUT_SHEET_STATES.HIDDEN);
                    }
                    global.isCurrentlyWorkingOut = true;
                    const wid = makeID();
                    const created = Date.now();
                    const name = defaultWorkoutName(tplOrNull, created);
                    const appliedPrivacy = coercePrivacyMode(options?.privacyMode || "global");

                    const normalizeSets = (sets) =>
                        Array.isArray(sets) && sets.length
                            ? sets.map((s) => ({ id: s?.id || `${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`, weight: Number(s?.weight) || 0, reps: Number(s?.reps) || 0, isDone: !!s?.isDone, type: s?.type || null }))
                            : [{ id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`, weight: 0, reps: 0, isDone: false, type: null }];

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
                        volume: 0, reps: 0, PBs: 0,
                        privacyMode: appliedPrivacy,
                        ...(creatorHandle ? { creatorHandle } : {}),
                        ...(creatorDisplayName ? { creatorName: creatorDisplayName } : {}),
                        ...(creatorPfp ? { pfp: creatorPfp, creatorPfp } : {}),
                        pfpVersion: creatorPfpVersion,
                        creator: creatorMetadata,
                    };

                    // Mark local state as just-started so UI (e.g., reminder) can react once.
                    // Do not persist this flag to Firestore.
                    const localWorkout = { ...newWorkout, __justStarted: true };
                    setWorkoutInStore(localWorkout);
                    setSheetState(WORKOUT_SHEET_STATES.EXPANDED);
                    // Signal the Workout screen and open the sheet; do both to defeat any transient races
                    try { global.openCurrentWorkoutSignal = Date.now(); } catch {}
                    setIsNewWorkoutVisible(true);
                    try { global.__showWorkoutReminderForWid = wid; } catch {}
                    startTimer(created);

                    clearPersistDebounce();
                    setDoc(doc(db, "users", uid), { currentWorkout: newWorkout }, { merge: true })
                        .catch((e) => console.log("setDoc users.currentWorkout error", e));

                    createWorkoutDoc(wid, name, appliedPrivacy).catch((e) => console.log("createWorkoutDoc error", e));
                } else {
                    setIsNewWorkoutVisible(true);
                    setSheetState(WORKOUT_SHEET_STATES.EXPANDED);
                }
            } catch (e) {
                console.log("startWorkout error", e);
                Alert.alert("Couldn't start workout", e?.message || "Please try again.");
            }
        },
        [uid, startTimer, clearPersistDebounce, createWorkoutDoc, defaultWorkoutName, setSheetState, setWorkoutInStore, setIsNewWorkoutVisible]
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
                try { await setDoc(doc(db, "users", uid), { currentWorkout: null }, { merge: true }); }
                catch (e) { console.log("setDoc users.currentWorkout (cancel) error", e); await updateDoc("users", uid, { currentWorkout: null }); }
            }
        } catch (e) {
            console.log("cancelWorkout error", e);
        }
    }, [uid, clearCurrentWorkoutLocally, clearPersistDebounce, leaveWorkoutGroup]);

    const finishWorkout = useCallback(async () => {
        try {
            const currW = useWorkoutStore.getState().workout;
            if (currW) {
                const cleanedExercises = (Array.isArray(currW.exercises) ? currW.exercises : [])
                    .map((ex) => ({ ...ex, sets: (Array.isArray(ex.sets) ? ex.sets : []).filter((s) => Number(s?.weight) > 0 && Number(s?.reps) > 0) }))
                    .filter((ex) => ex.sets && ex.sets.length > 0);

                const duration = Math.max(0, Date.now() - (currW.created || Date.now()));

                // Derive totals (reps, volume, PBs) for the completed workout
                let totalReps = 0;
                let totalVolume = 0;
                let totalPBs = 0;
                try {
                    const stats = (global?.userData?.statsExercises || {});
                    for (const ex of cleanedExercises) {
                        let hitPB = false;
                        const prevMax = Number(stats?.[ex?.name]?.["1RM"] || 0);
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
                    privacyMode: coercePrivacyMode(currW?.privacyMode),
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
                            const dd = new Date(completed.created || Date.now()); dd.setHours(0, 0, 0, 0);
                            const dk = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}-${String(dd.getDate()).padStart(2, "0")}`;
                            global.userData.workoutsByDate = { ...(global.userData.workoutsByDate || {}), [dk]: true };
                        }
                    } catch { }

                    setCompletedWorkout(completed);
                    setIsSummaryModalVisible(true);
                    // Clear local immediately so header/footer and store reset without waiting
                    clearCurrentWorkoutLocally();

                    // Combine completedWorkouts append + totals + clear currentWorkout into one user doc update (reduces triggers)
                    try {
                        if (uid) {
                            const uref = doc(db, 'users', uid);
                            const incVol = Number(completed?.volume || 0);
                            const incHrs = Number(completed?.duration || 0) / 3600000;
                            fsUpdateDoc(uref, {
                                currentWorkout: null,
                                completedWorkouts: arrayUnion(completed),
                                statsTotalWorkouts: increment(1),
                                statsTotalVolume: increment(incVol),
                                statsTotalHours: increment(incHrs),
                            }).catch(() => updateDoc('users', uid, {
                                currentWorkout: null,
                                completedWorkouts: arrayUnion(completed),
                                statsTotalWorkouts: increment(1),
                                statsTotalVolume: increment(incVol),
                                statsTotalHours: increment(incHrs),
                            }));
                        }
                    } catch { }

                    try {
                        const arr = Array.isArray(global?.userData?.currentWorkouts) ? [...global.userData.currentWorkouts] : [];
                        arr.push(completed);
                        if (global?.userData) global.userData.currentWorkouts = arr;
                    } catch { }
                }

                // Defer statsExercises patch + hexagon recompute after interactions to avoid blocking UI
                try {
                    const scheduleHeavy = async () => {
                        try {
                            const prevStats = (global?.userData?.statsExercises || {});
                            const today = (() => { const d = new Date(); d.setHours(0,0,0,0); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
                            const namesTouched = new Set();
                            const atomic = {}; // per-field updates (avoid touching large arrays)
                            const localPatch = {};

                            for (const ex of (cleanedExercises || [])) {
                                const name = String(ex?.name || '').trim();
                                if (!name) continue;
                                namesTouched.add(name);
                                const prev = prevStats?.[name] || {};

                                const repsInc = (ex?.sets || []).reduce((acc, s) => acc + (Number(s?.reps) || 0), 0);
                                const volInc = (ex?.sets || []).reduce((acc, s) => acc + (Number(s?.reps) || 0) * (Number(s?.weight) || 0), 0);
                                const nextReps = (Number(prev['Reps']) || 0) + repsInc;
                                const nextVol = (Number(prev['Volume']) || 0) + volInc;

                                let best1RM = Number(prev['1RM'] || 0);
                                let bestSet = prev?.bestSet || null;
                                for (const s of (ex?.sets || [])) {
                                    const r = Number(s?.reps) || 0; const w = Number(s?.weight) || 0;
                                    if (r > 0 && w > 0) {
                                        const est = calculate1RM(w, r);
                                        if (est > best1RM) { best1RM = est; bestSet = { weight: w, reps: r }; }
                                    }
                                }

                                const progress = Array.isArray(prev?.progress1RM) ? prev.progress1RM.slice() : [];
                                const last = progress.length ? progress[progress.length - 1] : null;
                                if (last && last.date === today) {
                                    last['1RM'] = Math.max(Number(last['1RM'] || 0), best1RM);
                                    last['volume'] = (Number(last['volume'] || 0) + volInc);
                                    progress[progress.length - 1] = last;
                                } else {
                                    progress.push({ date: today, '1RM': best1RM || (Number(prev['1RM']) || 0), volume: volInc });
                                }

                                // atomic field paths
                                atomic[`statsExercises.${name}.Reps`] = nextReps;
                                atomic[`statsExercises.${name}.Volume`] = nextVol;
                                if (best1RM > Number(prev['1RM'] || 0)) {
                                    atomic[`statsExercises.${name}.1RM`] = best1RM;
                                    if (bestSet) atomic[`statsExercises.${name}.bestSet`] = bestSet;
                                }
                                atomic[`statsExercises.${name}.progress1RM`] = progress;

                                localPatch[name] = { ...(prev || {}), Reps: nextReps, Volume: nextVol, progress1RM: progress };
                                if (best1RM > Number(prev['1RM'] || 0)) { localPatch[name]['1RM'] = best1RM; if (bestSet) localPatch[name].bestSet = bestSet; }
                            }

                            // Persist minimal stats deltas (currentWorkout already cleared in base update)
                            if (uid && namesTouched.size > 0) {
                                const uref = doc(db, 'users', uid);
                                const combined = {
                                    ...atomic,
                                    currentWorkout: null,
                                };
                                try {
                                    await fsUpdateDoc(uref, combined);
                                } catch (e) {
                                    await updateDoc('users', uid, {
                                        currentWorkout: null,
                                        statsExercises: localPatch,
                                    });
                                }
                            }
                            try { if (global?.userData) global.userData.statsExercises = { ...(global?.userData?.statsExercises || {}), ...localPatch }; } catch {}

                            // Compute hexagon locally and write directly (Cloud Functions disabled)
                            try {
                                const trainedArr = Array.from(namesTouched.values());
                                const prevHex = (global?.userData?.statsHexagon || {});
                                const { statsHexagon: nextHex, lastTrained } = computeHexagonStats({
                                    statsExercises: (global?.userData?.statsExercises || {}),
                                    prevStatsHexagon: prevHex,
                                    trainedExerciseNames: trainedArr,
                                });
                                if (uid) {
                                    const payload = {
                                        statsHexagon: nextHex,
                                        statsHexagonMeta: { lastTrainedByGroup: lastTrained, updatedAt: serverTimestamp() },
                                    };
                                    fsUpdateDoc(doc(db, 'users', uid), payload).catch(() => updateDoc('users', uid, payload));
                                }
                                if (global?.userData) { global.userData.statsHexagon = nextHex; try { global.__hexChangeTo = nextHex; } catch {} ; emitHexagonUpdate(); }
                            } catch {}
                        } catch (e) {
                            console.log('finishWorkout heavy updates error', e?.message || e);
                        }
                    };

                    // Snapshot current hex so UI can animate change after summary closes
                    try { global.__hexChangeFrom = (global?.userData?.statsHexagon || {}); } catch {}
                    // Precompute the "to" hex locally immediately so the sheet can animate without waiting on writes
                    try {
                        const trainedArr = Array.from(namesTouched.values());
                        const prevHex = (global?.userData?.statsHexagon || {});
                        const tempStats = { ...(global?.userData?.statsExercises || {}), ...localPatch };
                        const { statsHexagon: preToHex } = computeHexagonStats({
                            statsExercises: tempStats,
                            prevStatsHexagon: prevHex,
                            trainedExerciseNames: trainedArr,
                        });
                        try { global.__hexChangeTo = preToHex; } catch {}
                    } catch { }
                    // Defer heavy stats delta + hexagon until after the summary closes to avoid jank
                    pendingHeavyRef.current = () => { try { scheduleHeavy(); } catch {} };

                    // Locally reflect raw set history immediately for UI; persist via CF after
                    const applyLocalSetsHistory = () => {
                        try {
                            const prevStats2 = (global?.userData?.statsExercises || {});
                            const today2 = (() => { const d = new Date(); d.setHours(0,0,0,0); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
                            const nextStats = { ...prevStats2 };
                            for (const ex of (cleanedExercises || [])) {
                                const name = String(ex?.name || '').trim(); if (!name) continue;
                                const entryPrev = nextStats?.[name] || {};
                                const entry = { ...entryPrev };
                                entry.sets = Array.isArray(entry.sets) ? entry.sets.slice() : [];
                                const setPrivacy = coercePrivacyMode(completed?.privacyMode ?? currW?.privacyMode);
                                for (const s of (ex?.sets || [])) {
                                    const r = Number(s?.reps)||0; const w = Number(s?.weight)||0;
                                    if (r>0 && w>0) entry.sets.push({ weight:w, reps:r, date: today2, wid: completed?.wid || currW?.wid, privacyMode: setPrivacy });
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
                            const uref = doc(db, 'users', uid);
                            const today2 = (() => { const d = new Date(); d.setHours(0,0,0,0); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
                            const updateFields = {};
                            for (const ex of (cleanedExercises || [])) {
                                const name = String(ex?.name || '').trim(); if (!name) continue;
                                const payloadSets = [];
                                const setPrivacy = coercePrivacyMode(completed?.privacyMode ?? currW?.privacyMode);
                                for (const s of (Array.isArray(ex?.sets) ? ex.sets : [])) {
                                    const r = Number(s?.reps)||0; const w = Number(s?.weight)||0;
                                    if (r>0 && w>0) payloadSets.push({ weight:w, reps:r, date: today2, wid: completed?.wid || currW?.wid, privacyMode: setPrivacy });
                                }
                                if (payloadSets.length) updateFields[`statsExercises.${name}.sets`] = arrayUnion(...payloadSets);
                            }
                            if (Object.keys(updateFields).length) fsUpdateDoc(uref, updateFields).catch(() => updateDoc('users', uid, updateFields));
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
    }, [uid, clearCurrentWorkoutLocally, leaveWorkoutGroup, defaultWorkoutName]);

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
                    volume: 0, reps: 0, PBs: 0,
                });
                // Tag locally as just started/joined so UI can show reminder once.
                localJoined = { ...joined, __justStarted: true };
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
                await setDoc(doc(db, "users", me), { currentWorkout: joined }, { merge: true });
            } catch (e) {
                console.log("joinExternalWorkout: set currentWorkout error", e);
                try { await updateDoc("users", me, { currentWorkout: joined }); } catch { }
            }

            // Auto-publish presence right away (best-effort); ongoing lifecycle handled by ActiveWorkoutModal hook
            try {
                await setDoc(
                    doc(db, "workouts", String(wid), "live", String(me)),
                    {
                        uid: String(me),
                        handle: global?.userData?.handle || "",
                        image: global?.userData?.image || global?.userData?.pfp || global?.userData?.photoURL || "",
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
    }, [uid, startTimer, setSheetState, setWorkoutInStore, setIsNewWorkoutVisible]);

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
                    persistCurrentWorkout(next);
                } catch { /* ignore transient issues */ }
            }
        );
        try {
            persistCurrentWorkout(useWorkoutStore.getState().workout);
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
