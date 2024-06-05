import { StyleSheet, View, Text, TouchableOpacity } from "react-native";

export default function JoinWorkoutButton({ joinWorkout }) {
    return (
        <TouchableOpacity onPress={joinWorkout} style={styles.main_ctnr}>
            <Text style={styles.text}>Join Workout</Text>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        width: '100%',
        height: 35,
        marginVertical: 6,
        borderRadius: 15,
        backgroundColor: '#EAC435',
        justifyContent: 'center',
        alignItems: 'center'
    },
    text: {
        fontSize: 16,
        fontFamily: 'SourceSansPro_600SemiBold',
        color: 'white'
    },
});