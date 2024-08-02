import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { View, StyleSheet } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import GroupModal from "./GroupModal";

const GroupModalBottomSheet = ({ groupModalExpandFlag, closeGroupModal }) => {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ["80%"], []);

    useEffect(() => {
        if (groupModalExpandFlag) {
            bottomSheetRef.current.expand();
        } else {
            bottomSheetRef.current.close();
        }
    }, [groupModalExpandFlag]);

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

    return (
        <View style={styles.outerContainer} pointerEvents="box-none">
            <BottomSheet
                ref={bottomSheetRef}
                index={-1}
                snapPoints={snapPoints}
                backdropComponent={renderBackdrop}
                handleStyle={{ display: 'none' }}
                enablePanDownToClose
            >
                <GroupModal closeGroupModal={closeGroupModal} />
            </BottomSheet>
        </View>
    );
};

const styles = StyleSheet.create({
    outerContainer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1
    }
});

export default GroupModalBottomSheet;
