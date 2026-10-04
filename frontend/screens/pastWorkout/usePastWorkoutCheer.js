// Cheer action of the PastWorkout screen for a live workout: lazy confetti loader, confetti trigger and the "cheer" event.

import { useCallback, useRef, useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

import { db } from "../../../firebase.config";
import { resolvePhotoURL } from "../../utils/profilePhoto";
import { strong as hapticStrong } from "../../utils/haptics";

const usePastWorkoutCheer = ({ isLiveWorkout, workoutWid }) => {
    const [confettiTick, setConfettiTick] = useState(0);
    const confettiRef = useRef(null);
    const ConfettiModuleRef = useRef(null);
    const loadConfettiModule = useCallback(() => {
        if (!ConfettiModuleRef.current) {
            try { ConfettiModuleRef.current = require("react-native-confetti-cannon").default; } catch { }
        }
        return ConfettiModuleRef.current;
    }, []);
    const fireConfetti = useCallback(() => {
        loadConfettiModule();
        try {
            const api = confettiRef.current;
            if (api && typeof api.start === "function") {
                api.start();
                return;
            }
        } catch { }
        setConfettiTick((t) => t + 1);
    }, [loadConfettiModule]);
    const sendCheerEvent = useCallback(async () => {
        if (!isLiveWorkout) return;
        try {
            const wid = workoutWid;
            if (!wid) return;
            const fromUid = String(global?.userData?.uid || "");
            if (!fromUid) return;
            const fromHandle = String(global?.userData?.handle || "");
            const fromName = String(global?.userData?.name || "");
            const fromPfp = resolvePhotoURL(global?.userData, "");
            const fromPfpVersion = Number(global?.userData?.pfpVersion ?? 0);
            await addDoc(collection(db, "workouts", wid, "events"), {
                type: "cheer",
                fromUid,
                fromHandle,
                fromName,
                fromPfp,
                fromPfpVersion,
                createdAt: serverTimestamp(),
                source: "workout_viewer",
            });
        } catch (e) {
            console.log("PastWorkoutScreen cheer error", e?.message || e);
        }
    }, [isLiveWorkout, workoutWid]);

    const handleCheer = useCallback(() => {
        try { hapticStrong(); } catch { }
        fireConfetti();
        sendCheerEvent();
    }, [fireConfetti, sendCheerEvent]);

    return { confettiTick, confettiRef, loadConfettiModule, handleCheer };
};

export default usePastWorkoutCheer;
