import React, { useState, useRef } from "react";
import { TextInput, StyleSheet, Pressable, Dimensions, Keyboard, Platform, InputAccessoryView, View, Text } from "react-native";

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // Scaling factor based on iPhone 13 height

const scaledSize = (size) => Math.round(size * scale);

export default function EditableStat({ placeholder = '0', isFinished, value, setValue, onFocus }) {
    const [isSelected, setIsSelected] = useState(false);
    const inputRef = useRef(null);
    const accessoryIdRef = useRef(`statAccessory_${Math.random().toString(36).slice(2, 9)}`);

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

    const handlePress = () => {
        if (inputRef.current) {
            inputRef.current.focus(); // Ensure the input gains focus immediately
        }
        setIsSelected(true); // Mark the input as selected
    };

    return (
        <>
            <Pressable
                onPress={handlePress}
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
                    onFocus={() => { setIsSelected(true); try { onFocus?.(); } catch {} }}
                    onBlur={() => setIsSelected(false)}
                    style={styles.text}
                    value={value === '0' ? '' : value.toString()}
                    onChangeText={handleChangeText}
                    blurOnSubmit={false}
                    inputAccessoryViewID={Platform.OS === 'ios' ? accessoryIdRef.current : undefined}
                    returnKeyType={Platform.OS === 'android' ? 'done' : 'default'}
                    onSubmitEditing={() => Keyboard.dismiss()}
                />
            </Pressable>

            {Platform.OS === 'ios' && (
                <InputAccessoryView nativeID={accessoryIdRef.current}>
                    <View style={styles.accessoryBar}>
                        <View style={{ flex: 1 }} />
                        <Pressable onPress={() => Keyboard.dismiss()} style={styles.accessoryBtn} hitSlop={8}>
                            <Text style={styles.accessoryBtnText}>Hide</Text>
                        </Pressable>
                    </View>
                </InputAccessoryView>
            )}
        </>
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
    accessoryBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scaledSize(12),
        paddingVertical: scaledSize(8),
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: '#D1D5DB',
        backgroundColor: '#F8FAFC',
    },
    accessoryBtn: {
        backgroundColor: '#E5E7EB',
        paddingHorizontal: scaledSize(12),
        paddingVertical: scaledSize(6),
        borderRadius: scaledSize(8),
    },
    accessoryBtnText: {
        color: '#0F172A',
        fontFamily: 'Outfit_700Bold',
        fontSize: scaledSize(13),
    },
});
