import React, {
    useState,
    useEffect,
    useRef,
    useMemo,
    useCallback,
} from "react";
import {
    View,
    Text,
    Pressable,
    TextInput,
    Animated,
    ScrollView,
    InteractionManager,
    Dimensions,
    Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import scaleSize from "../../../../helper/scaleSize";
import { exercises } from "./EXERCISES";
import ExercisesFlatlist from "./ExercisesFlatlist";
import ExerciseCard from "./ExerciseCard";
import AnimatedButton from "./AnimatedButton";
import MuscleGroupIcon from "./MuscleGroupIcon";
import styles, {
    ICON_COLOR,
    TEXT_SECONDARY,
} from "./selectExerciseModalStyles";
import useSyncSavedExercises from "../../../../hooks/useSyncSavedExercises";
import { toExerciseSlug } from "../../../common/exerciseImageMap";

const scaledSize = (size) => scaleSize(size);
const SCREEN_HEIGHT = Dimensions.get("window").height;

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
    { label: "Chest", value: "Chest", segments: ["chest"] },
    { label: "Shoulders", value: "Shoulders", segments: ["shoulders"] },
    { label: "Arms", value: "Arms", segments: ["arms", "forearms"] },
    { label: "Legs", value: "Legs", segments: ["quads", "calves"] },
    { label: "Abs", value: "Abs", segments: ["abs", "obliques"] },
    { label: "Back", value: "Back", segments: [] },
];

const EQUIPMENT_OPTIONS = [
    { label: "Any Equipment", value: null },
    { label: "Bodyweight", value: "Bodyweight" },
    { label: "Machine", value: "Machine" },
    { label: "Barbell", value: "Barbell" },
    { label: "Dumbbell", value: "Dumbbell" },
    { label: "Cable", value: "Cable" },
    { label: "Band", value: "Band" },
    { label: "Kettlebell", value: "Kettlebell" },
    { label: "Smith Machine", value: "Smith Machine" },
    { label: "Trap Bar", value: "Trap Bar" },
    { label: "Other", value: "Other" },
];

const normalizeEquipment = (raw) => {
    const s = String(raw || "").toLowerCase();
    if (s === "bodyweight" || s.includes("body weight")) return "Bodyweight";
    if (s.includes("smith machine")) return "Smith Machine";
    if (s.includes("machine")) return "Machine";
    if (s.includes("barbell")) return "Barbell";
    if (s.includes("dumbbell")) return "Dumbbell";
    if (s.includes("cable")) return "Cable";
    if (s.includes("band")) return "Band";
    if (s.includes("kettlebell")) return "Kettlebell";
    if (s.includes("trap bar")) return "Trap Bar";
    return "Other";
};

const EXERCISE_CATALOG = exercises.map((ex) => ({
    ...ex,
    nameLc: String(ex?.name || "").toLowerCase(),
    mgLc: String(ex?.muscleGroup || "").toLowerCase(),
    equipNorm: normalizeEquipment(ex?.equipment),
}));

const EXERCISE_LOOKUP_BY_NAME = EXERCISE_CATALOG.reduce((acc, ex) => {
    if (!ex?.name) return acc;
    acc[ex.name] = ex;
    return acc;
}, {});

const getSetCount = (statsMap = {}, name) => {
    const exerciseStats = statsMap?.[name];
    if (!exerciseStats) return 0;
    const sets = exerciseStats?.sets;
    if (Array.isArray(sets)) return sets.length;
    if (typeof sets === "number") return sets;
    const fallback = exerciseStats?.setCount ?? exerciseStats?.totalSets;
    return typeof fallback === "number" ? fallback : 0;
};

const STOP_WORDS = new Set(["press", "presses"]);

const singularizeToken = (token) => {
    if (!token) return token;
    if (token.endsWith("ies") && token.length > 3) return `${token.slice(0, -3)}y`;
    if (token.endsWith("ses") && token.length > 3) return token.slice(0, -2);
    if (token.endsWith("s") && !token.endsWith("ss") && token.length > 3) return token.slice(0, -1);
    return token;
};

