import React from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import { Svg, Polygon, Text as SvgText, Defs, LinearGradient, Stop, Circle, TSpan } from "react-native-svg";

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
    prevStatsHexagon = null,
    valueFontBigPx,
    diffHighlightColor = '#F2B84B',
    prevColor = '#94A3B8',
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
    const prevData = prevStatsHexagon ? [
        Number(prevStatsHexagon?.shoulders || 0),
        Number(prevStatsHexagon?.chest || 0),
        Number(prevStatsHexagon?.arms || 0),
        Number(prevStatsHexagon?.legs || 0),
        Number(prevStatsHexagon?.back || 0),
        Number(prevStatsHexagon?.abs || 0),
    ] : null;

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
    const valueFontBig = Number(valueFontBigPx) || Math.round(valueFont * 1.25);
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
                        // Darker ring strokes for better contrast on dark surfaces
                        stroke={idx === levels - 1 ? "#9AA6BB" : "#8C99AF"}
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
                {showLabels && labelPts.map(({ x, y, i }) => {
                    const curr = data[i];
                    const prev = prevData ? prevData[i] : null;
                    const changed = prevData && Number(prev) !== Number(curr);
                    const isSide = (i === 1 || i === 2 || i === 4 || i === 5); // CHEST, ARMS, BACK, ABS
                    const lineGap = scaledSize(14);
                    return (
                        <React.Fragment key={`lbl-${i}`}>
                            <SvgText
                                x={x}
                                y={y - scaledSize(4)}
                                textAnchor="middle"
                                alignmentBaseline="middle"
                                // Brighter label color so muscle types are readable in the modal
                                fill="#B8C0CC"
                                fontFamily="Poppins_700Bold"
                                fontSize={labelFont}
                            >
                                {categories[i]}
                            </SvgText>

                            {!changed || !isSide ? (
                                <SvgText
                                    x={x}
                                    y={y + valueOffset}
                                    textAnchor="middle"
                                    alignmentBaseline="middle"
                                    fill="#2D9EFF"
                                    fontFamily="Outfit_700Bold"
                                    fontSize={valueFont}
                                >
                                    {changed ? (
                                        // inline prev → new for non-side positions
                                        <>
                                            <TSpan fill={prevColor} fontFamily="Outfit_700Bold" fontSize={valueFont}>{String(prev)}</TSpan>
                                            {/* extra padding before arrow for clarity */}
                                            <TSpan dx={scaledSize(8)} fill={prevColor} fontFamily="Outfit_700Bold" fontSize={valueFont}>{'→'}</TSpan>
                                            {/* extra padding before the golden value */}
                                            <TSpan dx={scaledSize(8)} fill={diffHighlightColor} fontFamily="Outfit_800ExtraBold" fontSize={valueFontBig}>{String(curr)}</TSpan>
                                        </>
                                    ) : (
                                        String(curr)
                                    )}
                                </SvgText>
                            ) : (
                                // For side labels, stack arrow/new on a second line so it doesn't clip off-screen
                                <>
                                    {/* Top line (same y as the original blue value): previous value */}
                                    <SvgText
                                        x={x}
                                        y={y + valueOffset}
                                        textAnchor="middle"
                                        alignmentBaseline="middle"
                                        fill={prevColor}
                                        fontFamily="Outfit_700Bold"
                                        fontSize={valueFont}
                                    >
                                        {String(prev)}
                                    </SvgText>
                                    {/* Bottom line: arrow + new highlighted value */}
                                    <SvgText
                                        x={x}
                                        y={y + valueOffset + lineGap}
                                        textAnchor="middle"
                                        alignmentBaseline="middle"
                                    >
                                        <TSpan fill={prevColor} fontFamily="Outfit_700Bold" fontSize={valueFont}>{'→  '}</TSpan>
                                        <TSpan fill={diffHighlightColor} fontFamily="Outfit_800ExtraBold" fontSize={valueFontBig}>{String(curr)}</TSpan>
                                    </SvgText>
                                </>
                            )}
                        </React.Fragment>
                    );
                })}
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    wrap: { alignItems: "center", justifyContent: "center" },
    svg: { alignSelf: "center" },
});

export default HexagonalStats;
