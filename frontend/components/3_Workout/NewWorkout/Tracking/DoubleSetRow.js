import { Pressable, StyleSheet, Text, View } from "react-native";
import EditableStat from "./EditableStat";
import { Ionicons } from '@expo/vector-icons'
import { useState } from "react";

import scaleSize from "../../../../helper/scaleSize";

export default function DoubleSetRow({ set, index }) {
    const [isDoneLeft, setIsDoneLeft] = useState(false);
    const [isDoneRight, setIsDoneRight] = useState(false);

    function toggleDoneLeft() {
        setIsDoneLeft(!isDoneLeft);
    }

    function toggleDoneRight() {
        setIsDoneRight(!isDoneRight);
    }

    return (
        <View key={index}>
            <View style={[styles.stat_row, isDoneLeft && styles.done]} >
                <View style={styles.set_ctnr}>
                    <Text style={styles.set_number_text}>{index + 1}  L</Text>
                </View>
                <View style={styles.previous_ctnr}>
                    <Text style={styles.previous_stat_text}>{set.previous}</Text>
                </View>
                <View style={styles.weight_unit_ctnr}>
                    <EditableStat isFinished={isDoneLeft} />
                </View>
                <View style={styles.reps_ctnr}>
                    <EditableStat isFinished={isDoneLeft} />
                </View>
                <View style={styles.done_ctnr}>
                    <Pressable style={isDoneLeft ? styles.checkmark_ctnr_selected : styles.checkmark_ctnr} onPress={toggleDoneLeft}>
                        <Ionicons name="checkmark-sharp" size={16} style={styles.checkmark} color={isDoneLeft ? '#fff' : '#444'} />
                    </Pressable>
                </View>
            </View>
            <View style={[styles.stat_row, isDoneRight && styles.done]}>
                <View style={styles.set_ctnr}>
                    <Text style={styles.set_number_text_right}>R</Text>
                </View>
                <View style={styles.previous_ctnr}>
                    <Text style={styles.previous_stat_text}>{set.previous}</Text>
                </View>
                <View style={styles.weight_unit_ctnr}>
                    <EditableStat isFinished={isDoneRight} />
                </View>
                <View style={styles.reps_ctnr}>
                    <EditableStat isFinished={isDoneRight} />
                </View>
                <View style={styles.done_ctnr}>
                    <Pressable style={isDoneRight ? styles.checkmark_ctnr_selected : styles.checkmark_ctnr} onPress={toggleDoneRight}>
                        <Ionicons name="checkmark-sharp" size={16} style={styles.checkmark} color={isDoneRight ? '#fff' : '#444'} />
                    </Pressable>
                </View>
            </View>
        </View>

    )
}

const styles = StyleSheet.create({
    stat_row: {
        flexDirection: 'row',
        paddingVertical: scaleSize(1.4),
        paddingHorizontal: scaleSize(22),
    },
    done: {
        backgroundColor: '#D4FFDC'
    },
    set_ctnr: {
        width: scaleSize(40),
        paddingLeft: scaleSize(5),
    },
    previous_ctnr: {
        width: scaleSize(110),
        alignItems: 'center',
        marginRight: scaleSize(10),
    },
    weight_unit_ctnr: {
        width: scaleSize(70),
        alignItems: 'center'

    },
    reps_ctnr: {
        width: scaleSize(70),
        alignItems: 'center',
    },
    set_number_text: {
        fontFamily: 'Mulish_300Light',
        color: '#0699FF',
        paddingVertical: scaleSize(6)
    },
    set_number_text_right: {
        fontFamily: 'Mulish_300Light',
        color: '#0699FF',
        paddingVertical: scaleSize(6),
        textAlign: 'right',
        paddingRight: scaleSize(10.5)
    },
    previous_stat_text: {
        fontFamily: 'Mulish_600SemiBold',
        paddingVertical: scaleSize(6),
        color: '#bbb'
    },
    weight_unit_stat_text: {
        fontFamily: 'Mulish_700Bold',
        paddingVertical: scaleSize(6),
    },
    reps_number_text: {
        fontFamily: 'Mulish_700Bold',
        paddingVertical: scaleSize(6),
    },
    done_ctnr: {
        flex: 1,
        alignItems: 'flex-end',
        justifyContent: 'center'
    },
    checkmark_ctnr: {
        paddingHorizontal: scaleSize(9),
        paddingVertical: scaleSize(3),
        borderRadius: scaleSize(8),
        backgroundColor: '#f3f3f3',
    },
    checkmark_ctnr_selected: {
        paddingHorizontal: scaleSize(9),
        paddingVertical: scaleSize(3),
        borderRadius: scaleSize(8),
        backgroundColor: '#93F7A7',
    }
});