import { StyleSheet, View, Text, Pressable, ScrollView } from "react-native";
import ExerciseCard from "./ExerciseCard";

export default function SelectExerciseModal({ closeModal }) {

    return (
        <View style={styles.modal_outside}>
            <Pressable onPress={() => closeModal()} style={styles.outside_pressable} />
            <View style={styles.main_ctnr}>
                <ScrollView>
                    <ExerciseCard />
                    <ExerciseCard />
                    <ExerciseCard />
                    <ExerciseCard />
                </ScrollView>
            </View>
            <Pressable onPress={() => closeModal()} style={styles.outside_pressable} />
        </View>
    );
}

const styles = StyleSheet.create({
    modal_outside: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)'
    },
    outside_pressable: {
        flex: 1,
        width: '100%',
    },
    main_ctnr: {
        width: '85%',
        height: '80%',
        backgroundColor: '#fff',
        borderRadius: 20,

        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 3,
        padding: 10
    },
});
