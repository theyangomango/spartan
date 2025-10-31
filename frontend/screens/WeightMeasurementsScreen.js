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
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import RNBounceable from "@freakycoder/react-native-bounceable";
import dayjs from "dayjs";

import theme from "../theme/mfpDark";
import makeID from "../../backend/helper/makeID";
import updateDoc from "../../backend/helper/firebase/updateDoc";
import { emitUserDataUpdate, subscribeUserData } from "../utils/userDataEvents";
import { scaleSize, ts } from "../components/2_Competition/layoutConstants";

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
                    <Ionicons name="chevron-back" size={scaleSize(22)} color="rgba(236, 241, 255, 0.92)" />
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
                            const timestampText = dayjs(entry.recordedAt).format("MMM D, YYYY • h:mm A");
                            return (
                                <View key={entry.id} style={styles.entryCard}>
                                    <View style={styles.entryInfo}>
                                        <Text style={styles.entryWeight}>{weightText}</Text>
                                        <Text style={styles.entryTimestamp}>{timestampText}</Text>
                                    </View>
                                    <View style={styles.entryActions}>
                                        <RNBounceable
                                            style={[styles.entryActionButton, styles.entryEditButton]}
                                            onPress={() => handleEditEntry(entry)}
                                            activeScale={0.97}
                                            disabled={isSaving}
                                            accessibilityRole="button"
                                            accessibilityLabel="Edit measurement"
                                        >
                                            <Text style={styles.entryEditLabel}>Edit</Text>
                                        </RNBounceable>
                                        <RNBounceable
                                            style={[styles.entryActionButton, styles.entryDeleteButton]}
                                            onPress={() => handleRequestDelete(entry)}
                                            activeScale={0.97}
                                            disabled={isSaving}
                                            accessibilityRole="button"
                                            accessibilityLabel="Delete measurement"
                                        >
                                            <Text style={styles.entryDeleteLabel}>Delete</Text>
                                        </RNBounceable>
                                    </View>
                                </View>
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
        borderRadius: scaleSize(12),
        backgroundColor: "rgba(34, 48, 75, 0.4)",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(90, 124, 188, 0.38)",
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
        fontSize: ts(13),
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
        paddingHorizontal: scaleSize(16),
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
    },
    entryWeight: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(16),
        color: theme.textPrimary ?? "#F6F8FF",
    },
    entryTimestamp: {
        marginTop: scaleSize(2),
        fontFamily: "Outfit_400Regular",
        fontSize: ts(11),
        color: "rgba(216, 226, 255, 0.7)",
    },
    entryActions: {
        flexDirection: "row",
        alignItems: "center",
    },
    entryActionButton: {
        paddingVertical: scaleSize(6),
        paddingHorizontal: scaleSize(12),
        borderRadius: scaleSize(999),
        borderWidth: StyleSheet.hairlineWidth,
    },
    entryEditButton: {
        borderColor: "rgba(120, 173, 255, 0.6)",
        backgroundColor: "rgba(52, 96, 160, 0.22)",
    },
    entryDeleteButton: {
        marginLeft: scaleSize(8),
        borderColor: "rgba(255, 102, 102, 0.5)",
        backgroundColor: "rgba(128, 32, 32, 0.18)",
    },
    entryEditLabel: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(12),
        color: "rgba(200, 220, 255, 0.95)",
    },
    entryDeleteLabel: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(12),
        color: "rgba(255, 135, 135, 0.95)",
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
});
