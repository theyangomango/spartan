import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import { Clock } from 'iconsax-react-native';
import { MaterialCommunityIcons, FontAwesome6 } from '@expo/vector-icons';
import RNBounceable from '@freakycoder/react-native-bounceable';

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // Scaling factor based on iPhone 13 height

const scaledSize = (size) => Math.round(size * scale);

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
                        <Clock color='#666' size={scaledSize(16)} variant='Bold' />
                        <Text style={styles.stats_text}>{time}</Text>
                    </View>
                    <View style={styles.stats_entry}>
                        <MaterialCommunityIcons name='weight' size={scaledSize(17)} color={'#666'} />
                        <Text style={styles.stats_text}>{workout.volume} lb</Text>
                    </View>
                    <View style={styles.stats_entry}>
                        <FontAwesome6 name="trophy" color={"#666"} size={scaledSize(14)} />
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
        paddingHorizontal: scaledSize(16),
        paddingTop: scaledSize(16),
        paddingBottom: scaledSize(16),
        borderRadius: scaledSize(16),
        marginHorizontal: scaledSize(16),
        marginTop: scaledSize(12),
        backgroundColor: '#fff',
        shadowColor: '#ccc',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: scaledSize(2),
        elevation: 5
    },
    topHalf: {
        paddingBottom: scaledSize(3),
        paddingHorizontal: scaledSize(5)
    },
    exerciseName: {
        fontSize: scaledSize(17),
        fontFamily: 'Outfit_600SemiBold',
        marginBottom: scaledSize(6)
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    clockIcon: {
        marginTop: scaledSize(1),
        marginRight: scaledSize(4),
    },
    timeElapsed: {
        fontSize: scaledSize(15),
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
        borderRadius: scaledSize(10),
        paddingVertical: scaledSize(13),
    },
    buttonText: {
        color: '#fff',
        fontSize: scaledSize(12.5),
        fontFamily: 'Poppins_600SemiBold'
    },
    stats_row: {
        flexDirection: 'row',
        marginBottom: scaledSize(10),
    },
    stats_entry: {
        marginRight: scaledSize(15),
        flexDirection: 'row',
        alignItems: 'center',
    },
    stats_text: {
        fontFamily: 'Outfit_400Regular',
        fontSize: scaledSize(13.5),
        marginLeft: scaledSize(5),
        color: '#666'
    },
});
