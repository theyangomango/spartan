import React, { useState, useRef } from "react";
import { TextInput, StyleSheet, Pressable, Dimensions } from "react-native";

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // Scaling factor based on iPhone 13 height

const scaledSize = (size) => Math.round(size * scale);

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
        let numericValue = text.replace(/[^0-9.]/g, '');

        // Prevent multiple decimals
        if (numericValue.split('.').length > 2) {
            numericValue = numericValue.slice(0, -1);
        }

        // Ensure the value doesn't exceed 999
        let parsedValue = parseFloat(numericValue);
        if (parsedValue >= 1000) {
            setValue('999');
        } else {
            // Limit to one decimal place if there's a decimal
            if (numericValue.includes('.')) {
                const [wholePart, decimalPart] = numericValue.split('.');
                numericValue = `${wholePart}.${decimalPart.slice(0, 1)}`;
            }
            setValue(numericValue);
        }
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
        width: scaledSize(63),
        height: scaledSize(23),
        borderRadius: scaledSize(8),
        backgroundColor: '#eee',
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
        flex: 1,
        textAlign: 'center'
    },
});
