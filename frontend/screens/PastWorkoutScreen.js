import React, { useMemo, useCallback, useState } from "react";
import {
    SafeAreaView,
    View,
    StyleSheet,
    ScrollView,
    Pressable,
    Text,
    Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import PastWorkoutExerciseLog from "../components/1_Feed/PastWorkoutExerciseLog";
import theme from "../theme/mfpDark";
import scaleSize from "../helper/scaleSize";
import deleteCompletedWorkout from "../../backend/workouts/deleteCompletedWorkout";
import { emitHexagonUpdate } from "../utils/hexagonEvents";

const HEADER_ICON_SIZE = scaleSize(20);

const toMillis = (value) => {
    if (value === null || typeof value === "undefined") return null;
    if (typeof value === "number") {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : null;
    }
    if (typeof value === "string") {
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    if (typeof value === "object") {
        if (typeof value.toMillis === "function") {
            try {
                const ms = value.toMillis();
                return Number.isFinite(ms) ? ms : null;
            } catch {
                return null;
            }
        }
        if (typeof value.seconds === "number") {
            const ms = value.seconds * 1000 + (typeof value.nanoseconds === "number" ? value.nanoseconds / 1e6 : 0);
            return Number.isFinite(ms) ? ms : null;
        }
        if (typeof value._seconds === "number") {
            const ms = value._seconds * 1000 + (typeof value._nanoseconds === "number" ? value._nanoseconds / 1e6 : 0);
            return Number.isFinite(ms) ? ms : null;
        }
    }
    return null;
};

const formatTimestamp = (value) => {
    const ms = toMillis(value);
    if (ms === null) return "";
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) return "";

    let datePart = "";
    let timePart = "";
    try {
        datePart = date.toLocaleDateString(undefined, {
            month: "long",
            day: "2-digit",
            year: "numeric",
        });
    } catch {
        datePart = "";
    }
    try {
        timePart = date.toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
        });
    } catch {
        timePart = "";
    }

    if (datePart && timePart) return `${datePart} at ${timePart}`;
    return datePart || timePart || "";
};

const PastWorkoutScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const workout = route.params?.workout ?? null;
    const owner = route.params?.owner ?? {};

    const exercises = useMemo(
        () =>
            Array.isArray(workout?.exercises)
                ? workout.exercises.filter((ex) => ex && typeof ex === "object")
                : [],
        [workout?.exercises]
    );

    const workoutTimestamp = useMemo(() => {
        if (!workout) return null;
        const candidates = [
            workout.created,
            workout.finishedAt,
            workout.completedAt,
            workout.createdAt,
            workout.timestamp,
            workout.updatedAt,
            workout.date,
            workout.startTime,
            workout.endTime,
        ];
        for (const candidate of candidates) {
            const ms = toMillis(candidate);
            if (ms !== null) return ms;
        }
        return null;
    }, [workout]);

    const timestampLabel = useMemo(() => formatTimestamp(workoutTimestamp), [workoutTimestamp]);

    const templateName = useMemo(
        () => workout?.templateName || workout?.template?.name || "",
        [workout?.templateName, workout?.template?.name]
    );

    const workoutOwnerUid = useMemo(() => {
        const candidates = [
            owner?.uid,
            workout?.uid,
            workout?.creatorUid,
            workout?.creatorUID,
            workout?.userUid,
        ];
        for (const value of candidates) {
            if (value === undefined || value === null) continue;
            const str = String(value).trim();
            if (str) return str;
        }
        return "";
    }, [owner?.uid, workout?.uid, workout?.creatorUid, workout?.creatorUID, workout?.userUid]);

    const viewerUid = (() => {
        try {
            return global?.userData?.uid ? String(global.userData.uid) : "";
        } catch {
            return "";
        }
    })();

    const isOwner = Boolean(viewerUid && workoutOwnerUid && viewerUid === workoutOwnerUid);
    const [deletingWorkout, setDeletingWorkout] = useState(false);

    const handleBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    const performDeleteWorkout = useCallback(async () => {
        if (!isOwner || deletingWorkout) return;
        const uid = viewerUid;
        if (!uid) return;
        const identifier = {
            wid: workout?.wid ?? workout?.id ?? workout?.workoutId ?? workout?.pid ?? null,
            created:
                workout?.created ??
                workout?.finishedAt ??
                workout?.completedAt ??
                workout?.createdAt ??
                null,
        };
        setDeletingWorkout(true);
        try {
            const result = await deleteCompletedWorkout(uid, identifier);
            if (result?.ok) {
                try {
                    if (global?.userData) {
                        global.userData.completedWorkouts = Array.isArray(result.completedWorkouts)
                            ? result.completedWorkouts
                            : [];
                        global.userData.statsExercises = result.statsExercises || {};
                        global.userData.statsHexagon = result.statsHexagon || {};
                        global.userData.statsHexagonMeta = result.statsHexagonMeta || {};
                        global.userData.statsTotalVolume = result.statsTotalVolume || 0;
                        global.userData.statsTotalHours = result.statsTotalHours || 0;
                        global.userData.statsTotalWorkouts = result.statsTotalWorkouts || 0;
                        global.userData.workoutsByDate = result.workoutsByDate || {};
                    }
                } catch {
                    /* no-op */
                }
                emitHexagonUpdate();
                navigation.goBack();
            } else {
                Alert.alert("Delete failed", "Please try again.");
            }
        } catch (error) {
            Alert.alert("Delete failed", "Please try again in a moment.");
        } finally {
            setDeletingWorkout(false);
        }
    }, [isOwner, deletingWorkout, viewerUid, workout, navigation]);

    const handleRequestDeleteWorkout = useCallback(() => {
        if (!isOwner || deletingWorkout) return;
        Alert.alert("Delete workout?", "This will remove the workout from your history and stats.", [
            { text: "Cancel", style: "cancel" },
            {
                text: deletingWorkout ? "Deleting..." : "Delete",
                style: "destructive",
                onPress: performDeleteWorkout,
            },
        ]);
    }, [isOwner, deletingWorkout, performDeleteWorkout]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <Pressable onPress={handleBack} hitSlop={8} style={styles.headerBackButton}>
                    <Ionicons name="chevron-back" size={HEADER_ICON_SIZE} color={theme.textPrimary} />
                </Pressable>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    Workout Details
                </Text>
                <View style={styles.headerRight}>
                    {isOwner ? (
                        <Pressable
                            onPress={handleRequestDeleteWorkout}
                            hitSlop={8}
                            style={styles.headerIconButton}
                            disabled={deletingWorkout}
                        >
                            <Ionicons
                                name={deletingWorkout ? "time-outline" : "trash-outline"}
                                size={HEADER_ICON_SIZE}
                                color={deletingWorkout ? theme.textSecondary : theme.textPrimary}
                            />
                        </Pressable>
                    ) : null}
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {workout ? (
                    <View style={styles.detailSection}>
                        <View style={styles.logsHeader}>
                            <View style={styles.logsTitleWrap}>
                                <Text style={styles.logsTitle} numberOfLines={1}>
                                    {workout?.name || workout?.templateName || "Workout"}
                                </Text>
                                {timestampLabel ? (
                                    <View style={styles.subtitleRow}>
                                        <Text style={styles.logsSubtitle} numberOfLines={1}>
                                            {timestampLabel}
                                        </Text>
                                    </View>
                                ) : null}
                                {templateName ? (
                                    <Text style={styles.templateSubtitle} numberOfLines={1}>
                                        Template: {templateName}
                                    </Text>
                                ) : null}
                            </View>
                        </View>
                        {exercises.length > 0 ? (
                            exercises.map((exercise, index) => (
                                <PastWorkoutExerciseLog
                                    key={`${exercise?.name || "exercise"}-${index}`}
                                    exercise={exercise}
                                    index={index}
                                />
                            ))
                        ) : (
                            <Text style={styles.noExercisesText}>No exercises recorded for this workout.</Text>
                        )}
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateTitle}>No workout data</Text>
                        <Text style={styles.emptyStateSubtitle}>
                            This workout could not be loaded. Please return to the feed and try again.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(18),
        paddingVertical: scaleSize(12),
    },
    headerBackButton: {
        padding: scaleSize(4),
    },
    headerTitle: {
        flex: 1,
        textAlign: "center",
        color: theme.textPrimary,
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(17),
    },
    headerRight: {
        width: HEADER_ICON_SIZE + scaleSize(12),
        alignItems: "flex-end",
    },
    headerIconButton: {
        padding: scaleSize(4),
    },
    content: {
        paddingBottom: scaleSize(28),
    },
    detailSection: {
        paddingVertical: scaleSize(14),
        backgroundColor: theme.surface,
    },
    logsHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: scaleSize(18),
        paddingBottom: scaleSize(10),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.hairline,
    },
    logsTitleWrap: {
        flex: 1,
        marginRight: scaleSize(12),
    },
    logsTitle: {
        color: theme.textPrimary,
        fontFamily: "Mulish_800ExtraBold",
        fontSize: scaleSize(14),
    },
    subtitleRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: scaleSize(5),
    },
    logsSubtitle: {
        color: theme.textSecondary,
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(12),
    },
    templateSubtitle: {
        marginTop: scaleSize(4),
        color: theme.textSecondary,
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(11.5),
    },
    noExercisesText: {
        paddingHorizontal: scaleSize(18),
        paddingVertical: scaleSize(14),
        color: theme.textSecondary,
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12.5),
    },
    emptyState: {
        marginHorizontal: scaleSize(16),
        marginVertical: scaleSize(24),
        padding: scaleSize(18),
        borderRadius: scaleSize(14),
        backgroundColor: theme.surface,
    },
    emptyStateTitle: {
        color: theme.textPrimary,
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(17),
        marginBottom: scaleSize(8),
    },
    emptyStateSubtitle: {
        color: theme.textSecondary,
        fontFamily: "Outfit_400Regular",
        fontSize: scaleSize(14),
    },
});

export default PastWorkoutScreen;
