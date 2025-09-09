import React from 'react';
import theme from '../../../theme/mfpDark';
import { StyleSheet, View, Text, Dimensions } from "react-native";

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // Scaling factor based on iPhone 13 height

const scaledSize = (size) => Math.round(size * scale);

function formatNumber(value) {
    const number = Number.isFinite(Number(value)) ? Number(value) : 0;
    if (number < 1000) {
        return number.toString();
    } else if (number < 1000000) {
        return (number / 1000).toFixed(3 - Math.floor(Math.log10(number / 1000)) - 1) + 'k';
    } else if (number < 1000000000) {
        return (number / 1000000).toFixed(3 - Math.floor(Math.log10(number / 1000000)) - 1) + 'm';
    } else {
        return (number / 1000000000).toFixed(3 - Math.floor(Math.log10(number / 1000000000)) - 1) + 'b';
    }
}

export default function WorkoutStats({ userData }) {
    return (
        <View style={styles.main_ctnr}>
            <View style={[styles.workout_stat, styles.total_workouts_stat_ctnr]}>
                <Text style={[styles.workout_stat_number, styles.total_workouts_stat_number]}>
                    {userData && userData.statsTotalWorkouts}
                </Text>
                <Text style={styles.workout_stat_text}>Workouts</Text>
            </View>
            <View style={[styles.workout_stat, styles.total_volume_stat_ctnr]}>
                <Text style={[styles.workout_stat_number, styles.total_volume_stat_number]}>
                    {formatNumber(userData?.statsTotalVolume)}
                </Text>
                <Text style={styles.workout_stat_text}>Lbs Lifted</Text>
            </View>
            <View style={[styles.workout_stat, styles.gym_time_stat_ctnr]}>
                <Text style={[styles.workout_stat_number, styles.gym_time_stat_number]}>
                    {(Number(userData?.statsTotalHours) || 0).toFixed(1)}
                </Text>
                <Text style={styles.workout_stat_text}>Hours in Gym</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    workout_stat: {
        width: '31.5%',
        height: scaledSize(68),
        borderRadius: scaledSize(8),
        marginVertical: scaledSize(9),
        marginHorizontal: scaledSize(3.5),
        justifyContent: 'center',
        alignItems: 'center',
    },
    total_workouts_stat_ctnr: { backgroundColor: '#3A4257' },
    total_volume_stat_ctnr: { backgroundColor: '#3A4257' },
    gym_time_stat_ctnr: { backgroundColor: '#3A4257' },
    workout_stat_text: {
        fontFamily: 'Poppins_500Medium',
        fontSize: scaledSize(10.5),
        color: '#C5CCD6',
    },
    workout_stat_number: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaledSize(16),
    },
    total_workouts_stat_number: {
        color: '#0499FE',
    },
    total_volume_stat_number: {
        color: '#3DC575',
    },
    gym_time_stat_number: {
        color: '#E95060',
    },
});
