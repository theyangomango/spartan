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
import DismissableTextInput from "../../../common/DismissableTextInput";

const scaledSize = (size) => scaleSize(size);
const SCREEN_HEIGHT = Dimensions.get("window").height;
const MUSCLE_HIGHLIGHT = "#ff6f67ff";
const MUSCLE_HIGHLIGHT_DIM = "rgba(255, 127, 120, 0.6)";
// Apply scaling at SVG render-time to keep icons crisp.
const MUSCLE_ICON_SCALES = {
    shoulders: 2.6,
    chest: 2.8,
    arms: 1.8,
    back: 2.2,
    abs: 3,
    legs: 2.4,
    overall: 1.6,
};
const MUSCLE_ICON_OFFSETS = {
    shoulders: scaledSize(70),
    chest: scaledSize(80),
    arms: scaledSize(25),
    back: scaledSize(50),
    abs: scaledSize(40),
    legs: scaledSize(-20),
    overall: scaledSize(10),
};
const MUSCLE_ICON_STROKES = {
    back: 14,
};
const MUSCLE_FILTER_ORDER = ["overall", "chest", "shoulders", "arms", "back", "legs", "abs"];

const MUSCLE_FILTERS = [
    {
        label: "Full Body",
        value: null,
        segments: [
            "calves",
            "quads",
            "abs",
            "obliques",
            "back",
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
    { label: "Back", value: "Back", segments: ["back", "traps"] },
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


export default function SelectExerciseModal({ closeModal, appendExercises }) {
    const statsExercises = global?.userData?.statsExercises;
    const insets = useSafeAreaInsets();
    const insetTop = insets?.top ?? 0;
    const insetBottom = insets?.bottom ?? 0;

    const [inputQuery, setInputQuery] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
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
                            <Text style={styles.headerTitle}>Add Exercises</Text>
                            <View style={styles.headerActions} />
                        </View>

                        <View style={styles.searchContainer}>
                            <DismissableTextInput
                                style={styles.searchInput}
                                placeholder="Search exercises..."
                                placeholderTextColor={TEXT_SECONDARY}
                                value={inputQuery}
                                onChangeText={handleSearch}
                                autoCorrect={false}
                                autoCapitalize="none"
                                returnKeyType="search"
                                enableAccessory
                            />
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
                                    {MUSCLE_FILTERS.slice()
                                        .sort((a, b) => {
                                            const aKey = (a.value || "").toString().toLowerCase();
                                            const bKey = (b.value || "").toString().toLowerCase();
                                            const aIdx = MUSCLE_FILTER_ORDER.indexOf(aKey === "" ? "overall" : aKey);
                                            const bIdx = MUSCLE_FILTER_ORDER.indexOf(bKey === "" ? "overall" : bKey);
                                            const aPos = aIdx === -1 ? Number.MAX_SAFE_INTEGER : aIdx;
                                            const bPos = bIdx === -1 ? Number.MAX_SAFE_INTEGER : bIdx;
                                            return aPos - bPos;
                                        })
                                        .map((option, index) => {
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
                                                    <View
                                                        style={[
                                                            styles.muscleFilterIconInner,
                                                            styles.muscleFilterIconZoom,
                                                            MUSCLE_ICON_OFFSETS[
                                                                (option.value || "overall").toString().toLowerCase()
                                                            ]
                                                                ? {
                                                                    marginTop:
                                                                        MUSCLE_ICON_OFFSETS[
                                                                            (option.value || "overall").toString().toLowerCase()
                                                                        ],
                                                                }
                                                                : null,
                                                        ]}
                                                    >
                                                        <MuscleGroupIcon
                                                            segments={option.segments}
                                                            dimmed={!isActive}
                                                            highlightColor={MUSCLE_HIGHLIGHT}
                                                            dimHighlightColor={MUSCLE_HIGHLIGHT_DIM}
                                                            strokeWidth={
                                                                MUSCLE_ICON_STROKES[
                                                                    (option.value || "").toString().toLowerCase()
                                                                ] || undefined
                                                            }
                                                            scale={
                                                                MUSCLE_ICON_SCALES[
                                                                    (option.value || "overall").toString().toLowerCase()
                                                                ] || 1
                                                            }
                                                        />
                                                    </View>
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
