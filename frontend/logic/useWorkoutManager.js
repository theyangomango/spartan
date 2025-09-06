import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, InteractionManager } from "react-native";
import {
    setDoc,
    doc,
    serverTimestamp,
    getDoc,
    updateDoc as fsUpdateDoc,
    arrayRemove,
    deleteDoc,
    collection,
    addDoc,
    getDocs,
    query,
    where,
    writeBatch,
    runTransaction,
} from "firebase/firestore";
import { db } from "../../firebase.config";
import updateDoc from "../../backend/helper/firebase/updateDoc";
import incrementDocValue from "../../backend/helper/firebase/incrementDocValue";
import arrayAppend from "../../backend/helper/firebase/arrayAppend";
import useWorkoutStore from "../state/workoutStore";
import makeID from "../../backend/helper/makeID";
import calculate1RM from "../helper/calculate1RM";

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
    const normalizeSets = (sets) =>
        Array.isArray(sets)
            ? sets.map((s) => ({
                id: s?.id || undefined,
                weight: Number(s?.weight) || 0,
                reps: Number(s?.reps) || 0,
                isDone: !!s?.isDone,
                type: s?.type || null,
            }))
            : [];
    const exercises = Array.isArray(w.exercises)
        ? w.exercises.map((ex) => ({ ...ex, sets: normalizeSets(ex?.sets) }))
        : [];
    return {
        ...w,
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
    const [isNewWorkoutVisible, setIsNewWorkoutVisible] = useState(false);

    /* ------------ timer ------------ */
    const timerRef = useRef("");
    const timerIdRef = useRef(null);
    const setTimerNow = useCallback(
        (createdMs) => {
            if (!createdMs) return;
            const diff = Date.now() - createdMs;
            timerRef.current = millisToHMS(Math.max(1000, diff));
        },
        [millisToHMS]
    );
    const stopTimer = useCallback(() => {
        try { if (timerIdRef.current) clearInterval(timerIdRef.current); } catch { }
        timerIdRef.current = null;
        timerRef.current = "";
    }, []);
    const startTimer = useCallback(
        (createdMs) => {
            stopTimer();
            setTimerNow(createdMs);
            timerIdRef.current = setInterval(() => setTimerNow(createdMs), 1000);
        },
        [setTimerNow, stopTimer]
    );

    /* ------------ persist currentWorkout (debounced) ------------ */
    const saveCurrentWorkoutDebouncedRef = useRef(null);
    const lastPersistValueRef = useRef(null);
    const clearPersistDebounce = useCallback(() => {
        if (saveCurrentWorkoutDebouncedRef.current) {
            clearTimeout(saveCurrentWorkoutDebouncedRef.current);
            saveCurrentWorkoutDebouncedRef.current = null;
        }
    }, []);
    const persistCurrentWorkout = useCallback(
        (value) => {
            if (!uid) return;
            // Track the most recent value; debounce computes from latest to avoid repeated heavy sanitize work.
            lastPersistValueRef.current = value || null;

            if (!value) {
                clearPersistDebounce();
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
            saveCurrentWorkoutDebouncedRef.current = setTimeout(() => {
                const latest = lastPersistValueRef.current;
                if (!latest) return;
                const payload = sanitizeWorkout(latest);

                // Enrich with "previous" sets per exercise so spectators have accurate context
                try {
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
                        return { ...ex, prev: prevB && prevB.length ? prevB : undefined };
                    });
                } catch { /* non-fatal */ }
                InteractionManager.runAfterInteractions(() => {
                    (async () => {
                        try {
                            await setDoc(doc(db, "users", uid), { currentWorkout: payload }, { merge: true });
                        } catch (e) {
                            console.log("setDoc users.currentWorkout (debounced) error", e);
                            try { await updateDoc("users", uid, { currentWorkout: payload }); } catch { }
                        }
                    })();
                });
            }, 380);
        },
        [uid, clearPersistDebounce]
    );

    /* ------------ helpers ------------ */
    const createWorkoutDoc = useCallback(
        async (wid) => {
            await setDoc(
                doc(db, "workouts", wid),
                {
                    wid,
                    creatorUid: uid,
                    createdAt: serverTimestamp(),
                    active: true,
                    members: [uid],
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );
        },
        [uid]
    );

    const clearCurrentWorkoutLocally = useCallback(() => {
        try {
            global.isCurrentlyWorkingOut = false;
            if (global?.userData) global.userData.currentWorkout = null;
        } catch { }
        stopTimer();
        setIsNewWorkoutVisible(false);
        try { useWorkoutStore.setState({ workout: null }); } catch {}
    }, [stopTimer]);

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
        (tplOrNull) => {
            if (!uid) { Alert.alert("Sign in required", "Please log in to start a workout."); return; }

            try {
                if (!useWorkoutStore.getState().workout) {
                    global.isCurrentlyWorkingOut = true;
                    const wid = makeID();
                    const created = Date.now();

                    const normalizeSets = (sets) =>
                        Array.isArray(sets) && sets.length
                            ? sets.map((s) => ({ id: s?.id || `${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`, weight: Number(s?.weight) || 0, reps: Number(s?.reps) || 0, isDone: !!s?.isDone, type: s?.type || null }))
                            : [{ id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`, weight: 0, reps: 0, isDone: false, type: null }];

                    const exercisesFromTpl = tplOrNull?.exercises
                        ? tplOrNull.exercises.map((ex) => ({ ...ex, sets: normalizeSets(ex?.sets) }))
                        : [];

                    const newWorkout = {
                        wid,
                        creatorUID: uid,
                        created,
                        users: [],
                        exercises: exercisesFromTpl,
                        tid: tplOrNull?.tid || tplOrNull?.id || null,
                        volume: 0, reps: 0, PBs: 0,
                    };

                    try { useWorkoutStore.setState({ workout: newWorkout }); } catch {}
                    setIsNewWorkoutVisible(true);
                    startTimer(created);

                    clearPersistDebounce();
                    setDoc(doc(db, "users", uid), { currentWorkout: newWorkout }, { merge: true })
                        .catch((e) => console.log("setDoc users.currentWorkout error", e));

                    createWorkoutDoc(wid).catch((e) => console.log("createWorkoutDoc error", e));
                } else {
                    setIsNewWorkoutVisible(true);
                }
            } catch (e) {
                console.log("startWorkout error", e);
                Alert.alert("Couldn't start workout", e?.message || "Please try again.");
            }
        },
        [uid, startTimer, clearPersistDebounce, createWorkoutDoc]
    );

    const updateNewWorkout = useCallback((next) => {
        try { useWorkoutStore.setState({ workout: next }); } catch {}
        persistCurrentWorkout(next);
    }, [persistCurrentWorkout]);

    const cancelWorkout = useCallback(async () => {
        try {
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

                const completed = { ...currW, duration, exercises: cleanedExercises, reps: totalReps, volume: totalVolume, PBs: totalPBs };

                // Only persist/share if there's meaningful work
                const hasWork = cleanedExercises.length > 0 || totalVolume > 0 || totalReps > 0;

                if (hasWork) {
                    // 1) Update per-exercise stats
                    try {
                        const prevStats = (global?.userData?.statsExercises || {});
                        const nextStats = { ...prevStats };
                        const today = (() => {
                            const d = new Date(); d.setHours(0, 0, 0, 0);
                            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        })();
                        for (const ex of cleanedExercises) {
                            const name = String(ex?.name || '').trim();
                            if (!name) continue;
                            const entry = { ...(nextStats[name] || {}) };
                            // Ensure arrays exist
                            entry.sets = Array.isArray(entry.sets) ? entry.sets.slice() : [];
                            entry.progress1RM = Array.isArray(entry.progress1RM) ? entry.progress1RM.slice() : [];

                            // Accumulators
                            const repsInc = (ex?.sets || []).reduce((acc, s) => acc + (Number(s?.reps) || 0), 0);
                            const volInc = (ex?.sets || []).reduce((acc, s) => acc + (Number(s?.reps) || 0) * (Number(s?.weight) || 0), 0);
                            entry['Reps'] = (Number(entry['Reps']) || 0) + repsInc;
                            entry['Volume'] = (Number(entry['Volume']) || 0) + volInc;

                            // Append raw set history for viewer/analytics
                            for (const s of (ex?.sets || [])) {
                                const r = Number(s?.reps) || 0;
                                const w = Number(s?.weight) || 0;
                                if (r > 0 && w > 0) entry.sets.push({ weight: w, reps: r, date: today, wid: currW.wid });
                            }

                            // Update 1RM / bestSet if improved in this workout
                            let maxSet1RM = 0; let maxSet = null;
                            for (const s of (ex?.sets || [])) {
                                const r = Number(s?.reps) || 0; const w = Number(s?.weight) || 0;
                                if (r > 0 && w > 0) {
                                    const est = calculate1RM(w, r);
                                    if (est > maxSet1RM) { maxSet1RM = est; maxSet = { weight: w, reps: r }; }
                                }
                            }
                            const prevMax = Number(entry['1RM'] || 0);
                            if (maxSet1RM > prevMax) {
                                entry['1RM'] = maxSet1RM;
                                if (maxSet) entry['bestSet'] = maxSet;
                            }

                            // Progress timeline per day
                            const progress = entry.progress1RM;
                            const last = progress.length ? progress[progress.length - 1] : null;
                            if (last && last.date === today) {
                                last['1RM'] = Math.max(Number(last['1RM'] || 0), maxSet1RM);
                                last['volume'] = (Number(last['volume'] || 0) + volInc);
                                progress[progress.length - 1] = last;
                            } else {
                                progress.push({ date: today, '1RM': maxSet1RM || (Number(entry['1RM']) || 0), volume: volInc });
                            }

                            nextStats[name] = entry;
                        }
                        // Persist and keep local cache in sync (best-effort)
                        if (uid) {
                            try { await fsUpdateDoc(doc(db, 'users', uid), { statsExercises: nextStats }); }
                            catch { await updateDoc('users', uid, { statsExercises: nextStats }); }
                        }
                        try { if (global?.userData) global.userData.statsExercises = nextStats; } catch {}
                    } catch (e) {
                        console.log('update statsExercises (Reps/Volume) error', e?.message || e);
                    }

                    // 2) Push completed workout locally + UI
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

                    // Publish a pulse for ActivityChips (non-blocking)
                    try {
                        const me = String(uid || global?.userData?.uid || "");
                        if (me) {
                            const pulse = {
                                type: 'workout',
                                ts: String(toMillis(completed?.created) || Date.now()),
                                uid: me,
                                handle: global?.userData?.handle || '',
                                name: global?.userData?.name || '',
                                pfpVersion: 0,
                                detail: '',
                                workoutID: completed?.wid,
                            };
                            addDoc(collection(db, 'users', me, 'pulse'), pulse).catch(() => {});
                        }
                    } catch (e) {
                        // best-effort; do not block finish flow
                    }

                    // 3) Persist to the user's completedWorkouts array in Firestore
                    try {
                        if (uid) {
                            await arrayAppend("users", uid, "completedWorkouts", completed);
                        }
                    } catch (e) {
                        console.log("append completedWorkouts error", e);
                    }

                    // 4) Increment user-level totals (best-effort)
                    try {
                        if (uid) {
                            await incrementDocValue('users', uid, 'statsTotalWorkouts', 1);
                            await incrementDocValue('users', uid, 'statsTotalVolume', Number(completed?.volume || 0));
                            await incrementDocValue('users', uid, 'statsTotalHours', Number(completed?.duration || 0) / 3600000);
                        }
                    } catch { }

                    try {
                        const arr = Array.isArray(global?.userData?.currentWorkouts) ? [...global.userData.currentWorkouts] : [];
                        arr.push(completed);
                        if (global?.userData) global.userData.currentWorkouts = arr;
                    } catch { }
                }
            }

            const wid = String((useWorkoutStore.getState().workout?.wid) || "");
            if (wid) await leaveWorkoutGroup(wid);

            if (uid) await updateDoc("users", uid, { currentWorkout: null });
            clearCurrentWorkoutLocally();
        } catch (e) {
            console.log("finishWorkout error", e);
        }
    }, [uid, clearCurrentWorkoutLocally, leaveWorkoutGroup]);

    const postWorkout = useCallback(async () => {
        setIsSummaryModalVisible(false);
        try {
            const { jumpToTab } = require('../../navigationRef');
            jumpToTab('Profile');
            navigation.navigate('SelectPhotos', { workout: completedWorkout });
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

            const createdNow = Date.now();
            const joined = sanitizeWorkout({
                wid,
                creatorUID: base?.creatorUid || base?.creatorUID || me,
                created: createdNow,
                users: [],
                exercises: [],
                tid: null,
                volume: 0, reps: 0, PBs: 0,
            });

            try { useWorkoutStore.setState({ workout: joined }); } catch {}
            setIsNewWorkoutVisible(true);
            // Start my local timer immediately so UI reflects joining without waiting for rehydrate
            startTimer(createdNow);

            try {
                await setDoc(doc(db, "users", me), { currentWorkout: joined }, { merge: true });
            } catch (e) {
                console.log("joinExternalWorkout: set currentWorkout error", e);
                try { await updateDoc("users", me, { currentWorkout: joined }); } catch { }
            }
        } catch (e) {
            console.log("joinExternalWorkout error", e);
        }
    }, [uid, startTimer]);

    /* ------------ Rehydrate from Firestore user doc ------------ */
    useEffect(() => {
        const remote = sanitizeWorkout(global?.userData?.currentWorkout);
        if (!useWorkoutStore.getState().workout && remote && remote.created) {
            try { useWorkoutStore.setState({ workout: remote }); } catch {}
            startTimer(remote.created);
            try {
                global.isCurrentlyWorkingOut = true;
                if (global?.userData) global.userData.currentWorkout = remote;
            } catch { }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [global?.userData?.currentWorkout]);

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
    };
}