const buildExerciseNameKeys = (name) => {
    const keys = [];
    const seen = new Set();
    const add = (value) => {
        if (!value) return;
        const key = value.trim();
        if (!key || seen.has(key)) return;
        seen.add(key);
        keys.push(key);
    };

    const trimmed = typeof name === "string" ? name.trim() : "";
    if (!trimmed) return { unique: "", keys: [] };

    const lower = trimmed.toLowerCase();
    add(lower);

    const noParens = lower.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
    add(noParens);

    const slug = toExerciseSlug(trimmed);
    add(slug);

    const sanitized = lower
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9\s]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    add(sanitized);

    const tokens = sanitized ? sanitized.split(" ").filter(Boolean) : [];
    if (tokens.length) {
        const joinedTokens = tokens.join(" ");
        add(joinedTokens);
        add(tokens.join("|"));
        add([...tokens].sort().join("|"));

        const singularTokens = tokens.map(singularizeToken);
        if (singularTokens.some((token, index) => token !== tokens[index])) {
            const singularJoined = singularTokens.join(" ");
            add(singularJoined);
            add(singularTokens.join("|"));
            add([...singularTokens].sort().join("|"));
        }

        const withoutStops = tokens.filter((token) => !STOP_WORDS.has(token));
        if (withoutStops.length) {
            const withoutStopsJoined = withoutStops.join(" ");
            add(withoutStopsJoined);
            add(withoutStops.join("|"));
            add([...withoutStops].sort().join("|"));

            const withoutStopsSingular = withoutStops.map(singularizeToken);
            if (withoutStopsSingular.some((token, index) => token !== withoutStops[index])) {
                const withoutStopsSingularJoined = withoutStopsSingular.join(" ");
                add(withoutStopsSingularJoined);
                add(withoutStopsSingular.join("|"));
                add([...withoutStopsSingular].sort().join("|"));
            }
        }
    }

    const unique = keys[0] || slug || sanitized || lower;
    return { unique, keys };
};

