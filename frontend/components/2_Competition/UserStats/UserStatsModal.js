import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, Text, ScrollView, Pressable, Dimensions, UIManager, Platform, LayoutAnimation, InteractionManager, ActivityIndicator, Animated, FlatList, SectionList } from "react-native";
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import NewWorkoutModal from "../../3_Workout/NewWorkout/NewWorkoutModal";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../../../../firebase.config";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import FastImage from "react-native-fast-image";
import HexagonalStats from "./HexagonalStats";
import { exercises as EXERCISE_DEFS } from "../../3_Workout/NewWorkout/SelectExercise/EXERCISES";
import scaleSize from "../../../helper/scaleSize";
import { TouchableOpacity } from "react-native";
import { withStrongPress } from "../../../utils/haptics";
import { sanitizeStatsForViewer, canViewWorkout } from "../../../utils/workoutPrivacy";

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    try { UIManager.setLayoutAnimationEnabledExperimental(true); } catch { }
}

const { height: screenHeight, width: screenWidth } = Dimensions.get("window");
const scaledSize = (n) => scaleSize(n);

// Theme (dark mode for Competition context) — hook to global theme
const THEME = require("../../../theme/mfpDark").default;
const COLORS = {
    bg: THEME.bg,              // modal background (match FriendsActivitySheet)
    card: THEME.surface,       // elevated cards on dark surface
    text: THEME.textPrimary,   // primary text
    subtext: THEME.textSecondary,
    accent: THEME.primary,
    hairline: THEME.hairline,
    iconBg: THEME.field,       // icon wells
    statBg: THEME.field,       // stat tiles
    statBorder: THEME.hairline,
};

// Neutral header background for sets view (less blue, more app-wide vibe)
// Use existing theme surfaces for cohesion

// ---------- helpers ----------
const safeNumber = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const fmtK = (n) => {
    const v = safeNumber(n, 0);
    if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
    return `${Math.round(v)}`;
};

// Estimate 1RM via Epley if missing; picks best set by weight*reps
const estimate1RM = (exercise) => {
    const explicit = safeNumber(exercise?.["1RM"], NaN);
    if (Number.isFinite(explicit)) return Math.round(explicit);
    const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
    if (!sets.length) return 0;
    let best = 0;
    for (const s of sets) {
        const w = safeNumber(s?.weight, 0);
        const r = safeNumber(s?.reps, 0);
        const est = w * (1 + r / 30);
        if (est > best) best = est;
    }
    return Math.round(best || 0);
};

const computeVolume = (exercise) => {
    const explicit = safeNumber(exercise?.Volume, NaN);
    if (Number.isFinite(explicit)) return explicit;
    const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
    return sets.reduce((sum, s) => sum + safeNumber(s?.weight, 0) * safeNumber(s?.reps, 0), 0);
};

const bestTopSet = (exercise) => {
    const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
    if (!sets.length) return null;
    let best = null;
    let bestScore = -Infinity;
    for (const s of sets) {
        const w = safeNumber(s?.weight, 0);
        const r = safeNumber(s?.reps, 0);
        const score = w * r;
        if (score > bestScore) {
            bestScore = score;
            best = { weight: Math.round(w), reps: Math.round(r) };
        }
    }
    return best;
};

// Order sections by common body-part groupings
const GROUP_ORDER = {
    Chest: 0,
    Back: 1,
    Shoulders: 2,
    Arms: 3,
    Legs: 4,
    Abs: 5,
    "Full Body": 6,
    Other: 7,
};

// Map exercise name -> muscle group once
const NAME_TO_GROUP = (() => {
    const map = new Map();
    try {
        (Array.isArray(EXERCISE_DEFS) ? EXERCISE_DEFS : []).forEach((e) => {
            if (e?.name) map.set(String(e.name), String(e.muscleGroup || "Other") || "Other");
        });
    } catch { }
    return map;
})();

const getExercisesGrouped = (user) => {
    const map = user?.statsExercises || {};
    // Flatten, filter meaningful entries
    const entries = Object.entries(map)
        .filter(([, ex]) => (Array.isArray(ex?.sets) ? ex.sets.length > 0 : (ex?.["1RM"] || ex?.Volume)))
        .map(([name, ex]) => ({ name, exercise: ex }));

    // Group by muscle group using our lookup, fallback to 'Other'
    const grouped = new Map();
    for (const item of entries) {
        const group = NAME_TO_GROUP.get(item.name) || "Other";
        if (!grouped.has(group)) grouped.set(group, []);
        grouped.get(group).push(item);
    }

    // Sort items within each group by total sets desc, then 1RM desc, then name A→Z
    const sortItems = (a, b) => {
        const aSets = Array.isArray(a.exercise?.sets) ? a.exercise.sets.length : 0;
        const bSets = Array.isArray(b.exercise?.sets) ? b.exercise.sets.length : 0;
        if (bSets !== aSets) return bSets - aSets;
        const rmDiff = estimate1RM(b.exercise) - estimate1RM(a.exercise);
        if (rmDiff !== 0) return rmDiff;
        return String(a.name).localeCompare(String(b.name));
    };
    for (const [, list] of grouped) list.sort(sortItems);

    // Order groups by GROUP_ORDER then name
    const orderedGroups = Array.from(grouped.entries())
        .sort((a, b) => {
            const ga = GROUP_ORDER[a[0]] ?? 999;
            const gb = GROUP_ORDER[b[0]] ?? 999;
            if (ga !== gb) return ga - gb;
            return String(a[0]).localeCompare(String(b[0]));
        })
        .map(([group, items]) => ({ group, items }));

    return orderedGroups;
};

