import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View, Text, ScrollView, Pressable, Dimensions, UIManager, Platform, LayoutAnimation, InteractionManager, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import FastImage from "react-native-fast-image";
import HexagonalStats from "./HexagonalStats";
import { exercises as EXERCISE_DEFS } from "../../3_Workout/NewWorkout/SelectExercise/EXERCISES";

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    try { UIManager.setLayoutAnimationEnabledExperimental(true); } catch {}
}

const { height: screenHeight } = Dimensions.get("window");
const scale = screenHeight / 844; // iPhone 13 baseline
const scaledSize = (n) => Math.round(n * scale);

// Theme
const COLORS = {
    bg: "#F8FAFF",
    card: "#FFFFFF",
    text: "#0F172A",
    subtext: "#64748B",
    accent: "#2D9EFF",
    hairline: "#E6EEF6",
    iconBg: "#EEF2F7",
    statBg: "#F7FAFF",
    statBorder: "rgba(100,116,139,0.10)",
};

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
    } catch {}
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

export default function UserStatsModal({ user, toViewProfile, hexOverlay, deferExercises = false }) {
    // Optionally defer heavy grouping work until after interactions (for smoother open)
    const [showExercises, setShowExercises] = useState(!deferExercises);
    useEffect(() => {
        if (!deferExercises) return;
        let task;
        try { task = InteractionManager.runAfterInteractions(() => setShowExercises(true)); }
        catch { setTimeout(() => setShowExercises(true), 120); }
        return () => { try { task?.cancel?.(); } catch {} };
    }, [deferExercises]);

    const exerciseGroups = useMemo(() => (
        showExercises ? getExercisesGrouped(user) : []
    ), [showExercises, user?.statsExercises, user?.uid]);
    const [collapsed, setCollapsed] = useState({}); // { [group]: true }
    const toggleGroup = (g) => {
        try { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); } catch {}
        setCollapsed((s) => ({ ...s, [g]: !s[g] }));
    };
    const overall = Math.round(user?.statsHexagon?.overall ?? 0);
    const joinedLabel = formatJoinDate(
        user?.joined
    );

    return (
        <View style={styles.container}>
            {/* Grabber */}
            <View style={styles.grabber} />

            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={toViewProfile} style={styles.headerLeft} hitSlop={10}>
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

                <View style={styles.scorePill}>
                    <Text style={styles.scorePillLabel}>OVR</Text>
                    <Text style={styles.scorePillValue}>{overall}</Text>
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
                        <HexagonalStats statsHexagon={user.statsHexagon} />
                        {hexOverlay ? (typeof hexOverlay === 'function' ? hexOverlay() : hexOverlay) : null}
                    </View>
                </View>

                {/* Exercises */}
                <Text style={styles.sectionTitle}>Exercises</Text>
                <View style={styles.exerciseList}>
                    {!showExercises ? (
                        <View style={[styles.emptyCard, { paddingVertical: scaledSize(30) }]}>
                            <ActivityIndicator size="small" color={COLORS.accent} />
                            <Text style={[styles.emptyText, { marginTop: scaledSize(6) }]}>Loading…</Text>
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
                                    <Pressable style={styles.groupHeaderRow} onPress={() => toggleGroup(group)}>
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
                                            >
                                                {/* Accent bar based on muscle group */}
                                                <View style={[styles.accentBar, { backgroundColor: ACC }]} />

                                                {/* Row: icon + name + 1RM pill */}
                                                <View style={styles.exerciseHeader}>
                                                    <View style={styles.nameRow}>
                                                        <View style={[styles.iconCircle, { backgroundColor: rgba(ACC, 0.12) }]}>
                                                            <MaterialCommunityIcons name="dumbbell" size={scaledSize(13)} color={ACC} />
                                                        </View>
                                                        <Text numberOfLines={1} style={styles.exerciseName}>{name}</Text>
                                                    </View>
                                                    {!!oneRM && oneRM > 0 && (
                                                        <View style={[styles.oneRMPill, { borderColor: rgba(ACC, 0.35), backgroundColor: rgba(ACC, 0.12) }]}> 
                                                            <Text style={styles.oneRMLabel}>1RM (Adj)</Text>
                                                            <Text style={[styles.oneRMValue, { color: ACC }]}>{oneRM}</Text>
                                                        </View>
                                                    )}
                                                </View>

                                                {/* Stat row: 3 compact columns with icons */}
                                                <View style={styles.metaRow}>
                                                    <View style={styles.metaCell}>
                                                        <View style={[styles.metaIconWrap, { backgroundColor: COLORS.iconBg }]}>
                                                            <MaterialCommunityIcons name="weight-lifter" size={scaledSize(12)} color={COLORS.text} />
                                                        </View>
                                                        <Text style={styles.metaLabel}>Volume</Text>
                                                        <Text style={styles.metaValue}>{fmtK(volume)}</Text>
                                                    </View>
                                                    <View style={styles.metaCell}>
                                                        <View style={[styles.metaIconWrap, { backgroundColor: COLORS.iconBg }]}>
                                                            <MaterialCommunityIcons name="view-grid-outline" size={scaledSize(12)} color={COLORS.text} />
                                                        </View>
                                                        <Text style={styles.metaLabel}>Sets</Text>
                                                        <Text style={styles.metaValue}>{setsCount}</Text>
                                                    </View>
                                                    <View style={styles.metaCell}>
                                                        <View style={[styles.metaIconWrap, { backgroundColor: COLORS.iconBg }]}>
                                                            <MaterialCommunityIcons name="trending-up" size={scaledSize(12)} color={COLORS.text} />
                                                        </View>
                                                        <Text style={styles.metaLabel}>Top Set</Text>
                                                        <Text style={styles.metaValue}>{top ? `${top.weight}×${top.reps}` : "-"}</Text>
                                                    </View>
                                                </View>
                                            </Pressable>
                                        );
                                    })}
                                    <View style={{ height: scaledSize(6) }} />
                                </View>
                            );
                        })
                    )}
                </View>

                <View style={{ height: scaledSize(100) }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
        borderTopLeftRadius: scaledSize(24),
        borderTopRightRadius: scaledSize(24),
    },
    grabber: {
        alignSelf: "center",
        width: scaledSize(44),
        height: scaledSize(5),
        borderRadius: scaledSize(3),
        backgroundColor: COLORS.hairline,
        marginTop: scaledSize(10),
        marginBottom: scaledSize(8),
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaledSize(22), // a little more horizontal padding
        paddingTop: scaledSize(8),
        marginBottom: scaledSize(8),
        justifyContent: "space-between",
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginRight: scaledSize(12),
    },
    pfp: {
        width: scaledSize(46),
        height: scaledSize(46),
        borderRadius: scaledSize(23),
        marginRight: scaledSize(12),
        backgroundColor: "#e8eef7",
    },
    handle: {
        fontSize: scaledSize(18.5),
        fontFamily: "Outfit_600SemiBold",
        color: COLORS.text,
        letterSpacing: 0.2,
    },
    subHandle: {
        marginTop: scaledSize(2),
        fontSize: scaledSize(12),
        fontFamily: "Outfit_400Regular",
        color: COLORS.subtext,
    },

    // OVR pill
    scorePill: {
        flexDirection: "row",
        alignItems: "baseline",
        paddingHorizontal: scaledSize(12),
        paddingVertical: scaledSize(7),
        borderRadius: scaledSize(999),
        borderWidth: 1,
        borderColor: COLORS.hairline,
        backgroundColor: "#FFFFFF",
    },
    scorePillLabel: {
        fontSize: scaledSize(11),
        fontFamily: "Outfit_600SemiBold",
        color: COLORS.subtext,
        marginRight: scaledSize(6),
        letterSpacing: 1,
    },
    scorePillValue: {
        fontSize: scaledSize(15.5),
        fontFamily: "Outfit_700Bold",
        color: COLORS.accent,
        letterSpacing: 0.2,
    },

    scrollview: { flex: 1 },
    scrollContent: {
        paddingHorizontal: scaledSize(17), // a touch more
        paddingBottom: scaledSize(10),
    },

    // Hexagon wrapper (no card background)
    hexWrap: {
        paddingTop: scaledSize(26),
    },

    sectionTitle: {
        marginTop: scaledSize(12),
        marginBottom: scaledSize(8),
        paddingHorizontal: scaledSize(2),
        fontSize: scaledSize(14.5),
        fontFamily: "Outfit_600SemiBold",
        color: COLORS.subtext,
        letterSpacing: 0.4,
    },

    exerciseList: {
        gap: scaledSize(10),
    },

    // Group header within Exercises
    groupHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scaledSize(2),
        paddingVertical: scaledSize(2),
    },
    groupHeader: {
        marginTop: scaledSize(6),
        marginBottom: scaledSize(2),
        fontSize: scaledSize(13),
        fontFamily: "Outfit_600SemiBold",
        color: COLORS.subtext,
        letterSpacing: 0.3,
    },

    // Empty state
    emptyCard: {
        backgroundColor: COLORS.card,
        borderRadius: scaledSize(14),
        borderWidth: 1,
        borderColor: COLORS.hairline,
        paddingVertical: scaledSize(16),
        alignItems: "center",
    },
    emptyText: {
        fontSize: scaledSize(13),
        fontFamily: "Outfit_500Medium",
        color: COLORS.subtext,
    },

    // Modern exercise card
    exerciseCard: {
        backgroundColor: COLORS.card,
        borderRadius: scaledSize(16),
        borderWidth: 1,
        borderColor: COLORS.hairline,
        paddingHorizontal: scaledSize(12),
        paddingVertical: scaledSize(8),
        shadowColor: "#000",
        shadowOffset: { width: 0, height: scaledSize(4) },
        shadowOpacity: 0.05,
        shadowRadius: scaledSize(10),
        elevation: 4,
    },
    exerciseCardPressed: {
        backgroundColor: "#FCFDFF",
    },
    accentBar: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: scaledSize(3),
        borderTopLeftRadius: scaledSize(16),
        borderBottomLeftRadius: scaledSize(16),
    },

    exerciseHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: scaledSize(6),
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        minWidth: 0,
    },
    iconCircle: {
        width: scaledSize(22),
        height: scaledSize(22),
        borderRadius: scaledSize(11),
        alignItems: "center",
        justifyContent: "center",
        marginRight: scaledSize(8),
    },
    exerciseName: {
        flex: 1,
        fontSize: scaledSize(12.5), // slightly smaller to reduce heft
        fontFamily: "Outfit_600SemiBold",
        color: COLORS.text,
    },

    oneRMPill: {
        flexDirection: "row",
        alignItems: "baseline",
        paddingHorizontal: scaledSize(8),
        paddingVertical: scaledSize(4.5),
        borderRadius: scaledSize(999),
        borderWidth: 1,
        borderColor: COLORS.hairline,
        backgroundColor: "#FFFFFF",
    },
    oneRMLabel: {
        fontSize: scaledSize(10),
        fontFamily: "Outfit_600SemiBold",
        color: COLORS.subtext,
        marginRight: scaledSize(5),
        letterSpacing: 0.6,
    },
    oneRMValue: {
        fontSize: scaledSize(12),
        fontFamily: "Outfit_700Bold",
        color: COLORS.accent,
    },

    metaRow: {
        flexDirection: "row",
        alignItems: "stretch",
        gap: scaledSize(6),
    },
    metaCell: {
        flex: 1,
        alignItems: "center",
        paddingVertical: scaledSize(6),
        borderRadius: scaledSize(12),
        backgroundColor: COLORS.statBg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.statBorder,
    },
    metaIconWrap: {
        width: scaledSize(20),
        height: scaledSize(20),
        borderRadius: scaledSize(10),
        alignItems: "center",
        justifyContent: "center",
        marginBottom: scaledSize(4),
        backgroundColor: COLORS.iconBg,
    },
    metaLabel: {
        fontSize: scaledSize(10.5),
        fontFamily: "Outfit_500Medium",
        color: COLORS.subtext,
        marginBottom: scaledSize(1),
        letterSpacing: 0.3,
    },
    metaValue: {
        fontSize: scaledSize(11.5),
        fontFamily: "Outfit_700Bold",
        color: COLORS.text,
    },
});
