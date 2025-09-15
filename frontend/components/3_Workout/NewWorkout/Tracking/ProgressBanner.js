import RNBounceable from '@freakycoder/react-native-bounceable';
import React from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import scaleSize from '../../../../helper/scaleSize';
import theme from '../../../../theme/mfpDark';

const { height: screenHeight } = Dimensions.get('window');
const scaledSize = (size) => scaleSize(size);

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
        <View style={styles.container}>
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        height: scaleSize(scaledSize(100)),
        marginHorizontal: scaleSize(scaledSize(15)),
        paddingHorizontal: scaleSize(scaledSize(15)),
        borderRadius: scaleSize(scaledSize(25)),
        // Darker card to pop against sheet background
        backgroundColor: theme.surface,
        borderWidth: scaleSize(1),
        borderColor: 'rgba(255,255,255,0.28)',
        justifyContent: 'center', // Centering the entire content
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaleSize(scaledSize(2)) },
        shadowOpacity: 0.18,
        shadowRadius: scaleSize(scaledSize(10)),
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
        fontSize: scaleSize(24),
        color: '#FFFFFF', // maximum contrast for metrics
        fontFamily: 'Poppins_800ExtraBold',
    },
    smallText: {
        paddingTop: scaleSize(scaledSize(1)),
        fontSize: scaleSize(13.2),
        color: theme.textPrimary,
        fontFamily: 'Poppins_600SemiBold'
    },
    smallerText: {
        paddingTop: scaleSize(scaledSize(1)),
        fontSize: scaleSize(13.2),
        color: theme.textPrimary,
        fontFamily: 'Poppins_600SemiBold'
    },
});
