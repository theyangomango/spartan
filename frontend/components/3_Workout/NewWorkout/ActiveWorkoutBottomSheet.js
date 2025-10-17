import React, { useCallback, useEffect, useRef, useState, useMemo, memo } from "react";
import { StyleSheet, Dimensions } from "react-native";
import BottomSheet from "@gorhom/bottom-sheet";
import Animated, {
    useAnimatedStyle,
    interpolate,
    interpolateColor,
    Extrapolate,
    useSharedValue,
    useDerivedValue,
} from "react-native-reanimated";
import theme from "../../../theme/mfpDark";
import ActiveWorkoutModal from "./ActiveWorkoutModal";
import useWorkoutStore, { WORKOUT_SHEET_STATES } from "../../../state/workoutStore";
import scaleSize from "../../../helper/scaleSize";
import { navigationRef } from "../../../../navigationRef";
import { shallow } from 'zustand/shallow';

const FOOTER_HEIGHT = scaleSize(87);
const COLLAPSED_PEEK = FOOTER_HEIGHT + scaleSize(48);
const COLLAPSED_SNAP = COLLAPSED_PEEK;
const noop = () => { };
const SHEET_RADIUS = scaleSize(22);
const HANDLE_BG_COLLAPSED = 'rgba(45, 157, 255, 0.76)';
const HANDLE_BG_EXPANDED = 'rgba(45, 158, 255, 0)';
const HANDLE_BAR_COLOR_COLLAPSED = 'rgba(23, 62, 120, 0.95)';
const HANDLE_BAR_COLOR_EXPANDED = 'rgba(226, 232, 240, 0.7)';
const COLLAPSE_COLOR_THRESHOLD = 0.15;

const SCREEN_HEIGHT = Dimensions.get("window").height || 0;
const FOCUS_HIDE_DISTANCE = SCREEN_HEIGHT > 0 ? SCREEN_HEIGHT : (COLLAPSED_PEEK + scaleSize(320));

const ActiveWorkoutBottomSheet = ({ hideForFocus = false, overlayProgressSV, visibilityProgressSV, isActive = true, collapseProgressSV = null }) => {
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
    } = useWorkoutStore(
        useCallback((state) => ({
            workout: state.workout,
            sheetState: state.sheetState,
            setSheetState: state.setSheetState,
            sheetHandlers: state.sheetHandlers,
            setSheetSharedAnimatedIndex: state.setSheetSharedAnimatedIndex,
        }), []),
        shallow
    );

    const hasWorkout = !!workout;
    const isExpanded = sheetState === WORKOUT_SHEET_STATES.EXPANDED;
    const isCollapsed = sheetState === WORKOUT_SHEET_STATES.COLLAPSED;
    const isVisible = hasWorkout && (isExpanded || isCollapsed);

    const sharedAnimatedIndex = useSharedValue(isExpanded ? 1 : 0);
    const sheetProgress = useDerivedValue(() => {
        const value = sharedAnimatedIndex.value;
        if (value <= 0) return 0;
        if (value >= 1) return 1;
        return value;
    }, [sharedAnimatedIndex]);

    useDerivedValue(() => {
        if (!collapseProgressSV) {
            return;
        }
        const progress = sheetProgress.value;
        const clamped = progress < 0 ? 0 : progress > 1 ? 1 : progress;
        collapseProgressSV.value = hasWorkout ? clamped : 0;
    }, [collapseProgressSV, hasWorkout]);

    useEffect(() => {
        return () => {
            if (collapseProgressSV) {
                collapseProgressSV.value = 0;
            }
        };
    }, [collapseProgressSV]);

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
        const overlayProgress = overlayProgressSV?.value ?? (hideForFocus ? 0 : 1);
        const visibility = visibilityProgressSV?.value ?? (isActive ? 1 : 0);
        const combinedRaw = overlayProgress * visibility;
        const combined = combinedRaw < 0 ? 0 : combinedRaw > 1 ? 1 : combinedRaw;
        const translateY = FOCUS_HIDE_DISTANCE * (1 - combined);
        return {
            opacity: combined,
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
    const pointerEvents = (hideForFocus || !isActive) ? 'none' : 'box-none';
    const gesturesEnabled = isActive && !hideForFocus;

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
                enableContentPanningGesture={gesturesEnabled}
                enableHandlePanningGesture={gesturesEnabled}
                suppressStickyElements={false}
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
                    borderTopLeftRadius: SHEET_RADIUS,
                    borderTopRightRadius: SHEET_RADIUS,
                }}
                backgroundComponent={(props) => (
                    <SheetBackground
                        {...props}
                    />
                )}
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

