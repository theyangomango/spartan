import React, { useState, useRef } from "react";
import { TextInput, StyleSheet, Pressable } from "react-native";

export default function TemplateEditableStat({ placeholder = '0', value, setValue }) {
    const [isSelected, setIsSelected] = useState(false);
    const inputRef = useRef(null);

    const handleChangeText = (text) => {
        // If the text is empty, set the value to 0
        if (text === '') {
            setValue('0');
            return;
        }

        // Remove non-numeric characters (except for a decimal point)
        const numericValue = text.replace(/[^0-9.]/g, '');

        // Prevent multiple decimals
        const validValue = numericValue.split('.').length > 2
            ? numericValue.slice(0, -1)
            : numericValue;

        setValue(validValue);
    };

    return (
        <Pressable
            onPress={() => {
                inputRef.current.focus();
                setIsSelected(true);
            }}
            style={[
                styles.editing,
                isSelected && styles.selected
            ]}
        >
            <TextInput
                ref={inputRef}
                editable
                keyboardType="numeric"
                placeholder={placeholder}
                placeholderTextColor={'#888'}
                onFocus={() => setIsSelected(true)}
                onEndEditing={() => setIsSelected(false)}
                style={styles.text}
                value={value === '0' ? '' : value.toString()}
                onChangeText={handleChangeText}
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
