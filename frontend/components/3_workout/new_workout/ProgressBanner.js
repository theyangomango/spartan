import RNBounceable from '@freakycoder/react-native-bounceable';
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

export default function ProgressBanner() {
    const totalReps = 70;
    const totalVolume = 1200;
    const personalRecords = 2;

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
        // marginBottom: 10,
    },
    column: {
        width: '33%',
        alignItems: 'center',
    },
    bigNumber: {
        fontSize: 22.5,
        color: '#B9DCFF',
        // color: '#fff',
        fontFamily: 'Poppins_800ExtraBold',
    },
    smallText: {
        paddingTop: 1,
        fontSize: 14,
        // color: '#A5A5A5',
        color: '#eee',
        // fontFamily: 'Lato_700Bold'
        fontFamily: 'SourceSansPro_600SemiBold'
    },
});
