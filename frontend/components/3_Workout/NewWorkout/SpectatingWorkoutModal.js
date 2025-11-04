// components/3_Workout/NewWorkout/SpectatingWorkoutModal
import React, { useEffect, useState, useRef, useMemo, useCallback, memo } from "react";
import { StyleSheet, View, Text, Animated, Platform, UIManager, Easing } from "react-native";
import { Dimensions, FlatList } from "react-native";

let FlashListLib = null;
try { FlashListLib = require("@shopify/flash-list"); } catch {}
const canUseFlashList = !!(FlashListLib && FlashListLib.FlashList && UIManager?.getViewManagerConfig && UIManager.getViewManagerConfig("CellContainer") && UIManager.getViewManagerConfig("AutoLayoutView"));
const BaseListComponent = canUseFlashList ? FlashListLib.FlashList : FlatList;
const AnimatedFlashList = Animated.createAnimatedComponent(BaseListComponent);

import ExerciseLog from "./Tracking/ExerciseLog";
import { usePfp } from "../../../helper/usePFPs";
import { resolvePhotoURL } from "../../../utils/profilePhoto";
import { ss as scaledSize } from "../../../utils/scale";
import theme from "../../../theme/mfpDark";
import { getFirestore, addDoc, collection, serverTimestamp, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { useGroupViewing } from "./Group/useGroupViewing";
import GroupHeader from "./Group/GroupHeader";
import scaleSize from "../../../helper/scaleSize";
import { formatWorkoutTimestamp } from "../../../utils/date";

const SpectatingWorkoutModal = ({
    workout,
    timerRef,
    userWorkoutStats,
    onViewingChange,
    onPressBack,
    onCheer,
    onCopyTemplate,
    onPressPfp,
    forceViewingFriend = false,
    friendPfp = null,
    friendPfpVersion = 0,
    streamLive = true,
}) => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
        try { UIManager.setLayoutAnimationEnabledExperimental(true); } catch {}
    }

    const db = getFirestore();
    const { width: screenWidth } = Dimensions.get("window");

    const scrollY = useRef(new Animated.Value(0)).current;
    const listRef = useRef(null);

    const meUid = String(global?.userData?.uid || "");
    const myActiveWid = String(global?.userData?.currentWorkout?.wid || "");
    const cardWid = String(workout?.wid || "");
    const friendUidFromWorkout = String(workout?.creatorUID || workout?.creatorUid || "");

    const forcedUid =
        typeof forceViewingFriend === "string"
            ? forceViewingFriend
            : (forceViewingFriend ? friendUidFromWorkout : null);
    const lockFriend = !!forcedUid;

    const initialViewingUid = lockFriend
        ? forcedUid
        : (friendUidFromWorkout && friendUidFromWorkout !== meUid ? friendUidFromWorkout : meUid);

    const {
        viewing,
        viewingSelf,
        activeWorkout,
        waitingFriend,
        setViewing,
    } = useGroupViewing({
        wid: streamLive ? cardWid : null,
        meUid,
        userImage: resolvePhotoURL(global?.userData, ""),
        userHandle: global?.userData?.handle,
        initViewingUid: initialViewingUid,
        autoJoin: false,
        lockToViewingUid: lockFriend,
        suppressSelfStream: true,
        enabled: !!streamLive,
    });

    const viewingSelfEffective = lockFriend ? false : viewingSelf;

    useEffect(() => {
        onViewingChange?.(!!viewingSelfEffective);
    }, [viewingSelfEffective, onViewingChange]);

    const baseWorkout = viewingSelfEffective
        ? workout
        : ((activeWorkout && String(activeWorkout?.wid || "") === cardWid) ? activeWorkout : workout);

    const workoutTitle = String(baseWorkout?.name ?? "").trim();
    const workoutCreatedDisplay = useMemo(() => {
        const label = formatWorkoutTimestamp(baseWorkout?.created ?? baseWorkout?.createdAt);
        return label || null;
    }, [baseWorkout?.created, baseWorkout?.createdAt]);
    const workoutTitleDisplay = useMemo(() => {
        if (!workoutTitle) return null;
        return (
            <View style={styles.titleDisplayContainer}>
                <Text style={styles.titleDisplayText} numberOfLines={2}>{workoutTitle}</Text>
                {workoutCreatedDisplay ? (
                    <Text style={styles.titleDisplaySubText}>{workoutCreatedDisplay}</Text>
                ) : null}
            </View>
        );
    }, [workoutTitle, workoutCreatedDisplay]);

    const borderOpacity = scrollY.interpolate({ inputRange: [0, 98], outputRange: [0, 1], extrapolate: "clamp" });

    const isActiveSelf = useMemo(() => {
        if (!viewingSelfEffective) return false;
        const widCard = String(cardWid || "");
        if (!widCard) return false;
        const myWid = String(myActiveWid || "");
        if (myWid && myWid === widCard) return true;
        if (workout && workout.__justStarted && String(workout.wid || "") === widCard) return true;
        if (String(workout?.wid || "") === widCard) return true;
        return false;
    }, [viewingSelfEffective, myActiveWid, cardWid, workout?.__justStarted, workout?.wid]);

    const contentDimAnim = useRef(new Animated.Value(1)).current;
    const targetOpacity = isActiveSelf ? 1 : 0.6;
    useEffect(() => {
        try {
            Animated.timing(contentDimAnim, {
                toValue: targetOpacity,
                duration: 180,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start();
        } catch {}
    }, [targetOpacity, contentDimAnim]);

    const friendWaiting = streamLive && !viewingSelfEffective && waitingFriend && !(baseWorkout?.exercises?.length);

    const exercisesData = useMemo(() => (Array.isArray(baseWorkout?.exercises) ? baseWorkout.exercises : []), [baseWorkout?.exercises]);
    const isEmptyList = exercisesData.length === 0;

    const selfPfpVersion = global?.userData?.pfpVersion ?? 0;
    const selfFallbackPfp = resolvePhotoURL(global?.userData, "");
    const selfPfpUri = usePfp(meUid, selfPfpVersion, selfFallbackPfp) || selfFallbackPfp;

    const viewingPfpUriHook = usePfp(
        String(viewing?.uid || ""),
        (viewing?.pfpVersion != null && viewing?.pfpVersion !== 0)
            ? viewing.pfpVersion
            : (friendPfpVersion || 0)
    );

    const resolvedViewingPfp = resolvePhotoURL(viewing, friendPfp || viewingPfpUriHook || viewing?.image || "");
    const headerOverlayPfp = lockFriend
        ? (viewingPfpUriHook || resolvedViewingPfp || friendPfp || viewing?.image || "")
        : (viewingSelfEffective
            ? selfPfpUri
            : (viewingPfpUriHook || resolvedViewingPfp || friendPfp || viewing?.image || ""));

    const friendOngoing = useMemo(
        () => (!viewingSelfEffective && (streamLive || String(activeWorkout?.wid || "") === cardWid)),
        [viewingSelfEffective, activeWorkout?.wid, cardWid, streamLive]
    );

    const [confettiTick, setConfettiTick] = useState(0);
    const confettiRef = useRef(null);
    const ConfettiModuleRef = useRef(null);
    const loadConfettiModule = useCallback(() => {
        if (!ConfettiModuleRef.current) {
            try { ConfettiModuleRef.current = require("react-native-confetti-cannon").default; } catch {}
        }
        return ConfettiModuleRef.current;
    }, []);

    const fireConfetti = useCallback(() => {
        loadConfettiModule();
        try {
            const api = confettiRef.current;
            if (api && typeof api.start === "function") { api.start(); return; }
        } catch {}
        setConfettiTick((t) => t + 1);
    }, [loadConfettiModule]);

    const sendCheerEvent = useCallback(async () => {
        try {
            const wid = String(cardWid || "");
            if (!wid) return;
            const fromUid = String(meUid || "");
            await addDoc(collection(db, "workouts", wid, "events"), {
                type: "cheer",
                fromUid,
                createdAt: serverTimestamp(),
            });
        } catch (e) {
            console.log("sendCheerEvent error", e?.message || e);
        }
    }, [db, cardWid, meUid]);

    const handleCheerPress = useCallback(() => {
        fireConfetti();
        sendCheerEvent();
    }, [fireConfetti, sendCheerEvent]);

    const onCheerStable = useCallback(() => {
        if (!friendOngoing) return;
        handleCheerPress();
        try { onCheer?.(); } catch {}
    }, [friendOngoing, handleCheerPress, onCheer]);

    const handleBack = useCallback(() => {
        if (onPressBack) {
            try { onPressBack(); } catch {}
            return;
        }
        if (!lockFriend) {
            const my = String(meUid || "");
            setViewing(my);
            onViewingChange?.(true);
        }
    }, [onPressBack, lockFriend, meUid, setViewing, onViewingChange]);

    useEffect(() => {
        if (!streamLive) return;
        const wid = String(cardWid || "");
        if (!wid) return;
        const my = String(meUid || "");
        let lastSeenId = null;
        let initialized = false;
        try {
            const q = query(
                collection(db, "workouts", wid, "events"),
                orderBy("createdAt", "desc"),
                limit(10)
            );
            const unsub = onSnapshot(q, (snap) => {
                if (!initialized) {
                    initialized = true;
                    const top = snap.docs?.[0];
                    lastSeenId = top ? top.id : null;
                    return;
                }
                snap.docChanges().forEach((chg) => {
                    if (chg.type !== "added") return;
                    const id = chg.doc.id;
                    if (lastSeenId && id === lastSeenId) return;
                    const data = chg.doc.data() || {};
                    if (data?.type === "cheer") {
                        const from = String(data?.fromUid || "");
                        if (from && from === my) return;
                        fireConfetti();
                    }
                    lastSeenId = id;
                });
            });
            return () => unsub();
        } catch (e) {
            console.log("cheer listener error", e?.message || e);
            return undefined;
        }
    }, [db, cardWid, meUid, streamLive, fireConfetti]);

    const renderExercise = useCallback(({ item: ex, index: exerciseIndex }) => (
        <ExerciseLog
            name={ex.name}
            muscle={ex.muscle}
            exerciseIndex={exerciseIndex}
            sets={ex.sets}
            updateSets={() => {}}
            deleteExercise={undefined}
            replaceExercise={undefined}
            readOnly
            onStatFocus={undefined}
        />
    ), []);

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.header}>
                <GroupHeader
                    viewingSelf={false}
                    overlayPfp={headerOverlayPfp}
                    countdown={0}
                    timerRef={timerRef}
                    headerStyle={styles.headerInner}
                    onBack={handleBack}
                    onPressPfp={!viewingSelfEffective ? onPressPfp : undefined}
                    disableGroupPress
                    inActiveGroup={false}
                    pfpOnLeft
                    onCheer={friendOngoing ? onCheerStable : undefined}
                    onCopyTemplate={!friendOngoing ? (() => onCopyTemplate?.(baseWorkout)) : undefined}
                />
            </View>
            <Animated.View style={[styles.headerShadow, { opacity: borderOpacity }]} />
            {friendWaiting ? (
                <View style={styles.waitingWrap}>
                    <Text style={styles.waitingText}>Loading friend…</Text>
                </View>
            ) : (
                isEmptyList ? (
                    <Animated.View style={[styles.scrollview, { opacity: contentDimAnim }]}>
                        {workoutTitleDisplay}
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No exercises logged for this workout.</Text>
                        </View>
                        <View style={styles.bottomSpacer} />
                    </Animated.View>
                ) : (
                    <Animated.View style={[styles.listWrap, { opacity: contentDimAnim }]}>
                        <AnimatedFlashList
                            key={`spectate-${cardWid}`}
                            ref={listRef}
                            data={exercisesData}
                            keyExtractor={(ex, i) => `${ex?.name || "ex"}-${i}`}
                            renderItem={renderExercise}
                            ListHeaderComponent={workoutTitleDisplay}
                            ListFooterComponent={<View style={styles.bottomSpacer} />}
                            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
                            contentContainerStyle={styles.listContentContainer}
                            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
                            scrollEventThrottle={16}
                            showsVerticalScrollIndicator={false}
                        />
                    </Animated.View>
                )
            )}
            {(friendOngoing || isActiveSelf) && (() => {
                const ConfettiCannon = loadConfettiModule();
                return ConfettiCannon ? (
                    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                        <ConfettiCannon
                            ref={confettiRef}
                            autoStart={false}
                            count={120}
                            origin={{ x: screenWidth / 2, y: -scaledSize(60) }}
                            fadeOut
                            explosionSpeed={220}
                            fallSpeed={1500}
                        />
                        {confettiTick > 0 && (
                            <ConfettiCannon
                                key={confettiTick}
                                count={120}
                                origin={{ x: screenWidth / 2, y: -scaledSize(60) }}
                                fadeOut
                                explosionSpeed={220}
                                fallSpeed={1500}
                            />
                        )}
                    </View>
                ) : null;
            })()}
        </View>
    );
};

