import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import NotificationsModal from "./NotificationsModal";


const NotificationsBottomSheet = ({ notificationsBottomSheetExpandFlag }) => {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ["90%"], []);

    useEffect(() => {
        console.log('dfsd');
        bottomSheetRef.current.expand();
    }, [notificationsBottomSheetExpandFlag]);

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
            >
                {global.userData && 
                    <NotificationsModal />
                }
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
        zIndex: 1
    }
});

export default NotificationsBottomSheet;
