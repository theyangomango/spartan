import React, { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import scaleSize from '../../../helper/scaleSize';
import { Send2, Heart } from 'iconsax-react-native';
import ViewWorkoutExerciseLog from "./ViewWorkoutExerciseLog";
import ProgressBanner from '../../3_Workout/NewWorkout/Tracking/ProgressBanner';
import millisToHoursMinutesSeconds from '../../../helper/millisToHoursMinutesSeconds';

const { height: screenHeight } = Dimensions.get('window');
const scaledSize = (size) => scaleSize(size);

export default function ViewWorkoutModal({ workout }) {
    const [isLiked, setIsLiked] = useState(false); // State to track if the workout is liked

    const toggleLike = () => {
        setIsLiked((prev) => !prev); // Toggle the like state
    };

    return (
        <View style={styles.main}>
            <View style={styles.header}>
                {/* Share Button on the left */}
                <Pressable style={styles.shareIcon} onPress={() => console.log('Share Pressed')}>
                    <Send2 size="24" color="#6CAFFF" variant="Bold" />
                </Pressable>

                {/* Timer Text */}
                <Text style={styles.timer_text}>
                    {millisToHoursMinutesSeconds(workout.duration)}
                </Text>

                {/* Heart Icon on the right */}
                <Pressable style={styles.heartIcon} onPress={toggleLike}>
                    <Heart
                        size="24"
                        color={isLiked ? "#FF8A65" : "#ccc"} // Switch color based on like state
                        variant="Bold"
                    />
                </Pressable>
            </View>
            <ScrollView
                style={styles.scrollview}
                showsVerticalScrollIndicator={false}
            >
                <ProgressBanner totalReps={workout.reps} totalVolume={workout.volume} personalBests={workout.PBs} />
                {workout.exercises.map((ex, exerciseIndex) => (
                    <ViewWorkoutExerciseLog
                        name={ex.name}
                        muscle={ex.muscle}
                        exerciseIndex={exerciseIndex}
                        key={ex.name + exerciseIndex}
                        sets={ex.sets}
                        userStats={workout?.__friendStats || workout?.statsExercises || null}
                    />
                ))}
                <View style={{ height: scaleSize(scaledSize(50)) }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    main: {
        flex: 1,
    },
    scrollview: {
        paddingTop: scaleSize(scaledSize(5)),
    },
    header: {
        flexDirection: 'row', // Align the icons and text in a row
        alignItems: 'center', // Align items vertically in the center
        paddingTop: scaleSize(scaledSize(5)),
        paddingBottom: scaleSize(scaledSize(9)),
    },
    timer_text: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(18),
        color: '#aaa',
        textAlign: 'center',
        flex: 1, // Allow the text to take the remaining space
    },
    shareIcon: {
        position: 'absolute', // Align absolutely on the left
        left: scaleSize(scaledSize(25)),
    },
    heartIcon: {
        position: 'absolute', // Align absolutely on the right
        right: scaleSize(scaledSize(28)),
    },
});
