import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import BottomSheet from "@gorhom/bottom-sheet";
import Animated, { useAnimatedStyle, interpolate, Extrapolate, useSharedValue, useDerivedValue } from "react-native-reanimated";
import theme from "../../../theme/mfpDark";
import ActiveWorkoutModal from "./ActiveWorkoutModal";
import useWorkoutStore, { WORKOUT_SHEET_STATES } from "../../../state/workoutStore";
import scaleSize from "../../../helper/scaleSize";
import { navigationRef } from "../../../../navigationRef";

const FOOTER_TRANSLATE_HEIGHT = scaleSize(87);
const COLLAPSED_TRANSLATE = Math.max(0, FOOTER_TRANSLATE_HEIGHT - scaleSize(10));
const HANDLE_LIGHT = "#E2E8F0";
const COLLAPSED_CARD_HEIGHT = scaleSize(72);
const HANDLE_HORIZONTAL_PADDING = scaleSize(18);
const COLLAPSED_SNAP = COLLAPSED_CARD_HEIGHT + HANDLE_HORIZONTAL_PADDING;
const noop = () => {};

const ActiveWorkoutBottomSheet = () => {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => [COLLAPSED_SNAP, "94%"], []);
    const [contentKey, setContentKey] = useState(0);
    const [isViewingSelf, setIsViewingSelf] = useState(true);

    const {
        workout,
        sheetState,
        setSheetState,
        sheetHandlers,
    } = useWorkoutStore((state) => ({
        workout: state.workout,
        sheetState: state.sheetState,
        setSheetState: state.setSheetState,
        sheetHandlers: state.sheetHandlers,
    }));

    const timerString = useWorkoutStore((state) => state.timer);

    const hasWorkout = !!workout;
    const isExpanded = sheetState === WORKOUT_SHEET_STATES.EXPANDED;
    const isCollapsed = sheetState === WORKOUT_SHEET_STATES.COLLAPSED;
    const isVisible = hasWorkout && (isExpanded || isCollapsed);

    const sharedAnimatedIndex = useSharedValue(isExpanded ? 1 : 0);

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
        const translateY = interpolate(
            sharedAnimatedIndex.value,
            [0, 1],
            [COLLAPSED_TRANSLATE, 0],
            Extrapolate.CLAMP,
        );
        const z = interpolate(sharedAnimatedIndex.value, [0, 1], [0, 200], Extrapolate.CLAMP);
        return {
            transform: [{ translateY }],
            zIndex: z,
            elevation: z,
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

    return (
        <Animated.View style={[styles.sheetWrapper, containerAnimatedStyle]} pointerEvents="box-none">
        <BottomSheet
            ref={bottomSheetRef}
            index={isExpanded ? 1 : (isCollapsed ? 0 : -1)}
            snapPoints={snapPoints}
            backdropComponent={renderBackdrop}
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            enablePanDownToClose={false}
            enableContentPanningGesture
            style={sheetStyle}
            onClose={() => {
                if (allowCloseRef.current) {
                    allowCloseRef.current = false;
                    setSheetState(WORKOUT_SHEET_STATES.HIDDEN);
                    setIsVisible(false);
                    return;
                }
                // Prevent user-driven close; snap back to collapsed
                try { bottomSheetRef.current?.snapToIndex?.(0); } catch {}
                setSheetState(WORKOUT_SHEET_STATES.COLLAPSED);
                setIsVisible(true);
            }}
            onChange={(index) => {
                if (index < 0) {
                    if (allowCloseRef.current) {
                        allowCloseRef.current = false;
                        return;
                    }
                    try { bottomSheetRef.current?.snapToIndex?.(0); } catch {}
                    setSheetState(WORKOUT_SHEET_STATES.COLLAPSED);
                } else if (index === 0) {
                    setSheetState(WORKOUT_SHEET_STATES.COLLAPSED);
                } else {
                    setSheetState(WORKOUT_SHEET_STATES.EXPANDED);
                }
            }}
            handleComponent={(props) => (
                <CollapsedHandle
                    {...props}
                    onExpand={handleExpand}
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
            bottomInset={0}
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
            />
        </BottomSheet>
        </Animated.View>
    );
};

const CollapsedHandle = memo(({ animatedIndex, sharedIndex, onExpand }) => {
    useDerivedValue(() => {
        if (sharedIndex) sharedIndex.value = animatedIndex.value;
    });

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(animatedIndex.value, [0, 0.15, 1], [1, 1, 0], Extrapolate.CLAMP),
        transform: [
            {
                translateY: interpolate(animatedIndex.value, [0, 1], [0, -scaleSize(6)], Extrapolate.CLAMP),
            },
        ],
    }));

    return (
        <View style={styles.handleWrapper} pointerEvents="box-none">
            <Animated.View style={[styles.handleBarContainer, animatedStyle]} pointerEvents="auto">
                <Pressable onPress={onExpand} hitSlop={12}>
                    <View style={styles.handleBar} />
                </Pressable>
            </Animated.View>
        </View>
    );
});

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

export default memo(ActiveWorkoutBottomSheet);

const styles = StyleSheet.create({
    sheetWrapper: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
    },
    handleWrapper: {
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: HANDLE_HORIZONTAL_PADDING,
        paddingTop: scaleSize(10),
    },
    handleBarContainer: {
        width: '100%',
        alignItems: 'center',
        paddingBottom: scaleSize(6),
    },
    handleBar: {
        width: scaleSize(48),
        height: scaleSize(5),
        borderRadius: scaleSize(3),
        backgroundColor: HANDLE_LIGHT,
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
});
