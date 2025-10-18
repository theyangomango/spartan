import React, { useMemo, useCallback, useState, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, TextInput } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import useStableSafeAreaInsets from "../../../hooks/useStableSafeAreaInsets";
import theme from "../../../theme/mfpDark";
import ExercisesFlatlist from "../../3_Workout/NewWorkout/SelectExercise/ExercisesFlatlist";
import MuscleGroupIcon from "../../3_Workout/NewWorkout/SelectExercise/MuscleGroupIcon";
import ExerciseCard from "../../3_Workout/NewWorkout/SelectExercise/ExerciseCard";
import { toExerciseSlug } from "../../common/exerciseImageMap";
import { exercises as ALL_EXERCISES } from "../../3_Workout/NewWorkout/SelectExercise/EXERCISES";
import { scaleSize } from "../layoutConstants";

const ICON_COLOR = "#D5E0F6";
const TEXT_PRIMARY = "#F6F8FF";
const TEXT_SECONDARY = "#9CA9C2";

const MUSCLE_FILTERS = [
    {
        label: "Full Body",
        value: null,
        segments: [
            "calves",
            "quads",
            "abs",
            "obliques",
            "forearms",
            "arms",
            "shoulders",
            "chest",
            "traps",
        ],
    },
    { label: "Chest", value: "chest", segments: ["chest"] },
    { label: "Shoulders", value: "shoulders", segments: ["shoulders"] },
    { label: "Arms", value: "arms", segments: ["arms", "forearms"] },
    { label: "Legs", value: "legs", segments: ["quads", "calves"] },
    { label: "Abs", value: "abs", segments: ["abs", "obliques"] },
    { label: "Back", value: "back", segments: [] },
];

const normalizeEquipment = (raw) => {
    const value = String(raw || "").toLowerCase();
    if (value === "bodyweight" || value.includes("body weight")) return "Bodyweight";
    if (value.includes("smith machine")) return "Smith Machine";
    if (value.includes("machine")) return "Machine";
    if (value.includes("barbell")) return "Barbell";
    if (value.includes("dumbbell")) return "Dumbbell";
    if (value.includes("cable")) return "Cable";
    if (value.includes("band")) return "Band";
    if (value.includes("kettlebell")) return "Kettlebell";
    if (value.includes("trap bar")) return "Trap Bar";
    return "Other";
};

