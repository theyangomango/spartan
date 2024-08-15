import React, { useEffect } from 'react';
import { StyleSheet, Text, Animated } from 'react-native';
import RNBounceable from "@freakycoder/react-native-bounceable";

const AnimatedButton = ({ opacity, selectedExercisesLength, handleFinish }) => {
    
    useEffect(() => {
        // Trigger fade-out or fade-in animation based on selectedExercisesLength
        Animated.timing(opacity, {
            toValue: selectedExercisesLength > 0 ? 1 : 0, // Fade out when no exercises are selected
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [selectedExercisesLength, opacity]);

    return (
        <Animated.View style={[styles.animatedButtonContainer, { opacity }]}>
            <RNBounceable onPress={handleFinish} style={styles.addButton}>
                <Text style={styles.addButtonText}>
                    {`Add`}
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
