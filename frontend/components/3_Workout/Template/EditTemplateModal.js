import React, { useState, useCallback, useEffect } from "react";
import { StyleSheet, View, Modal, ScrollView, Text, TextInput, Dimensions } from "react-native";
import SelectExerciseModal from "../NewWorkout/SelectExercise/SelectExerciseModal";
import RNBounceable from "@freakycoder/react-native-bounceable";
import EditTemplateExerciseLog from "./EditTemplateExerciseLog";
import { Weight } from 'iconsax-react-native';
import theme from "../../../theme/mfpDark";

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // Scaling factor based on iPhone 13 height

const scaledSize = (size) => Math.round(size * scale);

const EditTemplateModal = ({ openedTemplateRef, updateTemplate, deleteTemplate }) => {
    const [selectExerciseModalVisible, setSelectExerciseModalVisible] = useState(false);
    const [replaceIndex, setReplaceIndex] = useState(null);
    const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] = useState(false);
    const [template, setTemplate] = useState(openedTemplateRef.current);
    const [templateTitle, setTemplateTitle] = useState(openedTemplateRef.current.name);

    const showSelectExerciseModal = useCallback(() => {
        setSelectExerciseModalVisible(true);
    }, []);

    const closeSelectExerciseModal = useCallback(() => {
        setSelectExerciseModalVisible(false);
        setReplaceIndex(null);
    }, []);

    const appendExercises = useCallback((exercises) => {
        const newTemplate = {
            ...template, exercises: [...template.exercises, ...exercises.map(ex => ({
                name: ex.name,
                muscle: ex.muscle,
                sets: [{
                    weight: 0,
                    reps: 0,
                    previous: '405 lb x 12'
                }]
            }))]
        };
        setTemplate(newTemplate);
    }, [template]);

    const updateSets = useCallback((exerciseIndex, newSets) => {
        setTemplate(prevTemplate => {
            const updatedExercises = prevTemplate.exercises.map((exercise, index) => {
                if (index === exerciseIndex) {
                    return { ...exercise, sets: newSets };
                }
                return exercise;
            });
            return { ...prevTemplate, exercises: updatedExercises };
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
            const prevSets = template?.exercises?.[replaceIndex]?.sets || [{ weight: 0, reps: 0, previous: '405 lb x 12' }];
            const newSets = prevSets.map((s) => ({ weight: 0, reps: 0, previous: s?.previous ?? '405 lb x 12' }));
            const nextExercises = template.exercises.map((ex, i) => (
                i === replaceIndex ? { name: choice.name, muscle: choice.muscle, sets: newSets } : ex
            ));
            setTemplate({ ...template, exercises: nextExercises });
            setReplaceIndex(null);
            setSelectExerciseModalVisible(false);
            return;
        }

        // Default: append all picked exercises
        appendExercises(Array.isArray(picked) ? picked : [picked]);
        setSelectExerciseModalVisible(false);
    }, [appendExercises, replaceIndex, template]);

    const deleteExercise = useCallback((index) => {
        const newTemplate = { ...template };
        newTemplate.exercises = newTemplate.exercises.filter((_, i) => i !== index);
        setTemplate(newTemplate);
    }, [template, setTemplate]);

    useEffect(() => {
        openedTemplateRef.current = template;
        updateTemplate();
    }, [template]);

    useEffect(() => {
        openedTemplateRef.current.name = templateTitle;
        updateTemplate();
    }, [templateTitle]);

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
                    value={templateTitle}
                    onChangeText={setTemplateTitle}
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

                <View style={{ height: scaledSize(150) }} />
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
        paddingBottom: scaledSize(6),
        paddingLeft: scaledSize(15),
        paddingRight: scaledSize(22),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 1,
    },
    headerShadow: { height: scaledSize(2), backgroundColor: theme.hairline },
    titleInput: {
        flex: 1,
        fontFamily: 'Outfit_700Bold',
        fontSize: scaledSize(18.5),
        color: theme.textPrimary,
        paddingVertical: scaledSize(5),
        paddingHorizontal: scaledSize(10),
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    savedButton: {
        width: scaledSize(80),
        height: scaledSize(35),
        borderRadius: scaledSize(12),
        backgroundColor: theme.field,
        justifyContent: 'center',
        alignItems: 'center'
    },
    savedButtonText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaledSize(15.5),
        color: theme.textSecondary,
    },
    scrollView: {
        paddingTop: scaledSize(5)
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
        fontSize: scaledSize(16),
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
        fontSize: scaledSize(16),
        fontFamily: 'Outfit_700Bold',
        color: '#FFFFFF',
        marginRight: scaledSize(4.5)
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        width: '80%',
        padding: scaledSize(20),
        backgroundColor: theme.surface,
        borderRadius: scaledSize(15),
        alignItems: 'center',
    },
    modalText: {
        fontSize: scaledSize(16),
        color: theme.textPrimary,
        fontFamily: 'Outfit_700Bold',
        marginBottom: scaledSize(20),
        textAlign: 'center',
    },
    deleteTemplateBtn: { width: '100%', paddingVertical: scaledSize(10), backgroundColor: '#D94C4C', borderRadius: scaledSize(8), alignItems: 'center', marginBottom: scaledSize(10) },
    deleteTemplateText: { color: '#FFFFFF', fontSize: scaledSize(14), fontFamily: 'Outfit_700Bold' },
    cancelDeleteBtn: {
        width: '100%',
        paddingVertical: scaledSize(8),
        backgroundColor: theme.field,
        borderRadius: scaledSize(8),
        alignItems: 'center',
    },
    cancelDeleteText: {
        color: theme.textSecondary,
        fontSize: scaledSize(14),
        fontFamily: 'Outfit_700Bold',
    },
});

export default React.memo(EditTemplateModal);
