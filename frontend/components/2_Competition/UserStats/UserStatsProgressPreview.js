import React, { useMemo, useState, useCallback, useRef } from "react";
import { ScrollView, View } from "react-native";

import HumanMuscleOutline from "../../../assets/human_muscle_outline";
import HumanMuscleBackOutline from "../../../assets/human_muscle_back_outline";
import HexagonalStats from "./HexagonalStats";
import { chartCardLayout } from "../../charts/chartStyles";
import { computeAxisMetrics, buildChartSeries, formatVolumeValue } from "../../charts/chartMath";
import { scaleSize, DEVICE_WIDTH } from "../layoutConstants";
import { buildMuscleFillMap, DEFAULT_MUSCLE_SEGMENTS as MUSCLE_SEGMENTS, BODYGRAPH_OUTLINE_COLOR } from "../../../utils/muscleTierColors";
import { sanitizeCompletedWorkouts } from "../../../utils/completedWorkouts";
import styles from "./UserStatsProgressPreview.styles";
import {
    BASE_METRIC_META,
    buildXAxisLabels,
    formatTimestamp,
    resolvePreferredWeightUnit,
    sanitizePersonalRecordEntries,
    sanitizeRepsEntries,
    sanitizeVolumeEntries,
} from "./userStatsChartUtils";
import ChartCard from "./UserStatsChartCard";

export default function UserStatsProgressPreview({ user, hexProps = {}, onWorkoutPress }) {
    const effectiveWidth = DEVICE_WIDTH;
    const chartHeight = scaleSize(220);
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
    }, [volumeEntries, repsEntries, personalRecordEntries, metricMeta]);

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
    const muscleFills = useMemo(
        () => buildMuscleFillMap(user?.statsHexagon, MUSCLE_SEGMENTS),
        [user?.statsHexagon]
    );

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
                                    color={BODYGRAPH_OUTLINE_COLOR}
                                    width="120%"
                                    height="118%"
                                    preserveAspectRatio="xMidYMid meet"
                                    fills={muscleFills}
                                    style={styles.bodyFigure}
                                />
                            </View>
                            <View style={[styles.bodyFigureSlot, styles.bodyFigureSlotBack]}>
                                <HumanMuscleBackOutline
                                    color={BODYGRAPH_OUTLINE_COLOR}
                                    width="120%"
                                    height="118%"
                                    preserveAspectRatio="xMidYMid meet"
                                    fills={muscleFills}
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
    ), [effectiveWidth, handleTopPagerMomentum, hexProps, topPagerIndex, user?.statsHexagon]);

    return (
        <View style={styles.previewContainer}>
            {renderTopPager()}
            <View style={styles.surfaceGap} />
            <ChartCard
                title="Total Volume / Reps / PRs"
                activeMetric={activeMetric}
                onMetricChange={setActiveMetric}
                seriesByKey={seriesByKey}
                labelsByKey={labelsByKey}
                latestByKey={latestByKey}
                geometry={chartGeometry}
                chartHeight={chartHeight}
                metricMeta={metricMeta}
                yTicksByKey={yTicksByKey}
                metricTabs={metricTabs}
                onWorkoutPress={onWorkoutPress}
            />
            <View style={styles.surfaceGap} />
        </View>
    );
}
