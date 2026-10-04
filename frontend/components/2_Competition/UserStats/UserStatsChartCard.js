// Line chart card of the stats preview with the Volume / Reps / PRs toggle and a tap-to-inspect tooltip.
import React, { useState, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Defs, LinearGradient, Stop, Circle, G, Line } from "react-native-svg";

import { chartCardLayout, chartCardTypography, chartTypography, chartPointerStyles } from "../../charts/chartStyles";
import { accentToRgba, formatAxisValue } from "../../charts/chartMath";
import theme from "../../../theme/mfpDark";
import { scaleSize } from "../layoutConstants";
import styles from "./UserStatsProgressPreview.styles";
import { CHART_ACCENTS } from "./userStatsChartUtils";
import { VolumePointerLabel, RepsPointerLabel, PersonalRecordPointerLabel } from "./UserStatsChartPointers";

const ChartBubble = ({ cx, cy, isActive, accent = CHART_ACCENTS.volume }) => {
    const coreRadius = isActive ? scaleSize(6.4) : scaleSize(4.8);
    const ringRadius = coreRadius + scaleSize(isActive ? 2.2 : 1.5);
    const haloRadius = coreRadius + scaleSize(isActive ? 6.2 : 4.6);
    const highlightRadius = coreRadius * (isActive ? 0.42 : 0.36);
    const innerStrokeWidth = isActive ? scaleSize(1) : scaleSize(0.8);
    const accentToRgba = (alpha) => `rgba(${accent.r}, ${accent.g}, ${accent.b}, ${alpha})`;

    return (
        <G>
            <Circle cx={cx} cy={cy} r={haloRadius} fill={accentToRgba(isActive ? 0.32 : 0.18)} />
            <Circle
                cx={cx}
                cy={cy}
                r={ringRadius}
                stroke={accentToRgba(isActive ? 0.78 : 0.5)}
                strokeWidth={isActive ? scaleSize(2) : scaleSize(1.2)}
                fill="rgba(255, 255, 255, 0.08)"
            />
            <Circle
                cx={cx}
                cy={cy}
                r={coreRadius}
                fill={isActive ? "#F8FBFF" : "#E3EBFF"}
                stroke="rgba(14, 24, 35, 0.35)"
                strokeWidth={innerStrokeWidth}
            />
            <Circle
                cx={cx}
                cy={cy - scaleSize(isActive ? 1.2 : 0.9)}
                r={highlightRadius}
                fill="rgba(255, 255, 255, 0.95)"
                opacity={isActive ? 0.95 : 0.55}
            />
        </G>
    );
};

