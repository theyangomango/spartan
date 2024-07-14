import RNBounceable from '@freakycoder/react-native-bounceable';
import React, { useState } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

const screenWidth = Dimensions.get('window').width;

const customDataPoint = () => {
    return (
        <View style={styles.customDataPoint} />
    );
};

const CustomLabel = ({ val }) => {
    return (
        <View style={styles.customLabelContainer}>
            <Text style={styles.customLabelText}>{val}</Text>
        </View>
    );
}

const getPast30DaysData = (inputs) => {
    const currentDate = new Date();
    const past30DaysDate = new Date();
    past30DaysDate.setDate(currentDate.getDate() - 30);

    const filteredData = inputs.filter(input => {
        const [month, day] = input.date.split('/');
        const inputDate = new Date(currentDate.getFullYear(), parseInt(month) - 1, parseInt(day));
        return inputDate >= past30DaysDate;
    });

    const dataPoints = [];
    let lastValue = null;
    let lastInputDate = null;
    let sundayCount = 0;

    // Find the last input date
    if (filteredData.length > 0) {
        const lastInput = filteredData[filteredData.length - 1];
        const [lastMonth, lastDay] = lastInput.date.split('/');
        lastInputDate = new Date(currentDate.getFullYear(), parseInt(lastMonth) - 1, parseInt(lastDay));
    }

    for (let d = new Date(past30DaysDate); d <= currentDate; d.setDate(d.getDate() + 1)) {
        const formattedDate = `${d.getMonth() + 1}/${d.getDate()}`;
        const dataPoint = filteredData.find(input => input.date === formattedDate);

        if (dataPoint) {
            lastValue = dataPoint.value;
            dataPoints.push({
                value: dataPoint.value,
                customDataPoint: customDataPoint,
            });
        } else if (lastInputDate && d > lastInputDate) {
            dataPoints.push({
                value: lastValue,
                hideDataPoint: 'true'
            });
        } else {
            dataPoints.push({
                // value: null
            });
        }

        if (d.getDay() === 0 && sundayCount < 4) { // Check if the day is Sunday and ensure only 4 Sundays
            dataPoints[dataPoints.length - 1].labelComponent = () => <CustomLabel val={formattedDate} />;
            sundayCount++;
        }
    }

    return dataPoints;
};

// Sample input data
const inputData = [
    { date: '6/15', value: 100 },
    { date: '6/17', value: 140 },
    { date: '6/20', value: 250 },
    { date: '6/23', value: 290 },
    { date: '6/25', value: 410 },
    { date: '6/28', value: 440 },
    { date: '7/1', value: 280 },
    { date: '7/4', value: 180 },
    { date: '7/7', value: 150 },
];

const data = getPast30DaysData(inputData);

export default function ExerciseGraph() {
    const [selectedOption, setSelectedOption] = useState('2 Weeks');

    const handleButtonPress = () => {
        const options = ['2 Weeks', '2 Months', 'All Time'];
        const currentIndex = options.indexOf(selectedOption);
        const nextIndex = (currentIndex + 1) % options.length;
        setSelectedOption(options[nextIndex]);
    };

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.title}>Lateral Raises</Text>
                    <Text style={styles.subtitle}>1 Rep Max</Text>
                </View>
                <View style={styles.headerRight}>
                    <RNBounceable
                        style={[styles.button, styles.selectedButton]}
                        onPress={handleButtonPress}
                    >
                        <Text style={styles.buttonText}>{selectedOption}</Text>
                    </RNBounceable>
                </View>
            </View>
            <View style={styles.chart_ctnr}>
                <LineChart
                    width={screenWidth - 105}
                    height={125}
                    adjustToWidth
                    thickness={4}
                    color="rgba(89, 168, 255, 1)"
                    maxValue={550}
                    noOfSections={3}
                    areaChart
                    yAxisThickness={0}
                    yAxisTextStyle={styles.yAxisTextStyle}
                    xAxisTextStyle={styles.xAxisTextStyle}
                    data={data}
                    startFillColor={'rgb(89, 168, 255)'}
                    endFillColor={'rgb(89, 168, 255)'}
                    startOpacity={0.4}
                    endOpacity={0.4}
                    backgroundColor="#fff"
                    initialSpacing={0}
                    yAxisColor="lightgray"
                    xAxisColor="lightgray"
                    disableScroll
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingTop: 18,
        paddingBottom: 15,
        marginHorizontal: 20,
        marginVertical: 8,
        shadowColor: '#999',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.5,
        shadowRadius: 2,
        elevation: 5
    },
    header: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: 20,
        paddingRight: 10,
        paddingBottom: 18
    },
    headerLeft: {
        flexDirection: 'column',
    },
    headerRight: {
        height: '100%',
    },
    title: {
        color: "#0499FE",
        fontSize: 17,
        marginBottom: 2,
        fontFamily: 'Outfit_700Bold'
    },
    subtitle: {
        color: "#aaa",
        fontSize: 15,
        fontFamily: 'Outfit_700Bold'
    },
    button: {
        borderRadius: 20,
        paddingHorizontal: 11,
        paddingVertical: 7,
        marginLeft: 5,
        backgroundColor: '#BCDDFF',
        marginRight: 5
    },
    selectedButton: {
        // backgroundColor: '#0499FE',
        backgroundColor: '#ddd'
    },
    buttonText: {
        color: '#666',
        fontFamily: 'Outfit_700Bold',
        fontSize: 13,
    },
    chart_ctnr: {
        paddingRight: 30,
    },
    customDataPoint: {
        width: 14,
        aspectRatio: 1,
        backgroundColor: 'white',
        borderWidth: 3,
        borderRadius: 10,
        borderColor: 'rgba(89, 168, 255, 1)',
    },
    customLabelContainer: {
        width: 70,
    },
    customLabelText: {
        color: '#aaa',
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 14
    },
    yAxisTextStyle: {
        color: '#aaa',
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 14,
    },
    xAxisTextStyle: {
        color: 'blue',
        fontSize: 12,
        fontWeight: 'bold',
    },
});