const styles = StyleSheet.create({
    main_ctnr: { flex: 1, backgroundColor: theme.bg },
    header: { backgroundColor: "transparent" },
    headerInner: {
        paddingBottom: scaledSize(6),
        paddingHorizontal: scaledSize(22),
        paddingTop: scaledSize(6),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "transparent",
        zIndex: 5,
    },
    headerShadow: { height: scaledSize(2), backgroundColor: theme.hairline },
    scrollview: { paddingTop: scaledSize(5), backgroundColor: "transparent" },
    titleDisplayContainer: {
        paddingHorizontal: scaledSize(24),
        marginBottom: scaledSize(12),
    },
    titleDisplayText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(17),
        color: theme.textPrimary,
        textAlign: "left",
    },
    titleDisplaySubText: {
        marginTop: scaleSize(2),
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(11),
        color: theme.textSecondary,
        textAlign: "left",
    },
    listWrap: { flex: 1 },
    listContentContainer: {
        paddingTop: scaledSize(5),
        paddingBottom: scaledSize(24),
    },
    waitingWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "transparent" },
    waitingText: { marginTop: scaleSize(6), fontFamily: "Nunito_700Bold", color: theme.textPrimary },
    emptyState: {
        paddingHorizontal: scaledSize(24),
        paddingVertical: scaledSize(40),
        alignItems: "flex-start",
    },
    emptyText: {
        fontFamily: "Nunito_600SemiBold",
        fontSize: scaleSize(12),
        color: theme.textSecondary,
    },
    bottomSpacer: { height: scaledSize(250) },
});

const areEqualModalProps = (prev, next) => (
    prev.workout === next.workout &&
    prev.userWorkoutStats === next.userWorkoutStats &&
    prev.timerRef === next.timerRef &&
    prev.forceViewingFriend === next.forceViewingFriend &&
    prev.onViewingChange === next.onViewingChange &&
    prev.onPressBack === next.onPressBack &&
    prev.onCheer === next.onCheer &&
    prev.onCopyTemplate === next.onCopyTemplate
);

export default memo(SpectatingWorkoutModal, areEqualModalProps);
