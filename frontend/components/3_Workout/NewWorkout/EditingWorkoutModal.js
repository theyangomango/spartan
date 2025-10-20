import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Keyboard,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import RNBounceable from "@freakycoder/react-native-bounceable";

import theme from "../../../theme/mfpDark";
import scaleSize from "../../../helper/scaleSize";
import { StatKeyboardProvider } from "./Tracking/StatKeyboardContext";
import ExerciseLog from "./Tracking/ExerciseLog";
import useWorkoutEditing from "./hooks/useWorkoutEditing";
import SelectExerciseModal from "./SelectExercise/SelectExerciseModal";
import { strong as haptic, withStrongPress } from "../../../utils/haptics";

const genId = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const sanitizePrev = (input) => {
    if (!input || typeof input !== "object") return null;
    return {
        weight: Number(input.weight) || 0,
        reps: Number(input.reps) || 0,
    };
};

const sanitizeSet = (set) => ({
    id: (set && set.id) ? String(set.id) : genId(),
    weight: Number(set?.weight ?? set?.lbs ?? set?.kg ?? set?.load ?? 0) || 0,
    reps: Number(set?.reps ?? set?.rep ?? set?.r ?? 0) || 0,
    isDone: !!set?.isDone,
    type: Object.prototype.hasOwnProperty.call(set || {}, "type") ? (set?.type ?? null) : null,
    prev: Object.prototype.hasOwnProperty.call(set || {}, "prev") ? sanitizePrev(set?.prev) : null,
});

const cloneWorkout = (workout) => {
    if (!workout || typeof workout !== "object") return null;
    const replacer = (_key, value) => (typeof value === "function" ? undefined : value);
    try {
        return JSON.parse(JSON.stringify(workout, replacer));
    } catch {
        const shallow = { ...workout };
        if (Array.isArray(workout.exercises)) {
            shallow.exercises = workout.exercises.map((exercise) => ({ ...exercise }));
        }
        return shallow;
    }
};

const prepareWorkout = (workout) => {
    const clone = cloneWorkout(workout);
    if (!clone) return null;
    const exercises = Array.isArray(clone.exercises)
        ? clone.exercises.map((exercise) => ({
            ...exercise,
            sets: Array.isArray(exercise?.sets) ? exercise.sets.map(sanitizeSet) : [],
        }))
        : [];

    return { ...clone, exercises };
};

