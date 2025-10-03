import React, { useState, useRef } from "react";
import {
    TextInput,
    StyleSheet,
    Pressable,
    Dimensions,
    Platform,
    Keyboard,
} from "react-native";
import scaleSize from "../../../helper/scaleSize";
import theme from "../../../theme/mfpDark";
import KeyboardDismissAccessory, { useKeyboardAccessoryId } from "../../common/KeyboardDismissAccessory";

const { height: screenHeight } = Dimensions.get('window');
export default function TemplateEditableStat({ placeholder = '0', value, setValue, readOnly = false }) {
    const [isSelected, setIsSelected] = useState(false);
    const inputRef = useRef(null);
    const accessoryId = useKeyboardAccessoryId();

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
        <>
            <Pressable
                disabled={readOnly}
                onPress={() => {
                    if (readOnly) return;
                    inputRef.current?.focus?.();
                    setIsSelected(true);
                }}
                style={[
                    styles.editing,
                    isSelected && !readOnly && styles.selected,
                ]}
            >
                <TextInput
                    ref={inputRef}
                    editable={!readOnly}
                    selectTextOnFocus={!readOnly}
                    keyboardType="numeric"
                    placeholder={placeholder}
                    placeholderTextColor={theme.textSecondary}
                    onFocus={() => !readOnly && setIsSelected(true)}
                    onEndEditing={() => setIsSelected(false)}
                    style={[styles.text, readOnly && styles.readOnlyText]}
                    value={value === '0' ? (readOnly ? '0' : '') : value.toString()}
                    onChangeText={handleChangeText}
                    blurOnSubmit={false}
                    returnKeyType={Platform.OS === 'android' ? 'done' : 'default'}
                    onSubmitEditing={() => Keyboard.dismiss()}
                    inputAccessoryViewID={!readOnly && Platform.OS === 'ios' ? accessoryId : undefined}
                    pointerEvents={readOnly ? 'none' : 'auto'}
                />
            </Pressable>
            {!readOnly && <KeyboardDismissAccessory accessoryID={accessoryId} />}
        </>
    )
}

const styles = StyleSheet.create({
    editing: { width: scaleSize(63), height: scaleSize(26), borderRadius: scaleSize(9), backgroundColor: theme.field, borderWidth: scaleSize(1), borderColor: 'rgba(255,255,255,0.30)' },
    selected: { borderColor: theme.primary },
    finished: { backgroundColor: theme.successBg },
    text: { fontFamily: 'Poppins_700Bold', fontSize: scaleSize(15), flex: 1, textAlign: 'center', color: theme.textPrimary },
    readOnlyText: { color: theme.textPrimary },
});
