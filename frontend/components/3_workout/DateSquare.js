import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RNBounceable from '@freakycoder/react-native-bounceable';

const DateSquare = ({ date, isToday, isHighlighted, initialSelected, onPress, scheduleWorkout, descheduleWorkout, isPanelVisible }) => {
    const [isSelected, setIsSelected] = useState(initialSelected);
    const [flag, setFlag] = useState(false);

    useEffect(() => {

        if (!isSelected) {
            descheduleWorkout();
        } else {
            scheduleWorkout();
        }

    }, [isSelected, flag]);

    const handlePress = () => {
        if (date > new Date()) {

            if (isPanelVisible) {
                setIsSelected(false);
            } else {
                setIsSelected(true);
                setFlag(!flag);
            }

            // setIsSelected(!isSelected);

            // if (isSelected) {
            //     descheduleWorkout();
            // } else {
            //     scheduleWorkout();
            // }

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
                {isToday && (
                    <View style={styles.dotContainer}>
                        <Ionicons name="ellipse" size={6} color="red" />
                    </View>
                )}
            </RNBounceable>
        </View>

    );
};

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
        backgroundColor: '#70DC8D', // Highlighted date background color
    },
    selectedDateContainer: {
        backgroundColor: '#82BDFE', // Selected date background color
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
        color: '#fff', // Text color for highlighted dates
    },
    highlightedDayOfWeek: {
        color: '#eee',
    },
    selectedText: {
        color: '#eee', // Text color for selected dates
    },
    selectedDateNumber: {
        color: '#fff', // Text color for selected dates
    },
    dotContainer: {
        position: 'absolute',
        bottom: 5,
    },

    panel: {
        position: 'absolute',
        top: 70,
        width: 300,
        height: 50,
        borderRadius: 15,
        backgroundColor: '#eee',
        flexDirection: 'row',
        justifyContent: 'space-around',
        // alignItems: 'center',
        // borderTopWidth: 1,
        // borderColor: '#ccc',
        zIndex: 1,
    },
    panelButton: {
        // padding: 10,
        height: 40,
        backgroundColor: '#f0f0f0',
        borderRadius: 5,
    },
    panelButtonText: {
        fontSize: 14,
    },
});

export default DateSquare;
