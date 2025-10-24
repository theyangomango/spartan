import React, { useState, useRef, memo, useMemo, useEffect, useCallback } from "react";
import { View, Text, Pressable, TextInput, Animated, Easing, Dimensions } from "react-native";
import scaleSize from "../../../helper/scaleSize";
import { withStrongPress, strong as hapticStrong } from "../../../utils/haptics";
import { Ionicons } from '@expo/vector-icons';
// Reuse the Workout selectors + list for consistent style/UX
import ExercisesFlatlist from "../../3_Workout/NewWorkout/SelectExercise/ExercisesFlatlist";
import { exercises } from "../../3_Workout/NewWorkout/SelectExercise/EXERCISES";
import styles, { ICON_COLOR, TEXT_SECONDARY } from "../../SelectExerciseModal/styles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
const scaledSize = (size) => scaleSize(size);
const SCREEN_HEIGHT = Dimensions.get("window").height;

// Body-part options and an order map to "sort accordingly"
const BODY_PART_OPTIONS = [
    { label: "Any Body Part", value: null },
    { label: "Chest", value: "Chest" },
    { label: "Back", value: "Back" },
    { label: "Shoulders", value: "Shoulders" },
    { label: "Arms", value: "Arms" },
    { label: "Legs", value: "Legs" },
    { label: "Abs", value: "Abs" },
];
const GROUP_ORDER = {
    Chest: 0,
    Back: 1,
    Shoulders: 2,
    Arms: 3,
    Legs: 4,
    Abs: 5,
    "Full Body": 6,
    default: 7,
};

