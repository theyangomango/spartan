import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Svg, Polygon, Line, Text as SvgText } from 'react-native-svg';

const screenWidth = Dimensions.get('window').width;
const chartSize = screenWidth * 0.4;
const categories = ['CHEST', 'SHOULDERS', 'ARMS', 'LEGS', 'BACK', 'ABS'];
const data = [80, 85, 75, 90, 95, 70];
const maxValue = 100;

const HexagonalStats = () => {
    const radius = chartSize / 2;
    const centerX = screenWidth / 2;
    const centerY = (chartSize) / 2 + 50; // Adjusted centerY to add padding at the top
    const angle = (2 * Math.PI) / categories.length;

    const points = data
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
        const labelRadius = radius + 30; // Adjust the label radius to position the labels outside the chart
        const x = centerX + labelRadius * Math.cos(angle * index - Math.PI / 2);
        const y = centerY + labelRadius * Math.sin(angle * index - Math.PI / 2);
        return { x, y };
    });

    return (
        <View style={styles.container}>
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
                            y={point.y - 10} // Adjust the y position for the category name
                            textAnchor="middle"
                            alignmentBaseline="middle"
                            style={styles.text}
                        >
                            {categories[index]}
                        </SvgText>
                        <SvgText
                            x={point.x}
                            y={point.y + 10} // Adjust the y position for the number
                            textAnchor="middle"
                            alignmentBaseline="middle"
                            style={styles.text}
                        >
                            {data[index]}
                        </SvgText>
                        <Polygon points={points} style={styles.polygon} />

                    </React.Fragment>
                ))}
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 20,
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingVertical: 20,
        shadowColor: '#999',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.5,
        shadowRadius: 2,
        elevation: 5,
        marginBottom: 15,
    },
    svg: {
        alignSelf: 'center',
    },
    ring: {
        fill: 'none',
        stroke: '#dfdfdf',
        strokeWidth: 1,
    },
    polygon: {
        fill: 'rgba(89, 168, 255, 0.1)',
        stroke: 'rgba(89, 168, 255, 0.3)',
        strokeWidth: 2.5,
    },
    line: {
        stroke: '#ccc',
        strokeWidth: 1,
    },
    text: {
        fill: '#888',
        fontFamily: 'Poppins_700Bold',
        fontSize: 14,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
});

export default HexagonalStats;
