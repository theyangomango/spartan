// hooks/useWorkoutState.js
import { useCallback, useEffect, useRef, useState } from "react";
import { InteractionManager } from "react-native";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase.config";
import updateDoc from "../../backend/helper/firebase/updateDoc";
import makeID from "../../backend/helper/makeID";
import millisToHoursMinutesSeconds from "../helper/millisToHoursMinutesSeconds";

export default function useWorkoutState({ uid, userCurrentWorkout }) {
    const [workout, setWorkout] = useState(null);
    const [headerKey, setHeaderKey] = useState(0);
    const [isNewWorkoutVisible, setIsNewWorkoutVisible] = useState(false);

    const timerRef = useRef("00:00");
    const tIntervalRef = useRef(null);

    // kill stale rehydrations after end/cancel
    const isEndingRef = useRef(false);
    const killSwitchUntilRef = useRef(0);
    const lastServerNulledAtRef = useRef(0);

    const [completedWorkout, setCompletedWorkout] = useState(null);
    const [isSummaryModalVisible, setIsSummaryModalVisible] = useState(false);

    // timer
    useEffect(() => {
        if (workout?.created) {
            tIntervalRef.current = setInterval(() => {
                const diff = Date.now() - workout.created;
                timerRef.current = millisToHoursMinutesSeconds(diff);
            }, 1000);
        }
        return () => clearInterval(tIntervalRef.current);
    }, [workout?.created]);

    const createWorkoutDoc = useCallback(
        async (wid) => {
            await setDoc(
                doc(db, "workouts", wid),
                { wid, creatorUid: uid, createdAt: serverTimestamp(), active: true, members: [uid], updatedAt: serverTimestamp() },
                { merge: true }
            );
        },
        [uid]
    );

    const clearLocal = useCallback(() => {
        try {
            isEndingRef.current = true;
            global.isCurrentlyWorkingOut = false;
            if (global?.userData) global.userData.currentWorkout = null;
        } catch { }
        try {
            clearInterval(tIntervalRef.current);
            tIntervalRef.current = null;
        } catch { }
        timerRef.current = "00:00";
        setIsNewWorkoutVisible(false);
        setWorkout(null);
        setHeaderKey((k) => k + 1);
    }, []);

    const resetEndingGuard = useCallback(() => {
        isEndingRef.current = false;
        killSwitchUntilRef.current = 0;
    }, []);

    const startWorkout = useCallback(
        (template /* null|{exercises, tid?} */) => {
            if (!uid) return;

            resetEndingGuard();

            if (!workout) {
                global.isCurrentlyWorkingOut = true;
                const wid = makeID();

                const newWorkout = {
                    wid,
                    creatorUID: uid,
                    created: Date.now(),
                    users: [],
                    exercises: template?.exercises ? [...template.exercises] : [],
                    tid: template?.tid || template?.id || null,
                    volume: 0,
                    reps: 0,
                    PBs: 0,
                };

                setWorkout(newWorkout);
                setIsNewWorkoutVisible(true);

                InteractionManager.runAfterInteractions(() => {
                    createWorkoutDoc(wid)
                        .then(() => updateDoc("users", uid, { currentWorkout: newWorkout }))
                        .catch((e) => console.log("startWorkout background writes error", e));
                });
            } else {
                setIsNewWorkoutVisible(true);
            }
        },
        [uid, workout, createWorkoutDoc, resetEndingGuard]
    );

    const updateNewWorkout = useCallback((next) => {
        if (isEndingRef.current) return;
        setWorkout(next);
    }, []);

    const cancelWorkout = useCallback(async () => {
        try {
            killSwitchUntilRef.current = Date.now() + 15000;
            clearLocal();
            if (uid) {
                await updateDoc("users", uid, { currentWorkout: null });
                lastServerNulledAtRef.current = Date.now();
            }
        } catch (e) {
            console.log("cancelWorkout error", e);
        }
    }, [uid, clearLocal]);

    const finishWorkout = useCallback(async () => {
        try {
            killSwitchUntilRef.current = Date.now() + 15000;

            if (workout) {
                const cleaned = (Array.isArray(workout.exercises) ? workout.exercises : [])
                    .map((ex) => ({
                        ...ex,
                        sets: (Array.isArray(ex.sets) ? ex.sets : []).filter((s) => Number(s?.weight) > 0 && Number(s?.reps) > 0),
                    }))
                    .filter((ex) => ex.sets && ex.sets.length > 0);

                const duration = Math.max(0, Date.now() - (workout.created || Date.now()));
                const completed = { ...workout, duration, exercises: cleaned };

                setCompletedWorkout(completed);
                setIsSummaryModalVisible(true);

                try {
                    const arr = Array.isArray(global?.userData?.completedWorkouts) ? [...global.userData.completedWorkouts] : [];
                    arr.push(completed);
                    if (global?.userData) global.userData.completedWorkouts = arr;
                } catch { }
            }

            clearLocal();

            if (uid) {
                await updateDoc("users", uid, { currentWorkout: null });
                lastServerNulledAtRef.current = Date.now();
            }
        } catch (e) {
            console.log("finishWorkout error", e);
        }
    }, [uid, workout, clearLocal]);

    // hard suppress stale rehydrate during kill window
    useEffect(() => {
        const now = Date.now();
        const inKill = now < killSwitchUntilRef.current;
        const docHasWorkout = !!userCurrentWorkout;

        if (inKill && docHasWorkout) {
            try {
                if (global?.userData) global.userData.currentWorkout = null;
            } catch { }
            setWorkout(null);
            setHeaderKey((k) => k + 1);

            if (uid && now - lastServerNulledAtRef.current > 1500) {
                updateDoc("users", uid, { currentWorkout: null })
                    .then(() => {
                        lastServerNulledAtRef.current = Date.now();
                    })
                    .catch(() => { });
            }
        }
    }, [userCurrentWorkout, uid]);

    return {
        workout,
        timerRef,
        headerKey,
        isNewWorkoutVisible,
        setIsNewWorkoutVisible,
        startWorkout,
        updateNewWorkout,
        cancelWorkout,
        finishWorkout,
        completedWorkout,
        isSummaryModalVisible,
        setIsSummaryModalVisible,
    };
}
