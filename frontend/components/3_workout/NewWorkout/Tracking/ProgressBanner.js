import RNBounceable from '@freakycoder/react-native-bounceable';
import React from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // Scaling factor based on iPhone 13 height

const scaledSize = (size) => Math.round(size * scale * scale);

export default function ProgressBanner({ totalReps, totalVolume, personalBests }) {
    const formatNumber = (number) => {
        if (number >= 1000000) {
            return `${(number / 1000000).toPrecision(3)}m`;
        } else if (number >= 10000) {
            return `${(number / 1000).toPrecision(3)}k`;
        } else {
            return Number(number.toPrecision(3)).toString();
        }
    };

    return (
        <RNBounceable style={styles.container}>
            <View style={styles.column}>
                <Text style={styles.bigNumber}>{formatNumber(totalReps)}</Text>
                <Text style={styles.smallText}>Total Reps</Text>
            </View>
            <View style={styles.smallColumn}>
                <Text style={styles.bigNumber}>{formatNumber(totalVolume)}</Text>
                <Text style={styles.smallText}>Lbs Lifted</Text>
            </View>
            <View style={styles.column}>
                <Text style={styles.bigNumber}>{formatNumber(personalBests)}</Text>
                <Text style={styles.smallerText} numberOfLines={1}>Personal Bests</Text>
            </View>
        </RNBounceable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        height: scaledSize(100),
        marginHorizontal: scaledSize(15),
        paddingHorizontal: scaledSize(15),
        borderRadius: scaledSize(25),
        backgroundColor: '#1F1F1F',
        justifyContent: 'center', // Centering the entire content
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaledSize(2) },
        shadowOpacity: 0.1,
        shadowRadius: scaledSize(8),
        elevation: 5,
    },
    column: {
        width: '35%', // Larger columns on the sides
        alignItems: 'center',
    },
    smallColumn: {
        width: '30%', // Smaller middle column
        alignItems: 'center',
    },
    bigNumber: {
        fontSize: scaledSize(23),
        color: '#B9DCFF',
        fontFamily: 'Poppins_800ExtraBold',
    },
    smallText: {
        paddingTop: scaledSize(1),
        fontSize: scaledSize(12.8),
        color: '#eee',
        fontFamily: 'Poppins_600SemiBold'
    },
    smallerText: {
        paddingTop: scaledSize(1),
        fontSize: scaledSize(12.8),  // Slightly smaller font size
        color: '#eee',
        fontFamily: 'Poppins_600SemiBold'
    },
});
