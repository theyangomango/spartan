import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, getDocs, query, where, documentId, onSnapshot, doc } from "firebase/firestore";
import { db } from "../../firebase.config";
/* ---------- utils ---------- */
const toMillis = (v) => {
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime();
  if (v?.toMillis) return v.toMillis();
  if (typeof v?.seconds === 'number') return v.seconds * 1000;
  const n = new Date(v).getTime();
  return Number.isFinite(n) ? n : 0;
};

const normalizeList = (arr) => {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => (typeof x === 'string' ? x : x?.uid))
    .filter(Boolean)
    .map(String);
};

const extractViewerData = (userObj) => {
  if (userObj) return userObj;
  try {
    return global?.userData || null;
  } catch {
    return null;
  }
};

const extractMutualFriendUids = (userObj) => {
  const viewer = extractViewerData(userObj);
  if (!viewer?.uid) return [];

  const following = new Set(normalizeList(viewer.following || global?.userData?.following));
  const followers = new Set(normalizeList(viewer.followers || global?.userData?.followers));

  const mutual = [];
  following.forEach((uid) => {
    if (followers.has(uid)) mutual.push(uid);
  });

  return mutual.filter((uid) => uid !== String(viewer.uid));
};

const chunk10 = (arr) => {
  const out = [];
  for (let i = 0; i < arr.length; i += 10) out.push(arr.slice(i, i + 10));
  return out;
};

const coerceWeeklyGoal = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.round(num);
};

const normalizeCompletedWorkout = (w, profile) => {
  if (!w || typeof w !== 'object') return null;
  const created = toMillis(w?.created ?? w?.createdAt ?? w?.date);

  const exercisesArr = Array.isArray(w?.exercises) ? w.exercises : [];
  let setCount = 0;
  for (const ex of exercisesArr) setCount += Array.isArray(ex?.sets) ? ex.sets.length : 0;

  return {
    id: w?.wid || w?.id || `${profile.uid}_${created || Math.random().toString(36).slice(2)}`,
    uid: profile.uid,
    name: profile.name || profile.handle || 'Friend',
    handle: profile.handle || '',
    pfp: profile.pfp || '',
    pfpVersion: profile.pfpVersion ?? 0,
    weeklyGoal: coerceWeeklyGoal(profile?.weeklyWorkoutGoal ?? profile?.weeklyGoal ?? profile?.goal),
    live: false,
    created: created || 0,
    finishedAt:
      toMillis(w?.finishedAt) || (created || 0) + (typeof w?.duration === 'number' ? w.duration : 0),

    duration: typeof w?.duration === 'number'
      ? (w.duration > 60000 ? Math.round(w.duration / 60000) : Math.round(w.duration))
      : Number(w?.duration || 0),
    volume: Number(w?.volume || 0),
    reps: Number(w?.reps || 0),
    PBs: Number(w?.PBs ?? w?.pbs ?? 0),
    privacyMode: w?.privacyMode ?? 'global',

    exercises: exercisesArr,
    exerciseCount: exercisesArr.length,
    sets: setCount,
    templateName: w?.templateName || w?.template?.name || w?.template || w?.name || 'Workout',
    wid: w?.wid || undefined,
    workout: {
      creatorUID: w?.creatorUID || w?.creatorUid || profile.uid,
      ...w,
      privacyMode: w?.privacyMode ?? 'global',
    },
  };
};

