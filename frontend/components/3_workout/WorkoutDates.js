import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions } from 'react-native';
import { Calendar } from 'iconsax-react-native';
import DateSquare from './DateSquare';

const WorkoutDates = ({ scheduleWorkout, descheduleWorkout, isPanelVisible, selectedDate }) => {
    const flatListRef = useRef(null);
    const [dates, setDates] = useState([]);
    const [currentMonthYear, setCurrentMonthYear] = useState('');
    const [scheduledDates, setScheduledDates] = useState([]);
    const [layoutComplete, setLayoutComplete] = useState(false);
    const startDate = new Date('2024-07-01');
    const today = new Date();
    const weekAfterToday = new Date(today);
    weekAfterToday.setDate(today.getDate() + 7);

    const highlightedDates = new Set(['2024-07-26', '2024-07-28', '2024-07-20']); // Example hard-coded dates

    useEffect(() => {
        const initialDates = generateDates(startDate, weekAfterToday);
        setDates(initialDates);
        updateMonthYear(initialDates[initialDates.length - 8]);
    }, []);

    useEffect(() => {
        if (dates.length > 0 && layoutComplete) {
            scrollToToday();
        }
    }, [dates, layoutComplete]);

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

    const scrollToToday = () => {
        const todayIndex = dates.findIndex(date => date.toDateString() === today.toDateString());
        if (todayIndex !== -1) {
            const screenWidth = Dimensions.get('window').width;
            const scrollToX = (todayIndex * 60) - (screenWidth / 2) + 25; // Center today’s date
            flatListRef.current?.scrollToOffset({ offset: scrollToX, animated: true });
        }
    };

    // const handleDatePress = useCallback((date) => {
    //     setShowPanel(true);
    //     // Your press handling logic
    // }, [setShowPanel]);

    const renderItem = useCallback(({ item, index }) => {
        const isHighlighted = highlightedDates.has(item.toISOString().split('T')[0]);
        const isToday = item.toDateString() === today.toDateString();
        const isSelected = scheduledDates.includes(item.toDateString());

        return (
            <DateSquare
                key={index}
                date={item}
                isToday={isToday}
                isHighlighted={isHighlighted}
                initialSelected={isSelected}
                // onPress={handleDatePress}
                scheduleWorkout={scheduleWorkout}
                descheduleWorkout={descheduleWorkout}
                // setShowPanel={setShowPanel}
                isPanelVisible={isPanelVisible}
                selectedDate={selectedDate}
            />
        );
    }, [highlightedDates, today, scheduledDates, scheduleWorkout, descheduleWorkout]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.monthYear}>{currentMonthYear}</Text>
                <Calendar size="26.5" variant="Broken" color={'#000'} />
            </View>
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={dates}
                renderItem={renderItem}
                keyExtractor={(item, index) => index.toString()}
                ref={flatListRef}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                onLayout={() => setLayoutComplete(true)}
                getItemLayout={(data, index) => ({ length: 60, offset: 60 * index, index })}
                contentContainerStyle={styles.scrollContainer}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 60,
        left: 3,
        right: 3,
        // height: 300,
        zIndex: 1,
        backgroundColor: 'transparent'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 21,
        paddingRight: 21,
        marginBottom: 10,
    },
    scrollContainer: {
    },
    monthYear: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
    },
    panel: {
        position: 'absolute',
        top: 70,
        width: '100%',
        height: 50,
        borderRadius: 15,
        backgroundColor: '#eee',
        flexDirection: 'row',
        justifyContent: 'space-around',
        zIndex: 1,
    },
});

export default WorkoutDates;