const EditingWorkoutModal = ({
    visible,
    workout,
    onClose,
    onSave,
    title = "Edit Workout",
}) => {
    const initialWorkoutRef = useRef(prepareWorkout(workout));
    const [draftWorkout, setDraftWorkout] = useState(() => initialWorkoutRef.current);
    const [selectExerciseVisible, setSelectExerciseVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        if (!visible) return;
        const prepared = prepareWorkout(workout);
        initialWorkoutRef.current = prepared;
        setDraftWorkout(prepared);
    }, [visible, workout]);

    useEffect(() => {
        const onShow = (event) => {
            setKeyboardHeight(event?.endCoordinates?.height || 0);
        };
        const onHide = () => setKeyboardHeight(0);

        const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
        const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

        const subShow = Keyboard.addListener(showEvent, onShow);
        const subHide = Keyboard.addListener(hideEvent, onHide);

        return () => {
            try { subShow.remove(); subHide.remove(); } catch { }
        };
    }, []);

    const updateWorkoutState = useCallback((next) => {
        setDraftWorkout(next);
    }, []);

    const workingWorkout = draftWorkout || { exercises: [] };

    const {
        replaceIndex,
        setReplaceIndex,
        appendExercises,
        updateSets,
        deleteExercise,
        makeBlankSetsLike,
        normalizeSet,
    } = useWorkoutEditing({
        workout: workingWorkout,
        updateWorkout: updateWorkoutState,
        viewingSelf: true,
    });

    const exercises = useMemo(
        () => (Array.isArray(workingWorkout?.exercises) ? workingWorkout.exercises : []),
        [workingWorkout?.exercises]
    );

    const handleChangeName = useCallback((text) => {
        setDraftWorkout((prev) => {
            if (!prev) return { name: text, exercises: [] };
            if (prev.name === text) return prev;
            return { ...prev, name: text };
        });
    }, []);

    const handleCloseSelect = useCallback(() => {
        setSelectExerciseVisible(false);
        setReplaceIndex(null);
    }, [setReplaceIndex]);

    const handleAppendOrReplace = useCallback((picked) => {
        const selections = Array.isArray(picked) ? picked.filter(Boolean) : [picked].filter(Boolean);
        if (!selections.length) {
            handleCloseSelect();
            return;
        }
        const choice = selections[0];
        const isReplacing = replaceIndex !== null && replaceIndex >= 0;

        if (isReplacing) {
            setDraftWorkout((prev) => {
                if (!prev) return prev;
                const exs = Array.isArray(prev.exercises) ? prev.exercises : [];
                if (replaceIndex < 0 || replaceIndex >= exs.length) return prev;
                const oldSets = exs[replaceIndex]?.sets ?? [normalizeSet({})];
                const newSets = makeBlankSetsLike(oldSets);
                const nextExercises = exs.map((ex, idx) =>
                    idx === replaceIndex
                        ? { name: choice.name, muscle: choice.muscle, sets: newSets }
                        : ex
                );
                return { ...prev, exercises: nextExercises };
            });
        } else {
            appendExercises(selections);
        }

        haptic();
        setReplaceIndex(null);
        setSelectExerciseVisible(false);
    }, [appendExercises, handleCloseSelect, makeBlankSetsLike, normalizeSet, replaceIndex, setReplaceIndex]);

    const handleAddExercise = useCallback(() => {
        setReplaceIndex(null);
        setSelectExerciseVisible(true);
    }, [setReplaceIndex]);

    const handleReplaceExercise = useCallback((index) => {
        setReplaceIndex(index);
        setSelectExerciseVisible(true);
    }, [setReplaceIndex]);

    const handleDeleteExercise = useCallback((index) => {
        deleteExercise(index);
    }, [deleteExercise]);

    const isDirty = useMemo(() => {
        if (!visible) return false;
        const baseline = initialWorkoutRef.current;
        if (!baseline && !draftWorkout) return false;
        if (!baseline || !draftWorkout) return true;
        try {
            return JSON.stringify(draftWorkout) !== JSON.stringify(baseline);
        } catch {
            return true;
        }
    }, [draftWorkout, visible]);

    const saveDisabled = !isDirty || saving;

    const handlePressSave = useCallback(() => {
        if (saveDisabled) return;
        const payload = draftWorkout ? prepareWorkout(draftWorkout) : null;
        const maybePromise = onSave?.(payload);
        if (maybePromise && typeof maybePromise.then === "function") {
            setSaving(true);
            maybePromise
                .then(() => {
                    setSaving(false);
                    onClose?.();
                })
                .catch(() => {
                    setSaving(false);
                });
        } else {
            onClose?.();
        }
    }, [draftWorkout, onClose, onSave, saveDisabled]);

    const handleRequestClose = useCallback(() => {
        if (saving) return;
        if (isDirty) {
            Alert.alert(
                "Discard changes?",
                "Your edits will be lost.",
                [
                    { text: "Keep editing", style: "cancel" },
                    { text: "Discard", style: "destructive", onPress: () => onClose?.() },
                ],
            );
            return;
        }
        onClose?.();
    }, [isDirty, onClose, saving]);

    const renderExercises = () => {
        if (!exercises.length) {
            return (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyStateTitle}>No exercises yet</Text>
                    <Text style={styles.emptyStateSubtitle}>
                        Add exercises to edit their sets, reps, and weight.
                    </Text>
                </View>
            );
        }

        return exercises.map((exercise, index) => (
            <ExerciseLog
                key={`${exercise?.name || "exercise"}-${index}`}
                name={exercise?.name}
                muscle={exercise?.muscle}
                exerciseIndex={index}
                sets={exercise?.sets}
                updateSets={updateSets}
                replaceExercise={handleReplaceExercise}
                deleteExercise={handleDeleteExercise}
                readOnly={false}
                showOptionsTriggerIcon
                syncColumnOnEdit
            />
        ));
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={handleRequestClose}
        >
            <SafeAreaView style={styles.safeArea}>
                <StatKeyboardProvider>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : undefined}
                        style={styles.flex}
                    >
                        <View style={styles.container}>
                            <View style={styles.header}>
                                <Pressable style={styles.headerAction} onPress={handleRequestClose} hitSlop={10}>
                                    <Ionicons name="close" size={scaleSize(22)} color={theme.textPrimary} />
                                </Pressable>
                                <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
                                <Pressable
                                    style={styles.headerAction}
                                    onPress={handlePressSave}
                                    disabled={saveDisabled}
                                    hitSlop={10}
                                >
                                    <Text
                                        style={[
                                            styles.saveText,
                                            (saveDisabled) && styles.saveTextDisabled,
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {saving ? "Saving..." : "Save"}
                                    </Text>
                                </Pressable>
                            </View>

                            <ScrollView
                                style={{ flex: 1 }}
                                contentContainerStyle={styles.scrollview}
                                keyboardShouldPersistTaps="handled"
                                keyboardDismissMode={Platform.OS === "ios" ? "on-drag" : "none"}
                            >
                                <View style={styles.titleDisplayContainer}>
                                    <TextInput
                                        style={[styles.titleDisplayText, styles.titleDisplayInput]}
                                        placeholder="Workout name"
                                        placeholderTextColor={theme.textSecondary}
                                        value={draftWorkout?.name ?? ""}
                                        onChangeText={handleChangeName}
                                        selectionColor={theme.primary}
                                        autoCapitalize="words"
                                        returnKeyType="done"
                                        multiline
                                        scrollEnabled={false}
                                    />
                                </View>

                                {renderExercises()}

                                <RNBounceable onPress={withStrongPress(handleAddExercise)} style={styles.add_exercise_btn}>
                                    <Text style={styles.add_exercise_text}>Add Exercises</Text>
                                </RNBounceable>
                                <View
                                    style={[
                                        styles.bottomSpacer,
                                        { height: scaleSize(250) + Math.max(0, keyboardHeight - scaleSize(40)) },
                                    ]}
                                />
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>

                    <Modal
                        animationType="fade"
                        transparent
                        visible={selectExerciseVisible}
                        presentationStyle="overFullScreen"
                        onRequestClose={handleCloseSelect}
                    >
                        <SelectExerciseModal
                            closeModal={handleCloseSelect}
                            appendExercises={handleAppendOrReplace}
                        />
                    </Modal>
                </StatKeyboardProvider>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    container: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(18),
        paddingVertical: scaleSize(12),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.hairline,
    },
    headerAction: {
        width: scaleSize(72),
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: scaleSize(4),
    },
    headerTitle: {
        flex: 1,
        textAlign: "center",
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(17),
        color: theme.textPrimary,
    },
    saveText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(15),
        color: theme.primary,
        textAlign: "center",
    },
    saveTextDisabled: {
        color: theme.textSecondary,
    },
    scrollview: {
        paddingTop: scaleSize(5),
        backgroundColor: "transparent",
    },
    titleDisplayContainer: {
        paddingHorizontal: scaleSize(24),
        marginBottom: scaleSize(12),
    },
    titleDisplayText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(17),
        color: theme.textPrimary,
    },
    titleDisplayInput: {
        width: "100%",
        padding: 0,
        textAlignVertical: "top",
    },
    add_exercise_btn: {
        marginHorizontal: scaleSize(20),
        marginTop: scaleSize(18),
        borderRadius: scaleSize(20),
        backgroundColor: "#E2EDFF",
        borderWidth: 0,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        paddingVertical: scaleSize(13),
        paddingHorizontal: scaleSize(18),
        shadowColor: "#000000",
        shadowOpacity: 0.12,
        shadowRadius: scaleSize(8),
        shadowOffset: { width: 0, height: scaleSize(4) },
        elevation: 3,
    },
    add_exercise_text: {
        fontSize: scaleSize(13),
        fontFamily: "Outfit_700Bold",
        color: theme.surface,
    },
    emptyState: {
        marginTop: scaleSize(18),
        borderRadius: scaleSize(12),
        paddingVertical: scaleSize(32),
        paddingHorizontal: scaleSize(20),
        backgroundColor: theme.surface,
        alignItems: "center",
    },
    emptyStateTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(16),
        color: theme.textPrimary,
        marginBottom: scaleSize(6),
    },
    emptyStateSubtitle: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(13),
        color: theme.textSecondary,
        textAlign: "center",
    },
    bottomSpacer: {},
});

export default EditingWorkoutModal;
