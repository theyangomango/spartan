import React from 'react';
import { StyleSheet, View, Text, Dimensions } from "react-native";
import { SimpleLineIcons, FontAwesome5 } from '@expo/vector-icons'
import RNBounceable from "@freakycoder/react-native-bounceable";

const { width, height } = Dimensions.get('screen');

// Function to determine dynamic styles based on screen size
const getDynamicStyles = () => {
    if (width >= 430 && height >= 932) { // iPhone 14 Pro Max and similar
        return {
            fontSize: 15,
            paddingHorizontal: 30,
            iconSize: 22,
            height: 46,
        };
    } else if (width >= 390 && height >= 844) { // iPhone 13/14 and similar
        return {
            fontSize: 14,
            paddingHorizontal: 28,
            iconSize: 21,
            height: 44,
        };
    } else if (width >= 375 && height >= 812) { // iPhone X/XS/11 Pro and similar
        return {
            fontSize: 13.5,
            paddingHorizontal: 26,
            iconSize: 21,
            height: 43,
        };
    } else { // Smaller iPhone models (like iPhone SE)
        return {
            fontSize: 13,
            paddingHorizontal: 24,
            iconSize: 20.5,
            height: 42,
        };
    }
};

const dynamicStyles = getDynamicStyles();

export default function LogWorkoutButton({ joinWorkout }) {
    return (
        <RNBounceable style={[styles.main_ctnr, { height: 43, paddingHorizontal: dynamicStyles.paddingHorizontal }]}>
            <Text style={[styles.text, { fontSize: 15 }]}>Start Cardio Workout</Text>
            <FontAwesome5 name="running" size={dynamicStyles.iconSize} color={'#fff'} style={{ paddingRight: 4.5 }} />
        </RNBounceable>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        opacity: 0.5,
        // backgroundColor: '#50C98E',
        backgroundColor: '#34a48aec',
        marginVertical: 3,
        borderRadius: 18,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginLeft: 18,
        marginRight: 18,
    },
    text: {
        fontFamily: 'Nunito_800ExtraBold',
        color: 'white',
        letterSpacing: 0.25,
        color: 'white',
    },
});
