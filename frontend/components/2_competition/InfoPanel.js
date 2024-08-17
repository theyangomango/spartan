import React from 'react';
import { StyleSheet, Text, Animated } from 'react-native';

const InfoPanel = ({ isVisible, opacity }) => {
    return (
        isVisible && (
            <Animated.View style={[styles.infoPanel, { opacity }]}>
                <Text style={styles.infoText}>
                    Leaderboard rankings are based on the calculated 1 Rep Max (1RM). 
                    Each set performed is calculated using the Brzycki Formula: 1RM = Weight * 36/(37 - Reps)
                </Text>
            </Animated.View>
        )
    );
};

const styles = StyleSheet.create({
    infoPanel: {
        position: 'absolute',
        top: 85, // Positioned below the header
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        // padding: 20,
        paddingHorizontal: 25,
        paddingVertical: 17,
        borderRadius: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
    },
    infoText: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20
    },
});

export default InfoPanel;
