import React, { useCallback, useEffect, useRef, useState, useMemo, memo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import BottomSheet from "@gorhom/bottom-sheet";
import Animated, {
    useAnimatedStyle,
    interpolate,
    Extrapolate,
    useSharedValue,
    useDerivedValue,
    withTiming,
} from "react-native-reanimated";
import theme from "../../../theme/mfpDark";
import ActiveWorkoutModal from "./ActiveWorkoutModal";
import useWorkoutStore, { WORKOUT_SHEET_STATES } from "../../../state/workoutStore";
import scaleSize from "../../../helper/scaleSize";
import { navigationRef } from "../../../../navigationRef";

const FOOTER_HEIGHT = scaleSize(87);
const COLLAPSED_PEEK = FOOTER_HEIGHT + scaleSize(48);
const COLLAPSED_SNAP = COLLAPSED_PEEK;
const noop = () => { };

const SCREEN_HEIGHT = Dimensions.get("window").height || 0;
const FOCUS_HIDE_DISTANCE = SCREEN_HEIGHT > 0 ? SCREEN_HEIGHT : (COLLAPSED_PEEK + scaleSize(320));

const ActiveWorkoutBottomSheet = ({ hideForFocus = false, overlayProgressSV }) => {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => [COLLAPSED_SNAP, "94%"], []);
    const [contentKey, setContentKey] = useState(0);
    const [, setIsViewingSelf] = useState(true);

    const {
        workout,
        sheetState,
        setSheetState,
        sheetHandlers,
        setSheetSharedAnimatedIndex,
    } = useWorkoutStore((state) => ({
        workout: state.workout,
        sheetState: state.sheetState,
        setSheetState: state.setSheetState,
        sheetHandlers: state.sheetHandlers,
        setSheetSharedAnimatedIndex: state.setSheetSharedAnimatedIndex,
    }));

    const hasWorkout = !!workout;
    const isExpanded = sheetState === WORKOUT_SHEET_STATES.EXPANDED;
    const isCollapsed = sheetState === WORKOUT_SHEET_STATES.COLLAPSED;
    const isVisible = hasWorkout && (isExpanded || isCollapsed);

    const sharedAnimatedIndex = useSharedValue(isExpanded ? 1 : 0);
    const focusVisibility = useSharedValue(hideForFocus ? 0 : 1);
    const sheetProgress = useDerivedValue(() => {
        const value = sharedAnimatedIndex.value;
        if (value <= 0) return 0;
        if (value >= 1) return 1;
        return value;
    }, [sharedAnimatedIndex]);

    useEffect(() => {
        if (!hasWorkout) {
            focusVisibility.value = 1;
        }
    }, [hasWorkout, focusVisibility]);

    useEffect(() => {
        if (!setSheetSharedAnimatedIndex) return;
        if (!hasWorkout) {
            setSheetSharedAnimatedIndex(null);
            return;
        }
        setSheetSharedAnimatedIndex(sheetProgress);
        return () => setSheetSharedAnimatedIndex(null);
    }, [hasWorkout, setSheetSharedAnimatedIndex, sheetProgress]);

    const cancelWorkout = sheetHandlers?.cancelWorkout || noop;
    const updateWorkout = sheetHandlers?.updateWorkout || noop;
    const finishWorkout = sheetHandlers?.finishWorkout || noop;
    const showGroupModal = sheetHandlers?.showGroupModal || noop;
    const registerInviteHandler = sheetHandlers?.registerInviteHandler || noop;
    const setIsVisible = sheetHandlers?.setIsVisible || noop;
    const getUserWorkoutStats = sheetHandlers?.getUserWorkoutStats || (() => ({}));
    const timerRefFallback = useRef("");
    const timerRef = sheetHandlers?.timerRef || timerRefFallback;
    const allowCloseRef = useRef(false);

    const renderBackdrop = useCallback((props) => <SheetBackdrop {...props} />, []);

    const containerAnimatedStyle = useAnimatedStyle(() => {
        const progress = sheetProgress.value;
        const clamped = progress < 0 ? 0 : progress > 1 ? 1 : progress;
        const z = interpolate(clamped, [0, 0.6, 1], [120, 180, 240], Extrapolate.CLAMP);
        return {
            zIndex: z,
            elevation: z,
        };
    });

    const focusAnimatedStyle = useAnimatedStyle(() => {
        const overlayProgress = overlayProgressSV?.value ?? 1;
        const focus = focusVisibility.value * overlayProgress;
        const translateY = FOCUS_HIDE_DISTANCE * (1 - focus);
        return {
            opacity: focus,
            transform: [{ translateY }],
        };
    });

    const syncToSheetState = useCallback((state) => {
        const ref = bottomSheetRef.current;
        if (!ref) return;
        if (state === WORKOUT_SHEET_STATES.EXPANDED) {
            try { ref.expand?.(); } catch { }
            try { ref.snapToIndex?.(1); } catch { }
        } else if (state === WORKOUT_SHEET_STATES.COLLAPSED) {
            try { ref.snapToIndex?.(0); } catch { }
        } else if (state === WORKOUT_SHEET_STATES.HIDDEN) {
            try { ref.close?.(); } catch { }
        }
    }, []);

    useEffect(() => {
        sharedAnimatedIndex.value = isExpanded ? 1 : 0;
    }, [isExpanded, sharedAnimatedIndex]);

    useEffect(() => {
        if (!isVisible) {
            return;
        }
        syncToSheetState(sheetState);
    }, [isVisible, sheetState, syncToSheetState]);

    useEffect(() => {
        if (sheetState === WORKOUT_SHEET_STATES.HIDDEN) {
            allowCloseRef.current = true;
            syncToSheetState(WORKOUT_SHEET_STATES.HIDDEN);
        }
    }, [sheetState, syncToSheetState]);

    useEffect(() => {
        const wid = String(workout?.wid || "");
        if (!wid) return;
        setContentKey((k) => (Number.isFinite(k) ? k + 1 : 0));
    }, [workout?.wid]);

    const onCancelWorkout = useCallback(() => {
        allowCloseRef.current = true;
        cancelWorkout();
        setIsVisible(false);
        setSheetState(WORKOUT_SHEET_STATES.HIDDEN);
        syncToSheetState(WORKOUT_SHEET_STATES.HIDDEN);
    }, [cancelWorkout, setIsVisible, setSheetState, syncToSheetState]);

    const onFinishWorkout = useCallback(() => {
        allowCloseRef.current = true;
        finishWorkout();
        setIsVisible(false);
        setSheetState(WORKOUT_SHEET_STATES.HIDDEN);
        syncToSheetState(WORKOUT_SHEET_STATES.HIDDEN);
    }, [finishWorkout, setIsVisible, setSheetState, syncToSheetState]);

    const onRegisterInviteHandler = useCallback((fn) => {
        if (typeof registerInviteHandler === "function") registerInviteHandler(fn);
    }, [registerInviteHandler]);

    const onPressPfp = useCallback(() => {
        const meUid = String(global?.userData?.uid || "");
        const friendUidEff = String(workout?.creatorUID || workout?.creatorUid || meUid);
        if (!friendUidEff) return;
        const nav = navigationRef?.current;
        if (!nav?.navigate) return;
        const rootNav = nav.getParent?.("ROOT") || nav;
        if (friendUidEff === meUid) {
            rootNav?.navigate?.("Profile", { transition: "slide-from-right" });
        } else {
            rootNav?.navigate?.("ViewProfile", { user: { uid: friendUidEff } });
        }
    }, [workout]);

    const handleExpand = useCallback(() => {
        setSheetState(WORKOUT_SHEET_STATES.EXPANDED);
        syncToSheetState(WORKOUT_SHEET_STATES.EXPANDED);
    }, [setSheetState, syncToSheetState]);

    const userWorkoutStats = getUserWorkoutStats() || {};

    if (!hasWorkout) {
        return null;
    }

    const sheetStyle = isExpanded ? styles.sheetExpanded : styles.sheetCollapsed;
    const pointerEvents = hideForFocus ? 'none' : 'box-none';

    return (
        <Animated.View style={[styles.sheetWrapper, containerAnimatedStyle, focusAnimatedStyle]} pointerEvents={pointerEvents}>
            <BottomSheet
                ref={bottomSheetRef}
                index={isExpanded ? 1 : (isCollapsed ? 0 : -1)}
                snapPoints={snapPoints}
                backdropComponent={renderBackdrop}
                keyboardBehavior="interactive"
                keyboardBlurBehavior="restore"
                enablePanDownToClose={false}
                enableContentPanningGesture
                style={[sheetStyle, styles.sheetOffset]}
                onClose={() => {
                    if (allowCloseRef.current) {
                        allowCloseRef.current = false;
                        setSheetState(WORKOUT_SHEET_STATES.HIDDEN);
                        setIsVisible(false);
                        return;
                    }
                    // Prevent user-driven close; snap back to collapsed
                    try { bottomSheetRef.current?.snapToIndex?.(0); } catch { }
                    setSheetState(WORKOUT_SHEET_STATES.COLLAPSED);
                    setIsVisible(true);
                }}
                onChange={(index) => {
                    if (index < 0) {
                        if (allowCloseRef.current) {
                            allowCloseRef.current = false;
                            return;
                        }
                        try { bottomSheetRef.current?.snapToIndex?.(0); } catch { }
                        setSheetState(WORKOUT_SHEET_STATES.COLLAPSED);
                    } else if (index === 0) {
                        setSheetState(WORKOUT_SHEET_STATES.COLLAPSED);
                    } else {
                        setSheetState(WORKOUT_SHEET_STATES.EXPANDED);
                    }
                }}
                handleComponent={(props) => (
                    <AnimatedIndexBridge
                        {...props}
                        sharedIndex={sharedAnimatedIndex}
                    />
                )}
                handleStyle={{
                    borderTopLeftRadius: scaleSize(22),
                    borderTopRightRadius: scaleSize(22),
                }}
                backgroundStyle={{
                    backgroundColor: theme.surface,
                    borderTopLeftRadius: scaleSize(22),
                    borderTopRightRadius: scaleSize(22),
                }}
            >
                <ActiveWorkoutModal
                    key={`nw-${contentKey}-${String(workout?.wid || "now")}`}
                    timerRef={timerRef}
                    workout={workout}
                    cancelWorkout={onCancelWorkout}
                    updateWorkout={updateWorkout}
                    finishWorkout={onFinishWorkout}
                    showGroupModal={showGroupModal}
                    userWorkoutStats={userWorkoutStats}
                    onViewingChange={setIsViewingSelf}
                    onPressPfp={onPressPfp}
                    registerInviteHandler={onRegisterInviteHandler}
                    streamLive={true}
                    animatedIndex={sharedAnimatedIndex}
                    onExpandSheet={handleExpand}
                />
            </BottomSheet>
        </Animated.View>
    );
};


