import React, { useState, useRef } from "react";
import { View, StyleSheet, Text, Pressable, Image, Animated, Dimensions } from "react-native";
import scaleSize from "../../../helper/scaleSize";
import { Entypo } from '@expo/vector-icons';
import RNBounceable from "@freakycoder/react-native-bounceable";
import ExerciseOptionsPanel from "../NewWorkout/Tracking/ExerciseOptionsPanel";
import TemplateSetRow from "./TemplateSetRow";
import theme from "../../../theme/mfpDark";

const { height: screenHeight } = Dimensions.get('window');
const scaledSize = (size) => scaleSize(size);

export default function EditTemplateExerciseLog({ name, muscle, exerciseIndex, updateSets, sets, replaceExercise, deleteExercise }) {
    const [isPanelVisible, setIsPanelVisible] = useState(false);
    const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });
    const fadeAnim = useRef(new Animated.Value(1)).current;

    // Muscle badge removed for Edit Template modal

    const togglePanel = (event) => {
        if (isPanelVisible) {
            setIsPanelVisible(false);
        } else {
            setIsPanelVisible(true);
            setPanelPosition({
                top: scaleSize(event.nativeEvent.pageY + 25),
                left: scaleSize(scaledSize(18))
            });
        }
    };

    function addSet() {
        updateSets(exerciseIndex, [...sets, {
            previous: '405 lb x 12',
            weight: 0,
            reps: 0,
            type: null,
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
                </Pressable>

                {/* <View style={styles.pfpContainer}>
                    <Image style={styles.pfp} source={{ uri: global.userData.image }} />
                    <Image style={[styles.pfp, styles.pfpOverlap]} source={{ uri: global.userData.image }} />
                    <Image style={[styles.pfp, styles.pfpOverlap]} source={{ uri: global.userData.image }} />
                </View> */}
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
                    <Entypo name="plus" size={scaledSize(18)} color={theme.primary} />
                    <Text style={styles.add_set_text}>Add Set</Text>
                </RNBounceable>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        marginTop: scaleSize(scaledSize(16)),
        marginBottom: scaleSize(scaledSize(6)),
        position: 'relative',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: scaleSize(scaledSize(20)),
        paddingBottom: scaleSize(scaledSize(10)),
        marginHorizontal: scaleSize(scaledSize(2.5)),
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
        marginRight: scaleSize(scaledSize(10)),
    },
    exercise_text: { fontFamily: 'Mulish_800ExtraBold', color: theme.primary, fontSize: scaleSize(15), flexShrink: 1 },
    // muscle_ctnr and muscle_text removed
    pfpContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 'auto',
        marginRight: scaleSize(scaledSize(10)),
        opacity: 0.5
    },
    pfp: {
        width: scaleSize(scaledSize(34)),
        aspectRatio: 1,
        borderRadius: scaleSize(scaledSize(20)),
        borderWidth: scaleSize(scaledSize(2)),
        borderColor: '#f4f4f4',
    },
    pfpOverlap: {
        marginLeft: scaleSize(scaledSize(-24)),
    },
    labels: { flexDirection: 'row', paddingBottom: scaleSize(scaledSize(5)), marginHorizontal: scaleSize(scaledSize(2.5)) },
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
    label_text: { fontFamily: 'Mulish_800ExtraBold', fontSize: scaleSize(15), color: theme.textPrimary },
    add_set_btn_ctnr: {
        paddingHorizontal: scaleSize(scaledSize(20)),
    },
    add_set_btn: {
        width: '100%',
        marginTop: scaleSize(scaledSize(8)),
        alignSelf: 'center',
        height: scaleSize(scaledSize(30)),
        borderRadius: scaleSize(scaledSize(20)),
        backgroundColor: theme.restPillBg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.primaryHairline,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    add_set_text: { fontFamily: 'Outfit_600SemiBold', color: theme.textPrimary, fontSize: scaleSize(15), marginLeft: scaleSize(scaledSize(1)), marginRight: scaleSize(scaledSize(5)) },
});
