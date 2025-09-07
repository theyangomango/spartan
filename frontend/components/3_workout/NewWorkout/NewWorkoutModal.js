// components/3_Workout/NewWorkout/NewWorkoutModal
import React, { useEffect, useState, useRef, useMemo, useCallback, memo } from "react";
import {
    StyleSheet,
    View,
    Modal,
    Text,
    Animated,
    Pressable,
    InteractionManager,
    LayoutAnimation,
    Platform,
    UIManager,
    Keyboard,
} from "react-native";
import { Dimensions, FlatList } from "react-native";
// AsyncStorage removed for reminder gating; show only on create/join events
let FlashListLib = null;
try { FlashListLib = require("@shopify/flash-list"); } catch {}
const canUseFlashList = !!(FlashListLib && FlashListLib.FlashList && UIManager?.getViewManagerConfig && UIManager.getViewManagerConfig('CellContainer') && UIManager.getViewManagerConfig('AutoLayoutView'));
const BaseListComponent = canUseFlashList ? FlashListLib.FlashList : FlatList;
const AnimatedFlashList = Animated.createAnimatedComponent(BaseListComponent);
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { Weight } from "iconsax-react-native";
import * as Haptics from "expo-haptics";
import ProgressBanner from "./Tracking/ProgressBanner";
import ExerciseLog from "./Tracking/ExerciseLog";
import SelectExerciseModal from "./SelectExercise/SelectExerciseModal";
import { usePfp } from "../../../helper/usePFPs";
import { ss as scaledSize } from "../../../utils/scale";
// Lazy-load confetti only when needed to keep bundle lean during editing

