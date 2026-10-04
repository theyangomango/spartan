import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import RNBounceable from "@freakycoder/react-native-bounceable";
import dayjs from "dayjs";
import { deleteField, doc, onSnapshot } from "firebase/firestore";

import AddMeasurementModal from "../components/2_Competition/AddMeasurementModal";
import makeID from "../../backend/helper/makeID";
import updateDoc from "../../backend/helper/firebase/updateDoc";
import { subscribeUserData } from "../utils/userDataEvents";
import {
    derivePublicWeightFields,
    sanitizeEntries,
    selectWeightEntrySource,
} from "../utils/weightEntries";
import { resolvePreferredWeightUnit } from "../utils/weightUnits";
import { scaleSize } from "../components/2_Competition/layoutConstants";
import { strong as hapticStrong } from "../utils/haptics";
import { db } from "../../firebase.config";
import styles from "./WeightMeasurementsScreen.styles";

const formatWeightValue = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return "00.0";
    const rounded = Math.round(num * 10) / 10;
    return rounded.toFixed(1);
};

const areEntriesEqual = (left, right) => {
    if (left === right) return true;
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    if (left.length !== right.length) return false;
    for (let i = 0; i < left.length; i += 1) {
        const prev = left[i];
        const next = right[i];
        if (
            prev?.id !== next?.id ||
            prev?.weight !== next?.weight ||
            prev?.recordedAt !== next?.recordedAt
        ) {
            return false;
        }
    }
    return true;
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
    const [liveEntries, setLiveEntries] = useState(null);

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

    useEffect(() => {
        const uid = userData?.uid || userRef.current?.uid;
        if (!uid) {
            setLiveEntries(null);
            return undefined;
        }

        const ref = doc(db, "usersPrivate", uid);
        const unsubscribe = onSnapshot(
            ref,
            (snapshot) => {
                if (!snapshot.exists()) {
                    setLiveEntries((prev) => (prev === null ? prev : null));
                    return;
                }
                const docData = snapshot.data() || {};
                const sanitized = sanitizeEntries(selectWeightEntrySource(docData));
                setLiveEntries((prev) => (areEntriesEqual(prev, sanitized) ? prev : sanitized));
            },
            (error) => {
                console.warn("weight measurements listener error", error);
            }
        );

        return () => {
            unsubscribe();
        };
    }, [userData?.uid]);

    const preferredUnit = useMemo(() => resolvePreferredWeightUnit(userData), [userData]);

    const fallbackEntries = useMemo(
        () => sanitizeEntries(selectWeightEntrySource(userData)),
        [userData]
    );

    const entries = useMemo(
        () => (Array.isArray(liveEntries) ? liveEntries : fallbackEntries),
        [fallbackEntries, liveEntries]
    );

    const sortedEntries = useMemo(
        () => [...entries].sort((a, b) => b.recordedAt - a.recordedAt),
        [entries]
    );

    const handleGoBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    const getCurrentSanitizedEntries = useCallback(() => {
        if (Array.isArray(liveEntries)) {
            return liveEntries;
        }
        const currentUser = userRef.current;
        return sanitizeEntries(selectWeightEntrySource(currentUser));
    }, [liveEntries]);

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
