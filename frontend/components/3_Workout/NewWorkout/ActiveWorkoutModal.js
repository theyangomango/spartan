// components/3_Workout/NewWorkout/ActiveWorkoutModal
import React, { useEffect, useState, useRef, useMemo, useCallback, memo } from "react";
import {
    StyleSheet,
    View,
    ScrollView,
    Modal,
    Text,
    TextInput,
    Animated as RNAnimated,
    Pressable,
    InteractionManager,
    LayoutAnimation,
    Platform,
    UIManager,
    Keyboard,
    Easing,
} from "react-native";
import { Dimensions, FlatList } from "react-native";
// AsyncStorage removed for reminder gating; show only on create/join events
let FlashListLib = null;
try { FlashListLib = require("@shopify/flash-list"); } catch { }
const canUseFlashList = !!(FlashListLib && FlashListLib.FlashList && UIManager?.getViewManagerConfig && UIManager.getViewManagerConfig('CellContainer') && UIManager.getViewManagerConfig('AutoLayoutView'));
const BaseListComponent = canUseFlashList ? FlashListLib.FlashList : FlatList;
const AnimatedFlashList = RNAnimated.createAnimatedComponent(BaseListComponent);
import Animated, { useAnimatedStyle, interpolate, interpolateColor, Extrapolate, useAnimatedReaction, runOnJS } from "react-native-reanimated";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { Weight } from "iconsax-react-native";
import { strong as haptic, withStrongPress } from "../../../utils/haptics";
import ExerciseLog from "./Tracking/ExerciseLog";
import SelectExerciseModal from "./SelectExercise/SelectExerciseModal";
import { usePfp } from "../../../helper/usePFPs";
import sendNotification from "../../../../backend/sendNotification";
import theme from "../../../theme/mfpDark";
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

import scaleSize from "../../../helper/scaleSize";
import { formatWorkoutTimestamp } from "../../../utils/date";
import ConfirmWorkoutModal from "./components/ConfirmWorkoutModal";
import WorkoutReminderModal from "./components/WorkoutReminderModal";

const HANDLE_HORIZONTAL_PADDING = scaleSize(0);
const HEADER_COLLAPSED_TRANSLATE = scaleSize(0);
const HEADER_COLLAPSED_PADDING_V = scaleSize(0);
const HEADER_EXPANDED_PADDING_V = scaleSize(6);
const HEADER_EXPANDED_PADDING_H = scaleSize(24);
const HEADER_COLLAPSED_BG = 'rgba(45, 157, 255, 0.58)';
const HEADER_EXPANDED_BG = 'rgba(45, 158, 255, 0)';
const SHEET_EXPANDED_BG = theme.bg;
const SHEET_COLOR_THRESHOLD = 0.15;
const CTA_PRIMARY_BG = '#1b3770ff';
const CTA_PRIMARY_BORDER = theme.primaryHairline;
const CTA_FINISH_BG = '#31a865ff';
const CTA_FINISH_BORDER = 'rgba(16, 185, 129, 0.4)';
const CTA_CANCEL_BG = '#b7404cff';
const CTA_CANCEL_BORDER = 'rgba(244, 114, 96, 0.4)';
const CTA_SHADOW_COLOR = '#000000';

const ensureUri = (value) => {
    const str = (value ?? "").toString().trim();
    return str.length ? str : "";
};
const toUidString = (uid) => (uid == null ? "" : String(uid));

// FlashList sizing helpers to keep footer actions from overlapping while template data hydrates
const ESTIMATED_EXERCISE_BASE_HEIGHT = scaleSize(136);
const ESTIMATED_SET_ROW_HEIGHT = scaleSize(52);
const ESTIMATED_LIST_EXTRA_SPACE = scaleSize(160);
const ESTIMATED_ITEM_MAX_HEIGHT = scaleSize(520);

