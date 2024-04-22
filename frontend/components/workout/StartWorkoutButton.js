import { StyleSheet, View, Text, TouchableOpacity } from "react-native";

export default function StartWorkoutButton({ startWorkout }) {
    return (
        <TouchableOpacity onPress={startWorkout} style={styles.main_ctnr}>
            <Text style={styles.text}>Start New Workout</Text>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        width: '100%',
        height: 35,
        marginVertical: 6,
        borderRadius: 15,
        backgroundColor: '#51B8FF',
        justifyContent: 'center',
        alignItems: 'center'
    },
    text: {
        fontSize: 16,
        fontFamily: 'SourceSansPro_600SemiBold',
        color: 'white'
    },
});