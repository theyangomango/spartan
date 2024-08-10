import React from 'react';
import { StyleSheet, Text, Animated } from 'react-native';
import RNBounceable from "@freakycoder/react-native-bounceable";

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
        paddingHorizontal: 20,
        paddingVertical: 4.5,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center'
    },
    addButtonText: {
        color: '#fff',
        fontFamily: 'Outfit_700Bold',
        fontSize: 14,
    },
});

export default AnimatedButton;
