// screens/Workout/index.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    SafeAreaView,
    View,
    StyleSheet,
    Animated,
    Text,
    Platform,
    Alert,
    InteractionManager,
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
import { ss, FOOTER_HEIGHT, BTN_SIZE, ROW_WIDTH, TPL_BOTTOM_GAP } from "../components/3_Workout/sections/workoutTheme";
import { useFoodLogs } from "../hooks/useFoodLogs";
import useResolvedUid from "../hooks/useResolvedUid";
import useUserDoc from "../hooks/useUserDoc";

// Backend
import updateDoc from "../../backend/helper/firebase/updateDoc";
import makeID from "../../backend/helper/makeID";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase.config";

// utils
import millisToHoursMinutesSeconds from "../helper/millisToHoursMinutesSeconds";
import getAllUsers from "../helper/getAllUsers";
import rankUsers from "../helper/rankUsers";

// split parts
import HubRow from "../components/3_Workout/sections/HubRow";
import StartCluster from "../components/3_Workout/sections/StartCluster";
import useFriendsActivity from "../hooks/useFriendsActivity";

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
        ? w.exercises.map((ex) => ({
            ...ex,
            sets: normalizeSets(ex?.sets),
        }))
        : [];

    return {
        ...w,
        created,
        exercises,
        volume: Number(w?.volume) || 0,
        reps: Number(w?.reps) || 0,
        PBs: Number(w?.PBs) || 0,
    };
};

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

    /* ---------- first paint guard (defer heavy mounts) ---------- */
    const [afterPaint, setAfterPaint] = useState(false);
    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            requestAnimationFrame(() => setAfterPaint(true));
        });
        return () => task?.cancel?.();
    }, []);

    /* ---------- prevent phantom “00:00” at cold app start ---------- */
    useEffect(() => {
        try { global.isCurrentlyWorkingOut = false; } catch { }
    }, []);

    /* ---------- podium preview load (post-paint) ---------- */
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
    useEffect(() => {
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 6, tension: 80 }).start();
    }, []);

    /* ---------- calories (today) ---------- */
    const stableToday = useMemo(() => {
        const d = new Date(); d.setHours(0, 0, 0, 0); return d;
    }, []);
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
            return {
                id: t?.id || tid,
                tid,
                name: t?.name || "Untitled Template",
                exercises: Array.isArray(t?.exercises) ? t.exercises : [],
                lastDate: t?.lastDate ?? null,
            };
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
    const [editSheetToggle, setEditSheetToggle] = useState(false); // NEW: force expand token

    const initTemplate = useCallback(() => {
        const tid = makeID();
        const newTemplate = { id: tid, tid, name: "Untitled Template", exercises: [], lastDate: null };
        setTemplates((prev) => { const next = [...prev, newTemplate]; queueSaveTemplates(next); return next; });
        openedTemplateRef.current = newTemplate;
        setIsEditTemplateVisible(true);
        setEditSheetToggle((t) => !t); // force expand
    }, [queueSaveTemplates]);

    const openEditTemplate = useCallback((tpl) => {
        if (!tpl || tpl.isNone) return;
        openedTemplateRef.current = { ...tpl };
        setIsEditTemplateVisible(true);
        setEditSheetToggle((t) => !t); // force expand every time
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

    const startWorkoutBase = useCallback((tplOrNull) => {
        if (startGuardRef.current) return;
        startGuardRef.current = true; setTimeout(() => (startGuardRef.current = false), 500);
        if (!uid) { Alert.alert("Sign in required", "Please log in to start a workout."); return; }

        try {
            if (!workout) {
                global.isCurrentlyWorkingOut = true;
                const wid = makeID();
                const created = Date.now();

                // normalize sets with isDone
                const normalizeSets = (sets) =>
                    Array.isArray(sets) && sets.length
                        ? sets.map((s) => ({
                            weight: Number(s?.weight) || 0,
                            reps: Number(s?.reps) || 0,
                            isDone: !!s?.isDone,
                        }))
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

                // local state + UI
                setWorkout(newWorkout);
                setIsNewWorkoutVisible(true);
                startTimer(created);

                // WRITE-THROUGH: save immediately to Firestore (no deferral)
                clearPersistDebounce();
                setDoc(doc(db, "users", uid), { currentWorkout: newWorkout }, { merge: true })
                    .catch((e) => {
                        console.log("setDoc users.currentWorkout error", e);
                    });

                // Create workouts doc in background
                InteractionManager.runAfterInteractions(() => {
                    requestAnimationFrame(() => {
                        createWorkoutDoc(wid).catch((e) => {
                            console.log("createWorkoutDoc error", e);
                        });
                    });
                });
            } else {
                setIsNewWorkoutVisible(true);
            }
        } catch (e) {
            console.log("startWorkout error", e);
            Alert.alert("Couldn't start workout", e?.message || "Please try again.");
        }
    }, [uid, workout, createWorkoutDoc, startTimer, /* NEW */ clearPersistDebounce]);

    const onStartWorkout = useCallback(() => {
        const selected = templatesWithNone[Math.max(0, Math.min(activeIdx, templatesWithNone.length - 1))];
        startWorkoutBase(selected?.isNone ? null : selected);
    }, [activeIdx, templatesWithNone, startWorkoutBase]);

    // --- persist current workout (debounced) when it changes
    const saveCurrentWorkoutDebouncedRef = useRef(null);
    const clearPersistDebounce = useCallback(() => {
        if (saveCurrentWorkoutDebouncedRef.current) {
            clearTimeout(saveCurrentWorkoutDebouncedRef.current);
            saveCurrentWorkoutDebouncedRef.current = null;
        }
    }, []);

    const persistCurrentWorkout = useCallback((value) => {
        if (!uid) return;

        // If clearing, do it immediately and cancel any pending write that could resurrect the workout
        if (!value) {
            clearPersistDebounce();
            (async () => {
                try {
                    await setDoc(doc(db, "users", uid), { currentWorkout: null }, { merge: true });
                } catch (e) {
                    console.log("setDoc users.currentWorkout (immediate null) error", e);
                    try { await updateDoc("users", uid, { currentWorkout: null }); } catch (e2) {
                        console.log("helper updateDoc fallback error", e2);
                    }
                }
            })();
            return;
        }

        clearPersistDebounce();
        const payload = sanitizeWorkout(value);

        saveCurrentWorkoutDebouncedRef.current = setTimeout(async () => {
            try {
                await setDoc(doc(db, "users", uid), { currentWorkout: payload }, { merge: true });
            } catch (e) {
                console.log("setDoc users.currentWorkout (debounced) error", e);
                try { await updateDoc("users", uid, { currentWorkout: payload }); } catch (e2) {
                    console.log("helper updateDoc fallback error", e2);
                }
            }
        }, 400);
    }, [uid, clearPersistDebounce]);

    const updateNewWorkout = useCallback((next) => {
        setWorkout(next);
        persistCurrentWorkout(next); // persist to backend with `isDone`
    }, [persistCurrentWorkout]);

    const cancelWorkout = useCallback(async () => {
        try {
            // 1) stop any pending save of the old workout
            clearPersistDebounce();
            // 2) clear in backend immediately
            if (uid) {
                try {
                    await setDoc(doc(db, "users", uid), { currentWorkout: null }, { merge: true });
                } catch (e) {
                    console.log("setDoc users.currentWorkout (cancel) error", e);
                    await updateDoc("users", uid, { currentWorkout: null });
                }
            }
            // 3) clear locally
            clearCurrentWorkoutLocally();
        } catch (e) {
            console.log("cancelWorkout error", e);
        }
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

    /* ---------- Rehydrate local workout from Firestore on load ---------- */
    useEffect(() => {
        // only adopt remote when we don't already have a local one
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

    /* ---------- Day sheet (toggle-to-open) + data ---------- */
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
    const [friendsSheetToggle, setFriendsSheetToggle] = useState(false); // <-- toggle flag

    // PRELOAD immediately (no deferral) so data is ready before the first open
    useEffect(() => {
        refreshFriends();
    }, [refreshFriends]);

    // refresh on open
    useEffect(() => { if (friendsSheetVisible) refreshFriends(); }, [friendsSheetVisible, refreshFriends]);

    // ----- compute "new updates" for the Friends button indicator -----
    const lastViewedAtMs = toMillis(user?.friendsActivityLastViewedAt);
    const itemTs = useCallback(
        (it) => Math.max(
            toMillis(it?.created) || 0,
            toMillis(it?.startedAt) || 0,
            toMillis(it?.finishedAt) || 0
        ),
        []
    );

    const newItems = useMemo(() => {
        const v = lastViewedAtMs || 0;
        const arr = Array.isArray(friendsActivity) ? friendsActivity : [];
        return arr.filter((it) => itemTs(it) > v);
    }, [friendsActivity, lastViewedAtMs, itemTs]);

    const recentUsersForStack = useMemo(() => {
        const seen = new Set();
        const out = [];
        const sorted = [...newItems].sort((a, b) => itemTs(b) - itemTs(a));
        for (const it of sorted) {
            const uidX = it?.uid;
            if (!uidX || seen.has(uidX)) continue;
            seen.add(uidX);
            out.push({
                uid: uidX,
                pfp: it?.pfp || it?.pfpUrl || it?.photoURL || it?.image || it?.avatar || "",
            });
            if (out.length >= 3) break;
        }
        return out;
    }, [newItems, itemTs]);

    const hasNewFriendsUpdates = recentUsersForStack.length > 0;

    /* ---------------- render ---------------- */
    const allUsersRef = useRef([]);

    return (
        <SafeAreaView style={styles.root}>
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
                        setFriendsSheetVisible(true);           // keep mounted + visible
                        setFriendsSheetToggle((f) => !f);      // flip -> ALWAYS expand (token)
                    }}
                    hasNewFriendsUpdates={hasNewFriendsUpdates}
                    friendsStackUsers={recentUsersForStack}
                />
            </View>

            <Footer navigation={navigation} currentScreenName={"Workout"} />

            {/* Day details (mounted only when needed) */}
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

            {/* Friends sheet is always mounted but completely inert when hidden */}
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

            {/* New Workout sheet is always mounted and rendered last so it sits on top */}
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

            {/* Template editor: force-expand via openToggle */}
            <EditTemplateBottomSheet
                isVisible={isEditTemplateVisible}
                setIsVisible={setIsEditTemplateVisible}
                openToggle={editSheetToggle}               // <<< keeps opening reliably
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
});
