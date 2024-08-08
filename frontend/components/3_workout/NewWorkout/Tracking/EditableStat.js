import React, { useState, useRef } from "react";
import { TextInput, StyleSheet, Pressable } from "react-native";

export default function EditableStat({ placeholder = '0', isFinished, value, setValue }) {
    const [isSelected, setIsSelected] = useState(false);
    const inputRef = useRef(null);

    console.log(value)

    return (
        <Pressable
            onPress={() => {
                inputRef.current.focus();
                setIsSelected(true);
            }}
            style={[
                styles.editing,
                isFinished && styles.finished,
                isSelected && styles.selected
            ]}
        >
            <TextInput
                ref={inputRef}
                editable
                keyboardType="numeric"
                placeholder={placeholder}
                placeholderTextColor={isFinished ? '#000' : '#888'}
                onFocus={() => setIsSelected(true)}
                onEndEditing={() => setIsSelected(false)}
                style={styles.text}
                value={value == 0 ? '' : value.toString()}
                onChangeText={setValue}
            />
        </Pressable>
    )
}

const styles = StyleSheet.create({
    editing: {
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
        backgroundColor: '#DCFFDA'
    },
    text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 15
    },
});
