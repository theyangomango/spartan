// components/2_MacroTracking/LabeledNumber.js
import React from 'react';
import { View, Text, TextInput } from 'react-native';

export default function LabeledNumber({
    label,
    value,
    onChangeText,
    suffix,
    styles,
    onFocus,
    placeholder = '0',
    placeholderTextColor,
    selectionColor,
    keyboardType = 'number-pad',
}) {
    return (
        <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>{label}</Text>
            <View style={styles.inputBox}>
                <TextInput
                    keyboardType={keyboardType}
                    returnKeyType="done"
                    value={String(value ?? '')}
                    onChangeText={onChangeText}
                    style={styles.input}
                    placeholder={String(placeholder)}
                    placeholderTextColor={placeholderTextColor}
                    selectionColor={selectionColor}
                    onFocus={onFocus}
                />
                {suffix ? <Text style={styles.inputSuffix}>{suffix}</Text> : null}
            </View>
        </View>
    );
}
