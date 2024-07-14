import React from 'react';
import { View, Dimensions, StyleSheet, Text } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import moment from 'moment';

const data = [
    { date: '7/7', max: 254 },
    { date: '7/8', max: 265 },
    { date: '7/9', max: 290 },
    { date: '7/12', max: 295 },
];

// Generate the last 7 days with the first letter of each day
const generateLast7Days = () => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        last7Days.push({
            day: moment().subtract(i, 'days').format('dd')[0],
            date: moment().subtract(i, 'days').format('M/D')
        });
    }
    return last7Days;
};

// Generate the days of the current month with intervals of 3 days
const generateMonthlyDays = () => {
    const daysInMonth = moment().daysInMonth();
    const monthlyDays = [];
    for (let i = 1; i <= daysInMonth; i++) {
        monthlyDays.push({
            day: i,
            date: moment().date(i).format('M/D')
        });
    }
    return monthlyDays;
};

// Generate the x-axis labels for the current month in intervals of 3 days
const generateXAxisLabelsMonthly = () => {
    const xAxisLabels = [];
    const daysInMonth = moment().daysInMonth();
    for (let i = 1; i <= daysInMonth; i++) {
        xAxisLabels.push(i % 3 === 0 ? i.toString() : '');
    }
    return xAxisLabels;
};

const screenWidth = Dimensions.get('window').width;

export default function ExerciseGraph() {
    const last7Days = generateLast7Days();
    const monthlyDays = generateMonthlyDays();
    const xAxisLabelsMonthly = generateXAxisLabelsMonthly();

    // Create an array with 7 points for the 7-day view
    const chartData7Days = last7Days.map(({ day, date }) => {
        const matchingData = data.find(item => item.date === date);
        return { value: matchingData ? matchingData.max : null, label: day };
    });

    // Create chart data for monthly view, aligning the points to their corresponding dates
    const chartDataMonthly = monthlyDays.map(({ date }) => {
        const matchingData = data.find(item => item.date === date);
        return { value: matchingData ? matchingData.max : null };
    });

    return (
        <View style={styles.container}>
            <View style={styles.chartContainer}>
                <LineChart
                    data={chartData7Days}
                    width={screenWidth * 0.75} // width of the chart adjusted to fit within margin and padding
                    height={200} // height of the chart
                    color="rgba(134, 65, 244, 1)"
                    yAxisTextStyle={styles.yAxisTextStyle}
                    xAxisTextStyle={styles.xAxisTextStyle}
                    noOfSections={4} // number of sections in the y-axis
                    maxValue={300} // maximum value for the y-axis
                    yAxisColor="#515151"
                    rulesColor="#ccc"
                    thickness={2}
                    isAnimated
                    curved // Use the curved property to smooth the line
                    xAxisLabelTextStyle={styles.xAxisTextStyle}
                />
            </View>

            {/* <View style={styles.chartContainer}>
                <LineChart
                    data={chartDataMonthly}
                    width={screenWidth * 0.9} // width of the chart adjusted to fit within margin and padding
                    height={200} // height of the chart
                    color="rgba(134, 65, 244, 1)"
                    yAxisTextStyle={styles.yAxisTextStyle}
                    xAxisTextStyle={styles.xAxisTextStyle}
                    noOfSections={4} // number of sections in the y-axis
                    maxValue={300} // maximum value for the y-axis
                    yAxisColor="#515151"
                    rulesColor="#ccc"
                    thickness={2}
                    isAnimated
                    curved // Use the curved property to smooth the line
                    xAxisLabelTextStyle={styles.xAxisTextStyle}
                    xAxisLabelTexts={xAxisLabelsMonthly}
                    adjustToWidth
                    initialSpacing={0}
                    xAxisLabelWidth={screenWidth / 10} // Adjust the width to fit the labels evenly
                />
            </View> */}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 5,
        margin: 10,
        alignItems: 'center', // Center the chart horizontally
    },
    chartContainer: {
        margin: 10,
        paddingRight: screenWidth * 0.1,
        paddingBottom: 20, // Added padding to prevent x-axis labels from being cut off
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    yAxisTextStyle: {
        color: '#333',
        fontSize: 13,
        fontFamily: 'Mulish_500Medium',
    },
    xAxisTextStyle: {
        color: '#333',
        fontSize: 10,
        fontFamily: 'Mulish_500Medium',
    },
});
