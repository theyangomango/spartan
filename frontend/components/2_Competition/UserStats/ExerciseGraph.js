import React, { useState } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import RNBounceable from '@freakycoder/react-native-bounceable';
import { LineChart } from 'react-native-gifted-charts';
import scaleSize from '../../../helper/scaleSize';

const screenWidth = Dimensions.get('window').width;
const scaled = (n) => scaleSize(n);
// Centralize font sizes using scaleSize for consistency across devices
const FONTS = {
    title: scaled(16),
    subtitle: scaled(15),
    buttonText: scaled(13),
    labelText: scaled(13),
    yAxisText: scaled(13),
    xAxisText: scaled(12),
};

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
                    <Text style={[styles.title, { fontSize: scaleSize(FONTS.title) }]}>{name}</Text>
                    <Text style={[styles.subtitle, { fontSize: scaleSize(FONTS.subtitle) }]}>{`1 Rep Max`}</Text>
                </View>
                <View style={styles.headerRight}>
                    <RNBounceable
                        style={[styles.button, styles.selectedButton]}
                        onPress={handleButtonPress}
                    >
                        <Text style={[styles.buttonText, { fontSize: scaleSize(FONTS.buttonText) }]}>{selectedOption}</Text>
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
                    yAxisTextStyle={[styles.yAxisTextStyle, { fontSize: scaleSize(FONTS.yAxisText) }]}
                    xAxisTextStyle={[styles.xAxisTextStyle, { fontSize: scaleSize(FONTS.xAxisText) }]}
                    backgroundColor="#252733"
                    initialSpacing={12}
                    yAxisColor="rgba(255,255,255,0.1)"
                    xAxisColor="rgba(255,255,255,0.1)"
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
        backgroundColor: '#252733',
        borderRadius: scaleSize(20),
        paddingTop: scaleSize(5),
        paddingBottom: scaleSize(15),
    },
    header: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: scaleSize(2),
        paddingBottom: scaleSize(18),
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
        color: "#AEB5C0",
        fontFamily: 'Outfit_700Bold',
    },
    button: {
        borderRadius: scaleSize(20),
        paddingHorizontal: scaleSize(11),
        paddingVertical: scaleSize(7),
        marginLeft: scaleSize(5),
        backgroundColor: '#1E232C',
        marginRight: scaleSize(5),
    },
    selectedButton: {
        backgroundColor: '#6FB8FF',
    },
    buttonText: {
        color: '#EAEAEA',
        fontFamily: 'Outfit_700Bold',
    },
    chart_ctnr: {
        paddingRight: scaleSize(30),
    },
    yAxisTextStyle: {
        color: '#AEB5C0',
        fontFamily: 'Outfit_600SemiBold',
    },
    xAxisTextStyle: {
        color: '#6FB8FF',
        fontWeight: 'bold',
    },
});
