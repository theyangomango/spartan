import React, { useState } from "react";
import { StyleSheet, View, Text, Image, ScrollView, Pressable, LayoutAnimation, UIManager, Platform, Dimensions } from "react-native";
import HexagonalStats from "./HexagonalStats";
import ExerciseGraph from "./ExerciseGraph";

const { width, height } = Dimensions.get('screen');

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const exercises = [
    { name: "Bench Press (Dumbell)", recordUser1: 100, recordUser2: 85 },
    { name: "Shoulder Press", recordUser1: 70, recordUser2: 75 },
    { name: "Lateral Raises", recordUser1: 20 },
    { name: "Reverse Bicep Curls (Barbell)", recordUser1: 100, recordUser2: 105 },
    { name: "Deadlift", recordUser1: 120 },
    { name: "Bicep Curls", recordUser1: 30, recordUser2: 35 },
    // Add more exercises as needed
];

const barMaxWidth = width * 0.5; // Fixed width of the bar in pixels

export default function UserStatsModal({ user }) {
    const [expandedIndex, setExpandedIndex] = useState(null);

    const toggleExpand = (index) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Image source={{ uri: user.image }} style={styles.pfp} />
                    <Text numberOfLines={1} ellipsizeMode="tail" style={styles.handle}>{user.handle}</Text>
                </View>
                <View style={styles.header_right}>
                    <Text style={styles.overallScore}>94 overall</Text>
                </View>
            </View>
            <ScrollView style={styles.scrollview} showsVerticalScrollIndicator={false}>
                <HexagonalStats statsHexagon={user.statsHexagon} />
                <View style={styles.exercisesContainer}>
                    {exercises.map((exercise, index) => {
                        const maxRecord = Math.max(exercise.recordUser1 || 0, exercise.recordUser2 || 0);
                        const minRecord = Math.min(exercise.recordUser1 || 0, exercise.recordUser2 || 0);
                        const user1IsMax = exercise.recordUser1 >= (exercise.recordUser2 || 0);
                        const proportionalWidth = (minRecord / maxRecord) * barMaxWidth;
                        const inverted = exercise.recordUser1 > exercise.recordUser2;

                        return (
                            <Pressable key={index} onPress={() => toggleExpand(index)}>
                                <View style={styles.exerciseRow}>
                                    <Text numberOfLines={1} style={styles.exerciseName}>{exercise.name}</Text>
                                    <View style={[styles.barContainer, { backgroundColor: inverted ? '#59AAEE' : 'rgba(89, 170, 238, 0.3)' }]}>
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
                                    <View style={styles.stat_text_ctnr}>
                                        <Text style={styles.user1Stat}>{exercise.recordUser1}</Text>
                                    </View>
                                </View>
                                {expandedIndex === index && (
                                    <ExerciseGraph exerciseName={exercises[index].name} />
                                )}
                            </Pressable>
                        );
                    })}
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    scrollview: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        paddingHorizontal: 3,
        paddingTop: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 25,
        // marginBottom: 20,
        justifyContent: 'space-between',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '54%'
    },
    header_right: {
        marginLeft: 15
    },
    pfp: {
        width: 43,
        aspectRatio: 1,
        borderRadius: 25,
        marginRight: 12
    },
    handle: {
        fontSize: 19,
        fontFamily: 'Outfit_600SemiBold',
    },
    overallScore: {
        fontSize: 20,
        fontFamily: 'Outfit_600SemiBold',
        color: '#59AAEE'
    },
    exercisesContainer: {
        paddingHorizontal: 15,
        marginTop: 20
    },
    exerciseRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    exerciseName: {
        fontSize: 16.5,
        fontFamily: 'Outfit_500Medium',
        flex: 1,
        paddingBottom: 2,
    },
    barContainer: {
        flexDirection: 'row',
        height: 20,
        borderRadius: 10,
        overflow: 'hidden',
        marginLeft: 10,
        width: barMaxWidth,
        marginVertical: 10
    },
    userBar: {
        height: '100%',
    },
    userBar1: {
        backgroundColor: '#59AAEE',
    },
    userBar2: {
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
    },
    stat_text_ctnr: {},
    user1Stat: {
        fontSize: 15,
        color: '#59AAEE',
        marginLeft: 8,
        fontFamily: 'Poppins_600SemiBold',
        marginVertical: 9
    },
    expandedContent: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: '#f0f0f0',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    expandedText: {
        fontSize: 14,
        color: '#333',
    }
});
