import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import RNBounceable from "@freakycoder/react-native-bounceable";
import dayjs from "dayjs";

import theme from "../theme/mfpDark";
import makeID from "../../backend/helper/makeID";
import updateDoc from "../../backend/helper/firebase/updateDoc";
import { emitUserDataUpdate, subscribeUserData } from "../utils/userDataEvents";
import { scaleSize, ts } from "../components/2_Competition/layoutConstants";
import { strong as hapticStrong } from "../utils/haptics";

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

const normalizeToMinute = (value) => dayjs(value).second(0).millisecond(0).toDate();

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
    const [selectedDate, setSelectedDate] = useState(() => normalizeToMinute(new Date()));
    const [pickerMode, setPickerMode] = useState("date");
    const [isIOSPickerVisible, setIsIOSPickerVisible] = useState(false);
    const [iosDraftDate, setIosDraftDate] = useState(() => normalizeToMinute(new Date()));

    useEffect(() => {
        if (!isVisible) return;
        if (mode === "edit" && initialEntry) {
            setWeightInput(String(initialEntry.weight ?? ""));
            const entryDay = dayjs(initialEntry.recordedAt);
            const nextDate = entryDay.isValid() ? normalizeToMinute(entryDay.toDate()) : normalizeToMinute(new Date());
            setSelectedDate(nextDate);
            setIosDraftDate(nextDate);
        } else {
            const current = normalizeToMinute(new Date());
            setWeightInput("");
            setSelectedDate(current);
            setIosDraftDate(current);
        }
        setIsIOSPickerVisible(false);
        setPickerMode("date");
    }, [isVisible, initialEntry, mode]);

    const handleSetNow = useCallback(() => {
        const current = normalizeToMinute(new Date());
        setSelectedDate(current);
        setIosDraftDate(current);
    }, []);

    const handleSave = useCallback(() => {
        if (isSaving) return;
        const timestamp = dayjs(selectedDate);
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
            if (Platform.OS === "android") {
                DateTimePickerAndroid.open({
                    mode: safeMode,
                    value: selectedDate,
                    is24Hour: false,
                    onChange: (event, nextDate) => {
                        if (event.type !== "set" || !nextDate) return;
                        setSelectedDate((prev) => {
                            const updated = mergeDateByMode(prev, nextDate, safeMode);
                            setIosDraftDate(updated);
                            return updated;
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
            setIosDraftDate((prev) => mergeDateByMode(prev, nextDate, pickerMode));
        },
        [pickerMode]
    );

    const handleIOSPickerCancel = useCallback(() => {
        setIsIOSPickerVisible(false);
        setIosDraftDate(selectedDate);
    }, [selectedDate]);

    const handleIOSPickerConfirm = useCallback(() => {
        setSelectedDate(iosDraftDate);
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

export default function WeightMeasurementsScreen() {
    const navigation = useNavigation();
    const [userData, setUserData] = useState(() => {
        try {
            return global?.userData || null;
        } catch {
            return null;
        }
    });
    const userRef = useRef(userData);
    const [isSaving, setIsSaving] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [entryToEdit, setEntryToEdit] = useState(null);

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

    const sortedEntries = useMemo(
        () => [...entries].sort((a, b) => b.recordedAt - a.recordedAt),
        [entries]
    );

    const handleGoBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

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
        setEntryToEdit(entry);
        setIsModalVisible(true);
    }, []);

    const handleAddEntry = useCallback(() => {
        setEntryToEdit(null);
        setIsModalVisible(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        if (isSaving) return;
        setIsModalVisible(false);
        setEntryToEdit(null);
    }, [isSaving]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
            <View style={styles.header}>
                <RNBounceable
                    onPress={handleGoBack}
                    activeScale={0.97}
                    style={styles.backButton}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Ionicons name="chevron-back" size={scaleSize(24)} color="rgba(196, 204, 222, 0.9)" />
                </RNBounceable>
                <View pointerEvents="none" style={styles.headerTitleWrapper}>
                    <Text style={styles.headerTitle}>Weight Measurements</Text>
                </View>
                <RNBounceable
                    onPress={handleAddEntry}
                    activeScale={0.97}
                    disabled={isSaving}
                    style={styles.headerAddButton}
                    accessibilityRole="button"
                    accessibilityLabel="Add new weight measurement"
                >
                    <Text style={styles.headerAddLabel}>+ Add</Text>
                </RNBounceable>
            </View>

                {sortedEntries.length ? (
                    <ScrollView
                        style={styles.list}
                        contentContainerStyle={styles.listContent}
                    >
                        {sortedEntries.map((entry) => {
                            const weightText = `${formatWeightValue(entry.weight)} ${entry.unit}`;
                            const entryDay = dayjs(entry.recordedAt);
                            const dateText = entryDay.isValid()
                                ? entryDay.format("MMM D, YYYY")
                                : "";
                            const timeText = entryDay.isValid()
                                ? entryDay.format("h:mm A")
                                : "";

                            const renderRightActions = () => (
                                <View style={styles.entryActionsContainer}>
                                    <Pressable
                                        onPress={() => {
                                            try {
                                                hapticStrong?.();
                                            } catch {}
                                            handleRequestDelete(entry);
                                        }}
                                        style={styles.entryDeleteSwipe}
                                        accessibilityRole="button"
                                        accessibilityLabel="Delete measurement"
                                        disabled={isSaving}
                                    >
                                        <Ionicons name="trash-outline" size={scaleSize(18)} color="#F27171" />
                                    </Pressable>
                                </View>
                            );

                            return (
                                <Swipeable
                                    key={entry.id}
                                    overshootRight={false}
                                    friction={2.2}
                                    rightThreshold={40}
                                    renderRightActions={renderRightActions}
                                >
                                    <Pressable
                                        onPress={() => {
                                            try {
                                                hapticStrong?.();
                                            } catch {}
                                            handleEditEntry(entry);
                                        }}
                                        android_ripple={{ color: "rgba(255,255,255,0.06)" }}
                                        style={styles.entryCard}
                                        accessibilityRole="button"
                                        accessibilityLabel="Edit measurement"
                                    >
                                        <View style={styles.entryInfo}>
                                            <Text style={styles.entryWeight}>{weightText}</Text>
                                            <View style={styles.entryTimestampWrap}>
                                                <Text style={styles.entryDate}>{dateText}</Text>
                                                <Text style={styles.entryTime}>{timeText}</Text>
                                            </View>
                                        </View>
                                    </Pressable>
                                </Swipeable>
                            );
                        })}
                    </ScrollView>
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyTitle}>No measurements logged yet</Text>
                        <Text style={styles.emptySubtitle}>
                            Tap “+ Add” to record your first weight entry.
                        </Text>
                    </View>
                )}
            </View>

            <AddMeasurementModal
                isVisible={isModalVisible}
                onDismiss={handleCloseModal}
                onSubmit={handleSubmitMeasurement}
                unit={entryToEdit?.unit || preferredUnit}
                isSaving={isSaving}
                initialEntry={entryToEdit}
                mode={entryToEdit ? "edit" : "create"}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    container: {
        flex: 1,
        paddingTop: scaleSize(12),
        paddingBottom: scaleSize(24),
        backgroundColor: theme.bg,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: scaleSize(20),
        paddingHorizontal: scaleSize(20),
    },
    backButton: {
        width: scaleSize(38),
        height: scaleSize(38),
        borderRadius: scaleSize(19),
        backgroundColor: "transparent",
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitleWrapper: {
        position: "absolute",
        left: scaleSize(20),
        right: scaleSize(20),
        height: scaleSize(38),
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(16),
        color: theme.textPrimary ?? "#F6F8FF",
        textAlign: "center",
    },
    headerAddButton: {
        paddingHorizontal: scaleSize(12),
        paddingVertical: scaleSize(6),
        borderRadius: scaleSize(999),
        backgroundColor: "rgba(45, 158, 255, 0.16)",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(90, 170, 255, 0.45)",
    },
    headerAddLabel: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(12),
        color: theme.primary ?? "#2D9EFF",
    },
    list: {
        flex: 1,
    },
    listContent: {
        paddingBottom: scaleSize(32),
    },
    entryCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: scaleSize(16),
        paddingRight: scaleSize(16),
        paddingLeft: scaleSize(26),
        borderRadius: 0,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.08)",
        backgroundColor: theme.surface,
        marginBottom: 0,
        width: "100%",
    },
    entryInfo: {
        flex: 1,
        marginRight: scaleSize(12),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    entryWeight: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(15),
        color: theme.textPrimary ?? "#F6F8FF",
    },
    entryTimestampWrap: {
        alignItems: "flex-end",
        justifyContent: "center",
        minWidth: scaleSize(110),
    },
    entryDate: {
        fontFamily: "Outfit_500Medium",
        fontSize: ts(11),
        color: "rgba(216, 226, 255, 0.85)",
        textAlign: "right",
    },
    entryTime: {
        marginTop: scaleSize(3),
        fontFamily: "Outfit_400Regular",
        fontSize: ts(10),
        color: "rgba(216, 226, 255, 0.55)",
        textAlign: "right",
    },
    entryActionsContainer: {
        justifyContent: "center",
        alignItems: "flex-end",
        height: "100%",
        width: scaleSize(96),
        backgroundColor: "transparent",
    },
    entryDeleteSwipe: {
        height: "100%",
        width: "100%",
        backgroundColor: "rgba(242,113,113,0.16)",
        alignItems: "center",
        justifyContent: "center",
    },
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyTitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(16),
        color: theme.textPrimary ?? "#F6F8FF",
    },
    emptySubtitle: {
        marginTop: scaleSize(6),
        fontFamily: "Outfit_400Regular",
        fontSize: ts(12),
        color: "rgba(216, 226, 255, 0.7)",
        textAlign: "center",
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
        marginBottom: scaleSize(16),
    },
    modalField: {
        marginBottom: scaleSize(16),
    },
    modalLabel: {
        fontFamily: "Outfit_500Medium",
        fontSize: ts(12),
        color: "rgba(255,255,255,0.72)",
        marginBottom: scaleSize(6),
    },
    modalInput: {
        backgroundColor: "rgba(9, 12, 18, 0.72)",
        borderRadius: scaleSize(12),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.12)",
        paddingHorizontal: scaleSize(14),
        paddingVertical: Platform.select({ ios: scaleSize(12), default: scaleSize(10) }),
        fontFamily: "Outfit_500Medium",
        fontSize: ts(13),
        color: theme.textPrimary ?? "#F6F8FF",
    },
    datetimeRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    datetimeColumn: {
        flex: 1,
    },
    datetimeColumnLeft: {
        marginRight: scaleSize(12),
    },
    nowButton: {
        paddingVertical: scaleSize(8),
        alignItems: "center",
        justifyContent: "center",
        borderRadius: scaleSize(12),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.15)",
        marginBottom: scaleSize(16),
    },
    nowButtonText: {
        fontFamily: "Outfit_500Medium",
        fontSize: ts(12),
        color: "rgba(226, 236, 255, 0.75)",
    },
    modalActions: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    modalButton: {
        flex: 1,
        paddingVertical: scaleSize(10),
        borderRadius: scaleSize(12),
        alignItems: "center",
        justifyContent: "center",
    },
    cancelButton: {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.15)",
        marginRight: scaleSize(10),
    },
    saveButton: {
        backgroundColor: theme.primary ?? "#2D9EFF",
    },
    saveButtonDisabled: {
        backgroundColor: "rgba(45, 158, 255, 0.45)",
    },
    cancelButtonText: {
        fontFamily: "Outfit_500Medium",
        fontSize: ts(13),
        color: "rgba(226, 236, 255, 0.75)",
    },
    saveButtonText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(13),
        color: "#0B1017",
    },
    selectorButton: {
        backgroundColor: "rgba(9, 12, 18, 0.72)",
        borderRadius: scaleSize(12),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.12)",
        paddingHorizontal: scaleSize(14),
        minHeight: Platform.select({ ios: scaleSize(44), default: scaleSize(42) }),
        justifyContent: "center",
    },
    selectorButtonDisabled: {
        opacity: 0.6,
    },
    selectorButtonText: {
        fontFamily: "Outfit_500Medium",
        fontSize: ts(13),
        color: theme.textPrimary ?? "#F6F8FF",
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
});
