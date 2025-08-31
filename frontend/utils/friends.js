// screens/Workout/utils/friends.js
import makeID from "../../backend/helper/makeID";

export const toMillis = (v) => {
    if (typeof v === "number") return v;
    if (v instanceof Date) return v.getTime();
    if (v?.toMillis) return v.toMillis();
    if (typeof v?.seconds === "number") return v.seconds * 1000;
    const n = new Date(v).getTime();
    return Number.isFinite(n) ? n : 0;
};

export const extractFollowingUids = (userObj) => {
    const raw =
        (Array.isArray(userObj?.following) && userObj.following) ||
        (Array.isArray(global?.userData?.following) && global.userData.following) ||
        [];
    const uids = raw.map((x) => (typeof x === "string" ? x : x?.uid)).filter(Boolean);
    return Array.from(new Set(uids));
};

export const chunk10 = (arr) => {
    const out = [];
    for (let i = 0; i < arr.length; i += 10) out.push(arr.slice(i, i + 10));
    return out;
};

export const normalizeFriendWorkout = (w, profile) => {
    const created = toMillis(w?.created ?? w?.createdAt);
    let durationMin = 0;
    if (typeof w?.duration === "number") {
        durationMin = w.duration > 60000 ? Math.round(w.duration / 60000) : Math.round(w.duration);
    }
    let setCount = 0;
    if (Array.isArray(w?.exercises)) {
        for (const ex of w.exercises) {
            setCount += Array.isArray(ex?.sets) ? ex.sets.length : 0;
        }
    }
    return {
        id: w?.wid || w?.id || `${profile.uid}_${created || makeID()}`,
        uid: profile.uid,
        name: profile.name || profile.handle || "Friend",
        handle: profile.handle || "",
        pfp: profile.pfp || "",
        live: false,
        created: created || 0,
        finishedAt:
            toMillis(w?.finishedAt) ||
            (created || 0) + (typeof w?.duration === "number" ? w.duration : 0),
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

export const normalizeFriendLive = (cw, profile) => {
    const started = toMillis(cw?.startedAt ?? cw?.created);
    return {
        id: `live_${profile.uid}_${cw?.wid || cw?.id || started || makeID()}`,
        uid: profile.uid,
        name: profile.name || profile.handle || "Friend",
        handle: profile.handle || "",
        pfp: profile.pfp || "",
        live: true,
        startedAt: started || Date.now(),
        created: toMillis(cw?.created) || started || Date.now(),
        volume: Number(cw?.volume || 0),
        PBs: Number(cw?.PBs ?? cw?.pbs ?? 0),
        duration: typeof cw?.duration === "number"
            ? Math.round((cw.duration > 60000 ? cw.duration / 60000 : cw.duration))
            : cw?.duration,
        templateName: cw?.templateName || cw?.template?.name || cw?.title || "Workout",
        wid: cw?.wid || cw?.id,
    };
};
