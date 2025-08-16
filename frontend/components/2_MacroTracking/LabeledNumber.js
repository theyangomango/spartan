// components/2_MacroTracking/LabeledNumber.js
import React from 'react';
import { View, Text, TextInput } from 'react-native';

export default function LabeledNumber({ label, value, onChangeText, suffix, styles, onFocus }) {
    return (
        <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>{label}</Text>
            <View style={styles.inputBox}>
                <TextInput
                    keyboardType="number-pad"
                    returnKeyType="done"
                    value={value}
                    onChangeText={onChangeText}
                    style={styles.input}
                    placeholder="0"
                    onFocus={onFocus}
                />
                {suffix ? <Text style={styles.inputSuffix}>{suffix}</Text> : null}
            </View>
        </View>
    );
}
