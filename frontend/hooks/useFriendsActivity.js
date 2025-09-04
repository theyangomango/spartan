import { useCallback, useEffect, useState } from "react";
import { collection, getDocs, query, where, documentId } from "firebase/firestore";
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
        pfpVersion: profile.pfpVersion ?? 0,
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
        workout: { creatorUID: w?.creatorUID || w?.creatorUid || profile.uid, ...w }, // ensure ownership present for viewer
    };
};

// Live/current workout -> normalized list item
const normalizeLiveWorkout = (cw, profile) => {
    if (!cw || typeof cw !== "object") return null;
    // Pick a sane start timestamp
    const started = toMillis(cw.startedAt ?? cw.createdAt ?? cw.created ?? cw.start ?? cw.startTime);
    const exercisesArr = Array.isArray(cw.exercises) ? cw.exercises : [];
    let setCount = 0;
    for (const ex of exercisesArr) setCount += Array.isArray(ex?.sets) ? ex.sets.length : 0;

    const wid = cw.wid || cw.id || undefined;
    return {
        id: wid || `live_${profile.uid}`,
        uid: profile.uid,
        name: profile.name || profile.handle || "Friend",
        handle: profile.handle || "",
        pfp: profile.pfp || "",
        pfpVersion: profile.pfpVersion ?? 0,
        live: true,
        startedAt: started || Date.now(),
        created: started || Date.now(),

        // stats (live, will be overlaid by FriendsActivitySheet listener)
        duration: Number(cw?.duration || 0),
        volume: Number(cw?.volume || 0),
        reps: Number(cw?.reps || 0),
        PBs: Number(cw?.PBs ?? cw?.pbs ?? 0),

        // viewer payload
        exercises: exercisesArr,
        exerciseCount: exercisesArr.length,
        sets: setCount,
        templateName: cw?.templateName || cw?.template?.name || cw?.template || cw?.name || "Workout",
        wid,
        workout: {
            creatorUID: cw?.creatorUID || cw?.creatorUid || profile.uid,
            ...cw,
            wid,
            created: started || Date.now(),
        },
    };
};

const bestTs = (it) =>
    Math.max(toMillis(it?.created) || 0, toMillis(it?.startedAt) || 0, toMillis(it?.finishedAt) || 0);

/* ---------- hook ---------- */
export default function useFriendsActivity(user) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

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
                        pfpVersion: data.pfpVersion ?? data.version ?? 0,
                        currentWorkout: data?.currentWorkout || null,
                        completedWorkouts: Array.isArray(data?.completedWorkouts) ? data.completedWorkouts : [],
                    });
                });
            }

            // Build a map keyed by uid:wid to dedupe
            const map = new Map();
            const keyOf = (u, w) => `${u}:${String(w?.wid || w?.id || '')}`;

            // Helper: validate a completed workout entry truly belongs to this friend and is sane
            const isValidCompleted = (w, uid) => {
                if (!w || typeof w !== 'object') return false;
                // Ownership guard: if any owner field exists, it must match the friend uid
                const owner = String(w?.creatorUID || w?.creatorUid || w?.uid || '');
                if (owner && owner !== String(uid)) return false;
                // Time sanity: must have a plausible timestamp
                const ts = toMillis(w?.finishedAt ?? w?.createdAt ?? w?.created);
                if (!Number.isFinite(ts) || ts <= 0) return false;
                if (ts > Date.now() + 24 * 60 * 60 * 1000) return false; // reject far-future
                return true;
            };

            // Only from recent completed (last 5 valid)
            for (const p of profiles) {
                // walk from newest backwards, collect up to 5 valid entries
                const recentValid = [];
                for (let i = p.completedWorkouts.length - 1; i >= 0 && recentValid.length < 5; i--) {
                    const w = p.completedWorkouts[i];
                    if (isValidCompleted(w, p.uid)) recentValid.push(w);
                }
                recentValid.reverse();
                for (const w of recentValid) {
                    const item = normalizeFriendWorkout(w, p);
                    if (item.wid) map.set(keyOf(p.uid, item), item); else map.set(`${p.uid}:${bestTs(item)}`, item);
                }
            }

            // Add current (live) workouts, overriding any duplicate wid entries
            for (const p of profiles) {
                const cw = p.currentWorkout;
                if (!cw || typeof cw !== 'object') continue;
                const liveItem = normalizeLiveWorkout(cw, p);
                if (!liveItem) continue;
                if (liveItem.wid) {
                    map.set(keyOf(p.uid, liveItem), liveItem);
                } else {
                    // No wid — use a stable live key per user
                    map.set(`${p.uid}:__live__`, liveItem);
                }
            }

            const results = Array.from(map.values()).sort((a, b) => bestTs(b) - bestTs(a));
            setItems(results);
        } catch (e) {
            console.log("friendsActivity fetch error", e);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { items, refresh, loading };
}
