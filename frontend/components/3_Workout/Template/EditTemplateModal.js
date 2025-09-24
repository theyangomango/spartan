import React, { useState, useCallback } from "react";
import { StyleSheet, View, Modal, ScrollView, Text, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import scaleSize from "../../../helper/scaleSize";
import SelectExerciseModal from "../NewWorkout/SelectExercise/SelectExerciseModal";
import RNBounceable from "@freakycoder/react-native-bounceable";
import EditTemplateExerciseLog from "./EditTemplateExerciseLog";
import theme from "../../../theme/mfpDark";

const normalizeSetType = (value) => {
    const raw = typeof value === "string" ? value.toLowerCase() : "";
    return raw === "warmup" || raw === "dropset" || raw === "failure" ? raw : null;
};

const normalizeTemplateSet = (set = {}) => ({
    ...set,
    type: normalizeSetType(set?.type),
});

const normalizeTemplateExercise = (exercise = {}) => ({
    ...exercise,
    sets: Array.isArray(exercise?.sets)
        ? exercise.sets.map(normalizeTemplateSet)
        : [],
});

const normalizeTemplate = (tpl = {}) => ({
    ...tpl,
    exercises: Array.isArray(tpl?.exercises)
        ? tpl.exercises.map(normalizeTemplateExercise)
        : [],
});

const scaledSize = (size) => scaleSize(size);

const EditTemplateModal = ({ openedTemplateRef, updateTemplate, deleteTemplate, closeModal, onSave }) => {
    const [selectExerciseModalVisible, setSelectExerciseModalVisible] = useState(false);
    const [replaceIndex, setReplaceIndex] = useState(null);
    const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] = useState(false);
    const [template, setTemplate] = useState(() => normalizeTemplate(openedTemplateRef.current));

    const showSelectExerciseModal = useCallback(() => {
        setSelectExerciseModalVisible(true);
    }, []);

    const closeSelectExerciseModal = useCallback(() => {
        setSelectExerciseModalVisible(false);
        setReplaceIndex(null);
    }, []);

    const appendExercises = useCallback((exercises) => {
        setTemplate((prev) => {
            const next = {
                ...prev,
                exercises: [
                    ...prev.exercises,
                    ...exercises.map((ex) => ({
                        name: ex.name,
                        muscle: ex.muscle,
                        sets: [{ weight: 0, reps: 0, previous: '405 lb x 12', type: null }],
                    })),
                ],
            };
            return normalizeTemplate(next);
        });
    }, []);

    const updateSets = useCallback((exerciseIndex, newSets) => {
        setTemplate(prevTemplate => {
            const normalizedSets = (Array.isArray(newSets) ? newSets : []).map(normalizeTemplateSet);
            const updatedExercises = prevTemplate.exercises.map((exercise, index) => (
                index === exerciseIndex ? { ...exercise, sets: normalizedSets } : exercise
            ));
            const next = { ...prevTemplate, exercises: updatedExercises };
            return normalizeTemplate(next);
        });
    }, []);

    const replaceExercise = useCallback((index) => {
        setReplaceIndex(index);
        setSelectExerciseModalVisible(true);
    }, []);

    const handleAppendOrReplace = useCallback((picked) => {
        const choice = Array.isArray(picked) ? picked[0] : picked;
        const isReplacing = replaceIndex !== null && replaceIndex >= 0;

        if (isReplacing && choice) {
            setTemplate((prev) => {
                const prevSets = prev?.exercises?.[replaceIndex]?.sets || [
                    { weight: 0, reps: 0, previous: '405 lb x 12', type: null },
                ];
                const newSets = prevSets.map((s) => ({
                    weight: 0,
                    reps: 0,
                    previous: s?.previous ?? '405 lb x 12',
                    type: normalizeSetType(s?.type),
                }));
                const nextExercises = prev.exercises.map((ex, i) => (
                    i === replaceIndex
                        ? { name: choice.name, muscle: choice.muscle, sets: newSets }
                        : ex
                ));
                return normalizeTemplate({ ...prev, exercises: nextExercises });
            });
            setReplaceIndex(null);
            setSelectExerciseModalVisible(false);
            return;
        }

        // Default: append all picked exercises
        appendExercises(Array.isArray(picked) ? picked : [picked]);
        setSelectExerciseModalVisible(false);
    }, [appendExercises, replaceIndex]);

    const deleteExercise = useCallback((index) => {
        setTemplate((prev) => normalizeTemplate({
            ...prev,
            exercises: prev.exercises.filter((_, i) => i !== index),
        }));
    }, []);

    const handleChangeTitle = useCallback((text) => {
        setTemplate((prev) => normalizeTemplate({
            ...prev,
            name: text,
        }));
    }, []);

    const confirmDeleteTemplate = () => {
        if (template.exercises.length === 0) handleDeleteTemplate();
        else setDeleteConfirmModalVisible(true);
    };

    const handleDeleteTemplate = useCallback(() => {
        setDeleteConfirmModalVisible(false);
        deleteTemplate();
    }, [deleteTemplate]);

    const handleClosePress = useCallback(() => {
        const originalExercisesCount = Array.isArray(openedTemplateRef?.current?.exercises)
            ? openedTemplateRef.current.exercises.length
            : 0;
        if (originalExercisesCount === 0 && (template?.exercises?.length ?? 0) === 0) {
            handleDeleteTemplate();
            return;
        }
        if (typeof closeModal === 'function') closeModal();
    }, [template, openedTemplateRef, handleDeleteTemplate, closeModal]);

    const handleSavePress = useCallback(() => {
        const normalized = normalizeTemplate(template);
        setTemplate(normalized);
        try { openedTemplateRef.current = normalized; } catch { }
        try { updateTemplate(); } catch { }
        if (typeof onSave === 'function') onSave(normalized);
    }, [template, openedTemplateRef, updateTemplate, onSave]);

    return (
        <View style={styles.mainContainer}>
            <View style={styles.navBar}>
                <View style={styles.sideSlotLeft}>
                    <RNBounceable onPress={handleClosePress} style={styles.iconButton}>
                        <Text style={styles.iconButtonLabel}>✕</Text>
                    </RNBounceable>
                </View>
                <View style={styles.navSpacer} />
                <View style={styles.sideSlotRight}>
                    <RNBounceable onPress={handleSavePress} style={styles.saveButton}>
                        <Text style={styles.saveButtonText}>Save</Text>
                    </RNBounceable>
                </View>
            </View>
            <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.titleDisplayContainer}>
                    <TextInput
                        style={styles.titleDisplayText}
                        value={template?.name ?? ""}
                        onChangeText={handleChangeTitle}
                        placeholder="New Template"
                        placeholderTextColor={theme.textSecondary}
                        selectionColor={theme.primary}
                        returnKeyType="done"
                        blurOnSubmit
                        autoFocus
                    />
                </View>
                {template.exercises.map((ex, index) => (
                    <EditTemplateExerciseLog
                        name={ex.name}
                        muscle={ex.muscle}
                        sets={ex.sets}
                        exerciseIndex={index}
                        key={index}
                        updateSets={updateSets}
                        replaceExercise={replaceExercise}
                        deleteExercise={deleteExercise}
                    />
                ))}
                <RNBounceable onPress={showSelectExerciseModal} style={styles.addExerciseButton}>
                    <Text style={styles.addExerciseText}>Add Exercises</Text>
                </RNBounceable>

                <RNBounceable style={styles.cancelButton} onPress={confirmDeleteTemplate}>
                    <Text style={styles.deleteButtonText}>Delete Template</Text>
                </RNBounceable>
            </ScrollView>
            <Modal
                animationType='fade'
                transparent={true}
                visible={selectExerciseModalVisible}>
                <SelectExerciseModal
                    closeModal={closeSelectExerciseModal}
                    appendExercises={handleAppendOrReplace}
                />
            </Modal>
            <Modal
                animationType="fade"
                transparent
                visible={deleteConfirmModalVisible}
                onRequestClose={() => setDeleteConfirmModalVisible(false)}
                statusBarTranslucent
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <LinearGradient
                            colors={["#2D9EFF", "#60A5FA"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.modalAccentBar}
                        />
                        <View style={[styles.modalIconRing, styles.modalIconRingDanger]}>
                            <MaterialCommunityIcons name="trash-can-outline" size={scaleSize(26)} color="#FEE2E2" />
                        </View>
                        <Text style={styles.modalTitle}>Delete template?</Text>
                        <Text style={styles.modalBody}>
                            This removes the template permanently. You can always build a new one from the workout hub.
                        </Text>
                        <RNBounceable onPress={handleDeleteTemplate} style={[styles.modalAction, styles.modalActionDanger]}>
                            <Text style={styles.modalActionText}>Yes, delete template</Text>
                        </RNBounceable>
                        <RNBounceable onPress={() => setDeleteConfirmModalVisible(false)} style={[styles.modalAction, styles.modalActionSecondary]}>
                            <Text style={styles.modalActionSecondaryText}>Keep template</Text>
                        </RNBounceable>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        paddingTop: scaledSize(12),
    },
    navBar: {
        paddingHorizontal: scaledSize(20),
        paddingTop: scaledSize(18),
        paddingBottom: scaledSize(12),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sideSlotLeft: {
        width: scaledSize(60),
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    sideSlotRight: {
        width: scaledSize(60),
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    iconButton: {
        width: scaledSize(40),
        height: scaledSize(40),
        borderRadius: scaledSize(14),
        backgroundColor: '#1a1d27',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: scaledSize(8),
        shadowOffset: { width: 0, height: scaledSize(4) },
        elevation: 4,
    },
    iconButtonLabel: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(16),
        color: '#FFFFFF',
    },
    saveButton: {
        minWidth: scaleSize(68),
        paddingHorizontal: scaledSize(14),
        height: scaledSize(36),
        borderRadius: scaledSize(12),
        backgroundColor: theme.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: theme.primary,
        shadowOpacity: 0.35,
        shadowRadius: scaledSize(10),
        shadowOffset: { width: 0, height: scaledSize(4) },
        elevation: 5,
    },
    saveButtonText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(14),
        color: '#FFFFFF',
    },
    navSpacer: {
        flex: 1,
    },
    scrollView: {
        paddingTop: scaledSize(5)
    },
    scrollContent: {
        paddingBottom: scaledSize(120),
    },
    titleDisplayContainer: {
        paddingHorizontal: scaledSize(24),
        marginBottom: scaledSize(12),
    },
    titleDisplayText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(20),
        color: theme.textPrimary,
    },
    addExerciseButton: {
        marginHorizontal: scaledSize(20),
        marginTop: scaledSize(18),
        height: scaledSize(40),
        borderRadius: scaledSize(12),
        // Match NewWorkout add_exercise_btn styling
        backgroundColor: 'rgba(45, 157, 255, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        shadowColor: theme.primary,
        shadowOpacity: 0.15,
        shadowRadius: scaledSize(6),
        shadowOffset: { width: 0, height: scaledSize(3) },
        elevation: 2,
    },
    addExerciseText: {
        fontSize: scaleSize(16),
        fontFamily: 'Outfit_700Bold',
        color: '#FFFFFF',
        marginRight: scaledSize(4.5)
    },
    cancelButton: {
        marginHorizontal: scaledSize(20),
        marginTop: scaledSize(14),
        height: scaledSize(40),
        borderRadius: scaledSize(12),
        backgroundColor: 'rgba(217,76,76,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        shadowColor: '#D94C4C',
        shadowOpacity: 0.15,
        shadowRadius: scaledSize(6),
        shadowOffset: { width: 0, height: scaledSize(3) },
        elevation: 2,
    },
    deleteButtonText: {
        fontSize: scaleSize(16),
        fontFamily: 'Outfit_700Bold',
        color: '#FFFFFF',
        marginRight: scaledSize(4.5)
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(8, 13, 24, 0.78)',
        paddingHorizontal: scaledSize(24),
    },
    modalContainer: {
        width: '100%',
        maxWidth: scaledSize(360),
        paddingTop: scaledSize(36),
        paddingBottom: scaledSize(24),
        paddingHorizontal: scaledSize(24),
        backgroundColor: 'rgba(20, 28, 45, 0.96)',
        borderRadius: scaledSize(24),
        borderWidth: scaledSize(1),
        borderColor: 'rgba(99, 123, 171, 0.38)',
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOpacity: 0.28,
        shadowRadius: scaledSize(24),
        shadowOffset: { width: 0, height: scaledSize(14) },
        elevation: 16,
        overflow: 'hidden',
    },
    modalAccentBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: scaledSize(6),
        borderTopLeftRadius: scaledSize(24),
        borderTopRightRadius: scaledSize(24),
        opacity: 0.9,
    },
    modalIconRing: {
        width: scaledSize(58),
        height: scaledSize(58),
        borderRadius: scaledSize(32),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: scaledSize(18),
        borderWidth: scaledSize(1.5),
    },
    modalIconRingDanger: {
        backgroundColor: 'rgba(239,68,68,0.12)',
        borderColor: 'rgba(239,68,68,0.36)',
    },
    modalTitle: {
        fontSize: scaleSize(20),
        fontFamily: 'Poppins_700Bold',
        color: theme.textPrimary,
        textAlign: 'center',
        marginBottom: scaledSize(10),
        letterSpacing: 0.2,
    },
    modalBody: {
        fontSize: scaleSize(13.8),
        fontFamily: 'Outfit_500Medium',
        color: theme.textSecondary,
        textAlign: 'center',
        marginBottom: scaledSize(22),
        lineHeight: scaledSize(20),
    },
    modalAction: {
        width: '100%',
        borderRadius: scaledSize(14),
        paddingVertical: scaledSize(12),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: scaledSize(12),
    },
    modalActionDanger: {
        backgroundColor: '#EF4444',
        shadowColor: '#EF4444',
        shadowOpacity: 0.32,
        shadowRadius: scaledSize(12),
        shadowOffset: { width: 0, height: scaledSize(6) },
        elevation: 6,
    },
    modalActionSecondary: {
        backgroundColor: 'rgba(148, 163, 184, 0.12)',
        borderWidth: scaledSize(1),
        borderColor: 'rgba(148, 197, 255, 0.24)',
        marginBottom: 0,
    },
    modalActionText: {
        fontFamily: 'Poppins_700Bold',
        fontSize: scaleSize(14.5),
        color: '#F8FAFC',
        letterSpacing: 0.3,
    },
    modalActionSecondaryText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(13.5),
        color: theme.textPrimary,
        letterSpacing: 0.25,
    },
});

export default React.memo(EditTemplateModal);
