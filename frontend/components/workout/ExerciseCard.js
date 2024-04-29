import { StyleSheet, Text, View } from 'react-native'
import React from 'react'

export default function ExerciseCard() {
    return (
        <View style={styles.card}>
            <Text style={styles.exercise_name_text}>Laterial Raise</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        borderBottomWidth: 0.4,
        borderColor: '#aaa',
        height: 50,
        paddingHorizontal: 10,
        paddingVertical: 4
    },
    exercise_name_text: {
        fontFamily: 'Mulish_700Bold',
        fontSize: 15
    }
});