// join date: supports Firestore TS ({seconds}), ms, ISO string, or Date
const toDate = (d) => {
    if (!d) return null;
    if (d instanceof Date) return d;
    if (typeof d === "object" && Number.isFinite(d.seconds)) return new Date(d.seconds * 1000);
    if (typeof d === "number") return new Date(d);
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? null : parsed;
};
const formatJoinDate = (raw) => {
    const date = toDate(raw ?? null);
    if (!date) return "Joined";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `Joined ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

// Format any date-ish input into M/D/YY (no leading zeros). Fallback to raw string.
const dateLabelFromRaw = (raw) => {
    if (!raw) return '';
    const fmt = (y, m, d) => `${m}/${d}/${String(y).slice(-2)}`;
    if (typeof raw === 'string') {
        const m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (m) {
            const y = Number(m[1]);
            const mo = Number(m[2]);
            const da = Number(m[3]);
            if (y && mo && da) return fmt(y, mo, da);
        }
        const d2 = new Date(raw);
        if (!isNaN(d2)) return fmt(d2.getFullYear(), d2.getMonth() + 1, d2.getDate());
        return String(raw);
    }
    if (typeof raw === 'number') {
        const d2 = new Date(raw);
        if (!isNaN(d2)) return fmt(d2.getFullYear(), d2.getMonth() + 1, d2.getDate());
        return '';
    }
    if (typeof raw === 'object' && Number.isFinite(raw.seconds)) {
        const d2 = new Date(raw.seconds * 1000);
        if (!isNaN(d2)) return fmt(d2.getFullYear(), d2.getMonth() + 1, d2.getDate());
        return '';
    }
    return '';
};

// Accent utilities (light touch of personality per exercise)
const ACCENTS = ["#2D9EFF", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#06B6D4"];
const pickAccent = (name = "") => {
    const str = String(name);
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return ACCENTS[h % ACCENTS.length];
};
const hexToRgb = (hex) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return { r: 45, g: 158, b: 255 };
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
};
const rgba = (hex, a) => {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
};

// Accent by muscle group (aligned with SelectExercise/ExerciseCard)
const MUSCLE_ACCENT = {
    Chest: "#EF4444",
    Back: "#06B6D4",
    Shoulders: "#F59E0B",
    Arms: "#8B5CF6",
    Legs: "#10B981",
    Abs: "#2D9EFF",
};
const groupAccent = (group) => MUSCLE_ACCENT[group] || COLORS.accent;

// Friend-view handle accents (match DayDetailsSheet)
const HANDLE_FRIEND_ACCENT = "#E0A500";
const HANDLE_FRIEND_BACKGROUND = "#e0a4002c";

// Gold accent (match DayDetails workout PR pill)
const GOLD = '#FACC15';
const GOLD_BG = 'rgba(250, 204, 21, 0.24)';
const GOLD_BORDER = 'rgba(250, 204, 21, 0.60)';

export default function UserStatsModal({ user, toViewProfile, hexOverlay, hexProps = {}, deferExercises = false }) {
    // Optionally defer heavy grouping work until after interactions (for smoother open)
    const [showExercises, setShowExercises] = useState(!deferExercises);
    const viewerData = (() => {
        try { return global?.userData || null; } catch { return null; }
    })();
    const viewerUid = viewerData?.uid ? String(viewerData.uid) : "";
    useEffect(() => {
        if (!deferExercises) return;
        let task;
        try { task = InteractionManager.runAfterInteractions(() => setShowExercises(true)); }
        catch { setTimeout(() => setShowExercises(true), 120); }
        return () => { try { task?.cancel?.(); } catch { } };
    }, [deferExercises]);

    const statsForViewer = useMemo(() => sanitizeStatsForViewer(user?.statsExercises || {}, user?.uid, viewerUid, viewerData), [user?.statsExercises, user?.uid, viewerUid, viewerData]);
    const userForViewer = useMemo(() => ({ ...user, statsExercises: statsForViewer }), [user, statsForViewer]);

    const exerciseGroups = useMemo(() => (
        showExercises ? getExercisesGrouped(userForViewer) : []
    ), [showExercises, userForViewer]);
    const [collapsed, setCollapsed] = useState({}); // { [group]: true }
    const toggleGroup = (g) => {
        try { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); } catch { }
        setCollapsed((s) => ({ ...s, [g]: !s[g] }));
    };
    const overall = Math.round(user?.statsHexagon?.overall ?? 0);
    const prevOverallRaw = hexProps?.prevStatsHexagon?.overall;
    const prevOverall = Number.isFinite(Number(prevOverallRaw)) ? Math.round(Number(prevOverallRaw)) : null;
    const ovrChanged = prevOverall !== null && prevOverall !== overall;
    const joinedLabel = formatJoinDate(
        user?.joined
    );

    // ---------- Exercise detail (sets) overlay state ----------
    const [detailName, setDetailName] = useState(null); // exercise name
    // Slide-in from right for detail screen
    const detailTranslateX = useRef(new Animated.Value(screenWidth)).current;
    const openDetail = (name) => {
        if (!name) return;
        // reset slide position before mounting
        try { detailTranslateX.setValue(screenWidth); } catch {}
        setDetailName(name);
        try {
            Animated.timing(detailTranslateX, { toValue: 0, duration: 260, useNativeDriver: true }).start();
        } catch { }
    };
    const closeDetail = () => {
        try {
            Animated.timing(detailTranslateX, { toValue: screenWidth, duration: 220, useNativeDriver: true }).start(({ finished }) => {
                setDetailName(null);
            });
        } catch { setDetailName(null); }
    };

    const detailSets = useMemo(() => {
        if (!detailName) return [];
        const sets = (statsForViewer?.[detailName]?.sets || []);
        if (!Array.isArray(sets) || sets.length === 0) return [];
        // Sort reverse-chronological by date (YYYY-MM-DD) then by original order (descending)
        const withIdx = sets.map((s, i) => ({ ...s, __i: i }));
        const toKey = (d) => {
            if (!d) return 0;
            if (typeof d === 'string') {
                // Expect YYYY-MM-DD; fallback to Date parse
                const t = Date.parse(d);
                return Number.isFinite(t) ? t : 0;
            }
            if (typeof d === 'number') return d;
            if (typeof d === 'object' && Number.isFinite(d.seconds)) return d.seconds * 1000;
            return 0;
        };
        withIdx.sort((a, b) => {
            const ta = toKey(a?.date);
            const tb = toKey(b?.date);
            if (tb !== ta) return tb - ta;
            return (b.__i || 0) - (a.__i || 0);
        });
        return withIdx.map(({ __i, ...rest }) => rest);
    }, [detailName, statsForViewer, user?.uid]);

    // Group sets by date label (like NotificationsModal)
    const detailSections = useMemo(() => {
        if (!Array.isArray(detailSets) || detailSets.length === 0) return [];
        const map = new Map(); // preserves insertion order based on sorted detailSets
        for (const s of detailSets) {
            const label = dateLabelFromRaw(s?.date) || 'Undated';
            if (!map.has(label)) map.set(label, []);
            map.get(label).push(s);
        }
        return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
    }, [detailSets]);

    const setAdjusted1RM = (w, r) => {
        const W = safeNumber(w, 0); const R = safeNumber(r, 0);
        if (W <= 0 || R <= 0) return 0;
        return Math.round(W * (1 + R / 30));
    };

    const ACC_DETAIL = useMemo(() => {
        if (!detailName) return COLORS.accent;
        const group = NAME_TO_GROUP.get(detailName) || "Other";
        return groupAccent(group);
    }, [detailName]);

    // ---- Workout viewer state (open per set press) ----
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerWorkout, setViewerWorkout] = useState(null);
    // Slide-in from right for workout viewer
    const viewerTranslateX = useRef(new Animated.Value(screenWidth)).current;
    // Match DayDetails: yellow handle fades as overlay slides
    const viewerHandleOpacity = useMemo(() => (
        viewerTranslateX.interpolate({
            inputRange: [0, screenWidth],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        })
    ), [viewerTranslateX, screenWidth]);
    const timerRef = useRef("");

    const ensurePrivacy = (wk) => {
        if (!wk || typeof wk !== 'object') return null;
        if (wk.privacyMode) return wk;
        return { ...wk, privacyMode: wk?.privacyMode ?? 'hidden' };
    };

    const findWorkoutByWid = async (widRaw) => {
        const wid = String(widRaw || "");
        if (!wid) return null;
        // 1) Prefer visible user's completedWorkouts if available
        try {
            const fromProp = Array.isArray(user?.completedWorkouts) ? user.completedWorkouts.find(w => String(w?.wid || w?.id || "") === wid) : null;
            if (fromProp) return ensurePrivacy(fromProp);
        } catch {}
        // 2) If viewing self, use local completedWorkouts
        try {
            const me = global?.userData;
            if (me && String(me?.uid || "") === String(user?.uid || "")) {
                const arr = Array.isArray(me?.completedWorkouts) ? me.completedWorkouts : [];
                const found = arr.find(w => String(w?.wid || w?.id || "") === wid);
                if (found) return ensurePrivacy(found);
            }
        } catch {}
        // 3) Fallback: fetch from Firestore
        try {
            const snap = await getDoc(doc(db, "workouts", wid));
            if (snap.exists()) {
                const d = snap.data() || {};
                return ensurePrivacy({ wid, ...d });
            }
        } catch {}
        return { wid, privacyMode: 'hidden' };
    };

    const handleOpenSet = async (set) => {
        if (!set) return;
        const wid = String(set?.wid || "");
        if (!wid) return;
        // Keep detail screen mounted; slide in viewer as a child from right
        setViewerOpen(true);
        try {
            const wk = await findWorkoutByWid(wid);
            if (wk) {
                setViewerWorkout(wk);
                try { viewerTranslateX.setValue(screenWidth); } catch {}
                Animated.timing(viewerTranslateX, { toValue: 0, duration: 260, useNativeDriver: true }).start();
            } else {
                setViewerOpen(false);
            }
        } catch {
            setViewerOpen(false);
        }
    };
    const closeViewer = () => {
        try {
            Animated.timing(viewerTranslateX, { toValue: screenWidth, duration: 220, useNativeDriver: true }).start(({ finished }) => {
                setViewerWorkout(null);
                setViewerOpen(false);
            });
        } catch { setViewerWorkout(null); setViewerOpen(false); }
    };

    // Back-swipe gesture (edge) for detail and viewer overlays
    const EDGE_BACK_GESTURE_WIDTH = 200;
    const BACK_SWIPE_TRIGGER = 36;

    // Detail back gesture
    const detailBackEligible = useSharedValue(0);
    const onDetailBackUpdateX = React.useCallback((dx) => {
        try { detailTranslateX.setValue(Math.max(0, dx || 0)); } catch {}
    }, [detailTranslateX]);
    const onDetailBackEnd = React.useCallback((dx, vx) => {
        const shouldClose = (dx || 0) > BACK_SWIPE_TRIGGER || (vx || 0) > 600;
        if (shouldClose) closeDetail();
        else {
            try { Animated.timing(detailTranslateX, { toValue: 0, duration: 180, useNativeDriver: true }).start(); } catch {}
        }
    }, [detailTranslateX]);
    const detailBackPan = useMemo(() => (
        Gesture.Pan()
            .hitSlop({ left: 0, width: EDGE_BACK_GESTURE_WIDTH })
            .minDistance(8)
            .activeOffsetX([-16, 16])
            .failOffsetY([-12, 12])
            .onBegin(() => { 'worklet'; detailBackEligible.value = 1; })
            .onUpdate((e) => { 'worklet'; if (!detailBackEligible.value) return; runOnJS(onDetailBackUpdateX)(e.translationX); })
            .onEnd((e) => { 'worklet'; detailBackEligible.value = 0; runOnJS(onDetailBackEnd)(e.translationX, e.velocityX); })
            .onFinalize(() => { 'worklet'; detailBackEligible.value = 0; })
    ), [detailBackEligible, onDetailBackEnd, onDetailBackUpdateX]);

    // Viewer back gesture
    const viewerBackEligible = useSharedValue(0);
    const onViewerBackUpdateX = React.useCallback((dx) => {
        try { viewerTranslateX.setValue(Math.max(0, dx || 0)); } catch {}
    }, [viewerTranslateX]);
    const onViewerBackEnd = React.useCallback((dx, vx) => {
        const shouldClose = (dx || 0) > BACK_SWIPE_TRIGGER || (vx || 0) > 600;
        if (shouldClose) closeViewer();
        else {
            try { Animated.timing(viewerTranslateX, { toValue: 0, duration: 180, useNativeDriver: true }).start(); } catch {}
        }
    }, [viewerTranslateX]);
    const viewerBackPan = useMemo(() => (
        Gesture.Pan()
            .hitSlop({ left: 0, width: EDGE_BACK_GESTURE_WIDTH })
            .minDistance(8)
            .activeOffsetX([-16, 16])
            .failOffsetY([-12, 12])
            .onBegin(() => { 'worklet'; viewerBackEligible.value = 1; })
            .onUpdate((e) => { 'worklet'; if (!viewerBackEligible.value) return; runOnJS(onViewerBackUpdateX)(e.translationX); })
            .onEnd((e) => { 'worklet'; viewerBackEligible.value = 0; runOnJS(onViewerBackEnd)(e.translationX, e.velocityX); })
            .onFinalize(() => { 'worklet'; viewerBackEligible.value = 0; })
    ), [viewerBackEligible, onViewerBackEnd, onViewerBackUpdateX]);

    return (
        <View style={styles.container}>
            {/* Grabber */}
            <View style={styles.grabber} />
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={withStrongPress(toViewProfile)} style={styles.headerLeft} hitSlop={10}>
                    <FastImage
                        source={{
                            uri: user.image,
                            priority: FastImage.priority.normal,
                            cache: FastImage.cacheControl.immutable,
                        }}
                        style={styles.pfp}
                    />
                    <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.handle}>
                            {user.handle}
                        </Text>
                        <Text style={styles.subHandle}>{joinedLabel}</Text>
                    </View>
                </Pressable>

                <View style={styles.ovrGlowWrap}>
                    <View pointerEvents="none" style={styles.ovrGlow} />
                    <View style={styles.scorePill}>
                        <Text style={styles.scorePillLabel}>OVR</Text>
                        {ovrChanged ? (
                            <View style={styles.ovrRow}>
                                <Text style={styles.scorePillPrev}>{prevOverall}</Text>
                                <Text style={styles.scorePillArrow}>{'  →  '}</Text>
                                <Text style={styles.scorePillNew}>{overall}</Text>
                            </View>
                        ) : (
                            <Text style={styles.scorePillValue}>{overall}</Text>
                        )}
                    </View>
                </View>
            </View>
            {/* Content */}
            <ScrollView
                style={styles.scrollview}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Hexagon (no card background) */}
                <View style={styles.hexWrap}>
                    <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
                        <HexagonalStats statsHexagon={user.statsHexagon} {...hexProps} />
                        {hexOverlay ? (typeof hexOverlay === 'function' ? hexOverlay() : hexOverlay) : null}
                    </View>
                </View>

                {/* Exercises */}
                <Text style={styles.sectionTitle}>Exercises</Text>
                <View style={styles.exerciseList}>
                    {!showExercises ? (
                        <View style={[styles.emptyCard, { paddingVertical: scaleSize(scaledSize(30)) }]}>
                            <ActivityIndicator size="small" color={COLORS.accent} />
                            <Text style={[styles.emptyText, { marginTop: scaleSize(scaledSize(6)) }]}>Loading…</Text>
                        </View>
                    ) : exerciseGroups.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyText}>No exercises tracked yet.</Text>
                        </View>
                    ) : (
                        exerciseGroups.map(({ group, items }) => {
                            const ACC = groupAccent(group);
                            const isCollapsed = !!collapsed[group];
                            return (
                                <View key={`group-${group}`}>
                                    <Pressable style={styles.groupHeaderRow} onPress={withStrongPress(() => toggleGroup(group))}>
                                        <Text style={styles.groupHeader}>{group}</Text>
                                        <MaterialCommunityIcons
                                            name={isCollapsed ? "chevron-down" : "chevron-up"}
                                            size={scaledSize(18)}
                                            color={COLORS.subtext}
                                        />
                                    </Pressable>
                                    {!isCollapsed && items.map(({ name, exercise }, idx) => {
                                        const oneRM = estimate1RM(exercise);
                                        const volume = computeVolume(exercise);
                                        const setsCount = Array.isArray(exercise?.sets) ? exercise.sets.length : 0;
                                        const top = bestTopSet(exercise);

                                        return (
                                            <Pressable
                                                key={`${name}-${idx}`}
                                                style={({ pressed }) => [
                                                    styles.exerciseCard,
                                                    { position: "relative" },
                                                    pressed && styles.exerciseCardPressed,
                                                ]}
                                                onPress={withStrongPress(() => openDetail(name))}
                                            >
                                                {/* Accent bar based on muscle group */}
                                                {/* <View style={[styles.accentBar, { backgroundColor: ACC }]} /> */}

                                                {/* Row: icon + name + 1RM pill */}
                                                <View style={styles.exerciseHeader}>
                                                    <View style={styles.nameRow}>
                                                        {/* <View style={[styles.iconCircle, { backgroundColor: rgba(ACC, 0.16), borderColor: rgba(ACC, 0.45) }]}>
                                                            <MaterialCommunityIcons name="dumbbell" size={scaledSize(13)} color={ACC} />
                                                        </View> */}
                                                        <Text numberOfLines={2} style={styles.exerciseName}>{name}</Text>
                                                    </View>
                                                    <View style={styles.headerRight}>
                                                        {!!oneRM && oneRM > 0 && (
                                                            <View style={styles.oneRMPill}>
                                                                <Text style={styles.oneRMLabel}>1RM</Text>
                                                                <Text style={styles.oneRMValue}>{oneRM}</Text>
                                                            </View>
                                                        )}
                                                        <MaterialCommunityIcons name="chevron-right" size={scaledSize(18)} color={COLORS.subtext} />
                                                    </View>
                                                </View>

                                                <View style={styles.divider} />

                                                {/* Stat row: 3 compact columns with icons */}
                                                <View style={styles.metaRow}>
                                                    <View style={[styles.metaCell, { flex: 0.95 }]}>
                                                        <View style={styles.metaCellRow}>
                                                            <View style={styles.metaIconWrapLeft}>
                                                                <MaterialCommunityIcons name="weight-lifter" size={scaledSize(12)} color={COLORS.text} />
                                                            </View>
                                                            <View style={styles.metaTextCol}>
                                                                <Text style={styles.metaLabel}>Volume</Text>
                                                                <Text style={styles.metaValue} numberOfLines={1}>{fmtK(volume)}</Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                    <View style={[styles.metaCell, { flex: 0.8 }]}>
                                                        <View style={[styles.metaCellRow]}>
                                                            <View style={styles.metaIconWrapLeft}>
                                                                <MaterialCommunityIcons name="view-grid-outline" size={scaledSize(12)} color={COLORS.text} />
                                                            </View>
                                                            <View style={styles.metaTextCol}>
                                                                <Text style={styles.metaLabel}>Sets</Text>
                                                                <Text style={styles.metaValue} numberOfLines={1}>{setsCount}</Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                    <View style={[styles.metaCell, { flex: 1 }]}>
                                                        <View style={styles.metaCellRow}>
                                                            <View style={styles.metaIconWrapLeft}>
                                                                <MaterialCommunityIcons name="trending-up" size={scaledSize(12)} color={COLORS.text} />
                                                            </View>
                                                            <View style={styles.metaTextCol}>
                                                                <Text style={styles.metaLabel}>Top Set</Text>
                                                                <Text style={styles.metaValue} numberOfLines={1}>{top ? `${top.weight} x ${top.reps}` : "-"}</Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                </View>
                                            </Pressable>
                                        );
                                    })}
                                    <View style={{ height: scaleSize(scaledSize(6)) }} />
                                </View>
                            );
                        })
                    )}
                </View>

                <View style={{ height: scaleSize(scaledSize(100)) }} />
            </ScrollView>
            {/* Exercise detail overlay */}
            {detailName ? (
                <GestureDetector gesture={detailBackPan}>
                    <Animated.View
                        pointerEvents="auto"
                        style={[styles.detailOverlay, { transform: [{ translateX: detailTranslateX }] }]}
                    >
                        {/* Header card – neutral card styling, minimal accent */}
                        <View style={styles.detailHeader}>
                            <Pressable onPress={withStrongPress(closeDetail)} hitSlop={10} style={styles.detailBackRow}>
                                <MaterialCommunityIcons name="chevron-left" size={scaledSize(18)} color={COLORS.text} />
                                <Text numberOfLines={1} style={styles.detailTitle}>{detailName}</Text>
                            </Pressable>
                            <View style={styles.detailCountPill}>
                                <MaterialCommunityIcons name="view-grid-outline" size={scaledSize(11)} color={COLORS.subtext} />
                                <Text style={styles.detailCountText}>{detailSets.length} sets</Text>
                            </View>
                        </View>

                        {detailSets.length === 0 ? (
                            <View style={styles.detailEmpty}>
                                <Text style={styles.emptyText}>No sets yet.</Text>
                            </View>
                        ) : (
                            <SectionList
                                sections={detailSections}
                                keyExtractor={(item, index) => `${detailName}-${item?.wid || 'w'}-${item?.date || 'd'}-${item?.weight || 'wt'}-${item?.reps || 'r'}-${index}`}
                                contentContainerStyle={styles.detailListContent}
                                showsVerticalScrollIndicator={false}
                                renderItem={({ item }) => {
                                    const w = safeNumber(item?.weight, 0);
                                    const r = safeNumber(item?.reps, 0);
                                    const rm = setAdjusted1RM(w, r);
                                    return (
                                        <TouchableOpacity style={styles.setRow} onPress={withStrongPress(() => handleOpenSet(item))}>
                                            <View style={[styles.setDot, { backgroundColor: ACC_DETAIL }]} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.setMain}>{w}lbs x {r}</Text>
                                            </View>
                                            <View style={styles.rmPill}>
                                                <Text style={styles.rmLabel}>1RM</Text>
                                                <Text style={styles.rmValue}>{rm}</Text>
                                            </View>
                                            <MaterialCommunityIcons name="chevron-right" size={scaledSize(18)} color={COLORS.subtext} style={{ marginLeft: scaleSize(scaledSize(6)) }} />
                                        </TouchableOpacity>
                                    );
                                }}
                                renderSectionHeader={({ section }) => (
                                    <View style={styles.detailSectionHeaderWrap}>
                                        <Text style={styles.detailSectionHeaderText}>{section.title}</Text>
                                    </View>
                                )}
                                ItemSeparatorComponent={() => <View style={{ height: scaleSize(scaledSize(2)) }} />}
                                SectionSeparatorComponent={() => <View style={{ height: scaleSize(scaledSize(4)) }} />}
                                stickySectionHeadersEnabled={false}
                                ListFooterComponent={<View style={{ height: scaleSize(scaledSize(40)) }} />}
                            />
                        )}
                    </Animated.View>
                </GestureDetector>
            ) : null}
        {/* Workout viewer overlay (fades in over this sheet) */}
        {viewerOpen ? (
            <GestureDetector gesture={viewerBackPan}>
                <Animated.View style={[styles.workoutOverlay, { transform: [{ translateX: viewerTranslateX }] }]} pointerEvents="auto">
                {/* Yellow friend-view handle bar (fades while panning) */}
                <View style={styles.viewerHandleWrap}>
                    <Animated.View style={[styles.viewerHandleIndicator, { opacity: viewerHandleOpacity }]} />
                </View>
        {viewerWorkout ? (
            <View style={{ flex: 1 }}>
                {canViewWorkout(viewerWorkout, viewerUid, viewerData) ? (
                    <NewWorkoutModal
                        timerRef={timerRef}
                        workout={viewerWorkout}
                        cancelWorkout={() => {}}
                        updateWorkout={() => {}}
                        finishWorkout={() => {}}
                        showGroupModal={() => {}}
                        userWorkoutStats={statsForViewer || undefined}
                        onPressBack={closeViewer}
                        onCheer={() => {}}
                        onCopyTemplate={() => {}}
                        onPressPfp={closeViewer}
                        forceViewingFriend={String(user?.uid || "")}
                        friendPfp={user?.image || user?.pfp || null}
                        streamLive={false}
                    />
                ) : (
                    <View style={styles.lockedWrap}>
                        <Text style={styles.lockedTitle}>Workout is private</Text>
                        <Text style={styles.lockedSubtitle}>You do not have permission to view this workout.</Text>
                    </View>
                )}
            </View>
        ) : null}
                </Animated.View>
            </GestureDetector>
        ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
        borderTopLeftRadius: scaleSize(scaledSize(24)),
        borderTopRightRadius: scaleSize(scaledSize(24)),
    },
    grabber: {
        alignSelf: "center",
        width: scaleSize(scaledSize(44)),
        height: scaleSize(scaledSize(5)),
        borderRadius: scaleSize(scaledSize(3)),
        backgroundColor: "rgba(255,255,255,0.25)",
        marginTop: scaleSize(scaledSize(10)),
        marginBottom: scaleSize(scaledSize(8)),
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(scaledSize(22)), // a little more horizontal padding
        paddingTop: scaleSize(scaledSize(8)),
        marginBottom: scaleSize(scaledSize(8)),
        justifyContent: "space-between",
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginRight: scaleSize(scaledSize(12)),
    },
    pfp: {
        width: scaleSize(scaledSize(40)),
        height: scaleSize(scaledSize(40)),
        borderRadius: scaleSize(scaledSize(20)),
        marginRight: scaleSize(scaledSize(12)),
        backgroundColor: "#e8eef7",
    },
    handle: {
        fontSize: scaleSize(17),
        fontFamily: "Outfit_600SemiBold",
        color: COLORS.text,
        letterSpacing: 0.2,
    },
    subHandle: {
        marginTop: scaleSize(scaledSize(2)),
        fontSize: scaleSize(11.5),
        fontFamily: "Outfit_400Regular",
        color: COLORS.subtext,
    },

    // OVR pill
    ovrGlowWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
    ovrGlow: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: scaleSize(scaledSize(999)),
        backgroundColor: 'transparent',
        shadowColor: '#FFFFFF',
        shadowOpacity: 0.42,
        shadowRadius: scaleSize(scaledSize(12)),
        shadowOffset: { width: 0, height: 0 },
    },
    scorePill: {
        flexDirection: "row",
        alignItems: "baseline",
        paddingHorizontal: scaleSize(scaledSize(12)),
        paddingVertical: scaleSize(scaledSize(7)),
        borderRadius: scaleSize(scaledSize(999)),
        borderWidth: scaleSize(1),
        borderColor: COLORS.hairline,
        backgroundColor: "rgba(255,255,255,0.06)",
        // Soft white glow around the pill
        shadowColor: '#FFFFFF',
        shadowOpacity: 0.28,
        shadowRadius: scaleSize(scaledSize(10)),
        shadowOffset: { width: 0, height: 0 },
    },
    ovrRow: { flexDirection: 'row', alignItems: 'baseline' },
    scorePillLabel: {
        fontSize: scaleSize(11.5),
        fontFamily: "Outfit_600SemiBold",
        color: COLORS.subtext,
        marginRight: scaleSize(scaledSize(6)),
        letterSpacing: 1,
    },
    scorePillValue: {
        fontSize: scaleSize(16),
        fontFamily: "Outfit_700Bold",
        color: COLORS.accent,
        letterSpacing: 0.2,
    },
    scorePillPrev: {
        fontSize: scaleSize(16),
        fontFamily: 'Outfit_700Bold',
        color: '#94A3B8',
        letterSpacing: 0.2,
    },
    scorePillArrow: {
        fontSize: scaleSize(16),
        fontFamily: 'Outfit_700Bold',
        color: '#94A3B8',
        letterSpacing: 0.2,
    },
    scorePillNew: {
        fontSize: scaleSize(17.5),
        fontFamily: 'Outfit_800ExtraBold',
        color: '#F2B84B',
        letterSpacing: 0.2,
    },

    scrollview: { flex: 1 },
    scrollContent: {
        paddingHorizontal: scaleSize(scaledSize(17)), // a touch more
        paddingBottom: scaleSize(scaledSize(10)),
    },

    // Hexagon wrapper (no card background)
    hexWrap: {
        paddingTop: scaleSize(scaledSize(26)),
    },

    sectionTitle: {
        marginTop: scaleSize(scaledSize(12)),
        marginBottom: scaleSize(scaledSize(8)),
        paddingHorizontal: scaleSize(scaledSize(2)),
        fontSize: scaleSize(15),
        fontFamily: "Outfit_600SemiBold",
        color: COLORS.subtext,
        letterSpacing: 0.4,
    },

    exerciseList: {
        // gap: scaledSize(20),
    },

    // Group header within Exercises
    groupHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scaleSize(scaledSize(2)),
        paddingVertical: scaleSize(scaledSize(2)),
    },
    groupHeader: {
        marginTop: scaleSize(scaledSize(6)),
        marginBottom: scaleSize(scaledSize(2)),
        fontSize: scaleSize(13.5),
        fontFamily: "Outfit_600SemiBold",
        color: COLORS.subtext,
        letterSpacing: 0.3,
    },

    // Empty state
    emptyCard: {
        backgroundColor: COLORS.card,
        borderRadius: scaleSize(scaledSize(14)),
        borderWidth: scaleSize(1),
        borderColor: COLORS.hairline,
        paddingVertical: scaleSize(scaledSize(16)),
        alignItems: "center",
    },
    emptyText: {
        fontSize: scaleSize(13.5),
        fontFamily: "Outfit_500Medium",
        color: COLORS.subtext,
    },

    // Modern exercise card
    exerciseCard: {
        backgroundColor: COLORS.card,
        borderRadius: scaleSize(scaledSize(20)),
        marginVertical: scaleSize(3),
        borderWidth: scaleSize(1),
        borderColor: COLORS.hairline,
        paddingHorizontal: scaleSize(scaledSize(14)),
        paddingVertical: scaleSize(scaledSize(12)),
        shadowColor: "#000",
        shadowOffset: { width: 0, height: scaleSize(scaledSize(6)) },
        shadowOpacity: 0.09,
        shadowRadius: scaleSize(scaledSize(14)),
        elevation: 7,
    },
    exerciseCardPressed: { backgroundColor: "rgba(255,255,255,0.02)" },
    accentBar: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        // Slightly wider for better visibility without overpowering
        width: scaleSize(scaledSize(5)),
        borderTopLeftRadius: scaleSize(scaledSize(16)),
        borderBottomLeftRadius: scaleSize(scaledSize(16)),
    },

    exerciseHeader: { flexDirection: "row", alignItems: "center", marginBottom: scaleSize(scaledSize(0)) },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        minWidth: 0,
    },
    iconCircle: {
        width: scaleSize(scaledSize(26)),
        height: scaleSize(scaledSize(26)),
        borderRadius: scaleSize(scaledSize(13)),
        alignItems: "center",
        justifyContent: "center",
        marginRight: scaleSize(scaledSize(8)),
        backgroundColor: '#ffffff22',
        borderWidth: StyleSheet.hairlineWidth,
    },
    exerciseName: {
        flex: 1,
        fontSize: scaleSize(13),
        fontFamily: "Nunito_800ExtraBold",
        color: COLORS.text,
    },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: scaleSize(scaledSize(4)) },

    divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.hairline, marginVertical: scaleSize(scaledSize(8)) },

    oneRMPill: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(scaledSize(8)),
        paddingVertical: scaleSize(scaledSize(3)),
        borderRadius: scaleSize(scaledSize(999)),
        borderWidth: scaleSize(1),
        borderColor: GOLD_BORDER,
        backgroundColor: GOLD_BG,
    },
    oneRMLabel: {
        fontSize: scaleSize(9),
        fontFamily: "Nunito_800ExtraBold",
        color: GOLD,
        marginRight: scaleSize(scaledSize(5)),
        letterSpacing: 0,
    },
    oneRMValue: {
        fontSize: scaleSize(12.5),
        fontFamily: "Nunito_800ExtraBold",
        color: GOLD,
    },

    metaRow: { flexDirection: "row", alignItems: "stretch", gap: scaleSize(scaledSize(8)), marginTop: scaleSize(scaledSize(1)), paddingHorizontal: scaleSize(8) },
    metaCell: { paddingVertical: scaleSize(scaledSize(5)) },
    metaCellRow: { flexDirection: 'row', alignItems: 'center' },
    metaIconWrapLeft: {
        width: scaleSize(scaledSize(30)),
        height: scaleSize(scaledSize(30)),
        borderRadius: scaleSize(scaledSize(15)),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scaleSize(scaledSize(8)),
        backgroundColor: '#ffffff23',
    },
    metaTextCol: { flex: 1, minWidth: 0 },
    metaLabel: {
        fontSize: scaleSize(12),
        fontFamily: "Outfit_600SemiBold",
        color: COLORS.subtext,
        letterSpacing: 0.3,
    },
    metaValue: { fontSize: scaleSize(13), lineHeight: scaleSize(scaledSize(18)), fontFamily: "Outfit_800ExtraBold", color: COLORS.text, marginTop: scaleSize(scaledSize(1)) },

    // Detail overlay
    detailOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: COLORS.bg,
        borderTopLeftRadius: scaleSize(scaledSize(24)),
        borderTopRightRadius: scaleSize(scaledSize(24)),
        overflow: 'hidden',
        paddingTop: scaleSize(scaledSize(26)),
        paddingHorizontal: scaleSize(scaledSize(17)),
        paddingBottom: scaleSize(scaledSize(16)),
        zIndex: 1,
    },
    workoutOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: COLORS.bg,
        borderTopLeftRadius: scaleSize(scaledSize(24)),
        borderTopRightRadius: scaleSize(scaledSize(24)),
        overflow: 'hidden',
        paddingTop: 0,
        zIndex: 2,
    },
    // Friend-view handle bar (yellow)
    viewerHandleWrap: {
        paddingTop: scaleSize(scaledSize(8)),
        paddingBottom: scaleSize(scaledSize(6)),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: HANDLE_FRIEND_BACKGROUND,
        borderTopLeftRadius: scaleSize(scaledSize(24)),
        borderTopRightRadius: scaleSize(scaledSize(24)),
    },
    viewerHandleIndicator: {
        width: scaleSize(scaledSize(40)),
        height: scaleSize(scaledSize(4)),
        borderRadius: scaleSize(scaledSize(999)),
        backgroundColor: HANDLE_FRIEND_ACCENT,
    },
    detailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: scaleSize(1),
        borderRadius: scaleSize(scaledSize(16)),
        paddingHorizontal: scaleSize(scaledSize(14)),
        paddingVertical: scaleSize(scaledSize(10)),
        marginBottom: scaleSize(scaledSize(6)),
        // Neutral card styling to reduce blue
        backgroundColor: COLORS.card,
        borderColor: COLORS.hairline,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: scaleSize(scaledSize(10)),
        shadowOffset: { width: 0, height: scaleSize(scaledSize(6)) },
    },
    detailBackRow: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0, gap: scaleSize(scaledSize(6)) },
    
    detailTitle: {
        flex: 1,
        fontSize: scaleSize(15),
        fontFamily: 'Outfit_700Bold',
        letterSpacing: 0.2,
        color: COLORS.text,
        marginLeft: scaleSize(scaledSize(4)),
    },
    detailCountPill: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: scaleSize(1),
        borderRadius: scaleSize(scaledSize(999)),
        paddingHorizontal: scaleSize(scaledSize(12)),
        paddingVertical: scaleSize(scaledSize(6)),
        gap: scaleSize(scaledSize(6)),
        backgroundColor: COLORS.iconBg,
        borderColor: COLORS.hairline,
    },
    detailCountText: { fontSize: scaleSize(12.5), fontFamily: 'Outfit_700Bold', color: COLORS.subtext },
    detailEmpty: {
        backgroundColor: COLORS.card,
        borderRadius: scaleSize(scaledSize(16)),
        borderWidth: scaleSize(1),
        borderColor: COLORS.hairline,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: scaleSize(scaledSize(20)),
    },
    detailListContent: { paddingBottom: scaleSize(scaledSize(56)), gap: scaleSize(scaledSize(0)) },
    detailSectionHeaderWrap: { paddingTop: scaleSize(scaledSize(8)), paddingBottom: scaleSize(scaledSize(2)) },
    detailSectionHeaderText: { fontFamily: 'Outfit_800ExtraBold', fontSize: scaleSize(13.5), color: COLORS.subtext, letterSpacing: 0.3 },
    setRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: scaleSize(scaledSize(14)),
        borderWidth: scaleSize(1),
        borderColor: COLORS.hairline,
        paddingLeft: scaleSize(18),
        paddingRight: scaleSize(scaledSize(12)),
        paddingVertical: scaleSize(scaledSize(10)),
    },
    setDot: { width: scaleSize(scaledSize(8)), height: scaleSize(scaledSize(8)), borderRadius: scaleSize(scaledSize(4)), marginRight: scaleSize(scaledSize(8)) },
    setMain: { fontSize: scaleSize(14), fontFamily: 'Outfit_700Bold', color: COLORS.text },
    setSub: { fontSize: scaleSize(11.5), fontFamily: 'Outfit_500Medium', color: COLORS.subtext, marginTop: scaleSize(scaledSize(2)) },
    rmPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scaleSize(scaledSize(7)),
        paddingVertical: scaleSize(scaledSize(3)),
        borderRadius: scaleSize(scaledSize(999)),
        borderWidth: scaleSize(1),
        borderColor: GOLD_BORDER,
        backgroundColor: GOLD_BG,
    },
    rmLabel: { fontSize: scaleSize(9), fontFamily: 'Outfit_600SemiBold', color: GOLD, marginRight: scaleSize(scaledSize(5)), letterSpacing: 0.6 },
    rmValue: { fontSize: scaleSize(12.5), fontFamily: 'Outfit_800ExtraBold', color: GOLD },
    lockedWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scaleSize(scaledSize(28)),
    },
    lockedTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(scaledSize(16)),
        color: COLORS.text,
        marginBottom: scaleSize(scaledSize(6)),
        textAlign: 'center',
    },
    lockedSubtitle: {
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(scaledSize(13)),
        color: COLORS.subtext,
        textAlign: 'center',
    },
});
