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
import AnimatedButton from "./AnimatedButton";
import MuscleGroupIcon from "./MuscleGroupIcon";
import styles, {
  ICON_COLOR,
  TEXT_SECONDARY,
} from "./selectExerciseModalStyles";

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

  useEffect(() => {
    try {
      if (global?.userData) {
        global.userData.savedExercises = savedExercisesMap;
      }
    } catch {
      // ignored
    }
  }, [savedExercisesMap]);

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
      return {
        ...prev,
        [name]: {
          ...ex,
          name,
          muscle,
          muscleGroup: ex?.muscleGroup ?? ex?.muscle ?? muscle,
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

  const indexedExercises = useMemo(() => {
    return exercises.map((ex) => ({
      ...ex,
      nameLc: String(ex?.name || "").toLowerCase(),
      mgLc: String(ex?.muscleGroup || "").toLowerCase(),
      equipNorm: normalizeEquipment(ex?.equipment),
    }));
  }, []);

  const filteredExercises = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const bodyFilter = bodyPartValue?.toLowerCase() ?? null;
    const equipFilter = equipmentValue ?? null;
    const statsMap = statsExercises || {};

    let list = indexedExercises.filter((ex) => {
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
  }, [
    searchQuery,
    bodyPartValue,
    equipmentValue,
    indexedExercises,
    statsExercises,
  ]);

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

            <Text style={styles.sectionTitle}>All Exercises</Text>

            <View style={styles.listWrapper}>
              <ExercisesFlatlist
                exercises={filteredExercises}
                selectExercise={selectExercise}
                deselectExercise={deselectExercise}
                toggleSavedExercise={toggleSavedExercise}
                selectedLookup={selectedExercisesMap}
                savedLookup={savedExercisesMap}
                bottomPadding={listBottomPadding}
              />
            </View>

            <View
              style={[
                styles.footer,
                { paddingBottom: insetBottom + scaledSize(16) },
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
