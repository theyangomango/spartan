// components/Tracking/Group/GroupModalBottomSheet.jsx
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { View, StyleSheet } from "react-native";
import BottomSheet from "@gorhom/bottom-sheet";
import GroupModal from "./GroupModal";

const GroupModalBottomSheet = ({ groupModalExpandFlag, closeGroupModal, onInvite }) => {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ["85%"], []);

    useEffect(() => {
        if (groupModalExpandFlag) {
            bottomSheetRef.current?.expand();
        } else {
            bottomSheetRef.current?.close();
        }
    }, [groupModalExpandFlag]);

    // No backdrop (per your request earlier)
    const renderBackdrop = useCallback(() => null, []);

    return (
        <View style={styles.outerContainer} pointerEvents="box-none">
            <BottomSheet
                ref={bottomSheetRef}
                index={-1}
                snapPoints={snapPoints}
                backdropComponent={renderBackdrop}
                handleStyle={{ display: "none" }}
                enablePanDownToClose
                onClose={closeGroupModal}
            >
                <GroupModal closeGroupModal={closeGroupModal} onInvite={onInvite} />
            </BottomSheet>
        </View>
    );
};

const styles = StyleSheet.create({
    outerContainer: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 20,
    },
});

export default GroupModalBottomSheet;
