import React, { useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableWithoutFeedback, Animated } from "react-native";

export default function TemplateCard({ lastUsedDate, exercises, name }) {
    const muscleColors = {
        Chest: '#FFAFB8',
        Shoulders: '#A1CDEE',
        Biceps: '#CBBCFF',
        Back: '#95E0C8'
    };

    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.92,
            friction: 3,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 3,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View style={[styles.main_ctnr, { transform: [{ scale: scaleAnim }] }]}>
            <TouchableWithoutFeedback onPressIn={handlePressIn} onPressOut={handlePressOut}>
                <View style={styles.left_ctnr}>
                    <Text style={styles.title_text}>{name}</Text>
                    <Text style={styles.date_text}>{lastUsedDate}</Text>
                </View>
            </TouchableWithoutFeedback>
            <View style={styles.right_ctnr}>
                <ScrollView contentContainerStyle={styles.scroll_ctnr} showsVerticalScrollIndicator={false}>
                    {exercises.map((exercise, index) => (
                        <View key={index} style={styles.entry_ctnr}>
                            <Text style={styles.exercise_text}>{exercise.name}</Text>
                            <View style={[styles.muscle_ctnr, { backgroundColor: muscleColors[exercise.muscle] }]}>
                                <Text style={styles.muscle_text}>{exercise.muscle}</Text>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        flexDirection: 'row',
        borderRadius: 15,
        paddingLeft: 18,
        paddingRight: 3,
        marginVertical: 6,
        marginHorizontal: 15,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1.5 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 15,
        height: 104.5,
        justifyContent: 'space-between'
    },
    left_ctnr: {
        width: '33%',
        paddingVertical: 12,
        justifyContent: 'center',
        marginRight: 8
    },
    right_ctnr: {
        flex: 1,
        paddingBottom: 1
    },
    title_text: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 17,
        color: '#2D9EFF'
    },
    date_text: {
        fontFamily: 'Outfit_300Light',
        fontSize: 12,
        color: '#666',
    },
    scroll_ctnr: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingTop: 12,
        paddingBottom: 10
    },
    entry_ctnr: {
        flexDirection: 'row',
        paddingBottom: 4.5
    },
    exercise_text: {
        fontFamily: 'Outfit_300Light',
        fontSize: 14.5,
        marginRight: 5
    },
    muscle_ctnr: {
        borderRadius: 10,
        paddingHorizontal: 8.5,
        alignItems: 'center',
        justifyContent: 'center'
    },
    muscle_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 10.5,
        color: '#fff'
    },
});
