import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Platform, UIManager, LayoutAnimation, InteractionManager, ActivityIndicator, Animated } from "react-native";
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import { getDoc, doc } from "firebase/firestore";
import { db } from "../../../../firebase.config";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import FastImage from "react-native-fast-image";
import scaleSize from "../../../helper/scaleSize";
import { usePfp } from "../../../helper/usePFPs";
import { withStrongPress } from "../../../utils/haptics";
import { resolvePhotoURL } from "../../../utils/profilePhoto";
import { sanitizeStatsForViewer, canViewWorkout } from "../../../utils/workoutPrivacy";
import UserStatsExerciseCard from "./UserStatsExerciseCard";
import UserStatsExerciseDetailScreen from "./UserStatsExerciseDetailScreen";
import UserStatsWorkoutViewerScreen from "./UserStatsWorkoutViewerScreen";
import { styles, COLORS, scaledSize, screenWidth } from "./UserStatsStyles";
import formatHexStat from "../../../utils/formatHexStat";
import VerifiedHandle from "../../common/VerifiedHandle";
import resolveRankTierKey from "../../../utils/resolveRankTierKey";
import { navigateOneWay } from "../../../../navigationRef";
import {
    getExercisesGrouped,
    ensureWorkoutPrivacy,
    extractWid,
    workoutSortTimestamp,
    formatJoinDate,
} from "./userStatsUtils";
import UserStatsProgressPreview from "./UserStatsProgressPreview";
import { RANK_TIER_THEMES } from "../../1_Feed/FeedSnapshotCard";
import resolveHandleColor from "../../../utils/resolveHandleColor";

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    try { UIManager.setLayoutAnimationEnabledExperimental(true); } catch { }
}

const sanitizeWorkoutForRoute = (workout) => {
    if (!workout || typeof workout !== "object") return null;
    const replacer = (_key, value) => (typeof value === "function" ? undefined : value);
    try {
        return JSON.parse(JSON.stringify(workout, replacer));
    } catch {
        const clone = { ...workout };
        clone.exercises = Array.isArray(workout.exercises)
            ? workout.exercises.map((exercise) => {
                if (!exercise || typeof exercise !== "object") return {};
                const sets = Array.isArray(exercise.sets)
                    ? exercise.sets.map((set) => {
                        if (!set || typeof set !== "object") return {};
                        const { weight, reps, unit, units, weightUnit, kg, lbs, ...rest } = set;
                        const normalized = {
                            ...rest,
                            weight: Number(weight ?? kg ?? lbs ?? 0) || 0,
                            reps: Number(reps ?? set?.rep ?? set?.r ?? 0) || 0,
                        };
                        const resolvedUnit = unit || units || weightUnit || (kg != null ? "kg" : undefined);
                        if (resolvedUnit) normalized.unit = resolvedUnit;
                        normalized.prev = Object.prototype.hasOwnProperty.call(set, "prev")
                            ? (set?.prev && typeof set.prev === "object"
                                ? {
                                    weight: Number(set.prev?.weight) || 0,
                                    reps: Number(set.prev?.reps) || 0,
                                }
                                : null)
                            : null;
                        return normalized;
                    })
                    : [];
                return { ...exercise, sets };
            })
            : [];
        return clone;
    }
};

