// screens/Workout/index.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    SafeAreaView,
    View,
    StyleSheet,
    Animated,
    Text,
    Alert,
    InteractionManager,
    Pressable,
} from "react-native";

// Header & Footer
import FeedHeader from "../components/1_Feed/FeedHeader";
import Footer from "../components/Footer";

// Sections
import WeekCalendar from "../components/3_Workout/sections/WeekCalendar";
import TemplatesRail from "../components/3_Workout/sections/TemplatesRail";
import SectionDivider from "../components/3_Workout/ui/SectionDivider";

// Modals / Sheets
import NewWorkoutBottomSheet from "../components/3_Workout/NewWorkout/NewWorkoutBottomSheet";
import EditTemplateBottomSheet from "../components/3_Workout/Template/EditTemplateBottomSheet";
import WorkoutSummaryModal from "../components/3_Workout/WorkoutSummaryModal";
import DayDetailsSheet from "../components/3_Workout/DayDetailsSheet";
import FriendsActivitySheet from "../components/3_Workout/FriendsActivitySheet";

// Theme & Hooks (project)
import { ss, FOOTER_HEIGHT, BTN_SIZE, TPL_BOTTOM_GAP } from "../components/3_Workout/sections/workoutTheme";
import { useFoodLogs } from "../hooks/useFoodLogs";
import useResolvedUid from "../hooks/useResolvedUid";
import useUserDoc from "../hooks/useUserDoc";

// Backend
import updateDoc from "../../backend/helper/firebase/updateDoc";
import makeID from "../../backend/helper/makeID";
import {
    setDoc,
    doc,
    serverTimestamp,
    onSnapshot,
    collection,
    query,
    where,
    arrayUnion,
    updateDoc as fsUpdateDoc,
    getDoc,
} from "firebase/firestore";
import { db } from "../../firebase.config";

// utils
import millisToHoursMinutesSeconds from "../helper/millisToHoursMinutesSeconds";
import getAllUsers from "../helper/getAllUsers";
import rankUsers from "../helper/rankUsers";

// split parts
import HubRow from "../components/3_Workout/sections/HubRow";
import StartCluster from "../components/3_Workout/sections/StartCluster";
import useFriendsActivity from "../hooks/useFriendsActivity";

// pfps
import { usePfp } from "../helper/usePFPs";
import FastImage from "react-native-fast-image";

// labels
const PREVIEW_EXERCISE = "Bench Press (Barbell)";
const PREVIEW_LABEL = "Bench Press • 1RM";

