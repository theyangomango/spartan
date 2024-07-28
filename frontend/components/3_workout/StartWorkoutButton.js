import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { Weight } from 'iconsax-react-native';
import RNBounceable from '@freakycoder/react-native-bounceable';

export default function StartWorkoutButton({ startWorkout }) {
    return (
        <RNBounceable onPress={startWorkout} style={styles.main_ctnr}>
                <Text style={styles.text}>Start Empty Workout</Text>
                <View style={styles.icon_ctnr}>
                    <Weight size="25.5" color="white" variant='Broken' />
                </View>

        </RNBounceable>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        backgroundColor: '#6FB8FF',
        height: 42,
        paddingHorizontal: 28,
        marginVertical: 4,
        borderRadius: 15,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 16,
    },
    left: {
        flexDirection: 'row',
        flex: 1,
        alignItems: 'center'
    },
    text: {
        fontSize: 13,
        fontFamily: 'Poppins_600SemiBold',
        color: 'white',
        // marginRight: 8
    },
    icon_ctnr: {
        paddingBottom: 1
    }
});
