import { Pressable, StyleSheet, Text, View } from 'react-native'
import React, { useState } from 'react'

export default function ExerciseCard({ name, selectExercise, deselectExercise }) {
    const [isSelected, setIsSelected] = useState(false);

    function toggleSelected() {
        if (isSelected) {
            deselectExercise(name);
        } else {
            selectExercise(name);
        }
        setIsSelected(!isSelected);
    }

    return (
        <Pressable onPress={toggleSelected} style={[styles.card, isSelected && styles.selected]}>
            <View style={styles.tighter_ctnr}>
                <Text style={styles.exercise_name_text}>{name}</Text>
            </View>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        height: 50,
        paddingHorizontal: 10,
    },
    tighter_ctnr: {
        flex: 1,
        paddingVertical: 5,
        borderBottomWidth: 0.4,
        borderColor: '#aaa',
    },
    selected: {
        backgroundColor: '#E1F0FF'
    },
    exercise_name_text: {
        fontFamily: 'Mulish_700Bold',
        fontSize: 15
    }
});
