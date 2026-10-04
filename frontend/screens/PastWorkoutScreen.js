import React, { useMemo, useCallback, useState, useEffect } from "react";
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
import { doc, onSnapshot } from "firebase/firestore";

import HumanMuscleOutline from "../assets/human_muscle_outline";
import HumanMuscleBackOutline from "../assets/human_muscle_back_outline";
import PastWorkoutExerciseLog from "../components/1_Feed/PastWorkoutExerciseLog";
import EditingWorkoutModal from "../components/3_Workout/NewWorkout/EditingWorkoutModal";
import theme from "../theme/mfpDark";
import scaleSize from "../helper/scaleSize";
import { usePfp } from "../helper/usePFPs";
import { resolvePhotoURL } from "../utils/profilePhoto";
import isThisUser from "../helper/isThisUser";
import { strong as hapticStrong } from "../utils/haptics";
import VerifiedHandle from "../components/common/VerifiedHandle";
import useUserVerified from "../hooks/useUserVerified";
import { db } from "../../firebase.config";
import { BODYGRAPH_OUTLINE_COLOR } from "../utils/muscleTierColors";
import { MUSCLE_HIGHLIGHT, MUSCLE_SEGMENTS, formatDuration, formatNumber, resolveWorkoutTitle, resolveWeightUnit, initialsFrom } from "../components/1_Feed/workoutDisplay";
import styles, { HEADER_ICON_SIZE } from "./PastWorkoutScreen.styles";
import { toMillis, formatTimestamp, pickFirstString, findExerciseMeta, resolveEquipmentLabel } from "./pastWorkout/pastWorkoutUtils";
import usePastWorkoutCheer from "./pastWorkout/usePastWorkoutCheer";
import useSaveEditedWorkout from "./pastWorkout/useSaveEditedWorkout";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const PastWorkoutScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const routeWorkout = route.params?.workout ?? null;
    const [workout, setWorkout] = useState(routeWorkout);
    const owner = route.params?.owner ?? {};
    const deriveLiveStatus = useCallback(
        (candidateWorkout) => {
            const fromRoute = Boolean(route.params?.isLiveWorkout);
            const fromWorkout = Boolean(candidateWorkout?.isLive || candidateWorkout?.live);
            const fromPid = typeof route.params?.postMeta?.pid === "string"
                ? route.params.postMeta.pid.startsWith("workout:live")
                : false;
            return fromRoute || fromWorkout || fromPid;
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
    const { confettiTick, confettiRef, loadConfettiModule, handleCheer } = usePastWorkoutCheer({ isLiveWorkout, workoutWid });

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

    const workedSegments = useMemo(() => {
        if (!Array.isArray(exercises) || exercises.length === 0) return [];
        const set = new Set();
        exercises.forEach((ex) => {
            const groupRaw = ex?.muscleGroup || ex?.muscle;
            if (typeof groupRaw !== "string") return;
            const key = groupRaw.trim().toLowerCase();
            if (!key) return;
            if (key.includes("shoulder")) MUSCLE_SEGMENTS.shoulders.forEach((s) => set.add(s));
            else if (key === "chest") MUSCLE_SEGMENTS.chest.forEach((s) => set.add(s));
            else if (key.includes("arm") || key.includes("bicep") || key.includes("tricep") || key.includes("forearm"))
                MUSCLE_SEGMENTS.arms.forEach((s) => set.add(s));
            else if (key.includes("leg") || key.includes("quad") || key.includes("calf") || key.includes("hamstring"))
                MUSCLE_SEGMENTS.legs.forEach((s) => set.add(s));
            else if (key.includes("back") || key.includes("trap")) MUSCLE_SEGMENTS.back.forEach((s) => set.add(s));
            else if (key.includes("ab") || key.includes("core") || key.includes("oblique")) MUSCLE_SEGMENTS.abs.forEach((s) => set.add(s));
        });
        return Array.from(set);
    }, [exercises]);

    const muscleFills = useMemo(() => {
        const map = {};
        workedSegments.forEach((seg) => {
            map[seg] = MUSCLE_HIGHLIGHT;
        });
        return map;
    }, [workedSegments]);

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
    const caloriesLabel = useMemo(() => {
        const raw = typeof workout?.calories === "number" ? workout.calories : Number(workout?.calories);
        if (!Number.isFinite(raw) || raw <= 0) return "--";
        return formatNumber(raw);
    }, [workout?.calories]);
    const hasCalories = caloriesLabel !== "--";
    const recordsLabel = useMemo(
        () => formatNumber(workout?.PBs ?? workout?.pbs ?? 0),
        [workout?.PBs, workout?.pbs]
    );
    const weightUnit = useMemo(() => resolveWeightUnit(), []);
    const showCaloriesInfo = useCallback(() => {
        Alert.alert(
            "How calories are estimated",
            "Calories come from your latest Progress weight plus the sets, reps, and duration you logged. No weight logged = calories stay blank."
        );
    }, []);

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

    const ownerFallbackPfp = resolvePhotoURL(owner, "");
    const workoutFallbackPfp = resolvePhotoURL(workout, ownerFallbackPfp);
    const fallbackPfp = workoutFallbackPfp || ownerFallbackPfp;
    const pfpUri = usePfp(
        workoutOwnerUid || "",
        owner?.pfpVersion ?? workout?.pfpVersion ?? 0,
        fallbackPfp
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
    const [editingVisible, setEditingVisible] = useState(false);
    const startEditingFromRoute = Boolean(route.params?.startEditing);

    useEffect(() => {
        if (!startEditingFromRoute) return;
        if (!canEditWorkout) {
            try { navigation?.setParams?.({ startEditing: false }); } catch { }
            return;
        }
        setEditingVisible(true);
        try { navigation?.setParams?.({ startEditing: false }); } catch { }
    }, [startEditingFromRoute, canEditWorkout, navigation]);

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

    const handlePressExercise = useCallback(
        (exercise) => {
            if (!exercise || typeof exercise !== "object") return;
            if (!navigation?.navigate) return;

            const libraryExercise =
                exercise?.libraryExercise && typeof exercise.libraryExercise === "object"
                    ? exercise.libraryExercise
                    : null;

            const basePayload = libraryExercise ? { ...libraryExercise } : { ...exercise };
            const rawName =
                basePayload?.name ??
                basePayload?.title ??
                basePayload?.exercise ??
                exercise?.name ??
                exercise?.title ??
                exercise?.exercise ??
                "";
            const name = typeof rawName === "string" ? rawName.trim() : "";
            if (!name) return;

            if (!basePayload.name) basePayload.name = name;
            if (!basePayload.title) basePayload.title = name;
            if (!basePayload.muscle && basePayload.muscleGroup) {
                basePayload.muscle = basePayload.muscleGroup;
            } else if (!basePayload.muscleGroup && basePayload.muscle) {
                basePayload.muscleGroup = basePayload.muscle;
            } else if (!basePayload.muscleGroup && exercise?.muscle) {
                basePayload.muscleGroup = exercise.muscle;
            }
            if (!basePayload.slug && basePayload.exerciseSlug) {
                basePayload.slug = basePayload.exerciseSlug;
            } else if (!basePayload.slug && exercise?.slug) {
                basePayload.slug = exercise.slug;
            } else if (!basePayload.slug && exercise?.exerciseSlug) {
                basePayload.slug = exercise.exerciseSlug;
            }
            if (!basePayload.equipment && basePayload.equipmentType) {
                basePayload.equipment = basePayload.equipmentType;
            } else if (!basePayload.equipment && exercise?.equipment) {
                basePayload.equipment = exercise.equipment;
            } else if (!basePayload.equipment && exercise?.equipmentType) {
                basePayload.equipment = exercise.equipmentType;
            }

            const catalogMeta = findExerciseMeta(name);
            if (catalogMeta) {
                if (!basePayload.muscleGroup && catalogMeta.muscleGroup) {
                    basePayload.muscleGroup = catalogMeta.muscleGroup;
                }
                if (!basePayload.muscle && catalogMeta.muscleGroup) {
                    basePayload.muscle = catalogMeta.muscleGroup;
                }
            }

            const equipmentLabel = resolveEquipmentLabel(
                basePayload.equipment,
                basePayload.equipmentType,
                exercise?.equipment,
                exercise?.equipmentType,
                catalogMeta?.equipment
            );
            if (equipmentLabel) {
                basePayload.equipment = equipmentLabel;
            } else {
                delete basePayload.equipment;
            }

            navigation.navigate("ExerciseDetail", { exercise: basePayload });
        },
        [navigation]
    );

    const handleSaveEditedWorkout = useSaveEditedWorkout({ canEditWorkout, viewerUid, workout, workoutIdentifier, setWorkout });

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
    }, [canEditWorkout]);

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
                                        <Pressable onPress={handlePressOwnerProfile} style={styles.namePressable}>
                                            <VerifiedHandle
                                                handle={sanitizedHandle || "Friend"}
                                                isVerified={isOwnerVerified}
                                                textStyle={styles.nameText}
                                                iconSize={scaleSize(15)}
                                                numberOfLines={1}
                                                ellipsizeMode="tail"
                                                containerStyle={styles.nameHandle}
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
                                        {isLiveWorkout && !isOwner ? (
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
                                            >
                                                <MaterialCommunityIcons
                                                    name="dots-vertical"
                                                    size={scaleSize(20)}
                                                    color={theme.textPrimary}
                                                />
                                            </Pressable>
                                        ) : null}
                                    </View>
                                </View>

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
                            </View>

                            <Pressable
                                onPress={handlePressWorkoutHeader}
                                style={styles.metricsRow}
                            >
                                <View style={styles.metricsFigures}>
                                    <View style={[styles.metricsFigureSlot, styles.metricsFigureFront]}>
                                        <HumanMuscleOutline
                                            color={BODYGRAPH_OUTLINE_COLOR}
                                            width="120%"
                                            height="120%"
                                            preserveAspectRatio="xMidYMid meet"
                                            fills={muscleFills}
                                            style={styles.metricsFigure}
                                        />
                                    </View>
                                    <View style={[styles.metricsFigureSlot, styles.metricsFigureBack]}>
                                        <HumanMuscleBackOutline
                                            color={BODYGRAPH_OUTLINE_COLOR}
                                            width="120%"
                                            height="120%"
                                            preserveAspectRatio="xMidYMid meet"
                                            fills={muscleFills}
                                            style={styles.metricsFigure}
                                        />
                                    </View>
                                </View>

                                <View style={styles.metricsColumnStack}>
                                    <View style={styles.metricTopStack}>
                                        <View style={styles.metricStackRow}>
                                            <View style={styles.metricLabelRow}>
                                                {isLiveWorkout ? <View style={styles.metricLiveDot} /> : null}
                                                <Text style={[styles.metricLabel, styles.metricLabelRight]}>Duration</Text>
                                            </View>
                                            <Text style={[styles.metricValue, styles.metricValueRight]}>{durationLabel}</Text>
                                        </View>

                                        <View style={styles.metricStackRow}>
                                            <View style={styles.metricLabelRow}>
                                                {isLiveWorkout ? <View style={styles.metricLiveDot} /> : null}
                                                <Text style={[styles.metricLabel, styles.metricLabelRight]}>Volume</Text>
                                            </View>
                                            <Text style={[styles.metricValue, styles.metricValueRight]}>
                                                {volumeLabel} {weightUnit}
                                            </Text>
                                        </View>

                                        <View style={styles.metricStackRow}>
                                            <View style={styles.metricLabelRow}>
                                                {isLiveWorkout ? <View style={styles.metricLiveDot} /> : null}
                                                <Text style={[styles.metricLabel, styles.metricLabelRight]}>Calories</Text>
                                            </View>
                                            <View style={[styles.metricValueRow, styles.metricValueRowRight]}>
                                                <Text style={[styles.metricValue, styles.metricValueRight]}>
                                                    {caloriesLabel}
                                                    {hasCalories ? " kcal" : ""}
                                                </Text>
                                                {!hasCalories ? (
                                                    <Pressable
                                                        onPress={showCaloriesInfo}
                                                        hitSlop={8}
                                                        style={styles.metricInfoIcon}
                                                        accessibilityRole="button"
                                                        accessibilityLabel="How are calories estimated?"
                                                    >
                                                        <MaterialCommunityIcons
                                                            name="information-outline"
                                                            size={scaleSize(15)}
                                                            color="#9aa6bf"
                                                        />
                                                    </Pressable>
                                                ) : null}
                                            </View>
                                        </View>
                                    </View>

                                    <View style={[styles.metricStackRow, styles.metricStackRowLast]}>
                                        <View style={styles.metricLabelRow}>
                                            {isLiveWorkout ? <View style={styles.metricLiveDot} /> : null}
                                            <Text style={[styles.metricLabel, styles.metricLabelRight]}>Records</Text>
                                        </View>
                                        <View style={styles.recordsValueRow}>
                                            <MaterialCommunityIcons name="medal" size={scaleSize(16)} color="#FFD700" />
                                            <Text style={[styles.metricValue, styles.metricValueRight, styles.recordsValueText]}>{recordsLabel}</Text>
                                        </View>
                                    </View>
                                </View>
                            </Pressable>
                        </View>

                        {exercises.length > 0 ? (
                            exercises.map((exercise, index) => (
                                <PastWorkoutExerciseLog
                                    key={`${exercise?.name || "exercise"}-${index}`}
                                    exercise={exercise}
                                    index={index}
                                    onPress={handlePressExercise}
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

export default PastWorkoutScreen;
