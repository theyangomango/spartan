import React, { useState, useRef } from "react";
import { View, StyleSheet, Text, Pressable, Image, Animated, Dimensions } from "react-native";
import { MaterialCommunityIcons, Entypo } from '@expo/vector-icons';
import RNBounceable from "@freakycoder/react-native-bounceable";
import ExerciseOptionsPanel from "../NewWorkout/Tracking/ExerciseOptionsPanel";
import TemplateSetRow from "./TemplateSetRow";

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // Scaling factor based on iPhone 13 height

const scaledSize = (size) => Math.round(size * scale);

export default function EditTemplateExerciseLog({ name, exerciseIndex, updateSets, sets, replaceExercise, deleteExercise }) {
    const muscle = name === 'Lateral Raise' ? 'Shoulders' : 'Chest';

    const [isPanelVisible, setIsPanelVisible] = useState(false);
    const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const muscleColors = {
        Chest: '#FFAFB8',
        Shoulders: '#A1CDEE',
        Biceps: '#CBBCFF',
        Back: '#95E0C8'
    };

    const togglePanel = (event) => {
        if (isPanelVisible) {
            setIsPanelVisible(false);
        } else {
            setIsPanelVisible(true);
            setPanelPosition({
                top: event.nativeEvent.pageY + 25,
                left: scaledSize(18)
            });
        }
    };

    function addSet() {
        updateSets(exerciseIndex, [...sets, {
            previous: '405 lb x 12',
            weight: 0,
            reps: 0
        }]);
    }

    function updateSet(index, newSet) {
        const newSets = [...sets];
        newSets[index] = newSet;
        updateSets(exerciseIndex, newSets);
    }

    function deleteSet(index) {
        const newSets = sets.filter((_, i) => i !== index);
        updateSets(exerciseIndex, newSets);
    }

    return (
        <View style={styles.main_ctnr}>
            <ExerciseOptionsPanel
                visible={isPanelVisible}
                onClose={() => {
                    setIsPanelVisible(false);
                }}
                position={panelPosition}
                replaceExercise={() => replaceExercise(exerciseIndex)}
                deleteExercise={() => deleteExercise(exerciseIndex)}
            />
            <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                <Pressable style={styles.nameContainer} onPress={togglePanel}>
                    <Text style={styles.exercise_text} numberOfLines={1}>{name}</Text>
                    <View style={[styles.muscle_ctnr, { backgroundColor: muscleColors[muscle] }]}>
                        <Text style={styles.muscle_text}>{muscle}</Text>
                    </View>
                </Pressable>

                <View style={styles.pfpContainer}>
                    <Image style={styles.pfp} source={{ uri: global.userData.image }} />
                    <Image style={[styles.pfp, styles.pfpOverlap]} source={{ uri: global.userData.image }} />
                    <Image style={[styles.pfp, styles.pfpOverlap]} source={{ uri: global.userData.image }} />
                </View>
            </Animated.View>
            <Animated.View style={[styles.labels, { opacity: fadeAnim }]}>
                <View style={styles.set_ctnr}>
                    <Text style={styles.label_text}>Set</Text>
                </View>
                <View style={styles.previous_ctnr}>
                    <Text style={styles.label_text}>Previous</Text>
                </View>
                <View style={styles.weight_unit_ctnr}>
                    <Text style={styles.label_text}>lbs</Text>
                </View>
                <View style={styles.reps_ctnr}>
                    <Text style={styles.label_text}>Reps</Text>
                </View>
            </Animated.View>
            <Animated.View style={{ opacity: fadeAnim }}>
                {sets.map((set, index) => {
                    return (
                        <TemplateSetRow set={set} index={index} key={index} updateSet={updateSet} handleDelete={() => deleteSet(index)} />
                    );
                })}
            </Animated.View>
            <Animated.View style={[styles.add_set_btn_ctnr, { opacity: fadeAnim }]}>
                <RNBounceable activeOpacity={0.5} onPress={addSet} style={styles.add_set_btn}>
                    <Entypo name="plus" size={scaledSize(18)} color={'#000'} />
                    <Text style={styles.add_set_text}>Add Set</Text>
                    <MaterialCommunityIcons name="arm-flex" size={scaledSize(20)} color={'#aaa'} />
                </RNBounceable>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        marginTop: scaledSize(16),
        marginBottom: scaledSize(6),
        position: 'relative',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: scaledSize(20),
        paddingBottom: scaledSize(10),
        marginHorizontal: scaledSize(2.5),
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
        marginRight: scaledSize(10),
    },
    exercise_text: {
        fontFamily: 'Mulish_800ExtraBold',
        color: '#0699FF',
        fontSize: scaledSize(15),
        flexShrink: 1,
    },
    muscle_ctnr: {
        borderRadius: scaledSize(15),
        height: scaledSize(23.5),
        paddingHorizontal: scaledSize(12),
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: scaledSize(5),
    },
    muscle_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: scaledSize(12),
        color: '#fff',
    },
    pfpContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 'auto',
        marginRight: scaledSize(10),
    },
    pfp: {
        width: scaledSize(34),
        aspectRatio: 1,
        borderRadius: scaledSize(20),
        borderWidth: scaledSize(2),
        borderColor: '#f4f4f4',
    },
    pfpOverlap: {
        marginLeft: scaledSize(-24),
    },
    labels: {
        flexDirection: 'row',
        paddingBottom: scaledSize(5),
        marginHorizontal: scaledSize(2.5),
    },
    set_ctnr: {
        marginLeft: '5%',
        width: '8%',
        alignItems: 'center',
    },
    previous_ctnr: {
        width: '38%',
        alignItems: 'center',
    },
    weight_unit_ctnr: {
        width: '18%',
        alignItems: 'center',
    },
    reps_ctnr: {
        width: '18%',
        alignItems: 'center',
    },
    label_text: {
        fontFamily: 'Mulish_800ExtraBold',
        fontSize: scaledSize(14),
    },
    add_set_btn_ctnr: {
        paddingHorizontal: scaledSize(20),
    },
    add_set_btn: {
        width: '100%',
        marginTop: scaledSize(8),
        alignSelf: 'center',
        height: scaledSize(28),
        borderRadius: scaledSize(20),
        backgroundColor: '#eaeaea',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    add_set_text: {
        fontFamily: 'Outfit_600SemiBold',
        color: '#000',
        fontSize: scaledSize(15),
        marginLeft: scaledSize(1),
        marginRight: scaledSize(5),
    },
});

