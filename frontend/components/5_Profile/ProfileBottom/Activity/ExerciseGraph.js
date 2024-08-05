import RNBounceable from '@freakycoder/react-native-bounceable';
import React, { useState } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native-gesture-handler';

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
};

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
    let firstValue = null;

    if (filteredData.length > 0) {
        firstValue = filteredData[0].value;
    }

    let prevValue = firstValue;
    let nextValue = null;
    let nextDataPointIndex = 0;
    let interpolating = false;
    let daysBetween = 0;
    let diff = 0;
    let currentDays = 0;
    let sundayCount = 0;

    for (let d = new Date(past30DaysDate); d <= currentDate; d.setDate(d.getDate() + 1)) {
        const formattedDate = `${d.getMonth() + 1}/${d.getDate()}`;
        const dataPoint = filteredData.find(input => input.date === formattedDate);

        if (dataPoint) {
            dataPoints.push({
                value: dataPoint.value,
                customDataPoint: customDataPoint,
            });
            prevValue = dataPoint.value;
            interpolating = false;
            nextDataPointIndex++;
        } else {
            if (!interpolating) {
                const nextDataPoint = filteredData[nextDataPointIndex];
                if (nextDataPoint) {
                    nextValue = nextDataPoint.value;
                    const [nextMonth, nextDay] = nextDataPoint.date.split('/');
                    const nextDate = new Date(currentDate.getFullYear(), parseInt(nextMonth) - 1, parseInt(nextDay));
                    daysBetween = (nextDate - d) / (1000 * 60 * 60 * 24);
                    diff = (nextValue - prevValue) / (daysBetween + 1);
                    currentDays = 1;
                    interpolating = true;
                } else {
                    nextValue = null;
                }
            }

            if (interpolating && nextValue !== null) {
                const interpolatedValue = prevValue + diff * currentDays;
                dataPoints.push({
                    value: interpolatedValue,
                    hideDataPoint: 'true'
                });
                currentDays++;
            } else {
                dataPoints.push({
                    value: prevValue,
                    hideDataPoint: 'true'
                });
            }
        }

        if (d.getDay() === 0 && dataPoints.length > 0) { // Ensure we add labels only for Sundays
            if (sundayCount >= 4) continue;
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
                    <TouchableOpacity activeOpacity={0.5}>
                        <View style={styles.titleContainer}>
                            <Text style={styles.title}>Lateral Raises</Text>
                            <MaterialCommunityIcons name="arrow-u-left-top" size={21} color="#0499FE" style={styles.uTurnIcon} />
                        </View>
                    </TouchableOpacity>
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
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        color: "#0499FE",
        fontSize: 15,
        marginBottom: 2,
        fontFamily: 'Outfit_700Bold'
    },
    uTurnIcon: {
        marginLeft: 5,
        marginBottom: 1
    },
    subtitle: {
        color: "#aaa",
        fontSize: 13,
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
        backgroundColor: '#ddd'
    },
    buttonText: {
        color: '#666',
        fontFamily: 'Outfit_700Bold',
        fontSize: 12.5,
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
        fontSize: 13
    },
    yAxisTextStyle: {
        color: '#aaa',
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 13,
    },
});
