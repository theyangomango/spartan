import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { View, ActivityIndicator } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import theme from "../../../theme/mfpDark";
import SpectatingWorkoutModal from "./SpectatingWorkoutModal";
import useWorkoutStore from "../../../state/workoutStore";
import { useNavigation } from "@react-navigation/native";

import scaleSize from "../../../helper/scaleSize";

// Lighter handle indicator for better visibility
const HANDLE_LIGHT = "#E2E8F0"; // light slate/gray

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
}) => {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ["94%"], []);
    const [isViewingSelf, setIsViewingSelf] = useState(true);
    const [mountContent, setMountContent] = useState(true);
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

    // Timestamp of the last explicit open; helps ignore stale onClose from previous session
    const lastOpenedAtRef = useRef(0);
    const sessionIdRef = useRef(0); // increments on each open

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
            try { lastOpenedAtRef.current = Date.now(); sessionIdRef.current += 1; } catch {}
            expandSafely();
        }
    }, [isVisible, expandSafely]);

    // Only remount content when switching to a different workout (wid changes),
    // avoiding unnecessary flashes when simply reopening the same session.
    useEffect(() => {
        const wid = String(effectiveWorkout?.wid || '');
        if (!wid) return;
        setContentKey((k) => (Number.isFinite(k) ? k + 1 : 0));
    }, [effectiveWorkout?.wid]);

    // Also mount as soon as effectiveWorkout arrives while the sheet is visible
    useEffect(() => { /* content stays mounted */ }, [isVisible, effectiveWorkout]);

    // Nudge the sheet to expand immediately when becoming visible
    useEffect(() => {
        if (!isVisible) return;
        const ref = bottomSheetRef.current;
        const id = requestAnimationFrame(() => {
            try { ref?.expand?.(); } catch {}
            try { ref?.snapToIndex?.(0); } catch {}
        });
        return () => { try { cancelAnimationFrame(id); } catch {} };
    }, [isVisible, contentKey]);

    // After content mounts or key bumps, aggressively ensure the sheet is expanded.
    // Keep logic simple: controlled index handles open/close.
    useEffect(() => { /* no-op */ }, [isVisible, mountContent]);

    const workoutFromStore = useWorkoutStore((s) => s.workout);
    const effectiveWorkout = workout || workoutFromStore;
    const navigation = useNavigation();

    // Stable wrappers so SpectatingWorkoutModal doesn't rerender due to changing function identities
    const onCancelWorkout = useCallback(() => {
        cancelNewWorkout();
        try { setIsVisible(false); } catch {}
        try { bottomSheetRef.current?.close(); } catch {}
    }, [cancelNewWorkout, setIsVisible]);

    const onFinishWorkout = useCallback(() => {
        finishNewWorkout();
        try { setIsVisible(false); } catch {}
        try { bottomSheetRef.current?.close(); } catch {}
    }, [finishNewWorkout, setIsVisible]);

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
            // Allow dragging from header/content (e.g., GroupHeader) to close
            enableContentPanningGesture
            onClose={() => { try { setIsVisible(false); } catch {} }}
            onChange={(index) => { if (index < 0) { try { setIsVisible(false); } catch {} } }}
            // Handle styled to match Group Header aesthetics
            handleIndicatorStyle={{
                // lighter neutral irrespective of viewing mode
                backgroundColor: HANDLE_LIGHT,
            }}
            // Keep handle container transparent so rounded corners show
            handleStyle={{
                borderTopLeftRadius: scaleSize(22),
                borderTopRightRadius: scaleSize(22),
            }}
            // Background drives color + rounded top corners for the entire modal
            // Align the sheet background with the global app background color
            backgroundStyle={{
                backgroundColor: theme.bg,
                borderTopLeftRadius: scaleSize(22),
                borderTopRightRadius: scaleSize(22),
            }}
        >
            {mountContent && (
                effectiveWorkout ? (
                    <SpectatingWorkoutModal
                        key={`nw-${contentKey}-${String(effectiveWorkout?.wid || 'now')}`}
                        timerRef={timerRef}
                        workout={effectiveWorkout}
                        userWorkoutStats={userWorkoutStats}
                        // NEW: tell us whether we're viewing self or friend
                        onViewingChange={setIsViewingSelf}
                        onPressPfp={onPressPfp}
                        // Allow on-demand live streaming (hook enables only after menu opens)
                        streamLive={true}
                    />
                ) : (
                    // Simple placeholder while the workout object hydrates; avoids blank sheet
                    (isVisible ? (<View key={`nw-prep-${contentKey}`} style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator size="large" color={theme.primary} />
                    </View>) : null)
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
