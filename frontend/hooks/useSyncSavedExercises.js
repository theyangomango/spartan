import { useEffect, useRef } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase.config";

const buildArray = (savedExercisesMap) => {
    const entries = savedExercisesMap && typeof savedExercisesMap === "object"
        ? Object.values(savedExercisesMap)
        : [];

    return entries
        .map((entry) => {
            if (!entry) return null;
            const name = String(entry?.name || "").trim();
            if (!name) return null;
            const muscleGroup = entry?.muscleGroup ?? entry?.muscle ?? null;
            const slug = entry?.slug ?? null;
            return {
                name,
                muscleGroup: muscleGroup ? String(muscleGroup) : null,
                muscle: entry?.muscle ? String(entry.muscle) : (muscleGroup ? String(muscleGroup) : null),
                slug: slug ? String(slug) : null,
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name));
};

export default function useSyncSavedExercises(savedExercisesMap) {
    const initializedRef = useRef(false);
    const lastSignatureRef = useRef("");

    // Keep global mirror in sync for legacy consumers
    useEffect(() => {
        try {
            if (!global.userData) global.userData = {};
            global.userData.savedExercises = savedExercisesMap || {};
        } catch {
            // ignore
        }
    }, [savedExercisesMap]);

    useEffect(() => {
        const uid = (() => {
            try {
                return global?.userData?.uid || global?.userData?.id || "";
            } catch {
                return "";
            }
        })();
        if (!uid) return;

        const arr = buildArray(savedExercisesMap);
        const signature = JSON.stringify(arr);

        if (!initializedRef.current) {
            initializedRef.current = true;
            lastSignatureRef.current = signature;
            return;
        }

        if (lastSignatureRef.current === signature) return;
        lastSignatureRef.current = signature;

        const persist = async () => {
            try {
                await setDoc(
                    doc(db, "users", uid),
                    {
                        savedExercises: arr,
                        savedExercisesUpdatedAt: serverTimestamp(),
                    },
                    { merge: true }
                );
            } catch (err) {
                console.log("Failed to persist saved exercises:", err?.message || err);
            }
        };

        persist();
    }, [savedExercisesMap]);
}