// Realtime / Firestore
import { getFirestore, doc, setDoc, serverTimestamp, arrayUnion, addDoc, collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";

// Group bits
import { useGroupViewing } from "./Group/useGroupViewing";
import GroupHeader from "./Group/GroupHeader";
import GroupMenu from "./Group/GroupMenu";

// Invite picker (bottom sheet)
// Invite picker moved to screen level for full-screen backdrop
import RestTimerModal from "./RestTimerModal";
import useRestTimer from "./hooks/useRestTimer";
import useWorkoutEditing from "./hooks/useWorkoutEditing";
import useWorkoutTotals from "./hooks/useWorkoutTotals";

const NewWorkoutModal = ({
    workout,
    cancelWorkout,
    updateWorkout,
    finishWorkout,
    timerRef,
    userWorkoutStats,
    onViewingChange,
    onPressBack,    // for friend view
    onCheer,        // for friend view
    onCopyTemplate, // when viewing friend's completed workout
    onPressPfp,     // navigate to profile when pfp on left is pressed
    // 👇 NEW: can be boolean or a string uid — if truthy, we hard-lock friend view
    forceViewingFriend = false,
    friendPfp = null,
    friendPfpVersion = 0,
    showGroupModal,                 // parent-controlled invite picker opener
    registerInviteHandler,          // parent setter to receive (users)=>Promise
    // Stream live state from Firestore (participants/presence/currentWorkout)?
    // For viewing completed workouts, pass false to reduce startup cost.
    streamLive = true,
}) => {

    // Enable LayoutAnimation on Android
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
        try { UIManager.setLayoutAnimationEnabledExperimental(true); } catch { }
    }
    const db = getFirestore();
    const { width: screenWidth } = Dimensions.get("window");

    const [selectExerciseModalVisible, setSelectExerciseModalVisible] = useState(false);
    const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] = useState(false);
    const [finishConfirmModalVisible, setFinishConfirmModalVisible] = useState(false);
    const [isFinishing, setIsFinishing] = useState(false);
    // Reminder modal (self only)
    const [reminderVisible, setReminderVisible] = useState(false);
    const reminderShownRef = useRef(new Set());
    const {
        restModalVisible,
        restModalKey,
        countdown,
        openRestModal,
        closeRestModal,
        startCountdown,
        addCountdown,
        resetCountdown,
        setCountdown,
    } = useRestTimer();

    // Invite picker now controlled by parent (Workout screen)
    // Parent provides showGroupModal() to open, and registerInviteHandler(fn) to receive callback.

    const scrollY = useRef(new Animated.Value(0)).current;
    const listRef = useRef(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    // Track keyboard height and add bottom padding so content can scroll above it
    useEffect(() => {
        const onShow = (e) => setKeyboardHeight(e?.endCoordinates?.height || 0);
        const onHide = () => setKeyboardHeight(0);
        const subShow = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', onShow);
        const subHide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', onHide);
        return () => { try { subShow.remove(); subHide.remove(); } catch { } };
    }, []);

    // Editing helpers/state (initialized after viewingSelfEffective is known)

    // ===== Group / viewing state — with friend-lock =====
    const meUid = String(global?.userData?.uid || "");
    const myActiveWid = String(global?.userData?.currentWorkout?.wid || "");
    const cardWid = String(workout?.wid || "");
    const friendUidFromWorkout = String(workout?.creatorUID || workout?.creatorUid || "");

    // If parent passed a uid (preferred), use it; if boolean true, fall back to workout's creator
    const forcedUid =
        typeof forceViewingFriend === "string"
            ? forceViewingFriend
            : (forceViewingFriend ? friendUidFromWorkout : null);
    const lockFriend = !!forcedUid;

    // Only auto-join when NOT locked to friend-view and wid matches my active wid
    const shouldAutoJoin = streamLive && !lockFriend && !!(myActiveWid && cardWid && myActiveWid === cardWid);

    // Decide initial target for the viewer hook
    const initialViewingUid = lockFriend
        ? forcedUid
        : (shouldAutoJoin
            ? meUid
            : (friendUidFromWorkout && friendUidFromWorkout !== meUid ? friendUidFromWorkout : meUid));

    // Gate heavy live streaming until user explicitly opens group menu or we lock to a friend
    const [liveEnabled, setLiveEnabled] = useState(false);

    const {
        viewing,
        viewingSelf,
        participants,
        menuVisible,
        openMenu,
        closeMenu,
        activeWorkout,
        activeStats,
        waitingFriend,
        setViewing,
        members,
    } = useGroupViewing({
        wid: streamLive ? cardWid : null,
        meUid,
        userImage: global?.userData?.image,
        userHandle: global?.userData?.handle,
        initViewingUid: initialViewingUid,
        autoJoin: shouldAutoJoin,
        lockToViewingUid: lockFriend,
        suppressSelfStream: true,
        // Enable when: explicitly toggled OR locked to friend. We avoid referencing viewingSelfEffective here
        // to prevent TDZ issues and keep logic simple; spectating flows call setLiveEnabled(true) via menu open.
        enabled: !!streamLive && (!!liveEnabled || lockFriend),
    });

    // Effective flags/content when locked
    const viewingSelfEffective = lockFriend ? false : viewingSelf;

    const {
        replaceIndex,
        setReplaceIndex,
        appendExercises,
        updateSets,
        deleteExercise,
        normalizeSet,
        makeBlankSetsLike,
    } = useWorkoutEditing({ workout, updateWorkout, viewingSelf: viewingSelfEffective });

    // keep caller informed (if they care)
    useEffect(() => { onViewingChange?.(!!viewingSelfEffective); }, [viewingSelfEffective, onViewingChange]);

    // derived: whether there are others; currently unused but keep pattern

    // no-op

    // Recreate editing hook with correct viewingSelf binding
    // Note: We re-bind by calling the hook once (above) and only using its functions; viewingSelf gates inside each method

    // When viewing a friend: prefer the passed workout (e.g., a past workout)
    // Only use friend's activeWorkout if it matches the card's wid to avoid brief flashes
    const baseWorkout = viewingSelfEffective
        ? workout
        : ((activeWorkout && String(activeWorkout?.wid || "") === cardWid) ? activeWorkout : workout);

    const totals = useWorkoutTotals({
        baseWorkout,
        activeStats,
        viewingSelf: viewingSelfEffective,
        workout,
        updateWorkout,
    });

    // Prefer friend's stats when viewing others; if live stats are absent (e.g., viewing a completed workout),
    // fall back to provided userWorkoutStats if available from the parent.
    const statsForPrevious = useMemo(() => {
        if (viewingSelfEffective) return userWorkoutStats || activeStats || {};
        const liveStats = activeStats || {};
        if (liveStats && Object.keys(liveStats).length > 0) return liveStats;
        return userWorkoutStats || {};
    }, [viewingSelfEffective, userWorkoutStats, activeStats]);

    // Precompute previous sets per exercise name once (fast map lookup in rows)
    const prevSetsMapRef = useRef(new Map());
    useEffect(() => {
        const m = new Map();
        try {
            // Prefer statsExercises.sets (wid-grouped) if available
            const stats = statsForPrevious || {};
            Object.keys(stats).forEach((name) => {
                const entry = stats[name] || {};
                const sets = Array.isArray(entry.sets) ? entry.sets : [];
                if (!sets.length) return;
                const lastWid = sets[sets.length - 1]?.wid;
                const arr = [];
                for (let i = sets.length - 1; i >= 0; i--) {
                    if (sets[i]?.wid !== lastWid) break;
                    arr.push({ weight: Number(sets[i]?.weight)||0, reps: Number(sets[i]?.reps)||0 });
                }
                arr.reverse();
                if (arr.length) m.set(name, arr);
            });
            // Fallback: scan recent completed workouts once
            if (m.size === 0) {
                const cw = Array.isArray(global?.userData?.completedWorkouts) ? global.userData.completedWorkouts : [];
                for (let i = cw.length - 1; i >= 0 && i >= cw.length - 12; i--) {
                    const wk = cw[i];
                    const exs = Array.isArray(wk?.exercises) ? wk.exercises : [];
                    for (const ex of exs) {
                        const name = String(ex?.name || '').trim(); if (!name) continue;
                        if (m.has(name)) continue;
                        const s = Array.isArray(ex?.sets) ? ex.sets : [];
                        if (!s.length) continue;
                        m.set(name, s.map((t)=>({ weight:Number(t?.weight)||0, reps:Number(t?.reps)||0 })));
                    }
                    if (m.size > 24) break; // cap
                }
            }
        } catch {}
        prevSetsMapRef.current = m;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statsForPrevious, (global?.userData?.completedWorkouts || []).length]);

    const showSelectExerciseModal = useCallback(() => { if (viewingSelfEffective) setSelectExerciseModalVisible(true); }, [viewingSelfEffective]);
    const closeSelectExerciseModal = useCallback(() => { setSelectExerciseModalVisible(false); setReplaceIndex(null); }, [setReplaceIndex]);
    const replaceExercise = useCallback((index) => { if (viewingSelfEffective) { setReplaceIndex(index); setSelectExerciseModalVisible(true); } }, [viewingSelfEffective, setReplaceIndex]);

    const handleAppendOrReplace = useCallback((picked) => {
        if (!viewingSelfEffective || !workout) return;
        const choice = Array.isArray(picked) ? picked[0] : picked;
        const isReplacing = replaceIndex !== null && replaceIndex >= 0;

        if (isReplacing && choice) {
            const oldSets = workout.exercises?.[replaceIndex]?.sets ?? [normalizeSet({})];
            const newSets = makeBlankSetsLike(oldSets);
            const nextExercises = (workout.exercises || []).map((ex, i) =>
                i === replaceIndex ? { name: choice.name, muscle: choice.muscle, sets: newSets } : ex
            );
            try { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); } catch { }
            updateWorkout({ ...workout, exercises: nextExercises });
            setIsDoneState((prev) => { const next = prev.map((row) => row.slice()); next[replaceIndex] = newSets.map((s) => !!s.isDone); return next; });
            setReplaceIndex(null);
            setSelectExerciseModalVisible(false);
            return;
        }

        try { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); } catch { }
        appendExercises(Array.isArray(picked) ? picked : [picked]);
        setSelectExerciseModalVisible(false);
        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
    }, [appendExercises, replaceIndex, viewingSelfEffective, workout, updateWorkout]);

    // deleteExercise and updateSets provided by hook

    const confirmCancelWorkout = () => {
        if (!viewingSelfEffective) return;
        if (!workout || (workout.exercises || []).length === 0) {
            setDeleteConfirmModalVisible(false);
            cancelWorkout();
        } else {
            setDeleteConfirmModalVisible(true);
        }
    };
    const handleDeleteWorkout = useCallback(() => { setDeleteConfirmModalVisible(false); cancelWorkout(); }, [cancelWorkout]);

    const openFinishConfirm = useCallback(() => { if (viewingSelfEffective) setFinishConfirmModalVisible(true); }, [viewingSelfEffective]);

    const handleFinishWorkout = useCallback(() => {
        if (isFinishing) return;
        setIsFinishing(true);
        setFinishConfirmModalVisible(false);
        InteractionManager.runAfterInteractions(() => {
            requestAnimationFrame(() => {
                Promise.resolve(finishWorkout?.()).catch(() => { }).finally(() => setIsFinishing(false));
            });
        });
    }, [finishWorkout, isFinishing]);

    const borderOpacity = scrollY.interpolate({ inputRange: [0, 98], outputRange: [0, 1], extrapolate: "clamp" });
    // Dimming logic:
    // - When Reminder Modal is visible: dim content
    // - Else, dim when not viewing your active workout (friend view or past self workout)
    // - Edge case: immediately after starting a workout, global.currentWorkout may not be hydrated yet.
    //   In that case, rely on the local prop (workout.__justStarted) to treat as active and avoid dimming.
    const isActiveSelf = useMemo(() => {
        if (!viewingSelfEffective) return false;
        const widCard = String(cardWid || "");
        if (!widCard) return false;
        const myWid = String(myActiveWid || "");
        if (myWid && myWid === widCard) return true;
        // Fresh start path: parent passes local workout with __justStarted before Firestore write returns
        if (workout && workout.__justStarted && String(workout.wid || "") === widCard) return true;
        return false;
    }, [viewingSelfEffective, myActiveWid, cardWid, workout?.__justStarted, workout?.wid]);
    const dimDueToContext = !isActiveSelf;
    const contentOpacity = reminderVisible ? 0.6 : (dimDueToContext ? 0.6 : 1);

    const friendWaiting = streamLive && !viewingSelfEffective && waitingFriend && !(baseWorkout?.exercises?.length);

    // List data + emptiness flag (avoid inline recompute and allow conditional header/footer)
    const exercisesData = useMemo(() => (Array.isArray(baseWorkout?.exercises) ? baseWorkout.exercises : []), [baseWorkout?.exercises]);
    const isEmptyList = exercisesData.length === 0;

    // ===== PFPs (stable) =====
    const selfPfpVersion = global?.userData?.pfpVersion ?? 0;
    const selfPfpUri = usePfp(meUid, selfPfpVersion) ||
        global?.userData?.pfp ||
        global?.userData?.photoURL ||
        global?.userData?.image ||
        "";

    // Prefer provided friend version when locked
    const viewingPfpUriHook = usePfp(
        String(viewing?.uid || ""),
        (viewing?.pfpVersion != null && viewing?.pfpVersion !== undefined && viewing?.pfpVersion !== 0)
            ? viewing.pfpVersion
            : (friendPfpVersion || 0)
    );

    // If locked to friend: prefer the passed friendPfp to prevent any initial flip
    const headerOverlayPfp = lockFriend
        ? (viewingPfpUriHook || friendPfp || viewing?.image || "")
        : (viewingSelfEffective
            ? selfPfpUri
            : (viewingPfpUriHook || viewing?.image || friendPfp || ""));

    // Being “in an active group” = there is at least one participant other than me
    const inActiveGroup = useMemo(
        () => Array.isArray(participants) && participants.some((p) => String(p?.uid) !== meUid),
        [participants, meUid]
    );
    const inActiveGroupEffective = lockFriend ? false : inActiveGroup;

    // Friend workout state: treat as ongoing immediately when we know the source was live (streamLive)
    // to avoid a brief flash of the Copy Template button before the live snapshot arrives.
    const friendOngoing = useMemo(
        () => (
            !viewingSelfEffective && (
                streamLive || String(activeWorkout?.wid || "") === cardWid
            )
        ),
        [viewingSelfEffective, activeWorkout?.wid, cardWid, streamLive]
    );

    // Am I an active participant in this workout?
    const meIsMember = useMemo(() => {
        if (!streamLive) return false;
        const my = String(meUid || "");
        return Array.isArray(members) && members.some((m) => String(m) === my);
    }, [members, meUid, streamLive]);

    // ===== Confetti + Cheer Events =====
    const [confettiTick, setConfettiTick] = useState(0);
    const confettiRef = useRef(null);
    const ConfettiModuleRef = useRef(null);
    const loadConfettiModule = useCallback(() => {
        if (!ConfettiModuleRef.current) {
            try { ConfettiModuleRef.current = require('react-native-confetti-cannon').default; } catch {}
        }
        return ConfettiModuleRef.current;
    }, []);

    const fireConfetti = useCallback(() => {
        // Lazy-load module and try the ref API; fallback to key-mount
        loadConfettiModule();
        try {
            const api = confettiRef.current;
            if (api && typeof api.start === 'function') { api.start(); return; }
        } catch {}
        setConfettiTick((t) => t + 1);
    }, [loadConfettiModule]);

    // Broadcast a cheer event to this workout's events feed
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
            // best-effort; don't block UI
            console.log("sendCheerEvent error", e?.message || e);
        }
    }, [db, cardWid, meUid]);

    // Handle press on Cheer: local confetti + remote signal
    const handleCheerPress = useCallback(() => {
        // Local celebratory confetti
        fireConfetti();
        // Remote signal so the active participant(s) see it too
        sendCheerEvent();
    }, [fireConfetti, sendCheerEvent]);

    // Stable Cheer callback passed to GroupHeader
    const onCheerStable = useCallback(() => {
        if (!friendOngoing) return;
        handleCheerPress();
        try { onCheer?.(); } catch { }
    }, [friendOngoing, handleCheerPress, onCheer]);

    // Back behavior:
    // - If parent provided onPressBack (e.g., feed viewer), call it.
    // - Otherwise, when spectating inside the workout modal, switch back to self view.
    const handleBack = useCallback(() => {
        if (onPressBack) { try { onPressBack(); } catch {} return; }
        if (!viewingSelfEffective) {
            try { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); } catch {}
            const my = String(meUid || "");
            setViewing(my);
            onViewingChange?.(true);
        }
    }, [onPressBack, viewingSelfEffective, meUid, setViewing, onViewingChange]);

    // Listen for cheer events for this workout to trigger confetti when others cheer
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
                // Skip initial historical events
                if (!initialized) {
                    initialized = true;
                    const top = snap.docs?.[0];
                    lastSeenId = top ? top.id : null;
                    return;
                }
                // Only react to new added docs (avoid full list causing multiple fires)
                snap.docChanges().forEach((chg) => {
                    if (chg.type !== "added") return;
                    const id = chg.doc.id;
                    if (lastSeenId && id === lastSeenId) return;
                    const data = chg.doc.data() || {};
                    if (data?.type === "cheer") {
                        const from = String(data?.fromUid || "");
                        // Avoid double-firing for our own signal (we already fired local confetti)
                        if (from && from === my) return;
                        fireConfetti();
                    }
                    lastSeenId = id;
                });
            });
            return () => unsub();
        } catch (e) {
            console.log("cheer listener error", e?.message || e);
        }
    }, [db, cardWid, meUid, streamLive, fireConfetti]);

    // ===== Send invites from the picker =====
    const handleInviteSelected = useCallback(async (selectedUsers = []) => {
        try {
            if (!workout?.wid || !global?.userData?.uid) return;
            const wid = workout.wid;
            const myUid = global.userData.uid;

            await setDoc(
                doc(db, "workouts", wid),
                {
                    wid,
                    creatorUid: workout?.creatorUID || myUid,
                    active: true,
                    members: arrayUnion(myUid),
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );

            const batch = selectedUsers.map((u) =>
                addDoc(collection(db, "workoutInvites"), {
                    wid,
                    fromUid: myUid,
                    fromHandle: global?.userData?.handle || "",
                    toUid: String(u?.uid),
                    status: "pending",
                    createdAt: serverTimestamp(),
                })
            );
            await Promise.all(batch);

        } catch (e) {
            console.log("handleInviteSelected error", e);
        }
    }, [db, workout?.wid, workout?.creatorUID]);

    // Expose invite handler to parent so screen-level sheet can call it
    useEffect(() => {
        registerInviteHandler?.(handleInviteSelected);
    }, [registerInviteHandler, handleInviteSelected]);

    // Show the reminder ONLY when a workout has been just started locally or joined.
    // Triggered by local flag `__justStarted` and the global one-shot `__showWorkoutReminderForWid`.
    useEffect(() => {
        try {
            if (!viewingSelfEffective) return;
            const wid = String(workout?.wid || "");
            if (!wid || reminderShownRef.current.has(wid)) return;

            // also gate by one-time-only flag and per wid per session
            const shownMap = (global.__reminderShownForWids = global.__reminderShownForWids || {});
            if (shownMap[wid]) return;

            const shouldFromFlag = (typeof global !== 'undefined') && (global.__showWorkoutReminderForWid === wid);
            const shouldFromLocal = !!workout?.__justStarted;
            if (shouldFromFlag || shouldFromLocal) {
                // Mark as shown first to prevent double-scheduling on any re-render
                reminderShownRef.current.add(wid);
                shownMap[wid] = true;
                setReminderVisible(true);
                // Clear the non-persistent triggers without forcing a re-render cycle that could cancel show timing
                try { if (shouldFromFlag) global.__showWorkoutReminderForWid = null; } catch { }
            }
        } catch { }
    }, [viewingSelfEffective, workout?.wid, workout?.__justStarted]);

    // Focus handler from child set inputs: gently scroll the exercise into view
    const handleStatFocus = useCallback((exerciseIndex /*, setIndex */) => {
        try {
            const ref = listRef.current;
            if (!ref) return;
            // Scroll the exercise near the top so its inputs are above keyboard
            requestAnimationFrame(() => {
                try {
                    ref.scrollToIndex({ index: exerciseIndex, animated: true, viewPosition: 0.1 });
                } catch { /* fallback if not measured yet */ }
            });
        } catch { }
    }, []);

    return (
        <View style={styles.main_ctnr}>
            {/* Header */}
            <View style={styles.header}>
                <GroupHeader
                    viewingSelf={viewingSelfEffective}
                    overlayPfp={headerOverlayPfp}
                    onLongPressInvite={lockFriend ? undefined : (viewingSelfEffective ? showGroupModal : undefined)}
                    onFinish={viewingSelfEffective ? openFinishConfirm : undefined}
                    // Only show Cheer when the friend's session is ongoing. Provide stable handler to avoid re-renders.
                    onCheer={friendOngoing ? onCheerStable : undefined}
                    // When viewing a completed workout, show Copy Template instead
                    onCopyTemplate={!viewingSelfEffective && !friendOngoing ? (() => onCopyTemplate?.(baseWorkout)) : undefined}
                    countdown={countdown}
                    onAddTime={viewingSelfEffective ? openRestModal : undefined}
                    timerRef={timerRef}
                    headerStyle={styles.headerInner}
                    onBack={handleBack}
                    onPressPfp={!viewingSelfEffective ? onPressPfp : undefined}
                    // When spectating (modes 3 & 4), disable group press to keep UI identical
                    disableGroupPress={lockFriend || !viewingSelfEffective}
                    inActiveGroup={inActiveGroupEffective}
                    // Place PFP on the left whenever spectating (modes 2/3/4)
                    pfpOnLeft={!viewingSelfEffective}
                    // When user opens group menu, flip on live streaming first (and open)
                    onOpenMenu={() => { setLiveEnabled(true); try { openMenu(); } catch {} }}
                    onLongPressInvite={() => { setLiveEnabled(true); try { showGroupModal?.(); } catch {} }}
                />
            </View>
            <Animated.View style={[styles.headerShadow, { opacity: borderOpacity }]} />

            {/* Body */}
            {friendWaiting ? (
                <View style={styles.waitingWrap}>
                    <Text style={styles.waitingText}>Loading friend…</Text>
                </View>
            ) : (
                /* Animated FlashList for smoother, low-overhead virtualization */
                <AnimatedFlashList
                    key={`wlist-${cardWid}`}
                    ref={listRef}
                    data={exercisesData}
                    keyExtractor={(ex, i) => `${ex?.name || "ex"}-${i}`}
                    renderItem={({ item: ex, index: exerciseIndex }) => (
                        <ExerciseLog
                            name={ex.name}
                            muscle={ex.muscle}
                            exerciseIndex={exerciseIndex}
                            sets={ex.sets}
                            prevSets={Array.isArray(ex.prev) ? ex.prev : (prevSetsMapRef.current?.get(ex.name) || undefined)}
                            updateSets={updateSets}
                            replaceExercise={replaceExercise}
                            deleteExercise={() => deleteExercise(exerciseIndex)}
                            
                            userWorkoutStats={statsForPrevious}
                            readOnly={!viewingSelfEffective}
                            onStatFocus={handleStatFocus}
                        />
                    )}
                    ListHeaderComponent={isEmptyList ? null : (
                        <ProgressBanner totalReps={totals.reps} totalVolume={totals.volume} personalBests={totals.PBs} />
                    )}
                    ListFooterComponent={isEmptyList ? null : (
                        <>
                            {viewingSelfEffective && (
                                <>
                                    <RNBounceable onPress={showSelectExerciseModal} style={styles.add_exercise_btn}>
                                        <Text style={styles.add_exercise_text}>Add Exercises</Text>
                                        <Weight size={scaledSize(22)} color="#5DBDFF" variant="Bold" />
                                    </RNBounceable>
                                    <RNBounceable onPress={confirmCancelWorkout} style={styles.cancel_btn}>
                                        <Text style={styles.cancel_btn_text}>Cancel Workout</Text>
                                    </RNBounceable>
                                </>
                            )}
                            <View style={{ height: scaledSize(250) + Math.max(0, keyboardHeight - scaledSize(40)) }} />
                        </>
                    )}
                    ListEmptyComponent={(
                        <View style={{ backgroundColor: '#fff' }}>
                            <ProgressBanner totalReps={totals.reps} totalVolume={totals.volume} personalBests={totals.PBs} />
                            {viewingSelfEffective && (
                                <>
                                    <RNBounceable onPress={showSelectExerciseModal} style={styles.add_exercise_btn}>
                                        <Text style={styles.add_exercise_text}>Add Exercises</Text>
                                        <Weight size={scaledSize(22)} color="#5DBDFF" variant="Bold" />
                                    </RNBounceable>
                                    <RNBounceable onPress={confirmCancelWorkout} style={styles.cancel_btn}>
                                        <Text style={styles.cancel_btn_text}>Cancel Workout</Text>
                                    </RNBounceable>
                                </>
                            )}
                            <View style={{ height: scaledSize(60) }} />
                        </View>
                    )}
                    showsVerticalScrollIndicator={false}
                    scrollEventThrottle={16}
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
                    {...(canUseFlashList ? { estimatedItemSize: scaledSize(72) } : {})}
                    style={[styles.scrollview, { opacity: contentOpacity }]}
                />
            )}

            {/* Add / Replace Exercises */}
            <Modal animationType="fade" transparent visible={selectExerciseModalVisible}>
                <SelectExerciseModal
                    closeModal={closeSelectExerciseModal}
                    appendExercises={handleAppendOrReplace}
                    userWorkoutStats={activeStats}
                />
            </Modal>

            {/* Rest Timer Modal */}
            <RestTimerModal
                key={restModalKey}
                visible={restModalVisible}
                onClose={closeRestModal}
                countdown={countdown}
                onStart={startCountdown}
                onAdd={addCountdown}
                onReset={resetCountdown}
            />

            {/* Delete confirm */}
            <Modal
                animationType="fade"
                transparent
                visible={deleteConfirmModalVisible}
                onRequestClose={() => setDeleteConfirmModalVisible(false)}
                statusBarTranslucent
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalText}>Are you sure you want to delete this workout?</Text>
                        <RNBounceable onPress={handleDeleteWorkout} style={styles.deleteWorkoutBtn}>
                            <Text style={styles.deleteWorkoutText}>Delete Workout</Text>
                        </RNBounceable>
                        <RNBounceable onPress={() => setDeleteConfirmModalVisible(false)} style={styles.cancelDeleteBtn}>
                            <Text style={styles.cancelDeleteText}>Cancel</Text>
                        </RNBounceable>
                    </View>
                </View>
            </Modal>

            {/* Finish confirm (self only) */}
            <Modal
                animationType="fade"
                transparent
                visible={finishConfirmModalVisible}
                onRequestClose={() => setFinishConfirmModalVisible(false)}
                statusBarTranslucent
            >
                <Pressable style={styles.modalOverlay} onPress={() => setFinishConfirmModalVisible(false)}>
                    <Pressable style={styles.finishModalContainer} onPress={(e) => e.stopPropagation()}>
                        <Text style={styles.finishTitle}>Finish workout?</Text>

                        <RNBounceable
                            onPress={handleFinishWorkout}
                            style={[styles.finishBtn, isFinishing ? styles.finishBtnDisabled : null]}
                            disabled={isFinishing}
                        >
                            <Text style={styles.finishBtnText}>{isFinishing ? "Finishing…" : "Finish Workout"}</Text>
                        </RNBounceable>

                        <RNBounceable onPress={() => setFinishConfirmModalVisible(false)} style={styles.keepEditingBtn}>
                            <Text style={styles.keepEditingText}>Keep Working</Text>
                        </RNBounceable>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Group menu & invite picker — hidden when locked to friend */}
            {!lockFriend && (
                <GroupMenu
                    visible={menuVisible}
                    onClose={closeMenu}
                    participants={participants}
                    viewing={viewing || { uid: viewingSelfEffective ? meUid : (friendUidFromWorkout || "") }}
                    onInvite={() => { closeMenu(); showGroupModal?.(); }}
                    onSelectParticipant={(p) => {
                        const nextUid = String(p?.uid || meUid);
                        setViewing(nextUid);
                        onViewingChange?.(nextUid === meUid);
                        closeMenu();
                    }}
                />
            )}


            {/* Tracking reminder (self only) */}
            <Modal
                key={`reminder-${reminderVisible ? 1 : 0}`}
                visible={reminderVisible}
                transparent
                animationType="fade"
                onDismiss={() => setReminderVisible(false)}
                onRequestClose={() => setReminderVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setReminderVisible(false)}>
                    <BlurView style={StyleSheet.absoluteFill} intensity={28} tint="dark" />
                    <LinearGradient
                        colors={["#60A5FA", "#34D399"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.reminderWrapper}
                    >
                        <View style={styles.reminderContainer}>
                            <View style={styles.reminderContent}>
                                <Text style={styles.reminderTitle}>Track Reps Honestly</Text>
                                <Text style={styles.reminderBody}>
                                    Train for you, not anyone else. Maintain good form. Don't ego lift.{'\n'}Proud of you king 👑
                                </Text>
                            </View>
                        </View>
                    </LinearGradient>
                </Pressable>
            </Modal>

            {/* Confetti overlay (mount when cheering is relevant: spectating live OR self active) */}
            {(friendOngoing || isActiveSelf) && (() => { const ConfettiCannon = loadConfettiModule(); return ConfettiCannon ? (
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
                    {/* Fallback: if ref API unavailable, key-mount for immediate autoStart */}
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
            ) : null; })()}
        </View >
    );
};

