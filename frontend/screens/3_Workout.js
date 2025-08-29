// LiveNow + Nudges → (Calories ring, Mini Podium) → Templates rail → Nike-style START

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    SafeAreaView,
    View,
    StyleSheet,
    Dimensions,
    Pressable,
    Animated,
    Text,
    Platform,
    Alert,
    InteractionManager,
} from "react-native";
import { AddSquare } from "iconsax-react-native";
import { AnimatedCircularProgress } from "react-native-circular-progress";

// Firestore
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase.config";

// Header & Footer
import FeedHeader from "../components/1_Feed/FeedHeader";
import Footer from "../components/Footer";

// Sections
import MiniPodium from "../components/3_Workout/sections/MiniPodium";
import TemplatesRail from "../components/3_Workout/sections/TemplatesRail";
import WeekCalendar from "../components/3_Workout/sections/WeekCalendar";

// Template editor (bottom sheet)
import EditTemplateBottomSheet from "../components/3_Workout/Template/EditTemplateBottomSheet";

// Theme
import {
    ss,
    FOOTER_HEIGHT,
    BTN_SIZE,
    SMALL_SIZE,
    ROW_WIDTH,
    TPL_BOTTOM_GAP,
} from "../components/3_Workout/sections/workoutTheme";

import makeID from "../../backend/helper/makeID";
import updateDoc from "../../backend/helper/firebase/updateDoc";
import NewWorkoutBottomSheet from "../components/3_Workout/NewWorkout/NewWorkoutBottomSheet";
import millisToHoursMinutesSeconds from "../helper/millisToHoursMinutesSeconds";

// Calories hook
import { useFoodLogs } from "../hooks/useFoodLogs";

// Hooks
import useResolvedUid from "../hooks/useResolvedUid";
import useUserDoc from "../hooks/useUserDoc";

// Live PFP stack
import LiveStack from "../components/3_Workout/LiveStack";

// NEW split UI
import SectionDivider from "../components/3_Workout/ui/SectionDivider";
import StartOpenButton from "../components/3_Workout/ui/StartOpenButton";

// Backend helpers for podium preview
import getAllUsers from "../helper/getAllUsers";
import rankUsers from "../helper/rankUsers";

// 🔁 PFP resolver (cache-aware)
import { usePfp } from "../helper/usePFPs";

const { width: W } = Dimensions.get("window");

// ensure each template has a stable `tid`
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

const PREVIEW_EXERCISE = "Bench Press (Barbell)";
const PREVIEW_LABEL = "Bench Press • 1RM";

/* Small bridge that converts top-3 {uid, handle, stat, fallbackPfp} → MiniPodium data using usePfp */
const PodiumPreview = React.memo(function PodiumPreview({ top3 = [] }) {
    const p0 = usePfp(top3?.[0]?.uid);
    const p1 = usePfp(top3?.[1]?.uid);
    const p2 = usePfp(top3?.[2]?.uid);

    const data = [];
    if (top3?.[0])
        data.push({
            pfp: p0 || top3[0].fallbackPfp || "",
            handle: top3[0].handle || "",
            stat: top3[0].stat || 0,
        });
    if (top3?.[1])
        data.push({
            pfp: p1 || top3[1].fallbackPfp || "",
            handle: top3[1].handle || "",
            stat: top3[1].stat || 0,
        });
    if (top3?.[2])
        data.push({
            pfp: p2 || top3[2].fallbackPfp || "",
            handle: top3[2].handle || "",
            stat: top3[2].stat || 0,
        });

    return <MiniPodium data={data} />;
});

