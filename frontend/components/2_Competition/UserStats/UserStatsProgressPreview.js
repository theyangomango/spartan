import React, { useMemo, useState, useCallback, useRef } from "react";
import { ScrollView, View, Text, useWindowDimensions, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Defs, LinearGradient, Stop, Circle, G, Line } from "react-native-svg";
import dayjs from "dayjs";

import HumanMuscleOutline from "../../../assets/human_muscle_outline";
import HumanMuscleBackOutline from "../../../assets/human_muscle_back_outline";
import HexagonalStats from "./HexagonalStats";
import { chartCardLayout, chartCardTypography, chartTypography } from "../../charts/chartStyles";
import theme from "../../../theme/mfpDark";
import { scaleSize, DEVICE_WIDTH, ts } from "../layoutConstants";
import formatHexStat from "../../../utils/formatHexStat";

const MUSCLE_OUTLINE_COLOR = "#40485c";
const DEFAULT_X_AXIS_LABEL_COUNT = 4;
const CHART_ACCENTS = {
    volume: { r: 45, g: 158, b: 255 },
    reps: { r: 156, g: 136, b: 255 },
    personalRecords: { r: 255, g: 183, b: 126 },
};
const PREVIEW_HORIZONTAL_PAD = scaleSize(17);

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

const toMillisSafe = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (value instanceof Date) {
        const ms = value.getTime();
        return Number.isFinite(ms) ? ms : 0;
    }
    if (typeof value?.toMillis === "function") {
        const direct = Number(value.toMillis());
        return Number.isFinite(direct) ? direct : 0;
    }
    if (typeof value?.toDate === "function") {
        try {
            const dateValue = value.toDate();
            if (dateValue instanceof Date) {
                const ms = dateValue.getTime();
                if (Number.isFinite(ms)) return ms;
            }
        } catch {
            //
        }
    }
    if (typeof value === "object" && typeof value.seconds === "number") {
        const base = Number(value.seconds) * 1000;
        const fractional = Number.isFinite(Number(value.nanoseconds)) ? Number(value.nanoseconds) / 1e6 : 0;
        const total = base + fractional;
        return Number.isFinite(total) ? total : 0;
    }
    if (typeof value === "object" && typeof value._seconds === "number") {
        const base = Number(value._seconds) * 1000;
        const fractional = Number.isFinite(Number(value._nanoseconds)) ? Number(value._nanoseconds) / 1e6 : 0;
        const total = base + fractional;
        return Number.isFinite(total) ? total : 0;
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return 0;
        const numeric = Number(trimmed);
        if (Number.isFinite(numeric)) return numeric;
        const parsed = Date.parse(trimmed);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

const resolveWorkoutTimestamp = (workout) => {
    if (!workout || typeof workout !== "object") return 0;
    const candidates = [workout.created, workout.createdAt, workout.timestamp];
    for (const candidate of candidates) {
        const ms = toMillisSafe(candidate);
        if (ms) return ms;
    }
    return 0;
};

const sanitizeCompletedWorkouts = (raw) => {
    if (!Array.isArray(raw)) return [];
    return raw.filter(Boolean);
};

const sanitizeVolumeEntries = (completedWorkouts) => {
    if (!Array.isArray(completedWorkouts)) return [];
    const prelim = completedWorkouts
        .map((workout, idx) => {
            if (!workout) return null;
            const recordedAt = resolveWorkoutTimestamp(workout);
            const volume = Number(
                workout?.volume ??
                workout?.totalVolume ??
                workout?.stats?.volume ??
                workout?.metrics?.volume ??
                0
            );
            if (!Number.isFinite(recordedAt) || recordedAt <= 0 || !Number.isFinite(volume) || volume <= 0) return null;
            return {
                id: workout.id || workout.wid || workout.workoutId || workout.sessionId || `vol-${idx}`,
                increment: volume,
                recordedAt,
                name:
                    (typeof workout?.name === "string" && workout.name.trim())
                        ? workout.name.trim()
                        : workout?.templateName || "Workout",
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.recordedAt - b.recordedAt);

    let runningTotal = 0;
    return prelim.map((entry) => {
        runningTotal += entry.increment;
        return { ...entry, value: runningTotal };
    });
};

const sanitizeRepsEntries = (completedWorkouts) => {
    if (!Array.isArray(completedWorkouts)) return [];
    const prelim = completedWorkouts
        .map((workout, idx) => {
            if (!workout) return null;
            const recordedAt = resolveWorkoutTimestamp(workout);
            const reps = Number(
                workout?.reps ??
                workout?.totalReps ??
                workout?.stats?.reps ??
                workout?.stats?.totalReps ??
                workout?.metrics?.reps ??
                0
            );
            if (!Number.isFinite(recordedAt) || recordedAt <= 0 || !Number.isFinite(reps) || reps <= 0) return null;
            return {
                id: workout.id || workout.wid || workout.workoutId || workout.sessionId || `rep-${idx}`,
                increment: reps,
                recordedAt,
                name:
                    (typeof workout?.name === "string" && workout.name.trim())
                        ? workout.name.trim()
                        : workout?.templateName || "Workout",
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.recordedAt - b.recordedAt);

    let runningTotal = 0;
    return prelim.map((entry) => {
        runningTotal += entry.increment;
        return { ...entry, value: runningTotal };
    });
};

const sanitizePersonalRecordEntries = (completedWorkouts) => {
    if (!Array.isArray(completedWorkouts)) return [];
    const prelim = completedWorkouts
        .map((workout, idx) => {
            const recordedAt = resolveWorkoutTimestamp(workout);
            const rawIncrement = Number(workout?.PBs ?? workout?.pbs ?? 0);
            const increment = Number.isFinite(rawIncrement) && rawIncrement > 0 ? rawIncrement : 0;
            if (!Number.isFinite(recordedAt) || recordedAt <= 0 || increment <= 0) return null;
            return {
                id: workout.id || workout.wid || workout.workoutId || `pr-${idx}`,
                increment,
                recordedAt,
                name:
                    (typeof workout?.name === "string" && workout.name.trim())
                        ? workout.name.trim()
                        : workout?.templateName || "Workout",
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.recordedAt - b.recordedAt);

    let runningTotal = 0;
    return prelim.map((entry) => {
        runningTotal += entry.increment;
        return { ...entry, value: runningTotal };
    });
};

const resolvePreferredWeightUnit = (user) => {
    const rawUnit =
        user?.settings?.units ||
        user?.units ||
        user?.personalInfo?.weightUnit ||
        user?.stats?.weightUnit;
    if (typeof rawUnit === "string") {
        const normalized = rawUnit.trim().toLowerCase();
        if (normalized.startsWith("k")) return "kg";
    }
    return "lbs";
};

const formatVolumeValue = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return "0";
    if (num >= 1000) {
        try {
            return new Intl.NumberFormat("en-US").format(Math.round(num));
        } catch { }
    }
    return Math.round(num).toString();
};

const formatTimestamp = (value) => {
    const ms = toMillisSafe(value);
    if (!Number.isFinite(ms) || ms <= 0) return "No data yet";
    try {
        return dayjs(ms).format("MMM D, h:mm A");
    } catch {
        return "No data yet";
    }
};

const niceNumber = (range, round) => {
    if (range <= 0 || !Number.isFinite(range)) return 1;
    const exponent = Math.floor(Math.log10(range));
    const fraction = range / 10 ** exponent;
    let niceFraction;
    if (round) {
        if (fraction < 1.5) niceFraction = 1;
        else if (fraction < 3) niceFraction = 2;
        else if (fraction < 7) niceFraction = 5;
        else niceFraction = 10;
    } else {
        if (fraction <= 1) niceFraction = 1;
        else if (fraction <= 2) niceFraction = 2;
        else if (fraction <= 5) niceFraction = 5;
        else niceFraction = 10;
    }
    return niceFraction * 10 ** exponent;
};

const computeAxisMetrics = (values, sections = 4) => {
    if (!Array.isArray(values) || values.length === 0) {
        const defaultStep = 10;
        return {
            minValue: 0,
            maxValue: defaultStep * sections,
            step: defaultStep,
            sections,
        };
    }
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
        return { minValue: 0, maxValue: sections, step: 1, sections };
    }
    if (min === max) {
        min = min - 1;
        max = max + 1;
    }
    const range = Math.max(max - min, 1);
    const paddingTop = Math.max(range * 0.1, 0.5);
    const paddingBottom = Math.max(range * 0.2, 1);
    let paddedMin = min - paddingBottom;
    let paddedMax = max + paddingTop;
    if (paddedMin < 0) paddedMin = 0;

    const niceRange = niceNumber(paddedMax - paddedMin, false);
    let step = niceNumber(niceRange / sections, true);
    if (!Number.isFinite(step) || step <= 0) step = 1;

    let niceMin = Math.floor(paddedMin / step) * step;
    let niceMax = niceMin + step * sections;
    if (niceMax < paddedMax) {
        niceMax += step;
    }

    if (niceMin < 0) niceMin = 0;

    return { minValue: niceMin, maxValue: niceMax, step, sections };
};

const buildChartSeries = (chartData, axisMetrics, geometry) => {
    const { leftMargin, innerWidth, topMargin, innerHeight, baselineY } = geometry;

    if (!Array.isArray(chartData) || chartData.length === 0) {
        return { points: [], linePath: "", areaPath: "", domain: null };
    }

    const minY = Number(axisMetrics?.minValue ?? 0);
    const maxY = Number(axisMetrics?.maxValue ?? minY + 1);
    const yRange = Math.max(maxY - minY, 1);

    const timestamps = chartData.map((point) => Number(point.recordedAt));
    let minX = Math.min(...timestamps);
    let maxX = Math.max(...timestamps);

    if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
        const now = Date.now();
        minX = now - 12 * 60 * 60 * 1000;
        maxX = now + 12 * 60 * 60 * 1000;
    }

    if (minX === maxX) {
        const fallbackSpan = 24 * 60 * 60 * 1000;
        minX -= fallbackSpan / 2;
        maxX += fallbackSpan / 2;
    }

    const roundCoord = (value) => Math.round(value * 100) / 100;

    const points = chartData.map((point) => {
        const rawXRatio = (Number(point.recordedAt) - minX) / (maxX - minX);
        const xRatio = Number.isFinite(rawXRatio) ? Math.min(Math.max(rawXRatio, 0), 1) : 0;
        const x = leftMargin + innerWidth * xRatio;

        const rawYRatio = (Number(point.value) - minY) / Math.max(yRange, 1);
        const yRatio = Number.isFinite(rawYRatio) ? Math.min(Math.max(rawYRatio, 0), 1) : 0;
        const y = topMargin + innerHeight * (1 - yRatio);

        return { ...point, x, y };
    });

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    const linePath = points
        .map((point, index) => `${index === 0 ? "M" : "L"} ${roundCoord(point.x)} ${roundCoord(point.y)}`)
        .join(" ");

    let areaPath = `M ${roundCoord(firstPoint.x)} ${roundCoord(baselineY)} L ${roundCoord(firstPoint.x)} ${roundCoord(firstPoint.y)}`;
    for (let i = 1; i < points.length; i += 1) {
        const point = points[i];
        areaPath += ` L ${roundCoord(point.x)} ${roundCoord(point.y)}`;
    }
    areaPath += ` L ${roundCoord(lastPoint.x)} ${roundCoord(baselineY)} Z`;

    return {
        points,
        linePath,
        areaPath,
        domain: { minX, maxX, minY, maxY },
    };
};

const formatAxisValue = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "";
    const abs = Math.abs(num);

    const toScaledString = (scaled) => {
        if (Math.abs(scaled) >= 100) return Math.round(scaled).toString();
        const rounded = Math.round(scaled * 10) / 10;
        return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    };

    if (abs >= 1_000_000) {
        const scaled = num / 1_000_000;
        return `${toScaledString(scaled)}m`;
    }

    if (abs >= 1_000) {
        const scaled = num / 1_000;
        return `${toScaledString(scaled)}k`;
    }

    if (Math.abs(num) >= 100) return Math.round(num).toString();
    const rounded = Math.round(num * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

const buildXAxisLabels = (domain, desiredCount = DEFAULT_X_AXIS_LABEL_COUNT) => {
    if (!domain || typeof domain !== "object") return [];
    const { minX, maxX } = domain;
    if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return [];

    const span = Math.max(maxX - minX, 0);

    if (span <= 0) {
        const label = dayjs(minX).format("MMM D");
        return label ? [{ label, timestamp: minX }] : [];
    }

    const count = Math.max(2, Number(desiredCount) || DEFAULT_X_AXIS_LABEL_COUNT);
    const step = span / (count - 1);
    const labels = [];

    for (let i = 0; i < count; i += 1) {
        const isLast = i === count - 1;
        const timestamp = isLast ? maxX : minX + step * i;
        const formatted = dayjs(timestamp).format("MMM D");
        if (formatted) {
            labels.push({ label: formatted, timestamp });
        }
    }

    return labels;
};

const BASE_METRIC_META = {
    volume: {
        key: "volume",
        label: "Volume",
        title: "Total Volume",
        accent: { r: 45, g: 158, b: 255 },
        unit: "lbs",
        hint: ["Auto-updates from", "completed workouts."],
        gradient: ["#7FB7FF", "#2D7BFF"],
        line: "#7FB7FF",
    },
    reps: {
        key: "reps",
        label: "Reps",
        title: "Total Reps",
        accent: { r: 45, g: 158, b: 255 },
        unit: "reps",
        hint: ["Auto-updates from", "completed workouts."],
        gradient: ["#7FB7FF", "#2D7BFF"],
        line: "#7FB7FF",
    },
    personalRecords: {
        key: "personalRecords",
        label: "PRs",
        title: "Total Personal Records",
        accent: { r: 45, g: 158, b: 255 },
        unit: "PRs",
        hint: ["Auto-updates when you", "hit new PRs."],
        gradient: ["#7FB7FF", "#2D7BFF"],
        line: "#7FB7FF",
    },
};

const accentToRgba = (accent, alpha) => {
    const { r, g, b } = accent;
    const boundedAlpha = Math.max(0, Math.min(alpha, 1));
    return `rgba(${r}, ${g}, ${b}, ${boundedAlpha})`;
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
}) => {
    const series = seriesByKey[activeMetric] || { points: [], linePath: "", areaPath: "" };
    const labels = labelsByKey[activeMetric] || [];
    const latest = latestByKey[activeMetric] || { text: "--", unit: "", info: "No data yet" };
    const activeMeta = metricMeta[activeMetric] || metricMeta.volume;
    const accent = activeMeta?.accent || metricMeta.volume.accent;
    const accentSolid = "#7FB7FF";
    const gradientTop = "#7FB7FF";
    const gradientBottom = "#2D7BFF";
    const {
        chartWidth,
        yAxisLabelWidth,
        plotWidth,
        plotHeight,
        leftMargin,
        rightMargin,
        topMargin,
        innerHeight,
        baselineY,
        chartPaddingTop,
        chartPaddingBottom,
    } = geometry;
    const yTicks = yTicksByKey[activeMetric] || [];

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
            <View style={styles.summaryRow}>
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
                        <View style={[styles.chartCanvas, { width: plotWidth, height: chartHeight }]}>
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
                                        isActive={false}
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
                        </View>
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

export default function UserStatsProgressPreview({ user, hexOverlay = null, hexProps = {} }) {
    const effectiveWidth = DEVICE_WIDTH;
    const chartHeight = scaleSize(220);
    const overallHexDisplay = useMemo(() => {
        const raw = Number(user?.statsHexagon?.overall ?? user?.statsHexagon?.overallScore);
        return Number.isFinite(raw) ? formatHexStat(raw) : null;
    }, [user?.statsHexagon?.overall, user?.statsHexagon?.overallScore]);
    const chartGeometry = useMemo(() => {
        const cardHorizontalPadding = scaleSize(16);
        const chartWidth = Math.max(DEVICE_WIDTH - cardHorizontalPadding, scaleSize(200));
        const yAxisLabelWidth = scaleSize(42);
        const plotWidth = Math.max(chartWidth - yAxisLabelWidth, scaleSize(160));
        const plotHeight = chartHeight;
        const initialSpacing = scaleSize(12);
        const chartPaddingTop = scaleSize(24);
        const chartPaddingBottom = scaleSize(32);
        const leftMargin = initialSpacing;
        const rightMargin = initialSpacing;
        const topMargin = chartPaddingTop;
        const bottomMargin = chartPaddingBottom;
        const innerWidth = Math.max(plotWidth - leftMargin - rightMargin, 1);
        const innerHeight = Math.max(plotHeight - topMargin - bottomMargin, 1);
        const baselineY = plotHeight - bottomMargin;
        return {
            chartWidth,
            yAxisLabelWidth,
            plotWidth,
            plotHeight,
            leftMargin,
            rightMargin,
            topMargin,
            bottomMargin,
            innerWidth,
            innerHeight,
            baselineY,
            chartPaddingTop,
            chartPaddingBottom,
        };
    }, [chartHeight]);

    const completedWorkouts = useMemo(
        () => sanitizeCompletedWorkouts(user?.completedWorkouts || user?.recentWorkouts || user?.workouts || []),
        [user?.completedWorkouts, user?.recentWorkouts, user?.workouts]
    );
    const volumeUnit = useMemo(() => resolvePreferredWeightUnit(user), [user]);
    const metricMeta = useMemo(
        () => ({
            volume: { ...BASE_METRIC_META.volume, unit: volumeUnit },
            reps: BASE_METRIC_META.reps,
            personalRecords: BASE_METRIC_META.personalRecords,
        }),
        [volumeUnit]
    );

    const volumeEntries = useMemo(() => sanitizeVolumeEntries(completedWorkouts), [completedWorkouts]);
    const repsEntries = useMemo(() => sanitizeRepsEntries(completedWorkouts), [completedWorkouts]);
    const personalRecordEntries = useMemo(
        () => sanitizePersonalRecordEntries(completedWorkouts),
        [completedWorkouts]
    );

    const volumeValues = useMemo(() => volumeEntries.map((point) => point.value), [volumeEntries]);
    const repsValues = useMemo(() => repsEntries.map((point) => point.value), [repsEntries]);
    const prValues = useMemo(() => personalRecordEntries.map((point) => point.value), [personalRecordEntries]);

    const volumeAxis = useMemo(() => computeAxisMetrics(volumeValues), [volumeValues]);
    const repsAxis = useMemo(() => computeAxisMetrics(repsValues), [repsValues]);
    const prAxis = useMemo(() => computeAxisMetrics(prValues), [prValues]);

    const seriesByKey = useMemo(
        () => ({
            volume: buildChartSeries(volumeEntries, volumeAxis, chartGeometry),
            reps: buildChartSeries(repsEntries, repsAxis, chartGeometry),
            personalRecords: buildChartSeries(personalRecordEntries, prAxis, chartGeometry),
        }),
        [volumeEntries, volumeAxis, chartGeometry, repsEntries, repsAxis, personalRecordEntries, prAxis]
    );

    const labelsByKey = useMemo(() => {
        const entries = {};
        Object.keys(seriesByKey).forEach((key) => {
            const domain = seriesByKey[key]?.domain;
            entries[key] = domain ? buildXAxisLabels(domain) : [];
        });
        return entries;
    }, [seriesByKey]);

    const yTicksByKey = useMemo(
        () => ({
            volume: (() => {
                if (!volumeAxis) return [];
                const list = [];
                for (let i = 0; i <= volumeAxis.sections; i += 1) {
                    list.push(volumeAxis.minValue + volumeAxis.step * i);
                }
                return list;
            })(),
            reps: (() => {
                if (!repsAxis) return [];
                const list = [];
                for (let i = 0; i <= repsAxis.sections; i += 1) {
                    list.push(repsAxis.minValue + repsAxis.step * i);
                }
                return list;
            })(),
            personalRecords: (() => {
                if (!prAxis) return [];
                const list = [];
                for (let i = 0; i <= prAxis.sections; i += 1) {
                    list.push(prAxis.minValue + prAxis.step * i);
                }
                return list;
            })(),
        }),
        [volumeAxis, repsAxis, prAxis]
    );

    const hasVolumeChartData = volumeEntries.length > 0;
    const hasRepsChartData = repsEntries.length > 0;
    const hasPersonalRecordChartData = personalRecordEntries.length > 0;

    const latestByKey = useMemo(() => {
        const buildLatest = (entries, key) => {
            if (!Array.isArray(entries) || !entries.length) return { text: "--", unit: "", info: "No data yet" };
            const latest = entries[entries.length - 1];
            const meta = metricMeta[key] || metricMeta.volume;
            return {
                text: formatVolumeValue(latest.value),
                unit: meta.unit,
                info: formatTimestamp(latest.recordedAt),
            };
        };
        return {
            volume: buildLatest(volumeEntries, "volume"),
            reps: buildLatest(repsEntries, "reps"),
            personalRecords: buildLatest(personalRecordEntries, "personalRecords"),
        };
    }, [volumeEntries, repsEntries, personalRecordEntries]);

    const metricTabs = useMemo(
        () => [
            { key: "volume", label: "Volume", icon: "bar-chart-outline", hasData: hasVolumeChartData },
            { key: "reps", label: "Reps", icon: "stats-chart-outline", hasData: hasRepsChartData },
            { key: "personalRecords", label: "PRs", icon: "trophy-outline", hasData: hasPersonalRecordChartData },
        ],
        [hasVolumeChartData, hasRepsChartData, hasPersonalRecordChartData]
    );

    const initialMetric = useMemo(() => {
        if (hasVolumeChartData) return "volume";
        if (hasRepsChartData) return "reps";
        if (hasPersonalRecordChartData) return "personalRecords";
        return "volume";
    }, [hasVolumeChartData, hasRepsChartData, hasPersonalRecordChartData]);
    const [activeMetric, setActiveMetric] = useState(initialMetric);
    const [topPagerIndex, setTopPagerIndex] = useState(0);
    const topPagerIndexRef = useRef(0);

    const handleTopPagerMomentum = useCallback(
        (event) => {
            const x = event?.nativeEvent?.contentOffset?.x || 0;
            const nextIndex = Math.round(x / effectiveWidth);
            if (nextIndex !== topPagerIndexRef.current) {
                topPagerIndexRef.current = nextIndex;
                setTopPagerIndex(nextIndex);
            }
        },
        [effectiveWidth]
    );

    const renderTopPager = useCallback(() => (
        <View style={styles.topPagerContainer}>
            <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                onMomentumScrollEnd={handleTopPagerMomentum}
                snapToAlignment="center"
                contentContainerStyle={styles.pagerContent}
            >
                <View style={[styles.topPagerPage, { width: effectiveWidth }]}>
                    <View style={[chartCardLayout.card, styles.bodyCard]}>
                        <View style={styles.bodyFiguresRow}>
                            <View style={[styles.bodyFigureSlot, styles.bodyFigureSlotFront]}>
                                <HumanMuscleOutline
                                    color={MUSCLE_OUTLINE_COLOR}
                                    width="102%"
                                    height="100%"
                                    preserveAspectRatio="xMidYMid meet"
                                    style={styles.bodyFigure}
                                />
                            </View>
                            <View style={[styles.bodyFigureSlot, styles.bodyFigureSlotBack]}>
                                <HumanMuscleBackOutline
                                    color={MUSCLE_OUTLINE_COLOR}
                                    width="102%"
                                    height="100%"
                                    preserveAspectRatio="xMidYMid meet"
                                    style={styles.bodyFigure}
                                />
                            </View>
                        </View>
                    </View>
                </View>
                <View style={[styles.topPagerPage, { width: effectiveWidth }]}>
                    <View style={[chartCardLayout.card, styles.hexCard]}>
                        <View style={styles.hexGraphWrap}>
                            <HexagonalStats
                                statsHexagon={user?.statsHexagon || {}}
                                size={scaleSize(300)}
                                labelFontPx={14}
                                valueFontPx={16}
                                valueFontBigPx={18}
                                {...hexProps}
                            />
                            {hexOverlay ? (typeof hexOverlay === "function" ? hexOverlay() : hexOverlay) : null}
                        </View>
                    </View>
                </View>
            </ScrollView>
            <View style={styles.topPagerDots}>
                {[0, 1].map((index) => (
                    <View
                        key={index}
                        style={[
                            styles.topPagerDot,
                            topPagerIndex === index ? styles.topPagerDotActive : null,
                        ]}
                    />
                ))}
            </View>
        </View>
    ), [effectiveWidth, handleTopPagerMomentum, hexOverlay, hexProps, topPagerIndex, user?.statsHexagon]);

    return (
        <View style={styles.previewContainer}>
            {renderTopPager()}
            <ChartCard
                title="Total Volume / Reps / PRs"
                activeMetric={activeMetric}
                onMetricChange={setActiveMetric}
                seriesByKey={seriesByKey}
                labelsByKey={labelsByKey}
                latestByKey={latestByKey}
                geometry={chartGeometry}
                chartHeight={chartHeight + scaleSize(30)}
                metricMeta={metricMeta}
                yTicksByKey={yTicksByKey}
                metricTabs={metricTabs}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    previewContainer: {
        alignSelf: "center",
        width: DEVICE_WIDTH,
        marginBottom: scaleSize(12),
        marginHorizontal: -PREVIEW_HORIZONTAL_PAD,
    },
    topPagerContainer: {
        marginBottom: scaleSize(8),
        position: "relative",
    },
    pagerContent: {
        paddingHorizontal: 0,
    },
    topPagerPage: {
        paddingHorizontal: 0,
        minHeight: scaleSize(420),
    },
    topPagerDots: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: scaleSize(6),
        gap: scaleSize(6),
        paddingBottom: 0,
        backgroundColor: theme.bg,
    },
    topPagerDot: {
        width: scaleSize(7),
        height: scaleSize(7),
        borderRadius: scaleSize(4),
        backgroundColor: "rgba(255,255,255,0.25)",
    },
    topPagerDotActive: {
        backgroundColor: "#6DB7FF",
    },
    card: {
        backgroundColor: theme.bg,
        paddingHorizontal: scaleSize(18),
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerActions: {
        alignItems: "flex-end",
    },
    autoUpdateHintWrapper: {
        alignItems: "flex-end",
    },
    autoUpdateHint: {
        color: "rgba(216, 226, 255, 0.55)",
    },
    sectionTitle: {
        color: theme.textPrimary,
    },
    summaryRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: scaleSize(12),
        paddingVertical: scaleSize(6),
    },
    summaryValueWrap: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: scaleSize(6),
    },
    summaryUnit: {
        color: "rgba(255,255,255,0.7)",
    },
    summaryInfo: {
        color: "rgba(255,255,255,0.55)",
        maxWidth: "50%",
        flexShrink: 1,
        marginLeft: scaleSize(12),
        textAlign: "right",
    },
    chartWrapper: {
        justifyContent: "center",
        alignSelf: "center",
        overflow: "visible",
    },
    chartContent: {
        flexDirection: "row",
    },
    yAxisLabelsContainer: {
        position: "relative",
        justifyContent: "center",
    },
    yAxisLabel: {
        position: "absolute",
        right: scaleSize(6),
        textAlign: "right",
        fontSize: ts(12),
    },
    chartCanvas: {
        flex: 1,
        position: "relative",
    },
    xAxisLabelsOverlay: {
        position: "absolute",
        bottom: 0,
        flexDirection: "row",
        alignItems: "flex-start",
    },
    xAxisLabel: {
        minWidth: scaleSize(40),
        textAlign: "center",
        color: "rgba(255,255,255,0.65)",
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(11),
    },
    chartSurface: {
        height: scaleSize(220),
        width: "100%",
        paddingHorizontal: 0,
        paddingBottom: scaleSize(8),
        justifyContent: "center",
        position: "relative",
    },
    chartEmptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    placeholderText: {
        color: "rgba(255,255,255,0.55)",
        fontFamily: "Outfit_600SemiBold",
    },
    bodyCard: {
        paddingVertical: scaleSize(20),
        paddingHorizontal: scaleSize(18),
        marginBottom: 0,
        backgroundColor: theme.bg,
        minHeight: scaleSize(430),
        justifyContent: "center",
    },
    bodyFiguresRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        alignItems: "center",
        paddingHorizontal: scaleSize(8),
        marginTop: scaleSize(-36),
    },
    bodyFigureSlot: {
        flex: 1,
        height: scaleSize(440),
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible",
        transform: [{ translateY: scaleSize(32) }],
    },
    bodyFigureSlotFront: {
        marginRight: scaleSize(12),
    },
    bodyFigureSlotBack: {
        marginLeft: scaleSize(12),
    },
    bodyFigure: {
        width: "100%",
        height: "100%",
    },
    hexCard: {
        backgroundColor: theme.bg,
        paddingBottom: scaleSize(16),
        minHeight: scaleSize(430),
        alignItems: "center",
        justifyContent: "center",
    },
    hexGraphWrap: {
        alignItems: "center",
        justifyContent: "center",
        marginTop: scaleSize(-14),
        marginBottom: scaleSize(-18),
    },
    metricToggleRowContainer: {
        marginTop: scaleSize(20),
        alignSelf: "stretch",
    },
    metricToggleRow: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    metricToggleButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(16),
        paddingVertical: scaleSize(8),
        borderRadius: scaleSize(999),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.22)",
        backgroundColor: "rgba(12, 18, 28, 0.55)",
        marginRight: scaleSize(10),
        marginBottom: scaleSize(10),
    },
    metricToggleButtonActive: {
        backgroundColor: "rgba(45, 158, 255, 0.22)",
        borderColor: theme.primary ?? "#2D9EFF",
    },
    metricToggleButtonMuted: {
        opacity: 0.6,
    },
    metricToggleIcon: {
        marginRight: scaleSize(6),
    },
    metricToggleLabel: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(13),
        color: "rgba(216, 226, 255, 0.78)",
    },
    metricToggleLabelActive: {
        color: theme.textPrimary ?? "#F6F8FF",
    },
    metricToggleLabelMuted: {
        color: "rgba(216, 226, 255, 0.5)",
    },
});
