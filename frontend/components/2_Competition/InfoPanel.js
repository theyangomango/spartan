import React from 'react';
import { StyleSheet, Text, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Function to determine dynamic styles based on screen size
const getDynamicStyles = () => {
    if (width >= 430 && height >= 932) { // iPhone 14 Pro Max and similar
        return {
            paddingHorizontal: 28,
            paddingVertical: 20,
            fontSize: 15.5,
            lineHeight: 22,
        };
    } else if (width >= 390 && height >= 844) { // iPhone 13/14 and similar
        return {
            paddingHorizontal: 25,
            paddingVertical: 17,
            fontSize: 14,
            lineHeight: 20,
        };
    } else if (width >= 375 && height >= 812) { // iPhone X/XS/11 Pro and similar
        return {
            paddingHorizontal: 24,
            paddingVertical: 16,
            fontSize: 13.5,
            lineHeight: 19,
        };
    } else { // Smaller iPhone models (like iPhone SE)
        return {
            paddingHorizontal: 22,
            paddingVertical: 15,
            fontSize: 13,
            lineHeight: 18,
        };
    }
};

const dynamicStyles = getDynamicStyles();

const InfoPanel = ({ isVisible, opacity }) => {
    return (
        isVisible && (
            <Animated.View style={[styles.infoPanel, { opacity, paddingHorizontal: dynamicStyles.paddingHorizontal, paddingVertical: dynamicStyles.paddingVertical }]}>
                <Text style={[styles.infoText, { fontSize: dynamicStyles.fontSize, lineHeight: dynamicStyles.lineHeight }]}>
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
        top: 90, // Positioned below the header
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
    },
    infoText: {
        color: '#333',
        fontFamily: 'Inter_600SemiBold',
    },
});

export default InfoPanel;
