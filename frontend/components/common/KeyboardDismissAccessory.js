import React, { useRef } from 'react';
import { Platform, InputAccessoryView, View, Pressable, Keyboard, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import scaleSize from '../../helper/scaleSize';
import theme from '../../theme/mfpDark';

const styles = StyleSheet.create({
    bar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scaleSize(12),
        paddingVertical: scaleSize(3),
    },
    button: {
        backgroundColor: '#5F636C',
        borderRadius: scaleSize(12),
        width: scaleSize(64),
        height: scaleSize(40),
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export const useKeyboardAccessoryId = () => {
    const idRef = useRef(Platform.OS === 'ios' ? `kbdAccessory-${Math.random().toString(36).slice(2, 10)}` : null);
    return idRef.current;
};

const KeyboardDismissAccessory = ({ accessoryID }) => {
    if (Platform.OS !== 'ios' || !accessoryID) return null;
    return (
        <InputAccessoryView nativeID={accessoryID}>
            <View style={styles.bar}>
                <View style={{ flex: 1 }} />
                <Pressable onPress={() => Keyboard.dismiss()} style={styles.button} hitSlop={12}>
                    <MaterialCommunityIcons name="keyboard-outline" size={scaleSize(20)} color={theme.textPrimary} />
                </Pressable>
            </View>
        </InputAccessoryView>
    );
};

export default KeyboardDismissAccessory;
