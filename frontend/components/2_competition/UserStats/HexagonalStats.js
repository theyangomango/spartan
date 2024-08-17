import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { Svg, Polygon, Line, Text as SvgText } from 'react-native-svg';

const screenWidth = Dimensions.get('window').width;
const chartSize = screenWidth * 0.7;
const categories = ['SHOULDERS', 'CHEST', 'ARMS', 'LEGS', 'BACK', 'ABS'];
const maxValue = 100;

const HexagonalStats = ({ statsHexagon }) => {
    const radius = chartSize / 2;
    const centerX = screenWidth / 2;
    const centerY = chartSize / 2 + 50; // Adjusted centerY to add padding at the top
    const angle = (2 * Math.PI) / categories.length;
    const data1 = [statsHexagon.shoulders, statsHexagon.chest, statsHexagon.arms, statsHexagon.legs, statsHexagon.back, statsHexagon.abs];
    const data2 = [global.userData.statsHexagon.shoulders, global.userData.statsHexagon.chest, global.userData.statsHexagon.arms, global.userData.statsHexagon.legs, global.userData.statsHexagon.back, global.userData.statsHexagon.abs];


    const points1 = data1
        .map((value, index) => {
            const x = centerX + radius * (value / maxValue) * Math.cos(angle * index - Math.PI / 2);
            const y = centerY + radius * (value / maxValue) * Math.sin(angle * index - Math.PI / 2);
            return `${x},${y}`;
        })
        .join(' ');

    const points2 = data2
        .map((value, index) => {
            const x = centerX + radius * (value / maxValue) * Math.cos(angle * index - Math.PI / 2);
            const y = centerY + radius * (value / maxValue) * Math.sin(angle * index - Math.PI / 2);
            return `${x},${y}`;
        })
        .join(' ');

    const categoryPoints = categories.map((_, index) => {
        const x = centerX + radius * Math.cos(angle * index - Math.PI / 2);
        const y = centerY + radius * Math.sin(angle * index - Math.PI / 2);
        return { x, y };
    });

    const levels = 5; // Number of levels/rings
    const levelPoints = Array.from({ length: levels }, (_, level) =>
        categories
            .map((_, index) => {
                const value = (level + 1) / levels;
                const x = centerX + radius * value * Math.cos(angle * index - Math.PI / 2);
                const y = centerY + radius * value * Math.sin(angle * index - Math.PI / 2);
                return `${x},${y}`;
            })
            .join(' ')
    );

    const labelPoints = categories.map((_, index) => {
        const labelRadius = radius + 32; // Adjust the label radius to position the labels outside the chart
        const x = centerX + labelRadius * Math.cos(angle * index - Math.PI / 2);
        const y = centerY + labelRadius * Math.sin(angle * index - Math.PI / 2);
        return { x, y };
    });

    return (
        <View style={styles.main_view}>
            <Svg width={screenWidth} height={chartSize + 100} style={styles.svg}>
                {/* Draw rings */}
                {levelPoints.map((points, index) => (
                    <Polygon key={index} points={points} style={styles.ring} />
                ))}
                {categoryPoints.map((point, index) => (
                    <React.Fragment key={index}>
                        <Line x1={centerX} y1={centerY} x2={point.x} y2={point.y} style={styles.line} />
                    </React.Fragment>
                ))}
                {labelPoints.map((point, index) => (
                    <React.Fragment key={index}>
                        <SvgText
                            x={point.x}
                            y={index == 0 ? point.y - 5 : point.y - 10} // Adjust the y position for the category name
                            textAnchor="middle"
                            alignmentBaseline="middle"
                            style={styles.text}
                        >
                            {categories[index]}
                        </SvgText>
                        <SvgText
                            x={point.x}
                            y={index == 0 ? point.y + 15 : point.y + 10} // Adjust the y position for the number
                            textAnchor="middle"
                            alignmentBaseline="middle"
                            style={styles.numberText}
                        >
                            {data1[index]}
                        </SvgText>
                    </React.Fragment>
                ))}
                <Polygon points={points2} style={styles.polygon2} />
                <Polygon points={points1} style={styles.polygon1} />
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    main_view: {
        flex: 1,
        opacity: 0.4
    },
    svg: {
        alignSelf: 'center',
    },
    ring: {
        fill: 'none',
        stroke: '#eaeaea',
        strokeWidth: 1,
    },
    polygon1: {
        fill: 'rgba(89, 168, 255, 0.4)',
        strokeWidth: 2.5,
    },
    polygon2: {
        fill: '#d3d3d3',
        opacity: 0.7,
        strokeWidth: 2.5,
    },
    line: {
        stroke: '#eaeaea',
        strokeWidth: 1,
    },
    text: {
        fill: '#999',
        fontFamily: 'Poppins_700Bold',
        fontSize: 15.5,
    },
    numberText: {
        fill: '#4FAEFF',
        fontFamily: 'Poppins_700Bold',
        fontSize: 17,
    },
});

export default HexagonalStats;
