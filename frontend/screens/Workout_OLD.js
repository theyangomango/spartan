// screens/Workout/index.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    SafeAreaView,
    View,
    StyleSheet,
    Pressable,
    Animated,
    Text,
    Platform,
    Alert,
} from "react-native";
import { AddSquare } from "iconsax-react-native";
import { AnimatedCircularProgress } from "react-native-circular-progress";

// Header & Footer
import FeedHeader from "../components/1_Feed/FeedHeader";
import Footer from "../components/Footer";

// Sections
import WeekCalendar from "../components/3_Workout/sections/WeekCalendar";
import TemplatesRail from "../components/3_Workout/sections/TemplatesRail";
import MiniPodium from "../components/3_Workout/sections/MiniPodium";

// Modals / Sheets
import NewWorkoutBottomSheet from "../components/3_Workout/NewWorkout/NewWorkoutBottomSheet";
import EditTemplateBottomSheet from "../components/3_Workout/Template/EditTemplateBottomSheet";
import WorkoutSummaryModal from "../components/3_Workout/WorkoutSummaryModal";
import DayDetailsSheet from "../components/3_Workout/DayDetailsSheet";
import FriendsActivitySheet from "../components/3_Workout/FriendsActivitySheet";

// UI bits
import LiveStack from "../components/3_Workout/LiveStack";
import SectionDivider from "../components/3_Workout/ui/SectionDivider";
import StartOpenButton from "../components/3_Workout/ui/StartOpenButton";

// Theme
import {
    ss,
    FOOTER_HEIGHT,
    BTN_SIZE,
    SMALL_SIZE,
    ROW_WIDTH,
    TPL_BOTTOM_GAP,
} from "../components/3_Workout/sections/workoutTheme";

// Hooks (project)
import { useFoodLogs } from "../hooks/useFoodLogs";
import useResolvedUid from "../hooks/useResolvedUid";
import useUserDoc from "../hooks/useUserDoc";

// PFP cache bridge
import { usePfp } from "../helper/usePFPs";

// Backend helpers
import updateDoc from "../../backend/helper/firebase/updateDoc";
import makeID from "../../backend/helper/makeID";
import getAllUsers from "../helper/getAllUsers";
import rankUsers from "../helper/rankUsers";

// Firestore
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase.config";

// Utils
import millisToHMS from "../helper/millisToHoursMinutesSeconds";

/* ---------------- helpers ---------------- */
const PREVIEW_EXERCISE = "Bench Press (Barbell)";
const PREVIEW_LABEL = "Bench Press • 1RM";