const styles = StyleSheet.create({
    main_ctnr: { flex: 1 },

    header: { backgroundColor: "#fff" },
    headerInner: {
        paddingBottom: scaledSize(6),
        paddingHorizontal: scaledSize(22),
        paddingTop: scaledSize(6),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#fff",
        zIndex: 5,
    },
    headerShadow: { height: scaledSize(2), backgroundColor: "#eaeaea" },

    scrollview: { paddingTop: scaledSize(5), backgroundColor: "#fff" },

    waitingWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
    waitingText: { marginTop: 6, fontFamily: "Nunito_700Bold", color: "#444" },

    add_exercise_btn: {
        marginHorizontal: scaledSize(20),
        marginTop: scaledSize(18),
        height: scaledSize(35),
        borderRadius: scaledSize(12),
        backgroundColor: "#E1F0FF",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
    },
    add_exercise_text: {
        fontSize: scaledSize(16),
        fontFamily: "Outfit_700Bold",
        color: "#0499FE",
        marginRight: scaledSize(4.5),
    },

    cancel_btn: {
        marginHorizontal: scaledSize(20),
        marginTop: scaledSize(18),
        height: scaledSize(35),
        borderRadius: scaledSize(12),
        backgroundColor: "#FFECEC",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
    },
    cancel_btn_text: { fontSize: scaledSize(16), fontFamily: "Outfit_700Bold", color: "#F27171", marginRight: scaledSize(4.5) },

    modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: scaledSize(24) },
    modalContainer: { width: "100%", padding: scaledSize(20), backgroundColor: "#fff", borderRadius: scaledSize(15), alignItems: "center" },
    modalText: { fontSize: scaledSize(16), color: "#333", fontFamily: "Outfit_700Bold", marginBottom: scaledSize(20), textAlign: "center" },
    deleteWorkoutBtn: { width: "100%", paddingVertical: scaledSize(8), backgroundColor: "#FFECEC", borderRadius: scaledSize(8), alignItems: "center", marginBottom: scaledSize(10) },
    deleteWorkoutText: { color: "#F27171", fontSize: scaledSize(14), fontFamily: "Outfit_700Bold" },
    cancelDeleteBtn: { width: "100%", paddingVertical: scaledSize(8), backgroundColor: "#eee", borderRadius: scaledSize(8), alignItems: "center" },
    cancelDeleteText: { color: "#666", fontSize: scaledSize(14), fontFamily: "Outfit_700Bold" },

    finishModalContainer: { width: "100%", padding: scaledSize(20), backgroundColor: "#fff", borderRadius: scaledSize(16), alignItems: "center" },
    finishTitle: { fontSize: scaledSize(18), color: "#111827", fontFamily: "Outfit_700Bold", textAlign: "center", marginBottom: scaledSize(16) },
    finishBtn: { width: "100%", paddingVertical: scaledSize(10), backgroundColor: "#40D99B", borderRadius: scaledSize(10), alignItems: "center", marginBottom: scaledSize(10) },
    finishBtnText: { color: "#fff", fontSize: scaledSize(14.5), fontFamily: "Outfit_700Bold" },
    finishBtnDisabled: { opacity: 0.6 },
    keepEditingBtn: { width: "100%", paddingVertical: scaledSize(10), backgroundColor: "#F1F5F9", borderRadius: scaledSize(10), alignItems: "center" },
    keepEditingText: { color: "#0F172A", fontSize: scaledSize(14), fontFamily: "Outfit_600SemiBold" },
    // Reminder styles (gradient border card)
    reminderWrapper: {
        width: "92%",
        borderRadius: scaledSize(20),
        padding: scaledSize(3), // gradient border width
        // shadow on wrapper for proper elevation
        shadowColor: "#0F172A",
        shadowOpacity: 0.12,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
        elevation: 16,
    },
    reminderContainer: {
        backgroundColor: "#fff",
        borderRadius: scaledSize(18),
    },
    reminderContent: {
        paddingVertical: scaledSize(18),
        paddingHorizontal: scaledSize(20),
        alignItems: "center",
    },
    reminderTitle: { fontSize: scaledSize(16), color: "#0F172A", fontFamily: "Nunito_800ExtraBold", marginBottom: scaledSize(14) },
    reminderBody: { fontSize: scaledSize(14), color: "#334155c7", fontFamily: "Nunito_700Bold", textAlign: "center" },
});

// Prevent unnecessary re-renders: only re-render when meaningful props change.
// Note: `workout` changes when any exercise/sets change (by design),
// so we short-circuit on strict equality and avoid extra renders from parent churn.
const areEqualModalProps = (prev, next) => (
    prev.workout === next.workout &&
    prev.userWorkoutStats === next.userWorkoutStats &&
    prev.timerRef === next.timerRef &&
    prev.forceViewingFriend === next.forceViewingFriend &&
    prev.onViewingChange === next.onViewingChange &&
    prev.onPressBack === next.onPressBack &&
    prev.onCheer === next.onCheer &&
    prev.onCopyTemplate === next.onCopyTemplate &&
    prev.cancelWorkout === next.cancelWorkout &&
    prev.updateWorkout === next.updateWorkout &&
    prev.finishWorkout === next.finishWorkout
);

export default memo(NewWorkoutModal, areEqualModalProps);
