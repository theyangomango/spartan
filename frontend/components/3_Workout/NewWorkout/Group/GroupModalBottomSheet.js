// components/Tracking/Group/GroupModalBottomSheet.jsx
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { View, StyleSheet } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import GroupModal from "./GroupModal";
import theme from "../../../../theme/mfpDark";

import scaleSize from "../../../../helper/scaleSize";

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

    // Soft dimmed backdrop that closes on press
    const renderBackdrop = useCallback(
        (props) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
                pressBehavior="close"
                style={[props?.style, { backgroundColor: "rgba(2, 6, 23, 0.65)" }]}
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
                backgroundStyle={{ backgroundColor: theme.surface }}
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
