import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

import theme from "../theme/mfpDark";
import { scaleSize, ts } from "../components/2_Competition/layoutConstants";
import MuscleGroupIcon from "../components/3_Workout/NewWorkout/SelectExercise/MuscleGroupIcon";
import { subscribeUserData } from "../utils/userDataEvents";
import { exercises as EXERCISE_DEFS } from "../components/3_Workout/NewWorkout/SelectExercise/EXERCISES";
import { buildMetaFromDefs, inferMetaByName } from "../logic/exerciseCatalog";
import ExerciseAvatar, { toExerciseSlug } from "../components/common/ExerciseAvatar";
import calculate1RM from "../helper/calculate1RM";
import Svg, { Path } from "react-native-svg";

const MUSCLE_ICON_HIGHLIGHT = "#ff6f67ff";
const MUSCLE_ICON_HIGHLIGHT_DIM = "rgba(255, 127, 120, 0.6)";
const DEFAULT_SEGMENTS = {
    shoulders: ["shoulders"],
    chest: ["chest"],
    arms: ["arms", "forearms"],
    back: ["back", "traps"],
    abs: ["abs", "obliques"],
    legs: ["quads", "calves"],
    overall: ["calves", "quads", "abs", "obliques", "back", "forearms", "arms", "shoulders", "chest", "traps"],
};
const DEFAULT_ICON_SCALES = {
    shoulders: 2.6,
    chest: 2.8,
    arms: 1.8,
    back: 2.2,
    abs: 3,
    legs: 2.4,
    overall: 1.6,
};
const DEFAULT_ICON_OFFSETS = {
    shoulders: scaleSize(70),
    chest: scaleSize(80),
    arms: scaleSize(25),
    back: scaleSize(50),
    abs: scaleSize(40),
    legs: scaleSize(-20),
    overall: scaleSize(10),
};

const EXERCISE_META_MAP = (() => {
    const defsMeta = buildMetaFromDefs(EXERCISE_DEFS);
    const map = new Map();
    const register = (name, meta) => {
        const key = String(name || "").trim().toLowerCase();
        if (!key || map.has(key)) return;
        map.set(key, meta || {});
        const simplified = key.replace(/\s*\(([^)]+)\)\s*/g, "").trim();
        if (simplified && !map.has(simplified)) {
            map.set(simplified, meta || {});
        }
    };
    Object.entries(defsMeta || {}).forEach(([name, meta]) => register(name, meta));
    return map;
})();

const normalizeGroupKey = (group) => {
    if (typeof group !== "string") return null;
    const key = group.trim().toLowerCase();
    if (!key) return null;
    if (key.startsWith("shoulder")) return "shoulders";
    if (key === "shoulders") return "shoulders";
    if (key === "chest") return "chest";
    if (key === "arms" || key.includes("arm") || key.includes("bicep") || key.includes("tricep")) return "arms";
    if (key === "legs" || key.includes("leg") || key.includes("quad") || key.includes("calf") || key.includes("hamstring")) return "legs";
    if (key === "back" || key.includes("back") || key.includes("trap")) return "back";
    if (key === "abs" || key.includes("core")) return "abs";
    if (key === "full" || key.includes("full body")) return "overall";
    return key;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const resolvePreferredWeightUnit = (user) => {
    const rawUnit =
        user?.settings?.units ||
        user?.units ||
        user?.personalInfo?.weightUnit ||
        user?.stats?.weightUnit;
    if (typeof rawUnit === "string") {
        const normalized = rawUnit.trim().toLowerCase();
        if (normalized.startsWith("k")) return "kg";
        if (normalized.includes("kilo")) return "kg";
    }
    return "lb";
};

const toDisplayWeightUnit = (unit, fallback = "lbs") => {
    if (typeof unit === "string") {
        const trimmed = unit.trim();
        const normalized = trimmed.toLowerCase();
        if (normalized) {
            if (normalized.startsWith("kg")) return "kg";
            if (normalized === "lb" || normalized === "lbs" || normalized.startsWith("lb")) return "lbs";
            return trimmed;
        }
    }
    return fallback;
};

const resolveExerciseGroup = (name, entry) => {
    const fallbackFields = [entry?.muscleGroup, entry?.muscle];
    for (const field of fallbackFields) {
        const normalized = normalizeGroupKey(field);
        if (normalized) return normalized;
    }

    const normalizedName = String(name || "").trim().toLowerCase();
    if (normalizedName) {
        const directMeta = EXERCISE_META_MAP.get(normalizedName);
        if (directMeta?.group) {
            const normalized = normalizeGroupKey(directMeta.group);
            if (normalized) return normalized;
        }
        const simplified = normalizedName.replace(/\s*\(([^)]+)\)\s*/g, "").trim();
        if (simplified) {
            const simplifiedMeta = EXERCISE_META_MAP.get(simplified);
            if (simplifiedMeta?.group) {
                const normalized = normalizeGroupKey(simplifiedMeta.group);
                if (normalized) return normalized;
            }
        }
    }

    const inferred = inferMetaByName(name || "");
    return normalizeGroupKey(inferred?.group);
};