const toDayKey = (d) => {
    if (!d && d !== 0) return "";
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return "";
    x.setHours(0, 0, 0, 0);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(
        x.getDate()
    ).padStart(2, "0")}`;
};

const toMillis = (v) => {
    if (typeof v === "number") return v;
    if (v instanceof Date) return v.getTime();
    if (v?.toMillis) return v.toMillis();
    if (typeof v?.seconds === "number") return v.seconds * 1000;
    return 0;
};

const sanitizeWorkout = (w) => {
    if (!w) return null;
    const created = toMillis(w.created ?? w.createdAt);
    if (!created) return null;
    return { ...w, created };
};

/** MiniPodium adapter */
const PodiumPreview = React.memo(function PodiumPreview({ top3 = [] }) {
    const p0 = usePfp(top3?.[0]?.uid);
    const p1 = usePfp(top3?.[1]?.uid);
    const p2 = usePfp(top3?.[2]?.uid);

    const data = [];
    if (top3?.[0]) data.push({ pfp: p0 || top3[0].fallbackPfp || "", handle: top3[0].handle || "", stat: top3[0].stat || 0 });
    if (top3?.[1]) data.push({ pfp: p1 || top3[1].fallbackPfp || "", handle: top3[1].handle || "", stat: top3[1].stat || 0 });
    if (top3?.[2]) data.push({ pfp: p2 || top3[2].fallbackPfp || "", handle: top3[2].handle || "", stat: top3[2].stat || 0 });

    return <MiniPodium data={data} />;
});

/* ======================== Component ======================== */
export default function Workout({ navigation, route }) {
    const uid = useResolvedUid(route);
    const user = useUserDoc(uid);

    /* --- HARD SCRUB BEFORE FIRST RENDER (prevents phantom 00:00) --- */
    const didBootScrub = useRef(false);
    if (!didBootScrub.current) {
        try {
            global.isCurrentlyWorkingOut = false;
            if (global?.userData) global.userData.currentWorkout = null;
        } catch { }
        didBootScrub.current = true;
    }

    /* ---------- UI/anim ---------- */
    const scaleAnim = useRef(new Animated.Value(0.92)).current;
    useEffect(() => {
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 6, tension: 80 }).start();
    }, []);

    const toMessages = useCallback(() => navigation?.navigate("Messages"), [navigation]);
    const toNotifications = useCallback(() => navigation?.navigate("Notifications"), [navigation]);

    /* ---------- calories (today) ---------- */
    const stableToday = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);
    const { totals: todayTotals } = useFoodLogs(stableToday, uid);
    const todayCalories = Math.round(Math.max(0, todayTotals?.calories || 0));
    const caloriesGoal = useMemo(
        () => user?.macroGoals?.calories ?? user?.macrosGoal?.calories ?? 2340,
        [user?.macroGoals?.calories, user?.macrosGoal?.calories]
    );
    const fill = Math.min(100, (todayCalories / Math.max(1, caloriesGoal)) * 100);

    /* ---------- templates ---------- */
    const [templates, setTemplates] = useState(() => {
        const src = Array.isArray(user?.templates) ? user.templates : global?.userData?.templates || [];
        return (src || []).map((t) => (t?.tid ? t : { ...t, tid: makeID() }));
    });
    useEffect(() => {
        const src = Array.isArray(user?.templates) ? user.templates : [];
        setTemplates((src || []).map((t) => (t?.tid ? t : { ...t, tid: makeID() })));
    }, [user?.templates]);

    const templatesWithNone = useMemo(
        () => [{ id: "none", name: "No template selected", exercises: [], lastDate: null, isNone: true }, ...templates],
        [templates]
    );
    const [activeIdx, setActiveIdx] = useState(0);

    const openedTemplateRef = useRef(null);
    const [isEditTemplateVisible, setIsEditTemplateVisible] = useState(false);

    const queueSaveTemplates = useRef();
    queueSaveTemplates.current = async (next) => {
        if (!uid) return;
        try {
            await updateDoc("users", uid, { templates: next });
        } catch (e) {
            console.log("save templates error", e);
        }
    };

    const initTemplate = useCallback(() => {
        const tid = makeID();
        const newTemplate = { id: tid, tid, name: "Untitled Template", exercises: [], lastDate: null };
        setTemplates((prev) => {
            const next = [...prev, newTemplate];
            queueSaveTemplates.current?.(next);
            return next;
        });
        openedTemplateRef.current = newTemplate;
        setIsEditTemplateVisible(true);
    }, []);

    const openEditTemplate = useCallback((tpl) => {
        if (!tpl || tpl.isNone) return;
        openedTemplateRef.current = { ...tpl };
        setIsEditTemplateVisible(true);
    }, []);

    const updateTemplate = useCallback(() => {
        setTemplates((prev) => {
            const idx = prev.findIndex((t) => t.tid === openedTemplateRef.current?.tid);
            if (idx === -1) return prev;
            const next = [...prev];
            next[idx] = { ...openedTemplateRef.current };
            queueSaveTemplates.current?.(next);
            return next;
        });
    }, []);

    const deleteTemplate = useCallback(() => {
        setTemplates((prev) => {
            const next = prev.filter((t) => t.tid !== openedTemplateRef.current?.tid);
            queueSaveTemplates.current?.(next);
            return next;
        });
        openedTemplateRef.current = null;
        setIsEditTemplateVisible(false);
    }, []);

    /* ---------- workout state (simple) ---------- */
    // Initialize from user once; if they truly had an in-progress workout, it will appear.
    const [workout, setWorkout] = useState(() => sanitizeWorkout(user?.currentWorkout) || null);
    const hasActiveWorkout = !!workout;

    // Timer: starts EMPTY; only ticks if workout exists
    const timerRef = useRef("");        // <<< no default "00:00"
    const tickRef = useRef(null);
    const startTimer = useCallback((created) => {
        clearInterval(tickRef.current);
        timerRef.current = millisToHMS(Date.now() - created);
        tickRef.current = setInterval(() => {
            timerRef.current = millisToHMS(Date.now() - created);
        }, 1000);
    }, []);
    const stopTimer = useCallback(() => {
        clearInterval(tickRef.current);
        tickRef.current = null;
        timerRef.current = "";            // <<< stays blank with no workout
    }, []);
    useEffect(() => {
        if (workout?.created) startTimer(workout.created);
        else stopTimer();
        return () => clearInterval(tickRef.current);
    }, [workout?.created, startTimer, stopTimer]);

    const createWorkoutDoc = useCallback(
        async (wid) => {
            try {
                await setDoc(
                    doc(db, "workouts", wid),
                    {
                        wid,
                        creatorUid: uid,
                        createdAt: serverTimestamp(),
                        active: true,
                        members: [uid],
                        updatedAt: serverTimestamp(),
                    },
                    { merge: true }
                );
            } catch (e) {
                console.log("createWorkoutDoc error", e);
            }
        },
        [uid]
    );

    const pushCurrentWorkoutRemote = useCallback(
        async (value) => {
            if (!uid) return;
            try {
                await updateDoc("users", uid, { currentWorkout: value || null });
            } catch (e) {
                console.log("update currentWorkout error", e);
            }
        },
        [uid]
    );

    const startWorkoutFromTemplate = useCallback(
        async (tplOrNull) => {
            if (hasActiveWorkout) {
                setIsNewWorkoutVisible(true);
                return;
            }
            const wid = makeID();
            const newWorkout = {
                wid,
                creatorUID: uid,
                created: Date.now(),
                users: [],
                exercises: tplOrNull?.exercises ? [...tplOrNull.exercises] : [],
                tid: tplOrNull?.tid || tplOrNull?.id || null,
                volume: 0,
                reps: 0,
                PBs: 0,
            };
            setWorkout(newWorkout);
            setIsNewWorkoutVisible(true);
            global.isCurrentlyWorkingOut = true;
            try {
                await createWorkoutDoc(wid);
            } finally {
                pushCurrentWorkoutRemote(newWorkout);
            }
        },
        [createWorkoutDoc, hasActiveWorkout, pushCurrentWorkoutRemote, uid]
    );

    const onStartWorkout = useCallback(() => {
        const selected = templatesWithNone[Math.max(0, Math.min(activeIdx, templatesWithNone.length - 1))];
        startWorkoutFromTemplate(selected?.isNone ? null : selected);
    }, [activeIdx, templatesWithNone, startWorkoutFromTemplate]);

    const updateNewWorkout = useCallback((next) => setWorkout(next), []);

    const clearAllWorkoutState = useCallback(() => {
        setWorkout(null);
        global.isCurrentlyWorkingOut = false;
        try { if (global?.userData) global.userData.currentWorkout = null; } catch { }
        stopTimer();
    }, [stopTimer]);

    const cancelWorkout = useCallback(async () => {
        clearAllWorkoutState();
        pushCurrentWorkoutRemote(null);
    }, [clearAllWorkoutState, pushCurrentWorkoutRemote]);

    const [completedWorkout, setCompletedWorkout] = useState(null);
    const [isNewWorkoutVisible, setIsNewWorkoutVisible] = useState(false);
    const [isSummaryModalVisible, setIsSummaryModalVisible] = useState(false);

    const finishWorkout = useCallback(async () => {
        if (!workout) return;

        const cleaned = (Array.isArray(workout.exercises) ? workout.exercises : [])
            .map((ex) => ({
                ...ex,
                sets: (Array.isArray(ex.sets) ? ex.sets : []).filter((s) => Number(s?.weight) > 0 && Number(s?.reps) > 0),
            }))
            .filter((ex) => ex.sets && ex.sets.length > 0);

        const duration = Math.max(0, Date.now() - (workout.created || Date.now()));
        const completed = { ...workout, duration, exercises: cleaned };

        setCompletedWorkout(completed);
        setIsSummaryModalVisible(true);

        try {
            const arr = Array.isArray(global?.userData?.completedWorkouts)
                ? [...global.userData.completedWorkouts]
                : [];
            arr.push(completed);
            if (global?.userData) {
                global.userData.completedWorkouts = arr;
                const dk = toDayKey(completed.created);
                global.userData.workoutsByDate = { ...(global.userData.workoutsByDate || {}), [dk]: true };
            }
        } catch { }

        clearAllWorkoutState();
        pushCurrentWorkoutRemote(null);
    }, [clearAllWorkoutState, pushCurrentWorkoutRemote, workout]);

    const postWorkout = useCallback(async () => {
        setIsSummaryModalVisible(false);
        try {
            await navigation.navigate("ProfileStack", { screen: "Profile" });
            navigation.navigate("ProfileStack", { screen: "SelectPhotos", params: { workout: completedWorkout } });
        } catch { }
    }, [completedWorkout, navigation]);

    /* ---------- Day sheet ---------- */
    const [daySheetToggle, setDaySheetToggle] = useState(false);
    const [daySheetVisible, setDaySheetVisible] = useState(false);
    const [daySheetDate, setDaySheetDate] = useState(null);
    const sheetDate = useMemo(() => daySheetDate ?? stableToday, [daySheetDate, stableToday]);

    const { meals: sheetMeals, totals: sheetTotals } = useFoodLogs(sheetDate, uid);
    const dayWorkouts = useMemo(() => {
        const dk = toDayKey(sheetDate);
        const completed = Array.isArray(global?.userData?.completedWorkouts) ? global.userData.completedWorkouts : [];
        const active = workout ? [workout] : [];
        return [...completed, ...active]
            .filter((w) => {
                const when = toMillis(w?.created ?? w?.createdAt);
                return when && toDayKey(when) === dk;
            })
            .sort((a, b) => toMillis(b?.created ?? b?.createdAt) - toMillis(a?.created ?? a?.createdAt));
    }, [sheetDate, workout]);

    /* ---------- Friends Activity (hardcoded) ---------- */
    const [friendsSheetToggle, setFriendsSheetToggle] = useState(false);
    const [friendsSheetVisible, setFriendsSheetVisible] = useState(false);
    const friendsActivity = useMemo(
        () => [
            { id: "live-jordan", uid: "u_jordan", name: "Jordan P.", handle: "@jordan", pfp: "https://i.pravatar.cc/200?img=5", live: true, created: Date.now() - 8 * 60 * 1000, exercises: 3, duration: 8, wid: "live_123" },
            { id: "sam-finished", uid: "u_sam", name: "Samira K.", handle: "@samira", pfp: "https://i.pravatar.cc/200?img=15", live: false, created: Date.now() - 2 * 60 * 60 * 1000, exercises: 8, duration: 46, wid: "w_a1" },
            { id: "lee-finished", uid: "u_lee", name: "Lee H.", handle: "@leeho", pfp: "https://i.pravatar.cc/200?img=23", live: false, created: Date.now() - 7 * 60 * 60 * 1000, exercises: 6, duration: 39, wid: "w_b2" },
            { id: "maya-live", uid: "u_maya", name: "Maya R.", handle: "@mayar", pfp: "https://i.pravatar.cc/200?img=31", live: true, created: Date.now() - 3 * 60 * 1000, exercises: 2, duration: 3, wid: "live_456" },
        ],
        []
    );

    /* ---------- Mini podium ---------- */
    const [top3, setTop3] = useState([]);
    const allUsersRef = useRef([]);
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const all = await getAllUsers();
                if (!mounted) return;
                allUsersRef.current = Array.isArray(all) ? all : [];
                const ranked = rankUsers(allUsersRef.current, PREVIEW_EXERCISE) || [];
                const top = ranked.slice(0, 3).map((u) => {
                    const stat = u?.statsExercises?.[PREVIEW_EXERCISE]?.["1RM"] ?? 0;
                    return { uid: u?.uid, handle: u?.handle ?? "", stat, fallbackPfp: u?.pfp || u?.image || null };
                });
                setTop3(top);
            } catch (e) {
                console.log("MiniPodium load error", e);
                setTop3([]);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    /* ---------------- render ---------------- */
    const liveNow = [
        { uid: "a1", pfp: "https://i.pravatar.cc/200?img=11" },
        { uid: "a2", pfp: "https://i.pravatar.cc/200?img=12" },
        { uid: "a3", pfp: "https://i.pravatar.cc/200?img=13" },
    ];

    return (
        <SafeAreaView style={styles.root}>
            <FeedHeader
                toMessagesScreen={toMessages}
                onOpenNotifications={toNotifications}
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
                <View style={styles.hubRow}>
                    {/* Calories card */}
                    <Pressable
                        style={styles.card}
                        onPress={() => navigation.navigate("MacroTrackingOverlay")}
                        android_ripple={{ color: "rgba(2,6,23,0.08)", radius: 120, borderless: false }}
                    >
                        <Text style={styles.macrosCaption}>Today’s Calories</Text>
                        <View style={styles.ringWrap}>
                            <AnimatedCircularProgress
                                size={ss(140)}
                                width={13}
                                fill={fill}
                                tintColor="#6FB8FF"
                                backgroundColor="#E2E8F0"
                                lineCap="round"
                                arcSweepAngle={360}
                                rotation={0}
                            >
                                {() => (
                                    <View style={styles.ringCenter}>
                                        <Text style={styles.kcalValue}>{todayCalories.toLocaleString()}</Text>
                                        <Text style={styles.kcalSub}>/ {caloriesGoal.toLocaleString()} kcal</Text>
                                    </View>
                                )}
                            </AnimatedCircularProgress>
                        </View>
                    </Pressable>

                    {/* Mini podium */}
                    <View style={styles.card}>
                        <Text style={styles.podiumCaption}>{PREVIEW_LABEL}</Text>
                        <PodiumPreview top3={top3} />
                    </View>
                </View>

                <SectionDivider />
            </View>

            {/* Templates rail */}
            <View style={styles.templatesDock} pointerEvents="box-none">
                <TemplatesRail
                    templates={templatesWithNone}
                    onIndexChange={setActiveIdx}
                    onAddTemplate={initTemplate}
                    onOpenTemplate={openEditTemplate}
                />
            </View>

            {/* START cluster */}
            <View style={styles.clusterWrap} pointerEvents="box-none">
                <View style={styles.actionsRow} pointerEvents="box-none">
                    {/* Make a Post */}
                    <Pressable
                        hitSlop={8}
                        android_ripple={{ color: "rgba(2,6,23,0.08)", radius: SMALL_SIZE / 2, borderless: true }}
                        accessibilityRole="button"
                        accessibilityLabel="Create a post"
                        style={({ pressed }) => [styles.smallBtn, pressed && styles.smallBtnPressed]}
                        onPress={() => navigation?.navigate("ProfileStack", { screen: "SelectPhotos" })}
                    >
                        <AddSquare size={24} color="#000" />
                    </Pressable>

                    {/* Start / Open button */}
                    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                        <StartOpenButton
                            hasActiveWorkout={hasActiveWorkout}
                            onOpen={() => setIsNewWorkoutVisible(true)}
                            onStart={onStartWorkout}
                        />
                    </Animated.View>

                    {/* Friends live */}
                    <Pressable
                        hitSlop={8}
                        android_ripple={{ color: "rgba(2,6,23,0.08)", radius: SMALL_SIZE / 2, borderless: true }}
                        accessibilityRole="button"
                        accessibilityLabel="Friends training now"
                        style={({ pressed }) => [styles.smallBtn, pressed && styles.smallBtnPressed]}
                        onPress={() => {
                            setFriendsSheetVisible(true);
                            setFriendsSheetToggle((f) => !f);
                        }}
                    >
                        <LiveStack users={liveNow} />
                    </Pressable>
                </View>
            </View>

            <Footer navigation={navigation} currentScreenName={"Workout"} />

            {/* Sheets/Modals */}
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

            <EditTemplateBottomSheet
                isVisible={isEditTemplateVisible}
                setIsVisible={setIsEditTemplateVisible}
                openedTemplateRef={openedTemplateRef}
                updateTemplate={updateTemplate}
                deleteTemplate={deleteTemplate}
            />

            <WorkoutSummaryModal
                isVisible={isSummaryModalVisible}
                workout={completedWorkout}
                onClose={() => setIsSummaryModalVisible(false)}
                postWorkout={postWorkout}
            />

            {/* Day details bottom sheet */}
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
                onOpenMacros={() => {
                    setDaySheetVisible(false);
                    navigation.navigate("MacroTrackingOverlay");
                }}
            />

            {/* Friends activity bottom sheet */}
            <FriendsActivitySheet
                visible={friendsSheetVisible}
                openToggle={friendsSheetToggle}
                items={friendsActivity}
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
        </SafeAreaView>
    );
}

/* ---------------- styles ---------------- */
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F7FAFF" },
    content: { flex: 1 },

    hubRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginTop: 6 },
    card: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 22,
        padding: 14,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(2,6,23,0.06)",
        ...Platform.select({
            ios: { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
            android: { elevation: 2 },
        }),
    },

    macrosCaption: { color: "#64748B", fontSize: 12, fontFamily: "Outfit_700Bold", marginBottom: 18 },
    podiumCaption: { color: "#64748B", fontSize: 12, fontFamily: "Outfit_700Bold", marginBottom: 8 },

    ringWrap: { alignItems: "center", justifyContent: "center" },
    ringCenter: { alignItems: "center", justifyContent: "center" },
    kcalValue: { color: "#0F172A", fontSize: ss(26), fontFamily: "Outfit_800ExtraBold", marginTop: -3, letterSpacing: 0.2 },
    kcalSub: { color: "#64748B", fontSize: ss(12.5), fontFamily: "Outfit_600SemiBold" },

    templatesDock: { position: "absolute", left: 0, right: 0, bottom: FOOTER_HEIGHT + ss(22) + BTN_SIZE + TPL_BOTTOM_GAP },

    clusterWrap: { position: "absolute", left: 0, right: 0, bottom: FOOTER_HEIGHT + ss(20), alignItems: "center" },
    actionsRow: { width: ROW_WIDTH, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },

    smallBtn: {
        width: SMALL_SIZE,
        height: SMALL_SIZE,
        borderRadius: SMALL_SIZE / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
        ...Platform.select({
            ios: { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
            android: { elevation: 3 },
        }),
    },
    smallBtnPressed: { transform: [{ scale: 0.96 }], backgroundColor: "#F1F5F9" },
});
