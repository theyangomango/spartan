import React from 'react';
import { StyleSheet, Text, Animated } from 'react-native';
import RNBounceable from "@freakycoder/react-native-bounceable";

import scaleSize from "../../../helper/scaleSize";

const AnimatedButton = ({ opacity, selectedExercisesLength, handleFinish }) => {
    return (
        <Animated.View style={[styles.animatedButtonContainer, { opacity }]}>
            <RNBounceable onPress={handleFinish} style={styles.addButton}>
                <Text style={styles.addButtonText}>
                    {`Add${selectedExercisesLength > 0 ? ` (${selectedExercisesLength})` : ''}`}
                </Text>
            </RNBounceable>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    animatedButtonContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButton: {
        backgroundColor: '#51A9FF',
        paddingHorizontal: scaleSize(20),
        paddingVertical: scaleSize(4.5),
        borderRadius: scaleSize(8),
        justifyContent: 'center',
        alignItems: 'center'
    },
    addButtonText: {
        color: '#fff',
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(14),
    },
});

export default AnimatedButton;
