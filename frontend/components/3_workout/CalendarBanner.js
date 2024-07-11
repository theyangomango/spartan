import React from 'react';
import { StyleSheet, View, Text } from "react-native";
import dayjs from 'dayjs';
import RNBounceable from '@freakycoder/react-native-bounceable';

export default function CalendarBanner() {
    // Generate dates for the past two weeks and next few days to fill any blanks
    const daysOfWeek = ["S", "M", "T", "W", "T", "F", "S"];
    const today = dayjs();
    const dates = [];

    // Calculate the dates for the past two weeks including today
    for (let i = 13; i >= 0; i--) {
        dates.push(today.subtract(i, 'days').date());
    }

    // Add future dates to fill in any blank spaces after today
    for (let i = 1; dates.length % 14 !== 0; i++) {
        dates.push(today.add(i, 'days').date());
    }

    // Test active dates
    const activeDates = [today.date(), today.subtract(10, 'day').date(), today.subtract(3, 'days').date(), today.subtract(11, 'days').date()];

    const isActiveDate = (date) => activeDates.includes(date);

    return (
        <View style={styles.container}>
            <View style={styles.calendarHeader}>
                {daysOfWeek.map((day, index) => (
                    <Text key={index} style={styles.dayText}>{day}</Text>
                ))}
            </View>
            <View style={styles.calendarBody}>
                {dates.map((date, index) => (
                    <View key={index} style={styles.dateContainer}>
                        <View style={[styles.dateCircle, isActiveDate(date) && styles.activeDate]}>
                            <Text style={[styles.dateText, isActiveDate(date) && styles.activeDateText]}>
                                {date}
                            </Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        // height: 170,
        marginHorizontal: 17,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        // borderRadius: 35,
        backgroundColor: '#fff',
        paddingHorizontal: 15,
        paddingTop: 18,
        paddingBottom: 11,
        justifyContent: 'center',

        shadowColor: '#cdcdcd',
        shadowOffset: { width: 0, height: 1.2 },
        shadowOpacity: 0.8,
        shadowRadius: 3,
        elevation: 5
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    dayText: {
        width: '14%',
        textAlign: 'center',
        fontWeight: 'bold',
        color: '#555',
        fontFamily: 'Poppins_600SemiBold'
    },
    calendarBody: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    dateContainer: {
        width: '14%',
        alignItems: 'center',
        // marginBottom: 3, // Add vertical space between dates
    },
    dateCircle: {
        marginVertical: 3,
        width: 29,
        height: 29,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dateText: {
        textAlign: 'center',
        color: '#555',
        fontFamily: 'Poppins_300Light'
    },
    activeDate: {
        backgroundColor: '#C7ECFF', // Decrease opacity of the blue
        color: '#fff',
    },
    activeDateText: {
        color: '#666'
    }
});
