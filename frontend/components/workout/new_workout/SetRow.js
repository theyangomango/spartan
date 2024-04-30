import { Pressable, StyleSheet, Text, View } from "react-native";
import EditableStat from "./EditableStat";
import { MaterialIcons } from '@expo/vector-icons'
import { useState } from "react";

export default function SetRow({ set, index }) {
    const [isDone, setIsDone] = useState(false);

    function toggleDone() {
        setIsDone(!isDone);
    }

    return (
        <View style={[styles.stat_row, isDone && styles.done]} key={index}>
            <View style={styles.set_ctnr}>
                <Text style={styles.set_number_text}>{index + 1}</Text>
            </View>
            <View style={styles.previous_ctnr}>
                <Text style={styles.previous_stat_text}>{set.previous}</Text>
            </View>
            <View style={styles.weight_unit_ctnr}>
                <EditableStat isFinished={isDone} />
            </View>
            <View style={styles.reps_ctnr}>
                <EditableStat isFinished={isDone} />
            </View>
            <View style={styles.checkmark_ctnr}>
                <Pressable onPress={toggleDone}>
                    <MaterialIcons name="done" size={16} style={styles.checkmark} />
                </Pressable>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    stat_row: {
        flexDirection: 'row'
    },
    done: {
        backgroundColor: '#B5F8C2'
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
    set_number_text: {
        fontFamily: 'Mulish_300Light',
        color: '#0699FF',
        paddingVertical: 6
    },
    previous_stat_text: {
        fontFamily: 'Mulish_500Medium',
        paddingVertical: 6,
        color: '#bbb'
    },
    weight_unit_stat_text: {
        fontFamily: 'Mulish_700Bold',
        paddingVertical: 6,
    },
    reps_number_text: {
        fontFamily: 'Mulish_700Bold',
        paddingVertical: 6,
    },
    checkmark_ctnr: {
        flex: 1,
        alignItems: 'flex-end'
    },
    checkmark: {
        paddingHorizontal: 6,
        paddingVertical: 1.25,
        borderWidth: 0.8,
        borderColor: '#aaa',
        borderRadius: 5,
        marginVertical: 6
    }
});