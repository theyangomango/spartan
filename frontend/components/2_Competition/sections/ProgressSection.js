import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    PanResponder,
    Platform,
    Pressable,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Weight } from "iconsax-react-native";
import dayjs from "dayjs";

import theme from "../../../theme/mfpDark";
import makeID from "../../../../backend/helper/makeID";
import updateDoc from "../../../../backend/helper/firebase/updateDoc";
import { deleteField } from "firebase/firestore";
import { subscribeUserData } from "../../../utils/userDataEvents";
import { derivePublicWeightFields } from "../../../utils/weightEntries";
import { DEVICE_WIDTH, scaleSize, ts } from "../layoutConstants";
import { chartPointerStyles, chartTypography, chartCardTypography, chartCardLayout } from "../../charts/chartStyles";
import Svg, { Circle, Defs, G, LinearGradient, Line, Path, Stop } from "react-native-svg";
import { navigateOneWay } from "../../../../navigationRef";
import HumanMuscleOutline from "../../../assets/human_muscle_outline";
import HumanMuscleBackOutline from "../../../assets/human_muscle_back_outline";
import formatHexStat from "../../../utils/formatHexStat";
import MuscleGroupIcon from "../../3_Workout/NewWorkout/SelectExercise/MuscleGroupIcon";
import HexagonalStats from "../UserStats/HexagonalStats";
import {
    buildMuscleFillMap,
    DEFAULT_MUSCLE_SEGMENTS as MUSCLE_SEGMENTS,
} from "../../../utils/muscleTierColors";

const WORKOUT_TIMESTAMP_FIELDS = ["created"];

const CHART_ACCENTS = {
    standard: { r: 100, g: 160, b: 255 },
    weight: { r: 45, g: 158, b: 255 },
};

const POINTER_PANEL_ACCENTS = {
    volume: { r: 214, g: 220, b: 230 },
    reps: { r: 156, g: 136, b: 255 },
    prs: { r: 255, g: 183, b: 126 },
    weight: { r: 214, g: 220, b: 230 },
};
const BODYGRAPH_OUTLINE_COLOR = "#40485c";
const MUSCLE_ICON_HIGHLIGHT = "#ff6f67ff";
const MUSCLE_ICON_HIGHLIGHT_DIM = "rgba(255, 127, 120, 0.6)";

const accentToRgba = (accent, alpha) => {
    const { r, g, b } = accent;
    const boundedAlpha = Math.max(0, Math.min(alpha, 1));
    return `rgba(${r}, ${g}, ${b}, ${boundedAlpha})`;
};

