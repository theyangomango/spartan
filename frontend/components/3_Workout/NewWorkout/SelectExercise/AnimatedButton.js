import React, { useEffect } from 'react';
import { StyleSheet, Text, Animated, Dimensions } from 'react-native';
import RNBounceable from "@freakycoder/react-native-bounceable";

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // Scaling factor based on iPhone 13 height

const scaledSize = (size) => Math.round(size * scale);

const AnimatedButton = ({ opacity, selectedExercisesLength, handleFinish }) => {
    
    useEffect(() => {
        // Trigger fade-out or fade-in animation based on selectedExercisesLength
        Animated.timing(opacity, {
            toValue: selectedExercisesLength > 0 ? 1 : 0.5, // Fade out when no exercises are selected
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
        paddingHorizontal: scaledSize(20),
        paddingVertical: scaledSize(4.5),
        borderRadius: scaledSize(8),
        justifyContent: 'center',
        alignItems: 'center'
    },
    addButtonText: {
        color: '#fff',
        fontFamily: 'Outfit_700Bold',
        fontSize: scaledSize(14),
    },
});

export default AnimatedButton;
