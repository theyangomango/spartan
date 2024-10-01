import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";

const ViewWorkoutBottomSheet = ({ viewWorkoutBottomSheetExpandFlag }) => {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ["94%"], []);

    useEffect(() => {
        bottomSheetRef.current.expand();
    }, [viewWorkoutBottomSheetExpandFlag]);

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

    return (
        <View style={styles.outer_ctnr} pointerEvents="box-none">
            <BottomSheet
                ref={bottomSheetRef}
                index={-1}
                snapPoints={snapPoints}
                backdropComponent={renderBackdrop}
                enablePanDownToClose
                handleStyle={{ display: 'none' }}
            >
            </BottomSheet>
        </View>
    );
};

const styles = StyleSheet.create({
    outer_ctnr: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 999
    }
});

export default memo(ViewWorkoutBottomSheet);
