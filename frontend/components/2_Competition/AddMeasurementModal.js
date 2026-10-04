// Modal that logs a new bodyweight measurement or edits an existing one (weight, date and time).
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import RNBounceable from "@freakycoder/react-native-bounceable";
import dayjs from "dayjs";

import { toDisplayWeightUnit } from "../../utils/weightUnits";
import styles from "./AddMeasurementModal.styles";

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
    const [selectedDate, setSelectedDate] = useState(() => clampDateToNow(new Date()));
    const [pickerMode, setPickerMode] = useState("date");
    const [isIOSPickerVisible, setIsIOSPickerVisible] = useState(false);
    const [iosDraftDate, setIosDraftDate] = useState(() => clampDateToNow(new Date()));

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

export default AddMeasurementModal;
