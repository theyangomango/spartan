import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
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
    if (Math.abs(num) >= 100) return Math.round(num).toString();
    const rounded = Math.round(num * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

const PointerLabelBubble = React.memo(({ entry, unit, isRightAligned }) => {
    if (!entry) return null;

    const weightText = `${formatWeightValue(entry.weight)} ${unit}`;
    const timestampText = dayjs(entry.recordedAt).format("MMM D, h:mm A");

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

    const weightUnitLabel = (initialEntry?.unit || unit) ?? unit;
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
    const latestUnit = (latestEntry?.unit || preferredUnit || "lb").toLowerCase().startsWith("k") ? "kg" : "lb";
    const latestInfoText = latestEntry ? formatTimestamp(latestEntry.recordedAt) : "No entries yet";

    const chartData = useMemo(() => {
        if (!entries.length) return [];
        return entries.map((entry) => ({
            value: Number(entry.weight) || 0,
            recordedAt: entry.recordedAt,
            entry,
        }));
    }, [entries]);
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

    const cardHorizontalPadding = scaleSize(20);
    const chartHeight = scaleSize(220);
    const chartWidth = DEVICE_WIDTH;
    const chartPaddingTop = scaleSize(10);
    const chartPaddingBottom = scaleSize(10);
    const initialSpacing = scaleSize(20);
    const pointerStripWidth = scaleSize(2);
    const yAxisLabelWidth = scaleSize(48);

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

    const chartSeries = useMemo(() => {
        if (!chartData.length) {
            return {
                points: [],
                linePath: "",
                areaPath: "",
                domain: null,
            };
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
            const x = chartLeftMargin + chartInnerWidth * xRatio;

            const rawYRatio = (Number(point.value) - minY) / yRange;
            const yRatio = Number.isFinite(rawYRatio) ? Math.min(Math.max(rawYRatio, 0), 1) : 0;
            const y = chartTopMargin + chartInnerHeight * (1 - yRatio);

            return {
                ...point,
                x,
                y,
            };
        });

        if (!points.length) {
            return {
                points,
                linePath: "",
                areaPath: "",
                domain: { minX, maxX, minY, maxY },
            };
        }

        const baseline = chartBaselineY;
        const firstPoint = points[0];
        const lastPoint = points[points.length - 1];

        const linePath = points
            .map((point, index) => `${index === 0 ? "M" : "L"} ${roundCoord(point.x)} ${roundCoord(point.y)}`)
            .join(" ");

        let areaPath = `M ${roundCoord(firstPoint.x)} ${roundCoord(baseline)} L ${roundCoord(firstPoint.x)} ${roundCoord(firstPoint.y)}`;
        for (let i = 1; i < points.length; i += 1) {
            const point = points[i];
            areaPath += ` L ${roundCoord(point.x)} ${roundCoord(point.y)}`;
        }
        areaPath += ` L ${roundCoord(lastPoint.x)} ${roundCoord(baseline)} Z`;

        return {
            points,
            linePath,
            areaPath,
            domain: { minX, maxX, minY, maxY },
        };
    }, [chartData, axisMetrics, chartLeftMargin, chartInnerWidth, chartTopMargin, chartInnerHeight, chartBaselineY]);

    const handlePointerActivate = useCallback((payload) => {
        if (!payload) return;
        const { index } = payload;
        if (!Number.isFinite(index)) return;
        if (activeIndexRef.current === index) return;
        activeIndexRef.current = index;
        setActiveIndex(index);
    }, []);

    const chartPoints = chartSeries.points;

    const handleChartTouch = useCallback(
        (nativeEvent) => {
            if (!nativeEvent || !chartPoints.length) return;
            const { locationX } = nativeEvent;
            if (!Number.isFinite(locationX)) return;

            const minX = chartLeftMargin;
            const maxX = chartLeftMargin + chartInnerWidth;
            const clampedX = Math.max(minX, Math.min(maxX, locationX));

            let closestIndex = 0;
            let smallestDistance = Math.abs(chartPoints[0].x - clampedX);

            for (let i = 1; i < chartPoints.length; i += 1) {
                const point = chartPoints[i];
                const distance = Math.abs(point.x - clampedX);
                if (distance < smallestDistance) {
                    smallestDistance = distance;
                    closestIndex = i;
                }
            }

            handlePointerActivate({ index: closestIndex });
        },
        [chartPoints, chartLeftMargin, chartInnerWidth, handlePointerActivate]
    );

    const chartPanResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => !!chartPoints.length,
                onMoveShouldSetPanResponder: () => !!chartPoints.length,
                onPanResponderGrant: (evt) => handleChartTouch(evt?.nativeEvent),
                onPanResponderMove: (evt) => handleChartTouch(evt?.nativeEvent),
                onPanResponderRelease: () => {},
                onPanResponderTerminate: () => {},
            }),
        [chartPoints.length, handleChartTouch]
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

    const activePoint = activeIndex != null ? chartPoints[activeIndex] : null;
    const activeEntry = activeIndex != null ? chartData[activeIndex]?.entry : null;
    const pointerLabelWidth = scaleSize(184);
    const pointerLabelLeft = useMemo(() => {
        if (!activePoint) return chartLeftMargin;
        const minLeft = chartLeftMargin;
        const maxLeft = chartPlotWidth - chartRightMargin;
        const centered = activePoint.x - pointerLabelWidth / 2;
        const clamped = Math.max(minLeft, Math.min(centered, maxLeft - pointerLabelWidth));
        return clamped;
    }, [activePoint, chartLeftMargin, chartPlotWidth, chartRightMargin, pointerLabelWidth]);
    const isPointerRightAligned = activeIndex != null ? activeIndex >= Math.ceil(chartData.length / 2) : false;

    useEffect(() => {
        if (!hasChartData && activeIndex != null) {
            setActiveIndex(null);
            activeIndexRef.current = null;
        }
    }, [hasChartData, activeIndex]);

    useEffect(() => {
        if (!hasChartData || activeIndex != null) return;
        const lastIndex = chartData.length - 1;
        if (lastIndex < 0) return;
        handlePointerActivate({
            index: lastIndex,
        });
    }, [hasChartData, chartData, activeIndex, handlePointerActivate]);

    return (
        <View style={styles.container}>
            <View style={[styles.card, { paddingHorizontal: cardHorizontalPadding }]}>
                <View style={styles.header}>
                    <Text style={styles.sectionTitle}>Weight</Text>
                    <View style={styles.headerActions}>
                        <RNBounceable
                            style={styles.manageButton}
                            onPress={() => setIsManageModalVisible(true)}
                            activeScale={0.97}
                            disabled={isSaving}
                            accessibilityRole="button"
                            accessibilityLabel="Manage existing measurements"
                        >
                            <Text style={styles.manageButtonLabel}>Manage Measurements</Text>
                        </RNBounceable>
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

                                    {chartSeries.areaPath ? (
                                        <Path
                                            d={chartSeries.areaPath}
                                            fill="url(#progressChartGradient)"
                                            stroke="none"
                                        />
                                    ) : null}

                                    {chartSeries.linePath ? (
                                        <Path
                                            d={chartSeries.linePath}
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

                                    {activePoint ? (
                                        <Line
                                            x1={activePoint.x}
                                            y1={chartTopMargin}
                                            x2={activePoint.x}
                                            y2={chartBaselineY}
                                            stroke="rgba(45, 158, 255, 0.45)"
                                            strokeWidth={pointerStripWidth}
                                        />
                                    ) : null}

                                    {chartPoints.map((point, index) => {
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

                                {activeEntry ? (
                                    <View
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
                                            },
                                        ]}
                                    >
                                        <PointerLabelBubble
                                            entry={activeEntry}
                                            unit={latestUnit}
                                            isRightAligned={isPointerRightAligned}
                                        />
                                    </View>
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

            </View>

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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingVertical: scaleSize(24),
        backgroundColor: theme.bg,
    },
    card: {
        backgroundColor: theme.surface,
        paddingVertical: scaleSize(22),
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.06)",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: scaleSize(12),
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
    },
    sectionTitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(18),
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
        paddingVertical: scaleSize(5),
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
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginBottom: scaleSize(16),
    },
    weightGroup: {
        flexDirection: "row",
        alignItems: "flex-end",
    },
    weightValue: {
        fontFamily: "Outfit_700Bold",
        fontSize: ts(32),
        color: theme.textPrimary ?? "#F6F8FF",
        lineHeight: ts(34),
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
    },
    chartWrapper: {
        justifyContent: "center",
        alignSelf: "center",
        overflow: "visible",
    },
    chartContent: {
        flexDirection: "row",
        height: "100%",
    },
    yAxisLabelsContainer: {
        position: "relative",
        justifyContent: "center",
    },
    yAxisLabel: {
        position: "absolute",
        right: scaleSize(6),
        textAlign: "right",
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
