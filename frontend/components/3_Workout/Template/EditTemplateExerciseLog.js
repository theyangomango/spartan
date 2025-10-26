import React, { useState, useRef, useMemo } from "react";
import { View, StyleSheet, Text, Pressable, Image, Animated } from "react-native";
import scaleSize from "../../../helper/scaleSize";
import { Entypo } from '@expo/vector-icons';
import RNBounceable from "@freakycoder/react-native-bounceable";
import ExerciseOptionsPanel from "../NewWorkout/Tracking/ExerciseOptionsPanel";
import TemplateSetRow from "./TemplateSetRow";
import theme from "../../../theme/mfpDark";
import { withStrongPress } from "../../../utils/haptics";
import workoutTypography from "../shared/workoutTypography";
import ExerciseAvatar from "../../common/ExerciseAvatar";
import { computeDisplayNumbers } from "../shared/setTypeUtils";


export default function EditTemplateExerciseLog({ name, muscle, exerciseIndex, updateSets, sets, replaceExercise, deleteExercise, readOnly = false }) {
    const [isPanelVisible, setIsPanelVisible] = useState(false);
    const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0, anchorX: null });
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const optionsAnchorRef = useRef(null);

    // Muscle badge removed for Edit Template modal

    const togglePanel = (event) => {
        if (readOnly) return;
        if (isPanelVisible) {
            setIsPanelVisible(false);
            return;
        }

        const fallbackTop = scaleSize((event?.nativeEvent?.pageY ?? 0) + 25);
        const fallbackLeft = scaleSize(18);
        const openWithPosition = (pos) => {
            setPanelPosition(pos);
            setIsPanelVisible(true);
        };

        if (optionsAnchorRef.current?.measureInWindow) {
            try {
                optionsAnchorRef.current.measureInWindow((x, y, width, height) => {
                    if (typeof x === "number" && typeof y === "number" && typeof width === "number") {
                        openWithPosition({
                            top: (y || 0) + (height || 0) + scaleSize(12),
                            anchorX: (x || 0) + (width || 0) / 2,
                        });
                    } else {
                        openWithPosition({ top: fallbackTop, left: fallbackLeft, anchorX: null });
                    }
                });
            } catch {
                openWithPosition({ top: fallbackTop, left: fallbackLeft, anchorX: null });
            }
        } else {
            openWithPosition({ top: fallbackTop, left: fallbackLeft, anchorX: null });
        }
    };

    function addSet() {
        if (readOnly) return;
        updateSets(exerciseIndex, [...sets, {
            previous: '405 lb x 12',
            weight: 0,
            reps: 0,
            type: null,
        }]);
    }

    function updateSet(index, newSet) {
        if (readOnly) return;
        const newSets = [...sets];
        newSets[index] = newSet;
        updateSets(exerciseIndex, newSets);
    }

    function deleteSet(index) {
        if (readOnly) return;
        const newSets = sets.filter((_, i) => i !== index);
        updateSets(exerciseIndex, newSets);
    }

    const displayNumbers = useMemo(() => computeDisplayNumbers(sets), [sets]);

    return (
        <View style={styles.main_ctnr}>
            {!readOnly && (
                <ExerciseOptionsPanel
                    visible={isPanelVisible}
                    onClose={() => {
                        setIsPanelVisible(false);
                    }}
                    position={panelPosition}
                    replaceExercise={() => replaceExercise(exerciseIndex)}
                    deleteExercise={() => deleteExercise(exerciseIndex)}
                />
            )}
            <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                <View style={styles.nameContainer}>
                    <ExerciseAvatar name={name} size={scaleSize(42)} style={styles.avatar} />
                    <Text style={[workoutTypography.exerciseName, styles.nameText]} numberOfLines={1}>{name}</Text>
                </View>
                {!readOnly && (
                    <Pressable
                        ref={optionsAnchorRef}
                        onPress={withStrongPress(togglePanel)}
                        hitSlop={{ top: scaleSize(6), bottom: scaleSize(6), left: scaleSize(6), right: scaleSize(6) }}
                        style={styles.optionsButton}
                    >
                        <Entypo name="menu" size={scaleSize(14)} color={theme.primary} />
                    </Pressable>
                )}

                {/* <View style={styles.pfpContainer}>
                    <Image style={styles.pfp} source={{ uri: global.userData.image }} />
                    <Image style={[styles.pfp, styles.pfpOverlap]} source={{ uri: global.userData.image }} />
                    <Image style={[styles.pfp, styles.pfpOverlap]} source={{ uri: global.userData.image }} />
                </View> */}
            </Animated.View>
            <Animated.View style={[styles.labels, { opacity: fadeAnim }]}>
                <View style={styles.set_ctnr}>
                    <Text style={workoutTypography.columnLabel}>Set</Text>
                </View>
                <View style={styles.previous_ctnr}>
                    <Text style={workoutTypography.columnLabel}>Previous</Text>
                </View>
                <View style={styles.weight_unit_ctnr}>
                    <Text style={workoutTypography.columnLabel}>lbs</Text>
                </View>
                <View style={styles.reps_ctnr}>
                    <Text style={workoutTypography.columnLabel}>Reps</Text>
                </View>
            </Animated.View>
            <Animated.View style={{ opacity: fadeAnim }}>
                {sets.map((set, index) => {
                    return (
                        <TemplateSetRow
                            set={set}
                            index={index}
                            key={index}
                            updateSet={updateSet}
                            handleDelete={() => deleteSet(index)}
                            readOnly={readOnly}
                            displayNumber={displayNumbers[index]}
                        />
                    );
                })}
            </Animated.View>
            {!readOnly && (
                <Animated.View style={[styles.add_set_btn_ctnr, { opacity: fadeAnim }]}>
                    <RNBounceable activeOpacity={0.5} onPress={withStrongPress(addSet)} style={styles.add_set_btn}>
                        <Entypo name="plus" size={scaleSize(18)} color={theme.primary} />
                        <Text style={[workoutTypography.addSet, styles.add_set_text]}>Add Set</Text>
                    </RNBounceable>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        marginTop: scaleSize(16),
        marginBottom: scaleSize(6),
        position: 'relative',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: scaleSize(20),
        paddingRight: scaleSize(14),
        paddingBottom: scaleSize(10),
        marginHorizontal: scaleSize(2.5),
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: scaleSize(10),
    },
    avatar: {
        marginRight: scaleSize(10),
    },
    nameText: {
        flexShrink: 1,
    },
    optionsButton: {
        backgroundColor: theme.restPillBg,
        borderRadius: scaleSize(10),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.primaryHairline,
        height: scaleSize(26),
        width: scaleSize(32),
        justifyContent: 'center',
        alignItems: 'center',
    },
    // muscle_ctnr and muscle_text removed
    pfpContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 'auto',
        marginRight: scaleSize(10),
        opacity: 0.5
    },
    pfp: {
        width: scaleSize(34),
        aspectRatio: 1,
        borderRadius: scaleSize(20),
        borderWidth: scaleSize(2),
        borderColor: '#f4f4f4',
    },
    pfpOverlap: {
        marginLeft: scaleSize(-24),
    },
    labels: { flexDirection: 'row', paddingBottom: scaleSize(5), marginHorizontal: scaleSize(2.5) },
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
    add_set_btn_ctnr: {
        paddingHorizontal: scaleSize(20),
    },
    add_set_btn: {
        width: '100%',
        marginTop: scaleSize(8),
        alignSelf: 'center',
        height: scaleSize(30),
        borderRadius: scaleSize(20),
        backgroundColor: theme.addSetBg,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    add_set_text: { marginLeft: scaleSize(1), marginRight: scaleSize(5) },
});
