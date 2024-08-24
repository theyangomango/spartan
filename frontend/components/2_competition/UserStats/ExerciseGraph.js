import React, { useState } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import RNBounceable from '@freakycoder/react-native-bounceable';
import { LineChart } from 'react-native-gifted-charts';

const screenWidth = Dimensions.get('window').width;

// Function to determine dynamic font sizes based on screen size
const getDynamicFontSizes = () => {
    if (screenWidth >= 430) { // iPhone 14 Pro Max and similar
        return {
            titleFontSize: 18,
            subtitleFontSize: 16.5,
            buttonTextFontSize: 14,
            labelTextFontSize: 14,
            yAxisTextFontSize: 14,
            xAxisTextFontSize: 13.5,
        };
    } else if (screenWidth >= 390) { // iPhone 13/14 and similar
        return {
            titleFontSize: 16,
            subtitleFontSize: 15,
            buttonTextFontSize: 13,
            labelTextFontSize: 13,
            yAxisTextFontSize: 13,
            xAxisTextFontSize: 12,
        };
    } else if (screenWidth >= 375) { // iPhone X/XS/11 Pro and similar
        return {
            titleFontSize: 15.5,
            subtitleFontSize: 14.5,
            buttonTextFontSize: 12.5,
            labelTextFontSize: 12.5,
            yAxisTextFontSize: 12.5,
            xAxisTextFontSize: 11.5,
        };
    } else { // Smaller iPhone models (like iPhone SE)
        return {
            titleFontSize: 15,
            subtitleFontSize: 14,
            buttonTextFontSize: 12,
            labelTextFontSize: 12,
            yAxisTextFontSize: 12,
            xAxisTextFontSize: 11,
        };
    }
};

const dynamicFontSizes = getDynamicFontSizes();

export default function ExerciseGraph({ name, exercise }) {
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
                    <Text style={[styles.title, { fontSize: dynamicFontSizes.titleFontSize }]}>{name}</Text>
                    <Text style={[styles.subtitle, { fontSize: dynamicFontSizes.subtitleFontSize }]}>{`1 Rep Max`}</Text>
                </View>
                <View style={styles.headerRight}>
                    <RNBounceable
                        style={[styles.button, styles.selectedButton]}
                        onPress={handleButtonPress}
                    >
                        <Text style={[styles.buttonText, { fontSize: dynamicFontSizes.buttonTextFontSize }]}>{selectedOption}</Text>
                    </RNBounceable>
                </View>
            </View>
            <View style={styles.chart_ctnr}>
                <LineChart
                    width={screenWidth - 55}
                    height={175}
                    adjustToWidth
                    thickness={6}
                    maxValue={500}
                    noOfSections={3}
                    yAxisThickness={0}
                    yAxisTextStyle={[styles.yAxisTextStyle, { fontSize: dynamicFontSizes.yAxisTextFontSize }]}
                    xAxisTextStyle={[styles.xAxisTextStyle, { fontSize: dynamicFontSizes.xAxisTextFontSize }]}
                    backgroundColor="#fff"
                    initialSpacing={12}
                    yAxisColor="lightgray"
                    xAxisColor="lightgray"
                    disableScroll
                    // other props remain unchanged
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
        paddingTop: 5,
        paddingBottom: 15,
    },
    header: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: 2,
        paddingBottom: 18,
    },
    headerLeft: {
        flexDirection: 'column',
    },
    headerRight: {
        height: '100%',
    },
    title: {
        color: "#0499FE",
        fontFamily: 'Outfit_700Bold',
    },
    subtitle: {
        color: "#aaa",
        fontFamily: 'Outfit_700Bold',
    },
    button: {
        borderRadius: 20,
        paddingHorizontal: 11,
        paddingVertical: 7,
        marginLeft: 5,
        backgroundColor: '#BCDDFF',
        marginRight: 5,
    },
    selectedButton: {
        backgroundColor: '#ddd',
    },
    buttonText: {
        color: '#666',
        fontFamily: 'Outfit_700Bold',
    },
    chart_ctnr: {
        paddingRight: 30,
    },
    yAxisTextStyle: {
        color: '#aaa',
        fontFamily: 'Outfit_600SemiBold',
    },
    xAxisTextStyle: {
        color: 'blue',
        fontWeight: 'bold',
    },
});
