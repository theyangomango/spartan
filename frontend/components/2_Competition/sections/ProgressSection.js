import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Animated,
    PanResponder,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { deleteField } from "firebase/firestore";
import Svg, { Defs, LinearGradient, Line, Path, Stop } from "react-native-svg";

import makeID from "../../../../backend/helper/makeID";
import updateDoc from "../../../../backend/helper/firebase/updateDoc";
import { subscribeUserData } from "../../../utils/userDataEvents";
import { derivePublicWeightFields, sanitizeEntries, selectWeightEntrySource } from "../../../utils/weightEntries";
import { DEVICE_WIDTH, scaleSize } from "../layoutConstants";
import { chartPointerStyles, chartTypography, chartCardTypography, chartCardLayout } from "../../charts/chartStyles";
import { navigateOneWay } from "../../../../navigationRef";
import formatHexStat from "../../../utils/formatHexStat";
import {
    MUSCLE_ICON_OFFSETS,
    MUSCLE_ICON_SCALES,
    MUSCLE_ICON_STROKE_WIDTHS,
    OVERALL_MUSCLE_SEGMENTS,
} from "../muscleGroupIconLayout";
import {
    buildMuscleFillMap,
    DEFAULT_MUSCLE_SEGMENTS as MUSCLE_SEGMENTS,
} from "../../../utils/muscleTierColors";
import { resolvePreferredWeightUnit, toDisplayWeightUnit } from "../../../utils/weightUnits";
import { sanitizeCompletedWorkouts } from "../../../utils/completedWorkouts";
import { sanitizeWorkoutForRouteShallow } from "../../../utils/workoutRouteParams";
import {
    buildChartSeries,
    buildYTickValues,
    computeAxisMetrics,
    formatAxisValue,
    formatVolumeValue,
} from "../../charts/chartMath";
import ChartBubble from "../../charts/ChartBubble";
import AddMeasurementModal from "../AddMeasurementModal";
import { CHART_ACCENTS, METRIC_COLORS } from "./progress/progressConstants";
import {
    buildMetricDeltaDisplay,
    buildXAxisLabels,
    formatTimestamp,
    formatWeightValue,
    sanitizePersonalRecordEntries,
    sanitizeRepsEntries,
    sanitizeVolumeEntries,
} from "./progress/progressMetrics";
import {
    PersonalRecordPointerLabel,
    PointerLabelBubble,
    RepsPointerLabel,
    VolumePointerLabel,
} from "./progress/PointerLabels";
import BodyOverviewPager from "./progress/BodyOverviewPager";
import MuscleGroupList from "./progress/MuscleGroupList";
import MetricToggleRow from "./progress/MetricToggleRow";
import styles from "./progress/ProgressSection.styles";

