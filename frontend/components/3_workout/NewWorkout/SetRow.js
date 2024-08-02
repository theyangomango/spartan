import { Pressable, StyleSheet, Text, View } from "react-native";
import EditableStat from "./Tracking/EditableStat";
import { Ionicons, FontAwesome6 } from '@expo/vector-icons'
import { useState } from "react";

export default function SetRow({ set, updateSet, index }) {
    const [isDone, setIsDone] = useState(false);
    const [weight, setWeight] = useState(set.weight);
    const [reps, setReps] = useState(set.reps);

    function toggleDone() {
        if (!isDone) {
            updateSet(index, { previous: '405 lb x 12', weight: weight, reps: reps });
        }

        setIsDone(!isDone);
    }

    return (
        <View style={[styles.stat_row, isDone && styles.done]} key={index}>
            <View style={[styles.set_ctnr, isDone && { backgroundColor: '#DCFFDA' }]}>
                <Text style={styles.set_number_text}>{index + 1}</Text>
            </View>
            <View style={styles.previous_ctnr}>
                <Text style={[styles.previous_stat_text, , isDone && { color: '#afafaf' }]}>{set.previous}</Text>
            </View>
            <View style={styles.weight_unit_ctnr}>
                <EditableStat isFinished={isDone} value={weight} setValue={(value) => setWeight(parseInt(value))}/>
            </View>
            <View style={styles.reps_ctnr}>
                <EditableStat isFinished={isDone} value={reps} setValue={(value) => setReps(parseInt(value))}/>
            </View>
            <View style={styles.done_ctnr}>
                <Pressable style={isDone ? styles.checkmark_ctnr_selected : styles.checkmark_ctnr} onPress={toggleDone}>
                    <FontAwesome6 name="check" size={14} style={styles.checkmark} color={isDone ? '#fff' : '#444'} />
                </Pressable>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    stat_row: {
        flexDirection: 'row',
        paddingVertical: 8,
        alignItems: 'center',
    },
    done: {
        backgroundColor: '#DCFFDA'
    },
    set_ctnr: {
        marginLeft: '5%',
        width: '8%',
        height: 21,
        borderRadius: 6,
        backgroundColor: '#eaeaea',
        alignItems: 'center',
        justifyContent: 'center',
    },
    previous_ctnr: {
        width: '38%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    weight_unit_ctnr: {
        width: '18%',
        alignItems: 'center',
    },
    reps_ctnr: {
        width: '18%',
        alignItems: 'center',
    },
    set_number_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 14,
    },
    previous_stat_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 15,
        // paddingVertical: 6,
        color: '#ccc'
    },
    done_ctnr: {
        width: '10.5%',
        height: 22,
        alignItems: 'center',
    },
    checkmark_ctnr: {
        paddingHorizontal: 10,
        height: '100%',
        borderRadius: 7,
        backgroundColor: '#eee',
        justifyContent: 'center'
    },
    checkmark_ctnr_selected: {
        paddingHorizontal: 8,
        height: '100%',
        borderRadius: 7,
        justifyContent: 'center',
        backgroundColor: '#58DD6F',
    }
});