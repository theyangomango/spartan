import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

    useEffect(() => {
        if (isVisible) {
            bottomSheetRef.current?.expand();
        }
    }, [isVisible]);

    const workoutFromStore = useWorkoutStore((s) => s.workout);
    const effectiveWorkout = workout || workoutFromStore;

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={-1}
            snapPoints={snapPoints}
            backdropComponent={renderBackdrop}
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
                    cancelWorkout={() => {
                        cancelNewWorkout();
                        bottomSheetRef.current?.close();
                    }}
                    updateWorkout={updateNewWorkout}
                    finishWorkout={() => {
                        finishNewWorkout();
                        bottomSheetRef.current?.close();
                    }}
                    showGroupModal={showGroupModal}
                    userWorkoutStats={userWorkoutStats}
                    // NEW: tell us whether we're viewing self or friend
                    onViewingChange={setIsViewingSelf}
                    registerInviteHandler={registerInviteHandler}
                />
            )}
        </BottomSheet>
    );
};

export default NewWorkoutBottomSheet;
