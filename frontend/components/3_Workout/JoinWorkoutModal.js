import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import {
    CodeField,
    Cursor,
    useBlurOnFulfill,
    useClearByFocusCell,
} from 'react-native-confirmation-code-field';

import scaleSize from "../../helper/scaleSize";

const CELL_COUNT = 4;


export default function JoinWorkoutModal() {
    const [value, setValue] = useState('');
    const ref = useBlurOnFulfill({ value, cellCount: CELL_COUNT });
    const [props, getCellOnLayoutHandler] = useClearByFocusCell({
        value,
        setValue,
    });

    return (
        <View style={styles.root}>
            <Text style={styles.title}>Enter Code</Text>
            <CodeField
                ref={ref}
                {...props}
                // Use `caretHidden={false}` when users can't paste a text value, because context menu doesn't appear
                value={value}
                onChangeText={setValue}
                cellCount={CELL_COUNT}
                rootStyle={styles.codeFieldRoot}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete={Platform.select({ android: 'sms-otp', default: 'one-time-code' })}
                testID="my-code-input"
                renderCell={({ index, symbol, isFocused }) => (
                    <Text
                        key={index}
                        style={[styles.cell, isFocused && styles.focusCell]}
                        onLayout={getCellOnLayoutHandler(index)}>
                        {symbol || (isFocused ? <Cursor /> : null)}
                    </Text>
                )}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        paddingHorizontal: scaleSize(70),
        paddingTop: scaleSize(20),
    },
    title: {
        textAlign: 'center',
        fontFamily: 'Poppins_500Medium',
        fontSize: scaleSize(20)
    },
    codeFieldRoot: {
        marginTop: scaleSize(20)
    },
    cell: {
        width: scaleSize(44),
        height: scaleSize(44),
        borderRadius: scaleSize(8),
        lineHeight: scaleSize(38),
        fontSize: scaleSize(15),
        fontFamily: 'Poppins_400Regular',
        borderWidth: scaleSize(1.5),
        borderColor: '#00000030',
        textAlign: 'center',
    },
    focusCell: {
        borderColor: '#0699FF',
    },
});
