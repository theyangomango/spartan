import React from 'react';
import { StyleSheet, View, Text, Dimensions } from "react-native";
import { Weight } from 'iconsax-react-native';
import RNBounceable from '@freakycoder/react-native-bounceable';

const { width, height } = Dimensions.get('screen');

// Function to determine dynamic styles based on screen size
const getDynamicStyles = () => {
    if (width >= 430 && height >= 932) { // iPhone 14 Pro Max and similar
        return {
            fontSize: 15,
            paddingHorizontal: 30,
            iconSize: 27,
            height: 46,
        };
    } else if (width >= 390 && height >= 844) { // iPhone 13/14 and similar
        return {
            fontSize: 14,
            paddingHorizontal: 28,
            iconSize: 26,
            height: 44,
        };
    } else if (width >= 375 && height >= 812) { // iPhone X/XS/11 Pro and similar
        return {
            fontSize: 13.5,
            paddingHorizontal: 26,
            iconSize: 25.5,
            height: 43,
        };
    } else { // Smaller iPhone models (like iPhone SE)
        return {
            fontSize: 13,
            paddingHorizontal: 24,
            iconSize: 25,
            height: 42,
        };
    }
};

const dynamicStyles = getDynamicStyles();

export default function StartWorkoutButton({ startWorkout }) {
    return (
        <RNBounceable onPress={startWorkout} style={[styles.main_ctnr, { height: dynamicStyles.height, paddingHorizontal: dynamicStyles.paddingHorizontal }]}>
            <Text style={[styles.text, { fontSize: dynamicStyles.fontSize }]}>Start Empty Workout</Text>
            <View style={styles.icon_ctnr}>
                <Weight size={dynamicStyles.iconSize} color="white" variant='Broken' />
            </View>
        </RNBounceable>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        backgroundColor: '#6FB8FF',
        marginVertical: 4,
        borderRadius: 15,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 16,
    },
    text: {
        fontFamily: 'Poppins_600SemiBold',
        color: 'white',
    },
    icon_ctnr: {
        paddingBottom: 1,
    },
});
