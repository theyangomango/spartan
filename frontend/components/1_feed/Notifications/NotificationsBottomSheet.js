/**
 * Displays a bottom sheet containing user notifications.
 * Resets new notification counts upon closing.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { View, StyleSheet } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import NotificationsModal from "./NotificationsModal";
import updateDoc from "../../../../backend/helper/firebase/updateDoc";
import scaleSize from "../../../helper/scaleSize";

const NotificationsBottomSheet = ({ notificationsBottomSheetExpandFlag }) => {
    const bottomSheetRef = useRef(null);

    // Define snap points for the bottom sheet
    const snapPoints = useMemo(() => [scaleSize(800)], []); 

    // Expand the bottom sheet when the expand flag changes
    useEffect(() => {
        if (bottomSheetRef.current) {
            bottomSheetRef.current.expand();
        }
    }, [notificationsBottomSheetExpandFlag]);

    // Custom backdrop component with adjusted opacity
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

    // Reset new notification counts when the bottom sheet is closed
    const resetNewNotifications = () => {
        updateDoc('users', global.userData.uid, {
            notificationNewLikes: 0,
            notificationNewComments: 0,
            notificationNewEvents: 0,
        });
    };

    return (
        <View style={styles.outerContainer} pointerEvents="box-none">
            <BottomSheet
                ref={bottomSheetRef}
                index={-1} // Initially closed
                snapPoints={snapPoints}
                backdropComponent={renderBackdrop}
                enablePanDownToClose
                handleStyle={styles.hiddenHandle}
                backgroundStyle={styles.bottomSheetBackground}
                onClose={resetNewNotifications}
            >
                {global.userData && (
                    <NotificationsModal
                        closeBottomSheet={() => bottomSheetRef.current.close()}
                    />
                )}
            </BottomSheet>
        </View>
    );
};

// Styles with scaled dimensions
const styles = StyleSheet.create({
    outerContainer: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1,
    },
    hiddenHandle: {
        display: "none", // Hide the default handle
    },
    bottomSheetBackground: {
        borderTopLeftRadius: scaleSize(25),
        borderTopRightRadius: scaleSize(25),
    },
});

export default memo(NotificationsBottomSheet);
