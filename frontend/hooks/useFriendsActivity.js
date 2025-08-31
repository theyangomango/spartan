import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, query, where, documentId, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.config";

/* ---------- utils (scoped) ---------- */
const toMillis = (v) => {
    if (typeof v === "number") return v;
    if (v instanceof Date) return v.getTime();
    if (v?.toMillis) return v.toMillis();
    if (typeof v?.seconds === "number") return v.seconds * 1000;
    const n = new Date(v).getTime();
    return Number.isFinite(n) ? n : 0;
};

const extractFollowingUids = (userObj) => {
    const raw =
        (Array.isArray(userObj?.following) && userObj.following) ||
        (Array.isArray(global?.userData?.following) && global.userData.following) ||
        [];
    const uids = raw.map((x) => (typeof x === "string" ? x : x?.uid)).filter(Boolean);
    return Array.from(new Set(uids));
};

const chunk10 = (arr) => {
    const out = [];
    for (let i = 0; i < arr.length; i += 10) out.push(arr.slice(i, i + 10));
    return out;
};

const normalizeFriendWorkout = (w, profile) => {
    const created = toMillis(w?.created ?? w?.createdAt);

    let durationMin = 0;
    if (typeof w?.duration === "number") {
        durationMin = w.duration > 60000 ? Math.round(w.duration / 60000) : Math.round(w.duration);
    }

    let setCount = 0;
    if (Array.isArray(w?.exercises)) {
        for (const ex of w.exercises) setCount += Array.isArray(ex?.sets) ? ex.sets.length : 0;
    }

    return {
        id: w?.wid || w?.id || `${profile.uid}_${created || Math.random().toString(36).slice(2)}`,
        uid: profile.uid,
        name: profile.name || profile.handle || "Friend",
        handle: profile.handle || "",
        pfp: profile.pfp || "",
        live: false,
        created: created || 0,
        finishedAt:
            toMillis(w?.finishedAt) || (created || 0) + (typeof w?.duration === "number" ? w.duration : 0),
        exercises: Array.isArray(w?.exercises) ? w.exercises.length : Number(w?.exercises || 0),
        sets: setCount || Number(w?.sets || 0),
        duration: durationMin,
        volume: Number(w?.volume || 0),
        reps: Number(w?.reps || 0),
        PBs: Number(w?.PBs ?? w?.pbs ?? 0),
        calories: Number(w?.calories || 0),
        templateName: w?.templateName || w?.template?.name || w?.template || w?.name || "Workout",
        wid: w?.wid || undefined,
    };
};

const normalizeFriendLive = (cw, profile) => {
    const started = toMillis(cw?.startedAt ?? cw?.created);
    return {
        id: `live_${profile.uid}_${cw?.wid || cw?.id || started || Math.random().toString(36).slice(2)}`,
        uid: profile.uid,
        name: profile.name || profile.handle || "Friend",
        handle: profile.handle || "",
        pfp: profile.pfp || "",
        live: true,
        startedAt: started || Date.now(),
        created: toMillis(cw?.created) || started || Date.now(),
        volume: Number(cw?.volume || 0),
        PBs: Number(cw?.PBs ?? cw?.pbs ?? 0),
        duration:
            typeof cw?.duration === "number"
                ? Math.round(cw.duration > 60000 ? cw.duration / 60000 : cw.duration)
                : cw?.duration,
        templateName: cw?.templateName || cw?.template?.name || cw?.title || "Workout",
        wid: cw?.wid || cw?.id,
    };
};

const bestTs = (it) =>
    Math.max(toMillis(it?.created) || 0, toMillis(it?.startedAt) || 0, toMillis(it?.finishedAt) || 0);

/* ---------- hook (realtime) ---------- */
export default function useFriendsActivity(user) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const lastNonEmptyRef = useRef([]);

    // Hold the latest user docs we receive across multiple listeners (chunks of 10)
    const userDocMapRef = useRef(new Map());
    const unsubsRef = useRef([]);

    const buildItemsFromMap = useCallback(() => {
        const results = [];
        for (const [uid, data] of userDocMapRef.current.entries()) {
            const profile = {
                uid,
                name: data.name || data.displayName || "",
                handle: data.handle || data.username || "",
                pfp: data.pfp || data.image || data.photoURL || "",
            };

            const cw = data?.currentWorkout;
            if (cw && (cw.created || cw.startedAt)) {
                results.push(normalizeFriendLive(cw, profile));
            }

            const completed = Array.isArray(data?.completedWorkouts) ? data.completedWorkouts : [];
            const recent = completed.slice(-5);
            for (const w of recent) {
                results.push(normalizeFriendWorkout(w, profile));
            }
        }

        results.sort((a, b) => bestTs(b) - bestTs(a));
        setItems(results);
        if (results.length) lastNonEmptyRef.current = results;
    }, []);

    const clearListeners = useCallback(() => {
        for (const u of unsubsRef.current) {
            try { u(); } catch { }
        }
        unsubsRef.current = [];
        userDocMapRef.current.clear();
    }, []);

    const refresh = useCallback(() => {
        const followingUids = extractFollowingUids(user);
        if (!followingUids.length) {
            clearListeners();
            setItems([]);
            return;
        }

        setLoading(true);
        clearListeners();

        const chunks = chunk10(followingUids);
        for (const group of chunks) {
            const q = query(collection(db, "users"), where(documentId(), "in", group));
            const unsub = onSnapshot(
                q,
                (snap) => {
                    snap.forEach((docSnap) => {
                        userDocMapRef.current.set(docSnap.id, docSnap.data() || {});
                    });
                    buildItemsFromMap();
                },
                (err) => {
                    console.log("friendsActivity realtime error", err);
                }
            );
            unsubsRef.current.push(unsub);
        }

        setLoading(false);
    }, [user, clearListeners, buildItemsFromMap]);

    // Start realtime subscription when the hook mounts / user changes
    useEffect(() => {
        refresh();
        return () => clearListeners();
    }, [refresh, clearListeners]);

    // Expose cached items to avoid empty flashes during any intermediary state
    const hydratedItems = useMemo(
        () => (items.length ? items : lastNonEmptyRef.current),
        [items]
    );

    return { items: hydratedItems, refresh, loading };
}
