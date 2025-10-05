import React from 'react';
import theme from '../../../theme/mfpDark';
import { StyleSheet, View, Text } from "react-native";
import scaleSize from "../../../helper/scaleSize";

const scaledSize = (size) => scaleSize(size);

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
            <View style={[styles.workout_stat, styles.gym_time_stat_ctnr]}>
                <Text style={[styles.workout_stat_number, styles.gym_time_stat_number]}>
                    {(Number(userData?.statsTotalHours) || 0).toFixed(1)}
                </Text>
                <Text style={styles.workout_stat_text}>Hours in Gym</Text>
            </View>
            <View style={[styles.workout_stat, styles.total_volume_stat_ctnr]}>
                <Text style={[styles.workout_stat_number, styles.total_volume_stat_number]}>
                    {formatNumber(userData?.statsTotalVolume)}
                </Text>
                <Text style={styles.workout_stat_text}>Lbs Lifted</Text>
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
        marginTop: scaledSize(9),
        marginBottom: 0,
        marginHorizontal: scaledSize(3.5),
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Match Macro Tracking palette (protein, carbs, fat)
    total_workouts_stat_ctnr: { backgroundColor: 'rgba(108,152,252,0.24)' },
    gym_time_stat_ctnr: { backgroundColor: 'rgba(255,124,181,0.22)' },
    total_volume_stat_ctnr: { backgroundColor: 'rgba(255,200,116,0.25)' },
    workout_stat_text: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: scaleSize(11.5),
        color: theme.textPrimary,
        letterSpacing: 0.15,
    },
    workout_stat_number: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(16),
    },
    total_workouts_stat_number: {
        color: '#6C98FC',
    },
    gym_time_stat_number: {
        color: '#FF7CB5',
    },
    total_volume_stat_number: {
        color: '#FFC874',
    },
});
