import React from 'react';
import theme from '../../../theme/mfpDark';
import { StyleSheet, View, Text } from "react-native";
import scaleSize from "../../../helper/scaleSize";

const scaledSize = (size) => scaleSize(size);

const safeNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

function formatNumber(value) {
    const number = safeNumber(value);
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
    const totalWorkouts = safeNumber(userData?.statsTotalWorkouts);
    const totalHours = safeNumber(userData?.statsTotalHours);
    const totalVolume = formatNumber(userData?.statsTotalVolume);

    return (
        <View style={styles.main_ctnr}>
            <View style={[styles.workout_stat, styles.total_workouts_stat_ctnr]}>
                <Text style={[styles.workout_stat_number, styles.total_workouts_stat_number]}>
                    {totalWorkouts}
                </Text>
                <Text style={styles.workout_stat_text}>Workouts</Text>
            </View>
            <View style={[styles.workout_stat, styles.gym_time_stat_ctnr]}>
                <Text style={[styles.workout_stat_number, styles.gym_time_stat_number]}>
                    {totalHours.toFixed(1)}
                </Text>
                <Text style={styles.workout_stat_text}>Hours in Gym</Text>
            </View>
            <View style={[styles.workout_stat, styles.total_volume_stat_ctnr]}>
                <Text style={[styles.workout_stat_number, styles.total_volume_stat_number]}>
                    {totalVolume}
                </Text>
                <Text style={styles.workout_stat_text}>Lbs Lifted</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        flexDirection: 'row',
        gap: scaledSize(8),
    },
    workout_stat: {
        flex: 1,
        height: scaledSize(68),
        borderRadius: scaledSize(16),
        borderWidth: 1,
        backgroundColor: theme.surface,
        marginTop: scaledSize(8),
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Match Macro Tracking palette (protein, carbs, fat), as an outline tint on the dark surface
    total_workouts_stat_ctnr: { borderColor: 'rgba(128, 166, 255, 0.3)' },
    gym_time_stat_ctnr: { borderColor: 'rgba(255, 124, 181, 0.3)' },
    total_volume_stat_ctnr: { borderColor: 'rgba(255, 200, 116, 0.3)' },
    workout_stat_text: {
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(12.5),
        color: theme.textSecondary,
        letterSpacing: 0.15,
        marginTop: scaledSize(1),
    },
    workout_stat_number: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(18),
    },
    total_workouts_stat_number: {
        color: '#80a6ffff',
    },
    gym_time_stat_number: {
        color: '#FF7CB5',
    },
    total_volume_stat_number: {
        color: '#FFC874',
    },
});