const ActiveWorkoutModal = ({
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
    animatedIndex,
    onExpandSheet,
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
        restTotal,
    } = useRestTimer();

    // Invite picker now controlled by parent (Workout screen)
    // Parent provides showGroupModal() to open, and registerInviteHandler(fn) to receive callback.

    const scrollY = useRef(new RNAnimated.Value(0)).current;
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

    const forceSelfView = useMemo(() => {
        try { return String(global?.__forceWorkoutSelfViewWid || "") === cardWid; }
        catch { return false; }
    }, [cardWid]);

    // Only auto-join when NOT locked to friend-view and wid matches my active wid
    const shouldAutoJoin = streamLive && !lockFriend && !!(myActiveWid && cardWid && myActiveWid === cardWid);

    // Decide initial target for the viewer hook
    const initialViewingUid = lockFriend
        ? forcedUid
        : (forceSelfView
            ? meUid
            : (shouldAutoJoin
                ? meUid
                : (friendUidFromWorkout && friendUidFromWorkout !== meUid ? friendUidFromWorkout : meUid)));

    // Gate heavy live streaming until user explicitly opens group menu or we lock to a friend
    // If a one-shot global flag matches this wid (set on invite accept), enable live immediately
    const initialLiveEnable = useMemo(() => {
        try { return !!(global && global.__enableLiveForWid && String(global.__enableLiveForWid) === cardWid); }
        catch { return false; }
    }, [cardWid]);
    const [liveEnabled, setLiveEnabled] = useState(initialLiveEnable);
    useEffect(() => {
        if (!initialLiveEnable) return;
        try { if (global.__enableLiveForWid === cardWid) global.__enableLiveForWid = null; } catch { }
    }, [initialLiveEnable, cardWid]);

    useEffect(() => {
        if (!forceSelfView) return;
        try { if (String(global.__forceWorkoutSelfViewWid) === cardWid) global.__forceWorkoutSelfViewWid = null; }
        catch { }
    }, [forceSelfView, cardWid]);

    const {
        viewing,
        viewingSelf,
        participants,
        menuVisible,
        openMenu,
        closeMenu,
        overlayPfp: viewingOverlayPfp,
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

    useEffect(() => {
        if (!forceSelfView) return;
        const my = String(meUid || "");
        if (!my) return;
        if (String(viewing?.uid || viewing) !== my) {
            setViewing(my);
            onViewingChange?.(true);
        }
    }, [forceSelfView, viewing, setViewing, meUid, onViewingChange]);

    // Effective flags/content when locked
    const viewingSelfEffective = lockFriend ? false : viewingSelf;

    useEffect(() => {
        if (!streamLive) return;
        if (!viewingSelfEffective) return;
        setLiveEnabled((prev) => (prev ? prev : true));
    }, [viewingSelfEffective, streamLive]);

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

    const workoutCreatedDisplay = useMemo(() => {
        const label = formatWorkoutTimestamp(baseWorkout?.created ?? baseWorkout?.createdAt);
        return label || null;
    }, [baseWorkout?.created, baseWorkout?.createdAt]);

    const workoutNameValue = String(workout?.name ?? '');
    const baseWorkoutName = String(baseWorkout?.name ?? '');

    const handleChangeWorkoutTitle = useCallback((text) => {
        if (!viewingSelfEffective) return;
        updateWorkout({ ...(workout || {}), name: text });
    }, [viewingSelfEffective, updateWorkout, workout]);

    const workoutTitleDisplay = useMemo(() => {
        if (viewingSelfEffective) {
            return (
                <View style={styles.titleDisplayContainer}>
                    <TextInput
                        style={[styles.titleDisplayText, styles.titleDisplayInput]}
                        value={workoutNameValue}
                        onChangeText={handleChangeWorkoutTitle}
                        placeholder="Workout name"
                        placeholderTextColor={theme.textSecondary}
                        selectionColor={theme.primary}
                        returnKeyType="done"
                        blurOnSubmit
                        multiline
                        scrollEnabled={false}
                        autoCorrect
                        autoCapitalize="words"
                    />
                    {workoutCreatedDisplay ? (
                        <Text style={styles.titleDisplaySubText}>{workoutCreatedDisplay}</Text>
                    ) : null}
                </View>
            );
        }

        const trimmedDisplay = baseWorkoutName.trim();
        if (!trimmedDisplay) return null;

        return (
            <View style={styles.titleDisplayContainer}>
                <Text style={styles.titleDisplayText} numberOfLines={2}>{trimmedDisplay}</Text>
                {workoutCreatedDisplay ? (
                    <Text style={styles.titleDisplaySubText}>{workoutCreatedDisplay}</Text>
                ) : null}
            </View>
        );
    }, [viewingSelfEffective, workoutNameValue, baseWorkoutName, handleChangeWorkoutTitle, workoutCreatedDisplay]);

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
        haptic();
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

    const collapsedOverlayActiveRef = useRef(false);
    const [collapsedOverlayActive, setCollapsedOverlayActive] = useState(false);

    const updateCollapsedOverlayActive = useCallback((active) => {
        if (collapsedOverlayActiveRef.current === active) return;
        collapsedOverlayActiveRef.current = active;
        setCollapsedOverlayActive(active);
    }, []);

    useAnimatedReaction(
        () => animatedIndex?.value ?? 1,
        (value) => {
            const shouldShow = value < 0.6;
            runOnJS(updateCollapsedOverlayActive)(shouldShow);
        },
        [animatedIndex]
    );

    const headerAnimatedStyle = useAnimatedStyle(() => {
        const value = animatedIndex?.value ?? 1;
        const progress = value < 0 ? 0 : value > 1 ? 1 : value;
        const collapsedWidth = Math.max(0, screenWidth - HANDLE_HORIZONTAL_PADDING * 2);
        const backgroundColor = progress <= SHEET_COLOR_THRESHOLD
            ? interpolateColor(progress, [0, SHEET_COLOR_THRESHOLD], [HEADER_COLLAPSED_BG, HEADER_EXPANDED_BG])
            : HEADER_EXPANDED_BG;
        return {
            maxWidth: interpolate(progress, [0, 1], [collapsedWidth, screenWidth]),
            marginTop: interpolate(progress, [0, 1], [scaleSize(-8), 0]),
            paddingHorizontal: HEADER_EXPANDED_PADDING_H,
            paddingVertical: interpolate(progress, [0, 1], [HEADER_COLLAPSED_PADDING_V, HEADER_EXPANDED_PADDING_V]),
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            backgroundColor,
            transform: [
                {
                    translateY: interpolate(progress, [0, 1], [HEADER_COLLAPSED_TRANSLATE, 0], Extrapolate.CLAMP),
                },
            ],
            shadowOpacity: 0,
            elevation: 0,
        };
    });

    const headerContentAnimatedStyle = useAnimatedStyle(() => {
        const value = animatedIndex?.value ?? 1;
        return {
            opacity: interpolate(value, [0, 0.35, 0.7, 1], [0, 0.25, 0.65, 1], Extrapolate.CLAMP),
            transform: [
                {
                    scale: interpolate(value, [0, 1], [0.94, 1], Extrapolate.CLAMP),
                },
            ],
        };
    });

    const headerCollapsedOverlayAnimatedStyle = useAnimatedStyle(() => {
        const value = animatedIndex?.value ?? 1;
        const progress = value < 0 ? 0 : value > 1 ? 1 : value;
        const backgroundColor = progress <= SHEET_COLOR_THRESHOLD
            ? interpolateColor(progress, [0, SHEET_COLOR_THRESHOLD], [HEADER_COLLAPSED_BG, HEADER_EXPANDED_BG])
            : HEADER_EXPANDED_BG;
        return {
            opacity: interpolate(value, [0, 0.35, 0.7], [1, 0.7, 0], Extrapolate.CLAMP),
            transform: [{ translateY: interpolate(value, [0, 1], [scaleSize(12), 0], Extrapolate.CLAMP) }],
            backgroundColor,
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
        };
    });

    const bodyAnimatedStyle = useAnimatedStyle(() => {
        const value = animatedIndex?.value ?? 1;
        const progress = value < 0 ? 0 : value > 1 ? 1 : value;
        const backgroundColor = progress <= SHEET_COLOR_THRESHOLD
            ? interpolateColor(progress, [0, SHEET_COLOR_THRESHOLD], [HEADER_COLLAPSED_BG, SHEET_EXPANDED_BG])
            : SHEET_EXPANDED_BG;
        return {
            opacity: interpolate(value, [0, 0.35, 0.7, 1], [0, 0.25, 0.7, 1], Extrapolate.CLAMP),
            backgroundColor,
        };
    });

    const sheetBackgroundAnimatedStyle = useAnimatedStyle(() => {
        const value = animatedIndex?.value ?? 1;
        const progress = value < 0 ? 0 : value > 1 ? 1 : value;
        const backgroundColor = progress <= SHEET_COLOR_THRESHOLD
            ? interpolateColor(progress, [0, SHEET_COLOR_THRESHOLD], [HEADER_COLLAPSED_BG, SHEET_EXPANDED_BG])
            : SHEET_EXPANDED_BG;
        return {
            backgroundColor,
        };
    });

    // Dimming logic:
    // - When Reminder Modal is visible: dim content
    // - Else, dim only while viewing someone else's workout (self view stays full opacity)
    // Track whether I'm actively part of this workout (wid match, just started, or listed in participants/members)
    const hasActiveWorkoutContext = useMemo(() => {
        const widCard = String(cardWid || "");
        if (!widCard) return false;
        const myWid = String(myActiveWid || "");
        // 1) authoritative hydration says active
        if (myWid && myWid === widCard) return true;
        // 2) local just-started path while Firestore hydrates
        if (workout && workout.__justStarted && String(workout.wid || "") === widCard) return true;
        // 3) fallback: when editing our own workout, the card wid matches the local workout wid
        if (String(workout?.wid || "") === widCard) return true;
        const my = String(meUid || "");
        if (!my) return false;
        // 4) active group membership via participants/members (e.g., spectating while still in session)
        if (Array.isArray(participants) && participants.some((p) => String(p?.uid || "") === my)) return true;
        if (Array.isArray(members) && members.some((uidVal) => String(uidVal || "") === my)) return true;
        return false;
    }, [cardWid, meUid, members, myActiveWid, participants, workout?.__justStarted, workout?.wid]);
    const isActiveSelf = viewingSelfEffective && hasActiveWorkoutContext;
    const dimDueToContext = !viewingSelfEffective;
    // Smoothly animate context dim to avoid harsh jumps when switching between spectating and self
    const contentDimAnim = useRef(new RNAnimated.Value(1)).current;
    const targetOpacity = reminderVisible ? 0.6 : (dimDueToContext ? 0.6 : 1);
    useEffect(() => {
        try {
            RNAnimated.timing(contentDimAnim, {
                toValue: targetOpacity,
                duration: 180,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start();
        } catch { }
    }, [targetOpacity, contentDimAnim]);

    const friendWaiting = streamLive && !viewingSelfEffective && waitingFriend && !(baseWorkout?.exercises?.length);

    // List data + emptiness flag (avoid inline recompute and allow conditional header/footer)
    const exercisesData = useMemo(() => (Array.isArray(baseWorkout?.exercises) ? baseWorkout.exercises : []), [baseWorkout?.exercises]);
    const isEmptyList = exercisesData.length === 0;

    const flashListEstimates = useMemo(() => {
        const fallback = {
            estimatedItemSize: ESTIMATED_EXERCISE_BASE_HEIGHT,
            estimatedListHeight: ESTIMATED_EXERCISE_BASE_HEIGHT + ESTIMATED_LIST_EXTRA_SPACE,
        };
        if (!canUseFlashList) return fallback;
        if (!exercisesData.length) return fallback;

        const totalHeight = exercisesData.reduce((sum, ex) => {
            const setCount = Array.isArray(ex?.sets) ? ex.sets.length : 0;
            return sum + ESTIMATED_EXERCISE_BASE_HEIGHT + (setCount * ESTIMATED_SET_ROW_HEIGHT);
        }, 0);
        const averageHeight = totalHeight / exercisesData.length;

        return {
            estimatedItemSize: Math.max(
                ESTIMATED_EXERCISE_BASE_HEIGHT,
                Math.min(ESTIMATED_ITEM_MAX_HEIGHT, Math.round(averageHeight))
            ),
            estimatedListHeight: Math.max(
                ESTIMATED_EXERCISE_BASE_HEIGHT,
                Math.round(totalHeight + ESTIMATED_LIST_EXTRA_SPACE)
            ),
        };
    }, [exercisesData, canUseFlashList]);

    const listPerformanceProps = useMemo(() => {
        if (canUseFlashList) {
            return {
                estimatedItemSize: flashListEstimates.estimatedItemSize,
                estimatedListSize: {
                    width: screenWidth,
                    height: flashListEstimates.estimatedListHeight,
                },
                drawDistance: scaleSize(320),
            };
        }
        return {
            initialNumToRender: 4,
            maxToRenderPerBatch: 6,
            windowSize: 9,
            removeClippedSubviews: Platform.OS === 'android',
        };
    }, [canUseFlashList, flashListEstimates.estimatedItemSize, flashListEstimates.estimatedListHeight, screenWidth]);

    const scrollHandler = useMemo(
        () => RNAnimated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
        ),
        [scrollY]
    );

    const renderExerciseItem = useCallback(({
        item: ex,
        index: exerciseIndex,
    }) => (
        <ExerciseLog
            name={ex.name}
            muscle={ex.muscle}
            exerciseIndex={exerciseIndex}
            sets={ex.sets}
            updateSets={updateSets}
            replaceExercise={replaceExercise}
            deleteExercise={deleteExercise}
            readOnly={!viewingSelfEffective}
            showOptionsTriggerIcon
            syncColumnOnEdit={viewingSelfEffective}
            onStatFocus={handleStatFocus}
        />
    ), [deleteExercise, replaceExercise, updateSets, viewingSelfEffective, handleStatFocus]);

    const renderFooter = useCallback(() => (
        <>
            {viewingSelfEffective && (
                <>
                    <RNBounceable onPress={withStrongPress(showSelectExerciseModal)} style={styles.add_exercise_btn}>
                        <Text style={styles.add_exercise_text}>Add Exercises</Text>
                    </RNBounceable>
                    <RNBounceable
                        onPress={withStrongPress(isEmptyList ? confirmCancelWorkout : openFinishConfirm)}
                        style={styles.finish_btn}
                    >
                        <Text style={styles.finish_btn_text}>Finish Workout</Text>
                    </RNBounceable>
                    <RNBounceable onPress={withStrongPress(confirmCancelWorkout)} style={styles.cancel_btn}>
                        <Text style={styles.cancel_btn_text}>Cancel Workout</Text>
                    </RNBounceable>
                </>
            )}
            <View style={{ height: scaleSize(250) + Math.max(0, keyboardHeight - scaleSize(40)) }} />
        </>
    ), [confirmCancelWorkout, isEmptyList, keyboardHeight, openFinishConfirm, showSelectExerciseModal, viewingSelfEffective]);

    // ===== PFPs (stable) =====
    const selfPfpVersion = global?.userData?.pfpVersion ?? 0;
    const selfPfpUri = usePfp(meUid, selfPfpVersion) ||
        global?.userData?.pfp ||
        global?.userData?.photoURL ||
        global?.userData?.image ||
        "";

    const friendUidForHeader = lockFriend
        ? (toUidString(forcedUid) || toUidString(viewing?.uid || ""))
        : toUidString(viewing?.uid || "");

    const friendPfpCacheRef = useRef(null);
    if (!friendPfpCacheRef.current) friendPfpCacheRef.current = new Map();
    const cachedFriendPfp = (!viewingSelfEffective && friendUidForHeader)
        ? ensureUri(friendPfpCacheRef.current.get(friendUidForHeader))
        : "";
    const friendFallbackImmediate = ensureUri(viewingOverlayPfp)
        || ensureUri(viewing?.image)
        || ensureUri(friendPfp)
        || cachedFriendPfp;
    const viewingPfpUriHook = usePfp(
        toUidString(viewing?.uid || ""),
        (viewing?.pfpVersion != null && viewing?.pfpVersion !== undefined && viewing?.pfpVersion !== 0)
            ? viewing.pfpVersion
            : (friendPfpVersion || 0),
        friendFallbackImmediate || undefined
    );
    const friendOverlayFromHook = ensureUri(viewingPfpUriHook);
    const friendOverlayFinal = friendOverlayFromHook || friendFallbackImmediate;

    // Final header avatar selection: show mine when in self view, otherwise prefer the freshest friend image.
    const headerOverlayPfp = viewingSelfEffective
        ? selfPfpUri
        : friendOverlayFinal;
    const headerPfpIdentity = viewingSelfEffective
        ? toUidString(meUid)
        : friendUidForHeader;

    useEffect(() => {
        if (viewingSelfEffective) return;
        const key = friendUidForHeader;
        if (!key) return;
        const best = ensureUri(friendOverlayFinal);
        if (!best) return;
        friendPfpCacheRef.current.set(key, best);
    }, [viewingSelfEffective, friendUidForHeader, friendOverlayFinal]);

    // Being “in an active group” = there is at least one participant other than me
    const inActiveGroup = useMemo(() => {
        const participantHasOther = Array.isArray(participants) && participants.some((p) => String(p?.uid) !== meUid);
        if (participantHasOther) return true;
        return Array.isArray(members) && members.some((uidVal) => String(uidVal) !== meUid);
    }, [participants, members, meUid]);
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
            try { ConfettiModuleRef.current = require('react-native-confetti-cannon').default; } catch { }
        }
        return ConfettiModuleRef.current;
    }, []);

    const fireConfetti = useCallback(() => {
        // Lazy-load module and try the ref API; fallback to key-mount
        loadConfettiModule();
        try {
            const api = confettiRef.current;
            if (api && typeof api.start === 'function') { api.start(); return; }
        } catch { }
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
        if (onPressBack) { try { onPressBack(); } catch { } return; }
        if (!viewingSelfEffective) {
            try { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); } catch { }
            const my = String(meUid || "");
            setViewing(my);
            onViewingChange?.(true);
        }
    }, [onPressBack, viewingSelfEffective, meUid, setViewing, onViewingChange]);

    const handleCopyTemplate = useCallback(() => {
        try { onCopyTemplate?.(baseWorkout); } catch { }
    }, [onCopyTemplate, baseWorkout]);

    const handleCollapsedPress = useCallback(() => {
        try { onExpandSheet?.(); } catch { }
    }, [onExpandSheet]);

    const handleOpenMenu = useCallback(() => {
        if (lockFriend || (!viewingSelfEffective && !hasActiveWorkoutContext)) return;
        setLiveEnabled(true);
        try { openMenu(); } catch { }
    }, [lockFriend, openMenu, viewingSelfEffective, hasActiveWorkoutContext]);

    const handleLongPressInvite = useCallback(() => {
        if (lockFriend || (!viewingSelfEffective && !hasActiveWorkoutContext)) return;
        setLiveEnabled(true);
        try { showGroupModal?.(); } catch { }
    }, [lockFriend, showGroupModal, viewingSelfEffective, hasActiveWorkoutContext]);

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

            const inviterHandle = global?.userData?.handle || "";
            const inviterName = global?.userData?.name || "";
            const inviterPfp = global?.userData?.image || global?.userData?.pfp || "";
            const inviterPfpVersion = global?.userData?.pfpVersion || 0;

            await Promise.all(
                selectedUsers.map(async (u) => {
                    const toUid = String(u?.uid || "");
                    if (!toUid || toUid === myUid) return;

                    try {
                        const inviteRef = await addDoc(collection(db, "workoutInvites"), {
                            wid,
                            fromUid: myUid,
                            fromHandle: inviterHandle,
                            fromName: inviterName,
                            fromPfp: inviterPfp,
                            fromPfpVersion: inviterPfpVersion,
                            toUid,
                            status: "pending",
                            createdAt: serverTimestamp(),
                        });

                        await sendNotification(toUid, {
                            uid: myUid,
                            handle: inviterHandle,
                            name: inviterName,
                            pfp: inviterPfp,
                            pfpVersion: inviterPfpVersion,
                            type: "workout-invite",
                            wid,
                            inviteId: inviteRef.id,
                            timestamp: Date.now(),
                            inviteStatus: "pending",
                        });
                    } catch (inviteErr) {
                        console.log("handleInviteSelected notify error", inviteErr);
                    }
                })
            );

        } catch (e) {
            console.log("handleInviteSelected error", e);
        }
    }, [db, workout?.wid, workout?.creatorUID]);

    // Expose invite handler to parent so screen-level sheet can call it
    useEffect(() => {
        registerInviteHandler?.(handleInviteSelected);
    }, [registerInviteHandler, handleInviteSelected]);

    // Show the reminder whenever a new workout starts (per wid once per mount).
    // Triggered by local flag `__justStarted` or the global one-shot `__showWorkoutReminderForWid`.
    useEffect(() => {
        try {
            if (!viewingSelfEffective) return;
            const wid = String(workout?.wid || "");
            if (!wid || reminderShownRef.current.has(wid)) return;

            const shouldFromFlag = (typeof global !== 'undefined') && (global.__showWorkoutReminderForWid === wid);
            const shouldFromLocal = !!workout?.__justStarted;
            if (shouldFromFlag || shouldFromLocal) {
                reminderShownRef.current.add(wid);
                setReminderVisible(true);
                // Clear triggers so it doesn't reshow on any subsequent small state updates
                try { if (shouldFromFlag) global.__showWorkoutReminderForWid = null; } catch { }
                if (shouldFromLocal) {
                    try { updateWorkout?.({ ...(workout || {}), __justStarted: false }); } catch { }
                }
            }
        } catch { }
    }, [viewingSelfEffective, workout?.wid, workout?.__justStarted, updateWorkout]);

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
        <Animated.View style={[styles.main_ctnr, sheetBackgroundAnimatedStyle]}>
            {/* Header */}
            <Animated.View style={[styles.headerAnimated, headerAnimatedStyle]} pointerEvents="box-none">
                <Animated.View
                    style={[styles.headerCollapsedOverlay, headerCollapsedOverlayAnimatedStyle]}
                    pointerEvents={collapsedOverlayActive ? 'auto' : 'none'}
                >
                    <Pressable
                        style={styles.collapsedHud}
                        onPress={withStrongPress(handleCollapsedPress)}
                        hitSlop={scaleSize(12)}
                    >
                        <View style={styles.collapsedHudContent}>
                            <Text style={styles.collapsedHudLabel} numberOfLines={1}>
                                Ongoing Workout
                            </Text>
                            <Text style={styles.collapsedHudSeparator}>
                                •
                            </Text>
                            <CollapsedTimerText timerRef={timerRef} />
                        </View>
                    </Pressable>
                </Animated.View>
                <Animated.View
                    style={[styles.headerContent, headerContentAnimatedStyle]}
                    pointerEvents={collapsedOverlayActive ? 'none' : 'auto'}
                >
                    <GroupHeader
                        viewingSelf={viewingSelfEffective}
                        overlayPfp={headerOverlayPfp}
                        onCheer={(friendOngoing && !hasActiveWorkoutContext) ? onCheerStable : undefined}
                        onCopyTemplate={
                            (!hasActiveWorkoutContext && !viewingSelfEffective && !friendOngoing)
                                ? handleCopyTemplate
                                : undefined
                        }
                        countdown={countdown}
                        onAddTime={hasActiveWorkoutContext ? openRestModal : undefined}
                        timerRef={timerRef}
                        headerStyle={styles.headerInner}
                        onBack={handleBack}
                        onPressPfp={(!viewingSelfEffective && !hasActiveWorkoutContext) ? onPressPfp : undefined}
                        disableGroupPress={lockFriend || (!hasActiveWorkoutContext && !viewingSelfEffective)}
                        inActiveGroup={inActiveGroupEffective}
                        pfpOnLeft={!viewingSelfEffective && !hasActiveWorkoutContext}
                        onOpenMenu={handleOpenMenu}
                        onLongPressInvite={handleLongPressInvite}
                        forceSelfHeader={hasActiveWorkoutContext}
                        pfpIdentity={headerPfpIdentity}
                    />
                </Animated.View>
            </Animated.View>
            <RNAnimated.View style={[styles.headerShadow, { opacity: borderOpacity }]} />
            {/* Body */}
            <Animated.View style={[styles.bodyContainer, bodyAnimatedStyle]} pointerEvents={collapsedOverlayActive ? 'none' : 'auto'}>
                {friendWaiting ? (
                    <View style={styles.waitingWrap}>
                        <Text style={styles.waitingText}>Loading friend…</Text>
                    </View>
                ) : (
                    viewingSelfEffective ? (
                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={styles.scrollview}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
                        >
                            {workoutTitleDisplay}
                            {exercisesData.map((ex, exerciseIndex) => (
                                <ExerciseLog
                                    key={`${ex?.name || "ex"}-${exerciseIndex}`}
                                    name={ex.name}
                                    muscle={ex.muscle}
                                    exerciseIndex={exerciseIndex}
                                    sets={ex.sets}
                                    updateSets={updateSets}
                                    replaceExercise={replaceExercise}
                                    deleteExercise={deleteExercise}
                                    readOnly={!viewingSelfEffective}
                                    showOptionsTriggerIcon
                                    syncColumnOnEdit={viewingSelfEffective}
                                    onStatFocus={handleStatFocus}
                                />
                            ))}
                            {renderFooter()}
                        </ScrollView>
                    ) : (
                        <RNAnimated.View style={[styles.listWrap, { opacity: contentDimAnim }]}>
                            <AnimatedFlashList
                                key={`wlist-${cardWid}`}
                                ref={listRef}
                                data={exercisesData}
                                keyExtractor={(ex, i) => `${ex?.name || "ex"}-${i}`}
                                renderItem={renderExerciseItem}
                                ListFooterComponent={renderFooter}
                                showsVerticalScrollIndicator={false}
                                scrollEventThrottle={16}
                                onScroll={scrollHandler}
                                keyboardShouldPersistTaps="handled"
                                keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
                                {...listPerformanceProps}
                                contentContainerStyle={styles.scrollview}
                                ListHeaderComponent={workoutTitleDisplay}
                            />
                        </RNAnimated.View>
                    )
                )}
            </Animated.View>
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
                restTotal={restTotal}
                onStart={startCountdown}
                onAdd={addCountdown}
                onReset={resetCountdown}
            />
            <ConfirmWorkoutModal
                visible={deleteConfirmModalVisible}
                variant="cancel"
                title="Cancel workout?"
                body="This clears your current progress. You can always start a new session from the hub."
                primaryLabel="Yes, cancel workout"
                secondaryLabel="Keep working"
                onPrimary={handleDeleteWorkout}
                onSecondary={() => setDeleteConfirmModalVisible(false)}
                onRequestClose={() => setDeleteConfirmModalVisible(false)}
            />
            <ConfirmWorkoutModal
                visible={finishConfirmModalVisible}
                variant="finish"
                title="Finish workout?"
                body="Double-check your sets and PRs before saving. You can always edit from the workout log later."
                primaryLabel="Finish workout"
                primaryBusyLabel="Finishing…"
                primaryBusy={isFinishing}
                secondaryLabel="Keep working"
                onPrimary={handleFinishWorkout}
                onSecondary={() => setFinishConfirmModalVisible(false)}
                onRequestClose={() => setFinishConfirmModalVisible(false)}
            />
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
            <WorkoutReminderModal
                visible={reminderVisible}
                onDismiss={() => setReminderVisible(false)}
            />
            {/* Confetti overlay (mount when cheering is relevant: spectating live OR self active) */}
            {(friendOngoing || isActiveSelf) && (() => {
                const ConfettiCannon = loadConfettiModule(); return ConfettiCannon ? (
                    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                        <ConfettiCannon
                            ref={confettiRef}
                            autoStart={false}
                            count={120}
                            origin={{ x: screenWidth / 2, y: -scaleSize(60) }}
                            fadeOut
                            explosionSpeed={220}
                            fallSpeed={1500}
                        />
                        {/* Fallback: if ref API unavailable, key-mount for immediate autoStart */}
                        {confettiTick > 0 && (
                            <ConfettiCannon
                                key={confettiTick}
                                count={120}
                                origin={{ x: screenWidth / 2, y: -scaleSize(60) }}
                                fadeOut
                                explosionSpeed={220}
                                fallSpeed={1500}
                            />
                        )}
                    </View>
                ) : null;
            })()}
        </Animated.View >
    );
};

