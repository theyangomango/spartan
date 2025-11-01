import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    Share,
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
import { DEVICE_WIDTH, scaleSize, ts } from '../components/2_Competition/layoutConstants';
import { chartPointerStyles, chartTypography } from '../components/charts/chartStyles';
import ExerciseImagePreview from '../components/3_Workout/NewWorkout/SelectExercise/ExerciseImagePreview';
import { toExerciseSlug } from '../components/common/exerciseImageMap';
import { withStrongPress } from '../utils/haptics';
import { navigateOneWay } from '../../navigationRef';
import useSyncSavedExercises from '../hooks/useSyncSavedExercises';
import { subscribeUserData, emitUserDataUpdate } from '../utils/userDataEvents';
import calculate1RM from '../helper/calculate1RM';

const TABS = [
    { key: 'about', label: 'About' },
    { key: 'progress', label: 'Progress' },
    { key: 'history', label: 'History' },
];

const STEP_SOURCE_KEYS = ['howToSteps', 'instructions', 'steps', 'howTo'];

const normalizeSavedExercises = (raw) => {
    if (!raw) return {};
    if (Array.isArray(raw)) {
        return raw.reduce((acc, entry) => {
            if (!entry) return acc;
            const name = String(entry?.name || entry).trim();
            if (!name) return acc;
            const muscleGroup = entry?.muscleGroup ?? entry?.muscle ?? null;
            acc[name] = {
                name,
                muscleGroup,
                muscle: entry?.muscle ?? entry?.muscleGroup ?? muscleGroup ?? null,
                slug: entry?.slug ?? null,
            };
            return acc;
        }, {});
    }
    if (typeof raw === 'object') {
        return Object.entries(raw).reduce((acc, [key, value]) => {
            if (!value && value !== 0) return acc;
            const name = String(value?.name || key).trim();
            if (!name) return acc;
            const muscleGroup = value?.muscleGroup ?? value?.muscle ?? null;
            acc[name] = {
                name,
                muscleGroup,
                muscle: value?.muscle ?? value?.muscleGroup ?? muscleGroup ?? null,
                slug: value?.slug ?? null,
            };
            return acc;
        }, {});
    }
    return {};
};

const savedExercisesSignature = (map) => {
    if (!map || typeof map !== 'object') return '';
    const entries = Object.keys(map)
        .sort((a, b) => a.localeCompare(b))
        .map((key) => {
            const value = map[key] || {};
            return [
                key,
                value?.muscleGroup ?? null,
                value?.muscle ?? null,
                value?.slug ?? null,
            ];
        });
    return JSON.stringify(entries);
};

const getInitialSavedExercises = () => {
    try {
        return normalizeSavedExercises(global?.userData?.savedExercises);
    } catch {
        return {};
    }
};

const normalizeHowToSteps = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
        return raw
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter(Boolean);
    }
    if (typeof raw === 'string') {
        return raw
            .split(/\r?\n+/)
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return [];
};

const resolveProvidedHowToSteps = (exercise = {}) => {
    for (const key of STEP_SOURCE_KEYS) {
        const candidate = normalizeHowToSteps(exercise?.[key]);
        if (candidate.length) return candidate;
    }

    const howToObject = exercise?.howTo;
    if (howToObject && typeof howToObject === 'object') {
        const fromObject = normalizeHowToSteps(howToObject.steps || howToObject.items || howToObject.list || howToObject);
        if (fromObject.length) return fromObject;
    }

    return [];
};

const buildFallbackHowToSteps = ({ title, muscleGroup, equipment }) => {
    const safeTitle = typeof title === 'string' && title.trim() ? title.trim() : 'this exercise';

    let sanitizedEquipment =
        typeof equipment === 'string' && equipment.trim() && equipment.trim() !== '—'
            ? equipment.trim()
            : null;
    if (sanitizedEquipment) {
        const lowered = sanitizedEquipment.toLowerCase();
        if (['body weight', 'bodyweight', 'none', 'no equipment'].includes(lowered)) {
            sanitizedEquipment = null;
        }
    }
    const sanitizedMuscle =
        typeof muscleGroup === 'string' && muscleGroup.trim() && muscleGroup.trim() !== '—'
            ? muscleGroup.trim().toLowerCase()
            : 'target muscles';

    return [
        sanitizedEquipment
            ? `Set up for ${safeTitle} and position your equipment (${sanitizedEquipment}).`
            : `Set up for ${safeTitle} by getting into a strong, stable starting position.`,
        `Keep your ${sanitizedMuscle} engaged and move through a controlled range of motion.`,
        `Breathe steadily, focus on smooth reps, and reset before starting the next set.`,
    ];
};

const HISTORY_SESSION_LIMIT = 15;
const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const WORKOUT_TIMESTAMP_FIELDS = [
    'finishedAt',
    'completedAt',
    'updatedAt',
    'startedAt',
    'createdAt',
    'created',
];

const toMillisSafe = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? 0 : value.getTime();
    if (typeof value?.toMillis === 'function') {
        const result = Number(value.toMillis());
        return Number.isFinite(result) ? result : 0;
    }
    if (typeof value === 'object' && typeof value.seconds === 'number') {
        return value.seconds * 1000;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return 0;
        const numeric = Number(trimmed);
        if (Number.isFinite(numeric)) return numeric;
        const parsed = new Date(trimmed).getTime();
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

const parseDayKeyToDate = (dayKey) => {
    if (typeof dayKey !== 'string') return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey.trim());
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    const candidate = new Date(year, month, day);
    return Number.isNaN(candidate.getTime()) ? null : candidate;
};

const formatNumberCompact = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '0';
    const rounded = Math.round(num * 10) / 10;
    if (Math.abs(rounded - Math.round(rounded)) < 1e-6) return String(Math.round(rounded));
    return rounded.toFixed(1).replace(/\.0$/, '');
};

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
        if (formatted) labels.push({ label: formatted, timestamp });
    }

    return labels;
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
        min -= 1;
        max += 1;
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
    if (niceMax < paddedMax) niceMax += step;
    if (niceMin < 0) niceMin = 0;

    return { minValue: niceMin, maxValue: niceMax, step, sections };
};

