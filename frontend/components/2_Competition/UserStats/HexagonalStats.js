import React from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import scaleSize from "../../../helper/scaleSize";
import { Svg, Polygon, Text as SvgText, Defs, LinearGradient, Stop, Circle, TSpan, Line } from "react-native-svg";
import formatHexStat from "../../../utils/formatHexStat";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Centralized scaling
const scaledSize = (size) => scaleSize(size);

// Default chart size; can be overridden via prop
const defaultChartSize = Math.min(screenWidth * 0.7, 360);
const categories = ["SHOULDERS", "CHEST", "ARMS", "LEGS", "BACK", "ABS"];
const maxValue = 100;

const HexagonalStats = ({
    statsHexagon,
    size,
    showLabels = true,
    labelFontPx = 12,
    valueFontPx = 16,
    labelOffsetPx,
    prevStatsHexagon = null,
    valueFontBigPx,
    diffHighlightColor = '#F2B84B',
    prevColor = '#94A3B8',
    polygonColor = '#2D9EFF',
    polygonFillColor = '#68B6FF',
    polygonFillOpacityStart = 0.28,
    polygonFillOpacityEnd = 0.18,
    dotColor,
}) => {
    const approxTextWidth = (text, fontSize) => {
        if (text === null || text === undefined) return 0;
        const str = String(text);
        if (!str) return 0;
        return str.length * fontSize * 0.58;
    };

    const renderStrikeLine = ({ x, y, fontSize, textAnchor, text, color }) => {
        const width = approxTextWidth(text, fontSize);
        if (!width) return null;
        let x1 = x;
        let x2 = x;
        if (textAnchor === "middle") {
            x1 = x - width / 2;
            x2 = x + width / 2;
        } else if (textAnchor === "end") {
            x1 = x - width;
            x2 = x;
        } else {
            x1 = x;
            x2 = x + width;
        }
        return (
            <Line
                x1={x1}
                y1={y}
                x2={x2}
                y2={y}
                stroke={color}
                strokeWidth={Math.max(2, fontSize * 0.16)}
                strokeLinecap="round"
            />
        );
    };
    const toRoundedStat = (value) => {
        const num = Number(value);
        if (!Number.isFinite(num)) return 0;
        return Math.round(num * 10) / 10;
    };

    // only the selected user's stats (rounded exactly how we display them)
    const data = [
        toRoundedStat(statsHexagon?.shoulders),
        toRoundedStat(statsHexagon?.chest),
        toRoundedStat(statsHexagon?.arms),
        toRoundedStat(statsHexagon?.legs),
        toRoundedStat(statsHexagon?.back),
        toRoundedStat(statsHexagon?.abs),
    ];
    const prevData = prevStatsHexagon ? [
        toRoundedStat(prevStatsHexagon?.shoulders),
        toRoundedStat(prevStatsHexagon?.chest),
        toRoundedStat(prevStatsHexagon?.arms),
        toRoundedStat(prevStatsHexagon?.legs),
        toRoundedStat(prevStatsHexagon?.back),
        toRoundedStat(prevStatsHexagon?.abs),
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
    const zeroBumpRatio = 0.06;                          // subtle bump for zero values

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
        // Directly scale to avoid discrepancies between rendered geometry and displayed value.
        // If the rounded value is 0.0, keep a small bump so the polygon remains visible.
        const normalized = Math.max(0, Math.min(val, maxValue)) / maxValue;
        const t = normalized === 0 ? zeroBumpRatio : normalized;
        const r = radius * t;
        const x = centerX + r * Math.cos(angle * i - Math.PI / 2);
        const y = centerY + r * Math.sin(angle * i - Math.PI / 2);
        return {
            x: centerX + r * Math.cos(angle * i - Math.PI / 2),
            y: centerY + r * Math.sin(angle * i - Math.PI / 2),
            val,
            i,
        };
    });
    const polygonPoints = dataPoints
        .map((p) => {
            const roundedX = Number(p.x.toFixed(2));
            const roundedY = Number(p.y.toFixed(2));
            p.roundedX = roundedX;
            p.roundedY = roundedY;
            return `${roundedX},${roundedY}`;
        })
        .join(" ");

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
                        <Stop offset="0" stopColor={polygonColor} stopOpacity={polygonFillOpacityStart} />
                        <Stop offset="1" stopColor={polygonFillColor || polygonColor} stopOpacity={polygonFillOpacityEnd} />
                    </LinearGradient>
                </Defs>

                {/* Concentric rings (no cross lines) */}
                {ringPoints.map((pts, idx) => {
                    // Subtle opacity falloff from outer (most opaque) to inner (least opaque)
                    const minOpacity = 0.25;
                    const maxOpacity = 0.5;
                    const t = (levels > 1) ? (idx / (levels - 1)) : 1; // 0 (inner) → 1 (outer)
                    const strokeOpacity = minOpacity + t * (maxOpacity - minOpacity);
                    return (
                        <Polygon
                            key={`ring-${idx}`}
                            points={pts}
                            // Slightly darker outer ring for contrast; all rings use opacity gradient
                            stroke={idx === levels - 1 ? "#9AA6BB" : "#8C99AF"}
                            strokeOpacity={strokeOpacity}
                            strokeWidth={ringStroke}
                            fill="none"
                        />
                    );
                })}

                {/* Data polygon */}
                <Polygon
                    points={polygonPoints}
                    fill="url(#radarFill)"
                    stroke={polygonColor}
                    strokeWidth={outlineStroke}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />

                {/* Vertex dots */}
                {dataPoints.map((p, idx) => (
                    <Circle
                        key={`dot-${idx}`}
                        cx={p.roundedX ?? p.x}
                        cy={p.roundedY ?? p.y}
                        r={dotRadius}
                        fill={dotColor || polygonColor}
                    />
                ))}

                {/* Labels + values (outside the shape) */}
                {showLabels && labelPts.map(({ x, y, i }) => {
                    const curr = data[i];
                    const prev = prevData ? prevData[i] : null;
                    const formattedCurr = formatHexStat(curr);
                    const formattedPrev = formatHexStat(prev);
                    const changed = prevData && Number(prev) !== Number(curr);
                    const isSide = (i === 1 || i === 2 || i === 4 || i === 5); // CHEST, ARMS, BACK, ABS
                    // For the right-hand side labels (CHEST, ARMS) we want text to flow leftwards
                    // to avoid clipping near the edge. For the left-hand side labels (BACK, ABS)
                    // we anchor to the left so text flows rightwards. Top/bottom remain centered.
                    const isRightSide = (i === 1 || i === 2);
                    const sideAnchor = isRightSide ? 'end' : 'start';
                    const lineGap = scaledSize(16);
                    return (
                        <React.Fragment key={`lbl-${i}`}>
                            <SvgText
                                x={x}
                                y={y - scaledSize(6)}
                                textAnchor="middle"
                                alignmentBaseline="middle"
                                // Brighter label color so muscle types are readable in the modal
                                fill="#B8C0CC"
                                fontFamily="Poppins_700Bold"
                                fontSize={labelFont}
                            >
                                {categories[i]}
                            </SvgText>

                            {(() => {
                                const baselineY = y + valueOffset;
                                if (!changed) {
                                    return (
                                        <SvgText
                                            x={x}
                                            y={baselineY}
                                            textAnchor="middle"
                                            alignmentBaseline="middle"
                                            fill="#2D9EFF"
                                            fontFamily="Outfit_700Bold"
                                            fontSize={valueFont}
                                        >
                                            {formattedCurr}
                                        </SvgText>
                                    );
                                }

                                if (!isSide) {
                                    const gap = scaledSize(10);
                                    const prevWidth = approxTextWidth(formattedPrev, valueFont);
                                    const currWidth = approxTextWidth(formattedCurr, valueFontBig);
                                    const totalWidth = prevWidth + gap + currWidth;
                                    const prevStartX = x - totalWidth / 2;
                                    const prevEndX = prevStartX + prevWidth;
                                    const currX = prevEndX + gap;
                                    const strikeY = baselineY - valueFont * 0.12;

                                    return (
                                        <>
                                            <SvgText
                                                x={prevStartX}
                                                y={baselineY}
                                                textAnchor="start"
                                                alignmentBaseline="middle"
                                                fill={prevColor}
                                                fontFamily="Outfit_700Bold"
                                                fontSize={valueFont}
                                            >
                                                {formattedPrev}
                                            </SvgText>
                                            <Line
                                                x1={prevStartX}
                                                y1={strikeY}
                                                x2={prevEndX}
                                                y2={strikeY}
                                                stroke={prevColor}
                                                strokeWidth={Math.max(2, valueFont * 0.16)}
                                                strokeLinecap="round"
                                            />
                                            <SvgText
                                                x={currX}
                                                y={baselineY}
                                                textAnchor="start"
                                                alignmentBaseline="middle"
                                                fill={diffHighlightColor}
                                                fontFamily="Outfit_800ExtraBold"
                                                fontSize={valueFontBig}
                                            >
                                                {formattedCurr}
                                            </SvgText>
                                        </>
                                    );
                                }

                                return (
                                    <>
                                        <SvgText
                                            x={x}
                                            y={baselineY}
                                            textAnchor={sideAnchor}
                                            alignmentBaseline="middle"
                                            fill={prevColor}
                                            fontFamily="Outfit_700Bold"
                                            fontSize={valueFont}
                                        >
                                            {formattedPrev}
                                        </SvgText>
                                        {renderStrikeLine({
                                            x,
                                            y: baselineY - valueFont * 0.12,
                                            fontSize: valueFont,
                                            textAnchor: sideAnchor,
                                            text: formattedPrev,
                                            color: prevColor,
                                        })}
                                        <SvgText
                                            x={x}
                                            y={baselineY + lineGap}
                                            textAnchor={sideAnchor}
                                            alignmentBaseline="middle"
                                        >
                                            <TSpan
                                                fill={diffHighlightColor}
                                                fontFamily="Outfit_800ExtraBold"
                                                fontSize={valueFontBig}
                                            >
                                                {formattedCurr}
                                            </TSpan>
                                        </SvgText>
                                    </>
                                );
                            })()}
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