export default function UserStatsModal({ user, toViewProfile, navigation, hexOverlay, hexProps = {}, deferExercises = false, visible = true, onDetailActiveChange = () => {} }) {
    // Optionally defer heavy grouping work until after interactions (for smoother open)
    const [showExercises, setShowExercises] = useState(!deferExercises);
    const viewerData = (() => {
        try { return global?.userData || null; } catch { return null; }
    })();
    const viewerUid = viewerData?.uid ? String(viewerData.uid) : "";
    const isVisible = !!visible;
    const fallbackPfp = useMemo(() => resolvePhotoURL(user, user?.pfp || ""), [user]);
    const pfpVersion = useMemo(() => {
        const candidates = [
            user?.pfpVersion,
            user?.imageVersion,
            user?.photoVersion,
            user?.pfp_version,
            user?.pfpVer,
            user?.version,
        ];
        for (const candidate of candidates) {
            const num = Number(candidate);
            if (Number.isFinite(num) && num > 0) return num;
        }
        return 0;
    }, [
        user?.pfpVersion,
        user?.imageVersion,
        user?.photoVersion,
        user?.pfp_version,
        user?.pfpVer,
        user?.version,
    ]);
    const pfpUri = usePfp(String(user?.uid || ""), pfpVersion, fallbackPfp) || fallbackPfp;
    const hasPfp = typeof pfpUri === "string" && pfpUri.length > 0;
    useEffect(() => {
        if (!deferExercises) return;
        let task;
        try { task = InteractionManager.runAfterInteractions(() => setShowExercises(true)); }
        catch { setTimeout(() => setShowExercises(true), 120); }
        return () => { try { task?.cancel?.(); } catch { } };
    }, [deferExercises]);

    const statsForViewer = useMemo(() => sanitizeStatsForViewer(user?.statsExercises || {}, user?.uid, viewerUid, viewerData), [user?.statsExercises, user?.uid, viewerUid, viewerData]);
    const userForViewer = useMemo(() => ({ ...user, statsExercises: statsForViewer }), [user, statsForViewer]);
    const rankTierKey = useMemo(() => resolveRankTierKey(user), [user]);
    const rankTheme = useMemo(() => {
        const key = rankTierKey || "gold";
        return RANK_TIER_THEMES[key] || RANK_TIER_THEMES.gold;
    }, [rankTierKey]);
    const handleColor = useMemo(
        () => resolveHandleColor(user, { rankTierKey, rankTheme, fallback: styles.handle.color }),
        [user, rankTierKey, rankTheme]
    );

    const exerciseGroups = useMemo(() => (
        showExercises ? getExercisesGrouped(userForViewer) : []
    ), [showExercises, userForViewer]);
    const [collapsed, setCollapsed] = useState({}); // { [group]: true }
    const toggleGroup = (g) => {
        try { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); } catch { }
        setCollapsed((s) => ({ ...s, [g]: !s[g] }));
    };
    const overallNumber = Number(user?.statsHexagon?.overall ?? 0);
    const overall = formatHexStat(overallNumber);
    const prevOverallRaw = hexProps?.prevStatsHexagon?.overall;
    const prevOverallNumber = Number(prevOverallRaw);
    const prevOverall = Number.isFinite(prevOverallNumber) ? formatHexStat(prevOverallNumber) : null;
    const ovrChanged = prevOverall !== null && prevOverall !== overall;
    const joinedSource = user?.joined ?? user?.createdAt ?? user?.usersPublic?.createdAt ?? user?.created;
    const joinedLabel = formatJoinDate(joinedSource);

    // ---------- Exercise detail (sets) overlay state ----------
    const [detailName, setDetailName] = useState(null); // exercise name
    // Slide-in from right for detail screen
    const detailTranslateX = useRef(new Animated.Value(screenWidth)).current;
    const openDetail = (name) => {
        if (!name) return;
        // reset slide position before mounting
        try { detailTranslateX.setValue(screenWidth); } catch { }
        setDetailName(name);
        try {
            Animated.timing(detailTranslateX, { toValue: 0, duration: 260, useNativeDriver: true }).start();
        } catch { }
    };
    const closeDetail = () => {
        try {
            Animated.timing(detailTranslateX, { toValue: screenWidth, duration: 220, useNativeDriver: true }).start(({ finished }) => {
                setDetailName(null);
            });
        } catch { setDetailName(null); }
    };

    useEffect(() => {
        try { onDetailActiveChange(Boolean(detailName)); } catch { }
        return () => {
            if (detailName) {
                try { onDetailActiveChange(false); } catch { }
            }
        };
    }, [detailName, onDetailActiveChange]);

    const detailSets = useMemo(() => {
        if (!detailName) return [];
        const sets = (statsForViewer?.[detailName]?.sets || []);
        if (!Array.isArray(sets) || sets.length === 0) return [];
        // Sort reverse-chronological by date (YYYY-MM-DD) then by original order (descending)
        const withIdx = sets.map((s, i) => ({ ...s, __i: i }));
        const toKey = (d) => {
            if (!d) return 0;
            if (typeof d === 'string') {
                // Expect YYYY-MM-DD; fallback to Date parse
                const t = Date.parse(d);
                return Number.isFinite(t) ? t : 0;
            }
            if (typeof d === 'number') return d;
            if (typeof d === 'object' && Number.isFinite(d.seconds)) return d.seconds * 1000;
            return 0;
        };
        withIdx.sort((a, b) => {
            const ta = toKey(a?.date);
            const tb = toKey(b?.date);
            if (tb !== ta) return tb - ta;
            return (b.__i || 0) - (a.__i || 0);
        });
        return withIdx.map(({ __i, ...rest }) => rest);
    }, [detailName, statsForViewer, user?.uid]);

    const detailWorkoutIds = useMemo(() => {
        if (!detailName || !Array.isArray(detailSets) || detailSets.length === 0) return [];
        const seen = new Set();
        const list = [];
        for (const set of detailSets) {
            const wid = extractWid(set);
            if (!wid || seen.has(wid)) continue;
            seen.add(wid);
            list.push(wid);
        }
        return list;
    }, [detailName, detailSets]);

    const detailWorkoutCache = useRef(new Map());
    const [detailWorkouts, setDetailWorkouts] = useState([]);
    const [detailLoading, setDetailLoading] = useState(false);

    const sortWorkouts = useCallback((items) => (
        [...items].sort((a, b) => workoutSortTimestamp(b) - workoutSortTimestamp(a))
    ), []);

    useEffect(() => {
        if (!detailName) {
            setDetailWorkouts([]);
            setDetailLoading(false);
            return;
        }
        const targetWids = detailWorkoutIds;
        if (!targetWids.length) {
            setDetailWorkouts([]);
            setDetailLoading(false);
            return;
        }

        const cache = detailWorkoutCache.current;
        const widSet = new Set(targetWids);

        const primeFromCollection = (collection) => {
            const list = Array.isArray(collection) ? collection : [];
            for (const item of list) {
                const wid = extractWid(item);
                if (!wid || !widSet.has(wid)) continue;
                if (!cache.has(wid)) {
                    const payload = item && typeof item === 'object' ? { ...item, wid } : { wid };
                    cache.set(wid, ensureWorkoutPrivacy(payload));
                }
            }
        };

        try { primeFromCollection(user?.completedWorkouts); } catch { }
        try { primeFromCollection(user?.recentWorkouts); } catch { }
        try { primeFromCollection(user?.workouts); } catch { }
        try {
            const me = global?.userData;
            if (me && String(me?.uid || "") === String(user?.uid || "")) {
                primeFromCollection(me?.completedWorkouts);
            }
        } catch { }

        let active = true;

        const collectFromCache = () => {
            const items = [];
            for (const wid of targetWids) {
                const wk = cache.get(wid);
                if (wk && canViewWorkout(wk, viewerUid, viewerData)) items.push(wk);
            }
            return sortWorkouts(items);
        };

        setDetailWorkouts(collectFromCache());

        const missing = targetWids.filter((wid) => !cache.has(wid));
        if (!missing.length) {
            setDetailLoading(false);
            return () => { active = false; };
        }

        setDetailLoading(true);

        (async () => {
            for (const wid of missing) {
                if (!active) break;
                try {
                    const wk = await findWorkoutByWid(wid);
                    if (!active) break;
                    if (wk) cache.set(wid, ensureWorkoutPrivacy(wk));
                } catch { }
            }
            if (!active) return;
            setDetailWorkouts(collectFromCache());
            setDetailLoading(false);
        })();

        return () => { active = false; };
    }, [detailName, detailWorkoutIds, viewerUid, viewerData, sortWorkouts, user, findWorkoutByWid]);

    const detailExercise = detailName ? statsForViewer?.[detailName] : null;


    // ---- Workout viewer state (open per set press) ----
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerWorkout, setViewerWorkout] = useState(null);
    // Slide-in from right for workout viewer
    const viewerTranslateX = useRef(new Animated.Value(screenWidth)).current;
    // Match DayDetails: yellow handle fades as overlay slides
    const viewerHandleOpacity = useMemo(() => (
        viewerTranslateX.interpolate({
            inputRange: [0, screenWidth],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        })
    ), [viewerTranslateX, screenWidth]);
    const timerRef = useRef("");

    const findWorkoutByWid = useCallback(async (widRaw) => {
        const wid = String(widRaw || "");
        if (!wid) return null;
        // 1) Prefer visible user's completedWorkouts if available
        try {
            const fromProp = Array.isArray(user?.completedWorkouts) ? user.completedWorkouts.find(w => String(w?.wid || w?.id || "") === wid) : null;
            if (fromProp) return ensureWorkoutPrivacy(fromProp);
        } catch { }
        // 2) If viewing self, use local completedWorkouts
        try {
            const me = global?.userData;
            if (me && String(me?.uid || "") === String(user?.uid || "")) {
                const arr = Array.isArray(me?.completedWorkouts) ? me.completedWorkouts : [];
                const found = arr.find(w => String(w?.wid || w?.id || "") === wid);
                if (found) return ensureWorkoutPrivacy(found);
            }
        } catch { }
        // 3) Fallback: fetch from Firestore
        try {
            const snap = await getDoc(doc(db, "workouts", wid));
            if (snap.exists()) {
                const d = snap.data() || {};
                return ensureWorkoutPrivacy({ wid, ...d });
            }
        } catch { }
        return { wid, privacyMode: 'global' };
    }, [user?.completedWorkouts, user?.uid]);

    const closeViewer = () => {
        try {
            Animated.timing(viewerTranslateX, { toValue: screenWidth, duration: 220, useNativeDriver: true }).start(({ finished }) => {
                setViewerWorkout(null);
                setViewerOpen(false);
            });
        } catch { setViewerWorkout(null); setViewerOpen(false); }
    };

    const resetToHome = useCallback(() => {
        setDetailName(null);
        setDetailWorkouts([]);
        setDetailLoading(false);
        try { detailTranslateX.setValue(screenWidth); } catch { }
        setViewerWorkout(null);
        setViewerOpen(false);
        try { viewerTranslateX.setValue(screenWidth); } catch { }
    }, [detailTranslateX, viewerTranslateX, screenWidth]);

    const handleWorkoutPress = useCallback(async (entry) => {
        try {
            if (!entry) return;
            const widCandidate =
                entry?.wid ||
                entry?.id ||
                entry?.workoutId ||
                entry?.sessionId ||
                entry?.workoutID ||
                entry?.workout_id;
            const wid = widCandidate ? String(widCandidate).trim() : "";
            if (!wid) return;

            const workout = await findWorkoutByWid(wid);
            if (!workout) return;

            const sanitizedWorkout = sanitizeWorkoutForRoute({ ...workout, wid });
            if (!sanitizedWorkout) return;
            if (!sanitizedWorkout.wid) sanitizedWorkout.wid = wid;

            const ownerUid = String(user?.uid || sanitizedWorkout?.creatorUID || sanitizedWorkout?.creatorUid || "");
            const ownerHandle = String(user?.handle || user?.username || sanitizedWorkout?.handle || "");
            const ownerName = String(user?.name || sanitizedWorkout?.ownerName || "");
            const ownerPfp = String(user?.pfp || user?.image || sanitizedWorkout?.pfp || "");
            const ownerPfpVersion = Number(user?.pfpVersion ?? sanitizedWorkout?.pfpVersion ?? 0);

            const params = {
                workout: sanitizedWorkout,
                owner: {
                    uid: ownerUid,
                    handle: ownerHandle,
                    name: ownerName,
                    pfp: ownerPfp,
                    pfpVersion: ownerPfpVersion,
                    rankTier: user?.rankTier ?? user?.currentRank?.tier ?? user?.currentRank?.rankTier ?? user?.rank?.tier ?? user?.rank?.rankTier ?? sanitizedWorkout?.rankTier ?? sanitizedWorkout?.currentRank?.tier ?? sanitizedWorkout?.currentRank?.rankTier ?? sanitizedWorkout?.rank?.tier ?? sanitizedWorkout?.rank?.rankTier ?? null,
                    currentRank: user?.currentRank || sanitizedWorkout?.currentRank || null,
                    rank: user?.rank || sanitizedWorkout?.rank || null,
                },
            };

            if (!navigateOneWay("PastWorkout", { animation: "slide-from-right", params })) {
                navigation?.navigate?.("PastWorkout", params);
            }
        } catch {
            // ignore navigation failures
        }
    }, [findWorkoutByWid, navigation, user]);

    const prevVisibleRef = useRef(isVisible);
    const prevUidRef = useRef(String(user?.uid || ""));

    useEffect(() => {
        const prevVisible = prevVisibleRef.current;
        const prevUid = prevUidRef.current;
        const uid = String(user?.uid || "");

        const becameVisible = isVisible && !prevVisible;
        const becameHidden = !isVisible && prevVisible;
        const uidChanged = uid !== prevUid;

        if (becameVisible || becameHidden || (isVisible && uidChanged)) {
            resetToHome();
        }

        prevVisibleRef.current = isVisible;
        prevUidRef.current = uid;
    }, [isVisible, user?.uid, resetToHome]);

    // Back-swipe gesture (edge) for detail and viewer overlays
    const EDGE_BACK_GESTURE_WIDTH = 200;
    const BACK_SWIPE_TRIGGER = 36;

    // Detail back gesture
    const detailBackEligible = useSharedValue(0);
    const onDetailBackUpdateX = React.useCallback((dx) => {
        try { detailTranslateX.setValue(Math.max(0, dx || 0)); } catch { }
    }, [detailTranslateX]);
    const onDetailBackEnd = React.useCallback((dx, vx) => {
        const shouldClose = (dx || 0) > BACK_SWIPE_TRIGGER || (vx || 0) > 600;
        if (shouldClose) closeDetail();
        else {
            try { Animated.timing(detailTranslateX, { toValue: 0, duration: 180, useNativeDriver: true }).start(); } catch { }
        }
    }, [detailTranslateX]);
    const detailBackPan = useMemo(() => (
        Gesture.Pan()
            .hitSlop({ left: 0, width: EDGE_BACK_GESTURE_WIDTH })
            .minDistance(8)
            .activeOffsetX([-16, 16])
            .failOffsetY([-12, 12])
            .onBegin(() => { 'worklet'; detailBackEligible.value = 1; })
            .onUpdate((e) => { 'worklet'; if (!detailBackEligible.value) return; runOnJS(onDetailBackUpdateX)(e.translationX); })
            .onEnd((e) => { 'worklet'; detailBackEligible.value = 0; runOnJS(onDetailBackEnd)(e.translationX, e.velocityX); })
            .onFinalize(() => { 'worklet'; detailBackEligible.value = 0; })
    ), [detailBackEligible, onDetailBackEnd, onDetailBackUpdateX]);

    // Viewer back gesture
    const viewerBackEligible = useSharedValue(0);
    const onViewerBackUpdateX = React.useCallback((dx) => {
        try { viewerTranslateX.setValue(Math.max(0, dx || 0)); } catch { }
    }, [viewerTranslateX]);
    const onViewerBackEnd = React.useCallback((dx, vx) => {
        const shouldClose = (dx || 0) > BACK_SWIPE_TRIGGER || (vx || 0) > 600;
        if (shouldClose) closeViewer();
        else {
            try { Animated.timing(viewerTranslateX, { toValue: 0, duration: 180, useNativeDriver: true }).start(); } catch { }
        }
    }, [viewerTranslateX]);
    const viewerBackPan = useMemo(() => (
        Gesture.Pan()
            .hitSlop({ left: 0, width: EDGE_BACK_GESTURE_WIDTH })
            .minDistance(8)
            .activeOffsetX([-16, 16])
            .failOffsetY([-12, 12])
            .onBegin(() => { 'worklet'; viewerBackEligible.value = 1; })
            .onUpdate((e) => { 'worklet'; if (!viewerBackEligible.value) return; runOnJS(onViewerBackUpdateX)(e.translationX); })
            .onEnd((e) => { 'worklet'; viewerBackEligible.value = 0; runOnJS(onViewerBackEnd)(e.translationX, e.velocityX); })
            .onFinalize(() => { 'worklet'; viewerBackEligible.value = 0; })
    ), [viewerBackEligible, onViewerBackEnd, onViewerBackUpdateX]);

    return (
        <View style={styles.container}>
            <View style={styles.grabber} accessible={false} importantForAccessibility="no" />
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={withStrongPress(toViewProfile)} style={styles.headerLeft} hitSlop={10}>
                    {hasPfp ? (
                        <FastImage
                            source={{
                                uri: pfpUri,
                                priority: FastImage.priority.normal,
                                cache: FastImage.cacheControl.immutable,
                            }}
                            style={styles.pfp}
                            resizeMode={FastImage.resizeMode.cover}
                        />
                    ) : (
                        <View style={[styles.pfp, styles.pfpFallback]}>
                            <MaterialCommunityIcons
                                name="account-circle-outline"
                                size={scaleSize(28)}
                                color="#64748B"
                            />
                        </View>
                    )}
                    <View style={{ flex: 1 }}>
                        <VerifiedHandle
                            handle={user.handle}
                            isVerified={Boolean(user?.isVerified ?? user?.verified)}
                            textStyle={[styles.handle, { color: handleColor }]}
                            numberOfLines={1}
                            containerStyle={styles.handleRow}
                            iconSize={scaleSize(18)}
                        />
                        <Text style={styles.subHandle}>{joinedLabel}</Text>
                    </View>
                </Pressable>

                <View style={styles.ovrGlowWrap}>
                    <View pointerEvents="none" style={styles.ovrGlow} />
                    <View style={styles.scorePill}>
                        <Text style={styles.scorePillLabel}>OVR</Text>
                        {ovrChanged ? (
                            <View style={styles.ovrRow}>
                                <View style={styles.scorePillPrevWrap}>
                                    <Text style={styles.scorePillPrev}>{prevOverall}</Text>
                                    <View pointerEvents="none" style={styles.scorePillPrevLine} />
                                </View>
                                <Text style={styles.scorePillNew}>{overall}</Text>
                            </View>
                        ) : (
                            <Text style={styles.scorePillValue}>{overall}</Text>
                        )}
                    </View>
                </View>
            </View>
            {/* Content */}
            <ScrollView
                style={styles.scrollview}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <UserStatsProgressPreview
                    user={userForViewer}
                    hexOverlay={hexOverlay}
                    hexProps={hexProps}
                    onWorkoutPress={handleWorkoutPress}
                />

                {/* Exercises */}
                <View style={styles.exerciseList}>
                    {!showExercises ? (
                        <View style={[styles.emptyCard, { paddingVertical: scaledSize(30) }]}>
                            <ActivityIndicator size="small" color={COLORS.accent} />
                            <Text style={[styles.emptyText, { marginTop: scaledSize(6) }]}>Loading…</Text>
                        </View>
                    ) : exerciseGroups.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyText}>No exercises tracked yet.</Text>
                        </View>
                    ) : (
                        exerciseGroups.map(({ group, items }, groupIndex) => {
                            const isCollapsed = !!collapsed[group];
                            return (
                                <View key={`group-${group}`}>
                                    <Pressable
                                        style={[styles.groupHeaderRow, groupIndex > 0 && styles.groupHeaderRowSpacing]}
                                        onPress={withStrongPress(() => toggleGroup(group))}
                                    >
                                        <Text style={styles.groupHeader}>{`${group} Exercises`}</Text>
                                        <MaterialCommunityIcons
                                            name={isCollapsed ? "chevron-down" : "chevron-up"}
                                            size={scaledSize(24)}
                                            color={COLORS.subtext}
                                        />
                                    </Pressable>
                                    {!isCollapsed && items.map(({ name, exercise }, idx) => (
                                        <UserStatsExerciseCard
                                            key={`${name}-${idx}`}
                                            name={name}
                                            exercise={exercise}
                                            isFirst={idx === 0}
                                            onPress={withStrongPress(() => openDetail(name))}
                                        />
                                    ))}
                                </View>
                            );
                        })
                    )}
                </View>

                <View style={{ height: scaledSize(100) }} />
            </ScrollView>
            <UserStatsExerciseDetailScreen
                visible={!!detailName}
                gesture={detailBackPan}
                detailName={detailName}
                translateX={detailTranslateX}
                workoutIds={detailWorkoutIds}
                exercise={detailExercise}
                workouts={detailWorkouts}
                loading={detailLoading}
                onClose={closeDetail}
            />
            <UserStatsWorkoutViewerScreen
                visible={viewerOpen}
                gesture={viewerBackPan}
                translateX={viewerTranslateX}
                handleOpacity={viewerHandleOpacity}
                workout={viewerWorkout}
                viewerUid={viewerUid}
                viewerData={viewerData}
                statsForViewer={statsForViewer}
                onClose={closeViewer}
                user={user}
                timerRef={timerRef}
            />
        </View>
    );
}
