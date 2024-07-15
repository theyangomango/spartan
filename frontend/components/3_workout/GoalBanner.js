import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export default function GoalBanner({ workoutsLeft, progress }) {
    const radius = 28;
    const strokeWidth = 7;
    const circumference = 2 * Math.PI * radius;
    const progressValue = (progress / 100) * circumference;

    return (
        <View style={styles.container}>
            <View style={styles.leftContainer}>
                <Text style={styles.title}>Monthly Progress</Text>
                <Text style={styles.subtitle}>{workoutsLeft} Workouts Left</Text>
            </View>
            <View style={styles.rightContainer}>
                <Svg width={radius * 2 + strokeWidth} height={radius * 2 + strokeWidth}>
                    <Circle
                        cx={radius + strokeWidth / 2}
                        cy={radius + strokeWidth / 2}
                        r={radius}
                        stroke="#555"
                        strokeWidth={strokeWidth}
                        fill="none"
                    />
                    <Circle
                        cx={radius + strokeWidth / 2}
                        cy={radius + strokeWidth / 2}
                        r={radius}
                        stroke="#2D9EFF"
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeDasharray={`${progressValue}, ${circumference}`}
                        strokeLinecap="round"
                        transform={`rotate(-90 ${radius + strokeWidth / 2} ${radius + strokeWidth / 2})`}
                    />
                </Svg>
                <Text style={styles.progressText}>{progress}%</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 85,
        marginHorizontal: 17,
        paddingHorizontal: 30,
        // borderRadius: 25,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        backgroundColor: '#000',
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 1 },
        // shadowOpacity: 0.2,
        // shadowRadius: 3,
        // elevation: 5,
    },
    leftContainer: {
        flex: 1,
        height: '100%',
        justifyContent: 'center',
    },
    title: {
        fontSize: 18,
        color: '#fff',
        fontFamily: 'Poppins_600SemiBold',
        // paddingBottom: 5
    },
    subtitle: {
        fontSize: 14,
        color: '#cdcdcd',
        fontFamily: 'Lato_400Regular'
    },
    rightContainer: {
        width: 70,
        height: 70,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    progressText: {
        fontSize: 15.5,
        fontFamily: 'Poppins_800ExtraBold',
        color: '#2D9EFF',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -16 }, { translateY: -10 }],
    },
});
