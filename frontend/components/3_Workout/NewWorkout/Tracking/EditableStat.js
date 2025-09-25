import React, { useState, useRef } from "react";
import { TextInput, StyleSheet, Pressable, Dimensions, Keyboard, Platform, InputAccessoryView, View, Text } from "react-native";
import scaleSize from "../../../../helper/scaleSize";
import theme from "../../../../theme/mfpDark";

const { height: screenHeight } = Dimensions.get('window');
const scaledSize = (size) => scaleSize(size);

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
                    placeholderTextColor={'#888'}
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
        width: scaleSize(scaledSize(63)),
        height: scaleSize(scaledSize(26)),
        borderRadius: scaleSize(scaledSize(9)),
        // Darker chip with stronger border for contrast
        backgroundColor: theme.field,
        borderWidth: scaleSize(1),
        borderColor: 'rgba(255,255,255,0.30)',
    },
    selected: {
        borderColor: theme.primary,
    },
    finished: {
        backgroundColor: theme.successBg,
    },
    text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: scaleSize(15),
        flex: 1,
        textAlign: 'center',
        color: theme.textPrimary,
    },
    accessoryBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scaleSize(scaledSize(12)),
        paddingVertical: scaleSize(scaledSize(8)),
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
        backgroundColor: theme.surface,
    },
    accessoryBtn: {
        backgroundColor: theme.field,
        paddingHorizontal: scaleSize(scaledSize(12)),
        paddingVertical: scaleSize(scaledSize(6)),
        borderRadius: scaleSize(scaledSize(8)),
    },
    accessoryBtnText: {
        color: theme.textPrimary,
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(13),
    },
});
