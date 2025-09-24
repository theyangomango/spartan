import React, { useState, useEffect, useRef, useMemo } from "react";
import { View, Text, Pressable, TextInput, Animated, InteractionManager } from "react-native";
import scaleSize from "../../../../helper/scaleSize";
import { Ionicons } from '@expo/vector-icons';
import RNBounceable from "@freakycoder/react-native-bounceable";
import { exercises } from './EXERCISES';
import ExercisesFlatlist from './ExercisesFlatlist';
import AnimatedButton from './AnimatedButton';
import styles, { ICON_COLOR, TEXT_SECONDARY } from "../../../SelectExerciseModal/styles";
const scaledSize = (size) => scaleSize(size);

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

export default function SelectExerciseModal({ closeModal, appendExercises }) {
    const selectedExercisesRef = useRef([]);
    // input text vs debounced value used for filtering
    const [inputQuery, setInputQuery] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const opacity = useRef(new Animated.Value(1)).current;

    // Dropdown states
    const [bodyPartOpen, setBodyPartOpen] = useState(false);
    const [equipmentOpen, setEquipmentOpen] = useState(false);
    const [bodyPartValue, setBodyPartValue] = useState(null);       // null = Any Body Part
    const [equipmentValue, setEquipmentValue] = useState(null);     // null = Any Equipment

    useEffect(() => {
        Animated.timing(opacity, {
            toValue: selectedExercisesRef.current.length === 0 ? 0.5 : 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [searchQuery]);

    function selectExercise(ex) {
        selectedExercisesRef.current = [...selectedExercisesRef.current, { ...ex }];
        triggerOpacityUpdate();
    }

    function deselectExercise(ex) {
        selectedExercisesRef.current = selectedExercisesRef.current.filter(e => e.name !== ex.name);
        triggerOpacityUpdate();
    }

    const finishingRef = useRef(false);
    function handleFinish() {
        if (finishingRef.current) return;
        if (selectedExercisesRef.current.length === 0) return;
        finishingRef.current = true;
        // Close dropdowns and modal first to avoid UI lock while appending
        closeAllDropdowns();
        try { closeModal?.(); } catch {}
        // Defer heavy append to after interactions for smoother closing
        InteractionManager.runAfterInteractions(() => {
            try { appendExercises?.(selectedExercisesRef.current); } catch {}
            finishingRef.current = false;
            // reset local buffer
            selectedExercisesRef.current = [];
        });
    }

    // Debounce search input for smoother typing
    const debounceRef = useRef(null);
    function handleSearch(query) {
        setInputQuery(query);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setSearchQuery(query), 160);
    }

    function triggerOpacityUpdate() {
        opacity.setValue(selectedExercisesRef.current.length === 0 ? 0.5 : 1);
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

    // ---- FILTER + SORT
    const filteredExercises = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const bodyFilter = bodyPartValue?.toLowerCase() ?? null;
        const equipFilter = equipmentValue ?? null; // already normalized label

        let list = indexedExercises.filter(ex => {
            const nameMatch = ex.nameLc.includes(q);
            const groupMatch = !bodyFilter || ex.mgLc === bodyFilter;
            const equipMatch = !equipFilter || ex.equipNorm === equipFilter;
            return nameMatch && groupMatch && equipMatch;
        });

        // Sort: primarily by muscle group when no body-part filter, then name A→Z
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
    const equipmentButtonLabel = EQUIPMENT_OPTIONS.find(o => o.value === equipmentValue)?.label ?? "Any Equipment";

    const closeAllDropdowns = () => {
        setBodyPartOpen(false);
        setEquipmentOpen(false);
    };

    return (
        <View style={styles.modal_outside}>
            <Pressable onPress={() => closeModal()} style={styles.outside_pressable} />
            <View style={styles.main_ctnr}>
                <View style={styles.header}>
                    <RNBounceable style={styles.newButton}>
                        <Text style={styles.newButtonText}>New</Text>
                    </RNBounceable>
                    <AnimatedButton
                        opacity={opacity}
                        selectedExercisesLength={selectedExercisesRef.current.length}
                        handleFinish={handleFinish}
                    />
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
                            onPress={() => {
                                setEquipmentOpen(false);
                                setBodyPartOpen((o) => !o);
                            }}
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
                                        onPress={() => {
                                            setBodyPartValue(opt.value);
                                            setBodyPartOpen(false);
                                        }}
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
                            onPress={() => {
                                setBodyPartOpen(false);
                                setEquipmentOpen((o) => !o);
                            }}
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
                                        onPress={() => {
                                            setEquipmentValue(opt.value);
                                            setEquipmentOpen(false);
                                        }}
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
                    <Pressable style={styles.dropdownBackdrop} onPress={closeAllDropdowns} />
                )}

                {/* List */}
                <ExercisesFlatlist
                    exercises={filteredExercises}
                    selectExercise={selectExercise}
                    deselectExercise={deselectExercise}
                />
            </View>
            <Pressable onPress={() => closeModal()} style={styles.outside_pressable} />
        </View>
    );
}
