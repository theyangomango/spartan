import { View, StyleSheet, Text, TextInput, Pressable, TouchableOpacity } from "react-native";
import { useState } from "react";
import SetRow from "./SetRow";
import { FontAwesome5 } from '@expo/vector-icons'
import DoubleSetRow from "./DoubleSetRow";

export default function ExerciseLog({ name }) {
    const canTrackBothSides = true;
    const [isTrackingBothSides, setIsTrackingBothSides] = useState(false);
    const [sets, setSets] = useState([
        { previous: '405lb x 12' }
    ]);

    function addSet() {
        setSets([...sets, {
            previous: '405lb x 12'
        }])
    }

    function handlePressTrackingBothSidesButton() {
        setIsTrackingBothSides(!isTrackingBothSides);
    }

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.header}>
                <Text style={styles.exercise_text}>{name}</Text>
                {
                    canTrackBothSides && <Pressable onPress={handlePressTrackingBothSidesButton}>
                        <View style={isTrackingBothSides ? styles.track_both_button_on_ctnr : styles.track_both_button_off_ctnr}>
                            <FontAwesome5 name='grip-lines-vertical' size={10} color={isTrackingBothSides ? '#0699FF' : '#0699FF'} />
                        </View>
                    </Pressable>
                }
            </View>
            <View style={styles.labels}>
                <View style={styles.set_ctnr}>
                    <Text style={styles.label_text}>SET</Text>
                </View>
                <View style={styles.previous_ctnr}>
                    <Text style={styles.label_text}>PREVIOUS</Text>
                </View>
                <View style={styles.weight_unit_ctnr}>
                    <Text style={styles.label_text}>LBS</Text>
                </View>
                <View style={styles.reps_ctnr}>
                    <Text style={styles.label_text}>REPS</Text>
                </View>
            </View>
            <View>
                {isTrackingBothSides ?
                    sets.map((set, index) => {
                        return (
                            <DoubleSetRow set={set} index={index} key={index} />
                        )
                    })
                    :
                    sets.map((set, index) => {
                        return (
                            <SetRow set={set} index={index} key={index} />
                        )
                    })
                }
            </View>
            <View style={styles.add_set_btn_ctnr}>
                <TouchableOpacity onPress={addSet} style={styles.add_set_btn}>
                    <Text style={styles.add_set_text}>Add Set</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        marginVertical: 16,
    },
    header: {
        flexDirection: 'row',
    },
    track_both_button_off_ctnr: {
        paddingVertical: 2,
        paddingHorizontal: 9,
        marginTop: 1,
        marginHorizontal: 8,
        borderRadius: 4,
        borderWidth: 1.2,
        borderColor: '#0699FF',
    },
    track_both_button_on_ctnr: {
        paddingVertical: 2,
        paddingHorizontal: 9,
        marginTop: 1,
        marginHorizontal: 8,
        borderRadius: 4,
        borderWidth: 1.2,
        borderColor: '#0699FF',
        backgroundColor: '#ADE4FF'
    },
    exercise_text: {
        fontFamily: 'Mulish_700Bold',
        color: '#0699FF',
        fontSize: 14,
        paddingBottom: 10,
        paddingLeft: 22,
    },
    labels: {
        flexDirection: 'row',
        paddingBottom: 8,
        paddingHorizontal: 22,
    },
    set_ctnr: {
        width: 40,
    },
    previous_ctnr: {
        width: 110,
        alignItems: 'center',
        marginRight: 10,
    },
    weight_unit_ctnr: {
        width: 70,
        alignItems: 'center'

    },
    reps_ctnr: {
        width: 70,
        alignItems: 'center',
    },
    label_text: {
        fontWeight: '500',
        fontSize: 11,
        color: '#888'
    },
    add_set_btn_ctnr: {
        paddingHorizontal: 30
    },
    add_set_btn: {
        width: '100%',
        marginTop: 8,
        alignSelf: 'center',
        height: 28,
        borderRadius: 20,
        backgroundColor: '#aaa',
        justifyContent: 'center',
        alignItems: 'center'
    },
    add_set_text: {
        fontFamily: 'Mulish_700Bold',
        color: '#fff',
        fontSize: 13,
    }
})