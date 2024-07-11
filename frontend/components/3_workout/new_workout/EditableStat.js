import { useState } from "react";
import { TextInput, StyleSheet, View } from "react-native";

export default function EditableStat({ placeholder = '0', isFinished }) {
    const [isSelected, setIsSelected] = useState(false);
    const [value, setValue] = useState(placeholder);

    return (
        <View style={[styles.editing, isFinished && styles.finished, isSelected && styles.selected]}>
            <TextInput
                editable
                keyboardType="numeric"
                placeholder='0'
                placeholderTextColor={isFinished ? '#000' : '#888'}
                onFocus={setIsSelected}
                onEndEditing={() => setIsSelected(false)}
                style={styles.text}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    editing: {
        // paddingVertical: 2,
        // marginVertical: 3,
        // paddingHorizontal: 18,
        width: 63,
        height: 23,
        borderRadius: 8,
        backgroundColor: '#eee',
        alignItems: 'center',
        justifyContent: 'center'
    },

    selected: {
        borderColor: '#0699FF'
    },
    finished: {
        // paddingBottom: 0.5
        // paddingVertical: 3,
        // marginVertical: 3,
        // paddingHorizontal: 16,
        backgroundColor: '#DCFFDA'
    },
    text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 15
    },
});