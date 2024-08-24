import React, { useState, useRef } from "react";
import { TextInput, StyleSheet, Pressable, Dimensions } from "react-native";

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // Scaling factor based on iPhone 13 height

const scaledSize = (size) => Math.round(size * scale);

export default function EditableStat({ placeholder = '0', isFinished, value, setValue }) {
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
                value={value === '0' ? '' : value.toString()}
                onChangeText={handleChangeText}
            />
        </Pressable>
    )
}

const styles = StyleSheet.create({
    editing: {
        width: scaledSize(63),
        height: scaledSize(23),
        borderRadius: scaledSize(8),
        backgroundColor: '#eee',
        alignItems: 'center',
        justifyContent: 'center',
    },
    selected: {
        borderColor: '#0699FF',
    },
    finished: {
        backgroundColor: '#DCFFDA',
    },
    text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: scaledSize(15),
    },
});