// YYYY-MM-DD helper
const toDayKey = (msOrDate) => {
    if (!msOrDate && msOrDate !== 0) return "";
    let ms = msOrDate;
    if (typeof msOrDate === "object") {
        if (typeof msOrDate?.toMillis === "function") ms = msOrDate.toMillis();
        else if (msOrDate instanceof Date) ms = msOrDate.getTime();
        else ms = 0;
    }
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return "";
    d.setHours(0, 0, 0, 0);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

export default function Workout({ navigation, route }) {
    /* ---------- resolve uid & hydrate user ---------- */
    const uid = useResolvedUid(route);
    const user = useUserDoc(uid); // writes to global.userData, returns latest user doc (or null while loading)

    /* ---------- ui & anim ---------- */
    const scaleAnim = useRef(new Animated.Value(0.92)).current;
    const allUsersRef = useRef([]);

    const toMessagesScreen = useCallback(() => navigation?.navigate("Messages"), [navigation]);
    const onOpenNotifications = useCallback(() => navigation?.navigate("Notifications"), [navigation]);
    const scrollToTop = useCallback(() => { }, []);

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 6,
            tension: 80,
        }).start();
    }, []);

    /* ---------- calories (bind to uid) ---------- */
    const baseTodayTs = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }, []);
    const todayForHook = useMemo(() => new Date(baseTodayTs), [baseTodayTs, uid]);

    const { totals } = useFoodLogs(todayForHook, uid);
    const calories = Math.round(Math.max(0, totals?.calories || 0));
    const caloriesGoal = useMemo(() => {
        return user?.macroGoals?.calories ?? user?.macrosGoal?.calories ?? 2340;
    }, [user?.macroGoals?.calories, user?.macrosGoal?.calories]);
    const fill = Math.min(100, (calories / Math.max(1, caloriesGoal)) * 100);

    /* ---------- templates (local state + sync to user doc) ---------- */
    const [templates, setTemplates] = useState([]);
    useEffect(() => {
        setTemplates(normalizeTemplates(user?.templates || []));
    }, [user?.templates]);

    const templatesWithNone = useMemo(
        () => [{ id: "none", name: "No template selected", exercises: [], lastDate: null, isNone: true }, ...templates],
        [templates]
    );
    const [activeIdx, setActiveIdx] = useState(0);

    // debounced saver for templates
    const saveDebounceRef = useRef(null);
    const queueSaveTemplates = useCallback(
        (nextTemplates) => {
            if (!uid) return;
            if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
            saveDebounceRef.current = setTimeout(async () => {
                try {
                    await updateDoc("users", uid, { templates: nextTemplates });
                } catch (e) {
                    console.log("save templates error", e);
                }
            }, 500);
        },
        [uid]
    );

    /* ---------- workout state ---------- */
    const [workout, setWorkout] = useState(null);
    const hasActiveWorkout = !!workout;
    const [isNewWorkoutBottomSheetVisible, setIsNewWorkoutBottomSheetVisible] = useState(false);
    const workoutTimeInterval = useRef(null);
    const timerRef = useRef("00:00");
    const startGuardRef = useRef(false); // tiny press guard

    useEffect(() => {
        if (workout?.created) {
            workoutTimeInterval.current = setInterval(() => {
                const diff = Date.now() - workout.created;
                timerRef.current = millisToHoursMinutesSeconds(diff);
            }, 1000);
        }
        return () => clearInterval(workoutTimeInterval.current);
    }, [workout?.created]);

    const createWorkoutDoc = useCallback(
        async (wid) => {
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
        },
        [uid]
    );

    // ===== START — empty workout (optimistic + background writes) =====
    const startNewWorkout = useCallback(() => {
        if (startGuardRef.current) return;
        startGuardRef.current = true;
        setTimeout(() => (startGuardRef.current = false), 500);

        if (!uid) {
            Alert.alert("Sign in required", "Please log in to start a workout.");
            return;
        }

        try {
            if (!workout) {
                global.isCurrentlyWorkingOut = true;
                const wid = makeID();
                const newWorkout = {
                    wid,
                    creatorUID: uid,
                    created: Date.now(),
                    users: [],
                    exercises: [],
                    tid: null,
                    volume: 0,
                    reps: 0,
                    PBs: 0,
                };

                setWorkout(newWorkout);
                setIsNewWorkoutBottomSheetVisible(true);

                InteractionManager.runAfterInteractions(() => {
                    createWorkoutDoc(wid)
                        .then(() => updateDoc("users", uid, { currentWorkout: newWorkout }))
                        .catch((e) => console.log("startNewWorkout background writes error", e));
                });
            } else {
                setIsNewWorkoutBottomSheetVisible(true);
            }
        } catch (e) {
            console.log("startNewWorkout error", e);
            Alert.alert("Couldn't start workout", e?.message || "Please try again.");
        }
    }, [uid, workout, createWorkoutDoc]);

    // ===== START — from template (optimistic + background writes) =====
    const startWorkoutFromTemplate = useCallback(
        (tplItem) => {
            if (startGuardRef.current) return;
            startGuardRef.current = true;
            setTimeout(() => (startGuardRef.current = false), 500);

            if (!uid) {
                Alert.alert("Sign in required", "Please log in to start a workout.");
                return;
            }
            try {
                const selectedTemplate = tplItem?.isNone ? null : tplItem;
                if (!selectedTemplate) return startNewWorkout();

                if (!workout) {
                    global.isCurrentlyWorkingOut = true;
                    const wid = makeID();
                    const newWorkout = {
                        wid,
                        creatorUID: uid,
                        created: Date.now(),
                        users: [],
                        exercises: Array.isArray(selectedTemplate.exercises) ? [...selectedTemplate.exercises] : [],
                        tid: selectedTemplate.tid || selectedTemplate.id,
                        volume: 0,
                        reps: 0,
                        PBs: 0,
                    };

                    setWorkout(newWorkout);
                    setIsNewWorkoutBottomSheetVisible(true);

                    InteractionManager.runAfterInteractions(() => {
                        createWorkoutDoc(wid)
                            .then(() => updateDoc("users", uid, { currentWorkout: newWorkout }))
                            .catch((e) => console.log("startWorkoutFromTemplate background writes error", e));
                    });
                } else {
                    setIsNewWorkoutBottomSheetVisible(true);
                }
            } catch (e) {
                console.log("startWorkoutFromTemplate error", e);
                Alert.alert("Couldn't start from template", e?.message || "Please try again.");
            }
        },
        [uid, workout, createWorkoutDoc, startNewWorkout]
    );

    const onStartWorkout = useCallback(() => {
        const selected = templatesWithNone[Math.max(0, Math.min(activeIdx, templatesWithNone.length - 1))];
        if (!selected || selected.isNone) startNewWorkout();
        else startWorkoutFromTemplate(selected);
    }, [activeIdx, templatesWithNone, startNewWorkout, startWorkoutFromTemplate]);

    const updateNewWorkout = useCallback((next) => setWorkout(next), []);

    const cancelWorkout = useCallback(async () => {
        try {
            global.isCurrentlyWorkingOut = false;
            clearInterval(workoutTimeInterval.current);
            timerRef.current = "00:00";
            setIsNewWorkoutBottomSheetVisible(false);
            setWorkout(null);
            if (uid) await updateDoc("users", uid, { currentWorkout: null });
        } catch (e) {
            console.log("cancelWorkout error", e);
        }
    }, [uid]);

    const finishNewWorkout = useCallback(async () => {
        try {
            global.isCurrentlyWorkingOut = false;
            clearInterval(workoutTimeInterval.current);
            timerRef.current = "00:00";
            setIsNewWorkoutBottomSheetVisible(false);
            setWorkout(null);
            if (uid) await updateDoc("users", uid, { currentWorkout: null });
        } catch (e) {
            console.log("finishNewWorkout error", e);
        }
    }, [uid]);

    /* ---------- Template editor wiring ---------- */
    const openedTemplateRef = useRef(null);
    const [isEditTemplateBottomSheetVisible, setIsEditTemplateBottomSheetVisible] = useState(false);

    const initTemplate = useCallback(() => {
        const tid = makeID();
        const newTemplate = {
            id: tid,
            tid,
            name: "Untitled Template",
            exercises: [],
            lastDate: null,
        };
        setTemplates((prev) => {
            const next = [...prev, newTemplate];
            queueSaveTemplates(next);
            return next;
        });
        openedTemplateRef.current = newTemplate;
        setIsEditTemplateBottomSheetVisible(true);
    }, [queueSaveTemplates]);

    const openEditTemplateBottomSheet = useCallback((tpl) => {
        if (!tpl || tpl.isNone) return;
        openedTemplateRef.current = { ...tpl }; // clone
        setIsEditTemplateBottomSheetVisible(true);
    }, []);

    const updateTemplate = useCallback(() => {
        setTemplates((prev) => {
            const idx = prev.findIndex((t) => t.tid === openedTemplateRef.current?.tid);
            if (idx === -1) return prev;
            const next = [...prev];
            next[idx] = { ...openedTemplateRef.current };
            queueSaveTemplates(next);
            return next;
        });
    }, [queueSaveTemplates]);

    const deleteTemplate = useCallback(() => {
        setTemplates((prev) => {
            const next = prev.filter((t) => t.tid !== openedTemplateRef.current?.tid);
            queueSaveTemplates(next);
            return next;
        });
        openedTemplateRef.current = null;
        setIsEditTemplateBottomSheetVisible(false);
    }, [queueSaveTemplates]);

    /* ---------- Mini podium (backend-driven with cached PFPs) ---------- */
    const [top3, setTop3] = useState([]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const all = await getAllUsers();
                if (!mounted) return;

                // hydrate search suggestions for FeedHeader
                allUsersRef.current = Array.isArray(all) ? all : [];

                // rank for Bench Press (Barbell) by 1RM and take top 3
                const ranked = rankUsers(allUsersRef.current, PREVIEW_EXERCISE) || [];
                const top = ranked.slice(0, 3).map((u) => {
                    const stat = u?.statsExercises?.[PREVIEW_EXERCISE]?.["1RM"] ?? 0;
                    return {
                        uid: u?.uid,
                        handle: u?.handle ?? "",
                        stat,
                        // fallback in case pfp cache hasn't resolved yet
                        fallbackPfp: u?.pfp || u?.image || null,
                    };
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

    /* ---------- Build workoutsMap from completedWorkouts (with active workout today) ---------- */
    const workoutsMap = useMemo(() => {
        const out = Object.create(null);
        const list =
            (Array.isArray(user?.completedWorkouts) && user.completedWorkouts) ||
            (Array.isArray(global?.userData?.completedWorkouts) && global.userData.completedWorkouts) ||
            [];

        for (const w of list) {
            const created = w?.created ?? w?.createdAt ?? 0;
            const key = toDayKey(created);
            if (key) out[key] = true;
        }

        // If there's an active (local) workout, mark that day too.
        if (workout?.created) {
            const key = toDayKey(workout.created);
            if (key) out[key] = true;
        }

        return out;
    }, [user?.completedWorkouts, workout?.created]);

    /* ---------------- render ---------------- */
    const liveNow = [
        { uid: "a1", pfp: "https://i.pravatar.cc/200?img=11" },
        { uid: "a2", pfp: "https://i.pravatar.cc/200?img=12" },
        { uid: "a3", pfp: "https://i.pravatar.cc/200?img=13" },
    ];

    return (
        <SafeAreaView style={styles.root}>
            {/* Header */}
            <FeedHeader
                toMessagesScreen={toMessagesScreen}
                onOpenNotifications={onOpenNotifications}
                backButton={false}
                onBackPress={() => navigation?.goBack?.()}
                scrollToTop={scrollToTop}
                navigation={navigation}
                allUsersRef={allUsersRef}
                workout={workout}
                timerRef={timerRef}
                openCurrentWorkout={() => setIsNewWorkoutBottomSheetVisible(true)}
            />

            {/* Overview + Calendar */}
            <View style={styles.content}>
                <WeekCalendar
                    // macrosMap kept for compatibility; coloring now handled internally
                    macrosMap={{}}
                    // ✅ blue bar data built from completedWorkouts (+ active workout)
                    workoutsMap={workoutsMap}
                />

                <View style={styles.hubRow}>
                    {/* Calories */}
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
                                        <Text style={styles.kcalValue}>{calories.toLocaleString()}</Text>
                                        <Text style={styles.kcalSub}>/ {caloriesGoal.toLocaleString()} kcal</Text>
                                    </View>
                                )}
                            </AnimatedCircularProgress>
                        </View>
                    </Pressable>

                    {/* Mini Podium (backend + cached PFPs) */}
                    <View style={styles.card}>
                        <Text style={styles.podiumCaption}>{PREVIEW_LABEL}</Text>
                        <PodiumPreview top3={top3} />
                    </View>
                </View>

                {/* Centered divider */}
                <SectionDivider />
            </View>

            {/* Templates Rail */}
            <View style={styles.templatesDock} pointerEvents="box-none">
                <TemplatesRail
                    templates={templatesWithNone}
                    onIndexChange={setActiveIdx}
                    onAddTemplate={initTemplate}
                    onOpenTemplate={openEditTemplateBottomSheet}
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

                    {/* Start / Open button (split) */}
                    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                        <StartOpenButton
                            hasActiveWorkout={hasActiveWorkout}
                            onOpen={() => setIsNewWorkoutBottomSheetVisible(true)}
                            onStart={onStartWorkout}
                        />
                    </Animated.View>

                    {/* Friends live/recent */}
                    <Pressable
                        hitSlop={8}
                        android_ripple={{ color: "rgba(2,6,23,0.08)", radius: SMALL_SIZE / 2, borderless: true }}
                        accessibilityRole="button"
                        accessibilityLabel="Friends training now"
                        style={({ pressed }) => [styles.smallBtn, pressed && styles.smallBtnPressed]}
                        onPress={() => Alert.alert("Friends", "Friends training now")}
                    >
                        <LiveStack users={liveNow} />
                    </Pressable>
                </View>
            </View>

            {/* Bottom nav */}
            <Footer navigation={navigation} currentScreenName={"Workout"} />

            {/* Workout Bottom Sheet */}
            <NewWorkoutBottomSheet
                workout={workout}
                cancelNewWorkout={cancelWorkout}
                updateNewWorkout={updateNewWorkout}
                finishNewWorkout={finishNewWorkout}
                isVisible={isNewWorkoutBottomSheetVisible}
                setIsVisible={setIsNewWorkoutBottomSheetVisible}
                timerRef={timerRef}
                showGroupModal={() => { }}
                userWorkoutStats={global?.userData?.statsExercises || {}}
            />

            {/* Template Editor Bottom Sheet */}
            <EditTemplateBottomSheet
                isVisible={isEditTemplateBottomSheetVisible}
                setIsVisible={setIsEditTemplateBottomSheetVisible}
                openedTemplateRef={openedTemplateRef}
                updateTemplate={updateTemplate}
                deleteTemplate={deleteTemplate}
            />
        </SafeAreaView>
    );
}

