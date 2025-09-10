import React, { useState, useEffect, useRef, memo, useMemo } from "react";
import { StyleSheet, View, Text, Pressable, TextInput, Animated, Dimensions } from "react-native";
import { Ionicons } from '@expo/vector-icons';
// Reuse the Workout selectors + list for consistent style/UX
import ExercisesFlatlist from "../../3_Workout/NewWorkout/SelectExercise/ExercisesFlatlist";
import { exercises } from "../../3_Workout/NewWorkout/SelectExercise/EXERCISES";

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // Scaling factor based on iPhone 13 height
const scaledSize = (size) => Math.round(size * scale);

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

    // Single-select: immediate pick on press
    function selectExercise(ex) {
        try { setComparedExercise?.(ex?.name || ''); } catch {}
        try { closeAllDropdowns(); } catch {}
        try { closeModal?.(); } catch {}
    }
    const deselectExercise = () => {};

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

    const closeAllDropdowns = () => {
        setBodyPartOpen(false);
        setEquipmentOpen(false);
    };

    return (
        <View style={styles.modal_outside}>
            <Pressable onPress={() => closeModal()} style={styles.outside_pressable} />
            <View style={styles.main_ctnr}>
                {/* No header actions in Competition picker */}
                <View style={styles.header} />

                {/* Search */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={scaledSize(20)} color="#BBC4D2" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search exercises..."
                        placeholderTextColor="#BBC4D2"
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
                            <Ionicons name={bodyPartOpen ? "chevron-up" : "chevron-down"} size={scaledSize(16)} color="#EAF0F7" />
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
                            <Ionicons name={equipmentOpen ? "chevron-up" : "chevron-down"} size={scaledSize(16)} color="#EAF0F7" />
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
                    animatedPress
                />
            </View>
            <Pressable onPress={() => closeModal()} style={styles.outside_pressable} />
        </View>
    );
});

export default SelectExerciseModal;

const styles = StyleSheet.create({
    modal_outside: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        // Dimming backdrop for stronger contrast with the modal
        // Align with the workout picker overlay for consistency
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    outside_pressable: {
        flex: 1,
        width: '100%',
    },
    main_ctnr: {
        width: '94%',
        height: '81%',
        backgroundColor: require("../../../theme/mfpDark").default.card, // slightly lighter than surface
        borderRadius: scaledSize(20),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaledSize(6) },
        shadowOpacity: 0.06,
        shadowRadius: scaledSize(12),
        paddingTop: scaledSize(10),
        overflow: 'visible',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: scaledSize(15),
        paddingTop: scaledSize(10),
        paddingBottom: scaledSize(10),
    },
    newButton: {
        backgroundColor: '#e0e0e0',
        paddingHorizontal: scaledSize(20),
        paddingVertical: scaledSize(4.5),
        borderRadius: scaledSize(8),
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.5,
    },
    newButtonText: {
        color: '#333',
        fontFamily: 'Outfit_700Bold',
        fontSize: scaledSize(14),
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: require("../../../theme/mfpDark").default.surface, // lighten input background
        borderRadius: scaledSize(8),
        marginHorizontal: scaledSize(15),
        paddingHorizontal: scaledSize(8),
        marginBottom: scaledSize(10),
        alignSelf: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: require("../../../theme/mfpDark").default.hairline,
    },
    searchIcon: { marginRight: scaledSize(8) },
    searchInput: {
        flex: 1,
        padding: scaledSize(8),
        fontSize: scaledSize(14),
        color: '#EAEAEA',
        fontFamily: 'Outfit_700Bold',
    },
    filterRow: {
        flexDirection: 'row',
        gap: scaledSize(8),
        paddingHorizontal: scaledSize(16),
        marginBottom: scaledSize(6),
        zIndex: 2,
    },
    dropdownWrap: { flex: 1, position: 'relative' },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: scaledSize(6),
        paddingHorizontal: scaledSize(12),
        borderRadius: scaledSize(10),
        backgroundColor: require("../../../theme/mfpDark").default.surface, // lighten filter button
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: require("../../../theme/mfpDark").default.hairline,
    },
    filterButtonText: {
        fontSize: scaledSize(13),
        color: '#EAEAEA',
        fontFamily: 'Outfit_700Bold',
        flexShrink: 1,
        marginRight: scaledSize(6),
    },
    dropdownMenu: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: require("../../../theme/mfpDark").default.card, // slightly lighter menu
        borderRadius: scaledSize(10),
        marginTop: scaledSize(6),
        paddingVertical: scaledSize(4),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaledSize(4) },
        shadowOpacity: 0.08,
        shadowRadius: scaledSize(10),
        elevation: 6,
        zIndex: 3,
        maxHeight: scaledSize(220),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: require("../../../theme/mfpDark").default.hairline,
    },
    dropdownItem: { paddingVertical: scaledSize(8), paddingHorizontal: scaledSize(10) },
    dropdownItemActive: { backgroundColor: require("../../../theme/mfpDark").default.surface },
    dropdownItemText: { fontSize: scaledSize(13), color: '#EAEAEA', fontFamily: 'Outfit_700Bold' },
    dropdownItemTextActive: { color: '#6FB8FF' },
    dropdownBackdrop: {
        position: 'absolute',
        top: scaledSize(140),
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
    },
});
