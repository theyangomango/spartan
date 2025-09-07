import React from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import { Svg, Polygon, Text as SvgText, Defs, LinearGradient, Stop, Circle } from "react-native-svg";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Scaling (iPhone 13 baseline height = 844)
const scale = screenHeight / 844;
const scaledSize = (size) => Math.round(size * scale);

// Default chart size; can be overridden via prop
const defaultChartSize = Math.min(screenWidth * 0.7, 360);
const categories = ["SHOULDERS", "CHEST", "ARMS", "LEGS", "BACK", "ABS"];
const maxValue = 100;

const HexagonalStats = ({
    statsHexagon,
    size,
    showLabels = true,
    labelFontPx,
    valueFontPx,
    labelOffsetPx,
}) => {
    // only the selected user's stats
    const data = [
        Number(statsHexagon?.shoulders || 0),
        Number(statsHexagon?.chest || 0),
        Number(statsHexagon?.arms || 0),
        Number(statsHexagon?.legs || 0),
        Number(statsHexagon?.back || 0),
        Number(statsHexagon?.abs || 0),
    ];

    // Geometry
    const chartSize = Math.max(120, Number(size) || defaultChartSize);
    const radius = chartSize / 2;
    const padX = showLabels ? scaledSize(32) : 0; // match labelRadiusOffset
    const svgW = chartSize + (showLabels ? padX * 2 : 0);
    const svgH = showLabels ? (chartSize + scaledSize(110)) : chartSize;
    const centerX = svgW / 2;
    const centerY = showLabels ? (chartSize / 2 + scaledSize(50)) : (chartSize / 2);
    const angle = (2 * Math.PI) / categories.length;

    // Scaled styling
    const labelFont = Number(labelFontPx) || scaledSize(13);
    const valueFont = Number(valueFontPx) || scaledSize(14);
    const labelRadiusOffset = Number(labelOffsetPx) || scaledSize(26);
    const valueOffset = scaledSize(12);

    const ringStroke = Math.max(1, scaledSize(1));       // keep grid crisp
    const outlineStroke = Math.max(2, scaledSize(2));    // data polygon outline
    const dotRadius = Math.max(3, scaledSize(3));        // vertex dots

    const levels = 5; // subtle rings
    const ringPoints = Array.from({ length: levels }, (_, lvl) => {
        const t = (lvl + 1) / levels;
        return categories
            .map((_, i) => {
                const x = centerX + radius * t * Math.cos(angle * i - Math.PI / 2);
                const y = centerY + radius * t * Math.sin(angle * i - Math.PI / 2);
                return `${x},${y}`;
            })
            .join(" ");
    });

    // Data polygon
    const dataPoints = data.map((val, i) => {
        const normalized = Math.max(0, Math.min(val, maxValue)) / maxValue;
        const minFill = 0.06; // ensure visible polygon even when value is 0
        const t = normalized === 0 ? minFill : normalized;
        const r = radius * t;
        return {
            x: centerX + r * Math.cos(angle * i - Math.PI / 2),
            y: centerY + r * Math.sin(angle * i - Math.PI / 2),
            val,
            i,
        };
    });
    const polygonPoints = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

    // Label positions (outside)
    const labelPts = categories.map((_, i) => {
        const x = centerX + (radius + labelRadiusOffset) * Math.cos(angle * i - Math.PI / 2);
        const y = centerY + (radius + labelRadiusOffset) * Math.sin(angle * i - Math.PI / 2);
        return { x, y, i };
    });

    return (
        <View style={styles.wrap}>
            <Svg width={svgW} height={svgH} style={styles.svg}>
                <Defs>
                    <LinearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0" stopColor="#2D9EFF" stopOpacity="0.28" />
                        <Stop offset="1" stopColor="#68B6FF" stopOpacity="0.18" />
                    </LinearGradient>
                </Defs>

                {/* Concentric rings (no cross lines) */}
                {ringPoints.map((pts, idx) => (
                    <Polygon
                        key={`ring-${idx}`}
                        points={pts}
                        stroke={idx === levels - 1 ? "#e0ebf6ff" : "#edf3f9ff"}
                        strokeWidth={ringStroke}
                        fill="none"
                    />
                ))}

                {/* Data polygon */}
                <Polygon
                    points={polygonPoints}
                    fill="url(#radarFill)"
                    stroke="#2D9EFF"
                    strokeWidth={outlineStroke}
                />

                {/* Vertex dots */}
                {dataPoints.map((p, idx) => (
                    <Circle key={`dot-${idx}`} cx={p.x} cy={p.y} r={dotRadius} fill="#2D9EFF" />
                ))}

                {/* Labels + values (outside the shape) */}
                {showLabels && labelPts.map(({ x, y, i }) => (
                    <React.Fragment key={`lbl-${i}`}>
                        <SvgText
                            x={x}
                            y={y - scaledSize(4)}
                            textAnchor="middle"
                            alignmentBaseline="middle"
                            fill="#475569"
                            fontFamily="Poppins_700Bold"
                            fontSize={labelFont}
                        >
                            {categories[i]}
                        </SvgText>

                        <SvgText
                            x={x}
                            y={y + valueOffset}
                            textAnchor="middle"
                            alignmentBaseline="middle"
                            fill="#2D9EFF"
                            fontFamily="Outfit_700Bold"
                            fontSize={valueFont}
                        >
                            {data[i]}
                        </SvgText>
                    </React.Fragment>
                ))}
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    wrap: { alignItems: "center", justifyContent: "center" },
    svg: { alignSelf: "center" },
});

export default HexagonalStats;
