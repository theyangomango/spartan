import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, Image, ScrollView, Pressable, LayoutAnimation, UIManager, Platform, Dimensions } from "react-native";
import HexagonalStats from "./HexagonalStats";
import ExerciseGraph from "./ExerciseGraph";

const { width, height } = Dimensions.get('screen');

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const barMaxWidth = width * 0.45; // Fixed width of the bar in pixels

function getTopExercisesByPopularity(user) {
    // Convert the map (object) into an array of [key, value] pairs
    const exercisesArray = Object.entries(user.statsExercises);

    // Filter out exercises where sets length is 0
    const filteredExercises = exercisesArray.filter(([, exercise]) => exercise.sets.length > 0);
    
    // Sort the array by the length of the 'sets' array in each exercise object
    const sortedExercises = filteredExercises.sort(([, a], [, b]) => b.sets.length - a.sets.length);
    
    // Return them as an array of objects with the name and exercise data
    const exercises = sortedExercises.map(([name, exercise]) => ({
        name: name,
        exercise: exercise
    }));
    
    return exercises;
}

export default function UserStatsModal({ user }) {
    const [expandedIndex, setExpandedIndex] = useState(null);
    const data = getTopExercisesByPopularity(user); // Get the top exercises

    const toggleExpand = (index) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    useEffect(() => {
        console.log(data);
    }, [data]);

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Image source={{ uri: user.image }} style={styles.pfp} />
                    <Text numberOfLines={1} ellipsizeMode="tail" style={styles.handle}>{user.handle}</Text>
                </View>
                <View style={styles.header_right}>
                    <Text style={styles.overallScore}>{user.statsHexagon.overall} overall</Text>
                </View>
            </View>
            <ScrollView style={styles.scrollview} showsVerticalScrollIndicator={false}>
                <HexagonalStats statsHexagon={user.statsHexagon} />
                <View style={styles.exercisesContainer}>
                    {data.map((exerciseData, index) => {
                        const exercise = exerciseData.exercise;
                        const exerciseName = exerciseData.name;
                        const recordUser1 = Math.round(exercise['1RM']); // Round 1RM to the nearest whole number
                        
                        const maxRecord = Math.max(recordUser1 || 0, exercise.recordUser2 || 0);
                        const minRecord = Math.min(recordUser1 || 0, exercise.recordUser2 || 0);
                        const user1IsMax = recordUser1 >= (exercise.recordUser2 || 0);
                        const proportionalWidth = (minRecord / maxRecord) * barMaxWidth;
                        const inverted = recordUser1 > exercise.recordUser2;

                        return (
                            <Pressable key={index} onPress={() => toggleExpand(index)}>
                                <View style={styles.exerciseRow}>
                                    <Text numberOfLines={1} style={styles.exerciseName}>{exerciseName}</Text>
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
                                        <Text style={styles.user1Stat}>{recordUser1}</Text>
                                    </View>
                                </View>
                                {expandedIndex === index && (
                                    <ExerciseGraph name={exerciseName} exercise={exercise}/>
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