const SheetBackground = ({ animatedIndex, style }) => {
    const animatedStyle = useAnimatedStyle(() => {
        const progress = animatedIndex.value < 0 ? 0 : animatedIndex.value > 1 ? 1 : animatedIndex.value;
        const backgroundColor = progress <= COLLAPSE_COLOR_THRESHOLD
            ? interpolateColor(progress, [0, COLLAPSE_COLOR_THRESHOLD], [HANDLE_BG_COLLAPSED, theme.bg])
            : theme.bg;

        return {
            backgroundColor,
            borderTopLeftRadius: SHEET_RADIUS,
            borderTopRightRadius: SHEET_RADIUS,
        };
    });

    return (
        <Animated.View
            pointerEvents="none"
            style={[style, styles.sheetBackground, animatedStyle]}
        />
    );
};

export default memo(ActiveWorkoutBottomSheet, (prev, next) => (
    prev.hideForFocus === next.hideForFocus &&
    prev.overlayProgressSV === next.overlayProgressSV &&
    prev.visibilityProgressSV === next.visibilityProgressSV &&
    prev.isActive === next.isActive
));

const AnimatedIndexBridge = ({ animatedIndex, sharedIndex }) => {
    useDerivedValue(() => {
        sharedIndex.value = animatedIndex.value;
    });

    const wrapperStyle = useAnimatedStyle(() => {
        const rawProgress = sharedIndex.value ?? 0;
        const clampedProgress = rawProgress < 0 ? 0 : rawProgress > 1 ? 1 : rawProgress;
        const backgroundColor = clampedProgress <= COLLAPSE_COLOR_THRESHOLD
            ? interpolateColor(clampedProgress, [0, COLLAPSE_COLOR_THRESHOLD], [HANDLE_BG_COLLAPSED, HANDLE_BG_EXPANDED])
            : HANDLE_BG_EXPANDED;

        return {
            backgroundColor,
        };
    }, [sharedIndex]);

    const handleBarStyle = useAnimatedStyle(() => {
        const rawProgress = sharedIndex.value ?? 0;
        const clampedProgress = rawProgress < 0 ? 0 : rawProgress > 1 ? 1 : rawProgress;
        return {
            backgroundColor: interpolateColor(
                clampedProgress,
                [0, 1],
                [HANDLE_BAR_COLOR_COLLAPSED, HANDLE_BAR_COLOR_EXPANDED],
            ),
        };
    }, [sharedIndex]);

    return (
        <Animated.View style={[styles.handleWrapper, wrapperStyle]} pointerEvents="none">
            <Animated.View style={[styles.handleBar, handleBarStyle]} />
        </Animated.View>
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
    sheetBackground: {
        borderTopLeftRadius: SHEET_RADIUS,
        borderTopRightRadius: SHEET_RADIUS,
    },
    handleWrapper: {
        width: '100%',
        alignItems: 'center',
        paddingTop: scaleSize(10),
        paddingBottom: scaleSize(6),
        borderTopLeftRadius: SHEET_RADIUS,
        borderTopRightRadius: SHEET_RADIUS,
        overflow: 'hidden',
    },
    handleBar: {
        width: scaleSize(40),
        height: scaleSize(4),
        borderRadius: scaleSize(2),
    },
});
