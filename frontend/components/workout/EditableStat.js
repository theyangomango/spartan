import { useState } from "react";
import { TextInput, StyleSheet, View } from "react-native";

export default function EditableStat({ placeholder = '0', isFinished }) {
    const [isSelected, setIsSelected] = useState(false);
    const [value, setValue] = useState(placeholder);

    return (
        <View style={[isFinished ? styles.finished : styles.editing, isSelected && styles.selected]}>
            <TextInput
                editable
                placeholder='0'
                onFocus={setIsSelected}
                onEndEditing={() => setIsSelected(false)}
                style={styles.text}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    editing: {
        paddingVertical: 2,
        marginVertical: 3,
        paddingHorizontal: 16,
        borderWidth: 1.5,
        borderRadius: 10,
        borderColor: '#aaa',
        backgroundColor: '#f6f6f6'
    },
    selected: {
        borderColor: '#0699FF'
    },
    finished: {
        paddingVertical: 3,
        marginVertical: 3.5,
        paddingHorizontal: 16,
    },
    text: {
        fontFamily: 'Mulish_700Bold',
    }
});