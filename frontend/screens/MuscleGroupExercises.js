import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    FlatList,
    Pressable,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import Svg, { Path } from "react-native-svg";

import { scaleSize } from "../components/2_Competition/layoutConstants";
import { MUSCLE_ICON_HIGHLIGHT, MUSCLE_ICON_HIGHLIGHT_DIM } from "../components/2_Competition/muscleGroupIconLayout";
import MuscleGroupIcon from "../components/3_Workout/NewWorkout/SelectExercise/MuscleGroupIcon";
import { subscribeUserData } from "../utils/userDataEvents";
import { resolvePreferredWeightUnit, toDisplayWeightUnit } from "../utils/weightUnits";
import ExerciseAvatar from "../components/common/ExerciseAvatar";
import { toExerciseSlug } from "../components/common/exerciseImageMap";
import {
    EXERCISE_META_MAP,
    buildExerciseList,
    formatWeightValue,
    resolveEstimatedOneRm,
} from "./muscleGroupExercises/muscleGroupExercisesUtils";
import { SPARK_WIDTH, SPARK_HEIGHT, buildSparklinePath } from "./muscleGroupExercises/muscleGroupSparkline";
import styles from "./muscleGroupExercises/MuscleGroupExercises.styles";

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

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const ItemSeparator = () => <View style={styles.separator} />;

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
            const sparkPath = buildSparklinePath(
                item?.statsEntry?.progress1RM,
                estOneRm,
                [
                    ...(Array.isArray(item?.statsEntry?.sets) ? item.statsEntry.sets : []),
                    ...(Array.isArray(item?.statsEntry?.recentSets) ? item.statsEntry.recentSets : []),
                    ...(Array.isArray(item?.workoutSets) ? item.workoutSets : []),
                ],
                completedWorkouts
            );
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
                            size={scaleSize(50)}
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
                                strokeWidth={3}
                                strokeLinecap="round"
                                fill="none"
                            />
                        </Svg>
                    </View>
                </Pressable>
            );
        },
        [completedWorkouts, displayPreferredUnit, handlePressExercise]
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
                        ItemSeparatorComponent={ItemSeparator}
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