const normalizeLiveWorkout = (cw, profile) => {
  if (!cw || typeof cw !== 'object') return null;
  const started = toMillis(cw.startedAt ?? cw.createdAt ?? cw.created ?? cw.start ?? cw.startTime);
  const exercisesArr = Array.isArray(cw.exercises) ? cw.exercises : [];
  let setCount = 0;
  for (const ex of exercisesArr) setCount += Array.isArray(ex?.sets) ? ex.sets.length : 0;

  const wid = cw.wid || cw.id || undefined;
  return {
    id: wid || `live_${profile.uid}`,
    uid: profile.uid,
    name: profile.name || profile.handle || 'Friend',
    handle: profile.handle || '',
    pfp: profile.pfp || '',
    pfpVersion: profile.pfpVersion ?? 0,
    weeklyGoal: coerceWeeklyGoal(profile?.weeklyWorkoutGoal ?? profile?.weeklyGoal ?? profile?.goal),
    live: true,
    startedAt: started || Date.now(),
    created: started || Date.now(),

    duration: Number(cw?.duration || 0),
    volume: Number(cw?.volume || 0),
    reps: Number(cw?.reps || 0),
    PBs: Number(cw?.PBs ?? cw?.pbs ?? 0),
    privacyMode: cw?.privacyMode ?? 'global',

    exercises: exercisesArr,
    exerciseCount: exercisesArr.length,
    sets: setCount,
    templateName: cw?.templateName || cw?.template?.name || cw?.template || cw?.name || 'Workout',
    wid,
    workout: {
      creatorUID: cw?.creatorUID || cw?.creatorUid || profile.uid,
      ...cw,
      wid,
      created: started || Date.now(),
      privacyMode: cw?.privacyMode ?? 'global',
    },
  };
};

const bestTs = (it) => Math.max(toMillis(it?.created) || 0, toMillis(it?.startedAt) || 0, toMillis(it?.finishedAt) || 0);

