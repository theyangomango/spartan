// screens/Workout.jsx
// LiveNow + Nudges → (Calories ring, Mini Podium) → Templates rail → Nike-style START
// START = empty or from selected template → opens NewWorkoutBottomSheet (same logic as your old component)

import React, { useCallback, useEffect, useRef, useState } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import FastImage from "react-native-fast-image";

// Firestore
import { setDoc, doc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.config";

// Old-component helpers/components (same signatures)
import Footer from "../components/Footer";

// Sections
import LiveNowBanner from "../components/3_Workout/sections/LiveNowBanner";
import RecentNudges from "../components/3_Workout/sections/RecentNudges";
import MiniPodium from "../components/3_Workout/sections/MiniPodium";
import TemplatesRail from "../components/3_Workout/sections/TemplatesRail";

// Theme (shared sizing/constants)
import {
    ss,
    FOOTER_HEIGHT,
    BTN_SIZE,
    SMALL_SIZE,
    ROW_WIDTH,
    TPL_BOTTOM_GAP,
    BLUE,
} from "../components/3_Workout/sections/workoutTheme"
import makeID from "../../backend/helper/makeID";
import updateDoc from "../../backend/helper/firebase/updateDoc";
import NewWorkoutBottomSheet from "../components/3_Workout/NewWorkout/NewWorkoutBottomSheet";
import millisToHoursMinutesSeconds from "../helper/millisToHoursMinutesSeconds";

// ---------- layout sizing ----------
const { width: W, height: H } = Dimensions.get("window");

// Utility: ensure each template has a stable `tid`
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
    const uid = route?.params?.uid || global?.userData?.uid;
    const scaleAnim = useRef(new Animated.Value(0.92)).current;

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 6,
            tension: 80,
        }).start();
    }, []);

    /* -------- demo data (visuals) -------- */
    const calories = 740;
    const caloriesGoal = 2340;
    const fill = Math.min(100, (calories / Math.max(1, caloriesGoal)) * 100);

    const podiumData = [
        { pfp: "https://i.pravatar.cc/200?img=1" },
        { pfp: "https://i.pravatar.cc/200?img=2" },
        { pfp: "https://i.pravatar.cc/200?img=3" },
    ];
    const podiumCaption = "Bench Press • 1RM";

    // ---------- Templates (from backend) ----------
    const [templates, setTemplates] = useState([
        { id: "none", name: "No template selected", exercises: [], lastDate: null, isNone: true },
    ]);
    const [activeIdx, setActiveIdx] = useState(0);

    // Subscribe to user's templates in Firestore (users/{uid}.templates)
    useEffect(() => {
        if (!uid) return;

        const userRef = doc(db, "users", uid);
        const unsub = onSnapshot(userRef, (snap) => {
            const data = snap.data() || {};
            // Prefer live user doc; fall back to global cache if missing
            const source =
                Array.isArray(data.templates) && data.templates.length
                    ? data.templates
                    : (Array.isArray(global?.userData?.templates) ? global.userData.templates : []);

            const normalized = normalizeTemplates(source);
            setTemplates([
                { id: "none", name: "No template selected", exercises: [], lastDate: null, isNone: true },
                ...normalized,
            ]);

            // Keep activeIdx in range
            setActiveIdx((idx) => Math.max(0, Math.min(idx, normalized.length)));
        });

        return () => unsub();
    }, [uid]);

    // Live/nudges demo (empty arrays show empty states)
    const liveNow = [
        { uid: "a1", pfp: "https://i.pravatar.cc/200?img=11" },
        { uid: "a2", pfp: "https://i.pravatar.cc/200?img=12" },
        { uid: "a3", pfp: "https://i.pravatar.cc/200?img=13" },
    ];
    const nudges = [
        { id: "n1", primary: "Jess finished", accent: "Push", tail: "45m ago", templateId: "t1" },
        { id: "n2", primary: "Arun PR’d on", accent: "Bench", tail: "1h ago", templateId: "t1" },
        { id: "n3", primary: "Maya logged", accent: "Legs • Volume", tail: "2h ago", templateId: "t3" },
    ];

    /* ---------------- state for workout + bottom sheet (like old component) ---------------- */
    const [workout, setWorkout] = useState(null);
    const [isNewWorkoutBottomSheetVisible, setIsNewWorkoutBottomSheetVisible] = useState(false);

    // old-component timer semantics
    const workoutTimeInterval = useRef(null);
    const timerRef = useRef("00:00");

    useEffect(() => {
        if (workout?.created) {
            workoutTimeInterval.current = setInterval(() => {
                const diff = Date.now() - workout.created;
                timerRef.current = millisToHoursMinutesSeconds(diff);
            }, 1000);
        }
        return () => clearInterval(workoutTimeInterval.current);
    }, [workout?.created]);

    // Firestore writer used by both start flows
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

    // ===== START — empty workout (old behavior) =====
    const startNewWorkout = useCallback(async () => {
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

                await createWorkoutDoc(wid);
                setWorkout(newWorkout);
                await updateDoc("users", uid, { currentWorkout: newWorkout });

                setIsNewWorkoutBottomSheetVisible(true);
            } else {
                setIsNewWorkoutBottomSheetVisible(true);
            }
        } catch (e) {
            console.log("startNewWorkout error", e);
            Alert.alert("Couldn't start workout", e?.message || "Please try again.");
        }
    }, [uid, workout, createWorkoutDoc]);

    // ===== START — from template (old behavior) =====
    const startWorkoutFromTemplate = useCallback(
        async (tplItem) => {
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

                    await createWorkoutDoc(wid);
                    setWorkout(newWorkout);
                    await updateDoc("users", uid, { currentWorkout: newWorkout });

                    setIsNewWorkoutBottomSheetVisible(true);
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

    // START handler for the big button — chooses based on selected card
    const onStartWorkout = useCallback(async () => {
        const selected = templates[Math.max(0, Math.min(activeIdx, templates.length - 1))];
        if (!selected || selected.isNone) {
            await startNewWorkout();
        } else {
            await startWorkoutFromTemplate(selected);
        }
    }, [activeIdx, templates, startNewWorkout, startWorkoutFromTemplate]);

    // ===== Bottom sheet callbacks (same names as your old component) =====
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

    const finishNewWorkout = useCallback(async (completed) => {
        try {
            global.isCurrentlyWorkingOut = false;
            clearInterval(workoutTimeInterval.current);
            timerRef.current = "00:00";
            setIsNewWorkoutBottomSheetVisible(false);
            setWorkout(null);
            if (uid) await updateDoc("users", uid, { currentWorkout: null });
            // Optionally navigate to summary/post flow
        } catch (e) {
            console.log("finishNewWorkout error", e);
        }
    }, [uid]);

    /* ---------------- render ---------------- */
    return (
        <SafeAreaView style={styles.root}>
            {/* Live + Nudges */}
            <View style={styles.liveWrap}>
                <LiveNowBanner
                    users={liveNow}
                    onView={() => Alert.alert("View", "Open live view")}
                    onCheer={() => Alert.alert("Cheer sent!")}
                />
                <RecentNudges
                    items={nudges}
                    onStartTemplate={(templateId) => {
                        const tpl = templates.find((t) => (t.tid || t.id) === templateId);
                        startWorkoutFromTemplate(tpl || { id: templateId });
                    }}
                />
            </View>

            {/* Overview cards */}
            <View style={styles.content}>
                <View style={styles.hubRow}>
                    {/* Calories */}
                    <View style={styles.card}>
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
                                        <Text style={styles.kcalValue}>{calories}</Text>
                                        <Text style={styles.kcalSub}>/ {caloriesGoal} kcal</Text>
                                    </View>
                                )}
                            </AnimatedCircularProgress>
                        </View>
                    </View>

                    {/* Mini Podium */}
                    <View style={styles.card}>
                        <Text style={styles.podiumCaption}>{podiumCaption}</Text>
                        <MiniPodium data={podiumData} />
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
                    <Pressable style={styles.smallBtn} hitSlop={8} onPress={() => Alert.alert("Settings")}>
                        <Ionicons name="settings-outline" size={18} color="#0F172A" />
                    </Pressable>

                    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                        <Pressable
                            onPress={onStartWorkout}
                            hitSlop={10}
                            style={({ pressed }) => [styles.startBtn, pressed && { transform: [{ scale: 0.98 }] }]}
                            accessibilityRole="button"
                            accessibilityLabel="Start workout"
                        >
                            <Text style={styles.startText}>START</Text>
                        </Pressable>
                    </Animated.View>

                    <Pressable style={styles.smallBtn} hitSlop={8} onPress={() => Alert.alert("Music")}>
                        <Ionicons name="home" size={18} color="#0F172A" />
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

    // Live + Nudges wrapper
    liveWrap: { paddingTop: 6, paddingBottom: 6, paddingHorizontal: 16 },

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

    /* Templates rail placement (between cards and START) */
    templatesDock: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: FOOTER_HEIGHT + ss(22) + BTN_SIZE + TPL_BOTTOM_GAP,
    },

    /* START cluster */
    clusterWrap: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: FOOTER_HEIGHT + ss(22),
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
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(2,6,23,0.08)",
        ...Platform.select({
            ios: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
            android: { elevation: 2 },
        }),
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
});
