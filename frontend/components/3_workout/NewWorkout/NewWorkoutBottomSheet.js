import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { StyleSheet } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import NewWorkoutModal from './NewWorkoutModal';

const NewWorkoutBottomSheet = ({ workout, isVisible, setIsVisible, cancelNewWorkout, updateNewWorkout, finishNewWorkout, timerRef }) => {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ["94%"], []);

    const handleSheetChanges = useCallback((index) => {
        console.log("handleSheetChanges", index);
    }, []);

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
            onChange={handleSheetChanges}
            enablePanDownToClose
            onClose={() => {
                setIsVisible(false);
            }}
            handleStyle={{ display: 'none' }}
        >
            {workout &&
                <NewWorkoutModal
                    timerRef={timerRef}
                    workout={workout}
                    cancelWorkout={() => {
                        cancelNewWorkout();
                        bottomSheetRef.current.close();
                    }}
                    updateWorkout={updateNewWorkout}
                    finishWorkout={() => {
                        finishNewWorkout();
                        bottomSheetRef.current.close();
                    }}
                />
            }
        </BottomSheet>
    );
};

export default React.memo(NewWorkoutBottomSheet);
