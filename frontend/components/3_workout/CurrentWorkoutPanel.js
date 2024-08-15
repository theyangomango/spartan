import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Clock } from 'iconsax-react-native';
import { MaterialCommunityIcons, FontAwesome6 } from '@expo/vector-icons';
import RNBounceable from '@freakycoder/react-native-bounceable';

function timestampToDateString(timestamp) {
    const date = new Date(timestamp);
    const month = date.getMonth() + 1; // Months are zero-indexed, so add 1
    const day = date.getDate();

    return `${month}/${day}`;
}

const CurrentWorkoutPanel = ({ workout, timerRef, openWorkout }) => {
    const [time, setTime] = useState(timerRef.current);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setTime(timerRef.current);
        }, 1000);

        return () => clearInterval(intervalId);
    }, [timerRef]);

    return (
        <View style={styles.container}>
            <View style={styles.topHalf}>
                <Text style={styles.exerciseName}>{`${timestampToDateString(workout.created)} Workout`}</Text>
                <View style={styles.stats_row}>
                    <View style={styles.stats_entry}>
                        <Clock color='#666' size={16} variant='Bold' />
                        <Text style={styles.stats_text}>{time}</Text>
                    </View>
                    <View style={styles.stats_entry}>
                        <MaterialCommunityIcons name='weight' size={17} color={'#666'} />
                        <Text style={styles.stats_text}>{workout.volume} lb</Text>
                    </View>
                    <View style={styles.stats_entry}>
                        <FontAwesome6 name="trophy" color={"#666"} size={14} />
                        <Text style={styles.stats_text}>{workout.PBs} PBs</Text>
                    </View>
                </View>
            </View>
            <View style={styles.bottomHalf}>
                <RNBounceable style={styles.button} onPress={openWorkout}>
                    <Text style={styles.buttonText}>Back to Workout</Text>
                </RNBounceable>
            </View>
        </View>
    );
};

export default React.memo(CurrentWorkoutPanel);

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 16,
        borderRadius: 16,
        marginHorizontal: 16,
        backgroundColor: '#fff',
        shadowColor: '#ccc',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
        elevation: 5
    },
    topHalf: {
        paddingBottom: 3,
        paddingHorizontal: 5
    },
    exerciseName: {
        fontSize: 17,
        fontFamily: 'Outfit_600SemiBold',
        marginBottom: 6
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    clockIcon: {
        marginTop: 1,
        marginRight: 4,
    },
    timeElapsed: {
        fontSize: 15,
        color: '#999',
        fontFamily: 'Outfit_600SemiBold'
    },
    bottomHalf: {
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    button: {
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#40D99B',
        borderRadius: 10,
        paddingVertical: 13,
    },
    buttonText: {
        color: '#fff',
        fontSize: 12.5,
        fontFamily: 'Poppins_600SemiBold'
    },
    stats_row: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    stats_entry: {
        marginRight: 15,
        flexDirection: 'row',
        alignItems: 'center',
    },
    stats_text: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 13.5,
        marginLeft: 5,
        color: '#666'
    },
});
