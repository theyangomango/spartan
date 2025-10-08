import React, { useState, useRef } from "react";
import { TextInput, StyleSheet, Pressable, Dimensions, Keyboard, Platform } from "react-native";
import scaleSize from "../../../../helper/scaleSize";
import theme from "../../../../theme/mfpDark";
import KeyboardDismissAccessory, { useKeyboardAccessoryId } from "../../../common/KeyboardDismissAccessory";
import workoutTypography from "../../shared/workoutTypography";

const { height: screenHeight } = Dimensions.get('window');
export default function EditableStat({ placeholder = '0', isFinished, value, setValue, onFocus }) {
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
                    style={[workoutTypography.statValue, styles.text]}
                    value={value === '0' ? '' : value.toString()}
                    onChangeText={handleChangeText}
                    blurOnSubmit={false}
                    inputAccessoryViewID={Platform.OS === 'ios' ? accessoryId : undefined}
                    returnKeyType={Platform.OS === 'android' ? 'done' : 'default'}
                    onSubmitEditing={() => Keyboard.dismiss()}
                />
            </Pressable>
            <KeyboardDismissAccessory accessoryID={accessoryId} />
        </>
    )
}

const styles = StyleSheet.create({
    editing: {
        width: scaleSize(63),
        height: scaleSize(26),
        borderRadius: scaleSize(9),
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
        flex: 1,
        textAlign: 'center',
    },
});
