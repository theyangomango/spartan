import React, { useEffect } from "react";
import { StyleSheet, Text, Animated } from "react-native";
import scaleSize from "../../../../helper/scaleSize";
import RNBounceable from "@freakycoder/react-native-bounceable";

const scaledSize = (size) => scaleSize(size);

const AnimatedButton = ({ opacity, selectedExercisesLength, handleFinish }) => {
    useEffect(() => {
        Animated.timing(opacity, {
            toValue: selectedExercisesLength > 0 ? 1 : 0.4,
            duration: 220,
            useNativeDriver: true,
        }).start();
    }, [selectedExercisesLength, opacity]);

    const label = selectedExercisesLength > 0 ? `Add (${selectedExercisesLength})` : "Add exercises";

    return (
        <Animated.View style={[styles.animatedButtonContainer, { opacity }]}>
            <RNBounceable
                disabled={selectedExercisesLength === 0}
                onPress={handleFinish}
                style={[styles.addButton, selectedExercisesLength === 0 && styles.addButtonDisabled]}
            >
                <Text style={styles.addButtonText}>{label}</Text>
            </RNBounceable>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    animatedButtonContainer: {
        width: "100%",
    },
    addButton: {
        backgroundColor: "#57B9FF",
        paddingVertical: scaledSize(14),
        borderRadius: scaledSize(16),
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#57B9FF",
        shadowOffset: { width: 0, height: scaledSize(10) },
        shadowOpacity: 0.25,
        shadowRadius: scaledSize(16),
    },
    addButtonDisabled: {
        backgroundColor: "rgba(90, 108, 146, 0.6)",
        shadowOpacity: 0,
    },
    addButtonText: {
        color: "#FFFFFF",
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(14),
    },
});

export default AnimatedButton;