/* ---------------- utils ---------------- */
const toDayKey = (d) => {
    if (!d && d !== 0) return "";
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return "";
    x.setHours(0, 0, 0, 0);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
const toMillis = (v) => {
    if (typeof v === "number") return v;
    if (v instanceof Date) return v.getTime();
    if (v?.toMillis) return v.toMillis();
    if (typeof v?.seconds === "number") return v.seconds * 1000;
    const n = new Date(v).getTime();
    return Number.isFinite(n) ? n : 0;
};

/** Ensure created is numeric and sets contain isDone */
const sanitizeWorkout = (w) => {
    if (!w) return null;
    const created = toMillis(w.created ?? w.createdAt);
    const normalizeSets = (sets) =>
        Array.isArray(sets) && sets.length
            ? sets.map((s) => ({
                  weight: Number(s?.weight) || 0,
                  reps: Number(s?.reps) || 0,
                  isDone: !!s?.isDone,
              }))
            : [{ weight: 0, reps: 0, isDone: false }];
    const exercises = Array.isArray(w.exercises)
        ? w.exercises.map((ex) => ({ ...ex, sets: normalizeSets(ex?.sets) }))
        : [];
    return { ...w, created, exercises, volume: Number(w?.volume) || 0, reps: Number(w?.reps) || 0, PBs: Number(w?.PBs) || 0 };
};

/* ----------------------------------------------
   LIVE FOLLOWING: subscribe to each followed user
   and treat any user with currentWorkout as "Live"
------------------------------------------------ */
function useLiveFollowing(user) {
    const [liveUsers, setLiveUsers] = useState([]); // [{uid, pfp, pfpVersion, isLive:true, _ts:number}]
    useEffect(() => {
        const following = (() => {
            if (Array.isArray(user?.following)) return user.following;
            if (Array.isArray(user?.friends)) return user.friends.map((f) => f?.uid).filter(Boolean);
            if (user?.followingMap && typeof user.followingMap === "object") return Object.keys(user.followingMap);
            return [];
        })();

        if (!following || following.length === 0) {
            setLiveUsers([]);
            return;
        }

        let mounted = true;
        const unsubMap = new Map();

        const upsert = (uid, entryOrNull) => {
            setLiveUsers((prev) => {
                const next = prev.filter((x) => x.uid !== uid);
                if (entryOrNull) next.push(entryOrNull);
                next.sort((a, b) => (b._ts || 0) - (a._ts || 0));
                return next;
            });
        };

        following.forEach((f) => {
            const fuid = typeof f === "string" ? f : f?.uid;
            if (!fuid) return;
            try {
                const unsub = onSnapshot(doc(db, "users", String(fuid)), (snap) => {
                    if (!mounted) return;
                    const data = snap.data() || {};
                    const cw = data.currentWorkout || null;
                    if (cw) {
                        const ts = toMillis(cw.created ?? cw.createdAt);
                        upsert(String(fuid), {
                            uid: String(fuid),
                            pfp: data.pfp || data.photoURL || data.image || data.avatar || "",
                            pfpVersion: data.pfpVersion || 0,
                            isLive: true,
                            currentWorkout: true,
                            _ts: ts || Date.now(),
                        });
                    } else {
                        upsert(String(fuid), null);
                    }
                });
                unsubMap.set(String(fuid), unsub);
            } catch {
                /* ignore */
            }
        });

        return () => {
            mounted = false;
            unsubMap.forEach((u) => u && u());
            unsubMap.clear();
        };
    }, [user?.following, user?.friends, user?.followingMap]);

    return liveUsers;
}

export default function Workout({ navigation, route }) {
    /* ---------- resolve uid & user ---------- */
    const uid = useResolvedUid(route);
    const user = useUserDoc(uid); // hydrates global.userData

    const markFriendsViewed = React.useCallback(async () => {
        try {
            if (!uid) return;
            await updateDoc("users", uid, { friendsActivityLastViewedAt: serverTimestamp() });
        } catch (e) {
            console.log("markFriendsViewed error", e);
        }
    }, [uid]);

    /* ---------- first paint guard ---------- */
    const [afterPaint, setAfterPaint] = useState(false);
    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            requestAnimationFrame(() => setAfterPaint(true));
        });
        return () => task?.cancel?.();
    }, []);

    /* ---------- prevent phantom “00:00” ---------- */
    useEffect(() => {
        try { global.isCurrentlyWorkingOut = false; } catch { }
    }, []);

    /* ---------- podium preview ---------- */
    const [top3, setTop3] = useState([]);
    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const all = await getAllUsers();
                if (!mounted) return;
                const ranked = rankUsers(Array.isArray(all) ? all : [], PREVIEW_EXERCISE) || [];
                const top = ranked.slice(0, 3).map((u) => ({
                    uid: u?.uid,
                    handle: u?.handle ?? "",
                    stat: u?.statsExercises?.[PREVIEW_EXERCISE]?.["1RM"] ?? 0,
                    fallbackPfp: u?.pfp || u?.image || u?.photoURL || null,
                }));
                setTop3(top);
            } catch (e) {
                console.log("MiniPodium load error", e);
                setTop3([]);
            }
        };
        const id = InteractionManager.runAfterInteractions(() => requestAnimationFrame(load));
        return () => { mounted = false; id?.cancel?.(); };
    }, []);

    /* ---------- UI/anim ---------- */
    const scaleAnim = useRef(new Animated.Value(0.92)).current;
    useEffect(() => { Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 6, tension: 80 }).start(); }, []);

    /* ---------- calories (today) ---------- */
    const stableToday = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
    const { totals: todayTotals } = useFoodLogs(stableToday, uid);
    const todayCalories = Math.round(Math.max(0, todayTotals?.calories || 0));
    const caloriesGoal = useMemo(
        () => user?.macroGoals?.calories ?? user?.macrosGoal?.calories ?? 2340,
        [user?.macroGoals?.calories, user?.macrosGoal?.calories]
    );
    const fill = Math.min(100, (todayCalories / Math.max(1, caloriesGoal)) * 100);

    /* ---------- templates (state & CRUD) ---------- */
    const normalizeTemplates = (arr) => {
        const list = Array.isArray(arr) ? arr : [];
        return list.map((t) => {
            const tid = t?.tid || t?.id || makeID();
            return { id: t?.id || tid, tid, name: t?.name || "Untitled Template", exercises: Array.isArray(t?.exercises) ? t.exercises : [], lastDate: t?.lastDate ?? null };
        });
    };
    const [templates, setTemplates] = useState([]);
    useEffect(() => { setTemplates(normalizeTemplates(user?.templates || [])); }, [user?.templates]);
    const templatesWithNone = useMemo(
        () => [{ id: "none", name: "No template selected", exercises: [], lastDate: null, isNone: true }, ...templates],
        [templates]
    );
    const [activeIdx, setActiveIdx] = useState(0);

    const saveDebounceRef = useRef(null);
    const queueSaveTemplates = useCallback((nextTemplates) => {
        if (!uid) return;
        if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
        saveDebounceRef.current = setTimeout(async () => {
            try { await updateDoc("users", uid, { templates: nextTemplates }); } catch (e) { console.log("save templates error", e); }
        }, 500);
    }, [uid]);

    const openedTemplateRef = useRef(null);
    const [isEditTemplateVisible, setIsEditTemplateVisible] = useState(false);
    const [editSheetToggle, setEditSheetToggle] = useState(false);

    const initTemplate = useCallback(() => {
        const tid = makeID();
        const newTemplate = { id: tid, tid, name: "Untitled Template", exercises: [], lastDate: null };
        setTemplates((prev) => { const next = [...prev, newTemplate]; queueSaveTemplates(next); return next; });
        openedTemplateRef.current = newTemplate;
        setIsEditTemplateVisible(true);
        setEditSheetToggle((t) => !t);
    }, [queueSaveTemplates]);

    const openEditTemplate = useCallback((tpl) => {
        if (!tpl || tpl.isNone) return;
        openedTemplateRef.current = { ...tpl };
        setIsEditTemplateVisible(true);
        setEditSheetToggle((t) => !t);
    }, []);

    const updateTemplate = useCallback(() => {
        setTemplates((prev) => {
            const idx = prev.findIndex((t) => t.tid === openedTemplateRef.current?.tid);
            if (idx === -1) return prev;
            const next = [...prev]; next[idx] = { ...openedTemplateRef.current }; queueSaveTemplates(next); return next;
        });
    }, [queueSaveTemplates]);

    const deleteTemplate = useCallback(() => {
        setTemplates((prev) => { const next = prev.filter((t) => t.tid !== openedTemplateRef.current?.tid); queueSaveTemplates(next); return next; });
        openedTemplateRef.current = null; setIsEditTemplateVisible(false);
    }, [queueSaveTemplates]);

    /* ---------- workout + timer ---------- */
    const [workout, setWorkout] = useState(null);
    const hasActiveWorkout = !!workout;
    const timerRef = useRef(""); const timerIdRef = useRef(null);
    const setTimerNow = useCallback((createdMs) => {
        if (!createdMs) return;
        const diff = Date.now() - createdMs;
        timerRef.current = millisToHoursMinutesSeconds(Math.max(1000, diff));
    }, []);
    const stopTimer = useCallback(() => { try { if (timerIdRef.current) clearInterval(timerIdRef.current); } catch { } timerIdRef.current = null; timerRef.current = ""; }, []);
    const startTimer = useCallback((createdMs) => { stopTimer(); setTimerNow(createdMs); timerIdRef.current = setInterval(() => setTimerNow(createdMs), 1000); }, [setTimerNow, stopTimer]);
    useEffect(() => { if (workout?.created) startTimer(workout.created); else stopTimer(); return () => stopTimer(); }, [workout?.created, startTimer, stopTimer]);

    const [isNewWorkoutVisible, setIsNewWorkoutVisible] = useState(false);
    const [headerKey, setHeaderKey] = useState(0);
    const startGuardRef = useRef(false);

    const createWorkoutDoc = useCallback(async (wid) => {
        await setDoc(doc(db, "workouts", wid), {
            wid, creatorUid: uid, createdAt: serverTimestamp(), active: true, members: [uid], updatedAt: serverTimestamp(),
        }, { merge: true });
    }, [uid]);

    const clearCurrentWorkoutLocally = useCallback(() => {
        try { global.isCurrentlyWorkingOut = false; if (global?.userData) global.userData.currentWorkout = null; } catch { }
        stopTimer(); setIsNewWorkoutVisible(false); setWorkout(null); setHeaderKey((k) => k + 1);
    }, [stopTimer]);

    // persist current workout (debounced)
    const saveCurrentWorkoutDebouncedRef = useRef(null);
    const clearPersistDebounce = useCallback(() => {
        if (saveCurrentWorkoutDebouncedRef.current) {
            clearTimeout(saveCurrentWorkoutDebouncedRef.current);
            saveCurrentWorkoutDebouncedRef.current = null;
        }
    }, []);
    const persistCurrentWorkout = useCallback((value) => {
        if (!uid) return;
        if (!value) {
            clearPersistDebounce();
            (async () => {
                try { await setDoc(doc(db, "users", uid), { currentWorkout: null }, { merge: true }); }
                catch (e) { console.log("setDoc users.currentWorkout (clear) error", e); try { await updateDoc("users", uid, { currentWorkout: null }); } catch { } }
            })();
            return;
        }
        clearPersistDebounce();
        const payload = sanitizeWorkout(value);
        saveCurrentWorkoutDebouncedRef.current = setTimeout(async () => {
            try { await setDoc(doc(db, "users", uid), { currentWorkout: payload }, { merge: true }); }
            catch (e) { console.log("setDoc users.currentWorkout (debounced) error", e); try { await updateDoc("users", uid, { currentWorkout: payload }); } catch { } }
        }, 400);
    }, [uid, clearPersistDebounce]);

    const startWorkoutBase = useCallback((tplOrNull) => {
        if (startGuardRef.current) return;
        startGuardRef.current = true; setTimeout(() => (startGuardRef.current = false), 500);
        if (!uid) { Alert.alert("Sign in required", "Please log in to start a workout."); return; }

        try {
            if (!workout) {
                global.isCurrentlyWorkingOut = true;
                const wid = makeID();
                const created = Date.now();

                const normalizeSets = (sets) =>
                    Array.isArray(sets) && sets.length
                        ? sets.map((s) => ({ weight: Number(s?.weight) || 0, reps: Number(s?.reps) || 0, isDone: !!s?.isDone }))
                        : [{ weight: 0, reps: 0, isDone: false }];

                const exercisesFromTpl = tplOrNull?.exercises
                    ? tplOrNull.exercises.map((ex) => ({ ...ex, sets: normalizeSets(ex?.sets) }))
                    : [];

                const newWorkout = {
                    wid,
                    creatorUID: uid,
                    created,
                    users: [],
                    exercises: exercisesFromTpl,
                    tid: tplOrNull?.tid || tplOrNull?.id || null,
                    volume: 0,
                    reps: 0,
                    PBs: 0,
                };

                setWorkout(newWorkout);
                setIsNewWorkoutVisible(true);
                startTimer(created);

                clearPersistDebounce();
                setDoc(doc(db, "users", uid), { currentWorkout: newWorkout }, { merge: true })
                    .catch((e) => console.log("setDoc users.currentWorkout error", e));

                InteractionManager.runAfterInteractions(() => {
                    requestAnimationFrame(() => {
                        createWorkoutDoc(wid).catch((e) => console.log("createWorkoutDoc error", e));
                    });
                });
            } else {
                setIsNewWorkoutVisible(true);
            }
        } catch (e) {
            console.log("startWorkout error", e);
            Alert.alert("Couldn't start workout", e?.message || "Please try again.");
        }
    }, [uid, workout, createWorkoutDoc, startTimer, clearPersistDebounce]);

    const onStartWorkout = useCallback(() => {
        const selected = templatesWithNone[Math.max(0, Math.min(activeIdx, templatesWithNone.length - 1))];
        startWorkoutBase(selected?.isNone ? null : selected);
    }, [activeIdx, templatesWithNone, startWorkoutBase]);

    const updateNewWorkout = useCallback((next) => { setWorkout(next); persistCurrentWorkout(next); }, [persistCurrentWorkout]);

    const cancelWorkout = useCallback(async () => {
        try {
            clearPersistDebounce();
            if (uid) {
                try { await setDoc(doc(db, "users", uid), { currentWorkout: null }, { merge: true }); }
                catch (e) { console.log("setDoc users.currentWorkout (cancel) error", e); await updateDoc("users", uid, { currentWorkout: null }); }
            }
            clearCurrentWorkoutLocally();
        } catch (e) { console.log("cancelWorkout error", e); }
    }, [uid, clearCurrentWorkoutLocally, clearPersistDebounce]);

    const [completedWorkout, setCompletedWorkout] = useState(null);
    const [isSummaryModalVisible, setIsSummaryModalVisible] = useState(false);
    const finishWorkout = useCallback(async () => {
        try {
            if (workout) {
                const cleanedExercises = (Array.isArray(workout.exercises) ? workout.exercises : [])
                    .map((ex) => ({ ...ex, sets: (Array.isArray(ex.sets) ? ex.sets : []).filter((s) => Number(s?.weight) > 0 && Number(s?.reps) > 0) }))
                    .filter((ex) => ex.sets && ex.sets.length > 0);

                const duration = Math.max(0, Date.now() - (workout.created || Date.now()));
                const completed = { ...workout, duration, exercises: cleanedExercises };

                try {
                    const arr = Array.isArray(global?.userData?.completedWorkouts) ? [...global.userData.completedWorkouts] : [];
                    arr.push(completed);
                    if (global?.userData) {
                        global.userData.completedWorkouts = arr;
                        const dk = toDayKey(completed.created);
                        global.userData.workoutsByDate = { ...(global.userData.workoutsByDate || {}), [dk]: true };
                    }
                } catch { }

                setCompletedWorkout(completed);
                setIsSummaryModalVisible(true);

                try {
                    const arr = Array.isArray(global?.userData?.currentWorkouts) ? [...global.userData.currentWorkouts] : [];
                    arr.push(completed);
                    if (global?.userData) global.userData.currentWorkouts = arr;
                } catch { }
            }
            clearCurrentWorkoutLocally();
            if (uid) await updateDoc("users", uid, { currentWorkout: null });
        } catch (e) { console.log("finishWorkout error", e); }
    }, [uid, workout, clearCurrentWorkoutLocally]);

    const postWorkout = useCallback(async () => {
        setIsSummaryModalVisible(false);
        try {
            await navigation.navigate("ProfileStack", { screen: "Profile" });
            navigation.navigate("ProfileStack", { screen: "SelectPhotos", params: { workout: completedWorkout } });
        } catch { }
    }, [completedWorkout, navigation]);

    /* ---------- Rehydrate from Firestore ---------- */
    useEffect(() => {
        if (workout) return;
        const remote = sanitizeWorkout(user?.currentWorkout);
        if (remote && remote.created) {
            setWorkout(remote);
            startTimer(remote.created);
            try {
                global.isCurrentlyWorkingOut = true;
                if (global?.userData) global.userData.currentWorkout = remote;
            } catch { }
        }
    }, [user?.currentWorkout, workout, startTimer]);

    /* ---------- Day sheet + meals ---------- */
    const [daySheetToggle, setDaySheetToggle] = useState(false);
    const [daySheetVisible, setDaySheetVisible] = useState(false);
    const [daySheetDate, setDaySheetDate] = useState(null);
    const sheetDate = useMemo(() => daySheetDate ?? stableToday, [daySheetDate, stableToday]);
    const { meals: sheetMeals, totals: sheetTotals } = useFoodLogs(sheetDate, uid);
    const dayWorkouts = useMemo(() => {
        const dk = toDayKey(sheetDate);
        const completed = Array.isArray(global?.userData?.completedWorkouts) ? global.userData.completedWorkouts : [];
        const active = global?.userData?.currentWorkout ? [global.userData.currentWorkout] : [];
        return [...completed, ...active]
            .filter((w) => { const when = toMillis(w?.created ?? w?.createdAt); return when && toDayKey(when) === dk; })
            .sort((a, b) => toMillis(b?.created ?? b?.createdAt) - toMillis(a?.created ?? a?.createdAt));
    }, [sheetDate]);

    /* ---------- Friends activity ---------- */
    const { items: friendsActivity, refresh: refreshFriends } = useFriendsActivity(user);
    const [friendsSheetVisible, setFriendsSheetVisible] = useState(false);
    const [friendsSheetToggle, setFriendsSheetToggle] = useState(false);

    useEffect(() => { refreshFriends(); }, [refreshFriends]);
    useEffect(() => { if (friendsSheetVisible) refreshFriends(); }, [friendsSheetVisible, refreshFriends]);

    const lastViewedAtMs = toMillis(user?.friendsActivityLastViewedAt);
    const itemTs = useCallback(
        (it) => Math.max(toMillis(it?.created) || 0, toMillis(it?.startedAt) || 0, toMillis(it?.finishedAt) || 0),
        []
    );
    const newItems = useMemo(() => {
        const v = lastViewedAtMs || 0;
        const arr = Array.isArray(friendsActivity) ? friendsActivity : [];
        return arr.filter((it) => itemTs(it) > v);
    }, [friendsActivity, lastViewedAtMs, itemTs]);

    /* ---------- LIVE FOLLOWING: always treat live as new ---------- */
    const liveNow = useLiveFollowing(user); // [{uid,pfp,pfpVersion,isLive:true,_ts}]
    const nonLiveNew = useMemo(() => {
        const liveSet = new Set(liveNow.map((x) => x.uid));
        const uniq = [];
        (Array.isArray(newItems) ? newItems : []).forEach((it) => {
            const uidX = it?.uid;
            if (!uidX || liveSet.has(uidX)) return;
            if (uniq.find((u) => u.uid === uidX)) return;
            uniq.push({
                uid: uidX,
                pfp: it?.pfp || it?.pfpUrl || it?.photoURL || it?.image || it?.avatar || "",
                pfpVersion: it?.pfpVersion || 0,
                isLive: false,
                _ts: itemTs(it),
            });
        });
        uniq.sort((a, b) => (b._ts || 0) - (a._ts || 0));
        return uniq;
    }, [newItems, liveNow, itemTs]);

    const stackUsers = useMemo(() => {
        const merged = [...liveNow, ...nonLiveNew];
        return merged.slice(0, 3);
    }, [liveNow, nonLiveNew]);

    const hasAnyStack = stackUsers.length > 0;

    /* ---------- INVITE BANNER (Workout screen) ---------- */
    const [invites, setInvites] = useState([]); // pending invites for me
    const [currentInvite, setCurrentInvite] = useState(null);
    const bannerY = useRef(new Animated.Value(0)).current; // anchored just below header; animate translateY
    const [bannerHeight, setBannerHeight] = useState(0);

    // measure header height to anchor banner below it
    const [headerHeight, setHeaderHeight] = useState(0);
    const onHeaderLayout = useCallback((e) => {
        const h = e?.nativeEvent?.layout?.height || 0;
        if (h && h !== headerHeight) setHeaderHeight(h);
    }, [headerHeight]);

    // listen for pending invites targeting me
    useEffect(() => {
        const me = String(uid || global?.userData?.uid || "");
        if (!me) return;
        const qInv = query(
            collection(db, "workoutInvites"),
            where("toUid", "==", me),
            where("status", "==", "pending")
        );
        const unsub = onSnapshot(qInv, (snap) => {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            list.sort((a, b) => {
                const ta = a?.createdAt?.seconds || 0;
                const tb = b?.createdAt?.seconds || 0;
                return tb - ta;
            });
            setInvites(list);
        });
        return () => unsub();
    }, [uid]);

    useEffect(() => {
        setCurrentInvite(invites?.[0] || null);
    }, [invites]);

    useEffect(() => {
        const hidden = -Math.max((bannerHeight || 80) + 12, 92); // slide up just above its own box
        Animated.spring(bannerY, {
            toValue: currentInvite ? 0 : hidden,
            useNativeDriver: true,
            friction: 8,
            tension: 90,
        }).start();
    }, [currentInvite, bannerHeight, bannerY]);

    const inviterPfpUri = usePfp(currentInvite?.fromUid || null, currentInvite?.fromPfpVersion || 0) || currentInvite?.fromPfp || "";

    const handleInviteLayout = useCallback((e) => {
        const h = e?.nativeEvent?.layout?.height || 0;
        if (h && h !== bannerHeight) setBannerHeight(h);
    }, [bannerHeight]);

    const handleAcceptInvite = useCallback(async () => {
        if (!currentInvite) return;
        try {
            const me = String(uid || global?.userData?.uid || "");
            const wid = String(currentInvite?.wid || "");
            if (!me || !wid) return;

            await fsUpdateDoc(doc(db, "workouts", wid), {
                members: arrayUnion(me),
                updatedAt: serverTimestamp(),
                active: true,
            });
            await fsUpdateDoc(doc(db, "workoutInvites", currentInvite.id), {
                status: "accepted",
                actedAt: serverTimestamp(),
            });

            // seed local workout from workout doc
            const wSnap = await getDoc(doc(db, "workouts", wid));
            const seed = wSnap.exists() ? wSnap.data() : null;

            const joined = {
                wid,
                creatorUID: seed?.creatorUid || currentInvite?.fromUid || me,
                created: Date.now(),
                users: [],
                exercises: [],
                tid: null,
                volume: 0, reps: 0, PBs: 0,
            };
            setWorkout(joined);
            setIsNewWorkoutVisible(true);
            persistCurrentWorkout(joined);

            // drop this invite (banner slides up)
            setInvites((prev) => prev.filter((x) => x.id !== currentInvite.id));
        } catch (e) {
            console.log("Accept invite error", e);
            Alert.alert("Couldn't join", "Please try again.");
        }
    }, [currentInvite, uid, persistCurrentWorkout]);

    const handleDeclineInvite = useCallback(async () => {
        if (!currentInvite) return;
        try {
            await fsUpdateDoc(doc(db, "workoutInvites", currentInvite.id), {
                status: "declined",
                actedAt: serverTimestamp(),
            });
            setInvites((prev) => prev.filter((x) => x.id !== currentInvite.id));
        } catch (e) {
            console.log("Decline invite error", e);
            setInvites((prev) => prev.filter((x) => x.id !== currentInvite.id));
        }
    }, [currentInvite]);

    /* ---------------- render ---------------- */
    const allUsersRef = useRef([]);

    return (
        <SafeAreaView style={styles.root}>
            {/* Header measured for safe anchoring */}
            <View onLayout={onHeaderLayout}>
                <FeedHeader
                    key={headerKey}
                    toMessagesScreen={() => navigation?.navigate("Messages")}
                    onOpenNotifications={() => navigation?.navigate("Notifications")}
                    backButton={false}
                    onBackPress={() => navigation?.goBack?.()}
                    scrollToTop={() => { }}
                    navigation={navigation}
                    allUsersRef={allUsersRef}
                    workout={workout}
                    timerRef={timerRef}
                    openCurrentWorkout={() => setIsNewWorkoutVisible(true)}
                />
            </View>

            {/* Invite banner (absolute, anchored below header & within SafeArea) */}
            <Animated.View
                style={[
                    styles.inviteBannerWrap,
                    { top: headerHeight + 6, transform: [{ translateY: bannerY }] },
                ]}
                pointerEvents={currentInvite ? "auto" : "none"}
                onLayout={handleInviteLayout}
            >
                {currentInvite && (
                    <View style={styles.inviteCard}>
                        <View style={styles.inviteLeft}>
                            <View style={styles.invitePfpWrap}>
                                {inviterPfpUri ? (
                                    <FastImage
                                        source={{
                                            uri: inviterPfpUri,
                                            priority: FastImage.priority.normal,
                                            cache: FastImage.cacheControl.immutable,
                                        }}
                                        style={styles.invitePfp}
                                    />
                                ) : (
                                    <View style={[styles.invitePfp, { backgroundColor: "#E5E7EB" }]} />
                                )}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inviteTitle}>
                                    {currentInvite.fromHandle ? `@${currentInvite.fromHandle} invited you` : "You’ve been invited"}
                                </Text>
                                <Text style={styles.inviteSub}>Join their workout?</Text>
                            </View>
                        </View>
                        <View style={styles.inviteActions}>
                            <Pressable onPress={handleAcceptInvite} style={styles.inviteAccept} hitSlop={8}>
                                <Text style={styles.inviteAcceptText}>Accept</Text>
                            </Pressable>
                            <Pressable onPress={handleDeclineInvite} hitSlop={8} style={styles.inviteDismiss}>
                                <Text style={styles.inviteDismissText}>Dismiss</Text>
                            </Pressable>
                        </View>
                    </View>
                )}
            </Animated.View>

            <View style={styles.content}>
                <WeekCalendar
                    workoutsMap={global?.userData?.workoutsByDate || {}}
                    onDayPress={(d) => {
                        setDaySheetDate(d);
                        setDaySheetVisible(true);
                        setDaySheetToggle((f) => !f);
                    }}
                />

                {/* Hub row */}
                <HubRow
                    navigation={navigation}
                    afterPaint={afterPaint}
                    fill={fill}
                    todayCalories={todayCalories}
                    caloriesGoal={caloriesGoal}
                    top3={top3}
                    PREVIEW_LABEL={PREVIEW_LABEL}
                />

                <SectionDivider />
            </View>

            {/* Templates rail (mount after first paint) */}
            {afterPaint && (
                <View style={styles.templatesDock} pointerEvents="box-none">
                    <TemplatesRail
                        templates={templatesWithNone}
                        onIndexChange={setActiveIdx}
                        onAddTemplate={initTemplate}
                        onOpenTemplate={openEditTemplate}
                    />
                </View>
            )}

            {/* START cluster */}
            <View style={styles.clusterWrap} pointerEvents="box-none">
                <StartCluster
                    navigation={navigation}
                    scaleAnim={scaleAnim}
                    hasActiveWorkout={hasActiveWorkout}
                    onStartWorkout={onStartWorkout}
                    onOpenNewWorkout={() => setIsNewWorkoutVisible(true)}
                    onOpenFriends={() => {
                        setFriendsSheetVisible(true);
                        setFriendsSheetToggle((f) => !f);
                    }}
                    hasNewFriendsUpdates={hasAnyStack}
                    friendsStackUsers={stackUsers}
                />
            </View>

            <Footer navigation={navigation} currentScreenName={"Workout"} />

            {/* Day details */}
            {daySheetVisible && (
                <DayDetailsSheet
                    visible={daySheetVisible}
                    openToggle={daySheetToggle}
                    date={sheetDate}
                    workouts={dayWorkouts}
                    meals={sheetMeals}
                    totals={sheetTotals}
                    calories={sheetTotals?.calories || 0}
                    workoutOn={(dayWorkouts?.length || 0) > 0}
                    onClose={() => setDaySheetVisible(false)}
                    onStartWorkout={onStartWorkout}
                    onOpenMacros={() => { setDaySheetVisible(false); navigation.navigate("MacroTrackingOverlay"); }}
                />
            )}

            {/* Friends sheet */}
            <View style={StyleSheet.absoluteFill} pointerEvents={friendsSheetVisible ? "auto" : "none"}>
                <FriendsActivitySheet
                    visible={friendsSheetVisible}
                    openToggle={friendsSheetToggle}
                    items={friendsActivity}
                    lastViewedAt={user?.friendsActivityLastViewedAt}
                    onViewed={markFriendsViewed}
                    onClose={() => setFriendsSheetVisible(false)}
                    onJoin={(item) => {
                        setFriendsSheetVisible(false);
                        Alert.alert("Join Workout", `Joining ${item.name}'s live session…`);
                    }}
                    onView={(item) => {
                        setFriendsSheetVisible(false);
                        Alert.alert("Workout", `Opening ${item.name}'s workout (${item.duration} min)…`);
                    }}
                />
            </View>

            {/* New Workout sheet */}
            <NewWorkoutBottomSheet
                workout={workout}
                cancelNewWorkout={cancelWorkout}
                updateNewWorkout={updateNewWorkout}
                finishNewWorkout={finishWorkout}
                isVisible={isNewWorkoutVisible}
                setIsVisible={setIsNewWorkoutVisible}
                timerRef={timerRef}
                showGroupModal={() => { }}
                userWorkoutStats={global?.userData?.statsExercises || {}}
            />

            {/* Template editor */}
            <EditTemplateBottomSheet
                isVisible={isEditTemplateVisible}
                setIsVisible={setIsEditTemplateVisible}
                openToggle={editSheetToggle}
                openedTemplateRef={openedTemplateRef}
                updateTemplate={updateTemplate}
                deleteTemplate={deleteTemplate}
            />

            {isSummaryModalVisible && (
                <WorkoutSummaryModal
                    isVisible={isSummaryModalVisible}
                    workout={completedWorkout}
                    onClose={() => setIsSummaryModalVisible(false)}
                    postWorkout={postWorkout}
                />
            )}
        </SafeAreaView>
    );
}

