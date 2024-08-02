import NewWorkoutModal from './NewWorkoutModal';
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";

const NewWorkoutBottomSheet = ({ workout, isVisible, setIsVisible, cancelNewWorkout, updateNewWorkout, finishNewWorkout, timer }) => {
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
                // enableTouchThrough
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
        >
            {workout &&
                <NewWorkoutModal
                    timer={timer}
                    workout={workout}
                    cancelWorkout={() => {
                        cancelNewWorkout();
                        bottomSheetRef.current.close();
                    }}
                    updateWorkout={(newWorkout) => {
                        updateNewWorkout(newWorkout);
                    }}
                    finishWorkout={() => {
                        finishNewWorkout();
                        bottomSheetRef.current.close();
                    }}
                />
            }
        </BottomSheet>
        // </View>
    );
};

export default NewWorkoutBottomSheet;