// screens/Workout/logic/useWorkoutManager.js
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { setDoc, doc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "../../firebase.config";
import updateDoc from "../../backend/helper/firebase/updateDoc";
import makeID from "../../backend/helper/makeID";

/* -------- sanitize helpers (kept local to avoid extra files) -------- */
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
        Array.isArray(sets) && sets.length
            ? sets.map((s) => ({
                weight: Number(s?.weight) || 0,
                reps: Number(s?.reps) || 0,
                isDone: !!s?.isDone,
            }))
            : [{ weight: 0, reps: 0, isDone: false }];
    const exercises = Array.isArray(w.exercises)
        ? w.exercises.map((ex) => ({ ...ex, sets: normalizeSets(ex?.sets) }))
        : [];
    return { ...w, created, exercises, volume: Number(w?.volume) || 0, reps: Number(w?.reps) || 0, PBs: Number(w?.PBs) || 0 };
};

export default function useWorkoutManager({ uid, navigation, millisToHMS }) {
    const [workout, setWorkout] = useState(null);
    const [completedWorkout, setCompletedWorkout] = useState(null);
    const [isSummaryModalVisible, setIsSummaryModalVisible] = useState(false);
    const [isNewWorkoutVisible, setIsNewWorkoutVisible] = useState(false);

    /* ------------ timer ------------ */
    const timerRef = useRef("");
    const timerIdRef = useRef(null);
    const setTimerNow = useCallback((createdMs) => {
        if (!createdMs) return;
        const diff = Date.now() - createdMs;
        timerRef.current = millisToHMS(Math.max(1000, diff));
    }, [millisToHMS]);
    const stopTimer = useCallback(() => { try { if (timerIdRef.current) clearInterval(timerIdRef.current); } catch { } timerIdRef.current = null; timerRef.current = ""; }, []);
    const startTimer = useCallback((createdMs) => {
        stopTimer(); setTimerNow(createdMs);
        timerIdRef.current = setInterval(() => setTimerNow(createdMs), 1000);
    }, [setTimerNow, stopTimer]);

    /* ------------ persist currentWorkout (debounced) ------------ */
    const saveCurrentWorkoutDebouncedRef = useRef(null);
    const clearPersistDebounce = useCallback(() => {
        if (saveCurrentWorkoutDebouncedRef.current) {
            clearTimeout(saveCurrentWorkoutDebouncedRef.current);
            saveCurrentWorkoutDebouncedRef.current = null;
        }
    }, []);
    const persistCurrentWorkout = useCallback((value) => {
        if (!uid) return;
        if (!value) {
            clearPersistDebounce();
            (async () => {
                try { await setDoc(doc(db, "users", uid), { currentWorkout: null }, { merge: true }); }
                catch (e) { console.log("setDoc users.currentWorkout (clear) error", e); try { await updateDoc("users", uid, { currentWorkout: null }); } catch { } }
            })();
            return;
        }
        clearPersistDebounce();
        const payload = sanitizeWorkout(value);
        saveCurrentWorkoutDebouncedRef.current = setTimeout(async () => {
            try { await setDoc(doc(db, "users", uid), { currentWorkout: payload }, { merge: true }); }
            catch (e) { console.log("setDoc users.currentWorkout (debounced) error", e); try { await updateDoc("users", uid, { currentWorkout: payload }); } catch { } }
        }, 400);
    }, [uid, clearPersistDebounce]);

    /* ------------ helpers ------------ */
    const createWorkoutDoc = useCallback(async (wid) => {
        await setDoc(doc(db, "workouts", wid), {
            wid, creatorUid: uid, createdAt: serverTimestamp(), active: true, members: [uid], updatedAt: serverTimestamp(),
        }, { merge: true });
    }, [uid]);

    const clearCurrentWorkoutLocally = useCallback(() => {
        try { global.isCurrentlyWorkingOut = false; if (global?.userData) global.userData.currentWorkout = null; } catch { }
        stopTimer(); setIsNewWorkoutVisible(false); setWorkout(null);
    }, [stopTimer]);

    /* ------------ public API ------------ */
    const startNewWorkoutFromTemplate = useCallback((tplOrNull) => {
        if (!uid) { Alert.alert("Sign in required", "Please log in to start a workout."); return; }

        try {
            if (!workout) {
                global.isCurrentlyWorkingOut = true;
                const wid = makeID();
                const created = Date.now();

                const normalizeSets = (sets) =>
                    Array.isArray(sets) && sets.length
                        ? sets.map((s) => ({ weight: Number(s?.weight) || 0, reps: Number(s?.reps) || 0, isDone: !!s?.isDone }))
                        : [{ weight: 0, reps: 0, isDone: false }];

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

                setWorkout(newWorkout);
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
    }, [uid, workout, startTimer, clearPersistDebounce, createWorkoutDoc]);

    const updateNewWorkout = useCallback((next) => {
        setWorkout(next);
        persistCurrentWorkout(next);
    }, [persistCurrentWorkout]);

    const cancelWorkout = useCallback(async () => {
        try {
            clearPersistDebounce();
            if (uid) {
                try { await setDoc(doc(db, "users", uid), { currentWorkout: null }, { merge: true }); }
                catch (e) { console.log("setDoc users.currentWorkout (cancel) error", e); await updateDoc("users", uid, { currentWorkout: null }); }
            }
            clearCurrentWorkoutLocally();
        } catch (e) { console.log("cancelWorkout error", e); }
    }, [uid, clearCurrentWorkoutLocally, clearPersistDebounce]);

    const finishWorkout = useCallback(async () => {
        try {
            if (workout) {
                const cleanedExercises = (Array.isArray(workout.exercises) ? workout.exercises : [])
                    .map((ex) => ({ ...ex, sets: (Array.isArray(ex.sets) ? ex.sets : []).filter((s) => Number(s?.weight) > 0 && Number(s?.reps) > 0) }))
                    .filter((ex) => ex.sets && ex.sets.length > 0);

                const duration = Math.max(0, Date.now() - (workout.created || Date.now()));
                const completed = { ...workout, duration, exercises: cleanedExercises };

                try {
                    const arr = Array.isArray(global?.userData?.completedWorkouts) ? [...global.userData.completedWorkouts] : [];
                    arr.push(completed);
                    if (global?.userData) {
                        global.userData.completedWorkouts = arr;
                        const dk = (() => {
                            const dd = new Date(completed.created || Date.now()); dd.setHours(0, 0, 0, 0);
                            return `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}-${String(dd.getDate()).padStart(2, "0")}`;
                        })();
                        global.userData.workoutsByDate = { ...(global.userData.workoutsByDate || {}), [dk]: true };
                    }
                } catch { /* ignore */ }

                setCompletedWorkout(completed);
                setIsSummaryModalVisible(true);

                try {
                    const arr = Array.isArray(global?.userData?.currentWorkouts) ? [...global.userData.currentWorkouts] : [];
                    arr.push(completed);
                    if (global?.userData) global.userData.currentWorkouts = arr;
                } catch { /* ignore */ }
            }
            clearCurrentWorkoutLocally();
            if (uid) await updateDoc("users", uid, { currentWorkout: null });
        } catch (e) { console.log("finishWorkout error", e); }
    }, [uid, workout, clearCurrentWorkoutLocally]);

    const postWorkout = useCallback(async () => {
        setIsSummaryModalVisible(false);
        try {
            await navigation.navigate("ProfileStack", { screen: "Profile" });
            navigation.navigate("ProfileStack", { screen: "SelectPhotos", params: { workout: completedWorkout } });
        } catch { /* ignore */ }
    }, [completedWorkout, navigation]);

    /* ------------ Accept-from-invite helper ------------ */
    const joinExternalWorkout = useCallback(async (wid, seed) => {
        try {
            const me = String(uid || global?.userData?.uid || "");
            if (!me || !wid) return;

            // Seed local workout
            const base = seed || (await getDoc(doc(db, "workouts", wid))).data() || {};
            const joined = {
                wid: String(wid),
                creatorUID: base?.creatorUid || me,
                created: Date.now(),
                users: [],
                exercises: [],
                tid: null,
                volume: 0, reps: 0, PBs: 0,
            };
            setWorkout(joined);
            setIsNewWorkoutVisible(true);
            persistCurrentWorkout(joined);
        } catch (e) {
            console.log("joinExternalWorkout error", e);
        }
    }, [uid, persistCurrentWorkout]);

    /* ------------ Rehydrate from Firestore user doc (global.userData) ------------ */
    useEffect(() => {
        const remote = sanitizeWorkout(global?.userData?.currentWorkout);
        if (!workout && remote && remote.created) {
            setWorkout(remote);
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
        workout, setWorkout,
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
