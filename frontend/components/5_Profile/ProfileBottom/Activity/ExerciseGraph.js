import React, { useState } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import scaleSize from '../../../../helper/scaleSize';
import { LineChart } from 'react-native-gifted-charts';
import RNBounceable from '@freakycoder/react-native-bounceable';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;
const scaledSize = (size) => scaleSize(size);

const ExerciseGraph = () => {
    const [selectedOption, setSelectedOption] = useState('2 Weeks');

    const handleButtonPress = () => {
        const options = ['2 Weeks', '2 Months', 'All Time'];
        const currentIndex = options.indexOf(selectedOption);
        const nextIndex = (currentIndex + 1) % options.length;
        setSelectedOption(options[nextIndex]);
    };

    const data = getPast30DaysData(inputData);

    return (
        <View style={styles.mainContainer}>
            <Header
                title="Lateral Raises"
                subtitle="1 Rep Max"
                selectedOption={selectedOption}
                onButtonPress={handleButtonPress}
            />
            <View style={styles.chartContainer}>
                <LineChart
                    width={screenWidth - scaledSize(105)}
                    height={scaledSize(125)}
                    adjustToWidth
                    thickness={scaledSize(4)}
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
};

const Header = ({ title, subtitle, selectedOption, onButtonPress }) => (
    <View style={styles.header}>
        <View style={styles.headerLeft}>
            <View style={styles.titleContainer}>
                <Text style={styles.title}>{title}</Text>
            </View>
            <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View style={styles.headerRight}>
            <RNBounceable
                style={[styles.button, styles.selectedButton]}
                onPress={onButtonPress}
            >
                <Text style={styles.buttonText}>{selectedOption}</Text>
            </RNBounceable>
        </View>
    </View>
);

const customDataPoint = () => (
    <View style={styles.customDataPoint} />
);

const CustomLabel = ({ val }) => (
    <View style={styles.customLabelContainer}>
        <Text style={styles.customLabelText}>{val}</Text>
    </View>
);

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
    let prevValue = filteredData.length > 0 ? filteredData[0].value : null;
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
                customDataPoint: customDataPoint, // Use custom data point
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

            const interpolatedValue = interpolating && nextValue !== null ? prevValue + diff * currentDays : prevValue;
            dataPoints.push({
                value: interpolatedValue,
                hideDataPoint: true
            });
            currentDays++;
        }

        if (d.getDay() === 0 && dataPoints.length > 0 && sundayCount < 4) { // Ensure we add labels only for Sundays
            dataPoints[dataPoints.length - 1].labelComponent = () => <CustomLabel val={formattedDate} />; // Use custom label
            sundayCount++;
        }
    }

    return dataPoints;
};

// Sample input data
// ! Need to make sure dummy data is within the range of the graph
const inputData = [
    { date: '12/15', value: 100 },
    { date: '12/17', value: 140 },
    { date: '11/20', value: 250 },
    { date: '11/23', value: 290 },
    { date: '11/25', value: 410 },
    { date: '11/28', value: 440 },
    { date: '11/1', value: 280 },
    { date: '11/4', value: 180 },
    { date: '11/5', value: 150 },
];

const styles = StyleSheet.create({
    mainContainer: {
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: scaleSize(scaledSize(20)),
        paddingTop: scaleSize(scaledSize(18)),
        paddingBottom: scaleSize(scaledSize(15)),
        marginHorizontal: scaleSize(scaledSize(20)),
        marginVertical: scaleSize(scaledSize(8)),
        shadowColor: '#999',
        shadowOffset: { width: 0, height: scaleSize(scaledSize(1)) },
        shadowOpacity: 0.5,
        shadowRadius: scaleSize(scaledSize(2)),
        elevation: 5
    },
    header: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: scaleSize(scaledSize(20)),
        paddingRight: scaleSize(scaledSize(10)),
        paddingBottom: scaleSize(scaledSize(18))
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
        fontSize: scaleSize(15),
        marginBottom: scaleSize(scaledSize(2)),
        fontFamily: 'Outfit_700Bold'
    },
    subtitle: {
        color: "#aaa",
        fontSize: scaleSize(13),
        fontFamily: 'Outfit_700Bold'
    },
    button: {
        borderRadius: scaleSize(scaledSize(20)),
        paddingHorizontal: scaleSize(scaledSize(11)),
        paddingVertical: scaleSize(scaledSize(7)),
        marginLeft: scaleSize(scaledSize(5)),
        backgroundColor: '#BCDDFF',
        marginRight: scaleSize(scaledSize(5))
    },
    selectedButton: {
        backgroundColor: '#ddd'
    },
    buttonText: {
        color: '#666',
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(12.5),
    },
    chartContainer: {
        paddingRight: scaleSize(scaledSize(30)),
    },
    customDataPoint: {
        width: scaleSize(scaledSize(14)),
        aspectRatio: 1,
        backgroundColor: 'white',
        borderWidth: scaleSize(scaledSize(3)),
        borderRadius: scaleSize(scaledSize(10)),
        borderColor: 'rgba(89, 168, 255, 1)',
    },
    customLabelContainer: {
        width: scaleSize(scaledSize(70)),
    },
    customLabelText: {
        color: '#aaa',
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(13)
    },
    yAxisTextStyle: {
        color: '#aaa',
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(13),
    },
});

export default ExerciseGraph;