const buildExerciseList = (statsExercises, workouts, targetGroup) => {
    const target = normalizeGroupKey(targetGroup) || "overall";
    const seen = new Map();

    const record = (rawName, entry, source = "workout") => {
        const name = typeof rawName === "string" ? rawName.trim() : "";
        if (!name) return;
        const normalizedKey = name.toLowerCase();
        const existing = seen.get(normalizedKey);
        const resolvedGroup = normalizeGroupKey(resolveExerciseGroup(name, entry)) || "overall";
        if (target !== "overall" && resolvedGroup !== target) return;
        const next = existing ? { ...existing } : { name, group: resolvedGroup };
        if (source === "stats" && entry) {
            next.statsEntry = entry;
        }
        if (source === "workout" && entry) {
            const sets = Array.isArray(entry?.sets) ? entry.sets.filter(Boolean) : [];
            if (!next.workoutSets && sets.length) next.workoutSets = sets;
        }
        if (!next.slug) next.slug = toExerciseSlug(name);
        seen.set(normalizedKey, next);
    };

    Object.entries(statsExercises || {}).forEach(([name, entry]) => record(name, entry, "stats"));

    (Array.isArray(workouts) ? workouts : []).forEach((workout) => {
        const exercises = Array.isArray(workout?.exercises) ? workout.exercises : [];
        exercises.forEach((ex) => record(ex?.name, ex, "workout"));
    });

    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
};