const CollapsedTimerText = memo(({ timerRef }) => {
    const [timer, setTimer] = useState(() => timerRef?.current || "00:00");

    useEffect(() => {
        const update = () => {
            setTimer(timerRef?.current || "00:00");
        };
        update();
        const intervalId = setInterval(update, 1000);
        return () => clearInterval(intervalId);
    }, [timerRef]);

    return (
        <Text style={styles.collapsedHudTimer} numberOfLines={1}>
            {timer}
        </Text>
    );
});

const styles = StyleSheet.create({
    main_ctnr: { flex: 1 },

    // Header animation wrappers
    headerAnimated: { backgroundColor: 'transparent', position: 'relative', alignItems: 'stretch', alignSelf: 'center', width: '100%', overflow: 'hidden' },
    headerCollapsedOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        zIndex: 3,
        alignItems: 'center',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        zIndex: 2,
    },
    headerInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerShadow: { height: scaleSize(2), backgroundColor: theme.hairline },
    bodyContainer: { flex: 1, width: '100%' },
    collapsedHud: {
        // backgroundColor: 'rgba(33, 44, 68, 0.96)',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        // borderRadius: scaleSize(18),
        paddingHorizontal: scaleSize(18),
        // borderWidth: scaleSize(1),
        borderColor: CTA_PRIMARY_BORDER,
        shadowColor: CTA_SHADOW_COLOR,
        shadowOpacity: 0.12,
        shadowRadius: scaleSize(10),
        shadowOffset: { width: 0, height: scaleSize(4) },
        elevation: 6,
    },
    collapsedHudContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: scaleSize(-4)
    },
    collapsedHudLabel: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(14),
        color: theme.textPrimary,
        flexShrink: 1,
        textAlign: 'center',
    },
    collapsedHudSeparator: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(14),
        color: theme.textPrimary,
        marginHorizontal: scaleSize(12),
    },
    collapsedHudTimer: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(14),
        color: theme.textPrimary,
    },
    // Allow the BottomSheet background to show through
    scrollview: { paddingTop: scaleSize(5), backgroundColor: 'transparent' },
    titleDisplayContainer: {
        paddingHorizontal: scaleSize(24),
        marginBottom: scaleSize(12),
    },
    titleDisplayText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(17),
        color: theme.textPrimary,
    },
    titleDisplaySubText: {
        marginTop: scaleSize(2),
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(13),
        color: theme.textSecondary,
    },
    titleDisplayInput: {
        width: '100%',
        padding: 0,
        paddingVertical: 0,
        textAlignVertical: 'top',
    },
    // Ensure FlashList receives a parent with a valid size
    listWrap: { flex: 1 },

    waitingWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: 'transparent' },
    waitingText: { marginTop: scaleSize(6), fontFamily: "Nunito_700Bold", color: theme.textPrimary },

    add_exercise_btn: {
        marginHorizontal: scaleSize(20),
        marginTop: scaleSize(18),
        height: scaleSize(40),
        borderRadius: scaleSize(12),
        backgroundColor: CTA_PRIMARY_BG,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: CTA_PRIMARY_BORDER,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        shadowColor: CTA_SHADOW_COLOR,
        shadowOpacity: 0.18,
        shadowRadius: scaleSize(8),
        shadowOffset: { width: 0, height: scaleSize(3) },
        elevation: 3,
    },
    add_exercise_text: {
        fontSize: scaleSize(14),
        fontFamily: "Outfit_700Bold",
        color: theme.textPrimary,
        marginRight: scaleSize(4.5),
    },

    finish_btn: {
        marginHorizontal: scaleSize(20),
        marginTop: scaleSize(40),
        height: scaleSize(40),
        borderRadius: scaleSize(12),
        backgroundColor: CTA_FINISH_BG,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: CTA_FINISH_BORDER,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        shadowColor: CTA_SHADOW_COLOR,
        shadowOpacity: 0.2,
        shadowRadius: scaleSize(8),
        shadowOffset: { width: 0, height: scaleSize(3) },
        elevation: 3,
    },
    finish_btn_text: {
        fontSize: scaleSize(14),
        fontFamily: "Outfit_700Bold",
        color: theme.textPrimary,
        marginRight: scaleSize(4.5),
    },

    cancel_btn: {
        marginHorizontal: scaleSize(20),
        marginTop: scaleSize(14),
        height: scaleSize(40),
        borderRadius: scaleSize(12),
        backgroundColor: CTA_CANCEL_BG,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: CTA_CANCEL_BORDER,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        shadowColor: CTA_SHADOW_COLOR,
        shadowOpacity: 0.18,
        shadowRadius: scaleSize(8),
        shadowOffset: { width: 0, height: scaleSize(3) },
        elevation: 3,
    },
    cancel_btn_text: { fontSize: scaleSize(14), fontFamily: "Outfit_700Bold", color: theme.textPrimary, marginRight: scaleSize(4.5) },

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
    prev.finishWorkout === next.finishWorkout &&
    prev.onExpandSheet === next.onExpandSheet
);

export default memo(ActiveWorkoutModal, areEqualModalProps);
