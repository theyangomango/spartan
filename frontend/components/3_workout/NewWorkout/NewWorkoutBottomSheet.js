import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { View, ActivityIndicator } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import NewWorkoutModal from "./NewWorkoutModal";
import useWorkoutStore from "../../../state/workoutStore";
import { useNavigation } from "@react-navigation/native";

// subtle gray for self, warm gold for friend
const HANDLE_SELF = "#D0D7E2";
const HANDLE_FRIEND_ACCENT = "#E0A500";
const HANDLE_FRIEND_BACKGROUND = "#e0a4002c";

const NewWorkoutBottomSheet = ({
    workout,
    isVisible,
    setIsVisible,
    cancelNewWorkout,
    updateNewWorkout,
    finishNewWorkout,
    timerRef,
    showGroupModal,
    userWorkoutStats,
    registerInviteHandler,
}) => {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ["94%"], []);
    const [isViewingSelf, setIsViewingSelf] = useState(true);
    const [mountContent, setMountContent] = useState(false);
    const [contentKey, setContentKey] = useState(0); // force remount on each open to avoid stale internals

    const renderBackdrop = useCallback(
        (props) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.6}
            />
        ),
        []
    );

    // Guard against stale onClose firing after we already reopened
    const desiredVisibleRef = useRef(isVisible);
    useEffect(() => { desiredVisibleRef.current = isVisible; }, [isVisible]);

    // Expand helper that tolerates ref not being ready on first render
    const expandSafely = useCallback(() => {
        let tries = 0;
        const tryExpand = () => {
            const ref = bottomSheetRef.current;
            if (ref && typeof ref.expand === "function") {
                try { ref.expand(); } catch {}
            } else if (tries < 20) {
                tries += 1;
                const delay = tries < 8 ? 16 : 40;
                setTimeout(tryExpand, delay);
            }
        };
        // kick on next tick as well to catch first mount timing
        setTimeout(tryExpand, 0);
    }, []);

    useEffect(() => {
        if (isVisible) {
            // Always mount content immediately on open; fallback loader will render
            setMountContent(true);
            expandSafely();
            // Bump key so FlashList and nested state reset cleanly between sessions
            setContentKey((k) => (Number.isFinite(k) ? k + 1 : 0));
        } else {
            // Unmount on close to free listeners and memory
            setMountContent(false);
        }
    }, [isVisible, expandSafely]);

    // Also mount as soon as effectiveWorkout arrives while the sheet is visible
    useEffect(() => {
        if (isVisible && effectiveWorkout && !mountContent) setMountContent(true);
    }, [isVisible, effectiveWorkout, mountContent]);

    const workoutFromStore = useWorkoutStore((s) => s.workout);
    const effectiveWorkout = workout || workoutFromStore;
    const navigation = useNavigation();

    // Stable wrappers so NewWorkoutModal doesn't rerender due to changing function identities
    const onCancelWorkout = useCallback(() => {
        cancelNewWorkout();
        bottomSheetRef.current?.close();
    }, [cancelNewWorkout]);

    const onFinishWorkout = useCallback(() => {
        finishNewWorkout();
        bottomSheetRef.current?.close();
    }, [finishNewWorkout]);

    const onRegisterInviteHandler = useCallback((fn) => {
        if (typeof registerInviteHandler === 'function') registerInviteHandler(fn);
    }, [registerInviteHandler]);

    const onPressPfp = useCallback(() => {
        try { bottomSheetRef.current?.close(); } catch {}
        const meUid = String(global?.userData?.uid || "");
        const friendUidEff = String(effectiveWorkout?.creatorUID || effectiveWorkout?.creatorUid || meUid);
        if (!friendUidEff) return;
        const rootNav = navigation?.getParent?.('ROOT');
        if (friendUidEff === meUid) {
            if (rootNav?.navigate) rootNav.navigate('Profile', { transition: 'slide-from-right' });
            else navigation.navigate('Profile', { transition: 'slide-from-right' });
        } else {
            if (rootNav?.navigate) rootNav.navigate('ViewProfile', { user: { uid: friendUidEff } });
            else navigation.navigate('ViewProfile', { user: { uid: friendUidEff } });
        }
    }, [effectiveWorkout, navigation]);

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={isVisible ? 0 : -1}
            snapPoints={snapPoints}
            backdropComponent={renderBackdrop}
            // Ensure sheet moves with the keyboard so content stays visible
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            enablePanDownToClose
            enableContentPanningGesture={false}
            onClose={() => { if (!desiredVisibleRef.current) { try { setIsVisible(false); } catch {} } }}
            onChange={(index) => { if (index < 0 && !desiredVisibleRef.current) { try { setIsVisible(false); } catch {} } }}
            // GOLD handle when viewing a friend
            handleIndicatorStyle={{
                backgroundColor: isViewingSelf ? HANDLE_SELF : HANDLE_FRIEND_ACCENT,
            }}
            handleStyle={{
                backgroundColor: isViewingSelf ? 'transparent' : HANDLE_FRIEND_BACKGROUND,
            }}
        >
            {mountContent && (
                effectiveWorkout ? (
                    <NewWorkoutModal
                        key={`nw-${contentKey}-${String(effectiveWorkout?.wid || 'now')}`}
                        timerRef={timerRef}
                        workout={effectiveWorkout}
                        cancelWorkout={onCancelWorkout}
                        updateWorkout={updateNewWorkout}
                        finishWorkout={onFinishWorkout}
                        showGroupModal={showGroupModal}
                        userWorkoutStats={userWorkoutStats}
                        // NEW: tell us whether we're viewing self or friend
                        onViewingChange={setIsViewingSelf}
                        onPressPfp={onPressPfp}
                        registerInviteHandler={onRegisterInviteHandler}
                        // Allow on-demand live streaming (hook enables only after menu opens)
                        streamLive={true}
                    />
                ) : (
                    <View key={`nw-loading-${contentKey}`} style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator size="large" color="#60A5FA" />
                    </View>
                )
            )}
        </BottomSheet>
    );
};

// Prevent parent churn (screen-level re-renders) from bubbling unnecessarily.
// Only depend on visibility and timerRef; props used as passthrough (functions) are ignored.
const areEqual = (prev, next) => (
    prev.isVisible === next.isVisible &&
    prev.timerRef === next.timerRef
);

export default memo(NewWorkoutBottomSheet, areEqual);
