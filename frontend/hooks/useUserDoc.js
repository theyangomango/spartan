// hooks/useUserDoc.js
import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot, updateDoc as fsUpdateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase.config";
import updateDoc from "../../backend/helper/firebase/updateDoc";
import computeHexagonStats from "../logic/computeHexagonStats";
import { emitHexagonUpdate } from "../utils/hexagonEvents";
import { emitUserDataUpdate } from "../utils/userDataEvents";

/**
 * Subscribes to users/{uid}, returns {user} and also writes into global.userData.
 * No deep deps on global.* so we avoid update loops.
 */
export default function useUserDoc(uid, options = {}) {
    const { ignoreKeys = [] } = options || {};
    const prevRef = useRef(null);
    // Helper lives outside render for reuse below
    const stripKeys = (obj, keys) => {
        if (!obj || typeof obj !== "object") return obj;
        if (!Array.isArray(keys) || keys.length === 0) return obj;
        const out = {};
        for (const k of Object.keys(obj)) {
            if (!keys.includes(k)) out[k] = obj[k];
        }
        return out;
    };

    const normalizeSavedExercises = (raw) => {
        if (!raw) return {};
        if (Array.isArray(raw)) {
            return raw.reduce((acc, entry) => {
                if (!entry) return acc;
                const name = String(entry?.name || entry).trim();
                if (!name) return acc;
                const muscleGroup = entry?.muscleGroup ?? entry?.muscle ?? null;
                acc[name] = {
                    name,
                    muscleGroup,
                    muscle: entry?.muscle ?? entry?.muscleGroup ?? muscleGroup ?? null,
                    slug: entry?.slug ?? null,
                };
                return acc;
            }, {});
        }
        if (typeof raw === "object") {
            return Object.entries(raw).reduce((acc, [key, value]) => {
                const name = String(value?.name || key).trim();
                if (!name) return acc;
                const muscleGroup = value?.muscleGroup ?? value?.muscle ?? null;
                acc[name] = {
                    name,
                    muscleGroup,
                    muscle: value?.muscle ?? value?.muscleGroup ?? muscleGroup ?? null,
                    slug: value?.slug ?? null,
                };
                return acc;
            }, {});
        }
        return {};
    };

    // Seed from global.userData if already available to avoid initial flash
    const [user, setUser] = useState(() => {
        try {
            const g = global?.userData;
            if (uid && g && (g.uid === uid || g.id === uid)) {
                return stripKeys(g, ignoreKeys);
            }
        } catch {}
        return null;
    });

    // pre-seed global with uid so other code that reads global has it immediately
    useEffect(() => {
        if (uid) {
            global.userData = { ...(global.userData || {}), uid, id: uid };
        }
    }, [uid]);

    useEffect(() => {
        if (!uid) return;
        const unsub = onSnapshot(doc(db, "users", uid), (snap) => {
            const rawData = snap.data() || {};
            const data = { ...rawData, savedExercises: normalizeSavedExercises(rawData?.savedExercises) };
            const local = (() => { try { return global?.userData?.templates; } catch { return undefined; } })();
            const localSig = (() => { try { return global?.__templatesLocalSig; } catch { return undefined; } })();
            const remoteSig = JSON.stringify(data?.templates || []);
            const keepLocal = (() => { try { return !!global?.__templatesDirty && !!localSig && localSig !== remoteSig; } catch { return false; } })();

            // If we have a recent local edit not yet reflected remotely, prefer it
            const dataForUser = keepLocal && Array.isArray(local)
                ? { ...data, templates: local }
                : data;

            // If remote now matches local, clear dirty flag
            try { if (!keepLocal && localSig && localSig === remoteSig) global.__templatesDirty = false; } catch {}

            // keep global in sync for legacy consumers (full object)
            const mergedForGlobal = { ...(global.userData || {}), ...dataForUser, uid, id: uid };
            global.userData = mergedForGlobal;
            emitUserDataUpdate();

            // apply ignoreKeys to reduce needless rerenders in interested screens
            const cmp = stripKeys(dataForUser, ignoreKeys);

            // shallow compare against previous
            const prev = prevRef.current;
            let changed = false;
            if (!prev) changed = true;
            else {
                const aKeys = Object.keys(cmp);
                const bKeys = Object.keys(prev);
                if (aKeys.length !== bKeys.length) changed = true;
                else {
                    for (const k of aKeys) {
                        if (prev[k] !== cmp[k]) { changed = true; break; }
                    }
                }
            }
            if (changed) {
                prevRef.current = cmp;
                setUser(cmp);
            }

            // Opportunistic hexagon refresh: if missing or stale, recompute in background.
            try {
                const lastAt = Number(data?.statsHexagonMeta?.updatedAt?.toMillis?.() || new Date(data?.statsHexagonMeta?.updatedAt || 0).getTime() || 0);
                const ageMs = Date.now() - lastAt;
                const needs = !data?.statsHexagon || ageMs > 6 * 3600 * 1000; // 6h
                const can = !global.__hexagonComputeLock;
                if (needs && can) {
                    global.__hexagonComputeLock = true;
                    const { statsHexagon: nextHex, lastTrained } = computeHexagonStats({
                        statsExercises: data?.statsExercises || {},
                        prevStatsHexagon: data?.statsHexagon || {},
                        trainedExerciseNames: [],
                    });
                    const payload = { statsHexagon: nextHex, statsHexagonMeta: { lastTrainedByGroup: lastTrained, updatedAt: serverTimestamp() } };
                    fsUpdateDoc(doc(db, 'users', uid), payload)
                        .catch(() => updateDoc('users', uid, payload))
                        .finally(() => { try { global.__hexagonComputeLock = false; } catch { } });
                    try { global.userData.statsHexagon = nextHex; emitHexagonUpdate(); } catch {}
                }
            } catch { }
        });
        return () => unsub();
    }, [uid, ignoreKeys.join("|")]);

    return user; // may be null during first paint
}