const SheetBackdrop = ({ animatedIndex, style }) => {
    const animatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(animatedIndex.value, [0, 0.4, 1], [0, 0.6, 0.6], Extrapolate.CLAMP),
    }));

    const pointerEvents = animatedIndex.value > 0.05 ? 'auto' : 'none';

    return (
        <Animated.View
            pointerEvents={pointerEvents}
            style={[style, styles.backdrop, animatedStyle]}
        />
    );
};

export default memo(ActiveWorkoutBottomSheet, (prev, next) => (
    prev.hideForFocus === next.hideForFocus &&
    prev.overlayProgressSV === next.overlayProgressSV
));

const AnimatedIndexBridge = ({ animatedIndex, sharedIndex }) => {
    useDerivedValue(() => {
        sharedIndex.value = animatedIndex.value;
    });
    return (
        <View style={styles.handleWrapper} pointerEvents="none">
            <View style={styles.handleBar} />
        </View>
    );
};

const styles = StyleSheet.create({
    sheetWrapper: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
    },
    backdrop: {
        backgroundColor: '#000',
    },
    sheetExpanded: {
        zIndex: 200,
        elevation: 200,
    },
    sheetCollapsed: {
        zIndex: 20,
        elevation: 20,
    },
    sheetOffset: {
        // marginBottom: -FOOTER_HEIGHT,
    },
    handleWrapper: {
        width: '100%',
        alignItems: 'center',
        paddingTop: scaleSize(10),
    },
    handleBar: {
        width: scaleSize(40),
        height: scaleSize(4),
        borderRadius: scaleSize(2),
        backgroundColor: 'rgba(226, 232, 240, 0.7)',
    },
});
