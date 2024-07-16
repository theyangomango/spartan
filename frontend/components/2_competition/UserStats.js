import React from "react";
import { StyleSheet, View, Text, Image, ScrollView } from "react-native";
import HexagonalStats from "./HexagonalStats";

const exercises = [
    { name: "Bench Press", recordUser1: 100, recordUser2: 85 },
    { name: "Shoulder Press", recordUser1: 70, recordUser2: 75 },
    { name: "Lateral Raises", recordUser1: 20 },
    { name: "Squats", recordUser1: 100, recordUser2: 105 },
    { name: "Deadlift", recordUser1: 120 },
    { name: "Bicep Curls", recordUser1: 30, recordUser2: 35 },
    // Add more exercises as needed
];

const barMaxWidth = 200; // Fixed width of the bar in pixels

export default function UserStats({ user }) {
    return (
        <ScrollView style={styles.main_view}>
            <View style={styles.header}>
                <Image source={{ uri: user.image }} style={styles.pfp} />
                <Text style={styles.handle}>{user.handle}</Text>
            </View>
            <HexagonalStats />
            <View style={styles.exercisesContainer}>
                {exercises.map((exercise, index) => {
                    const maxRecord = Math.max(exercise.recordUser1 || 0, exercise.recordUser2 || 0);
                    const minRecord = Math.min(exercise.recordUser1 || 0, exercise.recordUser2 || 0);
                    const user1IsMax = exercise.recordUser1 >= (exercise.recordUser2 || 0);
                    const proportionalWidth = (minRecord / maxRecord) * barMaxWidth;
                    const inverted = exercise.recordUser1 > exercise.recordUser2;

                    return (
                        <View key={index} style={styles.exerciseRow}>
                            <Text style={styles.exerciseName}>{exercise.name}</Text>
                            <View style={[styles.barContainer, {backgroundColor: inverted ? 'purple' : '#ccc'}]}>
                                {exercise.recordUser2 ? (
                                    <>
                                        <View
                                            style={[
                                                styles.userBar,
                                                !user1IsMax ? styles.userBar1 : styles.userBar2,
                                                { width: proportionalWidth }
                                            ]}
                                        />
                                    </>
                                ) : (
                                    <View
                                        style={[
                                            styles.userBar,
                                            styles.userBar1,
                                            { width: barMaxWidth }
                                        ]}
                                    />
                                )}
                            </View>
                        </View>
                    );
                })}
            </View>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    main_view: {
        flex: 1,
        backgroundColor: '#fff'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
    },
    pfp: {
        width: 44,
        aspectRatio: 1,
        borderRadius: 25,
        marginRight: 12
    },
    handle: {
        fontSize: 21,
        fontFamily: 'Outfit_600SemiBold'
    },
    exercisesContainer: {
        padding: 20,
    },
    exerciseRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0'
    },
    exerciseName: {
        fontSize: 18,
        fontFamily: 'Outfit_400Regular',
        flex: 1
    },
    barContainer: {
        flexDirection: 'row',
        height: 20,
        // backgroundColor: '#e0e0e0',
        borderRadius: 10,
        overflow: 'hidden',
        marginLeft: 10,
        width: barMaxWidth
    },
    userBar: {
        height: '100%',
    },
    userBar1: {
        backgroundColor: 'rgba(0, 0, 255, 0.6)',
    },
    userBar2: {
        backgroundColor: 'rgba(128, 128, 128, 0.6)',
    }
});
