import React, { useState, useCallback, useEffect } from "react";
import { StyleSheet, View, Modal, ScrollView, Text, TextInput } from "react-native";
import SelectExerciseModal from "../NewWorkout/SelectExercise/SelectExerciseModal";
import RNBounceable from "@freakycoder/react-native-bounceable";
import EditTemplateExerciseLog from "./EditTemplateExerciseLog";
import { Weight } from 'iconsax-react-native';

const EditTemplateModal = ({ openedTemplateRef, updateTemplate, deleteTemplate }) => {
    const [selectExerciseModalVisible, setSelectExerciseModalVisible] = useState(false);
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
                    return { ...exercise, sets: newSets }; // Replace sets for the specific exercise
                }
                return exercise;
            });
            return { ...prevTemplate, exercises: updatedExercises }; // Return a new template object
        });
    }, []);

    const replaceExercise = useCallback((index) => {

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
                    <EditTemplateExerciseLog name={ex.name} sets={ex.sets} exerciseIndex={index} key={index} updateSets={updateSets} replaceExercise={replaceExercise} deleteExercise={deleteExercise} />
                ))}
                <RNBounceable onPress={showSelectExerciseModal} style={styles.addExerciseButton}>
                    <Text style={styles.addExerciseText}>Add Exercises</Text>
                    <Weight size="22" color="#5DBDFF" variant='Bold' />
                </RNBounceable>

                <RNBounceable style={styles.cancelButton} onPress={deleteTemplate}>
                    <Text style={styles.deleteButtonText}>Delete Template</Text>
                </RNBounceable>

                <View style={{ height: 150 }} />
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
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
    },
    header: {
        paddingBottom: 6,
        paddingLeft: 15,
        paddingRight: 22,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 1,
    },
    headerShadow: {
        borderBottomWidth: 2,
        borderBottomColor: '#eaeaea'
    },
    titleInput: {
        flex: 1,
        fontFamily: 'Outfit_700Bold',
        fontSize: 18.5,
        color: '#333',
        paddingVertical: 5,
        paddingHorizontal: 10,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    savedButton: {
        width: 80,
        height: 35,
        borderRadius: 12,
        // backgroundColor: '#DCFFE3',
        backgroundColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center'
    },
    savedButtonText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 15.5,
        // color: '#40D99B',
        color: '#999',
    },
    scrollView: {
        paddingTop: 5
    },
    addExerciseButton: {
        marginHorizontal: 20,
        marginTop: 18,
        height: 35,
        borderRadius: 12,
        backgroundColor: '#E1F0FF',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row'
    },
    addExerciseText: {
        fontSize: 16,
        fontFamily: 'Outfit_700Bold',
        color: '#0499FE',
        marginRight: 4.5
    },
    cancelButton: {
        marginHorizontal: 20,
        marginTop: 18,
        height: 35,
        borderRadius: 12,
        backgroundColor: '#FFECEC',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row'
    },
    deleteButtonText: {
        fontSize: 16,
        fontFamily: 'Outfit_700Bold',
        color: '#F27171',
        marginRight: 4.5
    },
});

export default React.memo(EditTemplateModal);
