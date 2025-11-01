import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Animated,
    KeyboardAvoidingView,
    Modal,
    PanResponder,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Weight } from "iconsax-react-native";
import dayjs from "dayjs";

import theme from "../../../theme/mfpDark";
import makeID from "../../../../backend/helper/makeID";
import updateDoc from "../../../../backend/helper/firebase/updateDoc";
import { emitUserDataUpdate, subscribeUserData } from "../../../utils/userDataEvents";
import { DEVICE_WIDTH, scaleSize, ts } from "../layoutConstants";
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop } from "react-native-svg";

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
    const suffix = unitLabel ? ` ${unitLabel}` : "";
    return {
        icon,
        color,
        text: `${sign}${formattedValue}${suffix}`,
    };
};

const formatWeightValue = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return "00";
    if (num >= 100) return Math.round(num).toString();
    const rounded = Math.round(num * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

const formatTimestamp = (value) => {
    const ms = Number(value);
    if (!Number.isFinite(ms) || ms <= 0) return "No Logged Data";
    try {
        return dayjs(ms).format("MMM D, h:mm A");
    } catch {
        return "No Logged Data";
    }
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

const resolveWorkoutTimestamp = (workout) => {
    const candidates = [
        workout?.finishedAt,
        workout?.completedAt,
        workout?.endedAt,
        workout?.timestamp,
        workout?.loggedAt,
        workout?.updatedAt,
        workout?.createdAt,
        workout?.created,
    ];
    for (const candidate of candidates) {
        if (candidate == null) continue;
        const direct = Number(candidate);
        if (Number.isFinite(direct) && direct > 0) return direct;
        if (typeof candidate === "string" && candidate.trim()) {
            const parsed = Date.parse(candidate);
            if (Number.isFinite(parsed)) return parsed;
        }
        if (typeof candidate === "object" && candidate?.toDate) {
            try {
                const converted = candidate.toDate().getTime();
                if (Number.isFinite(converted)) return converted;
            } catch {}
        }
    }
    return null;
};

const formatVolumeValue = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return "0";
    if (num >= 1000) {
        try {
            return new Intl.NumberFormat("en-US").format(Math.round(num));
        } catch {}
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
            if (!Number.isFinite(recordedAt) || !Number.isFinite(volume) || volume <= 0) return null;
            return {
                id: workout.id || workout.wid || workout.workoutId || workout.sessionId || makeID(),
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
            if (!Number.isFinite(recordedAt) || !Number.isFinite(reps) || reps <= 0) return null;
            return {
                id: workout.id || workout.wid || workout.workoutId || workout.sessionId || makeID(),
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
        styles.pointerBubbleDelta,
        isPositiveDelta
            ? styles.pointerBubbleDeltaPositive
            : isNegativeDelta
                ? styles.pointerBubbleDeltaNegative
                : styles.pointerBubbleDeltaNeutral,
    ];

    return (
        <View
            pointerEvents="none"
            style={[
                styles.pointerLabelRoot,
                isRightAligned ? styles.pointerBubbleWrapperRight : styles.pointerBubbleWrapperLeft,
            ]}
            accessible
            accessibilityRole="summary"
            accessibilityLabel={`Weight ${weightText} logged ${timestampText}`}
        >
            <View
                style={[
                    styles.pointerBubbleWrapper,
                    isRightAligned ? styles.pointerBubbleWrapperRight : styles.pointerBubbleWrapperLeft,
                ]}
            >
                <View style={styles.pointerBubble}>
                    <Text style={styles.pointerBubbleWeight}>{weightText}</Text>
                    {deltaText ? <Text style={deltaStyle}>{deltaText}</Text> : null}
                    <Text style={styles.pointerBubbleTimestamp}>{timestampText}</Text>
                </View>
            </View>
        </View>
    );
});

const VolumePointerLabel = React.memo(({ entry, unit, isRightAligned }) => {
    if (!entry) return null;

    const unitText = toDisplayWeightUnit(unit);
    const totalText = `${formatVolumeValue(entry.value)} ${unitText}`;
    const incrementText = entry.increment ? `+${formatVolumeValue(entry.increment)} ${unitText}` : null;
    const timestampText = dayjs(entry.recordedAt).format("MMM D, h:mm A");

    return (
        <View
            pointerEvents="none"
            style={[
                styles.pointerLabelRoot,
                isRightAligned ? styles.pointerBubbleWrapperRight : styles.pointerBubbleWrapperLeft,
            ]}
        >
            <View
                style={[
                    styles.pointerBubbleWrapper,
                    isRightAligned ? styles.pointerBubbleWrapperRight : styles.pointerBubbleWrapperLeft,
                ]}
            >
                <View style={styles.pointerBubble}>
                    <Text style={styles.pointerBubbleWeight}>{totalText}</Text>
                    {incrementText ? (
                        <Text style={styles.pointerBubbleIncrement}>{incrementText} this workout</Text>
                    ) : null}
                    <Text style={styles.pointerBubbleTimestamp}>{timestampText}</Text>
                </View>
            </View>
        </View>
    );
});

const RepsPointerLabel = React.memo(({ entry, isRightAligned }) => {
    if (!entry) return null;

    const totalText = `${formatVolumeValue(entry.value)} reps`;
    const incrementText = entry.increment ? `+${formatVolumeValue(entry.increment)} reps` : null;
    const timestampText = dayjs(entry.recordedAt).format("MMM D, h:mm A");

    return (
        <View
            pointerEvents="none"
            style={[
                styles.pointerLabelRoot,
                isRightAligned ? styles.pointerBubbleWrapperRight : styles.pointerBubbleWrapperLeft,
            ]}
        >
            <View
                style={[
                    styles.pointerBubbleWrapper,
                    isRightAligned ? styles.pointerBubbleWrapperRight : styles.pointerBubbleWrapperLeft,
                ]}
            >
                <View style={styles.pointerBubble}>
                    <Text style={styles.pointerBubbleWeight}>{totalText}</Text>
                    {incrementText ? (
                        <Text style={styles.pointerBubbleIncrement}>{incrementText} this workout</Text>
                    ) : null}
                    <Text style={styles.pointerBubbleTimestamp}>{timestampText}</Text>
                </View>
            </View>
        </View>
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
    const [dateInput, setDateInput] = useState(() => dayjs().format("YYYY-MM-DD"));
    const [timeInput, setTimeInput] = useState(() => dayjs().format("HH:mm"));

    useEffect(() => {
        if (!isVisible) return;
        if (mode === "edit" && initialEntry) {
            setWeightInput(String(initialEntry.weight ?? ""));
            const entryDay = dayjs(initialEntry.recordedAt);
            setDateInput(entryDay.isValid() ? entryDay.format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"));
            setTimeInput(entryDay.isValid() ? entryDay.format("HH:mm") : dayjs().format("HH:mm"));
        } else {
            const current = dayjs();
            setWeightInput("");
            setDateInput(current.format("YYYY-MM-DD"));
            setTimeInput(current.format("HH:mm"));
        }
    }, [isVisible, initialEntry, mode]);

    const handleSetNow = useCallback(() => {
        const current = dayjs();
        setDateInput(current.format("YYYY-MM-DD"));
        setTimeInput(current.format("HH:mm"));
    }, []);

    const handleSave = useCallback(() => {
        if (isSaving) return;
        onSubmit({ weightInput, dateInput, timeInput, entryId: initialEntry?.id });
    }, [dateInput, timeInput, weightInput, onSubmit, isSaving, initialEntry?.id]);

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
                    onPress={isSaving ? () => {} : onDismiss}
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
                                <TextInput
                                    value={dateInput}
                                    onChangeText={setDateInput}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor="rgba(255,255,255,0.4)"
                                    keyboardType="numbers-and-punctuation"
                                    autoCapitalize="none"
                                    style={styles.modalInput}
                                />
                            </View>
                            <View style={[styles.modalField, styles.datetimeColumn]}>
                                <Text style={styles.modalLabel}>Time</Text>
                                <TextInput
                                    value={timeInput}
                                    onChangeText={setTimeInput}
                                    placeholder="HH:mm"
                                    placeholderTextColor="rgba(255,255,255,0.4)"
                                    keyboardType="numbers-and-punctuation"
                                    autoCapitalize="none"
                                    style={styles.modalInput}
                                />
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
                    onPress={isSaving ? () => {} : onDismiss}
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

export default function ProgressSection() {
    const [userData, setUserData] = useState(() => {
        try {
            return global?.userData || null;
        } catch {
            return null;
        }
    });
    const userRef = useRef(userData);
    const navigation = useNavigation();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeIndex, setActiveIndex] = useState(null);
    const [isManageModalVisible, setIsManageModalVisible] = useState(false);
    const [entryToEdit, setEntryToEdit] = useState(null);
    const activeIndexRef = useRef(null);

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

    const entries = useMemo(() => {
        const list =
            userData?.progress?.weightEntries ||
            userData?.weightEntries ||
            userData?.bodyweightLog ||
            [];
        return sanitizeEntries(list);
    }, [userData]);

    const latestEntry = entries.length ? entries[entries.length - 1] : null;
    const latestWeightText = formatWeightValue(latestEntry?.weight);
    const latestUnit = latestEntry
        ? toDisplayWeightUnit(latestEntry?.unit, displayPreferredUnit)
        : displayPreferredUnit;
    const latestInfoText = latestEntry ? formatTimestamp(latestEntry.recordedAt) : "No entries yet";

    const volumeEntries = useMemo(
        () => sanitizeVolumeEntries(userData?.completedWorkouts || []),
        [userData]
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
        () => sanitizeRepsEntries(userData?.completedWorkouts || []),
        [userData]
    );
    const latestRepsEntry = repsEntries.length ? repsEntries[repsEntries.length - 1] : null;
    const latestRepsText = latestRepsEntry ? formatVolumeValue(latestRepsEntry.value) : "--";
    const latestRepsInfo = latestRepsEntry ? formatTimestamp(latestRepsEntry.recordedAt) : "No workouts yet";
    const latestRepsUnit = latestRepsEntry ? "reps" : "";
    const latestRepsDeltaMeta = latestRepsEntry
        ? buildMetricDeltaDisplay(latestRepsEntry.increment, "reps", formatVolumeValue)
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

    const cardHorizontalPadding = scaleSize(16);
    const chartHeight = scaleSize(220);
    const chartWidth = Math.max(DEVICE_WIDTH - cardHorizontalPadding, scaleSize(200));
    const chartPaddingTop = scaleSize(0);
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

    const getCurrentSanitizedEntries = useCallback(() => {
        const currentUser = userRef.current;
        const list =
            currentUser?.progress?.weightEntries ||
            currentUser?.weightEntries ||
            currentUser?.bodyweightLog ||
            [];
        return sanitizeEntries(list);
    }, []);

    const persistEntries = useCallback(
        async (nextEntriesSanitized) => {
            const currentUser = userRef.current;
            const uid = currentUser?.uid || currentUser?.id;
            if (!uid) {
                Alert.alert("Unable to save", "We couldn't find your account. Please try again later.");
                return false;
            }

            const previousSnapshot = currentUser ? { ...currentUser } : null;
            const nextProgress = {
                ...(currentUser?.progress || {}),
                weightEntries: nextEntriesSanitized,
            };
            const nextUserData = {
                ...(currentUser || {}),
                progress: nextProgress,
            };

            setIsSaving(true);

            try {
                if (global?.userData && typeof global.userData === "object") {
                    global.userData = { ...global.userData, progress: nextProgress };
                } else if (typeof global !== "undefined") {
                    global.userData = nextUserData;
                }
            } catch {}

            userRef.current = nextUserData;
            setUserData(nextUserData);
            emitUserDataUpdate();

            try {
                await updateDoc("users", uid, { progress: nextProgress });
                emitUserDataUpdate();
                return true;
            } catch (error) {
                const message =
                    error?.message ||
                    "Something went wrong while saving your measurement. Please try again.";

                if (previousSnapshot) {
                    try {
                        if (global?.userData && typeof global.userData === "object") {
                            global.userData = previousSnapshot;
                        } else if (typeof global !== "undefined") {
                            global.userData = previousSnapshot;
                        }
                    } catch {}

                    userRef.current = previousSnapshot;
                    setUserData(previousSnapshot);
                    emitUserDataUpdate();
                }

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

    const hasChartData = chartData.length > 0;
    const hasVolumeChartData = volumeChartData.length > 0;
    const hasRepsChartData = repsChartData.length > 0;

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

    const weightPointerOpacity = useRef(new Animated.Value(0)).current;
    const volumePointerOpacity = useRef(new Animated.Value(0)).current;
    const repsPointerOpacity = useRef(new Animated.Value(0)).current;
    const weightHideTimeout = useRef(null);
    const volumeHideTimeout = useRef(null);
    const repsHideTimeout = useRef(null);

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

    useEffect(
        () => () => {
            clearWeightHideTimeout();
            clearVolumeHideTimeout();
            clearRepsHideTimeout();
        },
        [clearWeightHideTimeout, clearVolumeHideTimeout, clearRepsHideTimeout]
    );

    return (
        <>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.card, styles.volumeCard, { paddingHorizontal: cardHorizontalPadding }]}>
                    <View style={styles.header}>
                        <Text style={styles.sectionTitle}>Total Volume</Text>
                        <View style={styles.autoUpdateHintWrapper}>
                            <Text style={styles.autoUpdateHint}>Auto-updates from</Text>
                            <Text style={styles.autoUpdateHint}>completed workouts.</Text>
                        </View>
                    </View>

                    <View style={styles.metricsRow}>
                        <View style={styles.weightGroup}>
                            <Text style={styles.weightValue}>{latestVolumeText}</Text>
                            <Text style={styles.weightUnit}>{latestVolumeUnit}</Text>
                            {latestVolumeDeltaMeta ? (
                                <View style={styles.deltaGroup}>
                                    <Ionicons
                                        name={latestVolumeDeltaMeta.icon}
                                        size={scaleSize(19)}
                                        color={latestVolumeDeltaMeta.color}
                                        style={styles.deltaIcon}
                                    />
                                    <Text
                                        style={[styles.weightValue, styles.deltaText, { color: latestVolumeDeltaMeta.color }]}
                                    >
                                        {latestVolumeDeltaMeta.text}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                        <Text style={styles.summaryText}>{latestVolumeInfo}</Text>
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
                                                    styles.axisLabel,
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

                                        {volumeChartPoints.map((point, index) => {
                                            const isActive = index === volumeActiveIndex;
                                            const radius = isActive ? scaleSize(6) : scaleSize(4.2);
                                            const strokeWidth = isActive ? scaleSize(2) : scaleSize(1);
                                            const strokeColor = isActive
                                                ? "rgba(100, 160, 255, 0.9)"
                                                : "rgba(100, 160, 255, 0.45)";
                                            const fillColor = isActive
                                                ? "#E1EEFF"
                                                : "rgba(225, 238, 255, 0.78)";
                                            return (
                                                <Circle
                                                    key={point.entry?.id || `volume-point-${index}`}
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
                                                    style={[styles.axisLabel, styles.xAxisLabel]}
                                                >
                                                    {item.label}
                                                </Text>
                                            ))}
                                        </View>
                                    ) : null}

                                    {volumeActiveEntry ? (
                                        <Animated.View
                                            pointerEvents="none"
                                            style={[
                                                styles.pointerBubbleContainer,
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
                </View>
                <View
                    style={[
                        styles.card,
                        {
                            paddingHorizontal: cardHorizontalPadding,
                            marginBottom: scaleSize(32),
                        },
                    ]}
                >
                    <View style={styles.header}>
                        <Text style={styles.sectionTitle}>Total Reps</Text>
                        <View style={styles.autoUpdateHintWrapper}>
                            <Text style={styles.autoUpdateHint}>Auto-updates from</Text>
                            <Text style={styles.autoUpdateHint}>completed workouts.</Text>
                        </View>
                    </View>

                    <View style={styles.metricsRow}>
                        <View style={styles.weightGroup}>
                            <Text style={styles.weightValue}>{latestRepsText}</Text>
                            <Text style={styles.weightUnit}>{latestRepsUnit}</Text>
                            {latestRepsDeltaMeta ? (
                                <View style={styles.deltaGroup}>
                                    <Ionicons
                                        name={latestRepsDeltaMeta.icon}
                                        size={scaleSize(19)}
                                        color={latestRepsDeltaMeta.color}
                                        style={styles.deltaIcon}
                                    />
                                    <Text
                                        style={[styles.weightValue, styles.deltaText, { color: latestRepsDeltaMeta.color }]}
                                    >
                                        {latestRepsDeltaMeta.text}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                        <Text style={styles.summaryText}>{latestRepsInfo}</Text>
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
                                                    styles.axisLabel,
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

                                        {repsChartPoints.map((point, index) => {
                                            const isActive = index === repsActiveIndex;
                                            const radius = isActive ? scaleSize(6) : scaleSize(4.2);
                                            const strokeWidth = isActive ? scaleSize(2) : scaleSize(1);
                                            const strokeColor = isActive
                                                ? "rgba(100, 160, 255, 0.9)"
                                                : "rgba(100, 160, 255, 0.45)";
                                            const fillColor = isActive
                                                ? "#E1EEFF"
                                                : "rgba(225, 238, 255, 0.78)";
                                            return (
                                                <Circle
                                                    key={point.entry?.id || `reps-point-${index}`}
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
                                                    style={[styles.axisLabel, styles.xAxisLabel]}
                                                >
                                                    {item.label}
                                                </Text>
                                            ))}
                                        </View>
                                    ) : null}

                                    {repsActiveEntry ? (
                                        <Animated.View
                                            pointerEvents="none"
                                            style={[
                                                styles.pointerBubbleContainer,
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
                </View>
                <View style={[styles.card, { paddingHorizontal: cardHorizontalPadding }]}>
                    <View style={styles.header}>
                        <Text style={styles.sectionTitle}>Body Weight</Text>
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

                    <View style={styles.metricsRow}>
                        <View style={styles.weightGroup}>
                            <Text style={styles.weightValue}>{latestWeightText}</Text>
                            <Text style={styles.weightUnit}>{latestUnit}</Text>
                            {latestWeightDeltaMeta ? (
                                <View style={styles.deltaGroup}>
                                    <Ionicons
                                        name={latestWeightDeltaMeta.icon}
                                        size={scaleSize(19)}
                                        color={latestWeightDeltaMeta.color}
                                        style={styles.deltaIcon}
                                    />
                                    <Text
                                        style={[styles.weightValue, styles.deltaText, { color: latestWeightDeltaMeta.color }]}
                                    >
                                        {latestWeightDeltaMeta.text}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                        <Text style={styles.summaryText}>{latestInfoText}</Text>
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
                                                    styles.axisLabel,
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

                                        {weightChartPoints.map((point, index) => {
                                            const isActive = index === activeIndex;
                                            const radius = isActive ? scaleSize(6) : scaleSize(4.2);
                                            const strokeWidth = isActive ? scaleSize(2) : scaleSize(1);
                                            const strokeColor = isActive
                                                ? "rgba(45, 158, 255, 0.9)"
                                                : "rgba(45, 158, 255, 0.45)";
                                            const fillColor = isActive
                                                ? "#E1EEFF"
                                                : "rgba(225, 238, 255, 0.78)";
                                            return (
                                                <Circle
                                                    key={point.entry?.id || `point-${index}`}
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
                                                    style={[styles.axisLabel, styles.xAxisLabel]}
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
                                                styles.pointerBubbleContainer,
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
        paddingBottom: scaleSize(130),
        backgroundColor: theme.bg,
    },
    card: {
        backgroundColor: theme.surface,
        paddingTop: scaleSize(16),
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.06)",
    },
    volumeCard: {
        marginBottom: scaleSize(32),
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: scaleSize(4),
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
    },
    sectionTitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(15),
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
    metricsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: scaleSize(2),
    },
    weightGroup: {
        flexDirection: "row",
        alignItems: "flex-end",
    },
    weightValue: {
        fontFamily: "Outfit_700Bold",
        fontSize: ts(22),
        color: theme.textPrimary ?? "#F6F8FF",
        lineHeight: ts(23),
    },
    deltaGroup: {
        flexDirection: "row",
        alignItems: "flex-end",
        marginLeft: scaleSize(10),
    },
    deltaIcon: {
        marginRight: scaleSize(4),
        marginBottom: scaleSize(2),
    },
    deltaText: {
        fontSize: ts(16),
        lineHeight: ts(18),
    },
    weightUnit: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(16),
        color: theme.textPrimary ?? "#F6F8FF",
        marginLeft: scaleSize(6),
        marginBottom: scaleSize(4),
        textTransform: "lowercase",
    },
    summaryText: {
        fontFamily: "Outfit_400Regular",
        fontSize: ts(12),
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
        fontFamily: "Outfit_400Regular",
        fontSize: ts(11),
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
        color: "rgba(216, 226, 255, 0.65)",
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
    axisLabel: {
        fontFamily: "Outfit_400Regular",
        fontSize: ts(11),
        color: '#aaa',
    },
    pointerBubbleContainer: {
        position: "absolute",
    },
    pointerLabelRoot: {
        width: scaleSize(184),
        alignItems: "center",
        justifyContent: "flex-end",
    },
    pointerBubbleWrapper: {
        width: "100%",
        marginTop: scaleSize(4),
        marginBottom: scaleSize(4),
        paddingHorizontal: scaleSize(8),
    },
    pointerBubbleWrapperLeft: {
        alignItems: "flex-start",
    },
    pointerBubbleWrapperRight: {
        alignItems: "flex-end",
    },
    pointerBubble: {
        maxWidth: "100%",
        minWidth: scaleSize(140),
        paddingHorizontal: scaleSize(14),
        paddingVertical: scaleSize(10),
        borderRadius: scaleSize(16),
        backgroundColor: "rgba(9, 12, 18, 0.92)",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.12)",
    },
    pointerBubbleWeight: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(16),
        color: theme.textPrimary ?? "#F6F8FF",
    },
    pointerBubbleDelta: {
        marginTop: scaleSize(2),
        fontFamily: "Outfit_500Medium",
        fontSize: ts(11),
    },
    pointerBubbleDeltaPositive: {
        color: "#65F2B6",
    },
    pointerBubbleDeltaNegative: {
        color: "#FF6B6B",
    },
    pointerBubbleDeltaNeutral: {
        color: "rgba(216, 226, 255, 0.82)",
    },
    pointerBubbleIncrement: {
        marginTop: scaleSize(2),
        fontFamily: "Outfit_500Medium",
        fontSize: ts(11),
        color: "#65F2B6",
    },
    pointerBubbleTimestamp: {
        marginTop: scaleSize(2),
        fontFamily: "Outfit_400Regular",
        fontSize: ts(11),
        color: "rgba(255,255,255,0.72)",
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
    datetimeRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    datetimeColumn: {
        flex: 1,
        marginBottom: 0,
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
