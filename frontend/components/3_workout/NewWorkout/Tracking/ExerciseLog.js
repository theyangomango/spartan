import { View, StyleSheet, Text, Pressable, Image } from "react-native";
import { useEffect, useState } from "react";
import SetRow from "./SetRow";
import { FontAwesome5, MaterialCommunityIcons, Entypo } from '@expo/vector-icons';
import RNBounceable from "@freakycoder/react-native-bounceable";

export default function ExerciseLog({ name, exerciseIndex, updateSets, initialSets }) {
    const muscle = name === 'Lateral Raise' ? 'Shoulders' : 'Chest';

    const [isTrackingBothSides, setIsTrackingBothSides] = useState(false);
    const [sets, setSets] = useState(initialSets.length === 0 ? [
        {
            previous: '405 lb x 12',
            weight: 0,
            reps: 0
        }
    ] : initialSets);

    const muscleColors = {
        Chest: '#FFAFB8',
        Shoulders: '#A1CDEE',
        Biceps: '#CBBCFF',
        Back: '#95E0C8'
    };

    useEffect(() => {
        updateSets(exerciseIndex, sets);
    }, [sets]);

    function addSet() {
        setSets([...sets, {
            previous: '405 lb x 12',
            weight: 0,
            reps: 0
        }]);
    }

    function updateSet(index, newSet) {
        const newSets = [...sets];
        newSets[index] = newSet;
        setSets(newSets);
        updateSets(exerciseIndex, newSets);
    }

    function deleteSet(index) {
        const newSets = sets.filter((_, i) => i !== index);
        setSets(newSets);
        updateSets(exerciseIndex, newSets);
    }

    return (
        <Pressable>
            <View style={styles.main_ctnr}>
                <View style={styles.header}>
                    <View style={styles.nameContainer}>
                        <Text style={styles.exercise_text} numberOfLines={1}>{name}</Text>
                        <View style={[styles.muscle_ctnr, { backgroundColor: muscleColors[muscle] }]}>
                            <Text style={styles.muscle_text}>{muscle}</Text>
                        </View>
                    </View>
                    <View style={styles.pfpContainer}>
                        <Image style={styles.pfp} source={{ uri: global.userData.image }} />
                        <Image style={[styles.pfp, styles.pfpOverlap]} source={{ uri: global.userData.image }} />
                        <Image style={[styles.pfp, styles.pfpOverlap]} source={{ uri: global.userData.image }} />
                    </View>
                </View>
                <View style={styles.labels}>
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
                </View>
                <View>
                    {sets.map((set, index) => {
                        return (
                            <SetRow set={set} index={index} key={index} updateSet={updateSet} handleDelete={() => deleteSet(index)} />
                        );
                    })}
                </View>
                <View style={styles.add_set_btn_ctnr}>
                    <RNBounceable activeOpacity={0.5} onPress={addSet} style={styles.add_set_btn}>
                        <Entypo name="plus" size={18} color={'#000'} />
                        <Text style={styles.add_set_text}>Add Set</Text>
                        <MaterialCommunityIcons name="arm-flex" size={20} color={'#aaa'} />
                    </RNBounceable>
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        marginTop: 16,
        marginBottom: 6,
        // marginHorizontal: 2.5,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 20,
        paddingBottom: 10,
        marginHorizontal: 2.5,
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
        marginRight: 10,
    },
    exercise_text: {
        fontFamily: 'Mulish_800ExtraBold',
        color: '#0699FF',
        fontSize: 15,
        flexShrink: 1,
    },
    muscle_ctnr: {
        borderRadius: 15,
        height: 23.5,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 5,
    },
    muscle_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 12,
        color: '#fff'
    },
    pfpContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 'auto',
        marginRight: 10,
    },
    pfp: {
        width: 34,
        aspectRatio: 1,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#f4f4f4',
    },
    pfpOverlap: {
        marginLeft: -24,
    },
    labels: {
        flexDirection: 'row',
        paddingBottom: 5,
        marginHorizontal: 2.5,
    },
    set_ctnr: {
        marginLeft: '5%',
        width: '8%',
        alignItems: 'center'
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
        fontSize: 14,
    },
    add_set_btn_ctnr: {
        paddingHorizontal: 20,
    },
    add_set_btn: {
        width: '100%',
        marginTop: 8,
        alignSelf: 'center',
        height: 28,
        borderRadius: 20,
        backgroundColor: '#eaeaea',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row'
    },
    add_set_text: {
        fontFamily: 'Outfit_600SemiBold',
        color: '#000',
        fontSize: 15,
        marginLeft: 1,
        marginRight: 5
    }
});
