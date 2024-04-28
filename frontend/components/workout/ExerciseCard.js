import { View, StyleSheet, Text, TextInput } from "react-native";
import { MaterialIcons } from '@expo/vector-icons'
import EditableStat from "./EditableStat";

export default function ExerciseCard() {
    return (
        <View style={styles.main_ctnr}>
            <View style={styles.header}>
                <Text style={styles.exercise_text}>Bench Press</Text>
            </View>
            <View style={styles.columns}>
                <View style={styles.set_ctnr}>
                    <Text style={styles.set_text}>SET</Text>
                    <View>
                        <Text style={styles.set_number_text}>1</Text>
                        <Text style={styles.set_number_text}>2</Text>
                        <Text style={styles.set_number_text}>3</Text>
                    </View>
                </View>
                <View style={styles.previous_ctnr}>
                    <Text style={styles.previous_text}>PREVIOUS</Text>
                    <Text style={styles.previous_stat_text}>405lbs x 12</Text>
                    <Text style={styles.previous_stat_text}>405lbs x 12</Text>
                    <Text style={styles.previous_stat_text}>405lbs x 12</Text>
                </View>
                <View style={styles.weight_unit_ctnr}>
                    <Text style={styles.weight_unit_text}>LBS</Text>
                    <EditableStat isFinished={false} />
                    <EditableStat isFinished={false} />
                    <EditableStat isFinished={false} />
                </View>
                <View style={styles.reps_ctnr} >
                    <Text style={styles.reps_text}>REPS</Text>
                    <EditableStat isFinished={false} />
                    <EditableStat isFinished={false} />
                    <EditableStat isFinished={false} />
                </View>
                <View style={styles.checkmarks_ctnr}>
                    <View style={styles.checkmark_ctnr}>
                        <MaterialIcons name="done" size={15} />
                    </View>
                    <View style={styles.checkmark_ctnr}>
                        <MaterialIcons name="done" size={15} />
                    </View>
                    <View style={styles.checkmark_ctnr}>
                        <MaterialIcons name="done" size={15} />
                    </View>
                </View>
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
    columns: {
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
        alignItems: 'center'
    },
    set_text: {
        fontWeight: '500',
        fontSize: 11,
        color: '#888'
    },
    previous_text: {
        fontWeight: '500',
        fontSize: 11,
        color: '#888'
    },
    weight_unit_text: {
        fontWeight: '500',
        fontSize: 11,
        color: '#888'
    },
    reps_text: {
        fontWeight: '500',
        fontSize: 11,
        color: '#888'
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
    checkmarks_ctnr: {
        paddingTop: 13,
        flex: 1,
        alignItems: 'flex-end',
    },
    checkmark_ctnr: {
        paddingHorizontal: 6,
        paddingVertical: 1.25,
        borderWidth: 0.8,
        borderColor: '#aaa',
        borderRadius: 5,
        marginVertical: 5
    }
})