// Equipment options (bucketed to common categories)
const EQUIPMENT_OPTIONS = [
    { label: "All Equipment", value: null },
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

// Normalize raw equipment strings in EXERCISES to one of the buckets above
const normalizeEquipment = (raw) => {
    const s = String(raw || '').toLowerCase();
    if (s === 'bodyweight' || s.includes('body weight')) return 'Bodyweight';
    if (s.includes('smith machine')) return 'Smith Machine';
    if (s.includes('machine')) return 'Machine';
    if (s.includes('barbell')) return 'Barbell';
    if (s.includes('dumbbell')) return 'Dumbbell';
    if (s.includes('cable')) return 'Cable';
    if (s.includes('band')) return 'Band';
    if (s.includes('kettlebell')) return 'Kettlebell';
    if (s.includes('trap bar')) return 'Trap Bar';
    return 'Other';
};

const SelectExerciseModal = memo(({ closeModal, setComparedExercise }) => {
    const [inputQuery, setInputQuery] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Dropdown states
    const [bodyPartOpen, setBodyPartOpen] = useState(false);
    const [equipmentOpen, setEquipmentOpen] = useState(false);
    const [bodyPartValue, setBodyPartValue] = useState(null);       // null = Any Body Part
    const [equipmentValue, setEquipmentValue] = useState(null);     // null = All Equipment

    const insets = useSafeAreaInsets();
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const closingRef = useRef(false);

    const animateIn = useCallback(() => {
        Animated.parallel([
            Animated.timing(backdropOpacity, {
                toValue: 1,
                duration: 200,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 320,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, [backdropOpacity, translateY]);

    useEffect(() => {
        animateIn();
    }, [animateIn]);

    const closeAllDropdowns = useCallback(() => {
        setBodyPartOpen(false);
        setEquipmentOpen(false);
    }, []);

    const dismiss = useCallback(() => {
        if (closingRef.current) return;
        closingRef.current = true;
        closeAllDropdowns();
        Animated.parallel([
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 180,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: SCREEN_HEIGHT,
                duration: 260,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start(({ finished }) => {
            closingRef.current = false;
            if (finished) {
                try { closeModal?.(); } catch { /* no-op */ }
            } else {
                closeModal?.();
            }
        });
    }, [backdropOpacity, closeModal, closeAllDropdowns, translateY]);

    // Single-select: immediate pick on press
    const selectExercise = useCallback((ex) => {
        try { hapticStrong(); } catch {}
        try { setComparedExercise?.(ex?.name || ''); } catch {}
        dismiss();
    }, [dismiss, setComparedExercise]);

    const deselectExercise = () => {
        try { hapticStrong(); } catch {}
    };

    // Debounce search input
    const debounceRef = useRef(null);
    function handleSearch(query) {
        setInputQuery(query);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setSearchQuery(query), 160);
    }

    // Build a normalized index once for fast filtering
    const indexedExercises = useMemo(() => {
        return exercises.map((ex) => ({
            ...ex,
            nameLc: String(ex?.name || '').toLowerCase(),
            mgLc: String(ex?.muscleGroup || '').toLowerCase(),
            equipNorm: normalizeEquipment(ex?.equipment),
        }));
    }, []);

    // FILTER + SORT
    const filteredExercises = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const bodyFilter = bodyPartValue?.toLowerCase() ?? null;
        const equipFilter = equipmentValue ?? null; // normalized label

        let list = indexedExercises.filter(ex => {
            const nameMatch = ex.nameLc.includes(q);
            const groupMatch = !bodyFilter || ex.mgLc === bodyFilter;
            const equipMatch = !equipFilter || ex.equipNorm === equipFilter;
            return nameMatch && groupMatch && equipMatch;
        });

        if (!bodyFilter) {
            list.sort((a, b) => {
                const ga = GROUP_ORDER[a.muscleGroup] ?? GROUP_ORDER.default;
                const gb = GROUP_ORDER[b.muscleGroup] ?? GROUP_ORDER.default;
                if (ga !== gb) return ga - gb;
                return a.name.localeCompare(b.name);
            });
        } else {
            list.sort((a, b) => a.name.localeCompare(b.name));
        }
        return list;
    }, [searchQuery, bodyPartValue, equipmentValue, indexedExercises]);

    const bodyPartButtonLabel = BODY_PART_OPTIONS.find(o => o.value === bodyPartValue)?.label ?? "Any Body Part";
    const equipmentButtonLabel = EQUIPMENT_OPTIONS.find(o => o.value === equipmentValue)?.label ?? "All Equipment";

    return (
        <View style={styles.modal_outside}>
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
            <Pressable onPress={withStrongPress(dismiss)} style={styles.outside_pressable} />
            <Animated.View
                style={[
                    styles.main_ctnr,
                    {
                        paddingTop: insets.top + scaledSize(12),
                        paddingBottom: insets.bottom + scaledSize(12),
                        transform: [{ translateY }],
                    },
                ]}
            >
                <View style={styles.header}>
                    <Pressable
                        style={styles.closeButton}
                        onPress={withStrongPress(dismiss)}
                        hitSlop={10}
                    >
                        <Ionicons name="close" size={scaledSize(20)} color={ICON_COLOR} />
                    </Pressable>
                    <Text style={styles.headerTitle}>Select exercise</Text>
                    <View style={styles.headerSpacer} />
                </View>

                {/* Search */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={scaledSize(20)} color={ICON_COLOR} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search exercises..."
                        placeholderTextColor={TEXT_SECONDARY}
                        value={inputQuery}
                        onChangeText={handleSearch}
                        onFocus={closeAllDropdowns}
                    />
                </View>

                {/* Filters (Dropdowns) */}
                <View style={styles.filterRow}>
                    {/* Body Part Dropdown */}
                    <View style={styles.dropdownWrap}>
                        <Pressable
                            style={styles.filterButton}
                            onPress={withStrongPress(() => {
                                setEquipmentOpen(false);
                                setBodyPartOpen((o) => !o);
                            })}
                        >
                            <Text style={styles.filterButtonText} numberOfLines={1}>{bodyPartButtonLabel}</Text>
                            <Ionicons name={bodyPartOpen ? "chevron-up" : "chevron-down"} size={scaledSize(16)} color={ICON_COLOR} />
                        </Pressable>

                        {bodyPartOpen && (
                            <View style={styles.dropdownMenu}>
                                {BODY_PART_OPTIONS.map(opt => (
                                    <Pressable
                                        key={String(opt.label)}
                                        style={[styles.dropdownItem, bodyPartValue === opt.value && styles.dropdownItemActive]}
                                        onPress={withStrongPress(() => {
                                            setBodyPartValue(opt.value);
                                            setBodyPartOpen(false);
                                        })}
                                    >
                                        <Text
                                            style={[
                                                styles.dropdownItemText,
                                                bodyPartValue === opt.value && styles.dropdownItemTextActive
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {opt.label}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Equipment Dropdown */}
                    <View style={styles.dropdownWrap}>
                        <Pressable
                            style={styles.filterButton}
                            onPress={withStrongPress(() => {
                                setBodyPartOpen(false);
                                setEquipmentOpen((o) => !o);
                            })}
                        >
                            <Text style={styles.filterButtonText} numberOfLines={1}>{equipmentButtonLabel}</Text>
                            <Ionicons name={equipmentOpen ? "chevron-up" : "chevron-down"} size={scaledSize(16)} color={ICON_COLOR} />
                        </Pressable>

                        {equipmentOpen && (
                            <View style={styles.dropdownMenu}>
                                {EQUIPMENT_OPTIONS.map(opt => (
                                    <Pressable
                                        key={String(opt.label)}
                                        style={[styles.dropdownItem, equipmentValue === opt.value && styles.dropdownItemActive]}
                                        onPress={withStrongPress(() => {
                                            setEquipmentValue(opt.value);
                                            setEquipmentOpen(false);
                                        })}
                                    >
                                        <Text
                                            style={[
                                                styles.dropdownItemText,
                                                equipmentValue === opt.value && styles.dropdownItemTextActive
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {opt.label}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        )}
                    </View>
                </View>

                {/* Backdrop to close dropdowns without closing modal */}
                {(bodyPartOpen || equipmentOpen) && (
                    <Pressable style={styles.dropdownBackdrop} onPress={withStrongPress(closeAllDropdowns)} />
                )}

                {/* List */}
                <ExercisesFlatlist
                    exercises={filteredExercises}
                    selectExercise={selectExercise}
                    deselectExercise={deselectExercise}
                    animatedPress
                />
            </Animated.View>
        </View>
    );
});

export default SelectExerciseModal;