export default function ExercisesSection() {
    const navigation = useNavigation();
    const insets = useStableSafeAreaInsets();
    const [searchValue, setSearchValue] = useState("");
    const [bodyPartValue, setBodyPartValue] = useState(null);
    const [savedExercisesMap, setSavedExercisesMap] = useState(() => {
        const stored = global?.userData?.savedExercises;
        if (!stored) return {};
        if (Array.isArray(stored)) {
            return stored.reduce((acc, entry) => {
                if (!entry) return acc;
                if (typeof entry === "string") {
                    acc[entry] = { name: entry, muscle: null };
                    return acc;
                }
                const name = entry?.name;
                if (!name) return acc;
                acc[name] = { ...entry, name, muscle: entry?.muscle ?? entry?.muscleGroup ?? null };
                return acc;
            }, {});
        }
        if (typeof stored === "object") {
            return Object.entries(stored).reduce((acc, [key, value]) => {
                if (!value && value !== 0) return acc;
                if (typeof value === "string") {
                    const name = value || key;
                    acc[name] = { name, muscle: null };
                    return acc;
                }
                if (typeof value === "object") {
                    const name = value?.name || key;
                    if (!name) return acc;
                    acc[name] = {
                        ...value,
                        name,
                        muscle: value?.muscle ?? value?.muscleGroup ?? null,
                    };
                    return acc;
                }
                acc[key] = { name: key, muscle: null };
                return acc;
            }, {});
        }
        return {};
    });

    const bottomInsetPadding = useMemo(
        () => (insets?.bottom || 0) + scaleSize(24),
        [insets?.bottom]
    );

    const exercises = useMemo(() => {
        const seen = new Set();
        return ALL_EXERCISES.reduce((acc, exercise) => {
            const rawName = typeof exercise?.name === "string" ? exercise.name.trim() : "";
            if (!rawName) return acc;
            const key = rawName.toLowerCase();
            if (seen.has(key)) return acc;
            seen.add(key);

            const muscleGroup = (exercise?.muscleGroup || exercise?.muscle || "—").trim();
            const equipment = exercise?.equipment || "Other";

            acc.push({
                ...exercise,
                name: rawName,
                title: rawName.replace(/\s*\(([^)]+)\)/g, "").replace(/\s+/g, " ").trim() || rawName,
                muscleGroup,
                muscle: muscleGroup,
                equipment,
                slug: toExerciseSlug(rawName),
                nameLc: rawName.toLowerCase(),
                mgLc: muscleGroup.toLowerCase(),
                equipNorm: normalizeEquipment(equipment),
            });
            return acc;
        }, []);
    }, []);

    const exercisesByName = useMemo(() => {
        return exercises.reduce((acc, item) => {
            if (!item?.name) return acc;
            acc[item.name] = item;
            return acc;
        }, {});
    }, [exercises]);

    useEffect(() => {
        try {
            if (global?.userData) {
                global.userData.savedExercises = savedExercisesMap;
            }
        } catch {
            // ignore sync failures
        }
    }, [savedExercisesMap]);

    const filteredExercises = useMemo(() => {
        const query = searchValue.trim().toLowerCase();
        const bodyFilter = bodyPartValue;

        return exercises.filter((exercise) => {
            const nameMatch =
                !query ||
                exercise.nameLc.includes(query) ||
                exercise.mgLc.includes(query);
            const bodyMatch = !bodyFilter || exercise.mgLc.includes(bodyFilter);
            return nameMatch && bodyMatch;
        });
    }, [exercises, searchValue, bodyPartValue]);

    const emptySelection = useMemo(() => ({}), []);

    const handleExercisePress = useCallback(
        ({ name }) => {
            if (!name) return;
            const payload = exercisesByName[name];
            if (!payload) return;
            navigation.navigate("ExerciseDetail", { exercise: payload });
        },
        [navigation, exercisesByName]
    );

    const toggleSavedExercise = useCallback(({ name, muscle }) => {
        if (!name) return;
        setSavedExercisesMap((prev) => {
            const next = { ...prev };
            if (next[name]) {
                delete next[name];
            } else {
                next[name] = { name, muscleGroup: muscle || null, muscle: muscle || null };
            }
            return next;
        });
    }, []);

    const handleFilterPress = useCallback((value) => {
        setBodyPartValue((prev) => (prev === value ? null : value));
    }, []);

    const bookmarkedExercises = useMemo(() => {
        const values = savedExercisesMap ? Object.values(savedExercisesMap) : [];
        if (!values.length) return [];

        return values
            .map((entry) => {
                if (!entry) return null;
                if (typeof entry === "string") {
                    const fallback = exercisesByName[entry] || {};
                    return {
                        ...fallback,
                        name: entry,
                        muscleGroup: fallback?.muscleGroup ?? fallback?.muscle ?? "—",
                        muscle: fallback?.muscle ?? fallback?.muscleGroup ?? null,
                    };
                }

                const name = entry?.name;
                if (!name) return null;
                const fallback = exercisesByName[name] || {};
                const muscleGroup =
                    entry?.muscleGroup ??
                    entry?.muscle ??
                    fallback?.muscleGroup ??
                    fallback?.muscle ??
                    "—";
                const muscle =
                    entry?.muscle ??
                    entry?.muscleGroup ??
                    fallback?.muscle ??
                    fallback?.muscleGroup ??
                    null;

                return {
                    ...fallback,
                    ...entry,
                    name,
                    muscleGroup,
                    muscle,
                };
            })
            .filter(Boolean)
            .sort((a, b) => {
                const nameA = a?.name || "";
                const nameB = b?.name || "";
                return nameA.localeCompare(nameB);
            });
    }, [savedExercisesMap, exercisesByName]);

    const filteredBookmarkedExercises = useMemo(() => {
        if (!bookmarkedExercises.length) return [];
        if (!bodyPartValue) return bookmarkedExercises;
        const filter = String(bodyPartValue || "").toLowerCase();
        return bookmarkedExercises.filter((exercise) => {
            const muscleLc = String(exercise?.muscleGroup || exercise?.muscle || "").toLowerCase();
            if (!muscleLc) return false;
            return muscleLc.includes(filter);
        });
    }, [bookmarkedExercises, bodyPartValue]);

    const bookmarkedRows = useMemo(() => {
        if (!filteredBookmarkedExercises.length) return [];
        const rows = [];
        for (let i = 0; i < filteredBookmarkedExercises.length; i += 3) {
            rows.push(filteredBookmarkedExercises.slice(i, i + 3));
        }
        return rows;
    }, [filteredBookmarkedExercises]);

    const hasBookmarkedMatches = bookmarkedRows.length > 0;
    const hasAnyBookmarks = bookmarkedExercises.length > 0;

    const listHeaderComponent = useMemo(() => {
        return (
            <View style={styles.bookmarkedSection}>
                <Text style={styles.sectionTitle}>Bookmarked Exercises</Text>
                {hasBookmarkedMatches ? (
                    <View style={styles.bookmarkedGrid}>
                        {bookmarkedRows.map((row, rowIndex) => (
                            <View key={`row-${rowIndex}`} style={styles.bookmarkedRow}>
                                {row.map((exercise, index) => (
                                    <View key={`${exercise?.name || "bookmark"}-${rowIndex}-${index}`} style={styles.bookmarkedCardWrapper}>
                                        <ExerciseCard
                                            name={exercise.name}
                                            muscleGroup={exercise.muscleGroup}
                                            selectExercise={handleExercisePress}
                                            deselectExercise={handleExercisePress}
                                            isSelected={false}
                                            isSaved
                                            toggleSaved={toggleSavedExercise}
                                            touchable
                                            style={styles.bookmarkedCard}
                                            hideInfoButton
                                        />
                                    </View>
                                ))}
                                {row.length < 3 &&
                                    Array.from({ length: 3 - row.length }).map((_, fillerIndex) => (
                                        <View
                                            key={`spacer-${rowIndex}-${fillerIndex}`}
                                            style={styles.bookmarkedSpacer}
                                        />
                                    ))}
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={styles.bookmarkedEmpty}>
                        <Text style={styles.bookmarkedEmptyText}>
                            {hasAnyBookmarks
                                ? "No bookmarked exercises match this focus."
                                : "No bookmarked exercises yet. Tap the bookmark icon to save favorites."}
                        </Text>
                    </View>
                )}
                <Text style={[styles.sectionTitle, styles.sectionTitleSpacer]}>All Exercises</Text>
                {filteredExercises.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateTitle}>No exercises found</Text>
                        <Text style={styles.emptyStateSubtitle}>
                            Try adjusting your search or filters.
                        </Text>
                    </View>
                )}
            </View>
        );
    }, [
        bookmarkedRows,
        filteredExercises.length,
        handleExercisePress,
        toggleSavedExercise,
        hasAnyBookmarks,
        hasBookmarkedMatches,
    ]);

    return (
        <View style={styles.screen}>
            <View style={styles.searchOuter}>
                <View style={styles.searchContainer}>
                    <Ionicons
                        name="search"
                        size={scaleSize(18)}
                        color="rgba(210,215,229,0.85)"
                        style={styles.searchIcon}
                    />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search exercises..."
                        placeholderTextColor="rgba(208,214,228,0.7)"
                        value={searchValue}
                        onChangeText={setSearchValue}
                        returnKeyType="search"
                    />
                </View>
            </View>

            <View style={styles.muscleFilterSection}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.muscleFilterScroll}
                    contentContainerStyle={styles.muscleFilterContent}
                    snapToAlignment="start"
                    decelerationRate="fast"
                >
                    <View style={styles.muscleFilterRow}>
                        {MUSCLE_FILTERS.map((option, index) => {
                            const isActive = option.value === bodyPartValue;
                            return (
                                <Pressable
                                    key={option.label}
                                    style={[
                                        styles.muscleFilterChip,
                                        isActive && styles.muscleFilterChipActive,
                                        index === MUSCLE_FILTERS.length - 1 && styles.muscleFilterChipLast,
                                    ]}
                                    onPress={() => handleFilterPress(option.value)}
                                    accessibilityRole="button"
                                    accessibilityLabel={option.label}
                                >
                                    <View
                                        style={[
                                            styles.muscleFilterIconWrap,
                                            isActive && styles.muscleFilterIconWrapActive,
                                        ]}
                                    >
                                        <MuscleGroupIcon segments={option.segments} dimmed={!isActive} />
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>

            <View style={styles.listWrapper}>
                <ExercisesFlatlist
                    exercises={filteredExercises}
                    selectExercise={handleExercisePress}
                    deselectExercise={handleExercisePress}
                    toggleSavedExercise={toggleSavedExercise}
                    selectedLookup={emptySelection}
                    savedLookup={savedExercisesMap}
                    animatedPress
                    bottomPadding={bottomInsetPadding + scaleSize(140)}
                    listHeaderComponent={listHeaderComponent}
                    hideInfoButton
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: theme.bg,
        paddingTop: scaleSize(12),
    },
    searchOuter: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: scaleSize(16),
        marginBottom: scaleSize(18),
    },
    searchContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(16),
        paddingVertical: scaleSize(12),
        borderRadius: scaleSize(18),
        backgroundColor: theme.surface,
    },
    searchIcon: {
        marginRight: scaleSize(10),
    },
    searchInput: {
        flex: 1,
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(14),
        color: TEXT_PRIMARY,
    },
    muscleFilterSection: {
        height: scaleSize(88),
        justifyContent: "center",
    },
    muscleFilterScroll: {
        height: scaleSize(72),
        paddingHorizontal: scaleSize(10),
    },
    muscleFilterContent: {
        paddingHorizontal: scaleSize(10),
        alignItems: "center",
    },
    muscleFilterRow: {
        flexDirection: "row",
        alignItems: "center",
        flexGrow: 0,
    },
    muscleFilterChip: {
        width: scaleSize(74),
        aspectRatio: 1,
        alignItems: "center",
        justifyContent: "center",
        marginRight: scaleSize(8),
        paddingVertical: 0,
        flexShrink: 0,
        flexGrow: 0,
    },
    muscleFilterChipActive: {},
    muscleFilterChipLast: {
        marginRight: 0,
    },
    muscleFilterIconWrap: {
        width: scaleSize(70),
        aspectRatio: 1,
        borderRadius: scaleSize(24),
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: "rgba(255, 255, 255, 0.06)",
        overflow: "hidden",
    },
    muscleFilterIconWrapActive: {
        backgroundColor: "rgba(87, 185, 255, 0.18)",
        borderColor: "#57B9FF",
        shadowColor: "#57B9FF",
        shadowOpacity: 0.2,
        shadowRadius: scaleSize(6),
    },
    listWrapper: {
        flex: 1,
    },
    bookmarkedSection: {
        paddingBottom: scaleSize(6),
    },
    sectionTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(14),
        color: TEXT_PRIMARY,
        marginTop: scaleSize(10),
        marginBottom: scaleSize(8),
        paddingHorizontal: scaleSize(12),
    },
    sectionTitleSpacer: {
        marginTop: scaleSize(16),
    },
    bookmarkedGrid: {
        flexDirection: "column",
        marginBottom: scaleSize(4),
    },
    bookmarkedRow: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: scaleSize(6),
    },
    bookmarkedCardWrapper: {
        flexGrow: 0,
        flexShrink: 0,
        width: "32.5%",
        maxWidth: "32.5%",
    },
    bookmarkedCard: {
        width: "100%",
        maxWidth: "100%",
    },
    bookmarkedSpacer: {
        width: "32.5%",
        maxWidth: "32.5%",
        flexGrow: 0,
        flexShrink: 0,
        opacity: 0,
    },
    bookmarkedEmpty: {
        marginBottom: scaleSize(12),
        paddingHorizontal: scaleSize(16),
        paddingVertical: scaleSize(14),
        borderRadius: scaleSize(18),
        marginHorizontal: scaleSize(6),
        backgroundColor: theme.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(90, 176, 255, 0.14)",
    },
    bookmarkedEmptyText: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12),
        color: TEXT_SECONDARY,
        lineHeight: scaleSize(16),
    },
    emptyState: {
        paddingHorizontal: scaleSize(20),
        paddingVertical: scaleSize(32),
        alignItems: "center",
    },
    emptyStateTitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(14),
        color: TEXT_PRIMARY,
        marginBottom: scaleSize(6),
    },
    emptyStateSubtitle: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12),
        color: TEXT_SECONDARY,
        textAlign: "center",
    },
});
