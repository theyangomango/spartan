import RNBounceable from '@freakycoder/react-native-bounceable';
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

export default function ProgressBanner({ totalReps, totalVolume, personalBests }) {
    const formatNumber = (number) => {
        if (number >= 1000000) {
            // Divide by 1,000,000 and round to 3 significant figures for millions
            return `${(number / 1000000).toPrecision(3)}m`;
        } else if (number >= 10000) {
            // Divide by 1,000 and round to 3 significant figures for thousands
            return `${(number / 1000).toPrecision(3)}k`;
        } else {
            // Round to 3 significant figures for smaller numbers
            return Number(number.toPrecision(3)).toString();
        }
    };

    return (
        <RNBounceable style={styles.container}>
            <View style={styles.column}>
                <Text style={styles.bigNumber}>{formatNumber(totalReps)}</Text>
                <Text style={styles.smallText}>Total Reps</Text>
            </View>
            <View style={styles.column}>
                <Text style={styles.bigNumber}>{formatNumber(totalVolume)}</Text>
                <Text style={styles.smallText}>Lbs Lifted</Text>
            </View>
            <View style={styles.column}>
                <Text style={styles.bigNumber}>{formatNumber(personalBests)}</Text>
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
        fontFamily: 'Poppins_800ExtraBold',
    },
    smallText: {
        paddingTop: 1,
        fontSize: 12.8,
        color: '#eee',
        fontFamily: 'Poppins_600SemiBold'
    },
});
