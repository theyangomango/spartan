import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
    Pressable,
    Animated,
    PanResponder,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, LinearGradient, Stop, Defs, Line, Circle } from 'react-native-svg';
import dayjs from 'dayjs';

import useStableSafeAreaInsets from '../hooks/useStableSafeAreaInsets';
import theme from '../theme/mfpDark';
import { DEVICE_WIDTH, scaleSize } from '../components/2_Competition/layoutConstants';
import { chartPointerStyles, chartTypography, chartCardTypography, chartCardLayout } from '../components/charts/chartStyles';
import { buildChartSeries, buildYTickValues, computeAxisMetrics, formatAxisValue } from '../components/charts/chartMath';
import ChartBubble from '../components/charts/ChartBubble';
import { toExerciseSlug } from '../components/common/exerciseImageMap';
import { withStrongPress } from '../utils/haptics';
import { navigateOneWay } from '../../navigationRef';
import useSyncSavedExercises from '../hooks/useSyncSavedExercises';
import { subscribeUserData, emitUserDataUpdate } from '../utils/userDataEvents';
import { resolvePhotoURL } from '../utils/profilePhoto';
import { sanitizeCompletedWorkouts } from '../utils/completedWorkouts';
import { toDisplayWeightUnit } from '../utils/weightUnits';
import { sanitizeWorkoutForRouteShallow } from '../utils/workoutRouteParams';
import styles from './exerciseDetail/ExerciseDetail.styles';
import { CHART_ACCENTS, METRIC_COLORS, TABS } from './exerciseDetail/exerciseDetailConstants';
import {
    buildFallbackHowToSteps,
    buildMetricDeltaDisplay,
    formatNumberCompact,
    getInitialSavedExercises,
    normalizeSavedExercises,
    resolvePreferredWeightUnit,
    resolveProvidedHowToSteps,
    savedExercisesSignature,
} from './exerciseDetail/exerciseDetailUtils';
import {
    buildExerciseProgressEntries,
    buildHistorySessions,
    completedWorkoutsSignature,
    extractWid,
    findStatsEntry,
    getInitialCompletedWorkouts,
    getInitialStatsExercises,
    normalizeStatsExercises,
    statsExercisesSignature,
} from './exerciseDetail/exerciseStatsUtils';
import {
    ExerciseOneRmPointerLabel,
    ExercisePersonalRecordPointerLabel,
    ExerciseRepsPointerLabel,
    ExerciseVolumePointerLabel,
} from './exerciseDetail/ExercisePointerLabels';
import ExerciseAboutTab from './exerciseDetail/ExerciseAboutTab';
import ExerciseHistoryTab from './exerciseDetail/ExerciseHistoryTab';

const DEFAULT_X_AXIS_LABEL_COUNT = 5;

const formatXAxisDateLabel = (timestamp, span) => {
    if (!Number.isFinite(timestamp) || timestamp <= 0) return '';
    const dateInstance = dayjs(timestamp);
    if (!dateInstance.isValid()) return '';

    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const threeMonths = 90 * 24 * 60 * 60 * 1000;

    if (span <= oneWeek) return dateInstance.format('MMM D');
    if (span <= threeMonths) return dateInstance.format('MMM D');
    return dateInstance.format('MMM YYYY');
};

const buildXAxisLabels = (domain, desiredCount = DEFAULT_X_AXIS_LABEL_COUNT) => {
    if (!domain || typeof domain !== 'object') return [];
    const { minX, maxX } = domain;
    if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return [];

    const span = Math.max(maxX - minX, 0);
    if (span <= 0) {
        const label = formatXAxisDateLabel(minX, span);
        return label ? [{ label, timestamp: minX }] : [];
    }

    const count = Math.max(2, Number(desiredCount) || DEFAULT_X_AXIS_LABEL_COUNT);
    const step = span / (count - 1);
    const labels = [];

    for (let i = 0; i < count; i += 1) {
        const isLast = i === count - 1;
        const timestamp = isLast ? maxX : minX + step * i;
        const formatted = formatXAxisDateLabel(timestamp, span);
        // Leave a repeated date blank: a short span would otherwise print the same day at every tick.
        if (formatted) labels.push({ label: labels.some((entry) => entry.label === formatted) ? "" : formatted, timestamp });
    }

    return labels;
};

const buildMetricColors = (palette) => ({
    lineColor: palette.line,
    gradientFrom: palette.line,
    gradientTo: palette.line,
    stripColor: palette.strip,
    accent: palette.accent,
});

