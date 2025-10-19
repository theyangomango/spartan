// components/Tracking/Group/GroupModalBottomSheet.jsx
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { View, StyleSheet } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import GroupModal from "./GroupModal";
import theme from "../../../../theme/mfpDark";

import scaleSize from "../../../../helper/scaleSize";

const SHEET_RADIUS = scaleSize(28);
const HANDLE_WIDTH = scaleSize(40);
const HANDLE_HEIGHT = scaleSize(4);

const GroupModalBottomSheet = ({ groupModalExpandFlag, closeGroupModal, onInvite }) => {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ["93%"], []);

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
                style={[props?.style, { backgroundColor: "rgba(0, 0, 0, 0.9)" }]}
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
                backgroundStyle={styles.sheetBackground}
                handleStyle={styles.handle}
                handleIndicatorStyle={styles.handleIndicator}
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
    sheetBackground: {
        backgroundColor: theme.bg,
        borderTopLeftRadius: SHEET_RADIUS,
        borderTopRightRadius: SHEET_RADIUS,
    },
    handle: {
        paddingTop: scaleSize(10),
        backgroundColor: "transparent",
        alignItems: "center",
    },
    handleIndicator: {
        width: HANDLE_WIDTH,
        height: HANDLE_HEIGHT,
        borderRadius: HANDLE_HEIGHT / 2,
        backgroundColor: "#FFFFFF",
        opacity: 0.85,
    },
});

export default GroupModalBottomSheet;
