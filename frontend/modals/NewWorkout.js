import { StyleSheet, View, Text, Modal } from "react-native";

export default function NewWorkout() {
    return (
        <View style={styles.main_ctnr}>
            <View style={styles.header}>
                <View style={styles.cancel_btn}>
                    <Text style={styles.cancel_btn_text}>Cancel</Text>
                </View>
                <View style={styles.finish_btn}>
                    <Text style={styles.finish_btn_text}>Finish</Text>
                </View>
            </View>

            <View>
                <Text style={styles.title_text}>April 20th Workout</Text>
                <Text style={styles.stopwatch_text}>12:15</Text>
            </View>

            <View>
            </View>

            <View style={styles.add_exercise_btn}>
                <Text style={styles.add_exercise_text}>Add Exercise</Text>
            </View>

        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: '#fff',
        paddingHorizontal: 20,
    },
    header: {
        height: 40,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between'
    },
    cancel_btn: {
        width: 70,
        height: 30,
        borderRadius: 6,
        backgroundColor: '#E34040',
        justifyContent: 'center',
        alignItems: 'center'
    },
    cancel_btn_text: {
        fontFamily: 'Lato_700Bold',
        fontSize: 14,
        color: 'white',
    },
    finish_btn: {
        width: 70,
        height: 30,
        borderRadius: 6,
        backgroundColor: '#51c971',
        justifyContent: 'center',
        alignItems: 'center'
    },
    finish_btn_text: {
        fontFamily: 'Lato_700Bold',
        fontSize: 14,
        color: 'white',
    },
    title_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 22,
        paddingTop: 40
    },
    stopwatch_text: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 18,
        color: '#888'
    },

    add_exercise_btn: {
        width: '100%',
        height: 35,
        marginVertical: 16,
        borderRadius: 15,
        backgroundColor: '#51B8FF',
        justifyContent: 'center',
        alignItems: 'center'
    },
    add_exercise_text: {
        fontSize: 16,
        fontFamily: 'SourceSansPro_600SemiBold',
        color: 'white'
    }
});