export default function SelectExerciseModal({ closeModal, appendExercises }) {
    const statsExercises = global?.userData?.statsExercises;
    const insets = useSafeAreaInsets();
    const insetTop = insets?.top ?? 0;
    const insetBottom = insets?.bottom ?? 0;
    const completedWorkouts = useMemo(
        () =>
            Array.isArray(global?.userData?.completedWorkouts)
                ? global.userData.completedWorkouts
                : [],
        [(global?.userData?.completedWorkouts || [])],
    );
    const exerciseWorkoutCounts = useMemo(() => {
        if (!completedWorkouts.length) return {};
        const counts = Object.create(null);
        completedWorkouts.forEach((workout) => {
            const exercises = Array.isArray(workout?.exercises) ? workout.exercises : [];
            if (!exercises.length) return;
            const seen = new Set();
            exercises.forEach((exercise) => {
                const { unique, keys } = buildExerciseNameKeys(exercise?.name);
                if (!unique || !keys.length || seen.has(unique)) return;
                seen.add(unique);
                keys.forEach((key) => {
                    counts[key] = (counts[key] || 0) + 1;
                });
            });
        });
        return counts;
    }, [completedWorkouts]);
    const resolveWorkoutCount = useCallback(
        (exerciseName) => {
            const { keys } = buildExerciseNameKeys(exerciseName);
            if (!keys.length) return 0;
            let best = 0;
            keys.forEach((key) => {
                const value = exerciseWorkoutCounts[key];
                if (typeof value === "number" && value > best) best = value;
            });
            return best;
        },
        [exerciseWorkoutCounts],
    );

    const [inputQuery, setInputQuery] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [bodyPartValue, setBodyPartValue] = useState(null);
    const [equipmentValue, setEquipmentValue] = useState(null);
    const [selectedExercisesMap, setSelectedExercisesMap] = useState({});
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

    const selectedExercisesRef = useRef(selectedExercisesMap);
    const opacity = useRef(new Animated.Value(0.5)).current;
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const finishingRef = useRef(false);
    const closingRef = useRef(false);
    const debounceRef = useRef(null);

    useEffect(() => {
        selectedExercisesRef.current = selectedExercisesMap;
    }, [selectedExercisesMap]);

    useSyncSavedExercises(savedExercisesMap);

    const selectedCount = useMemo(
        () => Object.keys(selectedExercisesMap).length,
        [selectedExercisesMap],
    );

    useEffect(() => {
        Animated.timing(opacity, {
            toValue: selectedCount === 0 ? 0.4 : 1,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [selectedCount, opacity]);

    useEffect(() => {
        Animated.timing(translateY, {
            toValue: 0,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [translateY]);

    const closeAllPanels = useCallback(() => {
        setFiltersOpen(false);
    }, []);

    const handleSearchIconPress = useCallback(() => {
        setShowSearch((prev) => !prev);
    }, []);

    const handleSearch = useCallback((query) => {
        setInputQuery(query);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setSearchQuery(query), 160);
    }, []);

    const resetSelections = useCallback(() => {
        selectedExercisesRef.current = {};
        setSelectedExercisesMap({});
    }, []);

    const selectExercise = useCallback((ex) => {
        setSelectedExercisesMap((prev) => {
            if (prev[ex.name]) return prev;
            return { ...prev, [ex.name]: { ...ex } };
        });
    }, []);

    const deselectExercise = useCallback((ex) => {
        setSelectedExercisesMap((prev) => {
            if (!prev[ex.name]) return prev;
            const updated = { ...prev };
            delete updated[ex.name];
            return updated;
        });
    }, []);

    const toggleSavedExercise = useCallback((ex) => {
        const name = ex?.name;
        if (!name) return;
        setSavedExercisesMap((prev) => {
            if (prev[name]) {
                const next = { ...prev };
                delete next[name];
                return next;
            }
            const muscle = ex?.muscle ?? ex?.muscleGroup ?? null;
            const fallback = EXERCISE_LOOKUP_BY_NAME[name] || {};
            return {
                ...prev,
                [name]: {
                    ...ex,
                    name,
                    muscle,
                    muscleGroup: ex?.muscleGroup ?? ex?.muscle ?? muscle,
                    slug: ex?.slug ?? fallback?.slug ?? null,
                },
            };
        });
    }, []);

    const dismiss = useCallback(
        (afterClose) => {
            if (closingRef.current) return;
            closingRef.current = true;
            closeAllPanels();
            setShowSearch(false);
            Animated.timing(translateY, {
                toValue: SCREEN_HEIGHT,
                duration: 240,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
            }).start(({ finished }) => {
                if (finished) {
                    try {
                        closeModal?.();
                    } finally {
                        afterClose?.();
                        closingRef.current = false;
                    }
                } else {
                    closingRef.current = false;
                }
            });
        },
        [closeAllPanels, closeModal, translateY],
    );

    const handleClose = useCallback(() => {
        resetSelections();
        dismiss();
    }, [dismiss, resetSelections]);

    const handleFinish = useCallback(() => {
        if (finishingRef.current || closingRef.current) return;
        const selections = Object.values(selectedExercisesRef.current || {});
        if (selections.length === 0) return;
        finishingRef.current = true;
        resetSelections();
        dismiss(() => {
            InteractionManager.runAfterInteractions(() => {
                try {
                    appendExercises?.(selections);
                } catch {
                    // ignored
                }
                finishingRef.current = false;
            });
        });
    }, [appendExercises, dismiss, resetSelections]);

    const bookmarkedExercises = useMemo(() => {
        const values = savedExercisesMap ? Object.values(savedExercisesMap) : [];
        if (!values.length) return [];

        return values
            .map((entry) => {
                if (!entry) return null;
                if (typeof entry === "string") {
                    const fallback = EXERCISE_LOOKUP_BY_NAME[entry] || {};
                    return {
                        ...fallback,
                        name: entry,
                        muscleGroup:
                            fallback?.muscleGroup ??
                            fallback?.muscle ??
                            "—",
                        muscle: fallback?.muscle ?? fallback?.muscleGroup ?? null,
                        slug: fallback?.slug ?? null,
                    };
                }

                const name = entry?.name;
                if (!name) return null;
                const fallback = EXERCISE_LOOKUP_BY_NAME[name] || {};
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
                    slug: entry?.slug ?? fallback?.slug ?? null,
                };
            })
            .filter(Boolean)
            .sort((a, b) => {
                const nameA = a.name || "";
                const nameB = b.name || "";
                return nameA.localeCompare(nameB);
            });
    }, [savedExercisesMap]);

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

    const hasBookmarks = bookmarkedExercises.length > 0;
    const hasFilteredBookmarks = bookmarkedRows.length > 0;

    const listHeaderComponent = useMemo(() => {
        return (
            <View style={styles.bookmarkedSection}>
                <Text style={styles.sectionTitle}>Bookmarked Exercises</Text>
                {hasFilteredBookmarks ? (
                    <View style={styles.bookmarkedGrid}>
                        {bookmarkedRows.map((row, rowIndex) => (
                            <View key={`bookmark-row-${rowIndex}`} style={styles.bookmarkedRow}>
                                {row.map((ex, index) => (
                                    <View key={`${ex?.name || "bookmark"}-${rowIndex}-${index}`} style={styles.bookmarkedCardWrapper}>
                                        <ExerciseCard
                                            name={ex.name}
                                            muscleGroup={ex.muscleGroup}
                                            slug={ex.slug}
                                            selectExercise={selectExercise}
                                            deselectExercise={deselectExercise}
                                            isSelected={Boolean(selectedExercisesMap?.[ex.name])}
                                            isSaved
                                            toggleSaved={toggleSavedExercise}
                                            style={styles.bookmarkedCard}
                                            workoutCount={resolveWorkoutCount(ex.name)}
                                        />
                                    </View>
                                ))}
                                {row.length < 3 &&
                                    Array.from({ length: 3 - row.length }).map((_, fillerIndex) => (
                                        <View
                                            key={`bookmark-spacer-${rowIndex}-${fillerIndex}`}
                                            style={styles.bookmarkedSpacer}
                                        />
                                    ))}
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={styles.bookmarkedEmpty}>
                        <Text style={styles.bookmarkedEmptyText}>
                            {hasBookmarks
                                ? "No bookmarked exercises match this focus."
                                : "No bookmarked exercises yet. Tap the bookmark icon to save favorites."}
                        </Text>
                    </View>
                )}
                <Text style={[styles.sectionTitle, styles.sectionTitleSpacer]}>All Exercises</Text>
            </View>
        );
    }, [
        bookmarkedRows,
        deselectExercise,
        selectExercise,
        selectedExercisesMap,
        toggleSavedExercise,
        hasBookmarks,
        hasFilteredBookmarks,
        resolveWorkoutCount,
    ]);

    const filteredExercises = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const bodyFilter = bodyPartValue?.toLowerCase() ?? null;
        const equipFilter = equipmentValue ?? null;
        const statsMap = statsExercises || {};

        let list = EXERCISE_CATALOG.filter((ex) => {
            const nameMatch = ex.nameLc.includes(q);
            const groupMatch = !bodyFilter || ex.mgLc === bodyFilter;
            const equipMatch = !equipFilter || ex.equipNorm === equipFilter;
            return nameMatch && groupMatch && equipMatch;
        });

        list.sort((a, b) => {
            const setsA = getSetCount(statsMap, a.name);
            const setsB = getSetCount(statsMap, b.name);
            if (setsA !== setsB) return setsB - setsA;
            return a.name.localeCompare(b.name);
        });

        return list;
    }, [searchQuery, bodyPartValue, equipmentValue, statsExercises]);

    const listBottomPadding = useMemo(
        () => insetBottom + scaledSize(160),
        [insetBottom],
    );

    return (
        <View style={styles.overlay}>
            <Animated.View
                style={[
                    styles.wrapper,
                    {
                        transform: [{ translateY }],
                    },
                ]}
            >
                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            paddingTop: insetTop + scaledSize(12),
                        },
                    ]}
                >
                    <View style={styles.sheetInner}>
                        <View style={styles.headerRow}>
                            <Pressable
                                style={styles.circleButton}
                                onPress={handleClose}
                                hitSlop={10}
                            >
                                <Ionicons
                                    name="close"
                                    size={scaledSize(20)}
                                    color={ICON_COLOR}
                                />
                            </Pressable>
                            <Text style={styles.headerTitle}>Add exercises</Text>
                            <View style={styles.headerActions}>
                                <Pressable
                                    style={[styles.circleButton, styles.headerActionButton]}
                                    onPress={handleSearchIconPress}
                                    hitSlop={10}
                                >
                                    <Ionicons
                                        name="search"
                                        size={scaledSize(20)}
                                        color={ICON_COLOR}
                                    />
                                </Pressable>
                                {/* <Pressable
                  style={[styles.circleButton, styles.headerActionButton]}
                  onPress={() => setFiltersOpen((prev) => !prev)}
                  hitSlop={10}
                >
                  <Ionicons
                    name="filter"
                    size={scaledSize(20)}
                    color={ICON_COLOR}
                  />
                </Pressable>
                <Pressable
                  style={[styles.circleButton, styles.headerActionButton]}
                  hitSlop={10}
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={scaledSize(20)}
                    color={ICON_COLOR}
                  />
                </Pressable> */}
                            </View>
                        </View>

                        {showSearch && (
                            <View style={styles.searchContainer}>
                                <Ionicons
                                    name="search"
                                    size={scaledSize(18)}
                                    color={ICON_COLOR}
                                    style={styles.searchIcon}
                                />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search exercises..."
                                    placeholderTextColor={TEXT_SECONDARY}
                                    value={inputQuery}
                                    onChangeText={handleSearch}
                                    autoFocus
                                />
                            </View>
                        )}

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
                                                    index === MUSCLE_FILTERS.length - 1 &&
                                                    styles.muscleFilterChipLast,
                                                ]}
                                                onPress={() =>
                                                    setBodyPartValue(isActive ? null : option.value)
                                                }
                                                accessibilityRole="button"
                                                accessibilityLabel={option.label}
                                            >
                                                <View
                                                    style={[
                                                        styles.muscleFilterIconWrap,
                                                        isActive && styles.muscleFilterIconWrapActive,
                                                    ]}
                                                >
                                                    <MuscleGroupIcon
                                                        segments={option.segments}
                                                        dimmed={!isActive}
                                                    />
                                                </View>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </ScrollView>
                        </View>

                        {filtersOpen && (
                            <View style={styles.filterPanel}>
                                <Text style={styles.filterPanelTitle}>Equipment</Text>
                                <View style={styles.filterChipWrap}>
                                    {EQUIPMENT_OPTIONS.map((option) => {
                                        const isActive = option.value === equipmentValue;
                                        return (
                                            <Pressable
                                                key={option.label}
                                                style={[
                                                    styles.equipmentChip,
                                                    isActive && styles.equipmentChipActive,
                                                ]}
                                                onPress={() => setEquipmentValue(option.value)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.equipmentChipText,
                                                        isActive && styles.equipmentChipTextActive,
                                                    ]}
                                                >
                                                    {option.label}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        <View style={styles.listWrapper}>
                            <ExercisesFlatlist
                                exercises={filteredExercises}
                                selectExercise={selectExercise}
                                deselectExercise={deselectExercise}
                                toggleSavedExercise={toggleSavedExercise}
                                selectedLookup={selectedExercisesMap}
                                savedLookup={savedExercisesMap}
                                bottomPadding={listBottomPadding}
                                listHeaderComponent={listHeaderComponent}
                                getWorkoutCount={resolveWorkoutCount}
                            />
                        </View>

                        <View
                            style={[
                                styles.footer,
                                { paddingBottom: insetBottom + scaledSize(4) },
                            ]}
                        >
                            <AnimatedButton
                                opacity={opacity}
                                selectedExercisesLength={selectedCount}
                                handleFinish={handleFinish}
                            />
                        </View>
                    </View>
                </Animated.View>
            </Animated.View>
        </View>
    );
}