const formatAxisValue = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '';
    const abs = Math.abs(num);
    const toScaledString = (scaled) => {
        if (Math.abs(scaled) >= 100) return Math.round(scaled).toString();
        const rounded = Math.round(scaled * 10) / 10;
        return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    };

    if (abs >= 1_000_000) return `${toScaledString(num / 1_000_000)}m`;
    if (abs >= 1_000) return `${toScaledString(num / 1_000)}k`;
    if (Math.abs(num) >= 100) return Math.round(num).toString();
    const rounded = Math.round(num * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

const buildChartSeries = (chartData, axisMetrics, geometry) => {
    const { leftMargin, innerWidth, topMargin, innerHeight, baselineY } = geometry;

    if (!Array.isArray(chartData) || chartData.length === 0) {
        return { points: [], linePath: '', areaPath: '', domain: null };
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

        const rawYRatio = (Number(point.value) - minY) / yRange;
        const yRatio = Number.isFinite(rawYRatio) ? Math.min(Math.max(rawYRatio, 0), 1) : 0;
        const y = topMargin + innerHeight * (1 - yRatio);

        return { ...point, x, y };
    });

    if (!points.length) {
        return {
            points,
            linePath: '',
            areaPath: '',
            domain: { minX, maxX, minY, maxY },
        };
    }

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    const linePath = points
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${roundCoord(point.x)} ${roundCoord(point.y)}`)
        .join(' ');

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

const ExerciseVolumePointerLabel = React.memo(({ entry, unit, isRightAligned, onWorkoutPress }) => {
    if (!entry) return null;
    const unitText = toDisplayWeightUnit(unit);
    const totalText = `${formatNumberCompact(entry.value)} ${unitText}`;
    const incrementText = entry.increment ? `+${formatNumberCompact(entry.increment)} ${unitText}` : null;
    const workoutName = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : null;
    const timestampText = dayjs(entry.recordedAt).format('MMM D, h:mm A');
    const canNavigate = typeof onWorkoutPress === 'function';

    return (
        <View
            pointerEvents="box-none"
            style={[
                chartPointerStyles.root,
                isRightAligned ? chartPointerStyles.alignRight : chartPointerStyles.alignLeft,
            ]}
        >
            <View
                style={[
                    chartPointerStyles.bubbleWrapper,
                    isRightAligned ? chartPointerStyles.alignRight : chartPointerStyles.alignLeft,
                ]}
            >
                <View style={chartPointerStyles.bubble}>
                    <Text style={chartTypography.pointerTitle}>{totalText}</Text>
                    {incrementText ? (
                        <Text
                            style={[
                                chartTypography.pointerSubtitle,
                                styles.progressPointerLineSpacing,
                                chartTypography.pointerAccentGreen,
                            ]}
                        >{`${incrementText} this workout`}</Text>
                    ) : null}
                    {workoutName ? (
                        canNavigate ? (
                            <Pressable
                                onPress={() => onWorkoutPress(entry)}
                                hitSlop={8}
                                accessibilityRole="link"
                                accessibilityLabel={`View workout ${workoutName}`}
                            >
                                <Text
                                    style={[
                                        chartTypography.pointerSubtitle,
                                        styles.progressPointerLineSpacing,
                                        chartTypography.pointerAccentBlue,
                                    ]}
                                >
                                    {workoutName}
                                </Text>
                            </Pressable>
                        ) : (
                            <Text
                                style={[
                                    chartTypography.pointerSubtitle,
                                    styles.progressPointerLineSpacing,
                                    chartTypography.pointerAccentBlue,
                                ]}
                            >
                                {workoutName}
                            </Text>
                        )
                    ) : null}
                    <Text
                        style={[
                            chartTypography.pointerTimestamp,
                            styles.progressPointerTimestampSpacing,
                        ]}
                    >
                        {timestampText}
                    </Text>
                </View>
            </View>
        </View>
    );
});

const ExerciseRepsPointerLabel = React.memo(({ entry, isRightAligned, onWorkoutPress }) => {
    if (!entry) return null;
    const totalText = `${formatNumberCompact(entry.value)} reps`;
    const incrementText = entry.increment ? `+${formatNumberCompact(entry.increment)} reps` : null;
    const workoutName = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : null;
    const timestampText = dayjs(entry.recordedAt).format('MMM D, h:mm A');
    const canNavigate = typeof onWorkoutPress === 'function';

    return (
        <View
            pointerEvents="box-none"
            style={[
                chartPointerStyles.root,
                isRightAligned ? chartPointerStyles.alignRight : chartPointerStyles.alignLeft,
            ]}
        >
            <View
                style={[
                    chartPointerStyles.bubbleWrapper,
                    isRightAligned ? chartPointerStyles.alignRight : chartPointerStyles.alignLeft,
                ]}
            >
                <View style={chartPointerStyles.bubble}>
                    <Text style={chartTypography.pointerTitle}>{totalText}</Text>
                    {incrementText ? (
                        <Text
                            style={[
                                chartTypography.pointerSubtitle,
                                styles.progressPointerLineSpacing,
                                chartTypography.pointerAccentGreen,
                            ]}
                        >{`${incrementText} this workout`}</Text>
                    ) : null}
                    {workoutName ? (
                        canNavigate ? (
                            <Pressable
                                onPress={() => onWorkoutPress(entry)}
                                hitSlop={8}
                                accessibilityRole="link"
                                accessibilityLabel={`View workout ${workoutName}`}
                            >
                                <Text
                                    style={[
                                        chartTypography.pointerSubtitle,
                                        styles.progressPointerLineSpacing,
                                        chartTypography.pointerAccentBlue,
                                    ]}
                                >
                                    {workoutName}
                                </Text>
                            </Pressable>
                        ) : (
                            <Text
                                style={[
                                    chartTypography.pointerSubtitle,
                                    styles.progressPointerLineSpacing,
                                    chartTypography.pointerAccentBlue,
                                ]}
                            >
                                {workoutName}
                            </Text>
                        )
                    ) : null}
                    <Text
                        style={[
                            chartTypography.pointerTimestamp,
                            styles.progressPointerTimestampSpacing,
                        ]}
                    >
                        {timestampText}
                    </Text>
                </View>
            </View>
        </View>
    );
});

const ExercisePersonalRecordPointerLabel = React.memo(
    ({ entry, unit, isRightAligned, onWorkoutPress }) => {
        if (!entry) return null;
        const totalText = `${formatNumberCompact(entry.value)} PRs`;
        const weightValue = Number(entry.weight) || 0;
        const repsValue = Number(entry.reps) || 0;
        const hasWeight = weightValue > 0;
        const hasReps = repsValue > 0;
        const formattedWeight = hasWeight ? `${formatWeightValue(weightValue)}${unit ? unit : ''}` : null;
        const formattedCombo =
            hasReps && hasWeight ? `${Math.round(repsValue)} x ${formattedWeight}` : null;
        const incrementValue = Number(entry.increment) || 0;
        const incrementText = incrementValue > 0 ? `+${formatNumberCompact(incrementValue)} PR${incrementValue === 1 ? '' : 's'}` : null;
        const workoutName = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : null;
        const timestampText = dayjs(entry.recordedAt).format('MMM D, h:mm A');
        const canNavigate = typeof onWorkoutPress === 'function';

        return (
            <View
                pointerEvents="box-none"
                style={[
                    chartPointerStyles.root,
                    isRightAligned ? chartPointerStyles.alignRight : chartPointerStyles.alignLeft,
                ]}
            >
                <View
                    style={[
                        chartPointerStyles.bubbleWrapper,
                        isRightAligned ? chartPointerStyles.alignRight : chartPointerStyles.alignLeft,
                    ]}
                >
                    <View style={chartPointerStyles.bubble}>
                        <Text style={chartTypography.pointerTitle}>{totalText}</Text>
                        {incrementText ? (
                            <Text
                                style={[
                                    chartTypography.pointerSubtitle,
                                    styles.progressPointerLineSpacing,
                                    chartTypography.pointerAccentGreen,
                                ]}
                            >
                                {incrementText} this workout
                            </Text>
                        ) : null}
                        {workoutName ? (
                            canNavigate ? (
                                <Pressable
                                    onPress={() => onWorkoutPress(entry)}
                                    hitSlop={8}
                                    accessibilityRole="link"
                                    accessibilityLabel={`View workout ${workoutName}`}
                                >
                                    <Text
                                        style={[
                                            chartTypography.pointerSubtitle,
                                            styles.progressPointerLineSpacing,
                                            chartTypography.pointerAccentBlue,
                                        ]}
                                    >
                                        {workoutName}
                                    </Text>
                                </Pressable>
                            ) : (
                                <Text
                                    style={[
                                        chartTypography.pointerSubtitle,
                                        styles.progressPointerLineSpacing,
                                        chartTypography.pointerAccentBlue,
                                    ]}
                                >
                                    {workoutName}
                                </Text>
                            )
                        ) : null}
                        {formattedCombo ? (
                            <Text
                                style={[
                                    chartTypography.pointerSubtitle,
                                    styles.progressPointerLineSpacing,
                                    chartTypography.pointerAccentBlue,
                                ]}
                            >
                                {formattedCombo}
                            </Text>
                        ) : null}
                        <Text
                            style={[
                                chartTypography.pointerTimestamp,
                                styles.progressPointerTimestampSpacing,
                            ]}
                        >
                            {timestampText}
                        </Text>
                    </View>
                </View>
            </View>
        );
    }
);

const formatWeightValue = (weight) => {
    const num = Number(weight);
    if (!Number.isFinite(num) || num <= 0) return '—';
    return formatNumberCompact(num);
};

const firstAvailableString = (...values) => {
    for (const value of values) {
        if (value === null || value === undefined) continue;
        if (typeof value === 'string' || typeof value === 'number') {
            const str = String(value).trim();
            if (str) return str;
        }
    }
    return '';
};

const sanitizeWorkoutForRoute = (workout) => {
    if (!workout || typeof workout !== 'object') return null;
    const replacer = (_key, value) => (typeof value === 'function' ? undefined : value);
    try {
        return JSON.parse(JSON.stringify(workout, replacer));
    } catch {
        const clone = { ...workout };
        if (Array.isArray(workout.exercises)) {
            clone.exercises = workout.exercises.map((exercise) => {
                if (!exercise || typeof exercise !== 'object') return {};
                const safeExercise = { ...exercise };
                if (Array.isArray(exercise.sets)) {
                    safeExercise.sets = exercise.sets.map((set) => {
                        if (!set || typeof set !== 'object') return {};
                        const safeSet = { ...set };
                        delete safeSet.onComplete;
                        delete safeSet.onDelete;
                        return safeSet;
                    });
                }
                return safeExercise;
            });
        }
        return clone;
    }
};

const deriveSessionTitle = (workout, timestamp) => {
    const candidate = firstAvailableString(
        workout?.templateName,
        workout?.template?.name,
        workout?.name,
        workout?.title,
        workout?.caption
    );
    if (candidate) return candidate;

    const date = timestamp ? new Date(timestamp) : null;
    if (date && !Number.isNaN(date.getTime())) {
        const hours = date.getHours();
        if (hours < 12) return 'Morning session';
        if (hours < 17) return 'Afternoon session';
        return 'Evening session';
    }
    return 'Workout session';
};

const buildSessionMeta = (timestamp, dayKey) => {
    let dateObj = null;
    if (timestamp) {
        const candidate = new Date(timestamp);
        if (!Number.isNaN(candidate.getTime())) dateObj = candidate;
    }
    if (!dateObj) {
        const parsed = parseDayKeyToDate(dayKey);
        if (parsed) dateObj = parsed;
    }
    if (!dateObj) return '';

    let datePart = '';
    let timePart = '';
    try {
        datePart = dateObj.toLocaleDateString(undefined, {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        datePart = '';
    }
    if (timestamp) {
        try {
            timePart = dateObj.toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
            });
        } catch {
            timePart = '';
        }
    }
    if (datePart && timePart) return `${datePart} at ${timePart}`;
    return datePart || timePart || '';
};

const setKeyForStatSet = (set) => {
    if (!set || typeof set !== 'object') return '';
    const weight = Number(set.weight);
    const reps = Number(set.reps);
    if (!Number.isFinite(weight) || !Number.isFinite(reps)) return '';
    return `${Math.round(weight * 1000)}:${Math.round(reps * 1000)}`;
};

const normalizeStatSet = (rawSet) => {
    if (!rawSet || typeof rawSet !== 'object') return null;
    const weight = Number(rawSet.weight ?? rawSet.kg ?? rawSet.lbs ?? rawSet.load ?? 0);
    const reps = Number(rawSet.reps ?? rawSet.rep ?? rawSet.r ?? 0);
    if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(reps) || reps <= 0) return null;
    const normalized = { weight, reps };

    if (typeof rawSet.date === 'string' && rawSet.date.trim()) normalized.date = rawSet.date.trim();

    if (rawSet.wid !== null && rawSet.wid !== undefined) {
        try {
            const widStr = String(rawSet.wid).trim();
            if (widStr) normalized.wid = widStr;
        } catch {
            // ignore
        }
    }

    const ts = toMillisSafe(rawSet.timestamp ?? rawSet.ts ?? null);
    if (ts) normalized.timestamp = ts;

    if (typeof rawSet.privacyMode === 'string' && rawSet.privacyMode.trim()) {
        normalized.privacyMode = rawSet.privacyMode.trim();
    }

    return normalized;
};

const normalizeStatsExercises = (raw) => {
    if (!raw || typeof raw !== 'object') return {};
    return Object.entries(raw).reduce((acc, [key, value]) => {
        if (!value || typeof value !== 'object') return acc;
        const sets = Array.isArray(value.sets) ? value.sets.map(normalizeStatSet).filter(Boolean) : [];
        acc[key] = { ...value, sets };
        return acc;
    }, {});
};

const extractWid = (workout) => {
    if (!workout || typeof workout !== 'object') return '';
    const candidates = [workout?.wid, workout?.id, workout?.workoutId, workout?.pid];
    for (const candidate of candidates) {
        if (candidate === null || candidate === undefined) continue;
        const str = String(candidate).trim();
        if (str) return str;
    }
    return '';
};

const resolveWorkoutTimestamp = (workout) => {
    if (!workout || typeof workout !== 'object') return 0;
    for (const field of WORKOUT_TIMESTAMP_FIELDS) {
        const ms = toMillisSafe(workout?.[field]);
        if (ms) return ms;
    }
    return 0;
};

const resolveSetTimestamp = (set, workoutsByWid) => {
    if (!set || typeof set !== 'object') return 0;
    const direct = toMillisSafe(set.timestamp);
    if (direct) return direct;
    const wid = set?.wid ? String(set.wid).trim() : '';
    if (wid && workoutsByWid && workoutsByWid.has(wid)) {
        const workout = workoutsByWid.get(wid);
        const workoutTs = resolveWorkoutTimestamp(workout);
        if (workoutTs) return workoutTs;
    }
    if (typeof set.date === 'string' && set.date.trim()) {
        const parsed = parseDayKeyToDate(set.date.trim());
        if (parsed) {
            parsed.setHours(12, 0, 0, 0);
            const dateTs = parsed.getTime();
            if (Number.isFinite(dateTs)) return dateTs;
        }
    }
    return 0;
};

const statsExercisesSignature = (map) => {
    if (!map || typeof map !== 'object') return '';
    const entries = Object.keys(map)
        .sort((a, b) => a.localeCompare(b))
        .map((key) => {
            const entry = map[key] || {};
            const sets = Array.isArray(entry.sets) ? entry.sets : [];
            const last = sets[sets.length - 1] || {};
            return [
                key,
                Number(entry?.['1RM'] || 0) || 0,
                sets.length,
                Number(last?.weight || 0) || 0,
                Number(last?.reps || 0) || 0,
                last?.date || null,
                last?.wid || null,
            ];
        });
    return JSON.stringify(entries);
};

const completedWorkoutsSignature = (list) => {
    if (!Array.isArray(list)) return '';
    const sample = list.slice(0, 40).map((workout) => {
        const wid = extractWid(workout);
        const ts = resolveWorkoutTimestamp(workout);
        return [wid, ts];
    });
    return JSON.stringify(sample);
};

const sanitizeCompletedWorkouts = (raw) => {
    if (!Array.isArray(raw)) return [];
    return raw.filter(Boolean);
};

const getInitialStatsExercises = () => {
    try {
        return normalizeStatsExercises(global?.userData?.statsExercises);
    } catch {
        return {};
    }
};

const getInitialCompletedWorkouts = () => {
    try {
        return sanitizeCompletedWorkouts(global?.userData?.completedWorkouts);
    } catch {
        return [];
    }
};

const resolvePreferredWeightUnit = (payload) => {
    const source = payload || (() => {
        try {
            return global?.userData || null;
        } catch {
            return null;
        }
    })();
    try {
        const raw = source?.settings?.units ?? source?.units;
        if (!raw) return 'lb';
        const normalized = String(raw).trim().toLowerCase();
        return normalized === 'kg' ? 'kg' : 'lb';
    } catch {
        return 'lb';
    }
};

const toDisplayWeightUnit = (unit, fallback = 'lbs') => {
    if (typeof unit === 'string') {
        const trimmed = unit.trim();
        const normalized = trimmed.toLowerCase();
        if (normalized) {
            if (normalized.startsWith('kg')) return 'kg';
            if (normalized === 'lb' || normalized === 'lbs' || normalized.startsWith('lb')) return 'lbs';
            return trimmed;
        }
    }
    return fallback;
};

const buildMetricDeltaDisplay = (delta, unitLabel, formatter = formatNumberCompact) => {
    const numericDelta = Number(delta);
    if (!Number.isFinite(numericDelta) || numericDelta === 0) return null;
    const absValue = Math.abs(numericDelta);
    const formattedValue = formatter(absValue);
    const sign = numericDelta > 0 ? '+' : '-';
    const icon = numericDelta > 0 ? 'arrow-up' : 'arrow-down';
    const color = numericDelta > 0 ? '#65F2B6' : '#FF6B6B';
    const suffix = unitLabel ? ` ${unitLabel}` : '';
    return {
        icon,
        color,
        text: `${sign}${formattedValue}${suffix}`,
    };
};

const findStatsEntry = (statsMap, exerciseName) => {
    if (!statsMap || typeof statsMap !== 'object') return null;
    if (!exerciseName) return null;
    if (statsMap[exerciseName]) return statsMap[exerciseName];
    const lower = exerciseName.toLowerCase();
    const match = Object.keys(statsMap).find((key) => key.toLowerCase() === lower);
    return match ? statsMap[match] : null;
};

export default function ExerciseDetail() {
    const navigation = useNavigation();
    const route = useRoute();
    const insets = useStableSafeAreaInsets();
    const [activeTab, setActiveTab] = useState('about');
    const [savedExercisesMap, setSavedExercisesMap] = useState(() => getInitialSavedExercises());
    const [statsExercisesMap, setStatsExercisesMap] = useState(() => getInitialStatsExercises());
    const [completedWorkouts, setCompletedWorkouts] = useState(() => getInitialCompletedWorkouts());
    const [weightUnit, setWeightUnit] = useState(() => resolvePreferredWeightUnit());
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

    const historySessions = useMemo(() => {
        const entry = exerciseStatsEntry;
        const sets = Array.isArray(entry?.sets) ? entry.sets : [];
        if (!sets.length) return [];

        const workoutsArray = Array.isArray(completedWorkouts) ? completedWorkouts : [];
        const workoutsByWid = new Map();
        workoutsArray.forEach((workout) => {
            const wid = extractWid(workout);
            if (wid) workoutsByWid.set(wid, workout);
        });

        const grouped = new Map();
        sets.forEach((set) => {
            const wid = set?.wid ? String(set.wid) : '';
            const dayKey = typeof set?.date === 'string' && set.date ? set.date : null;
            const groupKey = wid ? `wid:${wid}` : `day:${dayKey || 'unknown'}`;
            let session = grouped.get(groupKey);
            if (!session) {
                const workout = wid ? workoutsByWid.get(wid) : null;
                session = {
                    key: groupKey,
                    wid: wid || null,
                    dayKey,
                    workout,
                    sets: [],
                    timestamps: [],
                };
                grouped.set(groupKey, session);
            }
            const timestamp = toMillisSafe(set?.timestamp);
            if (timestamp) session.timestamps.push(timestamp);
            session.sets.push({
                weight: Number(set.weight) || 0,
                reps: Number(set.reps) || 0,
                raw: set,
            });
        });

        let bestSetKey = '';
        if (entry?.bestSet) {
            bestSetKey = setKeyForStatSet(entry.bestSet);
        }
        const recordedBest1RM = Number(entry?.['1RM']) || 0;
        let bestOneRm = recordedBest1RM > 0 ? recordedBest1RM : 0;
        if ((!bestOneRm || bestOneRm <= 0) && entry?.bestSet) {
            const computed = calculate1RM(
                Number(entry.bestSet.weight) || 0,
                Number(entry.bestSet.reps) || 0
            );
            bestOneRm = Number.isFinite(computed) ? computed : 0;
        }

        const unitNormalized = typeof weightUnit === 'string' ? weightUnit.trim().toLowerCase() : '';
        const highlightUnit = unitNormalized === 'kg' ? 'kg' : unitNormalized === 'lb' ? 'lb' : '';
        const highlightValue = bestOneRm > 0 ? formatWeightValue(bestOneRm) : '';
        const highlightLabel =
            bestSetKey && highlightValue && highlightValue !== '—'
                ? `1RM (${highlightValue}${highlightUnit})`
                : '';

        let sessions = Array.from(grouped.values()).map((session) => {
            const workoutTs = resolveWorkoutTimestamp(session.workout);
            const setTs = session.timestamps.length ? Math.max(...session.timestamps) : 0;
            const dayDate = parseDayKeyToDate(session.dayKey);
            const fallbackTs = dayDate ? dayDate.getTime() : 0;
            const timestamp = workoutTs || setTs || fallbackTs;
            const dateObj = timestamp ? new Date(timestamp) : dayDate;
            const dayLabel = dateObj ? WEEKDAY_LABELS[dateObj.getDay()] || '' : '';

            const title = deriveSessionTitle(session.workout, timestamp || fallbackTs);
            const meta = buildSessionMeta(timestamp || fallbackTs, session.dayKey);

            let highlightConsumed = false;
            const parsedSets = session.sets.map((item, index) => {
                const repsNumber = Number.isFinite(item.reps) ? item.reps : 0;
                const highlightMatch =
                    !highlightConsumed &&
                    bestSetKey &&
                    setKeyForStatSet(item.raw) === bestSetKey;
                if (highlightMatch) highlightConsumed = true;

                return {
                    key: `${session.key}-set-${index}`,
                    index: index + 1,
                    weightLabel: formatWeightValue(item.weight),
                    repsLabel: repsNumber > 0 ? String(Math.round(repsNumber)) : '—',
                    highlight: highlightMatch && highlightLabel ? highlightLabel : null,
                };
            });

            return {
                key: session.key,
                wid: session.wid,
                timestamp,
                dayLabel,
                title,
                meta,
                sets: parsedSets,
            };
        });

        sessions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        if (HISTORY_SESSION_LIMIT && sessions.length > HISTORY_SESSION_LIMIT) {
            sessions = sessions.slice(0, HISTORY_SESSION_LIMIT);
        }
        return sessions;
    }, [exerciseStatsEntry, completedWorkouts, weightUnit]);

    const workoutsByWid = useMemo(() => {
        const map = new Map();
        (Array.isArray(completedWorkouts) ? completedWorkouts : []).forEach((workout) => {
            const wid = extractWid(workout);
            if (wid) map.set(wid, workout);
        });
        return map;
    }, [completedWorkouts]);

    const {
        exerciseVolumeEntries: rawExerciseVolumeEntries,
        exerciseRepsEntries: rawExerciseRepsEntries,
        exercisePersonalRecordEntries: rawExercisePersonalRecordEntries,
    } = useMemo(() => {
        const sets = Array.isArray(exerciseStatsEntry?.sets) ? exerciseStatsEntry.sets : [];
        if (!sets.length)
            return {
                exerciseVolumeEntries: [],
                exerciseRepsEntries: [],
                exercisePersonalRecordEntries: [],
            };

        const volumeMap = new Map();
        const repsMap = new Map();
        const personalRecordCandidates = [];

        sets.forEach((set) => {
            const recordedAt = resolveSetTimestamp(set, workoutsByWid);
            if (!recordedAt) return;
            const weight = Math.max(0, Number(set.weight) || 0);
            const reps = Math.max(0, Number(set.reps) || 0);
            if (weight <= 0 && reps <= 0) return;
            const wid = set?.wid ? String(set.wid).trim() : '';
            const workout = wid && workoutsByWid.has(wid) ? workoutsByWid.get(wid) : null;
            const workoutName = workout ? deriveSessionTitle(workout, recordedAt) : null;

            if (weight > 0) {
                personalRecordCandidates.push({
                    recordedAt,
                    weight,
                    reps,
                    name: workoutName,
                    wid,
                });
            }

            const volumeIncrement = weight * reps;
            if (volumeIncrement > 0) {
                const key = String(recordedAt);
                const existing =
                    volumeMap.get(key) || { recordedAt, increment: 0, name: workoutName, wid };
                existing.increment += volumeIncrement;
                if (!existing.name && workoutName) existing.name = workoutName;
                if (!existing.wid && wid) existing.wid = wid;
                volumeMap.set(key, existing);
            }
            if (reps > 0) {
                const key = String(recordedAt);
                const existing =
                    repsMap.get(key) || { recordedAt, increment: 0, name: workoutName, wid };
                existing.increment += reps;
                if (!existing.name && workoutName) existing.name = workoutName;
                if (!existing.wid && wid) existing.wid = wid;
                repsMap.set(key, existing);
            }
        });

        const volumeEntries = Array.from(volumeMap.values())
            .filter((entry) => entry.increment > 0)
            .sort((a, b) => a.recordedAt - b.recordedAt);
        let runningVolume = 0;
        volumeEntries.forEach((entry) => {
            runningVolume += entry.increment;
            entry.value = runningVolume;
        });

        const repsEntries = Array.from(repsMap.values())
            .filter((entry) => entry.increment > 0)
            .sort((a, b) => a.recordedAt - b.recordedAt);
        let runningReps = 0;
        repsEntries.forEach((entry) => {
            runningReps += entry.increment;
            entry.value = runningReps;
        });

        personalRecordCandidates.sort((a, b) => a.recordedAt - b.recordedAt);
        let bestWeight = 0;
        let recordCount = 0;
        const personalRecordEntries = [];
        personalRecordCandidates.forEach((candidate) => {
            if (candidate.weight > bestWeight) {
                recordCount += 1;
                personalRecordEntries.push({
                    recordedAt: candidate.recordedAt,
                    value: recordCount,
                    increment: 1,
                    weight: candidate.weight,
                    reps: candidate.reps,
                    name: candidate.name || null,
                    wid: candidate.wid || null,
                });
                bestWeight = candidate.weight;
            }
        });

        return {
            exerciseVolumeEntries: volumeEntries,
            exerciseRepsEntries: repsEntries,
            exercisePersonalRecordEntries: personalRecordEntries,
        };
    }, [exerciseStatsEntry, workoutsByWid]);

    const exerciseVolumeEntries = Array.isArray(rawExerciseVolumeEntries) ? rawExerciseVolumeEntries : [];
    const exerciseRepsEntries = Array.isArray(rawExerciseRepsEntries) ? rawExerciseRepsEntries : [];
    const exercisePersonalRecordEntries = Array.isArray(rawExercisePersonalRecordEntries)
        ? rawExercisePersonalRecordEntries.filter((entry) => entry && Number.isFinite(entry.value))
        : [];

    const progressSectionsCount = 4;

    const progressVolumeValues = useMemo(
        () => exerciseVolumeEntries.map((entry) => entry.value),
        [exerciseVolumeEntries]
    );
    const progressVolumeAxisMetrics = useMemo(
        () => computeAxisMetrics(progressVolumeValues, progressSectionsCount),
        [progressVolumeValues, progressSectionsCount]
    );
    const progressVolumeTicks = useMemo(() => {
        if (!progressVolumeAxisMetrics) return [];
        const ticks = [];
        for (let i = 0; i <= progressVolumeAxisMetrics.sections; i += 1) {
            const value = progressVolumeAxisMetrics.minValue + progressVolumeAxisMetrics.step * i;
            ticks.push(Math.round((value + Number.EPSILON) * 100) / 100);
        }
        return ticks;
    }, [progressVolumeAxisMetrics]);

    const progressRepsValues = useMemo(
        () => exerciseRepsEntries.map((entry) => entry.value),
        [exerciseRepsEntries]
    );
    const progressRepsAxisMetrics = useMemo(
        () => computeAxisMetrics(progressRepsValues, progressSectionsCount),
        [progressRepsValues, progressSectionsCount]
    );
    const progressRepsTicks = useMemo(() => {
        if (!progressRepsAxisMetrics) return [];
        const ticks = [];
        for (let i = 0; i <= progressRepsAxisMetrics.sections; i += 1) {
            const value = progressRepsAxisMetrics.minValue + progressRepsAxisMetrics.step * i;
            ticks.push(Math.round((value + Number.EPSILON) * 100) / 100);
        }
        return ticks;
    }, [progressRepsAxisMetrics]);

    const progressPersonalRecordValues = useMemo(
        () => exercisePersonalRecordEntries.map((entry) => entry.value),
        [exercisePersonalRecordEntries]
    );
    const progressPersonalRecordAxisMetrics = useMemo(
        () => computeAxisMetrics(progressPersonalRecordValues, progressSectionsCount),
        [progressPersonalRecordValues, progressSectionsCount]
    );
    const progressPersonalRecordTicks = useMemo(() => {
        if (!progressPersonalRecordAxisMetrics) return [];
        const ticks = [];
        for (let i = 0; i <= progressPersonalRecordAxisMetrics.sections; i += 1) {
            const value =
                progressPersonalRecordAxisMetrics.minValue +
                progressPersonalRecordAxisMetrics.step * i;
            ticks.push(Math.round((value + Number.EPSILON) * 100) / 100);
        }
        return ticks;
    }, [progressPersonalRecordAxisMetrics]);

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
    const progressRepsPoints = progressRepsSeries.points;
    const progressPersonalRecordPoints = progressPersonalRecordSeries.points;

    const progressVolumeActiveIndexRef = useRef(null);
    const [progressVolumeActiveIndex, setProgressVolumeActiveIndex] = useState(null);
    const progressRepsActiveIndexRef = useRef(null);
    const [progressRepsActiveIndex, setProgressRepsActiveIndex] = useState(null);
    const progressPersonalRecordActiveIndexRef = useRef(null);
    const [progressPersonalRecordActiveIndex, setProgressPersonalRecordActiveIndex] = useState(null);

    const progressVolumePointerOpacity = useRef(new Animated.Value(0)).current;
    const progressRepsPointerOpacity = useRef(new Animated.Value(0)).current;
    const progressPersonalRecordPointerOpacity = useRef(new Animated.Value(0)).current;

    const progressVolumeHideTimeout = useRef(null);
    const progressRepsHideTimeout = useRef(null);
    const progressPersonalRecordHideTimeout = useRef(null);

    const clearProgressVolumeHideTimeout = useCallback(() => {
        if (progressVolumeHideTimeout.current) {
            clearTimeout(progressVolumeHideTimeout.current);
            progressVolumeHideTimeout.current = null;
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
            }).start(() => {
                progressVolumeActiveIndexRef.current = null;
                setProgressVolumeActiveIndex(null);
            });
            progressVolumeHideTimeout.current = null;
        }, 2000);
    }, [clearProgressVolumeHideTimeout, progressVolumePointerOpacity]);

    const scheduleProgressRepsHide = useCallback(() => {
        clearProgressRepsHideTimeout();
        if (progressRepsActiveIndexRef.current == null) return;
        progressRepsHideTimeout.current = setTimeout(() => {
            progressRepsPointerOpacity.stopAnimation();
            Animated.timing(progressRepsPointerOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start(() => {
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
            }).start(() => {
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
    const hasProgressRepsData = exerciseRepsEntries.length > 0;
    const hasProgressPersonalRecordData = exercisePersonalRecordEntries.length > 0;

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
            clearProgressRepsHideTimeout();
            clearProgressPersonalRecordHideTimeout();
        },
        [clearProgressVolumeHideTimeout, clearProgressRepsHideTimeout, clearProgressPersonalRecordHideTimeout]
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

    const handleShare = useCallback(async () => {
        const message = `Check out the ${displayTitle} exercise on Spartan.`;
        try {
            await Share.share({ message });
        } catch {
            Alert.alert('Unable to share right now. Please try again later.');
        }
    }, [displayTitle]);

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

            const sanitizedWorkout = sanitizeWorkoutForRoute({ ...workout, wid });
            if (!sanitizedWorkout) return;

            if (!sanitizedWorkout.wid) sanitizedWorkout.wid = wid;

            const ownerUid = String(global?.userData?.uid || sanitizedWorkout?.creatorUID || sanitizedWorkout?.creatorUid || '');
            const ownerHandle = String(global?.userData?.handle || global?.userData?.username || sanitizedWorkout?.handle || '');
            const ownerName = String(global?.userData?.name || sanitizedWorkout?.ownerName || '');
            const ownerPfp = String(
                global?.userData?.image ||
                    global?.userData?.pfp ||
                    global?.userData?.photoURL ||
                    global?.userData?.photo ||
                    ''
            );
            const ownerPfpVersion = Number(global?.userData?.pfpVersion ?? sanitizedWorkout?.pfpVersion ?? 0);

            const params = {
                workout: sanitizedWorkout,
                owner: {
                    uid: ownerUid,
                    handle: ownerHandle,
                    name: ownerName,
                    pfp: ownerPfp,
                    pfpVersion: ownerPfpVersion,
                },
            };

            if (!navigateOneWay('PastWorkout', { animation: 'slide-from-right', params })) {
                navigation.navigate('PastWorkout', params);
            }
        },
        [navigation, workoutsByWid]
    );

    const handleTabChange = useCallback((tabKey) => {
        setActiveTab(tabKey);
    }, []);

    const renderAbout = () => (
        <View style={styles.sectionSpacing}>
            <View style={styles.heroCard}>
                <View style={styles.heroImageWrapper}>
                    <ExerciseImagePreview
                        exercise={name}
                        size={scaleSize(260)}
                        style={styles.heroImagePreview}
                        imageStyle={styles.heroImage}
                    />
                </View>
            </View>

            <View style={styles.metaRow}>
                <View style={[styles.metaItem, styles.metaItemLeft]}>
                    <Text style={styles.metaLabel}>Primary Muscle</Text>
                    <Text style={styles.metaValue}>{muscleGroup}</Text>
                </View>
                <View style={[styles.metaItem, styles.metaItemRight]}>
                    <Text style={styles.metaLabel}>Equipment</Text>
                    <Text style={styles.metaValue}>{equipment}</Text>
                </View>
            </View>

            <Pressable
                style={[styles.actionButton, styles.shareButton]}
                onPress={withStrongPress(handleToggleFavorite)}
                accessibilityRole="button"
                accessibilityLabel={favoriteAccessibilityLabel}
                accessibilityState={{ selected: isFavorite }}
            >
                <View
                    style={[
                        styles.actionIcon,
                        styles.shareIcon,
                        isFavorite && styles.favoriteIconActive,
                    ]}
                >
                    <Ionicons
                        name={isFavorite ? 'bookmark' : 'bookmark-outline'}
                        size={scaleSize(16)}
                        color={isFavorite ? theme.primary : theme.surface}
                    />
                </View>
                <Text style={styles.shareText}>{favoriteButtonLabel}</Text>
                <View style={styles.actionIconSpacer} />
            </Pressable>

            {/*
            <Pressable
                style={[styles.actionButton, styles.favoriteButton]}
                onPress={withStrongPress(handleShare)}
                accessibilityRole="button"
                accessibilityLabel="Share exercise"
            >
                <View style={[styles.actionIcon, styles.favoriteIcon]}>
                    <Ionicons name="share-outline" size={scaleSize(18)} color={theme.textPrimary} />
                </View>
                <Text style={styles.favoriteText}>Share Exercise</Text>
                <View style={styles.actionIconSpacer} />
            </Pressable>
            */}

            {howToSteps.length > 0 && (
                <View style={styles.howToBlock}>
                    <Text style={styles.howToTitle}>{`How to do ${displayTitle}`}</Text>
                    {howToSteps.map((step, index) => (
                        <View
                            key={`howTo-${index}`}
                            style={[
                                styles.howToRow,
                                index === howToSteps.length - 1 && styles.howToRowLast,
                            ]}
                        >
                            <Text style={styles.howToIndex}>{`${index + 1}.`}</Text>
                            <Text style={styles.howToText}>{step}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );

    const renderHistory = () => {
        if (!historySessions.length) {
            return (
                <View style={styles.placeholder}>
                    <Text style={styles.placeholderTitle}>No history yet</Text>
                    <Text style={styles.placeholderBody}>
                        Log {displayTitle} in your workouts to populate recent sessions and personal records.
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.historySection}>
                {historySessions.map((session) => (
                    <View key={session.key} style={styles.historyCard}>
                        <View style={styles.historyHeaderRow}>
                            <View style={styles.historyHeaderTextBlock}>
                                <Text style={styles.historyTitle}>{session.title}</Text>
                                {session.meta ? (
                                    <Text style={styles.historySubtitle}>{session.meta}</Text>
                                ) : null}
                            </View>
                        </View>

                        <View style={styles.historyTableHeader}>
                            <View style={styles.historySetColumn}>
                                <Text style={styles.historyTableHeaderText}>Set</Text>
                            </View>
                            <View style={styles.historyWeightColumn}>
                                <Text style={styles.historyTableHeaderText}>{weightColumnLabel}</Text>
                            </View>
                            <View style={styles.historyRepsColumn}>
                                <Text style={styles.historyTableHeaderText}>Reps</Text>
                            </View>
                        </View>

                        {session.sets.map((set, index) => {
                            const isLast = index === session.sets.length - 1;
                            const rowStyle = [styles.historyRow];
                            if (isLast) rowStyle.push(styles.historyRowLast);
                            if (set.highlight) rowStyle.push(styles.historyRowWithBadge);
                            return (
                                <View key={set.key} style={rowStyle}>
                                    <View
                                        style={[
                                            styles.historySetColumn,
                                            set.highlight && styles.historyCellWithBadge,
                                        ]}
                                    >
                                        <Text style={styles.historySetValue}>{set.index}</Text>
                                    </View>
                                    <View
                                        style={[
                                            styles.historyWeightColumn,
                                            set.highlight && styles.historyWeightColumnWithBadge,
                                        ]}
                                    >
                                        <Text style={styles.historyValueText}>{set.weightLabel}</Text>
                                        {set.highlight ? (
                                            <View style={styles.historyBadge}>
                                                <Text style={styles.historyBadgeText}>{set.highlight}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    <View
                                        style={[
                                            styles.historyRepsColumn,
                                            set.highlight && styles.historyCellWithBadge,
                                        ]}
                                    >
                                        <Text style={styles.historyValueText}>{set.repsLabel}</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                ))}
            </View>
        );
    };

    const renderProgress = () => {
        const noData = !hasProgressVolumeData && !hasProgressRepsData && !hasProgressPersonalRecordData;
        if (noData) {
            return (
                <View style={styles.placeholder}>
                    <Text style={styles.placeholderTitle}>No progress yet</Text>
                    <Text style={styles.placeholderBody}>
                        Log sets for {displayTitle} to visualize volume, reps, and records trends here.
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.progressSection}>
                {hasProgressVolumeData ? (
                    <View style={[styles.progressCard, { paddingHorizontal: progressCardHorizontalPadding }]}>
                        <View style={styles.progressHeader}>
                            <Text style={styles.progressSectionTitle}>Volume</Text>
                            <View style={styles.progressAutoHintWrapper}>
                                <Text style={styles.progressAutoHint}>Auto-updates from</Text>
                                <Text style={styles.progressAutoHint}>completed workouts.</Text>
                            </View>
                        </View>

                        <View style={styles.progressMetricsRow}>
                            <View style={styles.progressValueGroup}>
                                <Text style={styles.progressValue}>{latestExerciseVolumeText}</Text>
                                <Text style={styles.progressUnit}>{volumeUnitLabel}</Text>
                                {latestExerciseVolumeDeltaMeta ? (
                                    <View style={styles.progressDeltaGroup}>
                                        <Ionicons
                                            name={latestExerciseVolumeDeltaMeta.icon}
                                            size={scaleSize(19)}
                                            color={latestExerciseVolumeDeltaMeta.color}
                                            style={styles.progressDeltaIcon}
                                        />
                                        <Text
                                            style={[styles.progressValue, styles.progressDeltaText, { color: latestExerciseVolumeDeltaMeta.color }]}
                                        >
                                            {latestExerciseVolumeDeltaMeta.text}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                            <Text style={styles.progressSummaryText}>{latestExerciseVolumeInfo}</Text>
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
                                    {progressVolumeTicks.map((value, index) => {
                                        const range = Math.max(
                                            (progressVolumeAxisMetrics?.maxValue ?? 0) -
                                                (progressVolumeAxisMetrics?.minValue ?? 0),
                                            1
                                        );
                                        const ratio =
                                            (value - (progressVolumeAxisMetrics?.minValue ?? 0)) / range;
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
                                                key={`exercise-volume-y-label-${value}-${index}`}
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
                                    {...progressVolumePanResponder.panHandlers}
                                >
                                    <Svg width={progressPlotWidth} height={progressChartHeight}>
                                        <Defs>
                                            <LinearGradient
                                                id="exerciseVolumeGradient"
                                                x1="0"
                                                y1="0"
                                                x2="0"
                                                y2="1"
                                            >
                                                <Stop offset="0%" stopColor="#7FB7FF" stopOpacity="0.3" />
                                                <Stop offset="100%" stopColor="#2D7BFF" stopOpacity="0.08" />
                                            </LinearGradient>
                                        </Defs>

                                        {progressVolumeTicks.map((value, index) => {
                                            const range = Math.max(
                                                (progressVolumeAxisMetrics?.maxValue ?? 0) -
                                                    (progressVolumeAxisMetrics?.minValue ?? 0),
                                                1
                                            );
                                            const ratio =
                                                (value - (progressVolumeAxisMetrics?.minValue ?? 0)) / range;
                                            const clampedRatio = Number.isFinite(ratio)
                                                ? Math.min(Math.max(ratio, 0), 1)
                                                : 0;
                                            const y =
                                                progressTopMargin + progressInnerHeight * (1 - clampedRatio);
                                            return (
                                                <Line
                                                    key={`exercise-volume-grid-${value}-${index}`}
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

                                        {progressVolumeSeries.areaPath ? (
                                            <Path
                                                d={progressVolumeSeries.areaPath}
                                                fill="url(#exerciseVolumeGradient)"
                                                stroke="none"
                                            />
                                        ) : null}

                                        {progressVolumeSeries.linePath ? (
                                            <Path
                                                d={progressVolumeSeries.linePath}
                                                fill="none"
                                                stroke="#7FB7FF"
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

                                        {progressVolumeActivePoint ? (
                                            <Line
                                                x1={progressVolumeActivePoint.x}
                                                y1={progressTopMargin}
                                                x2={progressVolumeActivePoint.x}
                                                y2={progressBaselineY}
                                                stroke="rgba(100, 160, 255, 0.45)"
                                                strokeWidth={progressPointerStripWidth}
                                            />
                                        ) : null}

                                        {progressVolumePoints.map((point, index) => {
                                            const isActive = index === progressVolumeActiveIndex;
                                            const radius = isActive ? scaleSize(6) : scaleSize(4.2);
                                            const strokeWidth = isActive ? scaleSize(2) : scaleSize(1);
                                            const strokeColor = isActive
                                                ? 'rgba(100, 160, 255, 0.9)'
                                                : 'rgba(100, 160, 255, 0.45)';
                                            const fillColor = isActive
                                                ? '#E1EEFF'
                                                : 'rgba(225, 238, 255, 0.78)';
                                            return (
                                                <Circle
                                                    key={point.recordedAt || `exercise-volume-point-${index}`}
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

                                    {progressVolumeXAxisLabels.length ? (
                                        <View
                                            pointerEvents="none"
                                            style={[
                                                styles.progressXAxisOverlay,
                                                {
                                                    left: progressLeftMargin,
                                                    right: progressRightMargin,
                                                    justifyContent:
                                                        progressVolumeXAxisLabels.length > 1
                                                            ? 'space-between'
                                                            : 'center',
                                                },
                                            ]}
                                        >
                                            {progressVolumeXAxisLabels.map((item, index) => (
                                                <Text
                                                    key={`exercise-volume-x-label-${item.timestamp ?? index}-${index}`}
                                                    style={[chartTypography.axisLabel, styles.progressXAxisLabel]}
                                                >
                                                    {item.label}
                                                </Text>
                                            ))}
                                        </View>
                                    ) : null}

                                    {progressVolumeActivePoint ? (
                                        <Animated.View
                                            pointerEvents="box-none"
                                            style={[
                                                chartPointerStyles.container,
                                                {
                                                    left: progressVolumePointerLeft,
                                                    top: Math.max(scaleSize(-8), progressTopMargin - scaleSize(72)),
                                                    width: progressVolumePointerWidth,
                                                    opacity: progressVolumePointerOpacity,
                                                },
                                            ]}
                                        >
                                            <ExerciseVolumePointerLabel
                                                entry={exerciseVolumeEntries[progressVolumeActiveIndex]}
                                                unit={volumeUnitLabel}
                                                isRightAligned={progressVolumePointerRightAligned}
                                                onWorkoutPress={handleNavigateToPastWorkout}
                                            />
                                        </Animated.View>
                                    ) : null}
                                </View>
                            </View>
                        </View>
                    </View>
                ) : null}

                {hasProgressPersonalRecordData ? (
                    <View style={[styles.progressCard, { paddingHorizontal: progressCardHorizontalPadding }]}> 
                        <View style={styles.progressHeader}>
                            <Text style={styles.progressSectionTitle}>Personal Records</Text>
                            <View style={styles.progressAutoHintWrapper}>
                                <Text style={styles.progressAutoHint}>Auto-updates when you</Text>
                                <Text style={styles.progressAutoHint}>set a new PR.</Text>
                            </View>
                        </View>

                        <View style={styles.progressMetricsRow}>
                            <View style={styles.progressValueGroup}>
                                <Text style={styles.progressValue}>{latestExercisePersonalRecordText}</Text>
                                <Text style={styles.progressUnit}>records</Text>
                                {latestExercisePersonalRecordDeltaMeta ? (
                                    <View style={styles.progressDeltaGroup}>
                                        <Ionicons
                                            name={latestExercisePersonalRecordDeltaMeta.icon}
                                            size={scaleSize(19)}
                                            color={latestExercisePersonalRecordDeltaMeta.color}
                                            style={styles.progressDeltaIcon}
                                        />
                                        <Text
                                            style={[
                                                styles.progressValue,
                                                styles.progressDeltaText,
                                                { color: latestExercisePersonalRecordDeltaMeta.color },
                                            ]}
                                        >
                                            {latestExercisePersonalRecordDeltaMeta.text}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                            <Text style={styles.progressSummaryText}>{latestExercisePersonalRecordInfo}</Text>
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
                                    {progressPersonalRecordTicks.map((value, index) => {
                                        const range = Math.max(
                                            (progressPersonalRecordAxisMetrics?.maxValue ?? 0) -
                                                (progressPersonalRecordAxisMetrics?.minValue ?? 0),
                                            1
                                        );
                                        const ratio =
                                            (value - (progressPersonalRecordAxisMetrics?.minValue ?? 0)) /
                                            range;
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
                                                key={`exercise-pr-y-label-${value}-${index}`}
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
                                    {...progressPersonalRecordPanResponder.panHandlers}
                                >
                                    <Svg width={progressPlotWidth} height={progressChartHeight}>
                                        <Defs>
                                            <LinearGradient
                                                id="exercisePersonalRecordGradient"
                                                x1="0"
                                                y1="0"
                                                x2="0"
                                                y2="1"
                                            >
                                                <Stop offset="0%" stopColor="#7FB7FF" stopOpacity="0.3" />
                                                <Stop offset="100%" stopColor="#2D7BFF" stopOpacity="0.08" />
                                            </LinearGradient>
                                        </Defs>

                                        {progressPersonalRecordTicks.map((value, index) => {
                                            const range = Math.max(
                                                (progressPersonalRecordAxisMetrics?.maxValue ?? 0) -
                                                    (progressPersonalRecordAxisMetrics?.minValue ?? 0),
                                                1
                                            );
                                            const ratio =
                                                (value - (progressPersonalRecordAxisMetrics?.minValue ?? 0)) /
                                                range;
                                            const clampedRatio = Number.isFinite(ratio)
                                                ? Math.min(Math.max(ratio, 0), 1)
                                                : 0;
                                            const y =
                                                progressTopMargin + progressInnerHeight * (1 - clampedRatio);
                                            return (
                                                <Line
                                                    key={`exercise-pr-grid-${value}-${index}`}
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

                                        {progressPersonalRecordSeries.areaPath ? (
                                            <Path
                                                d={progressPersonalRecordSeries.areaPath}
                                                fill="url(#exercisePersonalRecordGradient)"
                                                stroke="none"
                                            />
                                        ) : null}

                                        {progressPersonalRecordSeries.linePath ? (
                                            <Path
                                                d={progressPersonalRecordSeries.linePath}
                                                fill="none"
                                                stroke="#7FB7FF"
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

                                        {progressPersonalRecordActivePoint ? (
                                            <Line
                                                x1={progressPersonalRecordActivePoint.x}
                                                y1={progressTopMargin}
                                                x2={progressPersonalRecordActivePoint.x}
                                                y2={progressBaselineY}
                                                stroke="rgba(100, 160, 255, 0.45)"
                                                strokeWidth={progressPointerStripWidth}
                                            />
                                        ) : null}

                                        {progressPersonalRecordPoints.map((point, index) => {
                                            const isActive = index === progressPersonalRecordActiveIndex;
                                            const radius = isActive ? scaleSize(6) : scaleSize(4.2);
                                            const strokeWidth = isActive ? scaleSize(2) : scaleSize(1);
                                            const strokeColor = isActive
                                                ? 'rgba(100, 160, 255, 0.9)'
                                                : 'rgba(100, 160, 255, 0.45)';
                                            const fillColor = isActive
                                                ? '#E1EEFF'
                                                : 'rgba(225, 238, 255, 0.78)';
                                            return (
                                                <Circle
                                                    key={`exercise-pr-point-${index}`}
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

                                    {progressPersonalRecordXAxisLabels.length ? (
                                        <View
                                            pointerEvents="none"
                                            style={[
                                                styles.progressXAxisOverlay,
                                                {
                                                    left: progressLeftMargin,
                                                    right: progressRightMargin,
                                                    justifyContent:
                                                        progressPersonalRecordXAxisLabels.length > 1
                                                            ? 'space-between'
                                                            : 'center',
                                                },
                                            ]}
                                        >
                                            {progressPersonalRecordXAxisLabels.map((item, index) => (
                                                <Text
                                                    key={`exercise-pr-x-label-${item.timestamp ?? index}-${index}`}
                                                    style={[chartTypography.axisLabel, styles.progressXAxisLabel]}
                                                >
                                                    {item.label}
                                                </Text>
                                            ))}
                                        </View>
                                    ) : null}

                                    {progressPersonalRecordActivePoint ? (
                                        <Animated.View
                                            pointerEvents="box-none"
                                            style={[
                                                chartPointerStyles.container,
                                                {
                                                    left: progressPersonalRecordPointerLeft,
                                                    top: Math.max(
                                                        scaleSize(-8),
                                                        progressTopMargin - scaleSize(72)
                                                    ),
                                                    width: progressPersonalRecordPointerWidth,
                                                    opacity: progressPersonalRecordPointerOpacity,
                                                },
                                            ]}
                                        >
                                            <ExercisePersonalRecordPointerLabel
                                                entry={exercisePersonalRecordEntries[progressPersonalRecordActiveIndex]}
                                                unit={volumeUnitLabel}
                                                isRightAligned={progressPersonalRecordPointerRightAligned}
                                                onWorkoutPress={handleNavigateToPastWorkout}
                                            />
                                        </Animated.View>
                                    ) : null}
                                </View>
                            </View>
                        </View>
                    </View>
                ) : null}

                {hasProgressRepsData ? (
                    <View style={[styles.progressCard, { paddingHorizontal: progressCardHorizontalPadding }]}>
                        <View style={styles.progressHeader}>
                            <Text style={styles.progressSectionTitle}>Reps</Text>
                            <View style={styles.progressAutoHintWrapper}>
                                <Text style={styles.progressAutoHint}>Auto-updates from</Text>
                                <Text style={styles.progressAutoHint}>completed workouts.</Text>
                            </View>
                        </View>

                        <View style={styles.progressMetricsRow}>
                            <View style={styles.progressValueGroup}>
                                <Text style={styles.progressValue}>{latestExerciseRepsText}</Text>
                                <Text style={styles.progressUnit}>reps</Text>
                                {latestExerciseRepsDeltaMeta ? (
                                    <View style={styles.progressDeltaGroup}>
                                        <Ionicons
                                            name={latestExerciseRepsDeltaMeta.icon}
                                            size={scaleSize(19)}
                                            color={latestExerciseRepsDeltaMeta.color}
                                            style={styles.progressDeltaIcon}
                                        />
                                        <Text
                                            style={[styles.progressValue, styles.progressDeltaText, { color: latestExerciseRepsDeltaMeta.color }]}
                                        >
                                            {latestExerciseRepsDeltaMeta.text}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                            <Text style={styles.progressSummaryText}>{latestExerciseRepsInfo}</Text>
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
                                    {progressRepsTicks.map((value, index) => {
                                        const range = Math.max(
                                            (progressRepsAxisMetrics?.maxValue ?? 0) -
                                                (progressRepsAxisMetrics?.minValue ?? 0),
                                            1
                                        );
                                        const ratio =
                                            (value - (progressRepsAxisMetrics?.minValue ?? 0)) / range;
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
                                                key={`exercise-reps-y-label-${value}-${index}`}
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
                                    {...progressRepsPanResponder.panHandlers}
                                >
                                    <Svg width={progressPlotWidth} height={progressChartHeight}>
                                        <Defs>
                                            <LinearGradient
                                                id="exerciseRepsGradient"
                                                x1="0"
                                                y1="0"
                                                x2="0"
                                                y2="1"
                                            >
                                                <Stop offset="0%" stopColor="#7FB7FF" stopOpacity="0.3" />
                                                <Stop offset="100%" stopColor="#2D7BFF" stopOpacity="0.08" />
                                            </LinearGradient>
                                        </Defs>

                                        {progressRepsTicks.map((value, index) => {
                                            const range = Math.max(
                                                (progressRepsAxisMetrics?.maxValue ?? 0) -
                                                    (progressRepsAxisMetrics?.minValue ?? 0),
                                                1
                                            );
                                            const ratio =
                                                (value - (progressRepsAxisMetrics?.minValue ?? 0)) / range;
                                            const clampedRatio = Number.isFinite(ratio)
                                                ? Math.min(Math.max(ratio, 0), 1)
                                                : 0;
                                            const y =
                                                progressTopMargin + progressInnerHeight * (1 - clampedRatio);
                                            return (
                                                <Line
                                                    key={`exercise-reps-grid-${value}-${index}`}
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

                                        {progressRepsSeries.areaPath ? (
                                            <Path
                                                d={progressRepsSeries.areaPath}
                                                fill="url(#exerciseRepsGradient)"
                                                stroke="none"
                                            />
                                        ) : null}

                                        {progressRepsSeries.linePath ? (
                                            <Path
                                                d={progressRepsSeries.linePath}
                                                fill="none"
                                                stroke="#7FB7FF"
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

                                        {progressRepsActivePoint ? (
                                            <Line
                                                x1={progressRepsActivePoint.x}
                                                y1={progressTopMargin}
                                                x2={progressRepsActivePoint.x}
                                                y2={progressBaselineY}
                                                stroke="rgba(100, 160, 255, 0.45)"
                                                strokeWidth={progressPointerStripWidth}
                                            />
                                        ) : null}

                                        {progressRepsPoints.map((point, index) => {
                                            const isActive = index === progressRepsActiveIndex;
                                            const radius = isActive ? scaleSize(6) : scaleSize(4.2);
                                            const strokeWidth = isActive ? scaleSize(2) : scaleSize(1);
                                            const strokeColor = isActive
                                                ? 'rgba(100, 160, 255, 0.9)'
                                                : 'rgba(100, 160, 255, 0.45)';
                                            const fillColor = isActive
                                                ? '#E1EEFF'
                                                : 'rgba(225, 238, 255, 0.78)';
                                            return (
                                                <Circle
                                                    key={point.recordedAt || `exercise-reps-point-${index}`}
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

                                    {progressRepsXAxisLabels.length ? (
                                        <View
                                            pointerEvents="none"
                                            style={[
                                                styles.progressXAxisOverlay,
                                                {
                                                    left: progressLeftMargin,
                                                    right: progressRightMargin,
                                                    justifyContent:
                                                        progressRepsXAxisLabels.length > 1
                                                            ? 'space-between'
                                                            : 'center',
                                                },
                                            ]}
                                        >
                                            {progressRepsXAxisLabels.map((item, index) => (
                                                <Text
                                                    key={`exercise-reps-x-label-${item.timestamp ?? index}-${index}`}
                                                    style={[chartTypography.axisLabel, styles.progressXAxisLabel]}
                                                >
                                                    {item.label}
                                                </Text>
                                            ))}
                                        </View>
                                    ) : null}

                                    {progressRepsActivePoint ? (
                                        <Animated.View
                                            pointerEvents="box-none"
                                            style = {[
                                                chartPointerStyles.container,
                                                {
                                                    left: progressRepsPointerLeft,
                                                    top: Math.max(scaleSize(-8), progressTopMargin - scaleSize(72)),
                                                    width: progressRepsPointerWidth,
                                                    opacity: progressRepsPointerOpacity,
                                                },
                                            ]}
                                        >
                                            <ExerciseRepsPointerLabel
                                                entry={exerciseRepsEntries[progressRepsActiveIndex]}
                                                isRightAligned={progressRepsPointerRightAligned}
                                                onWorkoutPress={handleNavigateToPastWorkout}
                                            />
                                        </Animated.View>
                                    ) : null}
                                </View>
                            </View>
                        </View>
                    </View>
                ) : null}
            </View>
        );
    };

    let tabContent = null;
    if (activeTab === 'history') tabContent = renderHistory();
    else if (activeTab === 'progress') tabContent = renderProgress();
    else tabContent = renderAbout();

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeTop} />
            <SafeAreaView style={styles.safeArea}>
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
                                onPress={withStrongPress(() => handleTabChange(tab.key))}
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
                        { paddingBottom: (insets?.bottom || 0) + scaleSize(32) },
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    {tabContent}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    safeTop: {
        backgroundColor: theme.bg,
    },
    safeArea: {
        flex: 1,
        backgroundColor: theme.bg,
        paddingTop: scaleSize(8),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scaleSize(18),
        paddingBottom: scaleSize(16),
    },
    backButton: {
        width: scaleSize(44),
        height: scaleSize(36),
        borderRadius: scaleSize(18),
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        fontFamily: 'Outfit_700Bold',
        fontSize: ts(14),
        color: theme.textPrimary,
        textAlign: 'center',
        marginHorizontal: scaleSize(10),
    },
    headerSideSpacer: {
        width: scaleSize(44),
        height: scaleSize(36),
    },
    tabBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: scaleSize(18),
        paddingBottom: scaleSize(10),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.12)',
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
    },
    tabLabel: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: ts(13),
        color: 'rgba(255,255,255,0.4)',
    },
    tabLabelActive: {
        color: 'rgba(255,255,255,0.95)',
    },
    tabIndicator: {
        height: scaleSize(3),
        backgroundColor: 'transparent',
        borderRadius: scaleSize(999),
        marginTop: scaleSize(6),
        width: '55%',
    },
    tabIndicatorActive: {
        backgroundColor: 'rgba(34, 61, 100, 0.9)',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 0,
    },
    sectionSpacing: {
        paddingTop: scaleSize(18),
        paddingHorizontal: scaleSize(12),
    },
    heroCard: {
        backgroundColor: theme.surface,
        borderRadius: scaleSize(26),
        overflow: 'hidden',
        padding: scaleSize(18),
        alignItems: 'center',
        marginBottom: scaleSize(18),
    },
    heroImageWrapper: {
        width: '100%',
        height: scaleSize(260),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.fieldDeep,
        borderRadius: scaleSize(22),
        paddingVertical: scaleSize(20),
        paddingHorizontal: scaleSize(12),
        overflow: 'hidden',
    },
    heroImagePreview: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroImage: {
        width: '92%',
        height: '92%',
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: scaleSize(18),
    },
    metaItem: {
        flex: 1,
        padding: scaleSize(14),
        backgroundColor: theme.surface,
        borderRadius: scaleSize(18),
    },
    metaItemLeft: {
        marginRight: scaleSize(10),
    },
    metaItemRight: {
        marginLeft: scaleSize(10),
    },
    metaLabel: {
        fontFamily: 'Outfit_500Medium',
        fontSize: ts(12),
        color: theme.textSecondary,
        marginBottom: scaleSize(6),
    },
    metaValue: {
        fontFamily: 'Outfit_700Bold',
        fontSize: ts(15),
        color: theme.textPrimary,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: scaleSize(20),
        paddingVertical: scaleSize(10),
        paddingHorizontal: scaleSize(18),
        marginBottom: scaleSize(14),
    },
    shareButton: {
        backgroundColor: '#E2EDFF',
        borderWidth: 0,
        shadowColor: '#000000',
        shadowOpacity: 0.12,
        shadowRadius: scaleSize(8),
        shadowOffset: { width: 0, height: scaleSize(4) },
        elevation: 3,
    },
    favoriteButton: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.16)',
        marginBottom: scaleSize(20),
    },
    actionIcon: {
        width: scaleSize(30),
        height: scaleSize(30),
        borderRadius: scaleSize(15),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scaleSize(10),
    },
    shareIcon: {
        backgroundColor: 'rgba(9,9,9,0.08)',
    },
    favoriteIcon: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    favoriteIconActive: {
        backgroundColor: 'rgba(45, 158, 255, 0.22)',
    },
    shareText: {
        flex: 1,
        fontFamily: 'Outfit_700Bold',
        fontSize: ts(13),
        color: theme.surface,
        textAlign: 'center',
    },
    favoriteText: {
        flex: 1,
        fontFamily: 'Outfit_600SemiBold',
        fontSize: ts(13),
        color: theme.textPrimary,
        textAlign: 'center',
    },
    actionIconSpacer: {
        width: scaleSize(30),
        height: scaleSize(30),
        marginLeft: scaleSize(10),
        opacity: 0,
    },
    howToBlock: {
        backgroundColor: theme.surface,
        borderRadius: scaleSize(20),
        padding: scaleSize(18),
        marginBottom: scaleSize(20),
    },
    howToTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: ts(15),
        color: theme.textPrimary,
        marginBottom: scaleSize(12),
    },
    howToRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: scaleSize(10),
    },
    howToRowLast: {
        marginBottom: 0,
    },
    howToIndex: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: ts(13),
        color: theme.textPrimary,
        marginRight: scaleSize(10),
        lineHeight: ts(18),
    },
    howToText: {
        flex: 1,
        fontFamily: 'Outfit_400Regular',
        fontSize: ts(13),
        color: theme.textSecondary,
        lineHeight: ts(18),
    },
    progressSection: {
        paddingTop: scaleSize(12),
    },
    progressCard: {
        backgroundColor: theme.surface,
        paddingTop: scaleSize(16),
        paddingBottom: scaleSize(6),
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.06)',
        marginBottom: scaleSize(32),
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: scaleSize(4),
    },
    progressSectionTitle: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: ts(15),
        color: theme.textPrimary,
    },
    progressAutoHintWrapper: {
        alignItems: 'flex-end',
    },
    progressAutoHint: {
        fontFamily: 'Outfit_400Regular',
        fontSize: ts(11),
        color: 'rgba(216, 226, 255, 0.55)',
    },
    progressMetricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: scaleSize(2),
    },
    progressValueGroup: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    progressValue: {
        fontFamily: 'Outfit_700Bold',
        fontSize: ts(22),
        color: theme.textPrimary,
        lineHeight: ts(23),
    },
    progressDeltaGroup: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginLeft: scaleSize(10),
        paddingBottom: scaleSize(2)
    },
    progressDeltaIcon: {
        marginRight: scaleSize(2),
        marginBottom: scaleSize(2),
    },
    progressDeltaText: {
        fontSize: ts(16),
        lineHeight: ts(18),
    },
    progressUnit: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: ts(16),
        color: theme.textPrimary,
        marginLeft: scaleSize(6),
        marginBottom: scaleSize(4),
        textTransform: 'lowercase',
    },
    progressSummaryText: {
        fontFamily: 'Outfit_400Regular',
        fontSize: ts(12),
        color: 'rgba(255,255,255,0.55)',
        maxWidth: '50%',
        flexShrink: 1,
        marginLeft: scaleSize(12),
        textAlign: 'right',
        paddingVertical: scaleSize(2),
    },
    progressChartWrapper: {
        justifyContent: 'center',
        alignSelf: 'center',
        overflow: 'visible',
    },
    progressChartContent: {
        flexDirection: 'row',
    },
    progressYAxisLabels: {
        position: 'relative',
        justifyContent: 'center',
    },
    progressYAxisLabel: {
        position: 'absolute',
        right: scaleSize(6),
        textAlign: 'right',
        fontSize: ts(12),
    },
    progressChartCanvas: {
        flex: 1,
        position: 'relative',
    },
    progressXAxisOverlay: {
        position: 'absolute',
        bottom: 0,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    progressXAxisLabel: {
        minWidth: scaleSize(40),
        textAlign: 'center',
    },
    progressPointerLineSpacing: {
        marginTop: scaleSize(4),
    },
    progressPointerTimestampSpacing: {
        marginTop: scaleSize(6),
    },
    historySection: {
        paddingTop: scaleSize(18),
        paddingHorizontal: scaleSize(12),
    },
    historyCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: scaleSize(20),
        paddingVertical: scaleSize(16),
        paddingHorizontal: scaleSize(16),
        marginBottom: scaleSize(18),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    historyHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scaleSize(14),
        paddingHorizontal: scaleSize(6)
    },
    historyDayBadge: {
        width: scaleSize(46),
        height: scaleSize(46),
        borderRadius: scaleSize(12),
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scaleSize(12),
    },
    historyDayBadgeText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: ts(14),
        color: theme.textPrimary,
    },
    historyHeaderTextBlock: {
        flex: 1,
    },
    historyTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: ts(15),
        color: theme.textPrimary,
    },
    historySubtitle: {
        marginTop: scaleSize(4),
        fontFamily: 'Outfit_400Regular',
        fontSize: ts(12),
        color: theme.textSecondary,
    },
    historyTableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: scaleSize(8),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.12)',
        marginBottom: scaleSize(4),
    },
    historyTableHeaderText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: ts(11),
        letterSpacing: 0.4,
        color: 'rgba(255,255,255,0.6)',
        textTransform: 'uppercase',
    },
    historySetColumn: {
        width: scaleSize(52),
        alignItems: 'center',
        justifyContent: 'center',
    },
    historyWeightColumn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    historyWeightColumnWithBadge: {
        justifyContent: 'flex-start',
    },
    historyRepsColumn: {
        width: scaleSize(70),
        alignItems: 'center',
        justifyContent: 'center',
    },
    historyCellWithBadge: {
        justifyContent: 'flex-start',
    },
    historyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: scaleSize(10),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    historyRowLast: {
        borderBottomWidth: 0,
        paddingBottom: scaleSize(6),
    },
    historyRowWithBadge: {
        alignItems: 'flex-start',
        paddingTop: scaleSize(6),
        paddingBottom: scaleSize(12),
    },
    historySetValue: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: ts(13),
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
    },
    historyValueText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: ts(14),
        color: theme.textPrimary,
        textAlign: 'center',
    },
    historyBadge: {
        marginTop: scaleSize(4),
        paddingHorizontal: scaleSize(10),
        paddingVertical: scaleSize(4),
        borderRadius: scaleSize(12),
        backgroundColor: 'rgba(255,215,111,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    historyBadgeText: {
        fontFamily: 'Outfit_500Medium',
        fontSize: ts(11),
        color: '#FFD76F',
        textAlign: 'center',
    },
    placeholder: {
        paddingVertical: scaleSize(60),
        paddingHorizontal: scaleSize(18),
        alignItems: 'center',
    },
    placeholderTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: ts(16),
        color: theme.textPrimary,
        marginBottom: scaleSize(10),
        textAlign: 'center',
    },
    placeholderBody: {
        fontFamily: 'Outfit_400Regular',
        fontSize: ts(13),
        color: theme.textSecondary,
        textAlign: 'center',
        lineHeight: ts(18),
    },
});