/* ---------------- styles ---------------- */
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F7FAFF" },
    content: { flex: 1 },

    templatesDock: { position: "absolute", left: 0, right: 0, bottom: FOOTER_HEIGHT + ss(22) + BTN_SIZE + TPL_BOTTOM_GAP },
    clusterWrap: { position: "absolute", left: 0, right: 0, bottom: FOOTER_HEIGHT + ss(20), alignItems: "center" },

    // Invite banner
    inviteBannerWrap: {
        position: "absolute",
        left: 0,
        right: 0,
        zIndex: 30,
        alignItems: "center",
        paddingTop: 0,
    },
    inviteCard: {
        width: "92%",
        borderRadius: 14,
        backgroundColor: "#F7FAFF",
        borderWidth: 1,
        borderColor: "#E5EEF9",
        paddingVertical: 10,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
    },
    inviteLeft: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 },
    invitePfpWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        overflow: "hidden",
        marginRight: 10,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#fff",
    },
    invitePfp: { width: "100%", height: "100%" },
    inviteTitle: { fontFamily: "Outfit_700Bold", fontSize: 14.5, color: "#0F172A" },
    inviteSub: { fontFamily: "Outfit_500Medium", fontSize: 12.5, color: "#64748B", marginTop: 2 },

    inviteActions: { flexDirection: "row", alignItems: "center" },
    inviteAccept: {
        height: 30,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: "#10B981",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 8,
    },
    inviteAcceptText: { color: "#fff", fontFamily: "Outfit_700Bold", fontSize: 13 },
    inviteDismiss: { paddingHorizontal: 6, paddingVertical: 4 },
    inviteDismissText: { color: "#64748B", fontFamily: "Outfit_600SemiBold", fontSize: 12.5 },
});
