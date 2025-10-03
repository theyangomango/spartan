import React from 'react';
import { StyleSheet, Text, Animated, Dimensions } from 'react-native';

import scaleSize from "../../helper/scaleSize";

const { width, height } = Dimensions.get('window');

// Function to determine dynamic styles based on screen size
const getDynamicStyles = () => {
    if (width >= 430 && height >= 932) { // iPhone 14 Pro Max and similar
        return {
            paddingHorizontal: scaleSize(28),
            paddingVertical: scaleSize(20),
            fontSize: scaleSize(15.5),
            lineHeight: scaleSize(22),
        };
    } else if (width >= 390 && height >= 844) { // iPhone 13/14 and similar
        return {
            paddingHorizontal: scaleSize(25),
            paddingVertical: scaleSize(17),
            fontSize: scaleSize(14),
            lineHeight: scaleSize(20),
        };
    } else if (width >= 375 && height >= 812) { // iPhone X/XS/11 Pro and similar
        return {
            paddingHorizontal: scaleSize(24),
            paddingVertical: scaleSize(16),
            fontSize: scaleSize(13.5),
            lineHeight: scaleSize(19),
        };
    } else { // Smaller iPhone models (like iPhone SE)
        return {
            paddingHorizontal: scaleSize(22),
            paddingVertical: scaleSize(15),
            fontSize: scaleSize(13),
            lineHeight: scaleSize(18),
        };
    }
};

const dynamicStyles = getDynamicStyles();
const ts = require('../../helper/scaleSize').ts;

const InfoPanel = ({ isVisible, opacity }) => {
    return (isVisible && (<Animated.View style={[styles.infoPanel, { opacity, paddingHorizontal: dynamicStyles.paddingHorizontal, paddingVertical: dynamicStyles.paddingVertical }]}>
        <Text style={[styles.infoText, { fontSize: scaleSize(dynamicStyles.fontSize), lineHeight: ts(dynamicStyles.lineHeight) }]}>
            Leaderboard rankings are based on the calculated 1 Rep Max (1RM (Adj)).
            Each set performed is calculated using the Brzycki Formula: 1RM (Adj) = Weight * 36/(37 - Reps)
        </Text>
    </Animated.View>));
};

const styles = StyleSheet.create({
    infoPanel: {
        position: 'absolute',
        top: scaleSize(90), // Positioned below the header
        left: 0,
        right: 0,
        // Dark card background with subtle elevation
        backgroundColor: '#1E232C',
        borderWidth: scaleSize(1),
        borderColor: 'rgba(255,255,255,0.08)',
        borderRadius: scaleSize(18),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaleSize(6) },
        shadowOpacity: 0.15,
        shadowRadius: scaleSize(12),
        elevation: 5,
    },
    infoText: {
        color: '#EAEAEA',
        fontFamily: 'Inter_600SemiBold',
    },
});

export default InfoPanel;
