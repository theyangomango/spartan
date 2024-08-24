import React, { useState, useCallback, useEffect } from "react";
import { StyleSheet, View, Modal, ScrollView, Text, TextInput, Dimensions } from "react-native";
import SelectExerciseModal from "../NewWorkout/SelectExercise/SelectExerciseModal";
import RNBounceable from "@freakycoder/react-native-bounceable";
import EditTemplateExerciseLog from "./EditTemplateExerciseLog";
import { Weight } from 'iconsax-react-native';

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // Scaling factor based on iPhone 13 height

const scaledSize = (size) => Math.round(size * scale);

const EditTemplateModal = ({ openedTemplateRef, updateTemplate, deleteTemplate }) => {
    const [selectExerciseModalVisible, setSelectExerciseModalVisible] = useState(false);
    const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] = useState(false);
    const [template, setTemplate] = useState(openedTemplateRef.current);
    const [templateTitle, setTemplateTitle] = useState(openedTemplateRef.current.name);

    const showSelectExerciseModal = useCallback(() => {
        setSelectExerciseModalVisible(true);
    }, []);

    const closeSelectExerciseModal = useCallback(() => {
        setSelectExerciseModalVisible(false);
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
        // Replace exercise logic can be implemented here
    }, [template, setTemplate]);

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
                    placeholderTextColor="#aaa"
                />
                <View style={styles.headerRight}>
                    <RNBounceable style={styles.savedButton}>
                        <Text style={styles.savedButtonText}>Saved</Text>
                    </RNBounceable>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.scrollView}
            >
                {template.exercises.map((ex, index) => (
                    <EditTemplateExerciseLog
                        name={ex.name}
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
                    <Weight size={scaledSize(22)} color="#5DBDFF" variant='Bold' />
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
                    appendExercises={appendExercises}
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
    headerShadow: {
        borderBottomWidth: scaledSize(2),
        borderBottomColor: '#eaeaea'
    },
    titleInput: {
        flex: 1,
        fontFamily: 'Outfit_700Bold',
        fontSize: scaledSize(18.5),
        color: '#333',
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
        backgroundColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center'
    },
    savedButtonText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaledSize(15.5),
        color: '#999',
    },
    scrollView: {
        paddingTop: scaledSize(5)
    },
    addExerciseButton: {
        marginHorizontal: scaledSize(20),
        marginTop: scaledSize(18),
        height: scaledSize(35),
        borderRadius: scaledSize(12),
        backgroundColor: '#E1F0FF',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row'
    },
    addExerciseText: {
        fontSize: scaledSize(16),
        fontFamily: 'Outfit_700Bold',
        color: '#0499FE',
        marginRight: scaledSize(4.5)
    },
    cancelButton: {
        marginHorizontal: scaledSize(20),
        marginTop: scaledSize(18),
        height: scaledSize(35),
        borderRadius: scaledSize(12),
        backgroundColor: '#FFECEC',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row'
    },
    deleteButtonText: {
        fontSize: scaledSize(16),
        fontFamily: 'Outfit_700Bold',
        color: '#F27171',
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
        backgroundColor: '#fff',
        borderRadius: scaledSize(15),
        alignItems: 'center',
    },
    modalText: {
        fontSize: scaledSize(16),
        color: '#333',
        fontFamily: 'Outfit_700Bold',
        marginBottom: scaledSize(20),
        textAlign: 'center',
    },
    deleteTemplateBtn: {
        width: '100%',
        paddingVertical: scaledSize(8),
        backgroundColor: '#FFECEC',
        borderRadius: scaledSize(8),
        alignItems: 'center',
        marginBottom: scaledSize(10),
    },
    deleteTemplateText: {
        color: '#F27171',
        fontSize: scaledSize(14),
        fontFamily: 'Outfit_700Bold',
    },
    cancelDeleteBtn: {
        width: '100%',
        paddingVertical: scaledSize(8),
        backgroundColor: '#eee',
        borderRadius: scaledSize(8),
        alignItems: 'center',
    },
    cancelDeleteText: {
        color: '#666',
        fontSize: scaledSize(14),
        fontFamily: 'Outfit_700Bold',
    },
});

export default React.memo(EditTemplateModal);