/* ---------------- styles (root + cards + cluster) ---------------- */
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

    macrosCaption: {
        color: "#64748B",
        fontSize: 12,
        fontFamily: "Outfit_700Bold",
        marginBottom: 18,
    },

    podiumCaption: {
        color: "#64748B",
        fontSize: 12,
        fontFamily: "Outfit_700Bold",
        marginBottom: 8,
    },

    ringWrap: { alignItems: "center", justifyContent: "center" },
    ringCenter: { alignItems: "center", justifyContent: "center" },
    kcalValue: {
        color: "#0F172A",
        fontSize: ss(26),
        fontFamily: "Outfit_800ExtraBold",
        marginTop: -3,
        letterSpacing: 0.2,
    },
    kcalSub: {
        color: "#64748B",
        fontSize: ss(12.5),
        fontFamily: "Outfit_600SemiBold",
    },

    /* Divider wrappers (center to rail/actions width) */
    sectionDividerOuter: {
        alignItems: "center",
        marginTop: 14,
        marginBottom: 12,
    },
    sectionDividerInner: {
        height: 22,
        justifyContent: "center",
        alignItems: "center",
    },

    templatesDock: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: FOOTER_HEIGHT + ss(22) + BTN_SIZE + TPL_BOTTOM_GAP,
    },

    clusterWrap: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: FOOTER_HEIGHT + ss(20),
        alignItems: "center",
    },
    actionsRow: {
        width: ROW_WIDTH,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
    },

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
    smallBtnPressed: {
        transform: [{ scale: 0.96 }],
        backgroundColor: "#F1F5F9",
    },
});
