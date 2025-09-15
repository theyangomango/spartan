import React from 'react';
import { StyleSheet, View, Text, Dimensions } from "react-native";
import { Weight } from 'iconsax-react-native';
import RNBounceable from '@freakycoder/react-native-bounceable';

import scaleSize from "../../helper/scaleSize";

const { width, height } = Dimensions.get('screen');

// Function to determine dynamic styles based on screen size
const getDynamicStyles = () => {
    if (width >= 430 && height >= 932) { // iPhone 14 Pro Max and similar
        return {
            fontSize: scaleSize(15),
            paddingHorizontal: scaleSize(30),
            iconSize: 27,
            height: scaleSize(46),
        };
    } else if (width >= 390 && height >= 844) { // iPhone 13/14 and similar
        return {
            fontSize: scaleSize(14),
            paddingHorizontal: scaleSize(28),
            iconSize: 26,
            height: scaleSize(44),
        };
    } else if (width >= 375 && height >= 812) { // iPhone X/XS/11 Pro and similar
        return {
            fontSize: scaleSize(13.5),
            paddingHorizontal: scaleSize(26),
            iconSize: 25.5,
            height: scaleSize(43),
        };
    } else { // Smaller iPhone models (like iPhone SE)
        return {
            fontSize: scaleSize(13),
            paddingHorizontal: scaleSize(24),
            iconSize: 25,
            height: scaleSize(42),
        };
    }
};

const dynamicStyles = getDynamicStyles();

export default function StartWorkoutButton({ startWorkout }) {
    return (
        <RNBounceable onPress={startWorkout} style={[styles.main_ctnr, { height: scaleSize(43), paddingHorizontal: dynamicStyles.paddingHorizontal }]}>
            <Text style={[styles.text]}>Start Resistance Workout</Text>
            <View style={styles.icon_ctnr}>
                <Weight size={26} color="white" variant='Broken' />
            </View>
        </RNBounceable>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        backgroundColor: '#6FB8FF',
        marginVertical: scaleSize(4),
        borderRadius: scaleSize(18),
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: scaleSize(18),
    },
    text: {
        fontFamily: 'Nunito_800ExtraBold',
        fontSize: scaleSize(15),
        color: 'white',
        letterSpacing: 0.25
    },
    icon_ctnr: {
        paddingBottom: scaleSize(1),
    },
});