// Renders the multi-layer bubble with halo and highlight for a chart data point.
const ChartBubble = ({ cx, cy, isActive, accent = CHART_ACCENTS.standard }) => {
    const coreRadius = isActive ? scaleSize(6.4) : scaleSize(4.8);
    const ringRadius = coreRadius + scaleSize(isActive ? 2.2 : 1.5);
    const haloRadius = coreRadius + scaleSize(isActive ? 6.2 : 4.6);
    const highlightRadius = coreRadius * (isActive ? 0.42 : 0.36);
    const innerStrokeWidth = isActive ? scaleSize(1) : scaleSize(0.8);

    return (
        <G>
            <Circle
                cx={cx}
                cy={cy}
                r={haloRadius}
                fill={accentToRgba(accent, isActive ? 0.32 : 0.18)}
            />
            <Circle
                cx={cx}
                cy={cy}
                r={ringRadius}
                stroke={accentToRgba(accent, isActive ? 0.78 : 0.5)}
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

const PointerBubbleCard = ({
    children,
    accent = CHART_ACCENTS.standard,
    label,
    isRightAligned,
    accessibilityLabel,
}) => {
    const accentSolid = accentToRgba(accent, 1);
    const borderColor = accentToRgba(accent, 0.45);
    const glowColor = accentToRgba(accent, 0.18);

    return (
        <View
            pointerEvents="box-none"
            style={[
                chartPointerStyles.root,
                isRightAligned ? chartPointerStyles.alignRight : chartPointerStyles.alignLeft,
            ]}
            accessible={Boolean(accessibilityLabel)}
            accessibilityRole={accessibilityLabel ? "summary" : undefined}
            accessibilityLabel={accessibilityLabel}
        >
            <View
                style={[
                    chartPointerStyles.bubbleWrapper,
                    isRightAligned ? chartPointerStyles.alignRight : chartPointerStyles.alignLeft,
                ]}
            >
                <View
                    pointerEvents="none"
                    style={[
                        styles.pointerBubbleGlow,
                        {
                            backgroundColor: glowColor,
                        },
                    ]}
                />
                <View
                    style={[
                        chartPointerStyles.bubble,
                        {
                            borderColor,
                        },
                    ]}
                >
                    {label ? (
                        <>
                            <View style={styles.pointerBubbleHeaderRow}>
                                <View
                                    style={[
                                        styles.pointerBubbleAccentDot,
                                        { backgroundColor: accentSolid },
                                    ]}
                                />
                                <Text style={styles.pointerBubbleHeaderLabel}>{label}</Text>
                            </View>
                            <View style={styles.pointerBubbleHeaderDivider} />
                        </>
                    ) : null}
                    <View style={styles.pointerBubbleBody}>{children}</View>
                </View>
            </View>
        </View>
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
            // ignore conversion failure
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

const resolvePreferredWeightUnit = (user) => {
    const rawUnit =
        user?.settings?.units ||
        user?.units ||
        user?.personalInfo?.weightUnit ||
        user?.stats?.weightUnit;
    if (typeof rawUnit === "string") {
        const normalized = rawUnit.trim().toLowerCase();
        if (normalized.startsWith("k")) return "kg";
        if (normalized.includes("kilo")) return "kg";
    }
    return "lb";
};

const toDisplayWeightUnit = (unit, fallback = "lbs") => {
    if (typeof unit === "string") {
        const trimmed = unit.trim();
        const normalized = trimmed.toLowerCase();
        if (normalized) {
            if (normalized.startsWith("kg")) return "kg";
            if (normalized === "lb" || normalized === "lbs" || normalized.startsWith("lb")) return "lbs";
            return trimmed;
        }
    }
    return fallback;
};

const buildMetricDeltaDisplay = (delta, unitLabel, formatter = formatVolumeValue) => {
    const numericDelta = Number(delta);
    if (!Number.isFinite(numericDelta) || numericDelta === 0) return null;
    const absValue = Math.abs(numericDelta);
    const formattedValue = formatter(absValue);
    const sign = numericDelta > 0 ? "+" : "-";
    const icon = numericDelta > 0 ? "arrow-up" : "arrow-down";
    const color = numericDelta > 0 ? "#65F2B6" : "#FF6B6B";
    return {
        icon,
        color,
        text: `${sign}${formattedValue}`,
    };
};

const formatWeightValue = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return "00";
    const rounded = Math.round(num * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

const formatTimestamp = (value) => {
    const ms = toMillisSafe(value);
    if (!Number.isFinite(ms) || ms <= 0) return "No Logged Data";
    try {
        return dayjs(ms).format("MMM D, h:mm A");
    } catch {
        return "No Logged Data";
    }
};

const normalizeToMinute = (value) => dayjs(value).second(0).millisecond(0).toDate();

const clampDateToNow = (value) => {
    const normalized = normalizeToMinute(value);
    const now = normalizeToMinute(new Date());
    if (!dayjs(normalized).isValid()) return now;
    return dayjs(normalized).isAfter(now) ? now : normalized;
};

const mergeDateByMode = (base, next, mode) => {
    const baseDay = dayjs(base);
    const nextDay = dayjs(next);
    if (mode === "date") {
        return baseDay
            .year(nextDay.year())
            .month(nextDay.month())
            .date(nextDay.date())
            .toDate();
    }

    return baseDay
        .hour(nextDay.hour())
        .minute(nextDay.minute())
        .second(0)
        .millisecond(0)
        .toDate();
};

const sanitizeEntries = (rawEntries) => {
    if (!Array.isArray(rawEntries)) return [];
    return rawEntries
        .map((entry) => {
            if (!entry) return null;
            const weight = Number(entry.weight);
            const recordedAt = Number(entry.recordedAt || entry.timestamp || entry.loggedAt);
            if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(recordedAt)) return null;
            const unit = (entry.unit || "").toString().toLowerCase().startsWith("k") ? "kg" : "lb";
            return {
                id: entry.id || entry.key || makeID(),
                weight,
                unit,
                recordedAt,
                createdAt: Number(entry.createdAt || recordedAt || Date.now()),
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.recordedAt - b.recordedAt);
};

const normalizeEntryCollection = (source) => {
    if (!source) return [];
    if (Array.isArray(source)) return source;
    if (typeof source === "object") {
        return Object.values(source).filter(Boolean);
    }
    return [];
};

const selectWeightEntrySource = (user) => {
    if (!user || typeof user !== "object") return [];
    const candidates = [
        user?.progress?.weightEntries,
        user?.weightEntries,
        user?.bodyweightEntries,
        user?.bodyweightLog,
        user?.progress?.bodyweightEntries,
    ];

    let firstObserved = null;
    for (const candidate of candidates) {
        const normalized = normalizeEntryCollection(candidate);
        if (!firstObserved && normalized.length >= 0) {
            firstObserved = normalized;
        }
        if (normalized.length > 0) {
            return normalized;
        }
    }

    return firstObserved || [];
};

const resolveWorkoutTimestamp = (workout) => {
    if (!workout || typeof workout !== "object") return 0;
    for (const field of WORKOUT_TIMESTAMP_FIELDS) {
        const ms = toMillisSafe(workout?.[field]);
        if (ms) return ms;
    }
    return 0;
};

const sanitizeCompletedWorkouts = (raw) => {
    if (!Array.isArray(raw)) return [];
    return raw.filter(Boolean);
};

const sanitizePersonalRecordEntries = (completedWorkouts) => {
    if (!Array.isArray(completedWorkouts)) return [];

    const prelim = completedWorkouts
        .map((workout) => {
            const recordedAt = resolveWorkoutTimestamp(workout);
            if (!Number.isFinite(recordedAt) || recordedAt <= 0) return null;

            const rawIncrement = Number(workout?.PBs ?? workout?.pbs ?? 0);
            const increment = Number.isFinite(rawIncrement) && rawIncrement > 0 ? rawIncrement : 0;

            const id = workout?.id || workout?.wid || workout?.workoutId || makeID();
            const name =
                (typeof workout?.name === "string" && workout.name.trim()) ||
                (typeof workout?.templateName === "string" && workout.templateName.trim()) ||
                "Workout";
            const wid =
                (typeof workout?.wid === "string" && workout.wid.trim()) ||
                (workout?.wid ? String(workout.wid).trim() : '') ||
                (workout?.workoutId ? String(workout.workoutId).trim() : '') ||
                (workout?.id ? String(workout.id).trim() : '');

            return {
                id,
                recordedAt,
                increment,
                name,
                wid,
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.recordedAt - b.recordedAt);

    let runningTotal = 0;
    return prelim.map((entry) => {
        runningTotal += entry.increment;
        return {
            ...entry,
            value: runningTotal,
        };
    });
};

const sanitizeWorkoutForRoute = (workout) => {
    if (!workout || typeof workout !== "object") return null;
    const replacer = (_key, value) => (typeof value === "function" ? undefined : value);
    try {
        return JSON.parse(JSON.stringify(workout, replacer));
    } catch {
        const clone = { ...workout };
        if (Array.isArray(workout.exercises)) {
            clone.exercises = workout.exercises.map((exercise) => {
                if (!exercise || typeof exercise !== "object") return {};
                const safeExercise = { ...exercise };
                if (Array.isArray(exercise.sets)) {
                    safeExercise.sets = exercise.sets.map((set) => {
                        if (!set || typeof set !== "object") return {};
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

const sanitizeVolumeEntries = (completedWorkouts) => {
    if (!Array.isArray(completedWorkouts)) return [];
    const prelim = completedWorkouts
        .map((workout) => {
            if (!workout) return null;
            const recordedAt = resolveWorkoutTimestamp(workout);
            const volume = Number(workout?.volume ?? workout?.totalVolume ?? workout?.stats?.volume ?? 0);
            if (!Number.isFinite(recordedAt) || recordedAt <= 0 || !Number.isFinite(volume) || volume <= 0) return null;
            return {
                id: workout.id || workout.wid || workout.workoutId || workout.sessionId || makeID(),
                increment: volume,
                recordedAt,
                name:
                    (typeof workout?.name === "string" && workout.name.trim())
                        ? workout.name.trim()
                        : workout?.templateName || "Workout",
                wid: (typeof workout?.wid === "string" && workout.wid.trim()) ||
                    (workout?.wid ? String(workout.wid).trim() : '') ||
                    (workout?.workoutId ? String(workout.workoutId).trim() : '') ||
                    (workout?.id ? String(workout.id).trim() : ''),
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.recordedAt - b.recordedAt);

    const result = [];
    let runningTotal = 0;
    prelim.forEach((entry) => {
        runningTotal += entry.increment;
        result.push({ ...entry, value: runningTotal });
    });

    return result;
};

const sanitizeRepsEntries = (completedWorkouts) => {
    if (!Array.isArray(completedWorkouts)) return [];
    const prelim = completedWorkouts
        .map((workout) => {
            if (!workout) return null;
            const recordedAt = resolveWorkoutTimestamp(workout);
            const reps =
                Number(
                    workout?.reps ??
                    workout?.totalReps ??
                    workout?.stats?.reps ??
                    workout?.stats?.totalReps ??
                    workout?.stats?.Reps ??
                    workout?.Reps ??
                    workout?.metrics?.reps ??
                    0
                ) || 0;
            if (!Number.isFinite(recordedAt) || recordedAt <= 0 || !Number.isFinite(reps) || reps <= 0) return null;
            return {
                id: workout.id || workout.wid || workout.workoutId || workout.sessionId || makeID(),
                increment: reps,
                recordedAt,
                name:
                    (typeof workout?.name === "string" && workout.name.trim())
                        ? workout.name.trim()
                        : workout?.templateName || "Workout",
                wid: (typeof workout?.wid === "string" && workout.wid.trim()) ||
                    (workout?.wid ? String(workout.wid).trim() : '') ||
                    (workout?.workoutId ? String(workout.workoutId).trim() : '') ||
                    (workout?.id ? String(workout.id).trim() : ''),
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.recordedAt - b.recordedAt);

    const result = [];
    let runningTotal = 0;
    prelim.forEach((entry) => {
        runningTotal += entry.increment;
        result.push({ ...entry, value: runningTotal });
    });

    return result;
};

const DEFAULT_X_AXIS_LABEL_COUNT = 5;

const formatXAxisDateLabel = (timestamp, span) => {
    const dateInstance = dayjs(timestamp);
    if (!dateInstance.isValid()) return "";

    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const threeMonths = 90 * 24 * 60 * 60 * 1000;

    if (span <= oneWeek) return dateInstance.format("MMM D");
    if (span <= threeMonths) return dateInstance.format("MMM D");
    return dateInstance.format("MMM YYYY");
};

const buildXAxisLabels = (domain, desiredCount = DEFAULT_X_AXIS_LABEL_COUNT) => {
    if (!domain || typeof domain !== "object") return [];
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
        if (formatted) {
            labels.push({ label: formatted, timestamp });
        }
    }

    return labels;
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

        const rawYRatio = (Number(point.value) - minY) / yRange;
        const yRatio = Number.isFinite(rawYRatio) ? Math.min(Math.max(rawYRatio, 0), 1) : 0;
        const y = topMargin + innerHeight * (1 - yRatio);

        return { ...point, x, y };
    });

    if (!points.length) {
        return {
            points,
            linePath: "",
            areaPath: "",
            domain: { minX, maxX, minY, maxY },
        };
    }

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

const PointerLabelBubble = React.memo(({ entry, unit, delta, isRightAligned }) => {
    if (!entry) return null;

    const weightText = `${formatWeightValue(entry.weight)} ${unit}`;
    const timestampText = dayjs(entry.recordedAt).format("MMM D, h:mm A");
    const shouldShowDelta = typeof delta === "number" && delta !== null;

    const buildDeltaText = () => {
        if (!shouldShowDelta) return null;
        const absValue = Math.abs(delta);
        const formatDeltaValue = (value) => {
            if (!Number.isFinite(value)) return null;
            if (value >= 100) return Math.round(value).toString();
            const rounded = Math.round(value * 10) / 10;
            return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
        };

        const formattedValue = formatDeltaValue(absValue);
        if (formattedValue == null) return null;

        const unitLabel = (() => {
            if (typeof unit === "string") {
                const normalized = unit.toLowerCase();
                if (normalized === "lb" || normalized === "lbs" || normalized.startsWith("lb")) {
                    return absValue === 1 ? "lb" : "lbs";
                }
            }
            return unit;
        })();

        const prefix = delta > 0 ? "+" : delta < 0 ? "-" : "+";
        return `${prefix}${formattedValue} ${unitLabel}`;
    };

    const deltaText = buildDeltaText();
    const isPositiveDelta = typeof delta === "number" && delta > 0;
    const isNegativeDelta = typeof delta === "number" && delta < 0;
    const deltaStyle = [
        chartTypography.pointerBody,
        styles.pointerBubbleLineSpacing,
        isPositiveDelta
            ? chartTypography.pointerAccentGreen
            : isNegativeDelta
                ? chartTypography.pointerDeltaNegative
                : chartTypography.pointerDeltaNeutral,
    ];

    return (
        <PointerBubbleCard
            accent={POINTER_PANEL_ACCENTS.weight}
            label="Body Weight"
            isRightAligned={isRightAligned}
            accessibilityLabel={`Weight ${weightText} logged ${timestampText}`}
        >
            <Text style={chartTypography.pointerTitle}>{weightText}</Text>
            {deltaText ? <Text style={deltaStyle}>{deltaText}</Text> : null}
            <View style={styles.pointerBubbleDivider} />
            <Text
                style={[chartTypography.pointerTimestamp, styles.pointerBubbleTimestampSpacing]}
            >
                {timestampText}
            </Text>
        </PointerBubbleCard>
    );
});

const VolumePointerLabel = React.memo(({ entry, unit, isRightAligned, onWorkoutPress }) => {
    if (!entry) return null;

    const unitText = toDisplayWeightUnit(unit);
    const totalText = `${formatVolumeValue(entry.value)} ${unitText}`;
    const incrementText = entry.increment ? `+${formatVolumeValue(entry.increment)} ${unitText}` : null;
    const timestampText = dayjs(entry.recordedAt).format("MMM D, h:mm A");
    const workoutName = (typeof entry.name === "string" && entry.name.trim()) || null;
    const canNavigate = typeof onWorkoutPress === "function";

    return (
        <PointerBubbleCard
            label="Total Volume"
            accent={POINTER_PANEL_ACCENTS.volume}
            isRightAligned={isRightAligned}
            accessibilityLabel={`Total volume ${totalText} recorded ${timestampText}`}
        >
            <Text style={chartTypography.pointerTitle}>{totalText}</Text>
            {incrementText ? (
                <Text
                    style={[
                        chartTypography.pointerBody,
                        styles.pointerBubbleLineSpacing,
                        chartTypography.pointerAccentGreen,
                    ]}
                >
                    {incrementText}
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
                                chartTypography.pointerBody,
                                styles.pointerBubbleLineSpacing,
                                chartTypography.pointerAccentBlue,
                            ]}
                        >
                            {workoutName}
                        </Text>
                    </Pressable>
                ) : (
                    <Text
                        style={[
                            chartTypography.pointerBody,
                            styles.pointerBubbleLineSpacing,
                            chartTypography.pointerAccentBlue,
                        ]}
                    >
                        {workoutName}
                    </Text>
                )
            ) : null}
            <View style={styles.pointerBubbleDivider} />
            <Text style={[chartTypography.pointerTimestamp, styles.pointerBubbleTimestampSpacing]}>
                {timestampText}
            </Text>
        </PointerBubbleCard>
    );
});

const RepsPointerLabel = React.memo(({ entry, isRightAligned, onWorkoutPress }) => {
    if (!entry) return null;

    const totalText = `${formatVolumeValue(entry.value)} reps`;
    const incrementText = entry.increment ? `+${formatVolumeValue(entry.increment)} reps` : null;
    const timestampText = dayjs(entry.recordedAt).format("MMM D, h:mm A");
    const workoutName = (typeof entry.name === "string" && entry.name.trim()) || null;
    const canNavigate = typeof onWorkoutPress === "function";

    return (
        <PointerBubbleCard
            label="Total Reps"
            accent={POINTER_PANEL_ACCENTS.reps}
            isRightAligned={isRightAligned}
            accessibilityLabel={`Total reps ${totalText} recorded ${timestampText}`}
        >
            <Text style={chartTypography.pointerTitle}>{totalText}</Text>
            {incrementText ? (
                <Text
                    style={[
                        chartTypography.pointerBody,
                        styles.pointerBubbleLineSpacing,
                        chartTypography.pointerAccentGreen,
                    ]}
                >
                    {incrementText}
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
                                chartTypography.pointerBody,
                                styles.pointerBubbleLineSpacing,
                                chartTypography.pointerAccentBlue,
                            ]}
                        >
                            {workoutName}
                        </Text>
                    </Pressable>
                ) : (
                    <Text
                        style={[
                            chartTypography.pointerBody,
                            styles.pointerBubbleLineSpacing,
                            chartTypography.pointerAccentBlue,
                        ]}
                    >
                        {workoutName}
                    </Text>
                )
            ) : null}
            <View style={styles.pointerBubbleDivider} />
            <Text style={[chartTypography.pointerTimestamp, styles.pointerBubbleTimestampSpacing]}>
                {timestampText}
            </Text>
        </PointerBubbleCard>
    );
});

const PersonalRecordPointerLabel = React.memo(({ entry, isRightAligned, onWorkoutPress }) => {
    if (!entry) return null;

    const totalText = `${formatVolumeValue(entry.value)} PRs`;
    const incrementValue = Number(entry.increment) || 0;
    const incrementText = incrementValue > 0 ? `+${formatVolumeValue(incrementValue)} PR${incrementValue === 1 ? "" : "s"}` : null;
    const workoutName = (typeof entry.name === "string" && entry.name.trim()) || null;
    const noRecordText = incrementValue === 0 ? "No new PRs" : null;
    const timestampText = dayjs(entry.recordedAt).format("MMM D, h:mm A");
    const canNavigate = typeof onWorkoutPress === "function";

    return (
        <PointerBubbleCard
            label="Personal Records"
            accent={POINTER_PANEL_ACCENTS.prs}
            isRightAligned={isRightAligned}
            accessibilityLabel={`Personal records ${totalText} recorded ${timestampText}`}
        >
            <Text style={chartTypography.pointerTitle}>{totalText}</Text>
            {incrementText ? (
                <Text
                    style={[
                        chartTypography.pointerBody,
                        styles.pointerBubbleLineSpacing,
                        chartTypography.pointerAccentGreen,
                    ]}
                >
                    {incrementText}
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
                                chartTypography.pointerBody,
                                styles.pointerBubbleLineSpacing,
                                chartTypography.pointerAccentBlue,
                            ]}
                        >
                            {workoutName}
                        </Text>
                    </Pressable>
                ) : (
                    <Text
                        style={[
                            chartTypography.pointerBody,
                            styles.pointerBubbleLineSpacing,
                            chartTypography.pointerAccentBlue,
                        ]}
                    >
                        {workoutName}
                    </Text>
                )
            ) : null}
            {noRecordText ? (
                <Text
                    style={[
                        chartTypography.pointerBody,
                        styles.pointerBubbleLineSpacing,
                        chartTypography.pointerDeltaNeutral,
                    ]}
                >
                    {noRecordText}
                </Text>
            ) : null}
            <View style={styles.pointerBubbleDivider} />
            <Text style={[chartTypography.pointerTimestamp, styles.pointerBubbleTimestampSpacing]}>
                {timestampText}
            </Text>
        </PointerBubbleCard>
    );
});

const AddMeasurementModal = ({
    isVisible,
    onDismiss,
    onSubmit,
    unit,
    isSaving,
    initialEntry,
    mode = "create",
}) => {
    const [weightInput, setWeightInput] = useState("");
    const [selectedDate, setSelectedDate] = useState(() => normalizeToMinute(new Date()));
    const [pickerMode, setPickerMode] = useState("date");
    const [isIOSPickerVisible, setIsIOSPickerVisible] = useState(false);
    const [iosDraftDate, setIosDraftDate] = useState(() => normalizeToMinute(new Date()));

    useEffect(() => {
        if (!isVisible) return;
        if (mode === "edit" && initialEntry) {
            setWeightInput(String(initialEntry.weight ?? ""));
            const entryDay = dayjs(initialEntry.recordedAt);
            const nextDateRaw = entryDay.isValid()
                ? normalizeToMinute(entryDay.toDate())
                : normalizeToMinute(new Date());
            const nextDate = clampDateToNow(nextDateRaw);
            setSelectedDate(nextDate);
            setIosDraftDate(nextDate);
        } else {
            const current = clampDateToNow(new Date());
            setWeightInput("");
            setSelectedDate(current);
            setIosDraftDate(current);
        }
        setIsIOSPickerVisible(false);
        setPickerMode("date");
    }, [isVisible, initialEntry, mode]);

    const handleSetNow = useCallback(() => {
        const current = clampDateToNow(new Date());
        setSelectedDate(current);
        setIosDraftDate(current);
    }, []);

    const handleSave = useCallback(() => {
        if (isSaving) return;
        const timestamp = dayjs(selectedDate);
        if (!timestamp.isValid()) {
            Alert.alert("Invalid date or time", "Please choose a valid date and time for your measurement.");
            return;
        }
        if (timestamp.valueOf() > Date.now()) {
            const clamped = clampDateToNow(selectedDate);
            setSelectedDate(clamped);
            setIosDraftDate(clamped);
            Alert.alert("Invalid date or time", "You can't log a measurement in the future.");
            return;
        }
        onSubmit({
            weightInput,
            dateInput: timestamp.format("YYYY-MM-DD"),
            timeInput: timestamp.format("HH:mm"),
            entryId: initialEntry?.id,
        });
    }, [selectedDate, weightInput, onSubmit, isSaving, initialEntry?.id]);

    const openPicker = useCallback(
        (mode) => {
            const safeMode = mode === "time" ? "time" : "date";
            Keyboard.dismiss();
            if (Platform.OS === "android") {
                DateTimePickerAndroid.open({
                    mode: safeMode,
                    value: selectedDate,
                    is24Hour: false,
                    maximumDate: new Date(),
                    onChange: (event, nextDate) => {
                        if (event.type !== "set" || !nextDate) return;
                        setSelectedDate((prev) => {
                            const updated = mergeDateByMode(prev, nextDate, safeMode);
                            const clamped = clampDateToNow(updated);
                            setIosDraftDate(clamped);
                            return clamped;
                        });
                    },
                });
            } else {
                setPickerMode(safeMode);
                setIosDraftDate(selectedDate);
                setIsIOSPickerVisible(true);
            }
        },
        [selectedDate]
    );

    const handleIOSPickerChange = useCallback(
        (_, nextDate) => {
            if (!nextDate) return;
            setIosDraftDate((prev) => {
                const updated = mergeDateByMode(prev, nextDate, pickerMode);
                return clampDateToNow(updated);
            });
        },
        [pickerMode]
    );

    const handleIOSPickerCancel = useCallback(() => {
        setIsIOSPickerVisible(false);
        setIosDraftDate(selectedDate);
    }, [selectedDate]);

    const handleIOSPickerConfirm = useCallback(() => {
        const clamped = clampDateToNow(iosDraftDate);
        setSelectedDate(clamped);
        setIosDraftDate(clamped);
        setIsIOSPickerVisible(false);
    }, [iosDraftDate]);

    const formattedDateDisplay = useMemo(
        () => dayjs(selectedDate).format("MMM D, YYYY"),
        [selectedDate]
    );
    const formattedTimeDisplay = useMemo(
        () => dayjs(selectedDate).format("h:mm A"),
        [selectedDate]
    );

    const weightUnitLabel = toDisplayWeightUnit(initialEntry?.unit || unit);
    const isEditMode = mode === "edit";

    return (
        <Modal
            transparent
            visible={isVisible}
            animationType="fade"
            onRequestClose={() => {
                if (!isSaving) onDismiss();
            }}
        >
            <View style={styles.modalRoot}>
                <Pressable
                    style={styles.modalBackdrop}
                    onPress={isSaving ? () => { } : onDismiss}
                />
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={styles.modalCardWrapper}
                >
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>{isEditMode ? "Edit Measurement" : "Log Measurement"}</Text>
                        <Text style={styles.modalSubtitle}>
                            {isEditMode
                                ? "Update your bodyweight entry to keep your progress accurate."
                                : "Record a new bodyweight entry to update your progress."}
                        </Text>

                        <View style={styles.modalField}>
                            <Text style={styles.modalLabel}>Weight ({weightUnitLabel})</Text>
                            <TextInput
                                value={weightInput}
                                onChangeText={setWeightInput}
                                placeholder={`Enter weight in ${weightUnitLabel}`}
                                placeholderTextColor="rgba(255,255,255,0.4)"
                                keyboardType="decimal-pad"
                                returnKeyType="done"
                                autoCapitalize="none"
                                style={styles.modalInput}
                            />
                        </View>

                        <View style={styles.datetimeRow}>
                            <View style={[styles.modalField, styles.datetimeColumn, styles.datetimeColumnLeft]}>
                                <Text style={styles.modalLabel}>Date</Text>
                                <Pressable
                                    style={[styles.selectorButton, isSaving && styles.selectorButtonDisabled]}
                                    onPress={() => openPicker("date")}
                                    disabled={isSaving}
                                    accessibilityRole="button"
                                    accessibilityLabel="Choose measurement date"
                                >
                                    <Text style={styles.selectorButtonText}>{formattedDateDisplay}</Text>
                                </Pressable>
                            </View>
                            <View style={[styles.modalField, styles.datetimeColumn]}>
                                <Text style={styles.modalLabel}>Time</Text>
                                <Pressable
                                    style={[styles.selectorButton, isSaving && styles.selectorButtonDisabled]}
                                    onPress={() => openPicker("time")}
                                    disabled={isSaving}
                                    accessibilityRole="button"
                                    accessibilityLabel="Choose measurement time"
                                >
                                    <Text style={styles.selectorButtonText}>{formattedTimeDisplay}</Text>
                                </Pressable>
                            </View>
                        </View>

                        <RNBounceable
                            style={styles.nowButton}
                            onPress={handleSetNow}
                            activeScale={0.97}
                            disabled={isSaving}
                            accessibilityRole="button"
                            accessibilityLabel="Set date and time to now"
                        >
                            <Text style={styles.nowButtonText}>Use current date & time</Text>
                        </RNBounceable>

                        <View style={styles.modalActions}>
                            <RNBounceable
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={onDismiss}
                                activeScale={0.97}
                                disabled={isSaving}
                                accessibilityRole="button"
                                accessibilityLabel={isEditMode ? "Cancel editing measurement" : "Cancel logging measurement"}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </RNBounceable>
                            <RNBounceable
                                style={[styles.modalButton, styles.saveButton, isSaving && styles.saveButtonDisabled]}
                                onPress={handleSave}
                                activeScale={0.97}
                                disabled={isSaving}
                                accessibilityRole="button"
                                accessibilityLabel={isEditMode ? "Save measurement changes" : "Save measurement"}
                            >
                                <Text style={styles.saveButtonText}>
                                    {isSaving ? "Saving..." : isEditMode ? "Save Changes" : "Save"}
                                </Text>
                            </RNBounceable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
                {Platform.OS === "ios" && isIOSPickerVisible && (
                    <View style={styles.pickerOverlay} pointerEvents="box-none">
                        <Pressable style={styles.pickerBackdrop} onPress={handleIOSPickerCancel} />
                        <View style={styles.pickerSheet}>
                            <View style={styles.pickerToolbar}>
                                <RNBounceable
                                    onPress={handleIOSPickerCancel}
                                    style={styles.pickerToolbarButton}
                                    activeScale={0.97}
                                    accessibilityRole="button"
                                    accessibilityLabel="Cancel date or time selection"
                                >
                                    <Text style={styles.pickerToolbarButtonText}>Cancel</Text>
                                </RNBounceable>
                                <RNBounceable
                                    onPress={handleIOSPickerConfirm}
                                    style={styles.pickerToolbarButton}
                                    activeScale={0.97}
                                    accessibilityRole="button"
                                    accessibilityLabel="Confirm date or time selection"
                                >
                                    <Text style={styles.pickerToolbarButtonText}>Done</Text>
                                </RNBounceable>
                            </View>
                            <DateTimePicker
                                mode={pickerMode}
                                display="spinner"
                                value={iosDraftDate}
                                onChange={handleIOSPickerChange}
                                maximumDate={new Date()}
                                themeVariant="dark"
                                style={styles.iosPicker}
                            />
                        </View>
                    </View>
                )}
            </View>
        </Modal>
    );
};

const ManageMeasurementsModal = ({
    isVisible,
    onDismiss,
    entries,
    onEdit,
    onDelete,
    isSaving,
}) => {
    const sortedEntries = useMemo(
        () => [...entries].sort((a, b) => b.recordedAt - a.recordedAt),
        [entries]
    );

    return (
        <Modal
            transparent
            visible={isVisible}
            animationType="fade"
            onRequestClose={() => {
                if (!isSaving) onDismiss();
            }}
        >
            <View style={styles.modalRoot}>
                <Pressable
                    style={styles.modalBackdrop}
                    onPress={isSaving ? () => { } : onDismiss}
                />
                <View style={[styles.modalCardWrapper, styles.manageModalWrapper]}>
                    <View style={styles.manageModalCard}>
                        <View style={styles.manageHeader}>
                            <Text style={styles.manageTitle}>Manage Measurements</Text>
                            <RNBounceable
                                style={[styles.modalButton, styles.manageCloseButton]}
                                onPress={onDismiss}
                                activeScale={0.97}
                                disabled={isSaving}
                                accessibilityRole="button"
                                accessibilityLabel="Close manage measurements"
                            >
                                <Text style={styles.manageCloseButtonText}>Done</Text>
                            </RNBounceable>
                        </View>
                        {sortedEntries.length ? (
                            <ScrollView
                                style={styles.manageList}
                                contentContainerStyle={styles.manageListContent}
                            >
                                {sortedEntries.map((entry) => {
                                    const weightText = `${formatWeightValue(entry.weight)} ${entry.unit}`;
                                    const timestampText = dayjs(entry.recordedAt).format(
                                        "MMM D, YYYY • h:mm A"
                                    );
                                    return (
                                        <View key={entry.id} style={styles.manageItem}>
                                            <View style={styles.manageItemInfo}>
                                                <Text style={styles.manageItemWeight}>{weightText}</Text>
                                                <Text style={styles.manageItemTimestamp}>{timestampText}</Text>
                                            </View>
                                            <View style={styles.manageActions}>
                                                <RNBounceable
                                                    style={[styles.manageActionButton, styles.manageEditButton]}
                                                    onPress={() => onEdit(entry)}
                                                    activeScale={0.97}
                                                    disabled={isSaving}
                                                    accessibilityRole="button"
                                                    accessibilityLabel="Edit measurement"
                                                >
                                                    <Text style={styles.manageEditLabel}>Edit</Text>
                                                </RNBounceable>
                                                <RNBounceable
                                                    style={[styles.manageActionButton, styles.manageDeleteButton]}
                                                    onPress={() => onDelete(entry)}
                                                    activeScale={0.97}
                                                    disabled={isSaving}
                                                    accessibilityRole="button"
                                                    accessibilityLabel="Delete measurement"
                                                >
                                                    <Text style={styles.manageDeleteLabel}>Delete</Text>
                                                </RNBounceable>
                                            </View>
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        ) : (
                            <View style={styles.manageEmptyState}>
                                <Text style={styles.manageEmptyText}>No measurements logged yet.</Text>
                            </View>
                        )}
                    </View>

                </View>
            </View>
        </Modal>
    );
};

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
    const [isManageModalVisible, setIsManageModalVisible] = useState(false);
    const [entryToEdit, setEntryToEdit] = useState(null);
    const activeIndexRef = useRef(null);
    const [topPagerIndex, setTopPagerIndex] = useState(0);
    const topPagerIndexRef = useRef(0);

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
        () => (Array.isArray(completedWorkouts) ? completedWorkouts.length : 0),
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
    const resolvedRankTier = useMemo(() => {
        const tierCandidates = [
            userData?.rankTier,
            userData?.stats?.rankTier,
            userData?.profile?.rankTier,
            userData?.competition?.rankTier,
        ];
        for (const candidate of tierCandidates) {
            if (typeof candidate === "string" && candidate.trim()) {
                return candidate.trim();
            }
        }
        return "gold";
    }, [userData]);

    const resolvedRankLabel = useMemo(() => {
        const labelCandidates = [
            userData?.rankLabel,
            userData?.stats?.rankLabel,
            userData?.profile?.rankLabel,
            userData?.competition?.rankLabel,
        ];
        for (const candidate of labelCandidates) {
            if (typeof candidate === "string" && candidate.trim()) {
                return candidate.trim();
            }
        }
        return typeof resolvedRankTier === "string" ? resolvedRankTier : "Your Rank";
    }, [userData, resolvedRankTier]);

    const resolvedRankScore = useMemo(() => {
        const scoreCandidates = [
            userData?.rankScore,
            userData?.stats?.rankScore,
            userData?.stats?.overallScore,
            userData?.competition?.rankScore,
        ];
        for (const candidate of scoreCandidates) {
            const numericValue = Number(candidate);
            if (Number.isFinite(numericValue)) return numericValue;
        }
        return null;
    }, [userData]);

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
    const yTickValues = useMemo(() => {
        if (!axisMetrics) return [];
        const ticks = [];
        for (let i = 0; i <= axisMetrics.sections; i += 1) {
            const value = axisMetrics.minValue + axisMetrics.step * i;
            ticks.push(Math.round((value + Number.EPSILON) * 100) / 100);
        }
        return ticks;
    }, [axisMetrics]);

    const volumeValues = useMemo(() => volumeChartData.map((point) => point.value), [volumeChartData]);
    const volumeAxisMetrics = useMemo(
        () => computeAxisMetrics(volumeValues, sectionsCount),
        [volumeValues]
    );
    const volumeYTickValues = useMemo(() => {
        if (!volumeAxisMetrics) return [];
        const ticks = [];
        for (let i = 0; i <= volumeAxisMetrics.sections; i += 1) {
            const value = volumeAxisMetrics.minValue + volumeAxisMetrics.step * i;
            ticks.push(Math.round((value + Number.EPSILON) * 100) / 100);
        }
        return ticks;
    }, [volumeAxisMetrics]);

    const repsValues = useMemo(() => repsChartData.map((point) => point.value), [repsChartData]);
    const repsAxisMetrics = useMemo(
        () => computeAxisMetrics(repsValues, sectionsCount),
        [repsValues]
    );
    const repsYTickValues = useMemo(() => {
        if (!repsAxisMetrics) return [];
        const ticks = [];
        for (let i = 0; i <= repsAxisMetrics.sections; i += 1) {
            const value = repsAxisMetrics.minValue + repsAxisMetrics.step * i;
            ticks.push(Math.round((value + Number.EPSILON) * 100) / 100);
        }
        return ticks;
    }, [repsAxisMetrics]);

    const personalRecordValues = useMemo(
        () => personalRecordEntries.map((entry) => entry.value),
        [personalRecordEntries]
    );
    const personalRecordAxisMetrics = useMemo(
        () => computeAxisMetrics(personalRecordValues, sectionsCount),
        [personalRecordValues]
    );
    const personalRecordYTickValues = useMemo(() => {
        if (!personalRecordAxisMetrics) return [];
        const ticks = [];
        for (let i = 0; i <= personalRecordAxisMetrics.sections; i += 1) {
            const value = personalRecordAxisMetrics.minValue + personalRecordAxisMetrics.step * i;
            ticks.push(Math.round((value + Number.EPSILON) * 100) / 100);
        }
        return ticks;
    }, [personalRecordAxisMetrics]);

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
    ) || [];

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
    const personalRecordChartPoints = Array.isArray(personalRecordSeries?.points)
        ? personalRecordSeries.points
        : [];

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

    const volumeActiveIndexRef = useRef(null);
    const [volumeActiveIndex, setVolumeActiveIndex] = useState(null);

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

    const repsActiveIndexRef = useRef(null);
    const [repsActiveIndex, setRepsActiveIndex] = useState(null);

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

    const personalRecordActiveIndexRef = useRef(null);
    const [personalRecordActiveIndex, setPersonalRecordActiveIndex] = useState(null);

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
        async ({ weightInput, dateInput, timeInput, entryId }) => {
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

            if (entryId) {
                const targetEntry = existingEntries.find((item) => item.id === entryId);
                if (!targetEntry) {
                    Alert.alert("Measurement not found", "We couldn't locate that measurement.");
                    return;
                }

                const updatedEntry = {
                    ...targetEntry,
                    weight: Math.round(weightNumber * 10) / 10,
                    recordedAt,
                };

                nextEntries = sanitizeEntries(
                    existingEntries.map((item) => (item.id === entryId ? updatedEntry : item))
                );
            } else {
                const safeUnit = (preferredUnit || "lb").toLowerCase().startsWith("k") ? "kg" : "lb";
                const newEntry = {
                    id: makeID(),
                    weight: Math.round(weightNumber * 10) / 10,
                    unit: safeUnit,
                    recordedAt,
                    createdAt: Date.now(),
                };

                nextEntries = sanitizeEntries([...existingEntries, newEntry]);
            }

            const wasPersisted = await persistEntries(nextEntries);
            if (wasPersisted) {
                setIsModalVisible(false);
                setEntryToEdit(null);
            }
        },
        [getCurrentSanitizedEntries, isSaving, persistEntries, preferredUnit]
    );

    const handleDeleteMeasurement = useCallback(
        async (entryId) => {
            if (isSaving) return;
            const existingEntries = getCurrentSanitizedEntries();
            const nextEntries = sanitizeEntries(existingEntries.filter((item) => item.id !== entryId));
            await persistEntries(nextEntries);
        },
        [getCurrentSanitizedEntries, isSaving, persistEntries]
    );

    const handleRequestDelete = useCallback(
        (entry) => {
            const timestampText = dayjs(entry.recordedAt).format("MMM D, YYYY • h:mm A");
            Alert.alert(
                "Delete measurement?",
                `Remove the measurement from ${timestampText}?`,
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => handleDeleteMeasurement(entry.id),
                    },
                ]
            );
        },
        [handleDeleteMeasurement]
    );

    const handleEditEntry = useCallback((entry) => {
        setIsManageModalVisible(false);
        setEntryToEdit(entry);
        setIsModalVisible(true);
    }, []);

    const handleOpenAddModal = useCallback(() => {
        setEntryToEdit(null);
        setIsModalVisible(true);
    }, []);

    const handleCloseAddModal = useCallback(() => {
        if (isSaving) return;
        setIsModalVisible(false);
        setEntryToEdit(null);
    }, [isSaving]);

    const handleCloseManageModal = useCallback(() => {
        if (isSaving) return;
        setIsManageModalVisible(false);
    }, [isSaving]);

    const handleNavigateToPastWorkout = useCallback(
        (entry) => {
            if (!entry) return;
            const wid = typeof entry?.wid === "string" && entry.wid.trim() ? entry.wid.trim() : "";
            if (!wid) return;
            const workout = workoutsByWid.get(wid) || null;
            if (!workout) return;

            const sanitizedWorkout = sanitizeWorkoutForRoute({ ...workout, wid });
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
    const renderMetricToggleRow = useCallback(
        () => (
            <View style={styles.metricToggleRow}>
                {metricTabs.map((tab) => {
                    const isActive = tab.key === activeMetricKey;
                    const iconColor = isActive
                        ? theme.textPrimary ?? "#F6F8FF"
                        : "rgba(216,226,255,0.75)";
                    return (
                        <Pressable
                            key={tab.key}
                            onPress={() => setActiveMetricKey(tab.key)}
                            accessibilityRole="button"
                            accessibilityLabel={`Show ${tab.label} progress`}
                            style={[
                                styles.metricToggleButton,
                                isActive && styles.metricToggleButtonActive,
                                !tab.hasData && !isActive && styles.metricToggleButtonMuted,
                            ]}
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
                                    !tab.hasData && !isActive && styles.metricToggleLabelMuted,
                                ]}
                            >
                                {tab.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        ),
        [activeMetricKey, metricTabs]
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
        const overallSegments = ["calves", "quads", "abs", "obliques", "back", "forearms", "arms", "shoulders", "chest", "traps"];
        const groups = [
            { key: "chest", label: "Chest" },
            { key: "shoulders", label: "Shoulders" },
            { key: "arms", label: "Arms" },
            { key: "back", label: "Back" },
            { key: "legs", label: "Legs" },
            { key: "abs", label: "Abs" },
            { key: "overall", label: "Overall", segments: overallSegments },
        ];
        // Apply per-group scaling through the SVG render itself (keeps strokes crisp) instead of view transforms.
        const iconScales = {
            shoulders: 2.45,
            chest: 2.65,
            arms: 1.7,
            back: 2.15,
            abs: 2.8,
            legs: 2.25,
            overall: 1.5,
        };
        const iconOffsets = {
            shoulders: scaleSize(70),
            chest: scaleSize(80),
            arms: scaleSize(25),
            back: scaleSize(50),
            abs: scaleSize(40),
            legs: scaleSize(-20),
            overall: scaleSize(10),
        };
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
            const iconStrokeWidth = group.key === "back" ? 14 : null;
            return {
                ...group,
                display,
                segments,
                iconScale: iconScales[group.key] || 1,
                iconOffset: iconOffsets[group.key] || 0,
                iconStrokeWidth,
            };
        });
    }, [userData?.statsHexagon]);

    const overallHexDisplay = useMemo(() => {
        const overall = muscleGroupScores.find((item) => item.key === "overall");
        return overall?.display || "--";
    }, [muscleGroupScores]);

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

    const handleTopPagerMomentum = useCallback((event) => {
        const x = event?.nativeEvent?.contentOffset?.x || 0;
        const nextIndex = Math.round(x / DEVICE_WIDTH);
        if (nextIndex !== topPagerIndexRef.current) {
            topPagerIndexRef.current = nextIndex;
            setTopPagerIndex(nextIndex);
        }
    }, []);

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
                    <View style={styles.topPagerContainer}>
                        <View style={styles.bodyLabelOverlayContainer}>
                            <Text style={styles.bodyLabelOverlay}>Your Body</Text>
                            <Text style={styles.bodyLabelSubtitle}>
                                {`${completedWorkoutsCountLabel} lifetime ${
                                    completedWorkoutsCount === 1 ? "workout" : "workouts"
                                }`}
                            </Text>
                        </View>
                        {overallHexDisplay ? (
                            <View style={styles.ovrPill}>
                                <Text style={styles.ovrPillLabel}>OVR</Text>
                                <Text style={styles.ovrPillValue}>{overallHexDisplay}</Text>
                            </View>
                        ) : null}
                        <ScrollView
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            snapToAlignment="center"
                            decelerationRate="fast"
                            onMomentumScrollEnd={handleTopPagerMomentum}
                        >
                            <View style={[styles.topPagerPage, { width: DEVICE_WIDTH }]}>
                                <View
                                    style={[
                                        chartCardLayout.card,
                                        styles.card,
                                        styles.bodyCard,
                                        styles.topPagerCard,
                                    ]}
                                >
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
                            <View style={[styles.topPagerPage, { width: DEVICE_WIDTH }]}>
                                <View
                                    style={[
                                        chartCardLayout.card,
                                        styles.card,
                                        styles.hexCard,
                                        styles.topPagerCard,
                                    ]}
                                >
                                    <View style={styles.hexGraphWrap}>
                                        <HexagonalStats
                                            statsHexagon={userData?.statsHexagon || {}}
                                            size={scaleSize(300)}
                                            labelFontPx={14}
                                            valueFontPx={16}
                                            valueFontBigPx={18}
                                        />
                                    </View>
                                </View>
                            </View>
                        </ScrollView>
                        <View style={[styles.topPagerDots, { backgroundColor: theme.bg, paddingBottom: 0 }]}>
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
                    <View
                    style={[
                        chartCardLayout.card,
                        styles.card,
                        styles.muscleListCard,
                    ]}
                    >
                        <View style={styles.muscleList}>
                            {muscleGroupScores.map((item) => {
                                const isOverall = item.key === "overall";
                                return (
                                    <RNBounceable
                                        key={item.key}
                                        style={styles.muscleRow}
                                        onPress={() => handleMusclePress(item)}
                                        activeScale={0.97}
                                        accessibilityRole="button"
                                        accessibilityLabel={`View ${item.label} exercises`}
                                    >
                                        <View style={styles.muscleLeft}>
                                            <View style={styles.muscleBadge}>
                                                <View style={styles.muscleIconContainer}>
                                                    <View
                                                        style={[
                                                            styles.muscleIconZoom,
                                                            item.iconOffset ? { marginTop: item.iconOffset } : null,
                                                        ]}
                                                    >
                                                        <MuscleGroupIcon
                                                            segments={item.segments}
                                                            dimmed={false}
                                                            strokeWidth={item.iconStrokeWidth}
                                                            highlightColor={MUSCLE_ICON_HIGHLIGHT}
                                                            dimHighlightColor={MUSCLE_ICON_HIGHLIGHT_DIM}
                                                            scale={item.iconScale}
                                                        />
                                                    </View>
                                                </View>
                                            </View>
                                            <View style={styles.muscleLabelColumn}>
                                                <Text
                                                    style={[
                                                        styles.muscleLabel,
                                                        isOverall ? styles.muscleLabelOverall : null,
                                                    ]}
                                                >
                                                    {item.label}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.muscleRight}>
                                            <Text
                                                style={[
                                                    styles.muscleValue,
                                                    isOverall ? styles.muscleValueOverall : null,
                                                ]}
                                            >
                                                {item.display}
                                            </Text>
                                            <Ionicons name="chevron-forward" size={scaleSize(18)} color="rgba(255,255,255,0.55)" />
                                        </View>
                                    </RNBounceable>
                                );
                            })}
                        </View>
                    </View>
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
                                                        <Stop offset="0%" stopColor="#7FB7FF" stopOpacity="0.3" />
                                                        <Stop offset="100%" stopColor="#2D7BFF" stopOpacity="0.08" />
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

                                                {volumeActivePoint ? (
                                                    <Line
                                                        x1={volumeActivePoint.x}
                                                        y1={chartTopMargin}
                                                        x2={volumeActivePoint.x}
                                                        y2={chartBaselineY}
                                                        stroke="rgba(100, 160, 255, 0.45)"
                                                        strokeWidth={pointerStripWidth}
                                                    />
                                                ) : null}

                                                {volumeChartPoints.map((point, index) => (
                                                    <ChartBubble
                                                        key={point.entry?.id || `volume-point-${index}`}
                                                        cx={point.x}
                                                        cy={point.y}
                                                        isActive={index === volumeActiveIndex}
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
                                {renderMetricToggleRow()}
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
                                                        <Stop offset="0%" stopColor="#7FB7FF" stopOpacity="0.3" />
                                                        <Stop offset="100%" stopColor="#2D7BFF" stopOpacity="0.08" />
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

                                                {repsActivePoint ? (
                                                    <Line
                                                        x1={repsActivePoint.x}
                                                        y1={chartTopMargin}
                                                        x2={repsActivePoint.x}
                                                        y2={chartBaselineY}
                                                        stroke="rgba(100, 160, 255, 0.45)"
                                                        strokeWidth={pointerStripWidth}
                                                    />
                                                ) : null}

                                                {repsChartPoints.map((point, index) => (
                                                    <ChartBubble
                                                        key={point.entry?.id || `reps-point-${index}`}
                                                        cx={point.x}
                                                        cy={point.y}
                                                        isActive={index === repsActiveIndex}
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
                                {renderMetricToggleRow()}
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
                                                        <Stop offset="0%" stopColor="#7FB7FF" stopOpacity="0.3" />
                                                        <Stop offset="100%" stopColor="#2D7BFF" stopOpacity="0.08" />
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

                                                {personalRecordActivePoint ? (
                                                    <Line
                                                        x1={personalRecordActivePoint.x}
                                                        y1={chartTopMargin}
                                                        x2={personalRecordActivePoint.x}
                                                        y2={chartBaselineY}
                                                        stroke="rgba(100, 160, 255, 0.45)"
                                                        strokeWidth={pointerStripWidth}
                                                    />
                                                ) : null}

                                                {personalRecordChartPoints.map((point, index) => (
                                                    <ChartBubble
                                                        key={`personal-record-point-${index}`}
                                                        cx={point.x}
                                                        cy={point.y}
                                                        isActive={index === personalRecordActiveIndex}
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
                                {renderMetricToggleRow()}
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

            <ManageMeasurementsModal
                isVisible={isManageModalVisible}
                onDismiss={handleCloseManageModal}
                entries={entries}
                onEdit={handleEditEntry}
                onDelete={handleRequestDelete}
                isSaving={isSaving}
            />
            <AddMeasurementModal
                isVisible={isModalVisible}
                onDismiss={handleCloseAddModal}
                onSubmit={handleSubmitMeasurement}
                unit={entryToEdit?.unit || latestUnit}
                isSaving={isSaving}
                initialEntry={entryToEdit}
                mode={entryToEdit ? "edit" : "create"}
            />
        </>
    );
}

const styles = StyleSheet.create({
    scroll: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    container: {
        paddingTop: scaleSize(10),
        paddingBottom: 0,
        backgroundColor: theme.bg,
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
        fontSize: ts(13),
        color: "rgba(216, 226, 255, 0.78)",
    },
    metricToggleLabelActive: {
        color: theme.textPrimary ?? "#F6F8FF",
    },
    metricToggleLabelMuted: {
        color: "rgba(216, 226, 255, 0.5)",
    },
    bodyCard: {
        paddingVertical: scaleSize(20),
        paddingHorizontal: scaleSize(18),
        marginBottom: 0,
        backgroundColor: theme.bg,
        minHeight: scaleSize(430),
        justifyContent: "center",
    },
    topPagerCard: {
        borderTopWidth: 0,
        borderBottomWidth: 0,
    },
    bodyFiguresRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: scaleSize(6),
        marginTop: scaleSize(-10),
    },
    muscleList: {
        marginTop: 0,
    },
    topPagerContainer: {
        marginBottom: 0,
        position: "relative",
    },
    bodyLabelOverlayContainer: {
        position: "absolute",
        top: scaleSize(12),
        left: scaleSize(24),
        zIndex: 2,
    },
    bodyLabelOverlay: {
        fontFamily: "Outfit_700Bold",
        fontSize: ts(16),
        color: "#FFFFFF",
    },
    bodyLabelSubtitle: {
        marginTop: scaleSize(2),
        fontFamily: "Outfit_500Medium",
        fontSize: ts(12),
        color: "rgba(255,255,255,0.76)",
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
        marginBottom: 0,
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
    muscleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: scaleSize(10),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.06)",
    },
    muscleListCard: {
        marginTop: 0,
        paddingTop: scaleSize(6),
        paddingHorizontal: scaleSize(18),
        borderTopWidth: 0,
    },
    muscleLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    muscleLabelColumn: {
        justifyContent: "center",
    },
    muscleRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: scaleSize(12),
    },
    muscleBadge: {
        width: scaleSize(48),
        height: scaleSize(48),
        borderRadius: scaleSize(24),
        backgroundColor: "rgba(89, 169, 255, 0.12)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: scaleSize(11),
        overflow: "hidden",
    },
    muscleIconContainer: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: scaleSize(26),
        overflow: "hidden",
    },
    muscleIconZoom: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    muscleBadgeText: {
        fontFamily: "Outfit_700Bold",
        fontSize: ts(13),
        color: "rgba(255,255,255,0.9)",
    },
    muscleLabel: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(15),
        color: theme.textPrimary ?? "#F6F8FF",
    },
    muscleValue: {
        fontFamily: "Outfit_700Bold",
        fontSize: ts(15),
        color: theme.textPrimary ?? "#F6F8FF",
    },
    muscleLabelOverall: {
        color: "#6DB7FF",
        fontSize: ts(15),
    },
    muscleValueOverall: {
        color: "#6DB7FF",
        fontSize: ts(15),
    },
    hexCard: {
        backgroundColor: theme.bg,
        paddingBottom: scaleSize(16),
        minHeight: scaleSize(430),
    },
    hexGraphWrap: {
        alignItems: "center",
        justifyContent: "center",
        marginTop: scaleSize(40),
        marginBottom: scaleSize(-25),
    },
    ovrPill: {
        position: "absolute",
        top: scaleSize(10),
        right: scaleSize(24),
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(12),
        paddingVertical: scaleSize(8),
        backgroundColor: "rgba(109, 183, 255, 0.14)",
        borderRadius: scaleSize(16),
        zIndex: 2,
    },
    ovrPillLabel: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: ts(11),
        color: "#6DB7FF",
        letterSpacing: 0.4,
        marginRight: scaleSize(6),
    },
    ovrPillValue: {
        fontFamily: "Outfit_700Bold",
        fontSize: ts(15),
        color: theme.textPrimary ?? "#F6F8FF",
    },
    hexOverallValue: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: ts(18),
        color: "#6DB7FF",
    },
    hexGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: scaleSize(12),
        marginTop: scaleSize(4),
    },
    hexStatItem: {
        width: "30%",
        paddingVertical: scaleSize(6),
    },
    hexStatLabel: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(12),
        color: "rgba(216,226,255,0.72)",
    },
    hexStatValue: {
        fontFamily: "Outfit_700Bold",
        fontSize: ts(15),
        color: theme.textPrimary ?? "#F6F8FF",
        marginTop: scaleSize(2),
    },
    bodyFigureSlot: {
        flex: 1,
        height: scaleSize(440),
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible",
        transform: [{ translateY: scaleSize(46) }],
    },
    bodyFigureSlotFront: {
        marginRight: scaleSize(18),
    },
    bodyFigureSlotBack: {
        marginLeft: scaleSize(18),
    },
    bodyFigure: {
        width: "100%",
        height: "100%",
    },
    contentSurface: {
        backgroundColor: theme.bg,
        paddingBottom: scaleSize(130),
    },
    chartDivider: {
        height: scaleSize(12),
        width: "100%",
        backgroundColor: theme.surface,
    },
    card: {
        backgroundColor: theme.bg,
        paddingHorizontal: scaleSize(18)
    },
    weightCard: {
        backgroundColor: theme.bg,
    },
    volumeCard: {
    },
    header: {},
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
    },
    sectionTitle: {
        color: theme.textPrimary ?? "#F6F8FF",
    },
    manageButton: {
        paddingHorizontal: scaleSize(12),
        paddingVertical: scaleSize(5),
        backgroundColor: "rgba(148, 157, 172, 0.18)",
        borderRadius: scaleSize(999),
        marginRight: scaleSize(12),
    },
    manageButtonLabel: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(12),
        color: "rgba(236, 241, 255, 0.9)",
    },
    addButton: {
        paddingHorizontal: scaleSize(12),
        paddingVertical: scaleSize(6),
        backgroundColor: "rgba(45, 158, 255, 0.16)",
        borderRadius: scaleSize(999),
    },
    addButtonLabel: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(12),
        color: theme.primary ?? "#2D9EFF",
    },
    metricsRow: {},
    weightGroup: {},
    deltaGroup: {
        paddingBottom: scaleSize(3),
    },
    deltaIcon: {
        marginRight: scaleSize(4),
        marginBottom: scaleSize(2),
    },
    weightUnit: {
        color: theme.textPrimary ?? "#F6F8FF",
        marginLeft: scaleSize(6),
        marginBottom: scaleSize(4),
        textTransform: "lowercase",
    },
    summaryText: {
        color: "rgba(255,255,255,0.55)",
        maxWidth: "50%",
        flexShrink: 1,
        marginLeft: scaleSize(12),
        textAlign: "right",
        paddingVertical: scaleSize(2)
    },
    autoUpdateHintWrapper: {
        alignItems: "flex-end",
    },
    autoUpdateHint: {
        color: "rgba(216, 226, 255, 0.55)",
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
    xAxisLabelsOverlay: {
        position: "absolute",
        bottom: 0,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    xAxisLabel: {
        minWidth: scaleSize(40),
        textAlign: "center",
    },
    chartCanvas: {
        flex: 1,
        position: "relative",
    },
    chartEmptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    measurementsRowContainer: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.08)",
    },
    measurementsRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: scaleSize(20),
        paddingRight: scaleSize(8),
        paddingLeft: scaleSize(12),
        borderRadius: scaleSize(14),
    },
    measurementsRowPressed: {
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: scaleSize(14),
    },
    measurementsTextWrap: {
        flex: 1,
    },
    measurementsTitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(14),
        color: theme.textPrimary ?? "#F6F8FF",
    },
    measurementsSubtitle: {
        marginTop: scaleSize(2),
        fontFamily: "Outfit_400Regular",
        fontSize: ts(11),
        color: "rgba(216, 226, 255, 0.72)",
    },
    measurementsChevron: {
        marginLeft: scaleSize(12),
    },
    placeholderText: {
        fontFamily: "Outfit_500Medium",
        fontSize: ts(13),
        color: "rgba(255,255,255,0.55)",
    },
    pointerBubbleGlow: {
        position: "absolute",
        top: scaleSize(-6),
        bottom: scaleSize(-16),
        left: scaleSize(40),
        right: scaleSize(40),
        borderRadius: scaleSize(48),
        opacity: 0.4,
    },
    pointerBubbleHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    pointerBubbleAccentDot: {
        width: scaleSize(9),
        height: scaleSize(9),
        borderRadius: scaleSize(9) / 2,
        marginRight: scaleSize(6),
    },
    pointerBubbleHeaderLabel: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(11),
        letterSpacing: 0.5,
        textTransform: "uppercase",
        color: "rgba(226, 231, 255, 0.85)",
    },
    pointerBubbleHeaderDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: "rgba(255,255,255,0.08)",
        marginTop: scaleSize(8),
    },
    pointerBubbleBody: {
        marginTop: scaleSize(10),
    },
    pointerBubbleDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: "rgba(255,255,255,0.08)",
        marginTop: scaleSize(10),
        marginBottom: scaleSize(6),
    },
    pointerBubbleLineSpacing: {
        marginTop: scaleSize(2),
    },
    pointerBubbleTimestampSpacing: {
        marginTop: scaleSize(2),
    },
    modalRoot: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.35)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: scaleSize(20),
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalCardWrapper: {
        width: "100%",
        maxWidth: scaleSize(360, "w"),
    },
    modalCard: {
        backgroundColor: theme.fieldDeep,
        borderRadius: scaleSize(18),
        paddingHorizontal: scaleSize(20),
        paddingVertical: scaleSize(22),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.08)",
    },
    modalTitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(18),
        color: theme.textPrimary ?? "#F6F8FF",
        marginBottom: scaleSize(6),
    },
    modalSubtitle: {
        fontFamily: "Outfit_400Regular",
        fontSize: ts(13),
        color: "rgba(255,255,255,0.65)",
        marginBottom: scaleSize(18),
    },
    modalField: {
        marginBottom: scaleSize(14),
    },
    modalLabel: {
        fontFamily: "Outfit_500Medium",
        fontSize: ts(13),
        color: "rgba(255,255,255,0.68)",
        marginBottom: scaleSize(6),
    },
    modalInput: {
        height: scaleSize(42),
        borderRadius: scaleSize(10),
        backgroundColor: "rgba(9,9,9,0.35)",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.08)",
        paddingHorizontal: scaleSize(12),
        fontFamily: "Outfit_500Medium",
        fontSize: ts(14),
        color: theme.textPrimary ?? "#F6F8FF",
    },
    selectorButton: {
        height: scaleSize(42),
        borderRadius: scaleSize(10),
        backgroundColor: "rgba(9,9,9,0.35)",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.08)",
        paddingHorizontal: scaleSize(12),
        justifyContent: "center",
    },
    selectorButtonDisabled: {
        opacity: 0.6,
    },
    selectorButtonText: {
        fontFamily: "Outfit_500Medium",
        fontSize: ts(14),
        color: theme.textPrimary ?? "#F6F8FF",
    },
    datetimeRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    datetimeColumn: {
        flex: 1,
    },
    datetimeColumnLeft: {
        marginRight: scaleSize(12),
    },
    nowButton: {
        alignSelf: "flex-start",
        paddingHorizontal: scaleSize(14),
        paddingVertical: scaleSize(6),
        borderRadius: scaleSize(999),
        backgroundColor: "rgba(45, 158, 255, 0.18)",
        marginBottom: scaleSize(8),
    },
    nowButtonText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(12),
        color: theme.primary ?? "#2D9EFF",
    },
    modalActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        marginTop: scaleSize(12),
    },
    modalButton: {
        paddingHorizontal: scaleSize(18),
        paddingVertical: scaleSize(10),
        borderRadius: scaleSize(999),
    },
    cancelButton: {
        backgroundColor: "transparent",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.22)",
    },
    cancelButtonText: {
        fontFamily: "Outfit_500Medium",
        fontSize: ts(13),
        color: "rgba(255,255,255,0.72)",
    },
    saveButton: {
        backgroundColor: theme.primary ?? "#2D9EFF",
        marginLeft: scaleSize(12),
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    pickerOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "flex-end",
    },
    pickerBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.25)",
    },
    pickerSheet: {
        backgroundColor: theme.fieldDeep,
        paddingBottom: Platform.OS === "ios" ? scaleSize(16) : 0,
        borderTopLeftRadius: scaleSize(16),
        borderTopRightRadius: scaleSize(16),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.08)",
    },
    pickerToolbar: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: scaleSize(18),
        paddingTop: scaleSize(14),
        paddingBottom: scaleSize(10),
    },
    pickerToolbarButton: {
        paddingVertical: scaleSize(6),
        paddingHorizontal: scaleSize(4),
    },
    pickerToolbarButtonText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(14),
        color: theme.primary ?? "#2D9EFF",
    },
    iosPicker: {
        backgroundColor: "transparent",
    },
    saveButtonText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(13),
        color: "#0A1420",
    },
    manageModalWrapper: {
        maxHeight: "80%",
    },
    manageModalCard: {
        backgroundColor: theme.fieldDeep,
        borderRadius: scaleSize(18),
        paddingHorizontal: scaleSize(20),
        paddingVertical: scaleSize(20),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.08)",
    },
    manageHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: scaleSize(12),
    },
    manageTitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(16),
        color: theme.textPrimary ?? "#F6F8FF",
    },
    manageCloseButton: {
        backgroundColor: "rgba(148, 157, 172, 0.18)",
        paddingHorizontal: scaleSize(14),
        paddingVertical: scaleSize(6),
        borderRadius: scaleSize(999),
    },
    manageCloseButtonText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(12),
        color: "rgba(236, 241, 255, 0.9)",
    },
    manageList: {
        maxHeight: scaleSize(360, "h"),
    },
    manageListContent: {
        paddingBottom: scaleSize(8),
    },
    manageItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: scaleSize(12),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.08)",
    },
    manageItemInfo: {
        flex: 1,
        marginRight: scaleSize(12),
    },
    manageItemWeight: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(15),
        color: theme.textPrimary ?? "#F6F8FF",
    },
    manageItemTimestamp: {
        marginTop: scaleSize(3),
        fontFamily: "Outfit_400Regular",
        fontSize: ts(12),
        color: "rgba(255,255,255,0.62)",
    },
    manageActions: {
        flexDirection: "row",
        alignItems: "center",
    },
    manageActionButton: {
        paddingHorizontal: scaleSize(12),
        paddingVertical: scaleSize(6),
        borderRadius: scaleSize(999),
    },
    manageEditButton: {
        backgroundColor: "rgba(101, 155, 255, 0.18)",
        marginRight: scaleSize(8),
    },
    manageDeleteButton: {
        backgroundColor: "rgba(255, 86, 86, 0.18)",
    },
    manageEditLabel: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(12),
        color: "#7FB7FF",
    },
    manageDeleteLabel: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(12),
        color: "#FF6B6B",
    },
    manageEmptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: scaleSize(24),
    },
    manageEmptyText: {
        fontFamily: "Outfit_400Regular",
        fontSize: ts(13),
        color: "rgba(255,255,255,0.55)",
    },
});

export default React.memo(ProgressSection);
