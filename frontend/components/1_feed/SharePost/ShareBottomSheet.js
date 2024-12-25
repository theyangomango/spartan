/**
 * Displays a bottom sheet for sharing content.
 */

import React, { useEffect, useMemo, useRef, memo, useCallback } from "react";
import {
    View,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Dimensions
} from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import ShareModal from "./ShareModal";
import scaleSize from "../../../helper/scaleSize"; // Import the scaleSize utility

const { width, height } = Dimensions.get("screen");

const ShareBottomSheet = ({
    shareBottomSheetCloseFlag,
    shareBottomSheetExpandFlag
}) => {
    const bottomSheetRef = useRef(null);

    // Define snap points with scaling
    const snapPoints = useMemo(() => ['92%'], []); // Adjust based on design

    // // Render a custom backdrop with adjusted opacity
    // const renderBackdrop = useCallback(
    //     (props) => (
    //         <BottomSheetBackdrop
    //             {...props}
    //             disappearsOnIndex={-1}
    //             appearsOnIndex={0}
    //             opacity={0.6}
    //         />
    //     ),
    //     []
    // );

    // Close the bottom sheet when the close flag changes
    useEffect(() => {
        if (bottomSheetRef.current) {
            bottomSheetRef.current.close();
        }
    }, [shareBottomSheetCloseFlag]);

    // Expand the bottom sheet when the expand flag changes
    useEffect(() => {
        if (bottomSheetRef.current && shareBottomSheetExpandFlag) {
            bottomSheetRef.current.expand();
        }
    }, [shareBottomSheetExpandFlag]);

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            pointerEvents="box-none"
        >
            {/* Bottom Sheet for Sharing */}
            <BottomSheet
                ref={bottomSheetRef}
                index={-1} // Initially closed
                snapPoints={snapPoints}
                // backdropComponent={renderBackdrop}
                enablePanDownToClose
                handleStyle={styles.hiddenHandle}
                backgroundStyle={styles.bottomSheetBackground}
            >
                <ShareModal closeBottomSheet={() => bottomSheetRef.current.close()} />
            </BottomSheet>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: scaleSize(85),
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 999
    },
    hiddenHandle: {
        display: "none" // Hide the default handle
    },
    bottomSheetBackground: {
        backgroundColor: "#fff",
        borderTopLeftRadius: scaleSize(25),
        borderTopRightRadius: scaleSize(25)
    }
});

export default memo(ShareBottomSheet);
