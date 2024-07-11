import RNBounceable from '@freakycoder/react-native-bounceable';
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

export default function ProgressBanner() {
    const totalReps = 150;
    const totalVolume = 1200;
    const personalRecords = 5;

    return (
        <RNBounceable style={styles.container}>
            <View style={styles.column}>
                <Text style={styles.bigNumber}>{totalReps}</Text>
                <Text style={styles.smallText}>Total Reps</Text>
            </View>
            <View style={styles.column}>
                <Text style={styles.bigNumber}>{totalVolume}</Text>
                <Text style={styles.smallText}>Total Volume</Text>
            </View>
            <View style={styles.column}>
                <Text style={styles.bigNumber}>{personalRecords}</Text>
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
        marginHorizontal: 19,
        paddingHorizontal: 10,
        borderRadius: 25,
        backgroundColor: '#1F1F1F',
        justifyContent: 'space-around',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        // marginBottom: 10,
    },
    column: {
        width: '33%',
        alignItems: 'center',
    },
    bigNumber: {
        fontSize: 24,
        color: '#B9DCFF',
        // color: '#fff',
        fontFamily: 'Poppins_800ExtraBold',
    },
    smallText: {
        paddingTop: 1,
        fontSize: 14.5,
        // color: '#A5A5A5',
        color: '#eee',
        fontFamily: 'Lato_700Bold'
    },
});
