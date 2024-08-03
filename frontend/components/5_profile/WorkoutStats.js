import { StyleSheet, View, Text } from "react-native"

export default function WorkoutStats({ userData }) {
    return (
        <View style={styles.main_ctnr}>
            <View style={[styles.workout_stat, styles.total_workouts_stat_ctnr]}>
                <Text style={[styles.workout_stat_number, styles.total_workouts_stat_number]}>{userData.stats.workoutCount}</Text>
                <Text style={styles.workout_stat_text}>Workouts</Text>
            </View>
            <View style={[styles.workout_stat, styles.total_volume_stat_ctnr]}>
                <Text style={[styles.workout_stat_number, styles.total_volume_stat_number]}>{userData.stats.totalVolume}</Text>
                <Text style={styles.workout_stat_text}>Lbs Lifted</Text>
            </View>
            <View style={[styles.workout_stat, styles.gym_time_stat_ctnr]}>
                <Text style={[styles.workout_stat_number, styles.gym_time_stat_number]}>{userData.stats.totalTime}</Text>
                <Text style={styles.workout_stat_text}>Hours in Gym</Text>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        flexDirection: 'row',
        justifyContent: 'space-around'
    },
    workout_stat: {
        // width: 104,
        width: '31.5%',
        height: 68,
        borderRadius: 8,
        marginVertical: 9,
        marginHorizontal: 3.5,
        justifyContent: 'center',
        alignItems: 'center'
    },
    total_workouts_stat_ctnr: {
        backgroundColor: '#E1F0FF'
    },
    total_volume_stat_ctnr: {
        backgroundColor: '#E1FFE8'
    },
    gym_time_stat_ctnr: {
        backgroundColor: '#FFECE1'
    },
    workout_stat_text: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 10.5,
        color: '#808080'
    },
    workout_stat_number: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 16
    },
    total_workouts_stat_number: {
        color: '#0499FE'
    },
    total_volume_stat_number: {
        color: '#3DC575'
    },
    gym_time_stat_number: {
        color: '#E95060'
    },
});