import RNBounceable from '@freakycoder/react-native-bounceable';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Calendar } from 'iconsax-react-native'

const WorkoutDates = () => {
    const scrollViewRef = useRef(null);
    const [dates, setDates] = useState([]);
    const [currentMonthYear, setCurrentMonthYear] = useState('');
    const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const startDate = new Date('2024-01-01');
    const today = new Date();

    const highlightedDates = ['2024-07-10', '2024-07-15', '2024-07-20']; // Example hard-coded dates

    useEffect(() => {
        const initialDates = generateDates(startDate, today);
        setDates(initialDates);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 0);
        updateMonthYear(initialDates[initialDates.length - 1]);
    }, []);

    const generateDates = (startDate, endDate) => {
        const dates = [];
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return dates;
    };

    const updateMonthYear = (date) => {
        const options = { month: 'long', year: 'numeric' };
        setCurrentMonthYear(new Intl.DateTimeFormat('en-US', options).format(date));
    };

    const handleScroll = (event) => {
        const scrollPosition = event.nativeEvent.contentOffset.x;
        const index = Math.min(Math.floor(scrollPosition / 60), dates.length - 1);
        updateMonthYear(dates[index]);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.monthYear}>{currentMonthYear}</Text>
                {/* <MaterialIcons name="calendar-today" size={24} color="black" /> */}
                <Calendar size="26.5" variant="Broken" color={'#000'}/>
            </View>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContainer}
                ref={scrollViewRef}
                onScroll={handleScroll}
                scrollEventThrottle={16}
            >
                {dates.map((date, index) => {
                    const dayOfWeek = daysOfWeek[date.getDay()];
                    const dateNumber = date.getDate().toString().padStart(2, '0');
                    const formattedDate = date.toISOString().split('T')[0];
                    const isHighlighted = highlightedDates.includes(formattedDate);

                    return (
                        <RNBounceable bounceEffectIn={0.75} key={index} style={[styles.dateContainer, isHighlighted && styles.highlightedDateContainer]}>
                            <Text style={[styles.dayOfWeek, isHighlighted && styles.highlightedDayOfWeek]}>{dayOfWeek}</Text>
                            <Text style={[styles.dateNumber, isHighlighted && styles.highlightedDateNumber]}>{dateNumber}</Text>
                        </RNBounceable>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 120,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 12,
        paddingRight: 12,
        marginBottom: 5,
    },
    scrollContainer: {
        alignItems: 'center',
    },
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
        backgroundColor: '#82BDFE', // Highlighted date background color
    },
    dayOfWeek: {
        fontSize: 12,
        marginBottom: 8,
        color: '#aaa',
        fontFamily: 'Inter_700Bold'
    },
    dateNumber: {
        fontSize: 14,
        fontFamily: 'Poppins_500Medium'
    },
    monthYear: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold'
    },
    highlightedDateNumber: {
        color: 'white', // Text color for highlighted dates
    },
    highlightedDayOfWeek: {
        color: '#eee'
    }
});

export default WorkoutDates;
