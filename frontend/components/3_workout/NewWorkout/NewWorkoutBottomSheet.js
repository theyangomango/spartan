import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import NewWorkoutModal from "./NewWorkoutModal";
import useWorkoutStore from "../../../state/workoutStore";

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
            expandSafely();
        }
    }, [isVisible, expandSafely]);

    const workoutFromStore = useWorkoutStore((s) => s.workout);
    const effectiveWorkout = workout || workoutFromStore;

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
            onClose={() => setIsVisible(false)}
            // GOLD handle when viewing a friend
            handleIndicatorStyle={{
                backgroundColor: isViewingSelf ? HANDLE_SELF : HANDLE_FRIEND_ACCENT,
            }}
            handleStyle={{
                backgroundColor: isViewingSelf ? 'transparent' : HANDLE_FRIEND_BACKGROUND,
            }}
        >
            {effectiveWorkout && (
                <NewWorkoutModal
                    timerRef={timerRef}
                    workout={effectiveWorkout}
                    cancelWorkout={onCancelWorkout}
                    updateWorkout={updateNewWorkout}
                    finishWorkout={onFinishWorkout}
                    showGroupModal={showGroupModal}
                    userWorkoutStats={userWorkoutStats}
                    // NEW: tell us whether we're viewing self or friend
                    onViewingChange={setIsViewingSelf}
                    registerInviteHandler={onRegisterInviteHandler}
                />
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
