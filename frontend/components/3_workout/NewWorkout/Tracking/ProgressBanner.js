import RNBounceable from '@freakycoder/react-native-bounceable';
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

export default function ProgressBanner({ totalReps, totalVolume, personalBests }) {

    return (
        <RNBounceable style={styles.container}>
            <View style={styles.column}>
                <Text style={styles.bigNumber}>{totalReps}</Text>
                <Text style={styles.smallText}>Total Reps</Text>
            </View>
            <View style={styles.column}>
                <Text style={styles.bigNumber}>{totalVolume}</Text>
                <Text style={styles.smallText}>Lbs Lifted</Text>
            </View>
            <View style={styles.column}>
                <Text style={styles.bigNumber}>{personalBests}</Text>
                <Text style={styles.smallText}>Personal Bests</Text>
            </View>
        </RNBounceable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 100,
        marginHorizontal: 15,
        paddingHorizontal: 15,
        borderRadius: 25,
        backgroundColor: '#1F1F1F',
        justifyContent: 'space-around',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    column: {
        width: '33%',
        alignItems: 'center',
    },
    bigNumber: {
        fontSize: 23,
        color: '#B9DCFF',
        // color: '#fff',
        fontFamily: 'Poppins_800ExtraBold',
    },
    smallText: {
        paddingTop: 1,
        fontSize: 12.8,
        color: '#eee',
        fontFamily: 'Poppins_600SemiBold'
    },
});
