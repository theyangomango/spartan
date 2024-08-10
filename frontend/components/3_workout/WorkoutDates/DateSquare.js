import React, { useState, useEffect, memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RNBounceable from '@freakycoder/react-native-bounceable';

const DateSquare = memo(({ date, isToday, isHighlighted, initialSelected, scheduleWorkout, descheduleWorkout, isPanelVisible, selectedDate }) => {
    const [isSelected, setIsSelected] = useState(initialSelected);
    const [flag, setFlag] = useState(false);

    useEffect(() => {
        if (!isSelected) {
        } else {
        }
    }, [isSelected, flag]);

    const handlePress = () => {
        if (date > new Date()) {
            if (isPanelVisible && selectedDate == date) {
                setIsSelected(false);
                descheduleWorkout(date);

            } else {
                setIsSelected(true);
                scheduleWorkout(date);

            }
        }
    };

    useEffect(() => {
        setIsSelected(initialSelected);
    }, [initialSelected]);

    return (
        <View>
            <RNBounceable
                style={[
                    styles.dateContainer,
                    isHighlighted && styles.highlightedDateContainer,
                    isSelected && styles.selectedDateContainer
                ]}
                onPress={handlePress}
            >
                <Text style={[
                    styles.dayOfWeek,
                    isHighlighted && styles.highlightedDayOfWeek,
                    isSelected && styles.selectedText
                ]}>
                    {date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
                </Text>
                <Text style={[
                    styles.dateNumber,
                    isHighlighted && styles.highlightedDateNumber,
                    isSelected && styles.selectedDateNumber
                ]}>
                    {date.getDate().toString().padStart(2, '0')}
                </Text>
                {date == selectedDate && (
                    <View style={styles.dotContainer}>
                        <Ionicons name="ellipse" size={6} color="#fff" />
                    </View>
                )}
                {isToday && (
                    <View style={styles.dotContainer}>
                        <Ionicons name="ellipse" size={6} color="red" />
                    </View>
                )}
            </RNBounceable>
        </View>
    );
});

const styles = StyleSheet.create({
    dateContainer: {
        width: 50,
        height: 65,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 5,
        backgroundColor: '#f8f8f8',
        borderRadius: 10,
    },
    highlightedDateContainer: {
        backgroundColor: '#40D99B',
    },
    selectedDateContainer: {
        backgroundColor: '#82BDFE',
    },
    dayOfWeek: {
        fontSize: 12,
        marginBottom: 8,
        color: '#aaa',
        fontFamily: 'Inter_700Bold',
    },
    dateNumber: {
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
    },
    highlightedDateNumber: {
        color: '#fff',
    },
    highlightedDayOfWeek: {
        color: '#eee',
    },
    selectedText: {
        color: '#eee',
    },
    selectedDateNumber: {
        color: '#fff',
    },
    dotContainer: {
        position: 'absolute',
        bottom: 5,
    },
});

export default DateSquare;
