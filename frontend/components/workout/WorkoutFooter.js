import { StyleSheet, View, Text, Pressable, TouchableOpacity } from "react-native";

export default function WorkoutFooter({ userData }) {
    return (
        <TouchableOpacity onPress={() => global.openWorkoutModal(userData)} style={styles.main_ctnr}>
            <Text style={styles.text}>Morning Workout</Text>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        height: 30,
        backgroundColor: '#0699FF',
        justifyContent: 'center',
        alignItems: 'center'
    },
    text: {
        fontFamily: 'Mulish_700Bold',
        color: '#fff'
    }
});