import React, { useState } from 'react';
import { View, Dimensions, StyleSheet, Text, TouchableOpacity, Pressable } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Entypo } from '@expo/vector-icons';

const data1 = [
    { date: '9/1', max: 254 },
    { date: '9/3', max: 265 },
    { date: '9/5', max: 290 },
    { date: '9/7', max: 295 },
];

const data2 = [
    { date: '8/29', max: 240 },
    { date: '9/3', max: 250 },
    { date: '9/5', max: 275 },
    { date: '9/7', max: 285 },
];

export default function ExerciseGraph() {
    const screenWidth = Dimensions.get('window').width;
    const [isShowingMultipleUsers, setIsShowingMultipleUsers] = useState(false);

    // Extract dates and max weights for the chart
    const labels = data1.map(item => item.date);
    const datasets = [
        {
            data: data1.map(item => item.max),
            color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`, // Optional line color
            strokeWidth: 2 // Optional line width
        },
        {
            data: data2.map(item => item.max),
            color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`, // Optional line color
            strokeWidth: 2 // Optional line width
        }
    ];

    return (
        <View>
            <View style={styles.header}>
                <View>
                    <Text style={styles.header_text}>Progress</Text>
                    {/* <Text>Past 14 Days</Text> */}
                </View>
            </View>

            <View style={styles.graph_title_ctnr}>
                <TouchableOpacity activeOpacity={0.3}>
                    <Text style={styles.graph_title_text}>Lateral Raises</Text>
                </TouchableOpacity>
                <Pressable
                    style={{ ...styles.graphIcon, opacity: isShowingMultipleUsers ? 1: 0.5 }}
                    onPress={() => setIsShowingMultipleUsers(!isShowingMultipleUsers)}
                >
                    <Entypo name='line-graph' size={15} color={'#2D9EFF'} />
                </Pressable>
            </View>

            <View style={styles.container}>
                <LineChart
                    data={{
                        labels: labels,
                        datasets: datasets
                    }}
                    width={screenWidth - 40} // from react-native
                    height={200}
                    yAxisLabel=""
                    yAxisSuffix=" lbs"
                    yAxisInterval={1} // optional, defaults to 1
                    fromZero={true} // Starts y-axis from zero
                    chartConfig={{
                        backgroundColor: '#fff',
                        backgroundGradientFrom: '#fff',
                        backgroundGradientTo: '#fff',
                        decimalPlaces: 0, // optional, defaults to 2dp
                        color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        style: {
                            borderRadius: 16
                        },
                        propsForDots: {
                            r: '6',
                            strokeWidth: '2',
                            stroke: '#ffa726'
                        },
                        propsForBackgroundLines: {
                            strokeDasharray: "", // Remove dashed lines
                        },
                        propsForLabels: {
                            fontSize: 10, // Smaller font size for labels
                        }
                    }}
                    bezier // Use bezier prop for a smoother curve
                    style={{
                        marginVertical: 8,
                        borderRadius: 16
                    }}
                    withHorizontalLabels={true}
                    withVerticalLabels={true}
                    withInnerLines={true}
                    withOuterLines={true}
                    withDots={true}
                    withShadow={false}
                    withHorizontalLines={true}
                    withVerticalLines={true}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: 10,
        paddingBottom: 5,
        alignItems: 'center',
        marginHorizontal: 15,
        borderRadius: 25,
        shadowColor: '#555',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 5,
        backgroundColor: '#fff'
        // backgroundColor: '#6FB8FF', // Ensure background color is set
    },
    header: {
        marginTop: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        // marginBottom: 10,
        paddingLeft: 26,
        paddingRight: 25,
        paddingBottom: 5,
        alignItems: 'center',
    },
    header_text: {
        fontFamily: 'Lato_700Bold',
        fontSize: 20,
    },
    graph_title_ctnr: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 25,
        paddingTop: 5,
        paddingBottom: 6,
        alignItems: 'flex-end'
    },
    graph_title_text: {
        fontSize: 17,
        color: '#2D9EFF',
        fontFamily: 'SourceSansPro_600SemiBold',
        marginRight: 5
    },
    graphIcon: {
        paddingHorizontal: 5,
        paddingBottom: 2
    }
});