/* ---------- hook ---------- */
export default function useCommunityActivity(user, enabled = true) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const viewerData = useMemo(() => extractViewerData(user), [user]);
  const viewerUid = viewerData?.uid ? String(viewerData.uid) : '';
  const friendKey = useMemo(() => JSON.stringify(extractMutualFriendUids(user)), [user, viewerData?.following, viewerData?.followers]);

  const profilesRef = useRef(new Map());
  const listenersRef = useRef(new Map());

  const keyOf = useCallback((uid, workout) => `${uid}:${String(workout?.wid || workout?.id || bestTs(workout) || Math.random())}`, []);

  const takeRecentValid = useCallback((list, uid, limit = 5) => {
    if (!Array.isArray(list) || !list.length) return [];
    const recent = [];
    for (let i = list.length - 1; i >= 0 && recent.length < limit; i -= 1) {
      const w = list[i];
      if (!w || typeof w !== 'object') continue;
      const owner = String(w?.creatorUID || w?.creatorUid || w?.uid || uid);
      if (owner && owner !== String(uid)) continue;
      const ts = toMillis(w?.finishedAt ?? w?.createdAt ?? w?.created);
      if (!Number.isFinite(ts) || ts <= 0) continue;
      if (ts > Date.now() + 24 * 60 * 60 * 1000) continue;
      recent.push(w);
    }
    return recent.reverse();
  }, []);

  const rebuildItems = useCallback((profilesMap) => {
    const map = new Map();
    const addItem = (item) => {
      if (!item) return;
      map.set(keyOf(item.uid, item), item);
    };

    profilesMap.forEach((profile) => {
      if (!profile) return;
      takeRecentValid(profile.completedWorkouts, profile.uid, 5).forEach((w) => addItem(normalizeCompletedWorkout(w, profile)));
      addItem(normalizeLiveWorkout(profile.currentWorkout, profile));
    });

    // Ensure the viewer appears even if not in profiles map yet
    if (viewerUid && !profilesMap.has(viewerUid)) {
      const selfProfile = {
        uid: viewerUid,
        name: viewerData?.name || viewerData?.handle || 'You',
        handle: viewerData?.handle || '',
        pfp: viewerData?.pfp || viewerData?.image || viewerData?.photoURL || '',
        pfpVersion: viewerData?.pfpVersion ?? viewerData?.version ?? 0,
        weeklyWorkoutGoal: coerceWeeklyGoal(viewerData?.weeklyWorkoutGoal),
        completedWorkouts: Array.isArray(viewerData?.completedWorkouts) ? viewerData.completedWorkouts : [],
        currentWorkout: viewerData?.currentWorkout || null,
      };
      takeRecentValid(selfProfile.completedWorkouts, selfProfile.uid, 5).forEach((w) => addItem(normalizeCompletedWorkout(w, selfProfile)));
      addItem(normalizeLiveWorkout(selfProfile.currentWorkout, selfProfile));
    }

    return Array.from(map.values()).sort((a, b) => bestTs(b) - bestTs(a));
  }, [keyOf, takeRecentValid, viewerUid, viewerData]);

  const syncListeners = useCallback((uids) => {
    const listeners = listenersRef.current;
    const target = new Set(uids.filter(Boolean));

    // Remove listeners no longer needed
    listeners.forEach((unsub, uid) => {
      if (!target.has(uid)) {
        try { unsub(); } catch { }
        listeners.delete(uid);
      }
    });

    if (!enabled) return;

    target.forEach((uid) => {
      if (listeners.has(uid)) return;
      const unsub = onSnapshot(doc(db, 'usersPublic', uid), (snap) => {
        const data = snap.data() || {};
        const nextProfiles = new Map(profilesRef.current);
        const prev = nextProfiles.get(uid) || { uid };
        nextProfiles.set(uid, {
          ...prev,
          uid,
          name: data.name || data.displayName || prev.name || '',
          handle: data.handle || data.username || prev.handle || '',
          pfp: data.pfp || data.image || data.photoURL || prev.pfp || '',
          pfpVersion: data.pfpVersion ?? data.version ?? prev.pfpVersion ?? 0,
          weeklyWorkoutGoal: coerceWeeklyGoal(data?.weeklyWorkoutGoal ?? data?.weeklyGoal ?? data?.goal ?? prev.weeklyWorkoutGoal),
          currentWorkout: data?.currentWorkout || null,
          completedWorkouts: Array.isArray(data?.completedWorkouts) ? data.completedWorkouts : (prev.completedWorkouts || []),
        });
        profilesRef.current = nextProfiles;
        setItems(rebuildItems(nextProfiles));
      });
      listeners.set(uid, unsub);
    });
  }, [enabled, rebuildItems]);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const mutualFriendUids = extractMutualFriendUids(user);
      setLoading(true);

      const profileMap = new Map();
      for (const group of chunk10(mutualFriendUids)) {
        const q = query(collection(db, 'usersPublic'), where(documentId(), 'in', group));
        const snap = await getDocs(q);
        snap.forEach((docSnap) => {
          const data = docSnap.data() || {};
          profileMap.set(docSnap.id, {
            uid: docSnap.id,
            name: data.name || data.displayName || '',
            handle: data.handle || data.username || '',
            pfp: data.pfp || data.image || data.photoURL || '',
            pfpVersion: data.pfpVersion ?? data.version ?? 0,
            currentWorkout: data?.currentWorkout || null,
            completedWorkouts: Array.isArray(data?.completedWorkouts) ? data.completedWorkouts : [],
            weeklyWorkoutGoal: coerceWeeklyGoal(data?.weeklyWorkoutGoal ?? data?.weeklyGoal ?? data?.goal),
          });
        });
      }

      if (viewerUid) {
        profileMap.set(viewerUid, {
          uid: viewerUid,
          name: viewerData?.name || viewerData?.handle || 'You',
          handle: viewerData?.handle || '',
          pfp: viewerData?.pfp || viewerData?.image || viewerData?.photoURL || '',
          pfpVersion: viewerData?.pfpVersion ?? viewerData?.version ?? 0,
          currentWorkout: viewerData?.currentWorkout || null,
          completedWorkouts: Array.isArray(viewerData?.completedWorkouts) ? viewerData.completedWorkouts : [],
          weeklyWorkoutGoal: coerceWeeklyGoal(viewerData?.weeklyWorkoutGoal),
        });
      }

      profilesRef.current = profileMap;
      setItems(rebuildItems(profileMap));
      syncListeners([...profileMap.keys()]);
    } catch (e) {
      console.log('communityActivity fetch error', e);
    } finally {
      setLoading(false);
    }
  }, [user, viewerUid, viewerData, enabled, rebuildItems, syncListeners]);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      profilesRef.current = new Map();
      syncListeners([]);
      return;
    }
    refresh();
  }, [refresh, enabled, friendKey, syncListeners]);

  useEffect(() => () => {
    listenersRef.current.forEach((unsub) => { try { unsub(); } catch { } });
    listenersRef.current.clear();
  }, []);

  return { items, refresh, loading };
}