const ChartCard = ({
    title,
    activeMetric,
    onMetricChange,
    seriesByKey,
    labelsByKey,
    latestByKey,
    geometry,
    chartHeight,
    metricMeta,
    yTicksByKey,
    metricTabs,
    onWorkoutPress,
}) => {
    const series = seriesByKey[activeMetric] || { points: [], linePath: "", areaPath: "" };
    const labels = labelsByKey[activeMetric] || [];
    const latest = latestByKey[activeMetric] || { text: "--", unit: "", info: "No data yet" };
    const activeMeta = metricMeta[activeMetric] || metricMeta.volume;
    const accent = activeMeta?.accent || metricMeta.volume.accent;
    const accentSolid = accentToRgba(accent, 1);
    const gradientTop = activeMeta?.gradient?.[0] || accentSolid;
    const gradientBottom = activeMeta?.gradient?.[1] || accentToRgba(accent, 0.65);
    const {
        chartWidth,
        yAxisLabelWidth,
        plotWidth,
        leftMargin,
        rightMargin,
        topMargin,
        innerHeight,
        baselineY,
        chartPaddingTop,
        chartPaddingBottom,
    } = geometry;
    const yTicks = yTicksByKey[activeMetric] || [];
    const [activeIndex, setActiveIndex] = useState(null);
    const pointerWidth = scaleSize(184);

    useEffect(() => {
        setActiveIndex(null);
    }, [activeMetric, series.points.length]);

    const handleChartPress = useCallback(
        (event) => {
            if (!series.points.length) return;
            const x = event?.nativeEvent?.locationX;
            if (typeof x !== "number") return;
            const clampedX = Math.max(0, Math.min(plotWidth, x));
            let nearestIndex = 0;
            let smallestDistance = Math.abs(series.points[0].x - clampedX);
            for (let i = 1; i < series.points.length; i += 1) {
                const candidate = series.points[i];
                const dist = Math.abs(candidate.x - clampedX);
                if (dist < smallestDistance) {
                    smallestDistance = dist;
                    nearestIndex = i;
                }
            }
            setActiveIndex(nearestIndex);
        },
        [series.points, plotWidth]
    );

    const activePoint = typeof activeIndex === "number" && activeIndex >= 0 ? series.points[activeIndex] : null;
    const activeEntry = activePoint || null;
    const pointerLeft = activePoint
        ? Math.min(Math.max(activePoint.x - pointerWidth / 2, 0), plotWidth - pointerWidth)
        : 0;
    const pointerTop = Math.max(scaleSize(-8), topMargin - scaleSize(70));
    const pointerRightAligned = activePoint ? activePoint.x > plotWidth / 2 : false;

    const renderPointer = () => {
        if (!activeEntry) return null;
        if (activeMetric === "volume") {
            return (
                <VolumePointerLabel
                    entry={activeEntry}
                    unit={activeMeta.unit}
                    accent={activeMeta.accent}
                    isRightAligned={pointerRightAligned}
                    onWorkoutPress={onWorkoutPress}
                />
            );
        }
        if (activeMetric === "reps") {
            return (
                <RepsPointerLabel
                    entry={activeEntry}
                    accent={activeMeta.accent}
                    isRightAligned={pointerRightAligned}
                    onWorkoutPress={onWorkoutPress}
                />
            );
        }
        if (activeMetric === "personalRecords") {
            return (
                <PersonalRecordPointerLabel
                    entry={activeEntry}
                    accent={activeMeta.accent}
                    isRightAligned={pointerRightAligned}
                    onWorkoutPress={onWorkoutPress}
                />
            );
        }
        return null;
    };

    return (
        <View style={[chartCardLayout.card, styles.card]}>
            <View style={[chartCardLayout.header, styles.cardHeader]}>
                <Text style={[chartCardTypography.sectionTitle, styles.sectionTitle]}>
                    {activeMeta?.title || title}
                </Text>
                <View style={styles.headerActions}>
                    {Array.isArray(activeMeta?.hint) ? (
                        <View style={styles.autoUpdateHintWrapper}>
                            {activeMeta.hint.map((line, idx) => (
                                <Text key={`hint-${idx}`} style={[chartCardTypography.hint, styles.autoUpdateHint]}>
                                    {line}
                                </Text>
                            ))}
                        </View>
                    ) : null}
                </View>
            </View>
            <View style={[chartCardLayout.metricsRow, styles.summaryRow]}>
                <View style={styles.summaryValueWrap}>
                    <Text style={chartCardTypography.metricValue}>{latest.text}</Text>
                    <Text style={[chartCardTypography.metricUnit, styles.summaryUnit]}>{latest.unit}</Text>
                </View>
                <Text style={[chartCardTypography.summary, styles.summaryInfo]}>{latest.info}</Text>
            </View>
        <View
            style={[
                styles.chartWrapper,
                {
                    height: chartHeight,
                    width: chartWidth,
                    paddingTop: chartPaddingTop,
                    paddingBottom: chartPaddingBottom,
                },
            ]}
        >
            {series.points.length ? (
                <View style={styles.chartContent}>
                        <View
                            style={[
                                styles.yAxisLabelsContainer,
                                { width: yAxisLabelWidth, height: chartHeight },
                            ]}
                            pointerEvents="none"
                        >
                            {yTicks.map((value, index) => {
                                const minY = series.domain?.minY ?? 0;
                                const maxY = series.domain?.maxY ?? minY + 1;
                                const range = Math.max(maxY - minY, 1);
                                const ratio = (value - minY) / range;
                                const clampedRatio = Number.isFinite(ratio)
                                    ? Math.min(Math.max(ratio, 0), 1)
                                    : 0;
                                const yPosition = topMargin + innerHeight * (1 - clampedRatio);
                                const approxLabelHeight = scaleSize(14);
                                const top = Math.max(topMargin - approxLabelHeight / 2, Math.min(chartHeight - approxLabelHeight, yPosition - approxLabelHeight / 2));
                                return (
                                    <Text
                                        key={`y-axis-${value}-${index}`}
                                        style={[
                                            chartTypography.axisLabel,
                                            styles.yAxisLabel,
                                            { top },
                                        ]}
                                    >
                                        {formatAxisValue(value)}
                                    </Text>
                                );
                            })}
                        </View>
                        <Pressable
                            style={[styles.chartCanvas, { width: plotWidth, height: chartHeight }]}
                            onPressIn={handleChartPress}
                        >
                            <Svg width={plotWidth} height={chartHeight}>
                                <Defs>
                                    <LinearGradient id={`area-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                                        <Stop offset="0%" stopColor={gradientTop} stopOpacity="0.3" />
                                        <Stop offset="100%" stopColor={gradientBottom} stopOpacity="0.08" />
                                    </LinearGradient>
                                </Defs>

                                {yTicks.map((value, index) => {
                                    const minY = series.domain?.minY ?? 0;
                                    const maxY = series.domain?.maxY ?? minY + 1;
                                    const range = Math.max(maxY - minY, 1);
                                    const ratio = (value - minY) / range;
                                    const clampedRatio = Number.isFinite(ratio)
                                        ? Math.min(Math.max(ratio, 0), 1)
                                        : 0;
                                    const y = topMargin + innerHeight * (1 - clampedRatio);
                                    return (
                                        <Line
                                            key={`grid-${value}-${index}`}
                                            x1={leftMargin}
                                            y1={y}
                                            x2={plotWidth - rightMargin}
                                            y2={y}
                                            stroke="rgba(255,255,255,0.1)"
                                            strokeWidth={StyleSheet.hairlineWidth}
                                            strokeDasharray={[6, 6]}
                                        />
                                    );
                                })}

                                {series.areaPath ? (
                                    <Path
                                        d={series.areaPath}
                                        fill={`url(#area-${activeMetric})`}
                                        stroke="none"
                                    />
                                ) : null}

                                {series.linePath ? (
                                    <Path
                                        d={series.linePath}
                                        fill="none"
                                        stroke={accentSolid}
                                        strokeWidth={scaleSize(3)}
                                        strokeLinejoin="round"
                                        strokeLinecap="round"
                                    />
                                ) : null}

                                <Line
                                    x1={leftMargin}
                                    y1={topMargin}
                                    x2={leftMargin}
                                    y2={baselineY}
                                    stroke="rgba(148, 157, 172, 0.35)"
                                    strokeWidth={StyleSheet.hairlineWidth}
                                />
                                <Line
                                    x1={leftMargin}
                                    y1={baselineY}
                                    x2={plotWidth - rightMargin}
                                    y2={baselineY}
                                    stroke="rgba(148, 157, 172, 0.35)"
                                    strokeWidth={StyleSheet.hairlineWidth}
                                />

                                {series.points.map((point, idx) => (
                                    <ChartBubble
                                        key={`${activeMetric}-pt-${idx}`}
                                        cx={point.x}
                                        cy={point.y}
                                        isActive={idx === activeIndex}
                                        accent={activeMeta.accent}
                                    />
                                ))}
                            </Svg>

                            {labels.length ? (
                                <View
                                    pointerEvents="none"
                                    style={[
                                        styles.xAxisLabelsOverlay,
                                        {
                                            left: leftMargin,
                                            right: rightMargin,
                                            justifyContent: labels.length > 1 ? "space-between" : "center",
                                        },
                                    ]}
                                >
                                    {labels.map((item, index) => (
                                        <Text
                                            key={`x-axis-${item.timestamp ?? index}-${index}`}
                                            style={[chartTypography.axisLabel, styles.xAxisLabel]}
                                        >
                                            {item.label}
                                        </Text>
                                    ))}
                                </View>
                            ) : null}
                            {activeEntry ? (
                                <View
                                    style={[
                                        chartPointerStyles.container,
                                        {
                                            left: pointerLeft,
                                            top: pointerTop,
                                        },
                                    ]}
                                >
                                    {renderPointer()}
                                </View>
                            ) : null}
                        </Pressable>
                    </View>
                ) : (
                    <View style={styles.chartEmptyState}>
                        <Text style={styles.placeholderText}>Complete workouts to build volume.</Text>
                    </View>
                )}
            </View>
            <View style={styles.metricToggleRowContainer}>
                <View style={styles.metricToggleRow}>
                    {metricTabs.map((tab) => {
                        const isActive = tab.key === activeMetric;
                        return (
                            <Pressable
                                key={tab.key}
                                onPress={() => onMetricChange(tab.key)}
                                accessibilityRole="button"
                                accessibilityLabel={`Show ${tab.label} progress`}
                                style={[
                                    styles.metricToggleButton,
                                    isActive && styles.metricToggleButtonActive,
                                    !tab.hasData && !isActive && styles.metricToggleButtonMuted,
                                ]}
                            >
                                <Ionicons
                                    name={tab.icon}
                                    size={scaleSize(16)}
                                    color={
                                        isActive
                                            ? theme.textPrimary ?? "#F6F8FF"
                                            : "rgba(216,226,255,0.75)"
                                    }
                                    style={styles.metricToggleIcon}
                                />
                                <Text
                                    style={[
                                        styles.metricToggleLabel,
                                        isActive && styles.metricToggleLabelActive,
                                        !tab.hasData && !isActive && styles.metricToggleLabelMuted,
                                    ]}
                                >
                                    {tab.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>
        </View>
    );
};

export default ChartCard;
