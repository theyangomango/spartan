import { Pressable, StyleSheet, Text, View } from "react-native";
import EditableStat from "./EditableStat";
import { Ionicons, FontAwesome6 } from '@expo/vector-icons'
import { useState } from "react";

export default function SetRow({ set, index }) {
    const [isDone, setIsDone] = useState(false);

    function toggleDone() {
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
                <EditableStat isFinished={isDone} />
            </View>
            <View style={styles.reps_ctnr}>
                <EditableStat isFinished={isDone} />
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
        // paddingHorizontal: 22,
        // marginVertical: 7,
        paddingVertical: 7,
        // backgroundColor: 'red'
        // borderWidth: 1,
        alignItems: 'center',

    },
    done: {
        // flexDirection: 'row',
        // // paddingHorizontal: 22,
        // paddingVertical: 7,
        // // backgroundColor: 'red'
        // // borderWidth: 1,
        // alignItems: 'center',
        backgroundColor: '#DCFFDA'
    },
    set_ctnr: {
        marginLeft: 20,
        marginRight: 5,
        width: 30,
        height: 21,
        borderRadius: 6,
        backgroundColor: '#eaeaea',
        // paddingLeft: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    previous_ctnr: {
        width: 165,
        alignItems: 'center',
        justifyContent: 'center',
        // borderWidth: 1
        // marginRight: 10,
        // backgroundColor: 'green'

    },
    weight_unit_ctnr: {
        width: 75,
        alignItems: 'center',
        // backgroundColor: 'red'
    },
    reps_ctnr: {
        width: 75,
        alignItems: 'center',
    },
    set_number_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 14,
        // backgroundColor: '#ccc',

        // color: '#0699FF',
        // paddingVertical: 3,

    },
    previous_stat_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 15,
        // paddingVertical: 6,
        color: '#ccc'
    },
    // weight_unit_stat_text: {
    //     fontFamily: 'Mulish_700Bold',
    //     paddingVertical: 6,
    // },
    // reps_number_text: {
    //     fontFamily: 'Mulish_700Bold',
    //     paddingVertical: 6,
    // },
    done_ctnr: {
        width: 36,
        height: 22,
        marginLeft: 6,
        alignItems: 'center',
    },
    checkmark_ctnr: {
        paddingHorizontal: 8,
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