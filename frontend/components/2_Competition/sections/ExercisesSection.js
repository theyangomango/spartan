import React, { useMemo, useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View, ScrollView, TouchableOpacity, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import RNBounceable from "@freakycoder/react-native-bounceable";

import useStableSafeAreaInsets from "../../../hooks/useStableSafeAreaInsets";
import theme from "../../../theme/mfpDark";
import ExerciseAvatar from "../../common/ExerciseAvatar";
import { getExerciseImageSource, toExerciseSlug } from "../../common/exerciseImageMap";
import { exercises as ALL_EXERCISES } from "../../3_Workout/NewWorkout/SelectExercise/EXERCISES";
import { scaleSize, DEVICE_WIDTH, scaleFont } from "../layoutConstants";
import { withStrongPress } from "../../../utils/haptics";

const EXERCISE_CARD_GAP = scaleSize(8, "w");
const EXERCISE_CARD_ASPECT_RATIO = 0.72;
const EXERCISE_GRID_COLUMNS = 2;

const EXERCISE_LIST_PADDING = scaleSize(6, "w");
const EXERCISE_CARD_WIDTH = Math.round(
    (DEVICE_WIDTH - EXERCISE_LIST_PADDING * 2 - EXERCISE_CARD_GAP * (EXERCISE_GRID_COLUMNS - 1)) /
        EXERCISE_GRID_COLUMNS
);

const PLACEHOLDER_IMAGE_URI =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAQAAAAAYLlVAAAAJ0lEQVR4Ae3BAQ0AAADCoPdPbQ43oAAAAAAAAAAAAAAAAAAA4IMAAAGe2TQeAAAAAElFTkSuQmCC";
const DEFAULT_EXERCISE_IMAGE = { uri: PLACEHOLDER_IMAGE_URI };

const FOCUS_OPTIONS = [
    { label: "All", value: "overall" },
    { label: "Chest", value: "chest" },
    { label: "Shoulders", value: "shoulders" },
    { label: "Back", value: "back" },
    { label: "Legs", value: "legs" },
    { label: "Arms", value: "arms" },
    { label: "Abs", value: "abs" },
];

const FOCUS_SLUGS = {
    overall: "45-degree-leg-press-machine",
    chest: "bench-press-barbell",
    shoulders: "arnold-press-dumbbell",
    back: "t-bar-row-machine",
    legs: "back-squat-barbell",
    arms: "bicep-curl-dumbbell",
    abs: "ab-wheel-rollout",
};

const FOCUS_KEYWORDS = {
    chest: ["chest", "pect"],
    shoulders: ["shoulder", "deltoid"],
    back: ["back", "lat", "lats"],
    legs: ["leg", "quad", "hamstring", "glute", "calf"],
    arms: ["arm", "bicep", "tricep", "forearm"],
    abs: ["ab", "core", "oblique"],
};


export default function ExercisesSection() {
    const navigation = useNavigation();
    const insets = useStableSafeAreaInsets();
    const [focusFilter, setFocusFilter] = useState("overall");
    const bottomPadding = useMemo(
        () => Math.max(scaleSize(32), (insets?.bottom || 0) + scaleSize(12)),
        [insets?.bottom]
    );

    const exerciseCards = useMemo(() => {
        const seen = new Set();
        return ALL_EXERCISES.reduce((acc, exercise) => {
            const rawName = typeof exercise?.name === "string" ? exercise.name.trim() : "";
            if (!rawName) return acc;
            const keyBase = rawName.toLowerCase();
            if (seen.has(keyBase)) return acc;
            seen.add(keyBase);
            const slug = toExerciseSlug(rawName);
            const displayTitle =
                rawName.replace(/\s*\(([^)]+)\)/g, "").replace(/\s+/g, " ").trim() || rawName;
            acc.push({
                key: keyBase,
                name: rawName,
                slug,
                title: displayTitle,
                muscle: exercise?.muscleGroup || exercise?.muscle || "—",
                equipment: exercise?.equipment || "—",
                payload: {
                    ...exercise,
                    name: rawName,
                    muscleGroup: exercise?.muscleGroup || exercise?.muscle || undefined,
                    title: displayTitle,
                    slug,
                },
            });
            return acc;
        }, []);
    }, []);


    const filteredExercises = useMemo(() => {
        if (focusFilter === "overall") return exerciseCards;
        const keywords = FOCUS_KEYWORDS[focusFilter] || [];
        if (!keywords.length) return exerciseCards;
        return exerciseCards.filter((item) => {
            const muscle = String(item.muscle || "").toLowerCase();
            if (!muscle) return false;
            return keywords.some((kw) => muscle.includes(kw));
        });
    }, [exerciseCards, focusFilter]);

    const handleExercisePress = useCallback(
        (item) => {
            if (!item) return;
            const payload = item.payload || {
                name: item.name,
                muscleGroup: item.muscle,
                equipment: item.equipment,
                title: item.title,
            };
            navigation.navigate("ExerciseDetail", { exercise: payload });
        },
        [navigation]
    );

    const renderExerciseCard = useCallback(
        ({ item, index }) => {
            const isRowEnd = (index + 1) % EXERCISE_GRID_COLUMNS === 0;
            const imageSource = getExerciseImageSource(item.slug);
            const displaySource = imageSource || DEFAULT_EXERCISE_IMAGE;
            const imageStyle = imageSource ? styles.exerciseImage : styles.exerciseImagePlaceholder;

            return (
                <RNBounceable
                    style={[
                        styles.exerciseCard,
                        {
                            width: EXERCISE_CARD_WIDTH,
                            aspectRatio: EXERCISE_CARD_ASPECT_RATIO,
                            marginRight: isRowEnd ? 0 : EXERCISE_CARD_GAP,
                            marginBottom: EXERCISE_CARD_GAP,
                        },
                    ]}
                    onPress={withStrongPress(() => handleExercisePress(item))}
                    activeScale={0.97}
                    accessibilityRole="button"
                    accessibilityLabel={`View details for ${item.title}`}
                >
                    <View style={styles.exerciseImageWrapper}>
                        <View style={styles.exerciseImageInner}>
                            <Image source={displaySource} resizeMode="contain" style={imageStyle} />
                        </View>
                    </View>
                    <View style={styles.exerciseInfo}>
                        <Text style={styles.exerciseName} numberOfLines={2}>
                            {item.title}
                        </Text>
                        <Text style={styles.exerciseMuscle} numberOfLines={1}>
                            {item.muscle}
                        </Text>
                    </View>
                </RNBounceable>
            );
        },
        [handleExercisePress]
    );

    return (
        <View style={styles.screen}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.focusStrip}
                contentContainerStyle={styles.focusStripContent}
            >
                {FOCUS_OPTIONS.map((opt) => {
                    const isActive = focusFilter === opt.value;
                    const thumbSlug = FOCUS_SLUGS[opt.value] || FOCUS_SLUGS.overall;
                    return (
                        <TouchableOpacity
                            key={opt.value}
                            style={[styles.focusCard, isActive && styles.focusCardActive]}
                            onPress={withStrongPress(() => setFocusFilter(opt.value))}
                            activeOpacity={0.9}
                            accessibilityRole="button"
                            accessibilityLabel={`Filter exercises by ${opt.label}`}
                        >
                            <View style={[styles.focusThumb, isActive && styles.focusThumbActive]}>
                                <ExerciseAvatar
                                    slug={thumbSlug}
                                    name={opt.label}
                                    size={scaleSize(28)}
                                    style={styles.focusAvatar}
                                    showFallbackInitials={false}
                                />
                            </View>
                            <Text
                                style={[styles.focusCardLabel, isActive && styles.focusCardLabelActive]}
                                numberOfLines={1}
                            >
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            <FlatList
                data={filteredExercises}
                keyExtractor={(item) => item.key}
                renderItem={renderExerciseCard}
                numColumns={EXERCISE_GRID_COLUMNS}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.exerciseListContent,
                    { paddingBottom: bottomPadding },
                ]}
                columnWrapperStyle={styles.exerciseColumnWrapper}
                bounces
                style={styles.exerciseList}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.bg },
    focusStrip: { paddingHorizontal: EXERCISE_LIST_PADDING, paddingTop: scaleSize(6) },
    focusStripContent: { paddingRight: scaleSize(6), paddingBottom: scaleSize(4) },
    focusCard: {
        width: scaleSize(48),
        borderRadius: scaleSize(14),
        marginRight: scaleSize(8),
        paddingHorizontal: scaleSize(6),
        paddingVertical: scaleSize(4),
        alignItems: "center",
        backgroundColor: "rgba(18,24,38,0.76)",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.06)",
    },
    focusCardActive: {
        borderColor: "rgba(87,185,255,0.8)",
        backgroundColor: "rgba(87,185,255,0.18)",
        shadowColor: "#57B9FF",
        shadowOffset: { width: 0, height: scaleSize(4) },
        shadowOpacity: 0.2,
        shadowRadius: scaleSize(6),
    },
    focusThumb: {
        width: scaleSize(38),
        height: scaleSize(38),
        borderRadius: scaleSize(14),
        backgroundColor: "rgba(12,18,32,0.92)",
        alignItems: "center",
        justifyContent: "center",
    },
    focusThumbActive: {
        backgroundColor: "rgba(23, 35, 56, 0.92)",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(87,185,255,0.9)",
    },
    focusCardLabel: {
        marginTop: scaleSize(3),
        fontFamily: "Outfit_500Medium",
        fontSize: scaleFont(9),
        color: "rgba(205,214,234,0.74)",
        letterSpacing: 0.2,
    },
    focusCardLabelActive: {
        color: "#FFFFFF",
    },
    focusAvatar: {
        borderWidth: 0,
        backgroundColor: "transparent",
    },
    exerciseListContent: {
        paddingHorizontal: EXERCISE_LIST_PADDING,
        paddingTop: scaleSize(12),
    },
    exerciseColumnWrapper: {
        justifyContent: "flex-start",
    },
    exerciseCard: {
        backgroundColor: theme.surface,
        borderRadius: scaleSize(16),
        overflow: "hidden",
        flexDirection: "column",
    },
    exerciseImageWrapper: {
        flex: 3,
        backgroundColor: theme.fieldDeep,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scaleSize(10),
        paddingVertical: scaleSize(16),
    },
    exerciseImageInner: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    exerciseImage: {
        width: "100%",
        height: "100%",
    },
    exerciseImagePlaceholder: {
        width: "60%",
        height: "60%",
        opacity: 0.22,
    },
    exerciseInfo: {
        flex: 2,
        paddingHorizontal: scaleSize(10),
        paddingVertical: scaleSize(10),
        justifyContent: "center",
        backgroundColor: theme.surface,
    },
    exerciseName: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleFont(13),
        color: theme.textPrimary,
    },
    exerciseMuscle: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleFont(10.5),
        color: theme.textSecondary,
        marginTop: scaleSize(4),
    },
});
