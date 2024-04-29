import { View, StyleSheet, Text, TextInput, Pressable } from "react-native";
import { useState } from "react";
import SetRow from "./SetRow";

export default function ExerciseLog({ name }) {
    const [sets, setSets] = useState([
        { previous: '405lb x 12' }
    ]);

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.header}>
                <Text style={styles.exercise_text}>{name}</Text>
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
                {
                    sets.map((set, index) => {
                        return (
                            <SetRow set={set} index={index} key={index} />
                        )
                    })
                }
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        marginVertical: 16
    },
    exercise_text: {
        fontFamily: 'Mulish_700Bold',
        color: '#0699FF',
        fontSize: 14,
        paddingBottom: 10,
    },
    labels: {
        flexDirection: 'row',
    },
    set_ctnr: {
        width: 50,
    },
    previous_ctnr: {
        width: 100,
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
})