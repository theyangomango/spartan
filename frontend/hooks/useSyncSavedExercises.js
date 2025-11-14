import { useEffect, useRef, useState } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase.config";
import { subscribeUserData } from "../utils/userDataEvents";
import { getViewerUid } from "../utils/userRefs";

const normalizeSavedExercisesMap = (raw) => {
    if (!raw) return {};

    const map = {};
    const assign = (fallbackName, entry = {}) => {
        const rawName = entry?.name ?? fallbackName ?? entry;
        const name = typeof rawName === "string" ? rawName.trim() : "";
        if (!name) return;
        const muscleGroup = entry?.muscleGroup ?? entry?.muscle ?? null;
        const slug = entry?.slug ?? null;
        const muscle = entry?.muscle ?? entry?.muscleGroup ?? muscleGroup ?? null;
        map[name] = {
            name,
            muscleGroup: muscleGroup ? String(muscleGroup) : null,
            muscle: muscle ? String(muscle) : null,
            slug: slug ? String(slug) : null,
        };
    };

    if (typeof raw === "string") {
        assign(raw);
        return map;
    }

    if (Array.isArray(raw)) {
        raw.forEach((entry) => {
            if (entry == null) return;
            if (typeof entry === "string") {
                assign(entry);
            } else if (typeof entry === "object") {
                assign(entry?.name, entry);
            }
        });
        return map;
    }

    if (typeof raw === "object") {
        Object.entries(raw).forEach(([key, value]) => {
            if (value == null) return;
            if (typeof value === "string") {
                assign(value || key);
            } else if (typeof value === "object") {
                assign(value?.name || key, value);
            } else {
                assign(key);
            }
        });
        return map;
    }

    return map;
};

const buildArray = (value) => {
    return Object.values(normalizeSavedExercisesMap(value)).sort((a, b) =>
        a.name.localeCompare(b.name)
    );
};

const savedExercisesSignature = (value) => {
    const arr = buildArray(value);
    return JSON.stringify(
        arr.map(({ name, muscleGroup, muscle, slug }) => [
            name,
            muscleGroup,
            muscle,
            slug,
        ])
    );
};

export default function useSyncSavedExercises(savedExercisesMap) {
    const initializedRef = useRef(false);
    const lastSignatureRef = useRef("");
    const [viewerUid, setViewerUid] = useState(() => getViewerUid());

    // Keep global mirror in sync for legacy consumers
    useEffect(() => {
        try {
            if (!global.userData) global.userData = {};
            const nextSig = savedExercisesSignature(savedExercisesMap);
            const currentGlobal = global.userData.savedExercises;
            const globalSig = savedExercisesSignature(currentGlobal);
            const hasGlobalValue = Object.prototype.hasOwnProperty.call(
                global.userData,
                "savedExercises"
            );
            if (nextSig === globalSig && hasGlobalValue) return;
            global.userData.savedExercises = savedExercisesMap || {};
        } catch {
            // ignore
        }
    }, [savedExercisesMap]);

    useEffect(() => {
        const unsubscribe = subscribeUserData(() => {
            const nextUid = getViewerUid();
            setViewerUid((prev) => (prev === nextUid ? prev : nextUid));
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (!viewerUid) return;

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
            const payloadFactory = () => ({
                savedExercises: arr,
                savedExercisesUpdatedAt: serverTimestamp(),
            });
            const targets = ["users", "usersPublic"];

            await Promise.all(
                targets.map(async (collectionName) => {
                    try {
                        await setDoc(
                            doc(db, collectionName, viewerUid),
                            payloadFactory(),
                            { merge: true }
                        );
                    } catch (err) {
                        console.log(
                            `Failed to persist saved exercises to ${collectionName}:`,
                            err?.message || err
                        );
                    }
                })
            );
        };

        persist();
    }, [savedExercisesMap, viewerUid]);
}

