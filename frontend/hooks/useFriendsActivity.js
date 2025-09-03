import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, getDocs, query, where, documentId, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase.config";

/* ---------- utils ---------- */
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

    // preserve full exercises array for viewer
    const exercisesArr = Array.isArray(w?.exercises) ? w.exercises : [];
    let setCount = 0;
    for (const ex of exercisesArr) setCount += Array.isArray(ex?.sets) ? ex.sets.length : 0;

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

        // stats
        duration: typeof w?.duration === "number"
            ? (w.duration > 60000 ? Math.round(w.duration / 60000) : Math.round(w.duration))
            : Number(w?.duration || 0),
        volume: Number(w?.volume || 0),
        reps: Number(w?.reps || 0),
        PBs: Number(w?.PBs ?? w?.pbs ?? 0),

        // viewer payload
        exercises: exercisesArr,
        exerciseCount: exercisesArr.length,
        sets: setCount,
        templateName: w?.templateName || w?.template?.name || w?.template || w?.name || "Workout",
        wid: w?.wid || undefined,
        workout: { ...w }, // pass through the original workout object for the viewer
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

        // include minimal workout shell so NewWorkoutModal can live-subscribe via wid
        workout: {
            wid: cw?.wid || cw?.id,
            creatorUID: profile.uid,
            created: started || Date.now(),
            exercises: Array.isArray(cw?.exercises) ? cw.exercises : [],
            volume: Number(cw?.volume || 0),
            PBs: Number(cw?.PBs ?? cw?.pbs ?? 0),
        },
    };
};

const bestTs = (it) =>
    Math.max(toMillis(it?.created) || 0, toMillis(it?.startedAt) || 0, toMillis(it?.finishedAt) || 0);

/* ---------- hook ---------- */
export default function useFriendsActivity(user) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const lastNonEmptyRef = useRef([]); // cache to avoid blank first-open

    const refresh = useCallback(async () => {
        try {
            const followingUids = extractFollowingUids(user);
            if (!followingUids.length) {
                setItems([]);
                return;
            }
            setLoading(true);

            // Collect profiles (batched) first
            const profiles = [];
            for (const group of chunk10(followingUids)) {
                const q = query(collection(db, "users"), where(documentId(), "in", group));
                const snap = await getDocs(q);
                snap.forEach((docSnap) => {
                    const data = docSnap.data() || {};
                    profiles.push({
                        uid: docSnap.id,
                        name: data.name || data.displayName || "",
                        handle: data.handle || data.username || "",
                        pfp: data.pfp || data.image || data.photoURL || "",
                        currentWorkout: data?.currentWorkout || null,
                        completedWorkouts: Array.isArray(data?.completedWorkouts) ? data.completedWorkouts : [],
                    });
                });
            }

            // Build a map keyed by uid:wid to dedupe multiple sources (completed vs pulses)
            const map = new Map();
            const keyOf = (u, w) => `${u}:${String(w?.wid || w?.id || '')}`;

            // From current + recent completed (last 5)
            for (const p of profiles) {
                if (p.currentWorkout && (p.currentWorkout.created || p.currentWorkout.startedAt)) {
                    const item = normalizeFriendLive(p.currentWorkout, p);
                    map.set(`live:${p.uid}`, item);
                }
                const recent = p.completedWorkouts.slice(-5);
                for (const w of recent) {
                    const item = normalizeFriendWorkout(w, p);
                    if (item.wid) map.set(keyOf(p.uid, item), item); else map.set(`${p.uid}:${bestTs(item)}`, item);
                }
            }

            // Also hydrate from workout pulses (ensures we don't miss workouts if completedWorkouts wasn't updated)
            const pulsePromises = profiles.map(async (p) => {
                try {
                    const pq = query(collection(db, "users", p.uid, "pulse"), orderBy("ts", "desc"), limit(10));
                    const ps = await getDocs(pq);
                    ps.forEach((d) => {
                        const pv = d.data() || {};
                        if ((pv?.type || '').toLowerCase() !== 'workout') return;
                        const wid = String(pv?.workoutID || "");
                        const tsNum = toMillis(pv?.ts || 0) || Date.now();
                        const k = wid ? `${p.uid}:${wid}` : `${p.uid}:${tsNum}`;
                        if (map.has(k)) return; // already have a richer object
                        // Minimal fallback item from pulse
                        const item = {
                            id: wid || `pulse_${p.uid}_${tsNum}`,
                            uid: p.uid,
                            name: p.name || p.handle || 'Friend',
                            handle: p.handle || '',
                            pfp: p.pfp || '',
                            live: false,
                            created: tsNum,
                            finishedAt: tsNum,
                            duration: 0,
                            volume: 0,
                            reps: 0,
                            PBs: 0,
                            exercises: [],
                            exerciseCount: 0,
                            sets: 0,
                            templateName: pv?.detail || 'Workout',
                            wid: wid || undefined,
                            workout: { wid: wid || undefined, creatorUID: p.uid, created: tsNum, exercises: [] },
                        };
                        map.set(k, item);
                    });
                } catch {}
            });
            await Promise.all(pulsePromises);

            const results = Array.from(map.values()).sort((a, b) => bestTs(b) - bestTs(a));
            setItems(results);
            if (results.length) lastNonEmptyRef.current = results;
        } catch (e) {
            console.log("friendsActivity fetch error", e);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const hydratedItems = useMemo(
        () => (items.length ? items : lastNonEmptyRef.current),
        [items]
    );

    return { items: hydratedItems, refresh, loading };
}
