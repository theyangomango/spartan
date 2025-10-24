import React, { useMemo, useCallback, useState, useEffect, useRef } from "react";
import {
    SafeAreaView,
    View,
    StyleSheet,
    ScrollView,
    Pressable,
    Text,
    Alert,
    Dimensions,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import FastImage from "react-native-fast-image";
import { doc, onSnapshot, collection, addDoc, serverTimestamp } from "firebase/firestore";

import PastWorkoutExerciseLog from "../components/1_Feed/PastWorkoutExerciseLog";
import EditingWorkoutModal from "../components/3_Workout/NewWorkout/EditingWorkoutModal";
import theme from "../theme/mfpDark";
import scaleSize from "../helper/scaleSize";
import { usePfp } from "../helper/usePFPs";
import deleteCompletedWorkout from "../../backend/workouts/deleteCompletedWorkout";
import updateCompletedWorkout from "../../backend/workouts/updateCompletedWorkout";
import { emitHexagonUpdate } from "../utils/hexagonEvents";
import isThisUser from "../helper/isThisUser";
import { strong as hapticStrong } from "../utils/haptics";
import VerifiedHandle from "../components/common/VerifiedHandle";
import useUserVerified from "../hooks/useUserVerified";
import { db } from "../../firebase.config";

const HEADER_ICON_SIZE = scaleSize(20);
const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

const formatDuration = (durationMs) => {
    const ms = Number(durationMs);
    if (!Number.isFinite(ms) || ms <= 0) return "--";
    const totalMinutes = Math.max(0, Math.round(ms / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    if (totalSeconds >= 60) {
        const mins = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${mins}m ${seconds}s`;
    }
    return `${totalSeconds}s`;
};

const formatNumber = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "--";
    try {
        return num.toLocaleString();
    } catch {
        return String(num);
    }
};

const resolveWeightUnit = () => {
    try {
        const raw = global?.userData?.settings?.units || global?.userData?.units;
        if (!raw) return "lb";
        const normalized = String(raw).toLowerCase();
        return normalized === "kg" ? "kg" : "lb";
    } catch {
        return "lb";
    }
};

const resolveWorkoutTitle = (workout, caption) => (
    workout?.templateName ||
    workout?.template?.name ||
    workout?.name ||
    caption ||
    "Workout"
);

const initialsFrom = (name = "") => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const pickFirstString = (...values) => {
    for (const value of values) {
        if (typeof value !== "string") continue;
        const trimmed = value.trim();
        if (trimmed) return trimmed;
    }
    return "";
};

const PastWorkoutScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const routeWorkout = route.params?.workout ?? null;
    const [workout, setWorkout] = useState(routeWorkout);
    const owner = route.params?.owner ?? {};
    const deriveLiveStatus = useCallback(
        (candidateWorkout, fallbackLive = false) => {
            const fromRoute = Boolean(route.params?.isLiveWorkout);
            const fromWorkout = Boolean(candidateWorkout?.isLive || candidateWorkout?.live);
            const fromPid = typeof route.params?.postMeta?.pid === "string"
                ? route.params.postMeta.pid.startsWith("workout:live")
                : false;
            return fromRoute || fromWorkout || fromPid || fallbackLive;
        },
        [route.params?.isLiveWorkout, route.params?.postMeta?.pid]
    );

    const [isLiveWorkout, setIsLiveWorkout] = useState(() => deriveLiveStatus(routeWorkout));
    const workoutWid = useMemo(() => {
        const candidates = [
            workout?.wid,
            workout?.workoutId,
            workout?.id,
            workout?.pid,
            routeWorkout?.wid,
            routeWorkout?.workoutId,
            routeWorkout?.id,
            routeWorkout?.pid,
        ];
        for (const candidate of candidates) {
            if (candidate === undefined || candidate === null) continue;
            const str = String(candidate).trim();
            if (str) return str;
        }
        return "";
    }, [workout, routeWorkout]);
    const [confettiTick, setConfettiTick] = useState(0);
    const confettiRef = useRef(null);
    const ConfettiModuleRef = useRef(null);
    const loadConfettiModule = useCallback(() => {
        if (!ConfettiModuleRef.current) {
            try { ConfettiModuleRef.current = require("react-native-confetti-cannon").default; } catch { }
        }
        return ConfettiModuleRef.current;
    }, []);
    const fireConfetti = useCallback(() => {
        loadConfettiModule();
        try {
            const api = confettiRef.current;
            if (api && typeof api.start === "function") {
                api.start();
                return;
            }
        } catch { }
        setConfettiTick((t) => t + 1);
    }, [loadConfettiModule]);
    const sendCheerEvent = useCallback(async () => {
        if (!isLiveWorkout) return;
        try {
            const wid = workoutWid;
            if (!wid) return;
            const fromUid = String(global?.userData?.uid || "");
            if (!fromUid) return;
            await addDoc(collection(db, "workouts", wid, "events"), {
                type: "cheer",
                fromUid,
                createdAt: serverTimestamp(),
                source: "workout_viewer",
            });
        } catch (e) {
            console.log("PastWorkoutScreen cheer error", e?.message || e);
        }
    }, [isLiveWorkout, workoutWid]);

    useEffect(() => {
        setWorkout(routeWorkout);
        setIsLiveWorkout(deriveLiveStatus(routeWorkout));
    }, [routeWorkout, deriveLiveStatus]);

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
    const timestampDisplay = useMemo(
        () => (isLiveWorkout ? "Live now" : timestampLabel),
        [isLiveWorkout, timestampLabel]
    );

    const workoutIdentifier = useMemo(() => ({
        wid: routeWorkout?.wid ?? routeWorkout?.id ?? routeWorkout?.workoutId ?? routeWorkout?.pid ?? null,
        created: routeWorkout?.created ?? routeWorkout?.createdAt ?? routeWorkout?.finishedAt ?? routeWorkout?.completedAt ?? null,
    }), [
        routeWorkout?.wid,
        routeWorkout?.id,
        routeWorkout?.workoutId,
        routeWorkout?.pid,
        routeWorkout?.created,
        routeWorkout?.createdAt,
        routeWorkout?.finishedAt,
        routeWorkout?.completedAt,
    ]);

    const templateName = useMemo(
        () => workout?.templateName || workout?.template?.name || "",
        [workout?.templateName, workout?.template?.name]
    );

    const caption = useMemo(() => {
        const value = workout?.caption ?? workout?.notes ?? templateName ?? "";
        if (value == null) return "";
        return String(value).trim();
    }, [workout?.caption, workout?.notes, templateName]);

    const title = useMemo(() => resolveWorkoutTitle(workout, caption), [workout, caption]);

    const shouldShowSubtitle = useMemo(() => {
        if (!workout) return false;
        if (caption.length === 0) return false;
        const normalizedCaption = caption.toLowerCase();
        const normalizedTitle = (title || "").trim().toLowerCase();
        if (!normalizedTitle) return true;
        return normalizedCaption !== normalizedTitle;
    }, [caption, workout, title]);

    const workoutName = useMemo(() => {
        if (!workout) return "";
        const candidate = workout?.templateName || workout?.template?.name || workout?.name;
        if (typeof candidate === "string") return candidate.trim();
        if (candidate) return String(candidate).trim();
        return "";
    }, [workout]);

    const isWorkoutTitle = useMemo(() => {
        if (!workoutName) return false;
        const normalizedTitle = (title || "").trim();
        if (!normalizedTitle) return false;
        return normalizedTitle.toLowerCase() === workoutName.toLowerCase();
    }, [title, workoutName]);

    const shouldListenToLive = useMemo(
        () => deriveLiveStatus(routeWorkout),
        [routeWorkout, deriveLiveStatus]
    );

    const durationLabel = useMemo(() => formatDuration(workout?.duration), [workout?.duration]);
    const volumeLabel = useMemo(() => formatNumber(workout?.volume), [workout?.volume]);
    const recordsLabel = useMemo(
        () => formatNumber(workout?.PBs ?? workout?.pbs ?? 0),
        [workout?.PBs, workout?.pbs]
    );
    const weightUnit = useMemo(() => resolveWeightUnit(), []);

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

    const displayName = useMemo(() => {
        const candidates = [
            owner?.handle,
            owner?.username,
            owner?.tag,
            owner?.name,
            workout?.handle,
            workout?.ownerHandle,
        ];
        for (const value of candidates) {
            if (typeof value !== "string") continue;
            const trimmed = value.trim();
            if (trimmed) return trimmed;
        }
        if (workoutOwnerUid) return `user-${workoutOwnerUid.slice(-4)}`;
        return "user";
    }, [owner?.handle, owner?.username, owner?.tag, owner?.name, workout?.handle, workout?.ownerHandle, workoutOwnerUid]);

    const pfpUri = usePfp(
        workoutOwnerUid || "",
        owner?.pfpVersion ?? workout?.pfpVersion ?? 0,
        owner?.pfp || owner?.pfpUrl || owner?.avatar || owner?.image || owner?.photoURL || ""
    );

    useEffect(() => {
        const ownerId = String(workoutOwnerUid || "").trim();
        if (!shouldListenToLive || !ownerId) return undefined;
        let isMounted = true;
        const unsubscribe = onSnapshot(
            doc(db, "users", ownerId),
            (snapshot) => {
                if (!isMounted) return;
                const data = snapshot.data() || {};
                const current = data.currentWorkout || null;
                if (current) {
                    setWorkout((prev) => ({ ...(prev || {}), ...current }));
                    setIsLiveWorkout(true);
                } else {
                    setIsLiveWorkout(false);
                }
            },
            (error) => {
                console.warn("[PastWorkoutScreen] live workout listener error", error);
            }
        );
        return () => {
            isMounted = false;
            try { unsubscribe(); } catch { }
        };
    }, [shouldListenToLive, workoutOwnerUid]);

    const fallbackVerified = useMemo(
        () => Boolean(
            owner?.isVerified ||
            owner?.verified ||
            workout?.isVerified ||
            workout?.verified
        ),
        [owner?.isVerified, owner?.verified, workout?.isVerified, workout?.verified]
    );

    const isOwnerVerified = useUserVerified(workoutOwnerUid, fallbackVerified);

    const sanitizedHandle = useMemo(() => {
        if (!displayName) return "";
        const trimmed = displayName.replace(/^@+/, "").trim();
        return trimmed || displayName;
    }, [displayName]);

    const viewerUid = (() => {
        try {
            return global?.userData?.uid ? String(global.userData.uid) : "";
        } catch {
            return "";
        }
    })();

    const isOwner = Boolean(viewerUid && workoutOwnerUid && viewerUid === workoutOwnerUid);
    const canEditWorkout = Boolean(isOwner && !isLiveWorkout);
    const [deletingWorkout, setDeletingWorkout] = useState(false);
    const [editingVisible, setEditingVisible] = useState(false);

    const handleBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    const ownerProfilePayload = useMemo(() => {
        const targetUid = String(workoutOwnerUid || "").trim();
        if (!targetUid) return null;

        const handleValue = pickFirstString(
            owner?.handle,
            owner?.username,
            owner?.tag,
            workout?.handle,
            workout?.ownerHandle
        );

        const nameValue = pickFirstString(
            owner?.name,
            owner?.displayName,
            owner?.fullName,
            workout?.ownerName,
            workout?.name
        );

        const fallbackName = (() => {
            if (nameValue) return nameValue;
            if (typeof displayName === "string") {
                const trimmed = displayName.replace(/^@+/, "").trim();
                if (trimmed) return trimmed;
            }
            return "";
        })();

        const pfpValue = pickFirstString(
            owner?.pfp,
            owner?.pfpUrl,
            owner?.avatar,
            owner?.image,
            owner?.photoURL,
            workout?.pfp,
            workout?.pfpUrl,
            pfpUri
        );

        return {
            uid: targetUid,
            handle: handleValue || undefined,
            name: fallbackName || undefined,
            pfp: pfpValue || undefined,
        };
    }, [
        workoutOwnerUid,
        owner?.handle,
        owner?.username,
        owner?.tag,
        owner?.name,
        owner?.displayName,
        owner?.fullName,
        owner?.pfp,
        owner?.pfpUrl,
        owner?.avatar,
        owner?.image,
        owner?.photoURL,
        workout?.handle,
        workout?.ownerHandle,
        workout?.ownerName,
        workout?.name,
        workout?.pfp,
        workout?.pfpUrl,
        displayName,
        pfpUri,
    ]);

    const handlePressOwnerProfile = useCallback(() => {
        if (!ownerProfilePayload?.uid) return;
        hapticStrong();
        const rootNav = navigation?.getParent?.("ROOT");
        if (isThisUser(ownerProfilePayload.uid)) {
            if (rootNav?.navigate) {
                rootNav.navigate("Profile", { transition: "slide-from-right" });
            } else {
                navigation.navigate("Profile", { transition: "slide-from-right" });
            }
            return;
        }
        const user = {
            uid: ownerProfilePayload.uid,
            handle: ownerProfilePayload.handle,
            name: ownerProfilePayload.name,
            pfp: ownerProfilePayload.pfp,
        };
        if (rootNav?.navigate) {
            rootNav.navigate("ViewProfile", { user });
        } else {
            navigation.navigate("ViewProfile", { user });
        }
    }, [navigation, ownerProfilePayload]);

    const handlePressWorkoutHeader = useCallback(() => {}, []);

    const performDeleteWorkout = useCallback(async () => {
        if (!canEditWorkout || deletingWorkout) return;
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
    }, [canEditWorkout, deletingWorkout, viewerUid, workout, navigation]);

    const handleRequestDeleteWorkout = useCallback(() => {
        if (!canEditWorkout || deletingWorkout) return;
        Alert.alert("Delete workout?", "This will remove the workout from your history and stats.", [
            { text: "Cancel", style: "cancel" },
            {
                text: deletingWorkout ? "Deleting..." : "Delete",
                style: "destructive",
                onPress: performDeleteWorkout,
            },
        ]);
    }, [canEditWorkout, deletingWorkout, performDeleteWorkout]);

    const handleSaveEditedWorkout = useCallback(async (updatedWorkout) => {
        if (!canEditWorkout || !updatedWorkout) return;
        const uid = viewerUid;
        if (!uid) throw new Error("missing-uid");

        try {
            const payload = {
                ...(workout || {}),
                ...(updatedWorkout || {}),
            };

            console.log("[PastWorkoutScreen] updateCompletedWorkout -> start", {
                uid,
                identifier: workoutIdentifier,
                payload,
            });

            const result = await updateCompletedWorkout(uid, workoutIdentifier, payload);
            console.log("[PastWorkoutScreen] updateCompletedWorkout -> result", result);

            if (!result?.ok) {
                console.warn("[PastWorkoutScreen] updateCompletedWorkout returned non-ok result", result);
                throw new Error(result?.error || "update-failed");
            }

            const nextWorkouts = Array.isArray(result.completedWorkouts) ? result.completedWorkouts : [];

            const updatedEntry = (() => {
                const targetWid = payload?.wid ?? payload?.id ?? payload?.workoutId ?? payload?.pid ?? null;
                const targetCreated = payload?.created ?? payload?.createdAt ?? payload?.finishedAt ?? payload?.completedAt ?? null;
                return nextWorkouts.find((item) => {
                    if (!item || typeof item !== "object") return false;
                    const wid = item?.wid ?? item?.id ?? item?.workoutId ?? item?.pid ?? null;
                    if (targetWid && wid != null && String(wid) === String(targetWid)) return true;
                    if (targetCreated) {
                        const created = item?.created ?? item?.createdAt ?? item?.finishedAt ?? item?.completedAt ?? null;
                        if (created && Math.abs(toMillis(created) - toMillis(targetCreated)) < 2000) return true;
                    }
                    return false;
                }) || payload;
            })();

            setWorkout(updatedEntry);

            try {
                if (global?.userData) {
                    global.userData.completedWorkouts = nextWorkouts;
                    if (result.statsExercises) global.userData.statsExercises = result.statsExercises;
                    if (result.statsHexagon) global.userData.statsHexagon = result.statsHexagon;
                    if (result.statsHexagonMeta) global.userData.statsHexagonMeta = result.statsHexagonMeta;
                    if (Number.isFinite(result.statsTotalVolume)) global.userData.statsTotalVolume = result.statsTotalVolume;
                    if (Number.isFinite(result.statsTotalHours)) global.userData.statsTotalHours = result.statsTotalHours;
                    if (Number.isFinite(result.statsTotalWorkouts)) global.userData.statsTotalWorkouts = result.statsTotalWorkouts;
                    if (result.workoutsByDate) global.userData.workoutsByDate = result.workoutsByDate;
                    emitHexagonUpdate();
                }
            } catch (syncError) {
                console.warn("[PastWorkoutScreen] Failed to sync global user data after update", syncError);
            }

            return result;
        } catch (error) {
            console.error("[PastWorkoutScreen] updateCompletedWorkout failed", {
                error,
                identifier: workoutIdentifier,
            });
            Alert.alert("Save failed", "Please try again.");
            throw error;
        }
    }, [canEditWorkout, viewerUid, workout, workoutIdentifier]);

    const handlePressDetailMenu = useCallback(() => {
        if (!canEditWorkout) return;
        Alert.alert(
            "Workout options",
            undefined,
            [
                { text: "Edit Workout", onPress: () => setEditingVisible(true), style: 'default' },
                { text: "Cancel", style: "cancel" },

            ],
        );
    }, [handleRequestDeleteWorkout, canEditWorkout]);

    const handleCheer = useCallback(() => {
        try { hapticStrong(); } catch { }
        fireConfetti();
        sendCheerEvent();
    }, [fireConfetti, sendCheerEvent]);

    return (
        <SafeAreaView style={[styles.safeArea, isLiveWorkout && styles.safeAreaLive]}>
            <View style={[styles.header, isLiveWorkout && styles.headerLive]}>
                <Pressable onPress={handleBack} hitSlop={8} style={styles.headerBackButton}>
                    <Ionicons name="chevron-back" size={HEADER_ICON_SIZE} color={theme.textPrimary} />
                </Pressable>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {isLiveWorkout ? "Workout in Progress" : "Workout Details"}
                </Text>
                <View style={styles.headerRight}>
                    {canEditWorkout ? (
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

            <ScrollView contentContainerStyle={[styles.content, isLiveWorkout && styles.contentLive]}>
                {workout ? (
                    <View style={[styles.detailSection, isLiveWorkout && styles.detailSectionLive]}>
                        <View style={[styles.sectionHeader, isLiveWorkout && styles.sectionHeaderLive]}>
                            <View style={styles.sectionTop}>
                                <View style={styles.headerRow}>
                                    <Pressable
                                        style={styles.avatarWrap}
                                        onPress={handlePressOwnerProfile}
                                        hitSlop={{ top: scaleSize(6), bottom: scaleSize(6), left: scaleSize(6), right: scaleSize(6) }}
                                    >
                                        {pfpUri ? (
                                            <FastImage
                                                source={{
                                                    uri: pfpUri,
                                                    priority: FastImage.priority.high,
                                                    cache: FastImage.cacheControl.immutable,
                                                }}
                                                style={styles.avatar}
                                                resizeMode={FastImage.resizeMode.cover}
                                            />
                                        ) : (
                                            <View style={[styles.avatar, styles.avatarFallback]}>
                                                <Text style={styles.avatarInitials}>{initialsFrom(displayName)}</Text>
                                            </View>
                                        )}
                                    </Pressable>

                                    <View style={styles.headerTextCol}>
                                        <Pressable onPress={handlePressOwnerProfile}>
                                            <VerifiedHandle
                                                handle={sanitizedHandle || "Friend"}
                                                isVerified={isOwnerVerified}
                                                textStyle={styles.nameText}
                                                iconSize={scaleSize(15)}
                                                numberOfLines={1}
                                                ellipsizeMode="tail"
                                                preserveTextAlignment
                                            />
                                        </Pressable>
                                        {!!timestampDisplay && (
                                            <Text
                                                style={isLiveWorkout ? styles.timestampLiveText : styles.timestampText}
                                                numberOfLines={1}
                                            >
                                                {timestampDisplay}
                                            </Text>
                                        )}
                                    </View>

                                    <View style={styles.headerActions}>
                                        {isLiveWorkout ? (
                                            <Pressable
                                                style={styles.cheerButton}
                                                onPress={handleCheer}
                                                hitSlop={{ top: scaleSize(6), bottom: scaleSize(6), left: scaleSize(6), right: scaleSize(6) }}
                                            >
                                                <Text style={styles.cheerButtonText}>Cheer</Text>
                                            </Pressable>
                                        ) : null}
                                        {canEditWorkout ? (
                                            <Pressable
                                                style={styles.moreButton}
                                                onPress={handlePressDetailMenu}
                                                hitSlop={{ top: scaleSize(6), bottom: scaleSize(6), left: scaleSize(6), right: scaleSize(6) }}
                                                disabled={deletingWorkout}
                                            >
                                                <MaterialCommunityIcons
                                                    name="dots-vertical"
                                                    size={scaleSize(20)}
                                                    color={deletingWorkout ? theme.textSecondary : theme.textPrimary}
                                                />
                                            </Pressable>
                                        ) : null}
                                    </View>
                                </View>

                                {workout ? (
                                    <Pressable
                                        onPress={handlePressWorkoutHeader}
                                        style={styles.titleBlock}
                                        hitSlop={{ top: scaleSize(6), bottom: scaleSize(6) }}
                                    >
                                        <Text style={[styles.titleText, isWorkoutTitle ? styles.workoutTitleText : null]} numberOfLines={2}>
                                            {title}
                                        </Text>
                                        {shouldShowSubtitle ? (
                                            <Text style={styles.captionText}>
                                                {caption}
                                            </Text>
                                        ) : null}
                                    </Pressable>
                                ) : (
                                    <View style={styles.titleBlock}>
                                        <Text style={[styles.titleText, isWorkoutTitle ? styles.workoutTitleText : null]} numberOfLines={2}>
                                            {title}
                                        </Text>
                                        {shouldShowSubtitle ? (
                                            <Text style={styles.captionText}>
                                                {caption}
                                            </Text>
                                        ) : null}
                                    </View>
                                )}
                            </View>

                            {workout ? (
                                <Pressable
                                    onPress={handlePressWorkoutHeader}
                                    style={styles.metricsRow}
                                >
                                    <View style={styles.metricsLeft}>
                                        <View style={styles.metricColumnLeft}>
                                            <View style={styles.metricLabelRow}>
                                                {isLiveWorkout ? <View style={styles.metricLiveDot} /> : null}
                                                <Text style={styles.metricLabel}>Duration</Text>
                                            </View>
                                            <Text style={styles.metricValue}>{durationLabel}</Text>
                                        </View>

                                        <View style={[styles.metricColumnLeft, styles.metricCenter]}>
                                            <View style={styles.metricLabelRow}>
                                                {isLiveWorkout ? <View style={styles.metricLiveDot} /> : null}
                                                <Text style={styles.metricLabel}>Volume</Text>
                                            </View>
                                            <Text style={styles.metricValue}>
                                                {volumeLabel} {weightUnit}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.metricRight}>
                                        <View style={styles.metricLabelRow}>
                                            {isLiveWorkout ? <View style={styles.metricLiveDot} /> : null}
                                            <Text style={styles.metricLabel}>Records</Text>
                                        </View>
                                        <View style={styles.recordsValueRow}>
                                            <MaterialCommunityIcons name="medal" size={scaleSize(16)} color="#FFD700" />
                                            <Text style={[styles.metricValue, styles.recordsValueText]}>{recordsLabel}</Text>
                                        </View>
                                    </View>
                                </Pressable>
                            ) : null}
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

            <EditingWorkoutModal
                visible={editingVisible}
                workout={workout}
                onClose={() => setEditingVisible(false)}
                onSave={handleSaveEditedWorkout}
            />
            {isLiveWorkout ? (() => {
                const ConfettiCannon = loadConfettiModule();
                return ConfettiCannon ? (
                    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                        <ConfettiCannon
                            ref={confettiRef}
                            autoStart={false}
                            count={120}
                            origin={{ x: SCREEN_WIDTH / 2, y: -scaleSize(60) }}
                            fadeOut
                            explosionSpeed={220}
                            fallSpeed={1500}
                        />
                        {confettiTick > 0 && (
                            <ConfettiCannon
                                key={confettiTick}
                                count={120}
                                origin={{ x: SCREEN_WIDTH / 2, y: -scaleSize(60) }}
                                fadeOut
                                explosionSpeed={220}
                                fallSpeed={1500}
                            />
                        )}
                    </View>
                ) : null;
            })() : null}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    safeAreaLive: {
        backgroundColor: theme.bg,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(18),
        paddingVertical: scaleSize(12),
    },
    headerLive: {
        backgroundColor: theme.bg,
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
    contentLive: {
        backgroundColor: "transparent",
    },
    detailSection: {
        paddingVertical: scaleSize(14),
        backgroundColor: theme.surface,
    },
    detailSectionLive: {
        backgroundColor: theme.surface,
    },
    sectionHeader: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.hairline,
        paddingBottom: scaleSize(12),
        marginBottom: scaleSize(6),
    },
    sectionHeaderLive: {
        borderBottomColor: theme.hairline,
    },
    sectionTop: {
        paddingHorizontal: scaleSize(18),
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        marginLeft: scaleSize(8),
    },
    avatarWrap: {
        width: scaleSize(34),
        aspectRatio: 1,
        borderRadius: scaleSize(23),
        overflow: "hidden",
        marginRight: scaleSize(10),
    },
    avatar: {
        width: "100%",
        height: "100%",
        borderRadius: scaleSize(23),
        backgroundColor: theme.field,
    },
    avatarFallback: {
        alignItems: "center",
        justifyContent: "center",
    },
    avatarInitials: {
        color: theme.textPrimary,
        fontFamily: "Poppins_600SemiBold",
        fontSize: scaleSize(15),
    },
    headerTextCol: {
        flex: 1,
        minWidth: 0,
    },
    nameText: {
        color: theme.textPrimary,
        fontFamily: "Poppins_600SemiBold",
        fontSize: scaleSize(13),
    },
    timestampText: {
        color: theme.textSecondary,
        fontFamily: "Outfit_400Regular",
        fontSize: scaleSize(11.5),
        marginTop: scaleSize(2),
    },
    timestampLiveText: {
        color: "#FF8596",
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(11.5),
        marginTop: scaleSize(2),
    },
    moreButton: {
        paddingHorizontal: scaleSize(4),
        paddingVertical: scaleSize(4),
    },
    cheerButton: {
        paddingHorizontal: scaleSize(12),
        paddingVertical: scaleSize(4),
        borderRadius: scaleSize(12),
        backgroundColor: "rgba(255,77,103,0.18)",
        marginRight: scaleSize(8),
    },
    cheerButtonText: {
        color: "#FF8596",
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(10.5),
        letterSpacing: 0.4,
        textTransform: "uppercase",
    },
    titleBlock: {
        marginTop: scaleSize(12),
        paddingBottom: scaleSize(5),
    },
    titleText: {
        color: theme.textPrimary,
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(13),
    },
    workoutTitleText: {
        color: "#74abf7ff",
    },
    captionText: {
        color: theme.textPrimary,
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(13),
        marginTop: scaleSize(4),
    },
    metricsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingTop: scaleSize(6),
        marginHorizontal: scaleSize(20),
    },
    metricsLeft: {
        flex: 1,
        flexDirection: "row",
    },
    metricColumnLeft: {
        width: "32%",
    },
    metricCenter: {
        paddingHorizontal: scaleSize(1),
    },
    metricRight: {
        alignItems: "flex-end",
    },
    metricLabel: {
        color: "rgba(255,255,255,0.58)",
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(11),
        letterSpacing: 0.2,
    },
    metricLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingBottom: scaleSize(1.5),
    },
    metricLiveDot: {
        width: scaleSize(6.5),
        height: scaleSize(6.5),
        borderRadius: scaleSize(3.25),
        backgroundColor: "#FF4D67",
        marginRight: scaleSize(6),
        shadowColor: "#FF4D67",
        shadowOpacity: 0.35,
        shadowRadius: scaleSize(6),
        shadowOffset: { width: 0, height: 0 },
    },
    metricValue: {
        color: theme.textPrimary,
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(14),
    },
    recordsValueRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    recordsValueText: {
        marginLeft: scaleSize(6),
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