function ProgressSection({ scrollSignal = 0, onScroll }) {
    const [userData, setUserData] = useState(() => {
        try {
            return global?.userData || null;
        } catch {
            return null;
        }
    });
    const userRef = useRef(userData);
    const navigation = useNavigation();
    const scrollRef = useRef(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeIndex, setActiveIndex] = useState(null);
    const activeIndexRef = useRef(null);
    const volumeActiveIndexRef = useRef(null);
    const [volumeActiveIndex, setVolumeActiveIndex] = useState(null);
    const repsActiveIndexRef = useRef(null);
    const [repsActiveIndex, setRepsActiveIndex] = useState(null);
    const personalRecordActiveIndexRef = useRef(null);
    const [personalRecordActiveIndex, setPersonalRecordActiveIndex] = useState(null);

    useEffect(() => {
        userRef.current = userData;
    }, [userData]);

    useEffect(() => {
        const unsubscribe = subscribeUserData((payload) => {
            userRef.current = payload;
            setUserData(payload);
        });
        return unsubscribe;
    }, []);

    const preferredUnit = useMemo(() => resolvePreferredWeightUnit(userData), [userData]);
    const displayPreferredUnit = useMemo(() => toDisplayWeightUnit(preferredUnit), [preferredUnit]);

    const completedWorkouts = useMemo(
        () => sanitizeCompletedWorkouts(userData?.completedWorkouts || []),
        [userData?.completedWorkouts]
    );

    const completedWorkoutsCount = useMemo(
        () => completedWorkouts.length,
        [completedWorkouts]
    );

    const completedWorkoutsCountLabel = useMemo(() => {
        const count = completedWorkoutsCount;
        try {
            return new Intl.NumberFormat("en-US").format(count);
        } catch {
            return String(count);
        }
    }, [completedWorkoutsCount]);

    const workoutsByWid = useMemo(() => {
        const map = new Map();
        completedWorkouts.forEach((workout) => {
            const widCandidate =
                (typeof workout?.wid === "string" && workout.wid.trim()) ||
                (workout?.wid ? String(workout.wid).trim() : '') ||
                (workout?.workoutId ? String(workout.workoutId).trim() : '') ||
                (workout?.id ? String(workout.id).trim() : '');
            if (widCandidate) map.set(widCandidate, workout);
        });
        return map;
    }, [completedWorkouts]);

    const entries = useMemo(() => sanitizeEntries(selectWeightEntrySource(userData)), [userData]);

    const latestEntry = entries.length ? entries[entries.length - 1] : null;
    const latestWeightText = formatWeightValue(latestEntry?.weight);
    const latestUnit = latestEntry
        ? toDisplayWeightUnit(latestEntry?.unit, displayPreferredUnit)
        : displayPreferredUnit;
    const latestInfoText = latestEntry ? formatTimestamp(latestEntry.recordedAt) : "No entries yet";

    const volumeEntries = useMemo(
        () => sanitizeVolumeEntries(completedWorkouts),
        [completedWorkouts]
    );
    const latestVolumeEntry = volumeEntries.length ? volumeEntries[volumeEntries.length - 1] : null;
    const latestVolumeText = latestVolumeEntry ? formatVolumeValue(latestVolumeEntry.value) : "--";
    const latestVolumeInfo = latestVolumeEntry ? formatTimestamp(latestVolumeEntry.recordedAt) : "No workouts yet";
    const displayVolumeUnit = displayPreferredUnit;
    const latestVolumeUnit = displayVolumeUnit;
    const latestVolumeDeltaMeta = latestVolumeEntry
        ? buildMetricDeltaDisplay(latestVolumeEntry.increment, displayVolumeUnit, formatVolumeValue)
        : null;
    const repsEntries = useMemo(
        () => sanitizeRepsEntries(completedWorkouts),
        [completedWorkouts]
    );
    const personalRecordEntries = useMemo(
        () => sanitizePersonalRecordEntries(completedWorkouts),
        [completedWorkouts]
    );
    const latestRepsEntry = repsEntries.length ? repsEntries[repsEntries.length - 1] : null;
    const latestRepsText = latestRepsEntry ? formatVolumeValue(latestRepsEntry.value) : "--";
    const latestRepsInfo = latestRepsEntry ? formatTimestamp(latestRepsEntry.recordedAt) : "No workouts yet";
    const latestRepsUnit = latestRepsEntry ? "reps" : "";
    const latestRepsDeltaMeta = latestRepsEntry
        ? buildMetricDeltaDisplay(latestRepsEntry.increment, "reps", formatVolumeValue)
        : null;
    const latestPersonalRecordEntry = personalRecordEntries.length
        ? personalRecordEntries[personalRecordEntries.length - 1]
        : null;
    const latestPersonalRecordText = latestPersonalRecordEntry
        ? formatVolumeValue(latestPersonalRecordEntry.value)
        : "--";
    const latestPersonalRecordInfo = latestPersonalRecordEntry
        ? formatTimestamp(latestPersonalRecordEntry.recordedAt)
        : "No PRs yet";
    const latestPersonalRecordUnit = latestPersonalRecordEntry ? "PRs" : "";
    const latestPersonalRecordDeltaMeta = latestPersonalRecordEntry
        ? buildMetricDeltaDisplay(
            latestPersonalRecordEntry.increment,
            latestPersonalRecordEntry.increment === 1 ? "PR" : "PRs",
            formatVolumeValue
        )
        : null;

    const measurementRowSubtitle = useMemo(() => {
        if (!entries.length) return "No measurements yet";
        const count = entries.length;
        const countLabel = count === 1 ? "1 measurement" : `${count} measurements`;
        const lastTimestamp = entries[entries.length - 1]?.recordedAt;
        const lastLogged =
            Number.isFinite(lastTimestamp) && lastTimestamp > 0
                ? dayjs(lastTimestamp).format("MMM D, YYYY")
                : null;
        return lastLogged ? `${countLabel} • Updated ${lastLogged}` : countLabel;
    }, [entries]);

    const chartData = useMemo(() => {
        if (!entries.length) return [];
        return entries.map((entry, index) => {
            const value = Number(entry.weight) || 0;
            const previousEntry = index > 0 ? entries[index - 1] : null;
            const previousValue = previousEntry ? Number(previousEntry.weight) || 0 : null;
            const delta = previousValue != null ? value - previousValue : null;

            return {
                value,
                recordedAt: entry.recordedAt,
                entry,
                delta,
            };
        });
    }, [entries]);
    const latestWeightDeltaMeta = chartData.length
        ? buildMetricDeltaDisplay(chartData[chartData.length - 1]?.delta, latestUnit, formatWeightValue)
        : null;

    const volumeChartData = useMemo(() => {
        if (!volumeEntries.length) return [];
        return volumeEntries.map((entry) => ({
            value: Number(entry.value) || 0,
            recordedAt: entry.recordedAt,
            entry,
        }));
    }, [volumeEntries]);
    const repsChartData = useMemo(() => {
        if (!repsEntries.length) return [];
        return repsEntries.map((entry) => ({
            value: Number(entry.value) || 0,
            recordedAt: entry.recordedAt,
            entry,
        }));
    }, [repsEntries]);
    const sectionsCount = 4;
    const weightValues = useMemo(() => chartData.map((point) => point.value), [chartData]);
    const axisMetrics = useMemo(
        () => computeAxisMetrics(weightValues, sectionsCount),
        [weightValues]
    );
    const yTickValues = useMemo(() => buildYTickValues(axisMetrics), [axisMetrics]);

    const volumeValues = useMemo(() => volumeChartData.map((point) => point.value), [volumeChartData]);
    const volumeAxisMetrics = useMemo(
        () => computeAxisMetrics(volumeValues, sectionsCount),
        [volumeValues]
    );
    const volumeYTickValues = useMemo(() => buildYTickValues(volumeAxisMetrics), [volumeAxisMetrics]);

    const repsValues = useMemo(() => repsChartData.map((point) => point.value), [repsChartData]);
    const repsAxisMetrics = useMemo(
        () => computeAxisMetrics(repsValues, sectionsCount),
        [repsValues]
    );
    const repsYTickValues = useMemo(() => buildYTickValues(repsAxisMetrics), [repsAxisMetrics]);

    const personalRecordValues = useMemo(
        () => personalRecordEntries.map((entry) => entry.value),
        [personalRecordEntries]
    );
    const personalRecordAxisMetrics = useMemo(
        () => computeAxisMetrics(personalRecordValues, sectionsCount),
        [personalRecordValues]
    );
    const personalRecordYTickValues = useMemo(() => buildYTickValues(personalRecordAxisMetrics), [personalRecordAxisMetrics]);

    const cardHorizontalPadding = scaleSize(16);
    const chartHeight = scaleSize(220);
    const chartWidth = Math.max(DEVICE_WIDTH - cardHorizontalPadding, scaleSize(200));
    const chartPaddingTop = scaleSize(24);
    const chartPaddingBottom = scaleSize(32);
    const initialSpacing = scaleSize(12);
    const pointerStripWidth = scaleSize(2);
    const yAxisLabelWidth = scaleSize(42);

    const chartGeometry = useMemo(() => {
        const plotWidth = Math.max(chartWidth - yAxisLabelWidth, scaleSize(160));
        const plotHeight = chartHeight;
        const leftMargin = initialSpacing;
        const rightMargin = initialSpacing;
        const topMargin = chartPaddingTop;
        const bottomMargin = chartPaddingBottom;
        const innerWidth = Math.max(plotWidth - leftMargin - rightMargin, 1);
        const innerHeight = Math.max(plotHeight - topMargin - bottomMargin, 1);
        const baselineY = plotHeight - bottomMargin;

        return {
            plotWidth,
            plotHeight,
            leftMargin,
            rightMargin,
            topMargin,
            bottomMargin,
            innerWidth,
            innerHeight,
            baselineY,
        };
    }, [chartWidth, chartHeight, yAxisLabelWidth, initialSpacing, chartPaddingTop, chartPaddingBottom]);

    const {
        plotWidth: chartPlotWidth,
        leftMargin: chartLeftMargin,
        rightMargin: chartRightMargin,
        topMargin: chartTopMargin,
        bottomMargin: chartBottomMargin,
        innerWidth: chartInnerWidth,
        innerHeight: chartInnerHeight,
        baselineY: chartBaselineY,
    } = chartGeometry;

    const weightSeries = useMemo(
        () => buildChartSeries(chartData, axisMetrics, chartGeometry),
        [chartData, axisMetrics, chartGeometry]
    );

    const volumeSeries = useMemo(
        () => buildChartSeries(volumeChartData, volumeAxisMetrics, chartGeometry),
        [volumeChartData, volumeAxisMetrics, chartGeometry]
    );

    const repsSeries = useMemo(
        () => buildChartSeries(repsChartData, repsAxisMetrics, chartGeometry),
        [repsChartData, repsAxisMetrics, chartGeometry]
    );

    const personalRecordSeries = useMemo(
        () => buildChartSeries(personalRecordEntries, personalRecordAxisMetrics, chartGeometry),
        [personalRecordEntries, personalRecordAxisMetrics, chartGeometry]
    );

    const weightXAxisLabels = useMemo(
        () => buildXAxisLabels(weightSeries?.domain),
        [weightSeries?.domain]
    );

    const volumeXAxisLabels = useMemo(
        () => buildXAxisLabels(volumeSeries?.domain),
        [volumeSeries?.domain]
    );

    const repsXAxisLabels = useMemo(
        () => buildXAxisLabels(repsSeries?.domain),
        [repsSeries?.domain]
    );

    const personalRecordXAxisLabels = useMemo(
        () => buildXAxisLabels(personalRecordSeries?.domain),
        [personalRecordSeries?.domain]
    );

    const weightPointerOpacity = useRef(new Animated.Value(0)).current;
    const volumePointerOpacity = useRef(new Animated.Value(0)).current;
    const repsPointerOpacity = useRef(new Animated.Value(0)).current;
    const personalRecordPointerOpacity = useRef(new Animated.Value(0)).current;
    const weightHideTimeout = useRef(null);
    const volumeHideTimeout = useRef(null);
    const repsHideTimeout = useRef(null);
    const personalRecordHideTimeout = useRef(null);

    const clearWeightHideTimeout = useCallback(() => {
        if (weightHideTimeout.current) {
            clearTimeout(weightHideTimeout.current);
            weightHideTimeout.current = null;
        }
    }, []);

    const clearVolumeHideTimeout = useCallback(() => {
        if (volumeHideTimeout.current) {
            clearTimeout(volumeHideTimeout.current);
            volumeHideTimeout.current = null;
        }
    }, []);

    const clearRepsHideTimeout = useCallback(() => {
        if (repsHideTimeout.current) {
            clearTimeout(repsHideTimeout.current);
            repsHideTimeout.current = null;
        }
    }, []);

    const clearPersonalRecordHideTimeout = useCallback(() => {
        if (personalRecordHideTimeout.current) {
            clearTimeout(personalRecordHideTimeout.current);
            personalRecordHideTimeout.current = null;
        }
    }, []);

    const showWeightPointer = useCallback(() => {
        clearWeightHideTimeout();
        weightPointerOpacity.stopAnimation();
        Animated.timing(weightPointerOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
        }).start();
    }, [clearWeightHideTimeout, weightPointerOpacity]);

    const showVolumePointer = useCallback(() => {
        clearVolumeHideTimeout();
        volumePointerOpacity.stopAnimation();
        Animated.timing(volumePointerOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
        }).start();
    }, [clearVolumeHideTimeout, volumePointerOpacity]);

    const showRepsPointer = useCallback(() => {
        clearRepsHideTimeout();
        repsPointerOpacity.stopAnimation();
        Animated.timing(repsPointerOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
        }).start();
    }, [clearRepsHideTimeout, repsPointerOpacity]);

    const showPersonalRecordPointer = useCallback(() => {
        clearPersonalRecordHideTimeout();
        personalRecordPointerOpacity.stopAnimation();
        Animated.timing(personalRecordPointerOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
        }).start();
    }, [clearPersonalRecordHideTimeout, personalRecordPointerOpacity]);

    const scheduleWeightHide = useCallback(() => {
        clearWeightHideTimeout();
        if (activeIndexRef.current == null) {
            return;
        }
        weightHideTimeout.current = setTimeout(() => {
            weightPointerOpacity.stopAnimation();
            Animated.timing(weightPointerOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start(() => {
                activeIndexRef.current = null;
                setActiveIndex(null);
            });
            weightHideTimeout.current = null;
        }, 2000);
    }, [clearWeightHideTimeout, weightPointerOpacity]);

    const scheduleVolumeHide = useCallback(() => {
        clearVolumeHideTimeout();
        if (volumeActiveIndexRef.current == null) {
            return;
        }
        volumeHideTimeout.current = setTimeout(() => {
            volumePointerOpacity.stopAnimation();
            Animated.timing(volumePointerOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start(() => {
                volumeActiveIndexRef.current = null;
                setVolumeActiveIndex(null);
            });
            volumeHideTimeout.current = null;
        }, 2000);
    }, [clearVolumeHideTimeout, volumePointerOpacity]);

    const scheduleRepsHide = useCallback(() => {
        clearRepsHideTimeout();
        if (repsActiveIndexRef.current == null) {
            return;
        }
        repsHideTimeout.current = setTimeout(() => {
            repsPointerOpacity.stopAnimation();
            Animated.timing(repsPointerOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start(() => {
                repsActiveIndexRef.current = null;
                setRepsActiveIndex(null);
            });
            repsHideTimeout.current = null;
        }, 2000);
    }, [clearRepsHideTimeout, repsPointerOpacity]);

    const schedulePersonalRecordHide = useCallback(() => {
        clearPersonalRecordHideTimeout();
        if (personalRecordActiveIndexRef.current == null) {
            return;
        }
        personalRecordHideTimeout.current = setTimeout(() => {
            personalRecordPointerOpacity.stopAnimation();
            Animated.timing(personalRecordPointerOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start(() => {
                personalRecordActiveIndexRef.current = null;
                setPersonalRecordActiveIndex(null);
            });
            personalRecordHideTimeout.current = null;
        }, 2000);
    }, [clearPersonalRecordHideTimeout, personalRecordPointerOpacity]);

    const handlePointerActivate = useCallback(
        (payload) => {
            if (!payload) return;
            const { index } = payload;
            if (!Number.isFinite(index)) return;
            activeIndexRef.current = index;
            setActiveIndex((prev) => (prev === index ? prev : index));
            showWeightPointer();
        },
        [showWeightPointer]
    );

    const weightChartPoints = weightSeries.points;
    const volumeChartPoints = volumeSeries.points;
    const repsChartPoints = repsSeries.points;
    const personalRecordChartPoints = personalRecordSeries.points;

    const handleChartTouch = useCallback(
        (nativeEvent) => {
            if (!nativeEvent || !weightChartPoints.length) return;
            const { locationX } = nativeEvent;
            if (!Number.isFinite(locationX)) return;

            const minX = chartLeftMargin;
            const maxX = chartLeftMargin + chartInnerWidth;
            const clampedX = Math.max(minX, Math.min(maxX, locationX));

            let closestIndex = 0;
            let smallestDistance = Math.abs(weightChartPoints[0].x - clampedX);

            for (let i = 1; i < weightChartPoints.length; i += 1) {
                const point = weightChartPoints[i];
                const distance = Math.abs(point.x - clampedX);
                if (distance < smallestDistance) {
                    smallestDistance = distance;
                    closestIndex = i;
                }
            }

            handlePointerActivate({ index: closestIndex });
        },
        [weightChartPoints, chartLeftMargin, chartInnerWidth, handlePointerActivate]
    );

    const chartPanResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => !!weightChartPoints.length,
                onMoveShouldSetPanResponder: () => !!weightChartPoints.length,
                onPanResponderGrant: (evt) => handleChartTouch(evt?.nativeEvent),
                onPanResponderMove: (evt) => handleChartTouch(evt?.nativeEvent),
                onPanResponderRelease: () => scheduleWeightHide(),
                onPanResponderTerminate: () => scheduleWeightHide(),
            }),
        [weightChartPoints.length, handleChartTouch, scheduleWeightHide]
    );

    const handleVolumePointerActivate = useCallback(
        (payload) => {
            if (!payload) return;
            const { index } = payload;
            if (!Number.isFinite(index)) return;
            volumeActiveIndexRef.current = index;
            setVolumeActiveIndex((prev) => (prev === index ? prev : index));
            showVolumePointer();
        },
        [showVolumePointer]
    );

    const handleVolumeChartTouch = useCallback(
        (nativeEvent) => {
            if (!nativeEvent || !volumeChartPoints.length) return;
            const { locationX } = nativeEvent;
            if (!Number.isFinite(locationX)) return;

            const minX = chartLeftMargin;
            const maxX = chartLeftMargin + chartInnerWidth;
            const clampedX = Math.max(minX, Math.min(maxX, locationX));

            let closestIndex = 0;
            let smallestDistance = Math.abs(volumeChartPoints[0].x - clampedX);

            for (let i = 1; i < volumeChartPoints.length; i += 1) {
                const point = volumeChartPoints[i];
                const distance = Math.abs(point.x - clampedX);
                if (distance < smallestDistance) {
                    smallestDistance = distance;
                    closestIndex = i;
                }
            }

            handleVolumePointerActivate({ index: closestIndex });
        },
        [volumeChartPoints, chartLeftMargin, chartInnerWidth, handleVolumePointerActivate]
    );

    const volumePanResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => !!volumeChartPoints.length,
                onMoveShouldSetPanResponder: () => !!volumeChartPoints.length,
                onPanResponderGrant: (evt) => handleVolumeChartTouch(evt?.nativeEvent),
                onPanResponderMove: (evt) => handleVolumeChartTouch(evt?.nativeEvent),
                onPanResponderRelease: () => scheduleVolumeHide(),
                onPanResponderTerminate: () => scheduleVolumeHide(),
            }),
        [volumeChartPoints.length, handleVolumeChartTouch, scheduleVolumeHide]
    );

    const handleRepsPointerActivate = useCallback(
        (payload) => {
            if (!payload) return;
            const { index } = payload;
            if (!Number.isFinite(index)) return;
            repsActiveIndexRef.current = index;
            setRepsActiveIndex((prev) => (prev === index ? prev : index));
            showRepsPointer();
        },
        [showRepsPointer]
    );

    const handleRepsChartTouch = useCallback(
        (nativeEvent) => {
            if (!nativeEvent || !repsChartPoints.length) return;
            const { locationX } = nativeEvent;
            if (!Number.isFinite(locationX)) return;

            const minX = chartLeftMargin;
            const maxX = chartLeftMargin + chartInnerWidth;
            const clampedX = Math.max(minX, Math.min(maxX, locationX));

            let closestIndex = 0;
            let smallestDistance = Math.abs(repsChartPoints[0].x - clampedX);

            for (let i = 1; i < repsChartPoints.length; i += 1) {
                const point = repsChartPoints[i];
                const distance = Math.abs(point.x - clampedX);
                if (distance < smallestDistance) {
                    smallestDistance = distance;
                    closestIndex = i;
                }
            }

            handleRepsPointerActivate({ index: closestIndex });
        },
        [repsChartPoints, chartLeftMargin, chartInnerWidth, handleRepsPointerActivate]
    );

    const handlePersonalRecordPointerActivate = useCallback(
        (payload) => {
            if (!payload) return;
            const { index } = payload;
            if (!Number.isFinite(index)) return;
            personalRecordActiveIndexRef.current = index;
            setPersonalRecordActiveIndex((prev) => (prev === index ? prev : index));
            showPersonalRecordPointer();
        },
        [showPersonalRecordPointer]
    );

    const handlePersonalRecordChartTouch = useCallback(
        (nativeEvent) => {
            if (!nativeEvent || !personalRecordChartPoints.length) return;
            const { locationX } = nativeEvent;
            if (!Number.isFinite(locationX)) return;

            const minX = chartLeftMargin;
            const maxX = chartLeftMargin + chartInnerWidth;
            const clampedX = Math.max(minX, Math.min(maxX, locationX));

            let closestIndex = 0;
            let smallestDistance = Math.abs(personalRecordChartPoints[0].x - clampedX);

            for (let i = 1; i < personalRecordChartPoints.length; i += 1) {
                const point = personalRecordChartPoints[i];
                const distance = Math.abs(point.x - clampedX);
                if (distance < smallestDistance) {
                    smallestDistance = distance;
                    closestIndex = i;
                }
            }

            handlePersonalRecordPointerActivate({ index: closestIndex });
        },
        [personalRecordChartPoints, chartLeftMargin, chartInnerWidth, handlePersonalRecordPointerActivate]
    );

    const repsPanResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => !!repsChartPoints.length,
                onMoveShouldSetPanResponder: () => !!repsChartPoints.length,
                onPanResponderGrant: (evt) => handleRepsChartTouch(evt?.nativeEvent),
                onPanResponderMove: (evt) => handleRepsChartTouch(evt?.nativeEvent),
                onPanResponderRelease: () => scheduleRepsHide(),
                onPanResponderTerminate: () => scheduleRepsHide(),
            }),
        [repsChartPoints.length, handleRepsChartTouch, scheduleRepsHide]
    );

    const personalRecordPanResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => !!personalRecordChartPoints.length,
                onMoveShouldSetPanResponder: () => !!personalRecordChartPoints.length,
                onPanResponderGrant: (evt) => handlePersonalRecordChartTouch(evt?.nativeEvent),
                onPanResponderMove: (evt) => handlePersonalRecordChartTouch(evt?.nativeEvent),
                onPanResponderRelease: () => schedulePersonalRecordHide(),
                onPanResponderTerminate: () => schedulePersonalRecordHide(),
            }),
        [
            personalRecordChartPoints.length,
            handlePersonalRecordChartTouch,
            schedulePersonalRecordHide,
        ]
    );

    const getCurrentSanitizedEntries = useCallback(() => {
        const currentUser = userRef.current;
        return sanitizeEntries(selectWeightEntrySource(currentUser));
    }, []);

    const persistEntries = useCallback(
        async (nextEntriesSanitized) => {
            const currentUser = userRef.current;
            const uid = currentUser?.uid || currentUser?.id;
            if (!uid) {
                Alert.alert("Unable to save", "We couldn't find your account. Please try again later.");
                return false;
            }

            const sanitizedEntries = sanitizeEntries(nextEntriesSanitized);
            const publicWeightFields = derivePublicWeightFields(sanitizedEntries);

            setIsSaving(true);

            try {
                await Promise.all([
                    updateDoc("usersPrivate", uid, {
                        "progress.weightEntries": sanitizedEntries,
                        weightEntries: deleteField(),
                        bodyweightEntries: deleteField(),
                        bodyweightLog: deleteField(),
                    }),
                    updateDoc("usersPublic", uid, publicWeightFields),
                ]);
                return true;
            } catch (error) {
                const message =
                    error?.message ||
                    "Something went wrong while saving your measurement. Please try again.";

                Alert.alert("Unable to save measurement", message);
                return false;
            } finally {
                setIsSaving(false);
            }
        },
        []
    );

    const handleSubmitMeasurement = useCallback(
        async ({ weightInput, dateInput, timeInput }) => {
            if (isSaving) return;

            const weightNumber = Number.parseFloat(String(weightInput).replace(",", "."));
            if (!Number.isFinite(weightNumber) || weightNumber <= 0) {
                Alert.alert("Invalid weight", "Enter a weight greater than 0 to log your measurement.");
                return;
            }

            const trimmedDate = String(dateInput || "").trim();
            const trimmedTime = String(timeInput || "").trim();
            const composed = `${trimmedDate}T${trimmedTime}`;
            const parsed = dayjs(composed);
            if (!parsed.isValid()) {
                Alert.alert(
                    "Invalid date or time",
                    "Use the format YYYY-MM-DD for the date and HH:mm for the time."
                );
                return;
            }

            const recordedAt = parsed.valueOf();
            if (recordedAt > Date.now()) {
                Alert.alert("Invalid date or time", "You can't log a measurement in the future.");
                return;
            }
            const existingEntries = getCurrentSanitizedEntries();
            let nextEntries = existingEntries;

            const safeUnit = (preferredUnit || "lb").toLowerCase().startsWith("k") ? "kg" : "lb";
            const newEntry = {
                id: makeID(),
                weight: Math.round(weightNumber * 10) / 10,
                unit: safeUnit,
                recordedAt,
                createdAt: Date.now(),
            };

            nextEntries = sanitizeEntries([...existingEntries, newEntry]);

            const wasPersisted = await persistEntries(nextEntries);
            if (wasPersisted) {
                setIsModalVisible(false);
            }
        },
        [getCurrentSanitizedEntries, isSaving, persistEntries, preferredUnit]
    );

    const handleOpenAddModal = useCallback(() => {
        setIsModalVisible(true);
    }, []);

    const handleCloseAddModal = useCallback(() => {
        if (isSaving) return;
        setIsModalVisible(false);
    }, [isSaving]);

    const handleNavigateToPastWorkout = useCallback(
        (entry) => {
            if (!entry) return;
            const wid = typeof entry?.wid === "string" && entry.wid.trim() ? entry.wid.trim() : "";
            if (!wid) return;
            const workout = workoutsByWid.get(wid) || null;
            if (!workout) return;

            const sanitizedWorkout = sanitizeWorkoutForRouteShallow({ ...workout, wid });
            if (!sanitizedWorkout) return;
            if (!sanitizedWorkout.wid) sanitizedWorkout.wid = wid;

            const ownerUid = String(userData?.uid || sanitizedWorkout?.creatorUID || sanitizedWorkout?.creatorUid || "");
            const ownerHandle = String(userData?.handle || userData?.username || sanitizedWorkout?.handle || "");
            const ownerName = String(userData?.name || sanitizedWorkout?.ownerName || "");
            const ownerPfp = String(
                userData?.image ||
                userData?.pfp ||
                userData?.photoURL ||
                userData?.photo ||
                ""
            );
            const ownerPfpVersion = Number(userData?.pfpVersion ?? sanitizedWorkout?.pfpVersion ?? 0);

            const params = {
                workout: sanitizedWorkout,
                owner: {
                    uid: ownerUid,
                    handle: ownerHandle,
                    name: ownerName,
                    pfp: ownerPfp,
                    pfpVersion: ownerPfpVersion,
                    rankTier: userData?.rankTier ?? userData?.currentRank?.tier ?? userData?.currentRank?.rankTier ?? userData?.rank?.tier ?? userData?.rank?.rankTier ?? sanitizedWorkout?.rankTier ?? sanitizedWorkout?.currentRank?.tier ?? sanitizedWorkout?.currentRank?.rankTier ?? sanitizedWorkout?.rank?.tier ?? sanitizedWorkout?.rank?.rankTier ?? null,
                    currentRank: userData?.currentRank || sanitizedWorkout?.currentRank || null,
                    rank: userData?.rank || sanitizedWorkout?.rank || null,
                },
            };

            if (!navigateOneWay("PastWorkout", { animation: "slide-from-right", params })) {
                navigation.navigate("PastWorkout", params);
            }
        },
        [navigation, userData, workoutsByWid]
    );

    const handleMusclePress = useCallback(
        (muscle) => {
            if (!muscle) return;
            const params = {
                muscleKey: muscle.key,
                muscleLabel: muscle.label,
                muscleSegments: muscle.segments,
                iconScale: muscle.iconScale,
                iconOffset: muscle.iconOffset,
                iconStrokeWidth: muscle.iconStrokeWidth,
            };
            if (!navigateOneWay("MuscleGroupExercises", { animation: "slide-from-right", params })) {
                navigation.navigate("MuscleGroupExercises", params);
            }
        },
        [navigation]
    );

    const hasChartData = chartData.length > 0;
    const hasVolumeChartData = volumeChartData.length > 0;
    const hasRepsChartData = repsChartData.length > 0;
    const hasPersonalRecordChartData = personalRecordEntries.length > 0;
    const [activeMetricKey, setActiveMetricKey] = useState(() => {
        if (hasVolumeChartData) return "volume";
        if (hasRepsChartData) return "reps";
        if (hasPersonalRecordChartData) return "personalRecords";
        return "volume";
    });
    const metricTabs = useMemo(
        () => [
            { key: "volume", label: "Volume", icon: "bar-chart-outline", hasData: hasVolumeChartData },
            { key: "reps", label: "Reps", icon: "stats-chart-outline", hasData: hasRepsChartData },
            { key: "personalRecords", label: "PRs", icon: "trophy-outline", hasData: hasPersonalRecordChartData },
        ],
        [hasPersonalRecordChartData, hasRepsChartData, hasVolumeChartData]
    );

    const weightActivePoint = activeIndex != null ? weightChartPoints[activeIndex] : null;
    const weightActiveEntry = activeIndex != null ? chartData[activeIndex]?.entry : null;
    const weightActiveDelta = activeIndex != null ? chartData[activeIndex]?.delta : null;
    const pointerLabelWidth = scaleSize(184);
    const pointerLabelLeft = useMemo(() => {
        if (!weightActivePoint) return chartLeftMargin;
        const minLeft = chartLeftMargin;
        const maxLeft = chartPlotWidth - chartRightMargin;
        const centered = weightActivePoint.x - pointerLabelWidth / 2;
        const clamped = Math.max(minLeft, Math.min(centered, maxLeft - pointerLabelWidth));
        return clamped;
    }, [weightActivePoint, chartLeftMargin, chartPlotWidth, chartRightMargin, pointerLabelWidth]);
    const isPointerRightAligned = activeIndex != null ? activeIndex >= Math.ceil(chartData.length / 2) : false;
    const volumeActivePoint = volumeActiveIndex != null ? volumeChartPoints[volumeActiveIndex] : null;
    const volumeActiveEntry = volumeActiveIndex != null ? volumeChartData[volumeActiveIndex]?.entry : null;
    const volumePointerLabelWidth = scaleSize(184);
    const volumePointerLabelLeft = useMemo(() => {
        if (!volumeActivePoint) return chartLeftMargin;
        const minLeft = chartLeftMargin;
        const maxLeft = chartPlotWidth - chartRightMargin;
        const centered = volumeActivePoint.x - volumePointerLabelWidth / 2;
        const clamped = Math.max(minLeft, Math.min(centered, maxLeft - volumePointerLabelWidth));
        return clamped;
    }, [volumeActivePoint, chartLeftMargin, chartPlotWidth, chartRightMargin, volumePointerLabelWidth]);
    const volumePointerRightAligned = volumeActiveIndex != null
        ? volumeActiveIndex >= Math.ceil(volumeChartData.length / 2)
        : false;
    const repsActivePoint = repsActiveIndex != null ? repsChartPoints[repsActiveIndex] : null;
    const repsActiveEntry = repsActiveIndex != null ? repsChartData[repsActiveIndex]?.entry : null;
    const repsPointerLabelWidth = scaleSize(184);
    const repsPointerLabelLeft = useMemo(() => {
        if (!repsActivePoint) return chartLeftMargin;
        const minLeft = chartLeftMargin;
        const maxLeft = chartPlotWidth - chartRightMargin;
        const centered = repsActivePoint.x - repsPointerLabelWidth / 2;
        const clamped = Math.max(minLeft, Math.min(centered, maxLeft - repsPointerLabelWidth));
        return clamped;
    }, [repsActivePoint, chartLeftMargin, chartPlotWidth, chartRightMargin, repsPointerLabelWidth]);
    const repsPointerRightAligned = repsActiveIndex != null
        ? repsActiveIndex >= Math.ceil(repsChartData.length / 2)
        : false;

    const personalRecordActivePoint =
        personalRecordActiveIndex != null
            ? personalRecordChartPoints[personalRecordActiveIndex]
            : null;
    const personalRecordActiveEntry = personalRecordActiveIndex != null
        ? personalRecordEntries[personalRecordActiveIndex] || null
        : null;
    const personalRecordPointerLabelWidth = scaleSize(184);
    const personalRecordPointerLabelLeft = useMemo(() => {
        if (!personalRecordActivePoint) return chartLeftMargin;
        const minLeft = chartLeftMargin;
        const maxLeft = chartPlotWidth - chartRightMargin;
        const centered = personalRecordActivePoint.x - personalRecordPointerLabelWidth / 2;
        const clamped = Math.max(minLeft, Math.min(centered, maxLeft - personalRecordPointerLabelWidth));
        return clamped;
    }, [
        personalRecordActivePoint,
        chartLeftMargin,
        chartPlotWidth,
        chartRightMargin,
        personalRecordPointerLabelWidth,
    ]);
    const personalRecordPointerRightAligned = personalRecordActiveIndex != null
        ? personalRecordActiveIndex >= Math.ceil(personalRecordEntries.length / 2)
        : false;

    const muscleFills = useMemo(
        () => buildMuscleFillMap(userData?.statsHexagon, MUSCLE_SEGMENTS),
        [userData?.statsHexagon]
    );

    const muscleGroupScores = useMemo(() => {
        const hex = userData?.statsHexagon || {};
        const groups = [
            { key: "chest", label: "Chest" },
            { key: "shoulders", label: "Shoulders" },
            { key: "arms", label: "Arms" },
            { key: "back", label: "Back" },
            { key: "legs", label: "Legs" },
            { key: "abs", label: "Abs" },
            { key: "overall", label: "Overall", segments: OVERALL_MUSCLE_SEGMENTS },
        ];
        const resolveHexValue = (key) => {
            const candidates = [hex[key], hex[String(key || "").toLowerCase()]];
            for (let i = 0; i < candidates.length; i += 1) {
                const value = Number(candidates[i]);
                if (Number.isFinite(value)) return value;
            }
            return null;
        };
        return groups.map((group) => {
            const raw = resolveHexValue(group.key);
            const display = Number.isFinite(raw) ? formatHexStat(raw) : "--";
            const segments = group.segments || MUSCLE_SEGMENTS[group.key] || [];
            const iconStrokeWidth = MUSCLE_ICON_STROKE_WIDTHS[group.key] || null;
            return {
                ...group,
                display,
                segments,
                // Scaling is applied through the SVG render itself (keeps strokes crisp) instead of view transforms.
                iconScale: MUSCLE_ICON_SCALES[group.key] || 1,
                iconOffset: scaleSize(MUSCLE_ICON_OFFSETS[group.key] || 0),
                iconStrokeWidth,
            };
        });
    }, [userData?.statsHexagon]);

    const overallHexDisplay = useMemo(() => {
        const overall = muscleGroupScores.find((item) => item.key === "overall");
        return overall?.display || "--";
    }, [muscleGroupScores]);

    useEffect(() => {
        if (hasChartData) return;
        clearWeightHideTimeout();
        Animated.timing(weightPointerOpacity, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
        }).start();
        if (activeIndexRef.current != null) {
            activeIndexRef.current = null;
            setActiveIndex(null);
        }
    }, [hasChartData, clearWeightHideTimeout, weightPointerOpacity]);

    useEffect(() => {
        if (hasVolumeChartData) return;
        clearVolumeHideTimeout();
        Animated.timing(volumePointerOpacity, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
        }).start();
        if (volumeActiveIndexRef.current != null) {
            volumeActiveIndexRef.current = null;
            setVolumeActiveIndex(null);
        }
    }, [hasVolumeChartData, clearVolumeHideTimeout, volumePointerOpacity]);

    useEffect(() => {
        if (hasRepsChartData) return;
        clearRepsHideTimeout();
        Animated.timing(repsPointerOpacity, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
        }).start();
        if (repsActiveIndexRef.current != null) {
            repsActiveIndexRef.current = null;
            setRepsActiveIndex(null);
        }
    }, [hasRepsChartData, clearRepsHideTimeout, repsPointerOpacity]);

    useEffect(() => {
        if (hasPersonalRecordChartData) return;
        clearPersonalRecordHideTimeout();
        Animated.timing(personalRecordPointerOpacity, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
        }).start();
        if (personalRecordActiveIndexRef.current != null) {
            personalRecordActiveIndexRef.current = null;
            setPersonalRecordActiveIndex(null);
        }
    }, [
        hasPersonalRecordChartData,
        clearPersonalRecordHideTimeout,
        personalRecordPointerOpacity,
    ]);

    useEffect(
        () => () => {
            clearWeightHideTimeout();
            clearVolumeHideTimeout();
            clearRepsHideTimeout();
            clearPersonalRecordHideTimeout();
        },
        [clearWeightHideTimeout, clearVolumeHideTimeout, clearRepsHideTimeout, clearPersonalRecordHideTimeout]
    );

    useEffect(() => {
        if (!scrollSignal) return;
        const ref = scrollRef.current;
        if (!ref) return;
        const timeout = setTimeout(() => {
            try {
                ref.scrollToEnd({ animated: true });
            } catch {
                // ignore scroll errors
            }
        }, 120);
        return () => clearTimeout(timeout);
    }, [scrollSignal]);

    const handleScrollEvent = useCallback(
        (event) => {
            if (typeof onScroll === "function") {
                onScroll(event);
            }
        },
        [onScroll]
    );

    return (
        <>
            <ScrollView
                ref={scrollRef}
                style={styles.scroll}
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
                onScroll={handleScrollEvent}
                scrollEventThrottle={16}
            >
                <View style={styles.contentSurface}>
                    <BodyOverviewPager
                        completedWorkoutsCount={completedWorkoutsCount}
                        completedWorkoutsCountLabel={completedWorkoutsCountLabel}
                        overallHexDisplay={overallHexDisplay}
                        muscleFills={muscleFills}
                        statsHexagon={userData?.statsHexagon || {}}
                    />
                    <MuscleGroupList items={muscleGroupScores} onPress={handleMusclePress} />
                    <View style={styles.chartDivider} />
                    {activeMetricKey === "volume" ? (
                        <View
                            style={[
                                chartCardLayout.card,
                                styles.card,
                                styles.volumeCard,
                            ]}
                        >
                            <View
                                style={[
                                    chartCardLayout.header,
                                    styles.header,
                                ]}
                            >
                                <Text style={[chartCardTypography.sectionTitle, styles.sectionTitle]}>Total Volume</Text>
                                <View style={styles.headerActions}>
                                    <View style={styles.autoUpdateHintWrapper}>
                                        <Text style={[chartCardTypography.hint, styles.autoUpdateHint]}>Auto-updates from</Text>
                                        <Text style={[chartCardTypography.hint, styles.autoUpdateHint]}>completed workouts.</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={[chartCardLayout.metricsRow, styles.metricsRow]}>
                                <View style={[chartCardLayout.valueGroup, styles.weightGroup]}>
                                    <Text style={chartCardTypography.metricValue}>{latestVolumeText}</Text>
                                    <Text style={[chartCardTypography.metricUnit, styles.weightUnit]}>{latestVolumeUnit}</Text>
                                    {latestVolumeDeltaMeta ? (
                                        <View style={[chartCardLayout.deltaGroup, styles.deltaGroup]}>
                                            <Ionicons
                                                name={latestVolumeDeltaMeta.icon}
                                                size={scaleSize(17)}
                                                color={latestVolumeDeltaMeta.color}
                                                style={styles.deltaIcon}
                                            />
                                            <Text
                                                style={[
                                                    chartCardTypography.deltaValue,
                                                    { color: latestVolumeDeltaMeta.color },
                                                ]}
                                            >
                                                {latestVolumeDeltaMeta.text}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>
                                <Text style={[chartCardTypography.summary, styles.summaryText]}>{latestVolumeInfo}</Text>
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
                                {hasVolumeChartData ? (
                                    <View style={styles.chartContent}>
                                        <View
                                            style={[
                                                styles.yAxisLabelsContainer,
                                                { width: yAxisLabelWidth, height: chartHeight },
                                            ]}
                                            pointerEvents="none"
                                        >
                                            {volumeYTickValues.map((value, index) => {
                                                const range = Math.max(
                                                    (volumeAxisMetrics?.maxValue ?? 0) -
                                                    (volumeAxisMetrics?.minValue ?? 0),
                                                    1
                                                );
                                                const ratio = (value - (volumeAxisMetrics?.minValue ?? 0)) / range;
                                                const clampedRatio = Number.isFinite(ratio)
                                                    ? Math.min(Math.max(ratio, 0), 1)
                                                    : 0;
                                                const yPosition =
                                                    chartTopMargin + chartInnerHeight * (1 - clampedRatio);
                                                const approxLabelHeight = scaleSize(14);
                                                const top = Math.min(
                                                    chartHeight - chartBottomMargin - approxLabelHeight,
                                                    Math.max(
                                                        chartTopMargin - approxLabelHeight / 2,
                                                        yPosition - approxLabelHeight / 2
                                                    )
                                                );

                                                return (
                                                    <Text
                                                        key={`volume-y-axis-label-${value}-${index}`}
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

                                        <View
                                            style={[
                                                styles.chartCanvas,
                                                { width: chartPlotWidth, height: chartHeight },
                                            ]}
                                            {...volumePanResponder.panHandlers}
                                        >
                                            <Svg width={chartPlotWidth} height={chartHeight}>
                                                <Defs>
                                                    <LinearGradient
                                                        id="volumeChartGradient"
                                                        x1="0"
                                                        y1="0"
                                                        x2="0"
                                                        y2="1"
                                                    >
                                                        <Stop
                                                            offset="0%"
                                                            stopColor={METRIC_COLORS.volume.line}
                                                            stopOpacity={0.3}
                                                        />
                                                        <Stop
                                                            offset="100%"
                                                            stopColor={METRIC_COLORS.volume.line}
                                                            stopOpacity={0.08}
                                                        />
                                                    </LinearGradient>
                                                </Defs>

                                                {volumeYTickValues.map((value, index) => {
                                                    const range = Math.max(
                                                        (volumeAxisMetrics?.maxValue ?? 0) -
                                                        (volumeAxisMetrics?.minValue ?? 0),
                                                        1
                                                    );
                                                    const ratio = (value - (volumeAxisMetrics?.minValue ?? 0)) / range;
                                                    const clampedRatio = Number.isFinite(ratio)
                                                        ? Math.min(Math.max(ratio, 0), 1)
                                                        : 0;
                                                    const y =
                                                        chartTopMargin + chartInnerHeight * (1 - clampedRatio);
                                                    return (
                                                        <Line
                                                            key={`volume-grid-line-${value}-${index}`}
                                                            x1={chartLeftMargin}
                                                            y1={y}
                                                            x2={chartPlotWidth - chartRightMargin}
                                                            y2={y}
                                                            stroke="rgba(255,255,255,0.1)"
                                                            strokeWidth={StyleSheet.hairlineWidth}
                                                            strokeDasharray={[6, 6]}
                                                        />
                                                    );
                                                })}

                                                {volumeSeries.areaPath ? (
                                                    <Path
                                                        d={volumeSeries.areaPath}
                                                        fill="url(#volumeChartGradient)"
                                                        stroke="none"
                                                    />
                                                ) : null}

                                                {volumeSeries.linePath ? (
                                                    <Path
                                                        d={volumeSeries.linePath}
                                                        fill="none"
                                                        stroke={METRIC_COLORS.volume.line}
                                                        strokeWidth={scaleSize(3)}
                                                        strokeLinejoin="round"
                                                        strokeLinecap="round"
                                                    />
                                                ) : null}

                                                <Line
                                                    x1={chartLeftMargin}
                                                    y1={chartTopMargin}
                                                    x2={chartLeftMargin}
                                                    y2={chartBaselineY}
                                                    stroke="rgba(148, 157, 172, 0.35)"
                                                    strokeWidth={StyleSheet.hairlineWidth}
                                                />
                                                <Line
                                                    x1={chartLeftMargin}
                                                    y1={chartBaselineY}
                                                    x2={chartPlotWidth - chartRightMargin}
                                                    y2={chartBaselineY}
                                                    stroke="rgba(148, 157, 172, 0.35)"
                                                    strokeWidth={StyleSheet.hairlineWidth}
                                                />

                                                {volumeActivePoint ? (
                                                    <Line
                                                        x1={volumeActivePoint.x}
                                                        y1={chartTopMargin}
                                                        x2={volumeActivePoint.x}
                                                        y2={chartBaselineY}
                                                        stroke={METRIC_COLORS.volume.strip}
                                                        strokeWidth={pointerStripWidth}
                                                    />
                                                ) : null}

                                                {volumeChartPoints.map((point, index) => (
                                                    <ChartBubble
                                                        key={point.entry?.id || `volume-point-${index}`}
                                                        cx={point.x}
                                                        cy={point.y}
                                                        isActive={index === volumeActiveIndex}
                                                        accent={CHART_ACCENTS.volume}
                                                    />
                                                ))}
                                            </Svg>

                                            {volumeXAxisLabels.length ? (
                                                <View
                                                    pointerEvents="none"
                                                    style={[
                                                        styles.xAxisLabelsOverlay,
                                                        {
                                                            left: chartLeftMargin,
                                                            right: chartRightMargin,
                                                            justifyContent:
                                                                volumeXAxisLabels.length > 1
                                                                    ? "space-between"
                                                                    : "center",
                                                        },
                                                    ]}
                                                >
                                                    {volumeXAxisLabels.map((item, index) => (
                                                        <Text
                                                            key={`volume-x-axis-label-${item.timestamp ?? index}-${index}`}
                                                            style={[chartTypography.axisLabel, styles.xAxisLabel]}
                                                        >
                                                            {item.label}
                                                        </Text>
                                                    ))}
                                                </View>
                                            ) : null}

                                            {volumeActiveEntry ? (
                                                <Animated.View
                                                    pointerEvents="box-none"
                                                    style={[
                                                        chartPointerStyles.container,
                                                        {
                                                            left: volumePointerLabelLeft,
                                                            top: Math.max(
                                                                scaleSize(-8),
                                                                chartTopMargin - scaleSize(72)
                                                            ),
                                                            width: volumePointerLabelWidth,
                                                            opacity: volumePointerOpacity,
                                                        },
                                                    ]}
                                                >
                                                    <VolumePointerLabel
                                                        entry={volumeActiveEntry}
                                                        unit={displayVolumeUnit}
                                                        isRightAligned={volumePointerRightAligned}
                                                        onWorkoutPress={handleNavigateToPastWorkout}
                                                    />
                                                </Animated.View>
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
                                <MetricToggleRow
                                    tabs={metricTabs}
                                    activeKey={activeMetricKey}
                                    onSelect={setActiveMetricKey}
                                />
                            </View>
                        </View>
                    ) : null}
                    {activeMetricKey === "reps" ? (
                        <View
                            style={[
                                chartCardLayout.card,
                                styles.card,
                            ]}
                        >
                            <View
                                style={[
                                    chartCardLayout.header,
                                    styles.header,
                                ]}
                            >
                                <Text style={[chartCardTypography.sectionTitle, styles.sectionTitle]}>Total Reps</Text>
                                <View style={styles.headerActions}>
                                    <View style={styles.autoUpdateHintWrapper}>
                                        <Text style={[chartCardTypography.hint, styles.autoUpdateHint]}>Auto-updates from</Text>
                                        <Text style={[chartCardTypography.hint, styles.autoUpdateHint]}>completed workouts.</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={[chartCardLayout.metricsRow, styles.metricsRow]}>
                                <View style={[chartCardLayout.valueGroup, styles.weightGroup]}>
                                    <Text style={chartCardTypography.metricValue}>{latestRepsText}</Text>
                                    <Text style={[chartCardTypography.metricUnit, styles.weightUnit]}>{latestRepsUnit}</Text>
                                    {latestRepsDeltaMeta ? (
                                        <View style={[chartCardLayout.deltaGroup, styles.deltaGroup]}>
                                            <Ionicons
                                                name={latestRepsDeltaMeta.icon}
                                                size={scaleSize(17)}
                                                color={latestRepsDeltaMeta.color}
                                                style={styles.deltaIcon}
                                            />
                                            <Text
                                                style={[
                                                    chartCardTypography.deltaValue,
                                                    { color: latestRepsDeltaMeta.color },
                                                ]}
                                            >
                                                {latestRepsDeltaMeta.text}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>
                                <Text style={[chartCardTypography.summary, styles.summaryText]}>{latestRepsInfo}</Text>
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
                                {hasRepsChartData ? (
                                    <View style={styles.chartContent}>
                                        <View
                                            style={[
                                                styles.yAxisLabelsContainer,
                                                { width: yAxisLabelWidth, height: chartHeight },
                                            ]}
                                            pointerEvents="none"
                                        >
                                            {repsYTickValues.map((value, index) => {
                                                const range = Math.max(
                                                    (repsAxisMetrics?.maxValue ?? 0) -
                                                    (repsAxisMetrics?.minValue ?? 0),
                                                    1
                                                );
                                                const ratio = (value - (repsAxisMetrics?.minValue ?? 0)) / range;
                                                const clampedRatio = Number.isFinite(ratio)
                                                    ? Math.min(Math.max(ratio, 0), 1)
                                                    : 0;
                                                const yPosition =
                                                    chartTopMargin + chartInnerHeight * (1 - clampedRatio);
                                                const approxLabelHeight = scaleSize(14);
                                                const top = Math.min(
                                                    chartHeight - chartBottomMargin - approxLabelHeight,
                                                    Math.max(
                                                        chartTopMargin - approxLabelHeight / 2,
                                                        yPosition - approxLabelHeight / 2
                                                    )
                                                );

                                                return (
                                                    <Text
                                                        key={`reps-y-axis-label-${value}-${index}`}
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

                                        <View
                                            style={[
                                                styles.chartCanvas,
                                                { width: chartPlotWidth, height: chartHeight },
                                            ]}
                                            {...repsPanResponder.panHandlers}
                                        >
                                            <Svg width={chartPlotWidth} height={chartHeight}>
                                                <Defs>
                                                    <LinearGradient
                                                        id="repsChartGradient"
                                                        x1="0"
                                                        y1="0"
                                                        x2="0"
                                                        y2="1"
                                                    >
                                                        <Stop
                                                            offset="0%"
                                                            stopColor={METRIC_COLORS.reps.line}
                                                            stopOpacity={0.3}
                                                        />
                                                        <Stop
                                                            offset="100%"
                                                            stopColor={METRIC_COLORS.reps.line}
                                                            stopOpacity={0.08}
                                                        />
                                                    </LinearGradient>
                                                </Defs>

                                                {repsYTickValues.map((value, index) => {
                                                    const range = Math.max(
                                                        (repsAxisMetrics?.maxValue ?? 0) -
                                                        (repsAxisMetrics?.minValue ?? 0),
                                                        1
                                                    );
                                                    const ratio = (value - (repsAxisMetrics?.minValue ?? 0)) / range;
                                                    const clampedRatio = Number.isFinite(ratio)
                                                        ? Math.min(Math.max(ratio, 0), 1)
                                                        : 0;
                                                    const y =
                                                        chartTopMargin + chartInnerHeight * (1 - clampedRatio);
                                                    return (
                                                        <Line
                                                            key={`reps-grid-line-${value}-${index}`}
                                                            x1={chartLeftMargin}
                                                            y1={y}
                                                            x2={chartPlotWidth - chartRightMargin}
                                                            y2={y}
                                                            stroke="rgba(255,255,255,0.1)"
                                                            strokeWidth={StyleSheet.hairlineWidth}
                                                            strokeDasharray={[6, 6]}
                                                        />
                                                    );
                                                })}

                                                {repsSeries.areaPath ? (
                                                    <Path
                                                        d={repsSeries.areaPath}
                                                        fill="url(#repsChartGradient)"
                                                        stroke="none"
                                                    />
                                                ) : null}

                                                {repsSeries.linePath ? (
                                                    <Path
                                                        d={repsSeries.linePath}
                                                        fill="none"
                                                        stroke={METRIC_COLORS.reps.line}
                                                        strokeWidth={scaleSize(3)}
                                                        strokeLinejoin="round"
                                                        strokeLinecap="round"
                                                    />
                                                ) : null}

                                                <Line
                                                    x1={chartLeftMargin}
                                                    y1={chartTopMargin}
                                                    x2={chartLeftMargin}
                                                    y2={chartBaselineY}
                                                    stroke="rgba(148, 157, 172, 0.35)"
                                                    strokeWidth={StyleSheet.hairlineWidth}
                                                />
                                                <Line
                                                    x1={chartLeftMargin}
                                                    y1={chartBaselineY}
                                                    x2={chartPlotWidth - chartRightMargin}
                                                    y2={chartBaselineY}
                                                    stroke="rgba(148, 157, 172, 0.35)"
                                                    strokeWidth={StyleSheet.hairlineWidth}
                                                />

                                                {repsActivePoint ? (
                                                    <Line
                                                        x1={repsActivePoint.x}
                                                        y1={chartTopMargin}
                                                        x2={repsActivePoint.x}
                                                        y2={chartBaselineY}
                                                        stroke={METRIC_COLORS.reps.strip}
                                                        strokeWidth={pointerStripWidth}
                                                    />
                                                ) : null}

                                                {repsChartPoints.map((point, index) => (
                                                    <ChartBubble
                                                        key={point.entry?.id || `reps-point-${index}`}
                                                        cx={point.x}
                                                        cy={point.y}
                                                        isActive={index === repsActiveIndex}
                                                        accent={CHART_ACCENTS.reps}
                                                    />
                                                ))}
                                            </Svg>

                                            {repsXAxisLabels.length ? (
                                                <View
                                                    pointerEvents="none"
                                                    style={[
                                                        styles.xAxisLabelsOverlay,
                                                        {
                                                            left: chartLeftMargin,
                                                            right: chartRightMargin,
                                                            justifyContent:
                                                                repsXAxisLabels.length > 1
                                                                    ? "space-between"
                                                                    : "center",
                                                        },
                                                    ]}
                                                >
                                                    {repsXAxisLabels.map((item, index) => (
                                                        <Text
                                                            key={`reps-x-axis-label-${item.timestamp ?? index}-${index}`}
                                                            style={[chartTypography.axisLabel, styles.xAxisLabel]}
                                                        >
                                                            {item.label}
                                                        </Text>
                                                    ))}
                                                </View>
                                            ) : null}

                                            {repsActiveEntry ? (
                                                <Animated.View
                                                    pointerEvents="box-none"
                                                    style={[
                                                        chartPointerStyles.container,
                                                        {
                                                            left: repsPointerLabelLeft,
                                                            top: Math.max(
                                                                scaleSize(-8),
                                                                chartTopMargin - scaleSize(72)
                                                            ),
                                                            width: repsPointerLabelWidth,
                                                            opacity: repsPointerOpacity,
                                                        },
                                                    ]}
                                                >
                                                    <RepsPointerLabel
                                                        entry={repsActiveEntry}
                                                        isRightAligned={repsPointerRightAligned}
                                                        onWorkoutPress={handleNavigateToPastWorkout}
                                                    />
                                                </Animated.View>
                                            ) : null}
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.chartEmptyState}>
                                        <Text style={styles.placeholderText}>Complete workouts to log reps.</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.metricToggleRowContainer}>
                                <MetricToggleRow
                                    tabs={metricTabs}
                                    activeKey={activeMetricKey}
                                    onSelect={setActiveMetricKey}
                                />
                            </View>
                        </View>
                    ) : null}

                    {activeMetricKey === "personalRecords" ? (
                        <View
                            style={[
                                chartCardLayout.card,
                                styles.card,
                            ]}
                        >
                            <View
                                style={[
                                    chartCardLayout.header,
                                    styles.header,
                                ]}
                            >
                                <Text style={[chartCardTypography.sectionTitle, styles.sectionTitle]}>
                                    Total Personal Records
                                </Text>
                                <View style={styles.headerActions}>
                                    <View style={styles.autoUpdateHintWrapper}>
                                        <Text style={[chartCardTypography.hint, styles.autoUpdateHint]}>
                                            Auto-updates when you
                                        </Text>
                                        <Text style={[chartCardTypography.hint, styles.autoUpdateHint]}>
                                            hit new PRs.
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View style={[chartCardLayout.metricsRow, styles.metricsRow]}>
                                <View style={[chartCardLayout.valueGroup, styles.weightGroup]}>
                                    <Text style={chartCardTypography.metricValue}>
                                        {latestPersonalRecordText}
                                    </Text>
                                    <Text style={[chartCardTypography.metricUnit, styles.weightUnit]}>
                                        {latestPersonalRecordUnit}
                                    </Text>
                                    {latestPersonalRecordDeltaMeta ? (
                                        <View style={[chartCardLayout.deltaGroup, styles.deltaGroup]}>
                                            <Ionicons
                                                name={latestPersonalRecordDeltaMeta.icon}
                                                size={scaleSize(17)}
                                                color={latestPersonalRecordDeltaMeta.color}
                                                style={styles.deltaIcon}
                                            />
                                            <Text
                                                style={[
                                                    chartCardTypography.deltaValue,
                                                    { color: latestPersonalRecordDeltaMeta.color },
                                                ]}
                                            >
                                                {latestPersonalRecordDeltaMeta.text}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>
                                <Text style={[chartCardTypography.summary, styles.summaryText]}>
                                    {latestPersonalRecordInfo}
                                </Text>
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
                                {personalRecordChartPoints.length ? (
                                    <View style={styles.chartContent}>
                                        <View
                                            style={[
                                                styles.yAxisLabelsContainer,
                                                { width: yAxisLabelWidth, height: chartHeight },
                                            ]}
                                            pointerEvents="none"
                                        >
                                            {personalRecordYTickValues.map((value, index) => {
                                                const range = Math.max(
                                                    (personalRecordAxisMetrics?.maxValue ?? 0) -
                                                    (personalRecordAxisMetrics?.minValue ?? 0),
                                                    1
                                                );
                                                const ratio =
                                                    (value - (personalRecordAxisMetrics?.minValue ?? 0)) /
                                                    range;
                                                const clampedRatio = Number.isFinite(ratio)
                                                    ? Math.min(Math.max(ratio, 0), 1)
                                                    : 0;
                                                const yPosition =
                                                    chartTopMargin + chartInnerHeight * (1 - clampedRatio);
                                                const approxLabelHeight = scaleSize(14);
                                                const top = Math.min(
                                                    chartHeight - chartBottomMargin - approxLabelHeight,
                                                    Math.max(
                                                        chartTopMargin - approxLabelHeight / 2,
                                                        yPosition - approxLabelHeight / 2
                                                    )
                                                );

                                                return (
                                                    <Text
                                                        key={`personal-record-y-axis-label-${value}-${index}`}
                                                        style={[chartTypography.axisLabel, styles.yAxisLabel, { top }]}
                                                    >
                                                        {formatAxisValue(value)}
                                                    </Text>
                                                );
                                            })}
                                        </View>

                                        <View
                                            style={[
                                                styles.chartCanvas,
                                                { width: chartPlotWidth, height: chartHeight },
                                            ]}
                                            {...personalRecordPanResponder.panHandlers}
                                        >
                                            <Svg width={chartPlotWidth} height={chartHeight}>
                                                <Defs>
                                                    <LinearGradient
                                                        id="totalPersonalRecordsGradient"
                                                        x1="0"
                                                        y1="0"
                                                        x2="0"
                                                        y2="1"
                                                    >
                                                        <Stop
                                                            offset="0%"
                                                            stopColor={METRIC_COLORS.personalRecords.line}
                                                            stopOpacity={0.3}
                                                        />
                                                        <Stop
                                                            offset="100%"
                                                            stopColor={METRIC_COLORS.personalRecords.line}
                                                            stopOpacity={0.08}
                                                        />
                                                    </LinearGradient>
                                                </Defs>

                                                {personalRecordYTickValues.map((value, index) => {
                                                    const range = Math.max(
                                                        (personalRecordAxisMetrics?.maxValue ?? 0) -
                                                        (personalRecordAxisMetrics?.minValue ?? 0),
                                                        1
                                                    );
                                                    const ratio =
                                                        (value - (personalRecordAxisMetrics?.minValue ?? 0)) /
                                                        range;
                                                    const clampedRatio = Number.isFinite(ratio)
                                                        ? Math.min(Math.max(ratio, 0), 1)
                                                        : 0;
                                                    const y =
                                                        chartTopMargin + chartInnerHeight * (1 - clampedRatio);
                                                    return (
                                                        <Line
                                                            key={`personal-record-grid-${value}-${index}`}
                                                            x1={chartLeftMargin}
                                                            y1={y}
                                                            x2={chartPlotWidth - chartRightMargin}
                                                            y2={y}
                                                            stroke="rgba(255,255,255,0.1)"
                                                            strokeWidth={StyleSheet.hairlineWidth}
                                                            strokeDasharray={[6, 6]}
                                                        />
                                                    );
                                                })}

                                                {personalRecordSeries.areaPath ? (
                                                    <Path
                                                        d={personalRecordSeries.areaPath}
                                                        fill="url(#totalPersonalRecordsGradient)"
                                                        stroke="none"
                                                    />
                                                ) : null}

                                                {personalRecordSeries.linePath ? (
                                                    <Path
                                                        d={personalRecordSeries.linePath}
                                                        fill="none"
                                                        stroke={METRIC_COLORS.personalRecords.line}
                                                        strokeWidth={scaleSize(3)}
                                                        strokeLinejoin="round"
                                                        strokeLinecap="round"
                                                    />
                                                ) : null}

                                                <Line
                                                    x1={chartLeftMargin}
                                                    y1={chartTopMargin}
                                                    x2={chartLeftMargin}
                                                    y2={chartBaselineY}
                                                    stroke="rgba(148, 157, 172, 0.35)"
                                                    strokeWidth={StyleSheet.hairlineWidth}
                                                />
                                                <Line
                                                    x1={chartLeftMargin}
                                                    y1={chartBaselineY}
                                                    x2={chartPlotWidth - chartRightMargin}
                                                    y2={chartBaselineY}
                                                    stroke="rgba(148, 157, 172, 0.35)"
                                                    strokeWidth={StyleSheet.hairlineWidth}
                                                />

                                                {personalRecordActivePoint ? (
                                                    <Line
                                                        x1={personalRecordActivePoint.x}
                                                        y1={chartTopMargin}
                                                        x2={personalRecordActivePoint.x}
                                                        y2={chartBaselineY}
                                                        stroke={METRIC_COLORS.personalRecords.strip}
                                                        strokeWidth={pointerStripWidth}
                                                    />
                                                ) : null}

                                                {personalRecordChartPoints.map((point, index) => (
                                                    <ChartBubble
                                                        key={`personal-record-point-${index}`}
                                                        cx={point.x}
                                                        cy={point.y}
                                                        isActive={index === personalRecordActiveIndex}
                                                        accent={CHART_ACCENTS.prs}
                                                    />
                                                ))}
                                            </Svg>

                                            {personalRecordXAxisLabels.length ? (
                                                <View
                                                    pointerEvents="none"
                                                    style={[
                                                        styles.xAxisLabelsOverlay,
                                                        {
                                                            left: chartLeftMargin,
                                                            right: chartRightMargin,
                                                            justifyContent:
                                                                personalRecordXAxisLabels.length > 1
                                                                    ? "space-between"
                                                                    : "center",
                                                        },
                                                    ]}
                                                >
                                                    {personalRecordXAxisLabels.map((item, index) => (
                                                        <Text
                                                            key={`personal-record-x-axis-label-${item.timestamp ?? index}-${index}`}
                                                            style={[chartTypography.axisLabel, styles.xAxisLabel]}
                                                        >
                                                            {item.label}
                                                        </Text>
                                                    ))}
                                                </View>
                                            ) : null}

                                            {personalRecordActivePoint ? (
                                                <Animated.View
                                                    pointerEvents="box-none"
                                                    style={[
                                                        chartPointerStyles.container,
                                                        {
                                                            left: personalRecordPointerLabelLeft,
                                                            top: Math.max(
                                                                scaleSize(-8),
                                                                chartTopMargin - scaleSize(72)
                                                            ),
                                                            width: personalRecordPointerLabelWidth,
                                                            opacity: personalRecordPointerOpacity,
                                                        },
                                                    ]}
                                                >
                                                    <PersonalRecordPointerLabel
                                                        entry={personalRecordActiveEntry}
                                                        isRightAligned={personalRecordPointerRightAligned}
                                                        onWorkoutPress={handleNavigateToPastWorkout}
                                                    />
                                                </Animated.View>
                                            ) : null}
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.chartEmptyState}>
                                        <Text style={styles.placeholderText}>Log workouts to set new PRs.</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.metricToggleRowContainer}>
                                <MetricToggleRow
                                    tabs={metricTabs}
                                    activeKey={activeMetricKey}
                                    onSelect={setActiveMetricKey}
                                />
                            </View>
                        </View>
                    ) : null}

                    <View style={styles.chartDivider} />

                    <View
                        style={[
                            chartCardLayout.card,
                            styles.card,
                            styles.weightCard,
                        ]}
                    >
                        <View style={[chartCardLayout.header, styles.header]}>
                            <Text style={[chartCardTypography.sectionTitle, styles.sectionTitle]}>Body Weight</Text>
                            <View style={styles.headerActions}>
                                <RNBounceable
                                    style={styles.addButton}
                                    onPress={handleOpenAddModal}
                                    activeScale={0.97}
                                    disabled={isSaving}
                                    accessibilityRole="button"
                                    accessibilityLabel="Add a new weight measurement"
                                >
                                    <Text style={styles.addButtonLabel}>+ Add Measurement</Text>
                                </RNBounceable>
                            </View>
                        </View>

                        <View style={[chartCardLayout.metricsRow, styles.metricsRow]}>
                            <View style={[chartCardLayout.valueGroup, styles.weightGroup]}>
                                <Text style={chartCardTypography.metricValue}>{latestWeightText}</Text>
                                <Text style={[chartCardTypography.metricUnit, styles.weightUnit]}>{latestUnit}</Text>
                                {latestWeightDeltaMeta ? (
                                    <View style={[chartCardLayout.deltaGroup, styles.deltaGroup]}>
                                        <Ionicons
                                            name={latestWeightDeltaMeta.icon}
                                            size={scaleSize(17)}
                                            color={latestWeightDeltaMeta.color}
                                            style={styles.deltaIcon}
                                        />
                                        <Text
                                            style={[
                                                chartCardTypography.deltaValue,
                                                { color: latestWeightDeltaMeta.color },
                                            ]}
                                        >
                                            {latestWeightDeltaMeta.text}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                            <Text style={[chartCardTypography.summary, styles.summaryText]}>{latestInfoText}</Text>
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
                            {hasChartData ? (
                                <View style={styles.chartContent}>
                                    <View
                                        style={[
                                            styles.yAxisLabelsContainer,
                                            { width: yAxisLabelWidth, height: chartHeight },
                                        ]}
                                        pointerEvents="none"
                                    >
                                        {yTickValues.map((value, index) => {
                                            const range = Math.max(
                                                (axisMetrics?.maxValue ?? 0) - (axisMetrics?.minValue ?? 0),
                                                1
                                            );
                                            const ratio = (value - (axisMetrics?.minValue ?? 0)) / range;
                                            const clampedRatio = Number.isFinite(ratio)
                                                ? Math.min(Math.max(ratio, 0), 1)
                                                : 0;
                                            const yPosition =
                                                chartTopMargin + chartInnerHeight * (1 - clampedRatio);
                                            const approxLabelHeight = scaleSize(14);
                                            const top = Math.min(
                                                chartHeight - chartBottomMargin - approxLabelHeight,
                                                Math.max(
                                                    chartTopMargin - approxLabelHeight / 2,
                                                    yPosition - approxLabelHeight / 2
                                                )
                                            );

                                            return (
                                                <Text
                                                    key={`y-axis-label-${value}-${index}`}
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

                                    <View
                                        style={[
                                            styles.chartCanvas,
                                            { width: chartPlotWidth, height: chartHeight },
                                        ]}
                                        {...chartPanResponder.panHandlers}
                                    >
                                        <Svg width={chartPlotWidth} height={chartHeight}>
                                            <Defs>
                                                <LinearGradient
                                                    id="progressChartGradient"
                                                    x1="0"
                                                    y1="0"
                                                    x2="0"
                                                    y2="1"
                                                >
                                                    <Stop offset="0%" stopColor="#64A0FF" stopOpacity="0.3" />
                                                    <Stop
                                                        offset="100%"
                                                        stopColor="#2D7BFF"
                                                        stopOpacity="0.08"
                                                    />
                                                </LinearGradient>
                                            </Defs>

                                            {yTickValues.map((value, index) => {
                                                const range = Math.max(
                                                    (axisMetrics?.maxValue ?? 0) -
                                                    (axisMetrics?.minValue ?? 0),
                                                    1
                                                );
                                                const ratio = (value - (axisMetrics?.minValue ?? 0)) / range;
                                                const clampedRatio = Number.isFinite(ratio)
                                                    ? Math.min(Math.max(ratio, 0), 1)
                                                    : 0;
                                                const y =
                                                    chartTopMargin + chartInnerHeight * (1 - clampedRatio);
                                                return (
                                                    <Line
                                                        key={`grid-line-${value}-${index}`}
                                                        x1={chartLeftMargin}
                                                        y1={y}
                                                        x2={chartPlotWidth - chartRightMargin}
                                                        y2={y}
                                                        stroke="rgba(255,255,255,0.1)"
                                                        strokeWidth={StyleSheet.hairlineWidth}
                                                        strokeDasharray={[6, 6]}
                                                    />
                                                );
                                            })}

                                            {weightSeries.areaPath ? (
                                                <Path
                                                    d={weightSeries.areaPath}
                                                    fill="url(#progressChartGradient)"
                                                    stroke="none"
                                                />
                                            ) : null}

                                            {weightSeries.linePath ? (
                                                <Path
                                                    d={weightSeries.linePath}
                                                    fill="none"
                                                    stroke="#7FB7FF"
                                                    strokeWidth={scaleSize(3)}
                                                    strokeLinejoin="round"
                                                    strokeLinecap="round"
                                                />
                                            ) : null}

                                            <Line
                                                x1={chartLeftMargin}
                                                y1={chartTopMargin}
                                                x2={chartLeftMargin}
                                                y2={chartBaselineY}
                                                stroke="rgba(148, 157, 172, 0.35)"
                                                strokeWidth={StyleSheet.hairlineWidth}
                                            />
                                            <Line
                                                x1={chartLeftMargin}
                                                y1={chartBaselineY}
                                                x2={chartPlotWidth - chartRightMargin}
                                                y2={chartBaselineY}
                                                stroke="rgba(148, 157, 172, 0.35)"
                                                strokeWidth={StyleSheet.hairlineWidth}
                                            />

                                            {weightActivePoint ? (
                                                <Line
                                                    x1={weightActivePoint.x}
                                                    y1={chartTopMargin}
                                                    x2={weightActivePoint.x}
                                                    y2={chartBaselineY}
                                                    stroke="rgba(45, 158, 255, 0.45)"
                                                    strokeWidth={pointerStripWidth}
                                                />
                                            ) : null}

                                            {weightChartPoints.map((point, index) => (
                                                <ChartBubble
                                                    key={point.entry?.id || `point-${index}`}
                                                    cx={point.x}
                                                    cy={point.y}
                                                    isActive={index === activeIndex}
                                                    accent={CHART_ACCENTS.weight}
                                                />
                                            ))}
                                        </Svg>

                                        {weightXAxisLabels.length ? (
                                            <View
                                                pointerEvents="none"
                                                style={[
                                                    styles.xAxisLabelsOverlay,
                                                    {
                                                        left: chartLeftMargin,
                                                        right: chartRightMargin,
                                                        justifyContent:
                                                            weightXAxisLabels.length > 1
                                                                ? "space-between"
                                                                : "center",
                                                    },
                                                ]}
                                            >
                                                {weightXAxisLabels.map((item, index) => (
                                                    <Text
                                                        key={`weight-x-axis-label-${item.timestamp ?? index}-${index}`}
                                                        style={[chartTypography.axisLabel, styles.xAxisLabel]}
                                                    >
                                                        {item.label}
                                                    </Text>
                                                ))}
                                            </View>
                                        ) : null}

                                        {weightActiveEntry ? (
                                            <Animated.View
                                                pointerEvents="none"
                                                style={[
                                                    chartPointerStyles.container,
                                                    {
                                                        left: pointerLabelLeft,
                                                        top: Math.max(
                                                            scaleSize(-8),
                                                            chartTopMargin - scaleSize(72)
                                                        ),
                                                        width: pointerLabelWidth,
                                                        opacity: weightPointerOpacity,
                                                    },
                                                ]}
                                            >
                                                <PointerLabelBubble
                                                    entry={weightActiveEntry}
                                                    unit={latestUnit}
                                                    delta={weightActiveDelta}
                                                    isRightAligned={isPointerRightAligned}
                                                />
                                            </Animated.View>
                                        ) : null}
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.chartEmptyState}>
                                    <Text style={styles.placeholderText}>
                                        Log a measurement to begin.
                                    </Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.measurementsRowContainer}>
                            <Pressable
                                onPress={() => navigation.navigate("WeightMeasurements")}
                                accessibilityRole="button"
                                accessibilityLabel="See weight measurements"
                                disabled={isSaving}
                                style={({ pressed }) => [
                                    styles.measurementsRow,
                                    pressed && styles.measurementsRowPressed,
                                ]}
                            >
                                <View style={styles.measurementsTextWrap}>
                                    <Text style={styles.measurementsTitle}>See Weight Measurements</Text>
                                    <Text style={styles.measurementsSubtitle} numberOfLines={1}>
                                        {measurementRowSubtitle}
                                    </Text>
                                </View>
                                <Ionicons
                                    name="chevron-forward"
                                    size={scaleSize(18)}
                                    color="rgba(198, 206, 222, 0.84)"
                                    style={styles.measurementsChevron}
                                />
                            </Pressable>
                        </View>
                    </View>
                </View>
            </ScrollView>

            <AddMeasurementModal
                isVisible={isModalVisible}
                onDismiss={handleCloseAddModal}
                onSubmit={handleSubmitMeasurement}
                unit={latestUnit}
                isSaving={isSaving}
            />
        </>
    );
}

export default React.memo(ProgressSection);