export default function ExerciseDetail() {
    const navigation = useNavigation();
    const route = useRoute();
    const insets = useStableSafeAreaInsets();
    const [activeTab, setActiveTab] = useState('about');
    const [savedExercisesMap, setSavedExercisesMap] = useState(() => getInitialSavedExercises());
    const [statsExercisesMap, setStatsExercisesMap] = useState(() => getInitialStatsExercises());
    const [completedWorkouts, setCompletedWorkouts] = useState(() => getInitialCompletedWorkouts());
    const [weightUnit, setWeightUnit] = useState(() => resolvePreferredWeightUnit());
    const [activeProgressMetric, setActiveProgressMetric] = useState('volume');
    const headerTopPadding = useMemo(
        () => (insets?.top ? scaleSize(12) : scaleSize(18)),
        [insets?.top]
    );

    const exerciseParam = route?.params?.exercise || {};
    const name = useMemo(() => {
        const raw = typeof exerciseParam?.name === 'string' ? exerciseParam.name : '';
        if (raw) return raw.trim();
        const fallback = typeof exerciseParam?.title === 'string' ? exerciseParam.title : '';
        return fallback.trim() || 'Exercise';
    }, [exerciseParam?.name, exerciseParam?.title]);

    const displayTitle = useMemo(() => {
        return name.replace(/\s+/g, ' ').trim() || 'Exercise';
    }, [name]);

    const muscleGroup = exerciseParam?.muscleGroup || exerciseParam?.muscle || '—';
    const equipment = exerciseParam?.equipment || '—';
    const normalizedMuscleGroup = useMemo(() => {
        if (!muscleGroup || (typeof muscleGroup === 'string' && muscleGroup.trim() === '')) return null;
        if (muscleGroup === '—') return null;
        return muscleGroup;
    }, [muscleGroup]);
    const resolvedSlug = useMemo(() => {
        const candidate = typeof exerciseParam?.slug === 'string' ? exerciseParam.slug.trim() : '';
        if (candidate) return candidate;
        return toExerciseSlug(name);
    }, [exerciseParam?.slug, name]);
    const isFavorite = useMemo(() => Boolean(savedExercisesMap?.[name]), [savedExercisesMap, name]);
    const favoriteButtonLabel = isFavorite ? 'Remove from Favorites' : 'Add to Favorites';
    const favoriteAccessibilityLabel = isFavorite
        ? 'Remove exercise from favorites'
        : 'Add exercise to favorites';

    const howToSteps = useMemo(() => {
        const resolvedSteps = resolveProvidedHowToSteps(exerciseParam);
        if (resolvedSteps.length) return resolvedSteps;
        return buildFallbackHowToSteps({
            title: displayTitle,
            muscleGroup,
            equipment,
        });
    }, [exerciseParam, displayTitle, muscleGroup, equipment]);

    const exerciseStatsEntry = useMemo(() => {
        const direct = findStatsEntry(statsExercisesMap, name);
        if (direct) return direct;
        if (displayTitle && displayTitle !== name) {
            return findStatsEntry(statsExercisesMap, displayTitle);
        }
        return null;
    }, [statsExercisesMap, name, displayTitle]);

    const historySessions = useMemo(
        () => buildHistorySessions(exerciseStatsEntry, completedWorkouts, weightUnit),
        [exerciseStatsEntry, completedWorkouts, weightUnit]
    );

    const workoutsByWid = useMemo(() => {
        const map = new Map();
        (Array.isArray(completedWorkouts) ? completedWorkouts : []).forEach((workout) => {
            const wid = extractWid(workout);
            if (wid) map.set(wid, workout);
        });
        return map;
    }, [completedWorkouts]);

    const {
        exerciseVolumeEntries,
        exerciseRepsEntries,
        exerciseOneRmEntries,
        exercisePersonalRecordEntries: rawExercisePersonalRecordEntries,
    } = useMemo(
        () => buildExerciseProgressEntries(exerciseStatsEntry, workoutsByWid),
        [exerciseStatsEntry, workoutsByWid]
    );

    const exercisePersonalRecordEntries = useMemo(
        () =>
            Array.isArray(rawExercisePersonalRecordEntries)
                ? rawExercisePersonalRecordEntries.filter((entry) => entry && Number.isFinite(entry.value))
                : [],
        [rawExercisePersonalRecordEntries]
    );

    const progressSectionsCount = 4;

    const progressVolumeValues = useMemo(
        () => exerciseVolumeEntries.map((entry) => entry.value),
        [exerciseVolumeEntries]
    );
    const progressVolumeAxisMetrics = useMemo(
        () => computeAxisMetrics(progressVolumeValues, progressSectionsCount),
        [progressVolumeValues, progressSectionsCount]
    );
    const progressVolumeTicks = useMemo(() => buildYTickValues(progressVolumeAxisMetrics), [progressVolumeAxisMetrics]);

    const progressOneRmValues = useMemo(
        () => exerciseOneRmEntries.map((entry) => entry.value),
        [exerciseOneRmEntries]
    );
    const progressOneRmAxisMetrics = useMemo(
        () => computeAxisMetrics(progressOneRmValues, progressSectionsCount),
        [progressOneRmValues, progressSectionsCount]
    );
    const progressOneRmTicks = useMemo(() => buildYTickValues(progressOneRmAxisMetrics), [progressOneRmAxisMetrics]);

    const progressRepsValues = useMemo(
        () => exerciseRepsEntries.map((entry) => entry.value),
        [exerciseRepsEntries]
    );
    const progressRepsAxisMetrics = useMemo(
        () => computeAxisMetrics(progressRepsValues, progressSectionsCount),
        [progressRepsValues, progressSectionsCount]
    );
    const progressRepsTicks = useMemo(() => buildYTickValues(progressRepsAxisMetrics), [progressRepsAxisMetrics]);

    const progressPersonalRecordValues = useMemo(
        () => exercisePersonalRecordEntries.map((entry) => entry.value),
        [exercisePersonalRecordEntries]
    );
    const progressPersonalRecordAxisMetrics = useMemo(
        () => computeAxisMetrics(progressPersonalRecordValues, progressSectionsCount),
        [progressPersonalRecordValues, progressSectionsCount]
    );
    const progressPersonalRecordTicks = useMemo(() => buildYTickValues(progressPersonalRecordAxisMetrics), [progressPersonalRecordAxisMetrics]);

    const progressCardHorizontalPadding = scaleSize(16);
    const progressChartHeight = scaleSize(220);
    const progressChartWidth = Math.max(DEVICE_WIDTH - progressCardHorizontalPadding, scaleSize(200));
    const progressChartPaddingTop = scaleSize(24);
    const progressChartPaddingBottom = scaleSize(32);
    const progressInitialSpacing = scaleSize(12);
    const progressYAxisLabelWidth = scaleSize(42);
    const progressPointerStripWidth = scaleSize(2);

    const progressChartGeometry = useMemo(() => {
        const plotWidth = Math.max(progressChartWidth - progressYAxisLabelWidth, scaleSize(160));
        const plotHeight = progressChartHeight;
        const leftMargin = progressInitialSpacing;
        const rightMargin = progressInitialSpacing;
        const topMargin = progressChartPaddingTop;
        const bottomMargin = progressChartPaddingBottom;
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
    }, [
        progressChartWidth,
        progressChartHeight,
        progressYAxisLabelWidth,
        progressInitialSpacing,
        progressChartPaddingTop,
        progressChartPaddingBottom,
    ]);

    const progressVolumeSeries = useMemo(
        () => buildChartSeries(exerciseVolumeEntries, progressVolumeAxisMetrics, progressChartGeometry),
        [exerciseVolumeEntries, progressVolumeAxisMetrics, progressChartGeometry]
    );

    const progressOneRmSeries = useMemo(
        () => buildChartSeries(exerciseOneRmEntries, progressOneRmAxisMetrics, progressChartGeometry),
        [exerciseOneRmEntries, progressOneRmAxisMetrics, progressChartGeometry]
    );

    const progressRepsSeries = useMemo(
        () => buildChartSeries(exerciseRepsEntries, progressRepsAxisMetrics, progressChartGeometry),
        [exerciseRepsEntries, progressRepsAxisMetrics, progressChartGeometry]
    );

    const progressPersonalRecordSeries = useMemo(
        () =>
            buildChartSeries(
                exercisePersonalRecordEntries,
                progressPersonalRecordAxisMetrics,
                progressChartGeometry
            ),
        [exercisePersonalRecordEntries, progressPersonalRecordAxisMetrics, progressChartGeometry]
    );

    const progressVolumeXAxisLabels = useMemo(
        () => buildXAxisLabels(progressVolumeSeries?.domain),
        [progressVolumeSeries?.domain]
    );

    const progressOneRmXAxisLabels = useMemo(
        () => buildXAxisLabels(progressOneRmSeries?.domain),
        [progressOneRmSeries?.domain]
    );

    const progressRepsXAxisLabels = useMemo(
        () => buildXAxisLabels(progressRepsSeries?.domain),
        [progressRepsSeries?.domain]
    );

    const progressPersonalRecordXAxisLabels = useMemo(
        () => buildXAxisLabels(progressPersonalRecordSeries?.domain),
        [progressPersonalRecordSeries?.domain]
    );

    const {
        plotWidth: progressPlotWidth,
        leftMargin: progressLeftMargin,
        rightMargin: progressRightMargin,
        topMargin: progressTopMargin,
        bottomMargin: progressBottomMargin,
        innerWidth: progressInnerWidth,
        innerHeight: progressInnerHeight,
        baselineY: progressBaselineY,
    } = progressChartGeometry;

    const progressVolumePoints = progressVolumeSeries.points;
    const progressOneRmPoints = progressOneRmSeries.points;
    const progressRepsPoints = progressRepsSeries.points;
    const progressPersonalRecordPoints = progressPersonalRecordSeries.points;

    const progressVolumeActiveIndexRef = useRef(null);
    const [progressVolumeActiveIndex, setProgressVolumeActiveIndex] = useState(null);
    const progressOneRmActiveIndexRef = useRef(null);
    const [progressOneRmActiveIndex, setProgressOneRmActiveIndex] = useState(null);
    const progressRepsActiveIndexRef = useRef(null);
    const [progressRepsActiveIndex, setProgressRepsActiveIndex] = useState(null);
    const progressPersonalRecordActiveIndexRef = useRef(null);
    const [progressPersonalRecordActiveIndex, setProgressPersonalRecordActiveIndex] = useState(null);

    const progressVolumePointerOpacity = useRef(new Animated.Value(0)).current;
    const progressOneRmPointerOpacity = useRef(new Animated.Value(0)).current;
    const progressRepsPointerOpacity = useRef(new Animated.Value(0)).current;
    const progressPersonalRecordPointerOpacity = useRef(new Animated.Value(0)).current;

    const progressVolumeHideTimeout = useRef(null);
    const progressOneRmHideTimeout = useRef(null);
    const progressRepsHideTimeout = useRef(null);
    const progressPersonalRecordHideTimeout = useRef(null);

    const clearProgressVolumeHideTimeout = useCallback(() => {
        if (progressVolumeHideTimeout.current) {
            clearTimeout(progressVolumeHideTimeout.current);
            progressVolumeHideTimeout.current = null;
        }
    }, []);

    const clearProgressOneRmHideTimeout = useCallback(() => {
        if (progressOneRmHideTimeout.current) {
            clearTimeout(progressOneRmHideTimeout.current);
            progressOneRmHideTimeout.current = null;
        }
    }, []);

    const clearProgressRepsHideTimeout = useCallback(() => {
        if (progressRepsHideTimeout.current) {
            clearTimeout(progressRepsHideTimeout.current);
            progressRepsHideTimeout.current = null;
        }
    }, []);

    const clearProgressPersonalRecordHideTimeout = useCallback(() => {
        if (progressPersonalRecordHideTimeout.current) {
            clearTimeout(progressPersonalRecordHideTimeout.current);
            progressPersonalRecordHideTimeout.current = null;
        }
    }, []);

    const showProgressVolumePointer = useCallback(() => {
        clearProgressVolumeHideTimeout();
        progressVolumePointerOpacity.stopAnimation();
        Animated.timing(progressVolumePointerOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
        }).start();
    }, [clearProgressVolumeHideTimeout, progressVolumePointerOpacity]);

    const showProgressOneRmPointer = useCallback(() => {
        clearProgressOneRmHideTimeout();
        progressOneRmPointerOpacity.stopAnimation();
        Animated.timing(progressOneRmPointerOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
        }).start();
    }, [clearProgressOneRmHideTimeout, progressOneRmPointerOpacity]);

    const showProgressRepsPointer = useCallback(() => {
        clearProgressRepsHideTimeout();
        progressRepsPointerOpacity.stopAnimation();
        Animated.timing(progressRepsPointerOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
        }).start();
    }, [clearProgressRepsHideTimeout, progressRepsPointerOpacity]);

    const showProgressPersonalRecordPointer = useCallback(() => {
        clearProgressPersonalRecordHideTimeout();
        progressPersonalRecordPointerOpacity.stopAnimation();
        Animated.timing(progressPersonalRecordPointerOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
        }).start();
    }, [clearProgressPersonalRecordHideTimeout, progressPersonalRecordPointerOpacity]);

    const scheduleProgressVolumeHide = useCallback(() => {
        clearProgressVolumeHideTimeout();
        if (progressVolumeActiveIndexRef.current == null) return;
        progressVolumeHideTimeout.current = setTimeout(() => {
            progressVolumePointerOpacity.stopAnimation();
            Animated.timing(progressVolumePointerOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start(({ finished }) => {
                // A new tap during the fade-out stops this animation; keep the selection it just made.
                if (!finished) return;
                progressVolumeActiveIndexRef.current = null;
                setProgressVolumeActiveIndex(null);
            });
            progressVolumeHideTimeout.current = null;
        }, 2000);
    }, [clearProgressVolumeHideTimeout, progressVolumePointerOpacity]);

    const scheduleProgressOneRmHide = useCallback(() => {
        clearProgressOneRmHideTimeout();
        if (progressOneRmActiveIndexRef.current == null) return;
        progressOneRmHideTimeout.current = setTimeout(() => {
            progressOneRmPointerOpacity.stopAnimation();
            Animated.timing(progressOneRmPointerOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start(({ finished }) => {
                // A new tap during the fade-out stops this animation; keep the selection it just made.
                if (!finished) return;
                progressOneRmActiveIndexRef.current = null;
                setProgressOneRmActiveIndex(null);
            });
            progressOneRmHideTimeout.current = null;
        }, 2000);
    }, [clearProgressOneRmHideTimeout, progressOneRmPointerOpacity]);

    const scheduleProgressRepsHide = useCallback(() => {
        clearProgressRepsHideTimeout();
        if (progressRepsActiveIndexRef.current == null) return;
        progressRepsHideTimeout.current = setTimeout(() => {
            progressRepsPointerOpacity.stopAnimation();
            Animated.timing(progressRepsPointerOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start(({ finished }) => {
                // A new tap during the fade-out stops this animation; keep the selection it just made.
                if (!finished) return;
                progressRepsActiveIndexRef.current = null;
                setProgressRepsActiveIndex(null);
            });
            progressRepsHideTimeout.current = null;
        }, 2000);
    }, [clearProgressRepsHideTimeout, progressRepsPointerOpacity]);

    const scheduleProgressPersonalRecordHide = useCallback(() => {
        clearProgressPersonalRecordHideTimeout();
        if (progressPersonalRecordActiveIndexRef.current == null) return;
        progressPersonalRecordHideTimeout.current = setTimeout(() => {
            progressPersonalRecordPointerOpacity.stopAnimation();
            Animated.timing(progressPersonalRecordPointerOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start(({ finished }) => {
                // A new tap during the fade-out stops this animation; keep the selection it just made.
                if (!finished) return;
                progressPersonalRecordActiveIndexRef.current = null;
                setProgressPersonalRecordActiveIndex(null);
            });
            progressPersonalRecordHideTimeout.current = null;
        }, 2000);
    }, [clearProgressPersonalRecordHideTimeout, progressPersonalRecordPointerOpacity]);

    const handleProgressVolumePointerActivate = useCallback(
        (payload) => {
            if (!payload) return;
            const { index } = payload;
            if (!Number.isFinite(index)) return;
            progressVolumeActiveIndexRef.current = index;
            setProgressVolumeActiveIndex((prev) => (prev === index ? prev : index));
            showProgressVolumePointer();
        },
        [showProgressVolumePointer]
    );

    const handleProgressOneRmPointerActivate = useCallback(
        (payload) => {
            if (!payload) return;
            const { index } = payload;
            if (!Number.isFinite(index)) return;
            progressOneRmActiveIndexRef.current = index;
            setProgressOneRmActiveIndex((prev) => (prev === index ? prev : index));
            showProgressOneRmPointer();
        },
        [showProgressOneRmPointer]
    );

    const handleProgressRepsPointerActivate = useCallback(
        (payload) => {
            if (!payload) return;
            const { index } = payload;
            if (!Number.isFinite(index)) return;
            progressRepsActiveIndexRef.current = index;
            setProgressRepsActiveIndex((prev) => (prev === index ? prev : index));
            showProgressRepsPointer();
        },
        [showProgressRepsPointer]
    );

    const handleProgressPersonalRecordPointerActivate = useCallback(
        (payload) => {
            if (!payload) return;
            const { index } = payload;
            if (!Number.isFinite(index)) return;
            progressPersonalRecordActiveIndexRef.current = index;
            setProgressPersonalRecordActiveIndex((prev) => (prev === index ? prev : index));
            showProgressPersonalRecordPointer();
        },
        [showProgressPersonalRecordPointer]
    );

    const handleProgressVolumeChartTouch = useCallback(
        (nativeEvent) => {
            if (!nativeEvent || !progressVolumePoints.length) return;
            const { locationX } = nativeEvent;
            if (!Number.isFinite(locationX)) return;

            const minX = progressLeftMargin;
            const maxX = progressLeftMargin + progressInnerWidth;
            const clampedX = Math.max(minX, Math.min(maxX, locationX));

            let closestIndex = 0;
            let smallestDistance = Math.abs(progressVolumePoints[0].x - clampedX);

            for (let i = 1; i < progressVolumePoints.length; i += 1) {
                const point = progressVolumePoints[i];
                const distance = Math.abs(point.x - clampedX);
                if (distance < smallestDistance) {
                    smallestDistance = distance;
                    closestIndex = i;
                }
            }

            handleProgressVolumePointerActivate({ index: closestIndex });
        },
        [progressVolumePoints, progressLeftMargin, progressInnerWidth, handleProgressVolumePointerActivate]
    );

    const handleProgressOneRmChartTouch = useCallback(
        (nativeEvent) => {
            if (!nativeEvent || !progressOneRmPoints.length) return;
            const { locationX } = nativeEvent;
            if (!Number.isFinite(locationX)) return;

            const minX = progressLeftMargin;
            const maxX = progressLeftMargin + progressInnerWidth;
            const clampedX = Math.max(minX, Math.min(maxX, locationX));

            let closestIndex = 0;
            let smallestDistance = Math.abs(progressOneRmPoints[0].x - clampedX);

            for (let i = 1; i < progressOneRmPoints.length; i += 1) {
                const point = progressOneRmPoints[i];
                const distance = Math.abs(point.x - clampedX);
                if (distance < smallestDistance) {
                    smallestDistance = distance;
                    closestIndex = i;
                }
            }

            handleProgressOneRmPointerActivate({ index: closestIndex });
        },
        [progressOneRmPoints, progressLeftMargin, progressInnerWidth, handleProgressOneRmPointerActivate]
    );

    const handleProgressRepsChartTouch = useCallback(
        (nativeEvent) => {
            if (!nativeEvent || !progressRepsPoints.length) return;
            const { locationX } = nativeEvent;
            if (!Number.isFinite(locationX)) return;

            const minX = progressLeftMargin;
            const maxX = progressLeftMargin + progressInnerWidth;
            const clampedX = Math.max(minX, Math.min(maxX, locationX));

            let closestIndex = 0;
            let smallestDistance = Math.abs(progressRepsPoints[0].x - clampedX);

            for (let i = 1; i < progressRepsPoints.length; i += 1) {
                const point = progressRepsPoints[i];
                const distance = Math.abs(point.x - clampedX);
                if (distance < smallestDistance) {
                    smallestDistance = distance;
                    closestIndex = i;
                }
            }

            handleProgressRepsPointerActivate({ index: closestIndex });
        },
        [progressRepsPoints, progressLeftMargin, progressInnerWidth, handleProgressRepsPointerActivate]
    );

    const handleProgressPersonalRecordChartTouch = useCallback(
        (nativeEvent) => {
            if (!nativeEvent || !progressPersonalRecordPoints.length) return;
            const { locationX } = nativeEvent;
            if (!Number.isFinite(locationX)) return;

            const minX = progressLeftMargin;
            const maxX = progressLeftMargin + progressInnerWidth;
            const clampedX = Math.max(minX, Math.min(maxX, locationX));

            let closestIndex = 0;
            let smallestDistance = Math.abs(progressPersonalRecordPoints[0].x - clampedX);

            for (let i = 1; i < progressPersonalRecordPoints.length; i += 1) {
                const point = progressPersonalRecordPoints[i];
                const distance = Math.abs(point.x - clampedX);
                if (distance < smallestDistance) {
                    smallestDistance = distance;
                    closestIndex = i;
                }
            }

            handleProgressPersonalRecordPointerActivate({ index: closestIndex });
        },
        [
            progressPersonalRecordPoints,
            progressLeftMargin,
            progressInnerWidth,
            handleProgressPersonalRecordPointerActivate,
        ]
    );

    const progressVolumePanResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => !!progressVolumePoints.length,
                onMoveShouldSetPanResponder: () => !!progressVolumePoints.length,
                onPanResponderGrant: (evt) => handleProgressVolumeChartTouch(evt?.nativeEvent),
                onPanResponderMove: (evt) => handleProgressVolumeChartTouch(evt?.nativeEvent),
                onPanResponderRelease: () => scheduleProgressVolumeHide(),
                onPanResponderTerminate: () => scheduleProgressVolumeHide(),
            }),
        [progressVolumePoints.length, handleProgressVolumeChartTouch, scheduleProgressVolumeHide]
    );

    const progressOneRmPanResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => !!progressOneRmPoints.length,
                onMoveShouldSetPanResponder: () => !!progressOneRmPoints.length,
                onPanResponderGrant: (evt) => handleProgressOneRmChartTouch(evt?.nativeEvent),
                onPanResponderMove: (evt) => handleProgressOneRmChartTouch(evt?.nativeEvent),
                onPanResponderRelease: () => scheduleProgressOneRmHide(),
                onPanResponderTerminate: () => scheduleProgressOneRmHide(),
            }),
        [progressOneRmPoints.length, handleProgressOneRmChartTouch, scheduleProgressOneRmHide]
    );

    const progressRepsPanResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => !!progressRepsPoints.length,
                onMoveShouldSetPanResponder: () => !!progressRepsPoints.length,
                onPanResponderGrant: (evt) => handleProgressRepsChartTouch(evt?.nativeEvent),
                onPanResponderMove: (evt) => handleProgressRepsChartTouch(evt?.nativeEvent),
                onPanResponderRelease: () => scheduleProgressRepsHide(),
                onPanResponderTerminate: () => scheduleProgressRepsHide(),
            }),
        [progressRepsPoints.length, handleProgressRepsChartTouch, scheduleProgressRepsHide]
    );

    const progressPersonalRecordPanResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => !!progressPersonalRecordPoints.length,
                onMoveShouldSetPanResponder: () => !!progressPersonalRecordPoints.length,
                onPanResponderGrant: (evt) => handleProgressPersonalRecordChartTouch(evt?.nativeEvent),
                onPanResponderMove: (evt) => handleProgressPersonalRecordChartTouch(evt?.nativeEvent),
                onPanResponderRelease: () => scheduleProgressPersonalRecordHide(),
                onPanResponderTerminate: () => scheduleProgressPersonalRecordHide(),
            }),
        [
            progressPersonalRecordPoints.length,
            handleProgressPersonalRecordChartTouch,
            scheduleProgressPersonalRecordHide,
        ]
    );

    const hasProgressVolumeData = exerciseVolumeEntries.length > 0;
    const hasProgressOneRmData = exerciseOneRmEntries.length > 0;
    const hasProgressRepsData = exerciseRepsEntries.length > 0;
    const hasProgressPersonalRecordData = exercisePersonalRecordEntries.length > 0;

    useEffect(() => {
        const hasActiveData =
            (activeProgressMetric === 'volume' && hasProgressVolumeData) ||
            (activeProgressMetric === 'reps' && hasProgressRepsData) ||
            (activeProgressMetric === 'prs' && hasProgressPersonalRecordData);

        if (hasActiveData) return;

        const firstAvailable =
            ['volume', 'reps', 'prs'].find((key) => {
                if (key === 'volume') return hasProgressVolumeData;
                if (key === 'reps') return hasProgressRepsData;
                if (key === 'prs') return hasProgressPersonalRecordData;
                return false;
            }) || activeProgressMetric;

        if (firstAvailable !== activeProgressMetric) {
            setActiveProgressMetric(firstAvailable);
        }
    }, [hasProgressVolumeData, hasProgressRepsData, hasProgressPersonalRecordData, activeProgressMetric]);

    const progressVolumeActivePoint =
        progressVolumeActiveIndex != null ? progressVolumePoints[progressVolumeActiveIndex] : null;
    const progressVolumePointerWidth = scaleSize(184);
    const progressVolumePointerLeft = useMemo(() => {
        if (!progressVolumeActivePoint) return progressLeftMargin;
        const minLeft = progressLeftMargin;
        const maxLeft = progressPlotWidth - progressRightMargin;
        const centered = progressVolumeActivePoint.x - progressVolumePointerWidth / 2;
        return Math.max(minLeft, Math.min(centered, maxLeft - progressVolumePointerWidth));
    }, [
        progressVolumeActivePoint,
        progressLeftMargin,
        progressPlotWidth,
        progressRightMargin,
        progressVolumePointerWidth,
    ]);
    const progressVolumePointerRightAligned =
        progressVolumeActiveIndex != null
            ? progressVolumeActiveIndex >= Math.ceil(exerciseVolumeEntries.length / 2)
            : false;

    const progressOneRmActivePoint =
        progressOneRmActiveIndex != null ? progressOneRmPoints[progressOneRmActiveIndex] : null;
    const progressOneRmPointerWidth = scaleSize(184);
    const progressOneRmPointerLeft = useMemo(() => {
        if (!progressOneRmActivePoint) return progressLeftMargin;
        const minLeft = progressLeftMargin;
        const maxLeft = progressPlotWidth - progressRightMargin;
        const centered = progressOneRmActivePoint.x - progressOneRmPointerWidth / 2;
        return Math.max(minLeft, Math.min(centered, maxLeft - progressOneRmPointerWidth));
    }, [
        progressOneRmActivePoint,
        progressLeftMargin,
        progressPlotWidth,
        progressRightMargin,
        progressOneRmPointerWidth,
    ]);
    const progressOneRmPointerRightAligned =
        progressOneRmActiveIndex != null
            ? progressOneRmActiveIndex >= Math.ceil(exerciseOneRmEntries.length / 2)
            : false;

    const progressRepsActivePoint =
        progressRepsActiveIndex != null ? progressRepsPoints[progressRepsActiveIndex] : null;
    const progressRepsPointerWidth = scaleSize(184);
    const progressRepsPointerLeft = useMemo(() => {
        if (!progressRepsActivePoint) return progressLeftMargin;
        const minLeft = progressLeftMargin;
        const maxLeft = progressPlotWidth - progressRightMargin;
        const centered = progressRepsActivePoint.x - progressRepsPointerWidth / 2;
        return Math.max(minLeft, Math.min(centered, maxLeft - progressRepsPointerWidth));
    }, [
        progressRepsActivePoint,
        progressLeftMargin,
        progressPlotWidth,
        progressRightMargin,
        progressRepsPointerWidth,
    ]);
    const progressRepsPointerRightAligned =
        progressRepsActiveIndex != null
            ? progressRepsActiveIndex >= Math.ceil(exerciseRepsEntries.length / 2)
            : false;

    const progressPersonalRecordActivePoint =
        progressPersonalRecordActiveIndex != null
            ? progressPersonalRecordPoints[progressPersonalRecordActiveIndex]
            : null;
    const progressPersonalRecordPointerWidth = scaleSize(184);
    const progressPersonalRecordPointerLeft = useMemo(() => {
        if (!progressPersonalRecordActivePoint) return progressLeftMargin;
        const minLeft = progressLeftMargin;
        const maxLeft = progressPlotWidth - progressRightMargin;
        const centered =
            progressPersonalRecordActivePoint.x - progressPersonalRecordPointerWidth / 2;
        return Math.max(minLeft, Math.min(centered, maxLeft - progressPersonalRecordPointerWidth));
    }, [
        progressPersonalRecordActivePoint,
        progressLeftMargin,
        progressPlotWidth,
        progressRightMargin,
        progressPersonalRecordPointerWidth,
    ]);
    const progressPersonalRecordPointerRightAligned =
        progressPersonalRecordActiveIndex != null
            ? progressPersonalRecordActiveIndex >= Math.ceil(exercisePersonalRecordEntries.length / 2)
            : false;

    useEffect(() => {
        if (hasProgressVolumeData) return;
        clearProgressVolumeHideTimeout();
        Animated.timing(progressVolumePointerOpacity, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
        }).start();
        if (progressVolumeActiveIndexRef.current != null) {
            progressVolumeActiveIndexRef.current = null;
            setProgressVolumeActiveIndex(null);
        }
    }, [hasProgressVolumeData, clearProgressVolumeHideTimeout, progressVolumePointerOpacity]);

    useEffect(() => {
        if (hasProgressOneRmData) return;
        clearProgressOneRmHideTimeout();
        Animated.timing(progressOneRmPointerOpacity, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
        }).start();
        if (progressOneRmActiveIndexRef.current != null) {
            progressOneRmActiveIndexRef.current = null;
            setProgressOneRmActiveIndex(null);
        }
    }, [hasProgressOneRmData, clearProgressOneRmHideTimeout, progressOneRmPointerOpacity]);

    useEffect(() => {
        if (hasProgressRepsData) return;
        clearProgressRepsHideTimeout();
        Animated.timing(progressRepsPointerOpacity, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
        }).start();
        if (progressRepsActiveIndexRef.current != null) {
            progressRepsActiveIndexRef.current = null;
            setProgressRepsActiveIndex(null);
        }
    }, [hasProgressRepsData, clearProgressRepsHideTimeout, progressRepsPointerOpacity]);

    useEffect(() => {
        if (hasProgressPersonalRecordData) return;
        clearProgressPersonalRecordHideTimeout();
        Animated.timing(progressPersonalRecordPointerOpacity, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
        }).start();
        if (progressPersonalRecordActiveIndexRef.current != null) {
            progressPersonalRecordActiveIndexRef.current = null;
            setProgressPersonalRecordActiveIndex(null);
        }
    }, [
        hasProgressPersonalRecordData,
        clearProgressPersonalRecordHideTimeout,
        progressPersonalRecordPointerOpacity,
    ]);

    useEffect(
        () => () => {
            clearProgressVolumeHideTimeout();
            clearProgressOneRmHideTimeout();
            clearProgressRepsHideTimeout();
            clearProgressPersonalRecordHideTimeout();
        },
        [
            clearProgressVolumeHideTimeout,
            clearProgressOneRmHideTimeout,
            clearProgressRepsHideTimeout,
            clearProgressPersonalRecordHideTimeout,
        ]
    );

    const latestExerciseVolumeEntry = exerciseVolumeEntries.length
        ? exerciseVolumeEntries[exerciseVolumeEntries.length - 1]
        : null;
    const latestExerciseVolumeText = latestExerciseVolumeEntry
        ? formatNumberCompact(latestExerciseVolumeEntry.value)
        : '--';
    const latestExerciseVolumeInfo = latestExerciseVolumeEntry
        ? dayjs(latestExerciseVolumeEntry.recordedAt).format('MMM D, h:mm A')
        : 'No data yet';
    const volumeUnitLabel = toDisplayWeightUnit(weightUnit);
    const latestExerciseVolumeDeltaMeta = latestExerciseVolumeEntry
        ? buildMetricDeltaDisplay(latestExerciseVolumeEntry.increment, volumeUnitLabel)
        : null;

    const latestExerciseOneRmEntry = exerciseOneRmEntries.length
        ? exerciseOneRmEntries[exerciseOneRmEntries.length - 1]
        : null;
    const latestExerciseOneRmText = latestExerciseOneRmEntry
        ? formatNumberCompact(latestExerciseOneRmEntry.value)
        : '--';
    const latestExerciseOneRmInfo = latestExerciseOneRmEntry
        ? dayjs(latestExerciseOneRmEntry.recordedAt).format('MMM D, h:mm A')
        : 'No data yet';
    const latestExerciseOneRmDeltaMeta = latestExerciseOneRmEntry
        ? buildMetricDeltaDisplay(latestExerciseOneRmEntry.increment, volumeUnitLabel)
        : null;

    const latestExerciseRepsEntry = exerciseRepsEntries.length
        ? exerciseRepsEntries[exerciseRepsEntries.length - 1]
        : null;
    const latestExerciseRepsText = latestExerciseRepsEntry
        ? formatNumberCompact(latestExerciseRepsEntry.value)
        : '--';
    const latestExerciseRepsInfo = latestExerciseRepsEntry
        ? dayjs(latestExerciseRepsEntry.recordedAt).format('MMM D, h:mm A')
        : 'No data yet';
    const latestExerciseRepsDeltaMeta = latestExerciseRepsEntry
        ? buildMetricDeltaDisplay(latestExerciseRepsEntry.increment, 'reps', formatNumberCompact)
        : null;

    const latestExercisePersonalRecordEntry = exercisePersonalRecordEntries.length
        ? exercisePersonalRecordEntries[exercisePersonalRecordEntries.length - 1]
        : null;
    const latestExercisePersonalRecordText = latestExercisePersonalRecordEntry
        ? formatNumberCompact(latestExercisePersonalRecordEntry.value)
        : '--';
    const latestExercisePersonalRecordInfo = latestExercisePersonalRecordEntry
        ? dayjs(latestExercisePersonalRecordEntry.recordedAt).format('MMM D, h:mm A')
        : 'No data yet';
    const latestExercisePersonalRecordDeltaMeta = latestExercisePersonalRecordEntry
        ? buildMetricDeltaDisplay(
              latestExercisePersonalRecordEntry.increment,
              latestExercisePersonalRecordEntry.increment === 1 ? 'PR' : 'PRs',
              formatNumberCompact
          )
        : null;


    const weightColumnLabel = useMemo(() => {
        const normalized = typeof weightUnit === 'string' ? weightUnit.trim().toLowerCase() : '';
        if (normalized === 'kg') return 'kg';
        if (normalized === 'lb') return 'lb';
        if (!normalized) return 'lb';
        return normalized;
    }, [weightUnit]);

    useEffect(() => {
        const unsubscribe = subscribeUserData((payload) => {
            const next = normalizeSavedExercises(payload?.savedExercises);
            setSavedExercisesMap((prev) => {
                const prevSig = savedExercisesSignature(prev);
                const nextSig = savedExercisesSignature(next);
                if (prevSig === nextSig) return prev;
                return next;
            });
            const nextStats = normalizeStatsExercises(payload?.statsExercises);
            const nextStatsSig = statsExercisesSignature(nextStats);
            setStatsExercisesMap((prev) => {
                const prevSig = statsExercisesSignature(prev);
                if (prevSig === nextStatsSig) return prev;
                return nextStats;
            });
            const nextWorkouts = sanitizeCompletedWorkouts(payload?.completedWorkouts);
            const nextWorkoutsSig = completedWorkoutsSignature(nextWorkouts);
            setCompletedWorkouts((prev) => {
                const prevSig = completedWorkoutsSignature(prev);
                if (prevSig === nextWorkoutsSig) return prev;
                return nextWorkouts;
            });
            const nextUnit = resolvePreferredWeightUnit(payload);
            setWeightUnit((prev) => (prev === nextUnit ? prev : nextUnit));
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        try {
            const nextSig = savedExercisesSignature(savedExercisesMap);
            const globalNormalized = normalizeSavedExercises(global?.userData?.savedExercises);
            const globalSig = savedExercisesSignature(globalNormalized);
            if (nextSig !== globalSig) {
                if (!global.userData) global.userData = {};
                global.userData.savedExercises = savedExercisesMap || {};
                emitUserDataUpdate();
            }
        } catch {
            // ignore
        }
    }, [savedExercisesMap]);

    useSyncSavedExercises(savedExercisesMap);

    const handleBack = useCallback(() => {
        navigation.goBack?.();
    }, [navigation]);

    const handleToggleFavorite = useCallback(() => {
        if (!name) return;
        setSavedExercisesMap((prev) => {
            const exists = prev?.[name];
            if (exists) {
                const next = { ...prev };
                delete next[name];
                return next;
            }
            const next = {
                ...prev,
                [name]: {
                    name,
                    muscleGroup: normalizedMuscleGroup,
                    muscle: normalizedMuscleGroup,
                    slug: resolvedSlug,
                },
            };
            return next;
        });
    }, [name, normalizedMuscleGroup, resolvedSlug]);

    const handleNavigateToPastWorkout = useCallback(
        (entry) => {
            if (!entry) return;
            const wid = typeof entry?.wid === 'string' && entry.wid.trim() ? entry.wid.trim() : '';
            if (!wid) return;
            const workout = workoutsByWid.get(wid) || null;
            if (!workout) return;

            const sanitizedWorkout = sanitizeWorkoutForRouteShallow({ ...workout, wid });
            if (!sanitizedWorkout) return;

            if (!sanitizedWorkout.wid) sanitizedWorkout.wid = wid;

            const ownerUid = String(global?.userData?.uid || sanitizedWorkout?.creatorUID || sanitizedWorkout?.creatorUid || '');
            const ownerHandle = String(global?.userData?.handle || global?.userData?.username || sanitizedWorkout?.handle || '');
            const ownerName = String(global?.userData?.name || sanitizedWorkout?.ownerName || '');
            const workoutFallbackPfp = resolvePhotoURL(sanitizedWorkout, "");
            const ownerPfp = resolvePhotoURL(global?.userData, workoutFallbackPfp);
            const ownerPfpVersion = Number(global?.userData?.pfpVersion ?? sanitizedWorkout?.pfpVersion ?? 0);

            const params = {
                workout: sanitizedWorkout,
                owner: {
                    uid: ownerUid,
                    handle: ownerHandle,
                    name: ownerName,
                    pfp: ownerPfp,
                    photoURL: ownerPfp,
                    pfpVersion: ownerPfpVersion,
                    rankTier: global?.userData?.rankTier ?? global?.userData?.currentRank?.tier ?? global?.userData?.currentRank?.rankTier ?? global?.userData?.rank?.tier ?? global?.userData?.rank?.rankTier ?? sanitizedWorkout?.rankTier ?? sanitizedWorkout?.currentRank?.tier ?? sanitizedWorkout?.currentRank?.rankTier ?? sanitizedWorkout?.rank?.tier ?? sanitizedWorkout?.rank?.rankTier ?? null,
                    currentRank: global?.userData?.currentRank || sanitizedWorkout?.currentRank || null,
                    rank: global?.userData?.rank || sanitizedWorkout?.rank || null,
                },
            };

            if (!navigateOneWay('PastWorkout', { animation: 'slide-from-right', params })) {
                navigation.navigate('PastWorkout', params);
            }
        },
        [navigation, workoutsByWid]
    );

    const renderProgress = () => {
        const noData =
            !hasProgressVolumeData &&
            !hasProgressOneRmData &&
            !hasProgressRepsData &&
            !hasProgressPersonalRecordData;
        if (noData) {
            return (
                <View style={styles.placeholder}>
                    <Text style={styles.placeholderTitle}>No progress yet</Text>
                    <Text style={styles.placeholderBody}>
                        Log sets for {displayTitle} to visualize 1RM, volume, reps, and records trends here.
                    </Text>
                </View>
            );
        }

        const progressMetricConfigs = {
            volume: {
                key: 'volume',
                title: 'Volume',
                hasData: hasProgressVolumeData,
                latestText: latestExerciseVolumeText,
                latestUnit: volumeUnitLabel,
                pointerUnit: volumeUnitLabel,
                deltaMeta: latestExerciseVolumeDeltaMeta,
                summaryText: latestExerciseVolumeInfo,
                ticks: progressVolumeTicks,
                axisMetrics: progressVolumeAxisMetrics,
                series: progressVolumeSeries,
                xAxisLabels: progressVolumeXAxisLabels,
                panHandlers: progressVolumePanResponder.panHandlers,
                activePoint: progressVolumeActivePoint,
                activeIndex: progressVolumeActiveIndex,
                pointerOpacity: progressVolumePointerOpacity,
                pointerLeft: progressVolumePointerLeft,
                pointerWidth: progressVolumePointerWidth,
                pointerRightAligned: progressVolumePointerRightAligned,
                points: progressVolumePoints,
                entries: exerciseVolumeEntries,
                pointerComponent: ExerciseVolumePointerLabel,
                gradientId: 'exerciseVolumeGradient',
                ...buildMetricColors(METRIC_COLORS.volume),
            },
            reps: {
                key: 'reps',
                title: 'Reps',
                hasData: hasProgressRepsData,
                latestText: latestExerciseRepsText,
                latestUnit: 'reps',
                pointerUnit: null,
                deltaMeta: latestExerciseRepsDeltaMeta,
                summaryText: latestExerciseRepsInfo,
                ticks: progressRepsTicks,
                axisMetrics: progressRepsAxisMetrics,
                series: progressRepsSeries,
                xAxisLabels: progressRepsXAxisLabels,
                panHandlers: progressRepsPanResponder.panHandlers,
                activePoint: progressRepsActivePoint,
                activeIndex: progressRepsActiveIndex,
                pointerOpacity: progressRepsPointerOpacity,
                pointerLeft: progressRepsPointerLeft,
                pointerWidth: progressRepsPointerWidth,
                pointerRightAligned: progressRepsPointerRightAligned,
                points: progressRepsPoints,
                entries: exerciseRepsEntries,
                pointerComponent: ExerciseRepsPointerLabel,
                gradientId: 'exerciseRepsGradient',
                ...buildMetricColors(METRIC_COLORS.reps),
            },
            prs: {
                key: 'prs',
                title: 'Personal Records',
                hasData: hasProgressPersonalRecordData,
                latestText: latestExercisePersonalRecordText,
                latestUnit: 'records',
                pointerUnit: volumeUnitLabel,
                deltaMeta: latestExercisePersonalRecordDeltaMeta,
                summaryText: latestExercisePersonalRecordInfo,
                ticks: progressPersonalRecordTicks,
                axisMetrics: progressPersonalRecordAxisMetrics,
                series: progressPersonalRecordSeries,
                xAxisLabels: progressPersonalRecordXAxisLabels,
                panHandlers: progressPersonalRecordPanResponder.panHandlers,
                activePoint: progressPersonalRecordActivePoint,
                activeIndex: progressPersonalRecordActiveIndex,
                pointerOpacity: progressPersonalRecordPointerOpacity,
                pointerLeft: progressPersonalRecordPointerLeft,
                pointerWidth: progressPersonalRecordPointerWidth,
                pointerRightAligned: progressPersonalRecordPointerRightAligned,
                points: progressPersonalRecordPoints,
                entries: exercisePersonalRecordEntries,
                pointerComponent: ExercisePersonalRecordPointerLabel,
                gradientId: 'exercisePersonalRecordGradient',
                ...buildMetricColors(METRIC_COLORS.prs),
            },
        };

        const progressMetricTabs = [
            { key: 'volume', label: 'Volume', hasData: hasProgressVolumeData, icon: 'bar-chart-outline' },
            { key: 'reps', label: 'Reps', hasData: hasProgressRepsData, icon: 'stats-chart-outline' },
            { key: 'prs', label: 'PRs', hasData: hasProgressPersonalRecordData, icon: 'trophy-outline' },
        ];

        const activeProgressMetricConfig =
            progressMetricConfigs[activeProgressMetric]?.hasData
                ? progressMetricConfigs[activeProgressMetric]
                : Object.values(progressMetricConfigs).find((cfg) => cfg.hasData) || null;
        const ActivePointerComponent = activeProgressMetricConfig?.pointerComponent || null;

        return (
            <View style={styles.progressSection}>
                {hasProgressOneRmData ? (
                    <View
                        style={[
                            chartCardLayout.card,
                            styles.progressCard,
                            { paddingHorizontal: progressCardHorizontalPadding },
                        ]}
                    >
                        <View style={chartCardLayout.header}>
                            <Text style={[chartCardTypography.sectionTitle, styles.progressSectionTitle]}>
                                Estimated 1RM
                            </Text>
                            <View style={styles.progressAutoHintWrapper}>
                                <Text style={[chartCardTypography.hint, styles.progressAutoHint]}>Auto-updates from</Text>
                                <Text style={[chartCardTypography.hint, styles.progressAutoHint]}>completed workouts.</Text>
                            </View>
                        </View>

                        <View style={chartCardLayout.metricsRow}>
                            <View style={chartCardLayout.valueGroup}>
                                <Text style={chartCardTypography.metricValue}>{latestExerciseOneRmText}</Text>
                                <Text style={[chartCardTypography.metricUnit, styles.progressUnit]}>{volumeUnitLabel}</Text>
                                {latestExerciseOneRmDeltaMeta ? (
                                    <View style={chartCardLayout.deltaGroup}>
                                        <Ionicons
                                            name={latestExerciseOneRmDeltaMeta.icon}
                                            size={scaleSize(17)}
                                            color={latestExerciseOneRmDeltaMeta.color}
                                            style={styles.progressDeltaIcon}
                                        />
                                        <Text
                                            style={[
                                                chartCardTypography.deltaValue,
                                                { color: latestExerciseOneRmDeltaMeta.color },
                                            ]}
                                        >
                                            {latestExerciseOneRmDeltaMeta.text}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                            <Text style={[chartCardTypography.summary, styles.progressSummaryText]}>
                                {latestExerciseOneRmInfo}
                            </Text>
                        </View>

                        <View
                            style={[
                                styles.progressChartWrapper,
                                {
                                    height: progressChartHeight,
                                    width: progressChartWidth,
                                    paddingTop: progressChartPaddingTop,
                                    paddingBottom: progressChartPaddingBottom,
                                },
                            ]}
                        >
                            <View style={styles.progressChartContent}>
                                <View
                                    style={[
                                        styles.progressYAxisLabels,
                                        { width: progressYAxisLabelWidth, height: progressChartHeight },
                                    ]}
                                    pointerEvents="none"
                                >
                                    {progressOneRmTicks.map((value, index) => {
                                        const range = Math.max(
                                            (progressOneRmAxisMetrics?.maxValue ?? 0) -
                                                (progressOneRmAxisMetrics?.minValue ?? 0),
                                            1
                                        );
                                        const ratio =
                                            (value - (progressOneRmAxisMetrics?.minValue ?? 0)) / range;
                                        const clampedRatio = Number.isFinite(ratio)
                                            ? Math.min(Math.max(ratio, 0), 1)
                                            : 0;
                                        const yPosition =
                                            progressTopMargin + progressInnerHeight * (1 - clampedRatio);
                                        const approxLabelHeight = scaleSize(14);
                                        const top = Math.min(
                                            progressChartHeight - progressBottomMargin - approxLabelHeight,
                                            Math.max(
                                                progressTopMargin - approxLabelHeight / 2,
                                                yPosition - approxLabelHeight / 2
                                            )
                                        );

                                        return (
                                            <Text
                                                key={`exercise-orm-y-label-${value}-${index}`}
                                                style={[
                                                    chartTypography.axisLabel,
                                                    styles.progressYAxisLabel,
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
                                        styles.progressChartCanvas,
                                        { width: progressPlotWidth, height: progressChartHeight },
                                    ]}
                                    {...progressOneRmPanResponder.panHandlers}
                                >
                                    <Svg width={progressPlotWidth} height={progressChartHeight}>
                                        <Defs>
                                            <LinearGradient
                                                id="exerciseOneRmGradient"
                                                x1="0"
                                                y1="0"
                                                x2="0"
                                                y2="1"
                                            >
                                                <Stop offset="0%" stopColor="#C19CFF" stopOpacity="0.32" />
                                                <Stop offset="100%" stopColor="#7B5DD6" stopOpacity="0.08" />
                                            </LinearGradient>
                                        </Defs>

                                        {progressOneRmTicks.map((value, index) => {
                                            const range = Math.max(
                                                (progressOneRmAxisMetrics?.maxValue ?? 0) -
                                                    (progressOneRmAxisMetrics?.minValue ?? 0),
                                                1
                                            );
                                            const ratio =
                                                (value - (progressOneRmAxisMetrics?.minValue ?? 0)) /
                                                range;
                                            const clampedRatio = Number.isFinite(ratio)
                                                ? Math.min(Math.max(ratio, 0), 1)
                                                : 0;
                                            const y =
                                                progressTopMargin + progressInnerHeight * (1 - clampedRatio);
                                            return (
                                                <Line
                                                    key={`exercise-orm-grid-${value}-${index}`}
                                                    x1={progressLeftMargin}
                                                    y1={y}
                                                    x2={progressPlotWidth - progressRightMargin}
                                                    y2={y}
                                                    stroke="rgba(255,255,255,0.1)"
                                                    strokeWidth={StyleSheet.hairlineWidth}
                                                    strokeDasharray={[6, 6]}
                                                />
                                            );
                                        })}

                                        {progressOneRmSeries.areaPath ? (
                                            <Path
                                                d={progressOneRmSeries.areaPath}
                                                fill="url(#exerciseOneRmGradient)"
                                                stroke="none"
                                            />
                                        ) : null}

                                        {progressOneRmSeries.linePath ? (
                                            <Path
                                                d={progressOneRmSeries.linePath}
                                                fill="none"
                                                stroke="#B589FF"
                                                strokeWidth={scaleSize(3)}
                                                strokeLinejoin="round"
                                                strokeLinecap="round"
                                            />
                                        ) : null}

                                        <Line
                                            x1={progressLeftMargin}
                                            y1={progressTopMargin}
                                            x2={progressLeftMargin}
                                            y2={progressBaselineY}
                                            stroke="rgba(148, 157, 172, 0.35)"
                                            strokeWidth={StyleSheet.hairlineWidth}
                                        />
                                        <Line
                                            x1={progressLeftMargin}
                                            y1={progressBaselineY}
                                            x2={progressPlotWidth - progressRightMargin}
                                            y2={progressBaselineY}
                                            stroke="rgba(148, 157, 172, 0.35)"
                                            strokeWidth={StyleSheet.hairlineWidth}
                                        />

                                        {progressOneRmActivePoint ? (
                                            <Line
                                                x1={progressOneRmActivePoint.x}
                                                y1={progressTopMargin}
                                                x2={progressOneRmActivePoint.x}
                                                y2={progressBaselineY}
                                                stroke="rgba(181, 137, 255, 0.6)"
                                                strokeWidth={progressPointerStripWidth}
                                            />
                                        ) : null}

                                        {progressOneRmPoints.map((point, index) => {
                                            const isActive = index === progressOneRmActiveIndex;
                                            const radius = isActive ? scaleSize(6) : scaleSize(4.2);
                                            const strokeWidth = isActive ? scaleSize(2) : scaleSize(1);
                                            const strokeColor = isActive
                                                ? 'rgba(181, 137, 255, 0.9)'
                                                : 'rgba(181, 137, 255, 0.5)';
                                            const fillColor = isActive
                                                ? '#F1E9FF'
                                                : 'rgba(241, 233, 255, 0.82)';
                                            return (
                                                <Circle
                                                    key={`exercise-orm-point-${index}`}
                                                    cx={point.x}
                                                    cy={point.y}
                                                    r={radius}
                                                    fill={fillColor}
                                                    stroke={strokeColor}
                                                    strokeWidth={strokeWidth}
                                                />
                                            );
                                        })}
                                    </Svg>

                                    {progressOneRmXAxisLabels.length ? (
                                        <View
                                            pointerEvents="none"
                                            style={[
                                                styles.progressXAxisOverlay,
                                                {
                                                    left: progressLeftMargin,
                                                    right: progressRightMargin,
                                                    justifyContent:
                                                        progressOneRmXAxisLabels.length > 1
                                                            ? 'space-between'
                                                            : 'center',
                                                },
                                            ]}
                                        >
                                            {progressOneRmXAxisLabels.map((item, index) => (
                                                <Text
                                                    key={`exercise-orm-x-label-${item.timestamp ?? index}-${index}`}
                                                    style={[chartTypography.axisLabel, styles.progressXAxisLabel]}
                                                >
                                                    {item.label}
                                                </Text>
                                            ))}
                                        </View>
                                    ) : null}

                                    {progressOneRmActivePoint ? (
                                        <Animated.View
                                            pointerEvents="box-none"
                                            style={[
                                                chartPointerStyles.container,
                                                {
                                                    left: progressOneRmPointerLeft,
                                                    top: Math.max(
                                                        scaleSize(-8),
                                                        progressTopMargin - scaleSize(72)
                                                    ),
                                                    width: progressOneRmPointerWidth,
                                                    opacity: progressOneRmPointerOpacity,
                                                },
                                            ]}
                                        >
                                            <ExerciseOneRmPointerLabel
                                                entry={exerciseOneRmEntries[progressOneRmActiveIndex]}
                                                unit={volumeUnitLabel}
                                                isRightAligned={progressOneRmPointerRightAligned}
                                                onWorkoutPress={handleNavigateToPastWorkout}
                                            />
                                        </Animated.View>
                                    ) : null}
                                </View>
                            </View>
                        </View>

                    </View>
                ) : null}

                {activeProgressMetricConfig ? (
                    <View
                        style={[
                            chartCardLayout.card,
                            styles.progressCard,
                            { paddingHorizontal: progressCardHorizontalPadding },
                        ]}
                    >
                        <View style={chartCardLayout.header}>
                            <Text style={[chartCardTypography.sectionTitle, styles.progressSectionTitle]}>
                                {activeProgressMetricConfig.title}
                            </Text>
                            <View style={styles.progressAutoHintWrapper}>
                                <Text style={[chartCardTypography.hint, styles.progressAutoHint]}>Auto-updates from</Text>
                                <Text style={[chartCardTypography.hint, styles.progressAutoHint]}>completed workouts.</Text>
                            </View>
                        </View>

                        <View style={chartCardLayout.metricsRow}>
                            <View style={chartCardLayout.valueGroup}>
                                <Text style={chartCardTypography.metricValue}>
                                    {activeProgressMetricConfig.latestText}
                                </Text>
                                <Text style={[chartCardTypography.metricUnit, styles.progressUnit]}>
                                    {activeProgressMetricConfig.latestUnit}
                                </Text>
                                {activeProgressMetricConfig.deltaMeta ? (
                                    <View style={chartCardLayout.deltaGroup}>
                                        <Ionicons
                                            name={activeProgressMetricConfig.deltaMeta.icon}
                                            size={scaleSize(17)}
                                            color={activeProgressMetricConfig.deltaMeta.color}
                                            style={styles.progressDeltaIcon}
                                        />
                                        <Text
                                            style={[
                                                chartCardTypography.deltaValue,
                                                { color: activeProgressMetricConfig.deltaMeta.color },
                                            ]}
                                        >
                                            {activeProgressMetricConfig.deltaMeta.text}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                            <Text style={[chartCardTypography.summary, styles.progressSummaryText]}>
                                {activeProgressMetricConfig.summaryText}
                            </Text>
                        </View>

                        <View
                            style={[
                                styles.progressChartWrapper,
                                {
                                    height: progressChartHeight,
                                    width: progressChartWidth,
                                    paddingTop: progressChartPaddingTop,
                                    paddingBottom: progressChartPaddingBottom,
                                },
                            ]}
                        >
                            <View style={styles.progressChartContent}>
                                <View
                                    style={[
                                        styles.progressYAxisLabels,
                                        { width: progressYAxisLabelWidth, height: progressChartHeight },
                                    ]}
                                    pointerEvents="none"
                                >
                                    {activeProgressMetricConfig.ticks.map((value, index) => {
                                        const range = Math.max(
                                            (activeProgressMetricConfig.axisMetrics?.maxValue ?? 0) -
                                                (activeProgressMetricConfig.axisMetrics?.minValue ?? 0),
                                            1
                                        );
                                        const ratio =
                                            (value - (activeProgressMetricConfig.axisMetrics?.minValue ?? 0)) / range;
                                        const clampedRatio = Number.isFinite(ratio)
                                            ? Math.min(Math.max(ratio, 0), 1)
                                            : 0;
                                        const yPosition =
                                            progressTopMargin + progressInnerHeight * (1 - clampedRatio);
                                        const approxLabelHeight = scaleSize(14);
                                        const top = Math.min(
                                            progressChartHeight - progressBottomMargin - approxLabelHeight,
                                            Math.max(
                                                progressTopMargin - approxLabelHeight / 2,
                                                yPosition - approxLabelHeight / 2
                                            )
                                        );

                                        return (
                                            <Text
                                                key={`${activeProgressMetricConfig.key}-y-label-${value}-${index}`}
                                                style={[
                                                    chartTypography.axisLabel,
                                                    styles.progressYAxisLabel,
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
                                        styles.progressChartCanvas,
                                        { width: progressPlotWidth, height: progressChartHeight },
                                    ]}
                                    {...(activeProgressMetricConfig.panHandlers || {})}
                                >
                                    <Svg width={progressPlotWidth} height={progressChartHeight}>
                                        <Defs>
                                            <LinearGradient
                                                id={activeProgressMetricConfig.gradientId}
                                                x1="0"
                                                y1="0"
                                                x2="0"
                                                y2="1"
                                            >
                                                <Stop
                                                    offset="0%"
                                                    stopColor={activeProgressMetricConfig.gradientFrom}
                                                    stopOpacity="0.3"
                                                />
                                                <Stop
                                                    offset="100%"
                                                    stopColor={activeProgressMetricConfig.gradientTo}
                                                    stopOpacity="0.08"
                                                />
                                            </LinearGradient>
                                        </Defs>

                                        {activeProgressMetricConfig.ticks.map((value, index) => {
                                            const range = Math.max(
                                                (activeProgressMetricConfig.axisMetrics?.maxValue ?? 0) -
                                                    (activeProgressMetricConfig.axisMetrics?.minValue ?? 0),
                                                1
                                            );
                                            const ratio =
                                                (value - (activeProgressMetricConfig.axisMetrics?.minValue ?? 0)) /
                                                range;
                                            const clampedRatio = Number.isFinite(ratio)
                                                ? Math.min(Math.max(ratio, 0), 1)
                                                : 0;
                                            const y =
                                                progressTopMargin + progressInnerHeight * (1 - clampedRatio);
                                            return (
                                                <Line
                                                    key={`${activeProgressMetricConfig.key}-grid-${value}-${index}`}
                                                    x1={progressLeftMargin}
                                                    y1={y}
                                                    x2={progressPlotWidth - progressRightMargin}
                                                    y2={y}
                                                    stroke="rgba(255,255,255,0.1)"
                                                    strokeWidth={StyleSheet.hairlineWidth}
                                                    strokeDasharray={[6, 6]}
                                                />
                                            );
                                        })}

                                        {activeProgressMetricConfig.series.areaPath ? (
                                            <Path
                                                d={activeProgressMetricConfig.series.areaPath}
                                                fill={`url(#${activeProgressMetricConfig.gradientId})`}
                                                stroke="none"
                                            />
                                        ) : null}

                                        {activeProgressMetricConfig.series.linePath ? (
                                            <Path
                                                d={activeProgressMetricConfig.series.linePath}
                                                fill="none"
                                                stroke={activeProgressMetricConfig.lineColor}
                                                strokeWidth={scaleSize(3)}
                                                strokeLinejoin="round"
                                                strokeLinecap="round"
                                            />
                                        ) : null}

                                        <Line
                                            x1={progressLeftMargin}
                                            y1={progressTopMargin}
                                            x2={progressLeftMargin}
                                            y2={progressBaselineY}
                                            stroke="rgba(148, 157, 172, 0.35)"
                                            strokeWidth={StyleSheet.hairlineWidth}
                                        />
                                        <Line
                                            x1={progressLeftMargin}
                                            y1={progressBaselineY}
                                            x2={progressPlotWidth - progressRightMargin}
                                            y2={progressBaselineY}
                                            stroke="rgba(148, 157, 172, 0.35)"
                                            strokeWidth={StyleSheet.hairlineWidth}
                                        />

                                        {activeProgressMetricConfig.activePoint ? (
                                            <Line
                                                x1={activeProgressMetricConfig.activePoint.x}
                                                y1={progressTopMargin}
                                                x2={activeProgressMetricConfig.activePoint.x}
                                                y2={progressBaselineY}
                                                stroke={activeProgressMetricConfig.stripColor}
                                                strokeWidth={progressPointerStripWidth}
                                            />
                                        ) : null}

                                        {activeProgressMetricConfig.points.map((point, index) => (
                                            <ChartBubble
                                                key={`${activeProgressMetricConfig.key}-point-${index}`}
                                                cx={point.x}
                                                cy={point.y}
                                                isActive={index === activeProgressMetricConfig.activeIndex}
                                                accent={activeProgressMetricConfig.accent || CHART_ACCENTS.standard}
                                            />
                                        ))}
                                    </Svg>

                                    {activeProgressMetricConfig.xAxisLabels.length ? (
                                        <View
                                            pointerEvents="none"
                                            style={[
                                                styles.progressXAxisOverlay,
                                                {
                                                    left: progressLeftMargin,
                                                    right: progressRightMargin,
                                                    justifyContent:
                                                        activeProgressMetricConfig.xAxisLabels.length > 1
                                                            ? 'space-between'
                                                            : 'center',
                                                },
                                            ]}
                                        >
                                            {activeProgressMetricConfig.xAxisLabels.map((item, index) => (
                                                <Text
                                                    key={`${activeProgressMetricConfig.key}-x-label-${item.timestamp ?? index}-${index}`}
                                                    style={[chartTypography.axisLabel, styles.progressXAxisLabel]}
                                                >
                                                    {item.label}
                                                </Text>
                                            ))}
                                        </View>
                                    ) : null}

                                    {activeProgressMetricConfig.activePoint && ActivePointerComponent ? (
                                        <Animated.View
                                            pointerEvents="box-none"
                                            style={[
                                                chartPointerStyles.container,
                                                {
                                                    left: activeProgressMetricConfig.pointerLeft,
                                                    top: Math.max(scaleSize(-8), progressTopMargin - scaleSize(72)),
                                                    width: activeProgressMetricConfig.pointerWidth,
                                                    opacity: activeProgressMetricConfig.pointerOpacity,
                                                },
                                            ]}
                                        >
                                            <ActivePointerComponent
                                                entry={
                                                    activeProgressMetricConfig.entries[
                                                        activeProgressMetricConfig.activeIndex
                                                    ]
                                                }
                                                unit={
                                                    activeProgressMetricConfig.pointerUnit ??
                                                    activeProgressMetricConfig.latestUnit
                                                }
                                                isRightAligned={activeProgressMetricConfig.pointerRightAligned}
                                                onWorkoutPress={handleNavigateToPastWorkout}
                                            />
                                        </Animated.View>
                                    ) : null}
                                </View>
                            </View>
                        </View>

                        <View style={styles.metricToggleRowContainer}>
                            <View style={styles.metricToggleRow}>
                                {progressMetricTabs.map((tab) => {
                                    const isActive = tab.key === activeProgressMetric;
                                    const disabled = !tab.hasData;
                                    const palette = METRIC_COLORS[tab.key] || {};
                                    const activeLabelColor = palette.toggleLabel || theme.textPrimary || '#F6F8FF';
                                    const activeBackground = palette.toggleActiveBg || 'rgba(45, 158, 255, 0.22)';
                                    const activeBorderColor = palette.toggleBorder || theme.primary || '#2D9EFF';
                                    const iconColor = isActive
                                        ? activeLabelColor
                                        : 'rgba(216,226,255,0.75)';
                                    return (
                                        <Pressable
                                            key={tab.key}
                                            onPress={() => setActiveProgressMetric(tab.key)}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Show ${tab.label} progress`}
                                            style={[
                                                styles.metricToggleButton,
                                                isActive && styles.metricToggleButtonActive,
                                                isActive
                                                    ? {
                                                        backgroundColor: activeBackground,
                                                        borderColor: activeBorderColor,
                                                    }
                                                    : null,
                                                !tab.hasData && !isActive && styles.metricToggleButtonMuted,
                                            ]}
                                            disabled={disabled}
                                        >
                                            {tab.icon ? (
                                                <Ionicons
                                                    name={tab.icon}
                                                    size={scaleSize(16)}
                                                    color={iconColor}
                                                    style={styles.metricToggleIcon}
                                                />
                                            ) : null}
                                            <Text
                                                style={[
                                                    styles.metricToggleLabel,
                                                    isActive && styles.metricToggleLabelActive,
                                                    isActive ? { color: activeLabelColor } : null,
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
                ) : null}
            </View>
        );
    };

    let tabContent = null;
    if (activeTab === 'history') {
        tabContent = (
            <ExerciseHistoryTab
                historySessions={historySessions}
                displayTitle={displayTitle}
                weightColumnLabel={weightColumnLabel}
            />
        );
    } else if (activeTab === 'progress') {
        tabContent = renderProgress();
    } else {
        tabContent = (
            <ExerciseAboutTab
                name={name}
                muscleGroup={muscleGroup}
                equipment={equipment}
                isFavorite={isFavorite}
                favoriteButtonLabel={favoriteButtonLabel}
                favoriteAccessibilityLabel={favoriteAccessibilityLabel}
                onToggleFavorite={handleToggleFavorite}
                howToSteps={howToSteps}
                displayTitle={displayTitle}
            />
        );
    }

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeTop} edges={["top", "left", "right"]} />
            <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
                <View style={[styles.header, { paddingTop: headerTopPadding }]}>
                    <Pressable
                        onPress={withStrongPress(handleBack)}
                        style={styles.backButton}
                        hitSlop={12}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                    >
                        <Ionicons name="chevron-back" size={scaleSize(24)} color={theme.textPrimary} />
                    </Pressable>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {displayTitle}
                    </Text>
                    <View style={styles.headerSideSpacer} />
                </View>

                <View style={styles.tabBar}>
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.key;
                        return (
                            <Pressable
                                key={tab.key}
                                onPress={withStrongPress(() => setActiveTab(tab.key))}
                                style={styles.tabItem}
                                accessibilityRole="tab"
                                accessibilityState={{ selected: isActive }}
                            >
                                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                                    {tab.label}
                                </Text>
                                <View style={[styles.tabIndicator, isActive && styles.tabIndicatorActive]} />
                            </Pressable>
                        );
                    })}
                </View>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: scaleSize(32) },
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    {tabContent}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
