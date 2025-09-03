import React from 'react';
import { View, StyleSheet } from 'react-native';

// Small rounded extension rendered just below ActivityChips to visually
// separate the chips/header from the first post with a smooth curved edge.
export default function ChipsRoundMask({
    color = '#F7FAFF',
    radius = 35,
    height = 22,
    offset = -6, // small negative to tuck under chips' shadow/padding
    onLayout,
}) {
    return (
        <View
            pointerEvents="none"
            onLayout={onLayout}
            style={[
                styles.base,
                {
                    backgroundColor: 'blue',
                    height: height,
                    marginTop: offset,
                    position: 'absolute',
                    bottom: -height,
                }
            ]}
        >

            <View style={
                {
                    backgroundColor: 'red',
                    height: height,
                    borderTopLeftRadius: radius,
                    borderTopRightRadius: radius,
                }}>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    base: {
        width: '100%',
    },
});
