import React, { useState, useEffect, useRef, memo, useMemo } from "react";
import { StyleSheet, View, Text, Pressable, TextInput, Animated, Dimensions } from "react-native";
import scaleSize from "../../../helper/scaleSize";
import { withStrongPress, strong as hapticStrong } from "../../../utils/haptics";
const theme = require("../../../theme/mfpDark").default;
const OVERLAY_BG = 'rgba(8, 12, 24, 0.78)';
const MODAL_BG = '#111828ff';
const LIGHT_SURFACE = '#1F2A42';
const LIGHT_FIELD = '#233552';
const FIELD_BORDER = 'rgba(120, 198, 255, 0.24)';
const ICON_COLOR = '#D2DCF0';
const TEXT_PRIMARY = '#F6F8FF';
const TEXT_SECONDARY = '#8FA3C2';
const ACCENT = theme.primary;
const ACCENT_SOFT = 'rgba(102, 202, 255, 0.24)';
import { Ionicons } from '@expo/vector-icons';
// Reuse the Workout selectors + list for consistent style/UX
import ExercisesFlatlist from "../../3_Workout/NewWorkout/SelectExercise/ExercisesFlatlist";
import { exercises } from "../../3_Workout/NewWorkout/SelectExercise/EXERCISES";

const { height: screenHeight } = Dimensions.get('window');
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
        try { hapticStrong(); } catch {}
        try { setComparedExercise?.(ex?.name || ''); } catch {}
        try { closeAllDropdowns(); } catch {}
        try { closeModal?.(); } catch {}
    }
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

    const closeAllDropdowns = () => {
        setBodyPartOpen(false);
        setEquipmentOpen(false);
    };

    return (
        <View style={styles.modal_outside}>
            <Pressable onPress={withStrongPress(() => closeModal?.())} style={styles.outside_pressable} />
            <View style={styles.main_ctnr}>
                {/* No header actions in Competition picker */}
                <View style={styles.header} />

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
            </View>
            <Pressable onPress={withStrongPress(() => closeModal?.())} style={styles.outside_pressable} />
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
        backgroundColor: OVERLAY_BG,
    },
    outside_pressable: {
        flex: 1,
        width: '100%',
    },
    main_ctnr: {
        width: '94%',
        height: '81%',
        backgroundColor: MODAL_BG,
        borderRadius: scaleSize(scaledSize(20)),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaleSize(scaledSize(6)) },
        shadowOpacity: 0.06,
        shadowRadius: scaleSize(scaledSize(12)),
        paddingTop: scaleSize(scaledSize(10)),
        overflow: 'visible',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: scaleSize(scaledSize(15)),
        paddingTop: scaleSize(scaledSize(10)),
        paddingBottom: scaleSize(scaledSize(10)),
    },
    newButton: {
        backgroundColor: '#e0e0e0',
        paddingHorizontal: scaleSize(scaledSize(20)),
        paddingVertical: scaleSize(scaledSize(4.5)),
        borderRadius: scaleSize(scaledSize(8)),
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.5,
    },
    newButtonText: {
        color: '#333',
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(14),
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: LIGHT_FIELD,
        borderRadius: scaleSize(scaledSize(8)),
        marginHorizontal: scaleSize(scaledSize(15)),
        paddingHorizontal: scaleSize(scaledSize(8)),
        marginBottom: scaleSize(scaledSize(10)),
        alignSelf: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: FIELD_BORDER,
    },
    searchIcon: { marginRight: scaleSize(scaledSize(8)) },
    searchInput: {
        flex: 1,
        padding: scaleSize(scaledSize(8)),
        fontSize: scaleSize(14),
        color: TEXT_PRIMARY,
        fontFamily: 'Outfit_700Bold',
    },
    filterRow: {
        flexDirection: 'row',
        gap: scaleSize(scaledSize(8)),
        paddingHorizontal: scaleSize(scaledSize(16)),
        marginBottom: scaleSize(scaledSize(6)),
        zIndex: 2,
    },
    dropdownWrap: { flex: 1, position: 'relative' },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: scaleSize(scaledSize(6)),
        paddingHorizontal: scaleSize(scaledSize(12)),
        borderRadius: scaleSize(scaledSize(10)),
        backgroundColor: LIGHT_FIELD,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: FIELD_BORDER,
    },
    filterButtonText: {
        fontSize: scaleSize(13),
        color: TEXT_PRIMARY,
        fontFamily: 'Outfit_700Bold',
        flexShrink: 1,
        marginRight: scaleSize(scaledSize(6)),
    },
    dropdownMenu: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: LIGHT_SURFACE,
        borderRadius: scaleSize(scaledSize(10)),
        marginTop: scaleSize(scaledSize(6)),
        paddingVertical: scaleSize(scaledSize(4)),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaleSize(scaledSize(4)) },
        shadowOpacity: 0.08,
        shadowRadius: scaleSize(scaledSize(10)),
        elevation: 6,
        zIndex: 3,
        maxHeight: scaleSize(scaledSize(220)),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: FIELD_BORDER,
    },
    dropdownItem: { paddingVertical: scaleSize(scaledSize(8)), paddingHorizontal: scaleSize(scaledSize(10)) },
    dropdownItemActive: { backgroundColor: ACCENT_SOFT },
    dropdownItemText: { fontSize: scaleSize(13), color: TEXT_PRIMARY, fontFamily: 'Outfit_700Bold' },
    dropdownItemTextActive: { color: ACCENT },
    dropdownBackdrop: {
        position: 'absolute',
        top: scaleSize(scaledSize(140)),
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
    },
});
