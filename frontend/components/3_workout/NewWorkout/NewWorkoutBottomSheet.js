import React, { useCallback, useEffect, useMemo, useRef } from "react";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import NewWorkoutModal from './NewWorkoutModal';

const NewWorkoutBottomSheet = ({ workout, isVisible, setIsVisible, cancelNewWorkout, updateNewWorkout, finishNewWorkout, timerRef, showGroupModal }) => {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ["94%"], []);

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
            bottomSheetRef.current.expand();
        }
    }, [isVisible]);

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={-1}
            snapPoints={snapPoints}
            backdropComponent={renderBackdrop}
            enablePanDownToClose
            enableContentPanningGesture={false}
            onClose={() => {
                setIsVisible(false);
            }}
        // handleStyle={{ display: 'none' }}
        >
            {workout &&
                <NewWorkoutModal
                    timerRef={timerRef}
                    workout={workout}
                    // setWorkout={setWorkout}
                    cancelWorkout={() => {
                        cancelNewWorkout();
                        bottomSheetRef.current.close();
                    }}
                    updateWorkout={updateNewWorkout}
                    finishWorkout={() => {
                        finishNewWorkout();
                        bottomSheetRef.current.close();
                    }}
                    showGroupModal={showGroupModal}
                />
            }
        </BottomSheet>
    );
};

export default NewWorkoutBottomSheet;
