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
import { AddSquare } from "iconsax-react-native";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import FastImage from "react-native-fast-image";

// Firestore
import { setDoc, doc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.config";

// Header
import FeedHeader from "../components/1_Feed/FeedHeader";

// Old-component helpers/components (same signatures)
import Footer from "../components/Footer";

// Sections
import LiveNowBanner from "../components/3_Workout/sections/LiveNowBanner";
import RecentNudges from "../components/3_Workout/sections/RecentNudges";
import MiniPodium from "../components/3_Workout/sections/MiniPodium";
import TemplatesRail from "../components/3_Workout/sections/TemplatesRail";
import WeekCalendar from "../components/3_Workout/sections/WeekCalendar";

// Theme (shared sizing/constants)
import {
    ss,
    FOOTER_HEIGHT,
    BTN_SIZE,
    SMALL_SIZE,
    ROW_WIDTH,
    TPL_BOTTOM_GAP,
    BLUE,
} from "../components/3_Workout/sections/workoutTheme";
import makeID from "../../backend/helper/makeID";
import updateDoc from "../../backend/helper/firebase/updateDoc";
import NewWorkoutBottomSheet from "../components/3_Workout/NewWorkout/NewWorkoutBottomSheet";
import millisToHoursMinutesSeconds from "../helper/millisToHoursMinutesSeconds";

// ---------- layout sizing ----------
const { width: W } = Dimensions.get("window");

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

/* -------------------- Centered PFP stack (bigger, pressable-friendly)
   - Anchored to the exact center of the white circular button via absolute
     positioning + translate, so it remains centered even if it overflows.
   - At most 2 visible slots:
       • 1 user  → 1 big avatar
       • 2 users → 2 avatars
       • 3+      → 1 avatar + "+N" counter
   - No accent dot. Thin white ring keeps overlaps clean. -------------------- */
function LiveStack({ users = [] }) {
    if (!users || users.length === 0) {
        return <Ionicons name="home" size={18} color="#0F172A" />;
    }

    const hasOverflow = users.length > 2;
    const show = hasOverflow ? users.slice(0, 1) : users.slice(0, 2);
    const overflow = hasOverflow ? users.length - 1 : 0;
    const slots = overflow > 0 ? 2 : show.length;

    // Larger sizes so faces read well
    const SINGLE_S = Math.round(SMALL_SIZE * 0.86); // one big face
    const DOUBLE_S = Math.round(SMALL_SIZE * 0.74); // two-slot layout
    const S = slots === 1 ? SINGLE_S : DOUBLE_S;
    const OFFSET = Math.round(S * 0.6); // overlap

    // Total width the stack occupies
    const usedWidth = slots === 1 ? S : S + OFFSET;

    return (
        <View
            pointerEvents="none"
            style={{ width: SMALL_SIZE, height: SMALL_SIZE, overflow: "visible" }}
        >
            {/* Center the whole stack to the middle of the button */}
            <View
                style={[
                    liveStack.centerWrap,
                    {
                        width: usedWidth,
                        height: S,
                        left: SMALL_SIZE / 2,
                        top: SMALL_SIZE / 2,
                        transform: [{ translateX: -usedWidth / 2 }, { translateY: -S / 2 }],
                    },
                ]}
            >
                {show.map((u, i) => (
                    <View
                        key={`${u?.pfp || "x"}-${i}`}
                        style={[
                            liveStack.pfp,
                            { width: S, height: S, borderRadius: S / 2, left: i * OFFSET, top: 0 },
                        ]}
                    >
                        <FastImage
                            source={{
                                uri: u?.pfp,
                                priority: FastImage.priority.normal,
                                cache: FastImage.cacheControl.immutable,
                            }}
                            style={{ width: "100%", height: "100%", borderRadius: S / 2 }}
                        />
                    </View>
                ))}

                {overflow > 0 && (
                    <View
                        style={[
                            liveStack.counter,
                            { width: S, height: S, borderRadius: S / 2, left: OFFSET, top: 0 },
                        ]}
                    >
                        <Text style={liveStack.counterText}>
                            {overflow > 9 ? "9+" : `+${overflow}`}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const liveStack = StyleSheet.create({
    centerWrap: {
        position: "absolute",
    },
    pfp: {
        position: "absolute",
        overflow: "hidden",
        borderWidth: 2.5, // thin white ring to separate overlaps
        borderColor: "#85baffff",
        backgroundColor: "#fff",
    },
    counter: {
        position: "absolute",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(15,23,42,0.92)",
        borderWidth: 2.5,
        borderColor: "#85baffff",
    },
    counterText: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: 13,
        color: "#fff",
        includeFontPadding: false,
    },
});

export default function Workout({ navigation, route }) {
    const uid = route?.params?.uid || global?.userData?.uid;
    const scaleAnim = useRef(new Animated.Value(0.92)).current;

    // Provide refs for FeedHeader search suggestions (optional)
    const allUsersRef = useRef([]);

    // Header actions
    const toMessagesScreen = useCallback(() => {
        navigation?.navigate("Messages");
    }, [navigation]);

    const onOpenNotifications = useCallback(() => {
        navigation?.navigate("Notifications");
    }, [navigation]);

    const scrollToTop = useCallback(() => { }, []);

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
            const source =
                Array.isArray(data.templates) && data.templates.length
                    ? data.templates
                    : Array.isArray(global?.userData?.templates)
                        ? global.userData.templates
                        : [];

            const normalized = normalizeTemplates(source);
            setTemplates([
                { id: "none", name: "No template selected", exercises: [], lastDate: null, isNone: true },
                ...normalized,
            ]);

            setActiveIdx((idx) => Math.max(0, Math.min(idx, normalized.length)));
        });

        return () => unsub();
    }, [uid]);

    // Live/recent now list (use your live source here)
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

    // ===== START — empty workout =====
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

    // ===== START — from template =====
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

    // ===== Bottom sheet callbacks =====
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

    /* ---------------- render ---------------- */
    return (
        <SafeAreaView style={styles.root}>
            {/* Feed Header */}
            <FeedHeader
                toMessagesScreen={toMessagesScreen}
                onOpenNotifications={onOpenNotifications}
                backButton={false}
                onBackPress={() => navigation?.goBack?.()}
                scrollToTop={scrollToTop}
                navigation={navigation}
                allUsersRef={allUsersRef}
            />

            {/* Overview cards + Calendar */}
            <View style={styles.content}>
                <WeekCalendar
                    macrosMap={global?.userData?.macrosCompleteMap || {}}
                    workoutsMap={global?.userData?.workoutsByDate || {}}
                />

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
                    {/* Make a Post button */}
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

                    {/* Friends live/recent PFP stack inside white circular button */}
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

    // Live + Nudges wrapper
    liveWrap: { paddingTop: 6, paddingBottom: 6, paddingHorizontal: 16 },

    content: { flex: 1 },

    /* Cards row under calendar */
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
        bottom: FOOTER_HEIGHT + ss(28),
        alignItems: "center",
    },
    actionsRow: {
        width: ROW_WIDTH,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
    },

    // Small circular buttons (now with clearer press feedback)
    smallBtn: {
        width: SMALL_SIZE,
        height: SMALL_SIZE,
        borderRadius: SMALL_SIZE / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOpacity: 0.08,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
            },
            android: { elevation: 3 },
        }),
    },
    smallBtnPressed: {
        transform: [{ scale: 0.96 }],
        backgroundColor: "#F1F5F9", // subtle tint on press (iOS)
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