const formatWeightValue = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return null;
    if (num >= 100) return Math.round(num).toString();
    const rounded = Math.round(num * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

const computeBestOneRmFromSets = (sets = []) => {
    if (!Array.isArray(sets) || !sets.length) return null;
    let best = 0;
    sets.forEach((set) => {
        const reps = Number(set?.reps) || 0;
        const weight = Number(set?.weight) || 0;
        if (reps > 0 && weight > 0) {
            const est = calculate1RM(weight, reps);
            if (est > best) best = est;
        }
    });
    return best > 0 ? best : null;
};

const resolveEstimatedOneRm = (item) => {
    const stats = item?.statsEntry || {};
    const direct = Number(stats?.["1RM"] ?? stats?.oneRM ?? stats?.oneRm ?? stats?.oneRepMax);
    if (Number.isFinite(direct) && direct > 0) return direct;

    if (stats?.bestSet) {
        const w = Number(stats.bestSet?.weight) || 0;
        const r = Number(stats.bestSet?.reps) || 0;
        if (w > 0 && r > 0) {
            const est = calculate1RM(w, r);
            if (Number.isFinite(est) && est > 0) return est;
        }
    }

    const fromStatsSets = computeBestOneRmFromSets(stats?.sets || []);
    if (fromStatsSets) return fromStatsSets;

    return computeBestOneRmFromSets(item?.workoutSets || []);
};

const SPARK_WIDTH = 160;
const SPARK_HEIGHT = 60;
const SPARK_PAD_X = 6;
const SPARK_PAD_Y = 10;

const buildSparklinePath = (progress = [], fallbackValue = null) => {
    const values = Array.isArray(progress)
        ? progress
            .map((entry) => Number(entry?.["1RM"] ?? entry?.oneRM ?? entry?.oneRm ?? entry?.value ?? entry?.val ?? 0))
            .filter((v) => Number.isFinite(v) && v > 0)
        : [];
    if ((!values || values.length === 0) && Number.isFinite(fallbackValue) && fallbackValue > 0) {
        values.push(fallbackValue);
    }
    if (values.length === 0) {
        return `M ${SPARK_PAD_X} ${SPARK_HEIGHT / 2} L ${SPARK_WIDTH - SPARK_PAD_X} ${SPARK_HEIGHT / 2}`;
    }
    if (values.length === 1) values.push(values[0]);

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const norm = values.map((v) => (v - min) / range);
    const innerWidth = SPARK_WIDTH - SPARK_PAD_X * 2;
    const innerHeight = SPARK_HEIGHT - SPARK_PAD_Y * 2;
    const step = innerWidth / (norm.length - 1 || 1);

    let path = "";
    norm.forEach((ratio, idx) => {
        const x = SPARK_PAD_X + step * idx;
        const y = SPARK_PAD_Y + innerHeight * (1 - ratio);
        path += `${idx === 0 ? "M" : " L"} ${x} ${y}`;
    });
    return path;
};

export default function MuscleGroupExercises() {
    const navigation = useNavigation();
    const route = useRoute();
    const [userData, setUserData] = useState(() => {
        try {
            return global?.userData || null;
        } catch {
            return null;
        }
    });

    useEffect(() => {
        const unsubscribe = subscribeUserData((payload) => setUserData(payload));
        return unsubscribe;
    }, []);

    const params = route?.params || {};
    const muscleKey = params?.muscleKey || params?.key || "overall";
    const muscleLabel = params?.muscleLabel || params?.label || "Overall";
    const muscleSegments = params?.muscleSegments || DEFAULT_SEGMENTS[muscleKey] || [];
    const rawScale = params?.iconScale || DEFAULT_ICON_SCALES[muscleKey] || 2;
    const iconScale = clamp(rawScale, 1.4, 2.4);
    const rawOffset = params?.iconOffset || DEFAULT_ICON_OFFSETS[muscleKey] || 0;
    const iconOffset = clamp(rawOffset, -scaleSize(24), scaleSize(28));
    const iconStrokeWidth = params?.iconStrokeWidth ?? (muscleKey === "back" ? 14 : undefined);

    const preferredUnit = useMemo(() => resolvePreferredWeightUnit(userData), [userData]);
    const displayPreferredUnit = useMemo(() => toDisplayWeightUnit(preferredUnit), [preferredUnit]);

    const completedWorkouts = useMemo(
        () => (Array.isArray(userData?.completedWorkouts) ? userData.completedWorkouts.filter(Boolean) : []),
        [userData?.completedWorkouts]
    );

    const exerciseList = useMemo(
        () => buildExerciseList(userData?.statsExercises || {}, completedWorkouts, muscleKey),
        [userData?.statsExercises, completedWorkouts, muscleKey]
    );

    const handleBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    const buildExercisePayload = useCallback(
        (item) => {
            if (!item) return null;
            const meta = EXERCISE_META_MAP.get(String(item.name || "").trim().toLowerCase()) || {};
            const group = meta.group || item.group || null;
            const muscleLabel = group ? `${group.charAt(0).toUpperCase()}${group.slice(1)}` : undefined;
            return {
                name: item.name,
                title: item.name,
                muscleGroup: muscleLabel,
                muscle: muscleLabel,
                slug: item.slug || toExerciseSlug(item.name),
                equipment: meta.equipment || undefined,
            };
        },
        []
    );

    const handlePressExercise = useCallback(
        (item) => {
            const payload = buildExercisePayload(item);
            if (!payload) return;
            navigation.navigate("ExerciseDetail", { exercise: payload });
        },
        [buildExercisePayload, navigation]
    );

    const renderItem = useCallback(
        ({ item }) => {
            const estOneRm = resolveEstimatedOneRm(item);
            const estTextRaw = formatWeightValue(estOneRm);
            const estLabel = estTextRaw ? `${estTextRaw} ${displayPreferredUnit}` : "--";
            const sparkPath = buildSparklinePath(item?.statsEntry?.progress1RM, estOneRm);
            return (
                <Pressable
                    style={styles.exerciseCard}
                    android_ripple={{ color: "rgba(255,255,255,0.05)" }}
                    onPress={() => handlePressExercise(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`View details for ${item.name}`}
                >
                    <View style={styles.exerciseLeft}>
                        <View style={styles.exerciseImageWrap}>
                            <ExerciseAvatar
                                name={item.name}
                                slug={item.slug}
                                size={scaleSize(56)}
                                imageStyle={styles.exerciseImage}
                            />
                        </View>
                        <View style={styles.exerciseText}>
                            <Text style={styles.exerciseTitle}>{item.name}</Text>
                            <Text style={styles.exerciseSub}>Est 1RM: {estLabel}</Text>
                        </View>
                    </View>
                    <View style={styles.waveWrap}>
                        <Svg
                            width={scaleSize(SPARK_WIDTH)}
                            height={scaleSize(SPARK_HEIGHT)}
                            viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
                        >
                            <Path
                                d={sparkPath}
                                stroke="#4FAEFF"
                                strokeWidth={4}
                                strokeLinecap="round"
                                fill="none"
                            />
                        </Svg>
                    </View>
                </Pressable>
            );
        },
        [displayPreferredUnit, handlePressExercise]
    );

    return (
        <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Pressable
                        onPress={handleBack}
                        hitSlop={12}
                        style={styles.backButton}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                    >
                        <Ionicons name="chevron-back" size={scaleSize(22)} color="rgba(196, 204, 222, 0.9)" />
                    </Pressable>
                    <View style={styles.headerHandle}>
                        <View style={styles.headerBadge}>
                            <View style={styles.headerBadgeInner}>
                                <MuscleGroupIcon
                                    segments={muscleSegments}
                                    strokeWidth={iconStrokeWidth || undefined}
                                    highlightColor={MUSCLE_ICON_HIGHLIGHT}
                                    dimHighlightColor={MUSCLE_ICON_HIGHLIGHT_DIM}
                                    scale={iconScale}
                                    offsetY={iconOffset}
                                />
                            </View>
                        </View>
                        <Text style={styles.headerLabel}>{muscleLabel}</Text>
                    </View>
                    <View style={styles.headerSpacer} />
                </View>

                {exerciseList.length ? (
                    <FlatList
                        data={exerciseList}
                        keyExtractor={(item) => item.name}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                    />
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyTitle}>No exercises yet</Text>
                        <Text style={styles.emptySubtitle}>
                            Complete a workout with {muscleLabel.toLowerCase()} exercises to see them here.
                        </Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    container: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(16),
        paddingVertical: scaleSize(14),
        backgroundColor: theme.bg,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.08)",
    },
    backButton: {
        width: scaleSize(36),
        height: scaleSize(36),
        alignItems: "center",
        justifyContent: "center",
    },
    headerHandle: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    headerBadge: {
        width: scaleSize(52),
        height: scaleSize(52),
        borderRadius: scaleSize(26),
        backgroundColor: "rgba(89, 169, 255, 0.12)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: scaleSize(12),
        overflow: "hidden",
    },
    headerBadgeInner: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    headerLabel: {
        fontFamily: "Outfit_700Bold",
        fontSize: ts(16),
        color: theme.textPrimary ?? "#F6F8FF",
    },
    headerSpacer: {
        width: scaleSize(36),
        height: scaleSize(36),
    },
    listContent: {
        paddingHorizontal: 0,
        paddingVertical: scaleSize(12),
    },
    exerciseCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: theme.bg,
        borderRadius: scaleSize(14),
        paddingHorizontal: scaleSize(18),
        paddingVertical: scaleSize(12),
        shadowColor: "rgba(0,0,0,0.35)",
        shadowOpacity: 0.5,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
        elevation: 6,
    },
    exerciseLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginRight: scaleSize(12),
    },
    exerciseImageWrap: {
        width: scaleSize(56),
        height: scaleSize(56),
        borderRadius: scaleSize(12),
        backgroundColor: "transparent",
        alignItems: "center",
        justifyContent: "center",
        marginRight: scaleSize(12),
        overflow: "hidden",
    },
    exerciseImage: {
        backgroundColor: "transparent",
    },
    exerciseText: {
        flex: 1,
    },
    exerciseTitle: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: ts(13),
        color: theme.textPrimary ?? "#F6F8FF",
        marginBottom: scaleSize(4),
    },
    exerciseSub: {
        fontFamily: "Outfit_700Bold",
        fontSize: ts(11),
        color: "rgba(216,226,255,0.64)",
    },
    waveWrap: {
        justifyContent: "center",
        alignItems: "flex-end",
    },
    separator: {
        height: scaleSize(12),
    },
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scaleSize(32),
        paddingTop: scaleSize(60),
    },
    emptyTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: ts(16),
        color: theme.textPrimary ?? "#F6F8FF",
        marginBottom: scaleSize(6),
    },
    emptySubtitle: {
        fontFamily: "Outfit_500Medium",
        fontSize: ts(13),
        color: "rgba(216,226,255,0.68)",
        textAlign: "center",
        lineHeight: ts(18),
    },
});
