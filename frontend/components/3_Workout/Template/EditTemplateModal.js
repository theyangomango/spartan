import React, { useState, useCallback, useEffect } from "react";
import { StyleSheet, View, Modal, ScrollView, Text, TextInput, Dimensions } from "react-native";
import scaleSize from "../../../helper/scaleSize";
import SelectExerciseModal from "../NewWorkout/SelectExercise/SelectExerciseModal";
import RNBounceable from "@freakycoder/react-native-bounceable";
import EditTemplateExerciseLog from "./EditTemplateExerciseLog";
import { Weight } from 'iconsax-react-native';
import theme from "../../../theme/mfpDark";

const { height: screenHeight } = Dimensions.get('window');
const scaledSize = (size) => scaleSize(size);

const EditTemplateModal = ({ openedTemplateRef, updateTemplate, deleteTemplate }) => {
    const [selectExerciseModalVisible, setSelectExerciseModalVisible] = useState(false);
    const [replaceIndex, setReplaceIndex] = useState(null);
    const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] = useState(false);
    const [template, setTemplate] = useState(openedTemplateRef.current);

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
                        sets: [{ weight: 0, reps: 0, previous: '405 lb x 12' }],
                    })),
                ],
            };
            try { openedTemplateRef.current = next; updateTemplate(); } catch {}
            return next;
        });
    }, [openedTemplateRef, updateTemplate]);

    const updateSets = useCallback((exerciseIndex, newSets) => {
        setTemplate(prevTemplate => {
            const updatedExercises = prevTemplate.exercises.map((exercise, index) => (
                index === exerciseIndex ? { ...exercise, sets: newSets } : exercise
            ));
            const next = { ...prevTemplate, exercises: updatedExercises };
            try { openedTemplateRef.current = next; updateTemplate(); } catch {}
            return next;
        });
    }, [openedTemplateRef, updateTemplate]);

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
                    { weight: 0, reps: 0, previous: '405 lb x 12' },
                ];
                const newSets = prevSets.map((s) => ({
                    weight: 0,
                    reps: 0,
                    previous: s?.previous ?? '405 lb x 12',
                }));
                const nextExercises = prev.exercises.map((ex, i) => (
                    i === replaceIndex
                        ? { name: choice.name, muscle: choice.muscle, sets: newSets }
                        : ex
                ));
                const next = { ...prev, exercises: nextExercises };
                try { openedTemplateRef.current = next; updateTemplate(); } catch {}
                return next;
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
        setTemplate((prev) => {
            const next = { ...prev, exercises: prev.exercises.filter((_, i) => i !== index) };
            try { openedTemplateRef.current = next; updateTemplate(); } catch {}
            return next;
        });
    }, [openedTemplateRef, updateTemplate]);

    useEffect(() => {
        openedTemplateRef.current = template;
        updateTemplate();
    }, [template, updateTemplate]);

    const handleChangeTitle = useCallback((text) => {
        // Keep local template state in sync and push update immediately
        setTemplate((prev) => {
            const next = { ...prev, name: text };
            try { openedTemplateRef.current = next; updateTemplate(); } catch {}
            return next;
        });
    }, [openedTemplateRef, updateTemplate]);

    const confirmDeleteTemplate = () => {
        if (template.exercises.length === 0) handleDeleteTemplate();
        else setDeleteConfirmModalVisible(true);
    };

    const handleDeleteTemplate = useCallback(() => {
        setDeleteConfirmModalVisible(false);
        deleteTemplate();
    }, [deleteTemplate]);

    return (
        <View style={styles.mainContainer}>
            <View style={styles.header}>
                <TextInput
                    style={styles.titleInput}
                    value={template?.name ?? ""}
                    onChangeText={handleChangeTitle}
                    placeholder="Untitled Template"
                    placeholderTextColor={theme.textSecondary}
                />
                <View style={styles.headerRight}>
                    {/* <RNBounceable style={styles.savedButton}>
                        <Text style={styles.savedButtonText}>Saved</Text>
                    </RNBounceable> */}
                </View>
            </View>
            <View style={styles.headerShadow} />
            <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.scrollView}
            >
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
                    <Weight size={scaledSize(22)} color="#FFFFFF" variant='Bold' />
                </RNBounceable>

                <RNBounceable style={styles.cancelButton} onPress={confirmDeleteTemplate}>
                    <Text style={styles.deleteButtonText}>Delete Template</Text>
                </RNBounceable>

                <View style={{ height: scaleSize(scaledSize(150)) }} />
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
                transparent={true}
                visible={deleteConfirmModalVisible}
                onRequestClose={() => setDeleteConfirmModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalText}>Are you sure you want to delete this template?</Text>
                        <RNBounceable onPress={handleDeleteTemplate} style={styles.deleteTemplateBtn}>
                            <Text style={styles.deleteTemplateText}>Delete Template</Text>
                        </RNBounceable>
                        <RNBounceable onPress={() => setDeleteConfirmModalVisible(false)} style={styles.cancelDeleteBtn}>
                            <Text style={styles.cancelDeleteText}>Cancel</Text>
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
    },
    header: {
        paddingBottom: scaleSize(scaledSize(6)),
        paddingLeft: scaleSize(scaledSize(15)),
        paddingRight: scaleSize(scaledSize(22)),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 1,
    },
    headerShadow: { height: scaleSize(scaledSize(2)), backgroundColor: theme.hairline },
    titleInput: {
        flex: 1,
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(18.5),
        color: theme.textPrimary,
        paddingVertical: scaleSize(scaledSize(5)),
        paddingHorizontal: scaleSize(scaledSize(10)),
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    savedButton: {
        width: scaleSize(scaledSize(80)),
        height: scaleSize(scaledSize(35)),
        borderRadius: scaleSize(scaledSize(12)),
        backgroundColor: theme.field,
        justifyContent: 'center',
        alignItems: 'center'
    },
    savedButtonText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(15.5),
        color: theme.textSecondary,
    },
    scrollView: {
        paddingTop: scaleSize(scaledSize(5))
    },
    addExerciseButton: {
        marginHorizontal: scaleSize(scaledSize(20)),
        marginTop: scaleSize(scaledSize(18)),
        height: scaleSize(scaledSize(40)),
        borderRadius: scaleSize(scaledSize(12)),
        // Match NewWorkout add_exercise_btn styling
        backgroundColor: 'rgba(45, 157, 255, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        shadowColor: theme.primary,
        shadowOpacity: 0.15,
        shadowRadius: scaleSize(scaledSize(6)),
        shadowOffset: { width: 0, height: scaleSize(scaledSize(3)) },
        elevation: 2,
    },
    addExerciseText: {
        fontSize: scaleSize(16),
        fontFamily: 'Outfit_700Bold',
        color: '#FFFFFF',
        marginRight: scaleSize(scaledSize(4.5))
    },
    cancelButton: {
        marginHorizontal: scaleSize(scaledSize(20)),
        marginTop: scaleSize(scaledSize(14)),
        height: scaleSize(scaledSize(40)),
        borderRadius: scaleSize(scaledSize(12)),
        backgroundColor: 'rgba(217,76,76,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        shadowColor: '#D94C4C',
        shadowOpacity: 0.15,
        shadowRadius: scaleSize(scaledSize(6)),
        shadowOffset: { width: 0, height: scaleSize(scaledSize(3)) },
        elevation: 2,
    },
    deleteButtonText: {
        fontSize: scaleSize(16),
        fontFamily: 'Outfit_700Bold',
        color: '#FFFFFF',
        marginRight: scaleSize(scaledSize(4.5))
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        width: '80%',
        padding: scaleSize(scaledSize(20)),
        backgroundColor: theme.surface,
        borderRadius: scaleSize(scaledSize(15)),
        alignItems: 'center',
    },
    modalText: {
        fontSize: scaleSize(16),
        color: theme.textPrimary,
        fontFamily: 'Outfit_700Bold',
        marginBottom: scaleSize(scaledSize(20)),
        textAlign: 'center',
    },
    deleteTemplateBtn: { width: '100%', paddingVertical: scaleSize(scaledSize(10)), backgroundColor: '#D94C4C', borderRadius: scaleSize(scaledSize(8)), alignItems: 'center', marginBottom: scaleSize(scaledSize(10)) },
    deleteTemplateText: { color: '#FFFFFF', fontSize: scaleSize(14), fontFamily: 'Outfit_700Bold' },
    cancelDeleteBtn: {
        width: '100%',
        paddingVertical: scaleSize(scaledSize(8)),
        backgroundColor: theme.field,
        borderRadius: scaleSize(scaledSize(8)),
        alignItems: 'center',
    },
    cancelDeleteText: {
        color: theme.textSecondary,
        fontSize: scaleSize(14),
        fontFamily: 'Outfit_700Bold',
    },
});

export default React.memo(EditTemplateModal);
