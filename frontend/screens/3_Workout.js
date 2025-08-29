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
        return (
            user?.macroGoals?.calories ??
            user?.macrosGoal?.calories ?? // legacy
            2340
        );
    }, [user?.macroGoals?.calories, user?.macrosGoal?.calories]);
    const fill = Math.min(100, (calories / Math.max(1, caloriesGoal)) * 100);

    /* ---------- templates ---------- */
    const templates = useMemo(() => {
        const normalized = normalizeTemplates(user?.templates || []);
        return [{ id: "none", name: "No template selected", exercises: [], lastDate: null, isNone: true }, ...normalized];
    }, [user?.templates]);
    const [activeIdx, setActiveIdx] = useState(0);

    /* ---------- workout state ---------- */
    const [workout, setWorkout] = useState(null);
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

                // Instant UI
                setWorkout(newWorkout);
                setIsNewWorkoutBottomSheetVisible(true);

                // Background persistence
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

                    // Instant UI
                    setWorkout(newWorkout);
                    setIsNewWorkoutBottomSheetVisible(true);

                    // Background persistence
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
        const selected = templates[Math.max(0, Math.min(activeIdx, templates.length - 1))];
        if (!selected || selected.isNone) startNewWorkout();
        else startWorkoutFromTemplate(selected);
    }, [activeIdx, templates, startNewWorkout, startWorkoutFromTemplate]);

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

    /* ---------------- LONG-PRESS progress ring ---------------- */
    const HOLD_MS = 650;
    const [holdFill, setHoldFill] = useState(0);

    const handlePressIn = () => setHoldFill(100);
    const handlePressOut = () => setHoldFill(0);
    const handleLongPress = () => {
        onStartWorkout();
        setTimeout(() => setHoldFill(0), 250);
    };

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
            />

            {/* Overview + Calendar */}
            <View style={styles.content}>
                <WeekCalendar
                    macrosMap={global?.userData?.macrosCompleteMap || {}}
                    workoutsMap={global?.userData?.workoutsByDate || {}}
                />

                <View style={styles.hubRow}>
                    {/* Calories → navigate to overlay with LEFT slide */}
                    <Pressable
                        style={styles.card}
                        onPress={() => navigation.navigate('MacroTrackingOverlay')}
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

                    {/* Mini Podium */}
                    <View style={styles.card}>
                        <Text style={styles.podiumCaption}>Bench Press • 1RM</Text>
                        <MiniPodium data={[
                            { pfp: "https://i.pravatar.cc/200?img=1" },
                            { pfp: "https://i.pravatar.cc/200?img=2" },
                            { pfp: "https://i.pravatar.cc/200?img=3" }
                        ]} />
                    </View>
                </View>
            </View>

            {/* Templates Rail */}
            <View style={styles.templatesDock} pointerEvents="box-none">
                <TemplatesRail
                    templates={templates}
                    onIndexChange={setActiveIdx}
                    onAddTemplate={() => Alert.alert("Templates", "Open Create Template")}
                    onOpenTemplate={(tpl) => Alert.alert("Template", `Open ${tpl.name}`)}
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

                    {/* Long-press START with hold-progress ring */}
                    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                        <View style={{ width: BTN_SIZE, height: BTN_SIZE, alignItems: "center", justifyContent: "center" }}>
                            <Pressable
                                onLongPress={handleLongPress}
                                delayLongPress={HOLD_MS}
                                onPressIn={handlePressIn}
                                onPressOut={handlePressOut}
                                hitSlop={10}
                                style={({ pressed }) => [styles.startBtn, pressed && { transform: [{ scale: 0.98 }] }]}
                                accessibilityRole="button"
                                accessibilityLabel="Start workout"
                            >
                                <Text style={styles.startText}>START</Text>
                            </Pressable>

                            {/* progress ring overlay (non-blocking touches) */}
                            <View style={styles.holdRing} pointerEvents="none">
                                <AnimatedCircularProgress
                                    size={BTN_SIZE + 18}
                                    width={6}
                                    fill={holdFill}
                                    tintColor="#60A5FA"
                                    backgroundColor="rgba(2,6,23,0.12)"
                                    lineCap="round"
                                    arcSweepAngle={360}
                                    rotation={0}
                                    tweenDuration={HOLD_MS}
                                />
                            </View>
                        </View>
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

            {/* Bottom Sheet */}
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

    startBtn: {
        width: BTN_SIZE,
        height: BTN_SIZE,
        borderRadius: BTN_SIZE / 2,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0D0D0D",
        ...Platform.select({
            ios: { shadowColor: "#000", shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 12 } },
            android: { elevation: 8 },
        }),
    },
    startText: {
        color: "#FFFFFF",
        fontSize: 20,
        fontWeight: "900",
        textTransform: "uppercase",
        letterSpacing: 0.6,
        fontStyle: "italic",
        transform: [{ skewX: "-7deg" }],
    },

    // progress ring overlay for long press
    holdRing: {
        position: "absolute",
        alignItems: "center",
        justifyContent: "center",
    },
});
