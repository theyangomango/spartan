import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
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
import { LineChart } from "react-native-gifted-charts";

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

const PointerLabelBubble = React.memo(({ entry, unit, stripHeight, isRightAligned, onActivate, index }) => {
    const lastNotifiedIndexRef = useRef(null);

    useEffect(() => {
        if (!entry || typeof index !== "number" || !onActivate) return;
        if (lastNotifiedIndexRef.current === index) return;
        lastNotifiedIndexRef.current = index;
        onActivate({
            index,
            recordedAt: entry.recordedAt,
            weight: Number(entry.weight),
        });
    }, [entry, index, onActivate]);

    if (!entry) return null;

    const weightText = `${formatWeightValue(entry.weight)} ${unit}`;
    const timestampText = dayjs(entry.recordedAt).format("MMM D, h:mm A");

    return (
        <View
            pointerEvents="none"
            style={[styles.pointerLabelRoot, { height: stripHeight + scaleSize(92) }]}
        >
            <View style={{ height: stripHeight }} />
            <View
                style={[
                    styles.pointerBubbleWrapper,
                    isRightAligned ? styles.pointerBubbleWrapperRight : styles.pointerBubbleWrapperLeft,
                ]}
                accessible
                accessibilityRole="summary"
                accessibilityLabel={`Weight ${weightText} logged ${timestampText}`}
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
}) => {
    const [weightInput, setWeightInput] = useState("");
    const [dateInput, setDateInput] = useState(() => dayjs().format("YYYY-MM-DD"));
    const [timeInput, setTimeInput] = useState(() => dayjs().format("HH:mm"));

    useEffect(() => {
        if (!isVisible) return;
        const current = dayjs();
        setWeightInput("");
        setDateInput(current.format("YYYY-MM-DD"));
        setTimeInput(current.format("HH:mm"));
    }, [isVisible]);

    const handleSetNow = useCallback(() => {
        const current = dayjs();
        setDateInput(current.format("YYYY-MM-DD"));
        setTimeInput(current.format("HH:mm"));
    }, []);

    const handleSave = useCallback(() => {
        if (isSaving) return;
        onSubmit({ weightInput, dateInput, timeInput });
    }, [dateInput, timeInput, weightInput, onSubmit, isSaving]);

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
                        <Text style={styles.modalTitle}>Log Measurement</Text>
                        <Text style={styles.modalSubtitle}>
                            Record a new bodyweight entry to update your progress.
                        </Text>

                        <View style={styles.modalField}>
                            <Text style={styles.modalLabel}>Weight ({unit})</Text>
                            <TextInput
                                value={weightInput}
                                onChangeText={setWeightInput}
                                placeholder={`Enter weight in ${unit}`}
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
                                accessibilityLabel="Cancel logging measurement"
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </RNBounceable>
                            <RNBounceable
                                style={[styles.modalButton, styles.saveButton, isSaving && styles.saveButtonDisabled]}
                                onPress={handleSave}
                                activeScale={0.97}
                                disabled={isSaving}
                                accessibilityRole="button"
                                accessibilityLabel="Save measurement"
                            >
                                <Text style={styles.saveButtonText}>{isSaving ? "Saving..." : "Save"}</Text>
                            </RNBounceable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
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
    const [activePoint, setActivePoint] = useState(null);
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

    const chartData = useMemo(
        () =>
            entries.map((entry) => ({
                value: Number(entry.weight) || 0,
                label: dayjs(entry.recordedAt).format("MMM D"),
                recordedAt: entry.recordedAt,
            })),
        [entries]
    );
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

    const yAxisOffsetValue = useMemo(() => {
        if (!axisMetrics) return 0;
        const baseStep = axisMetrics.step || 1;
        const buffer = baseStep * 6;
        return Math.max(0, axisMetrics.minValue - buffer);
    }, [axisMetrics]);

    const cardHorizontalPadding = scaleSize(20);
    const chartHeight = scaleSize(220);
    const chartWidth = Math.max(DEVICE_WIDTH - cardHorizontalPadding * 2, scaleSize(240));
    const chartPaddingTop = scaleSize(36);
    const chartPaddingBottom = scaleSize(32);
    const initialSpacing = scaleSize(20);
    const pointerStripHeight = Math.max(
        chartHeight - chartPaddingTop - chartPaddingBottom,
        scaleSize(140)
    );
    const pointerStripWidth = scaleSize(2);
    const yAxisLabelWidth = scaleSize(48);

    const handlePointerActivate = useCallback((payload) => {
        if (!payload) return;
        const { index, recordedAt, weight } = payload;
        if (activeIndexRef.current === index) return;
        const nextDate = new Date(recordedAt);
        setActivePoint({
            index,
            x: nextDate,
            y: weight,
        });
        activeIndexRef.current = index;
    }, []);

    const pointerLabel = useCallback(
        (items, _secondaryItems, pointerIndexArg) => {
            if (!entries.length) return null;
            let resolvedIndex = Number.isFinite(pointerIndexArg)
                ? pointerIndexArg
                : items?.[0]?.index;
            if (!Number.isFinite(resolvedIndex)) return null;

            const clampedIndex = Math.max(0, Math.min(entries.length - 1, resolvedIndex));
            const entry = entries[clampedIndex];
            if (!entry) return null;

            const isRightAligned = clampedIndex >= Math.ceil(entries.length / 2);

            return (
                <PointerLabelBubble
                    entry={entry}
                    unit={latestUnit}
                    stripHeight={pointerStripHeight}
                    isRightAligned={isRightAligned}
                    onActivate={handlePointerActivate}
                    index={clampedIndex}
                />
            );
        },
        [entries, latestUnit, pointerStripHeight, handlePointerActivate]
    );

    const chartSpacing = useMemo(() => {
        if (chartData.length <= 1) return scaleSize(60);
        const availableWidth = chartWidth - initialSpacing * 2;
        return Math.max(scaleSize(28), availableWidth / (chartData.length - 1));
    }, [chartData.length, chartWidth, initialSpacing]);

    const pointerConfig = useMemo(
        () => ({
            pointerColor: "rgba(45, 158, 255, 0.95)",
            pointerRadius: scaleSize(6),
            pointerStripColor: "rgba(45, 158, 255, 0.45)",
            pointerStripWidth,
            pointerStripHeight,
            pointerStripUptoDataPoint: false,
            pointerVanishDelay: 1600,
            activateOnPan: true,
            pointerLabelWidth: scaleSize(184),
            pointerLabelHeight: pointerStripHeight + scaleSize(92),
            pointerLabelComponent: pointerLabel,
        }),
        [pointerStripHeight, pointerLabel, pointerStripWidth]
    );

    const handleSubmitMeasurement = useCallback(
        async ({ weightInput, dateInput, timeInput }) => {
            if (isSaving) return;
            const currentUser = userRef.current;
            const uid = currentUser?.uid || currentUser?.id;
            if (!uid) {
                Alert.alert("Unable to save", "We couldn't find your account. Please try again later.");
                return;
            }

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
            const safeUnit = (preferredUnit || "lb").toLowerCase().startsWith("k") ? "kg" : "lb";
            const entry = {
                id: makeID(),
                weight: Math.round(weightNumber * 10) / 10,
                unit: safeUnit,
                recordedAt,
                createdAt: Date.now(),
            };

            setIsSaving(true);

            const prevEntriesRaw = Array.isArray(currentUser?.progress?.weightEntries)
                ? currentUser.progress.weightEntries
                : [];
            const prevEntries = sanitizeEntries(prevEntriesRaw);
            const nextEntries = sanitizeEntries([...prevEntries, entry]);
            const nextProgress = {
                ...(currentUser?.progress || {}),
                weightEntries: nextEntries,
            };

            const previousSnapshot = currentUser ? { ...currentUser } : null;
            const nextUserData = {
                ...(currentUser || {}),
                progress: nextProgress,
            };

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
                setIsModalVisible(false);
            } catch (error) {
                const message =
                    error?.message ||
                    "Something went wrong while saving your measurement. Please try again.";
                Alert.alert("Unable to save measurement", message);
                const revertedUserData = previousSnapshot
                    ? {
                          ...previousSnapshot,
                          progress: {
                              ...(previousSnapshot.progress || {}),
                              weightEntries: prevEntries,
                          },
                      }
                    : {
                          ...(nextUserData || {}),
                          progress: {
                              ...(nextUserData?.progress || {}),
                              weightEntries: prevEntries,
                          },
                      };

                try {
                    if (global?.userData && typeof global.userData === "object") {
                        global.userData = {
                            ...global.userData,
                            progress: revertedUserData.progress,
                        };
                    } else if (typeof global !== "undefined") {
                        global.userData = revertedUserData;
                    }
                } catch {}

                userRef.current = revertedUserData;
                setUserData(revertedUserData);
                emitUserDataUpdate();
            } finally {
                setIsSaving(false);
            }
        },
        [isSaving, preferredUnit]
    );

    const hasChartData = chartData.length > 0;
    const activeDetails = useMemo(() => {
        if (!activePoint) return null;
        const weightText = `${formatWeightValue(activePoint.y)} ${latestUnit}`;
        const timestampText = dayjs(activePoint.x).format("MMMM D, YYYY • h:mm A");
        return { weightText, timestampText };
    }, [activePoint, latestUnit]);

    useEffect(() => {
        if (!hasChartData && activePoint) {
            setActivePoint(null);
            activeIndexRef.current = null;
        }
    }, [hasChartData, activePoint]);

    useEffect(() => {
        if (!hasChartData || activePoint) return;
        const lastIndex = chartData.length - 1;
        const lastPoint = chartData[lastIndex];
        if (!lastPoint) return;
        handlePointerActivate({
            index: lastIndex,
            recordedAt: lastPoint.recordedAt,
            weight: lastPoint.value,
        });
    }, [hasChartData, chartData, activePoint, handlePointerActivate]);

    return (
        <View style={styles.container}>
            <View style={[styles.card, { paddingHorizontal: cardHorizontalPadding }]}>
                <View style={styles.header}>
                    <Text style={styles.sectionTitle}>Progress</Text>
                    <RNBounceable
                        style={styles.addButton}
                        onPress={() => setIsModalVisible(true)}
                        activeScale={0.97}
                        accessibilityRole="button"
                        accessibilityLabel="Add a new weight measurement"
                    >
                        <Text style={styles.addButtonLabel}>+ Add Measurement</Text>
                    </RNBounceable>
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
                        <LineChart
                            style={styles.lineChart}
                            data={chartData}
                            curved
                            areaChart
                            adjustToWidth
                            color="#7FB7FF"
                            // color1="#7FB7FF"
                            startFillColor="#64A0FF"
                            startOpacity={0.3}
                            endFillColor="#2D7BFF"
                            endOpacity={0.08}
                            thickness={scaleSize(3)}
                            spacing={chartSpacing}
                            initialSpacing={initialSpacing}
                            endSpacing={initialSpacing}
                            hideDataPoints={!hasChartData}
                            showDataPoints={hasChartData}
                            dataPointsColor="#E1EEFF"
                            dataPointsWidth={scaleSize(7)}
                            dataPointsHeight={scaleSize(7)}
                            rulesType="dashed"
                            rulesColor="rgba(255,255,255,0.1)"
                            rulesThickness={StyleSheet.hairlineWidth}
                            maxValue={axisMetrics.maxValue}
                            yAxisOffset={yAxisOffsetValue}
                            noOfSections={axisMetrics.sections}
                            yAxisLabelTexts={yTickValues.map((value) => formatAxisValue(value))}
                            yAxisLabelTextStyle={styles.axisLabel}
                            yAxisTextStyle={styles.axisLabel}
                            yAxisColor="rgba(148, 157, 172, 0.35)"
                            yAxisLabelWidth={yAxisLabelWidth}
                            xAxisLabelTexts={chartData.map((point) => point.label)}
                            xAxisLabelTextStyle={styles.axisLabel}
                            xAxisTextStyle={styles.axisLabel}
                            xAxisColor="rgba(148, 157, 172, 0.35)"
                            xAxisLabelsHeight={scaleSize(15)}
                            pointerConfig={pointerConfig}
                            onDataPointClick={({ index }) => {
                                if (index == null) return;
                                const point = chartData[index];
                                if (!point) return;
                                handlePointerActivate({
                                    index,
                                    recordedAt: point.recordedAt,
                                    weight: point.value,
                                });
                            }}
                        />
                    ) : (
                        <View style={styles.chartEmptyState}>
                            <Text style={styles.placeholderText}>
                                Log a measurement to begin.
                            </Text>
                        </View>
                    )}
                </View>

            </View>

            <AddMeasurementModal
                isVisible={isModalVisible}
                onDismiss={() => {
                    if (!isSaving) setIsModalVisible(false);
                }}
                onSubmit={handleSubmitMeasurement}
                unit={latestUnit}
                isSaving={isSaving}
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
    sectionTitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(18),
        color: theme.textPrimary ?? "#F6F8FF",
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
    lineChart: {
        flex: 1,
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
    pointerLabelRoot: {
        width: scaleSize(184),
        alignItems: "center",
        justifyContent: "flex-end",
    },
    pointerBubbleWrapper: {
        width: "100%",
        marginTop: scaleSize(12),
        marginBottom: scaleSize(8),
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
});
