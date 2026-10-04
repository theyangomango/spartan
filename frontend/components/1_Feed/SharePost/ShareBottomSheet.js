/**
 * Displays a bottom sheet for sharing content.
 */

import React, { useEffect, useMemo, useRef, memo } from "react";
import {
    StyleSheet,
    KeyboardAvoidingView,
    Platform
} from "react-native";
import BottomSheet from "@gorhom/bottom-sheet";
import ShareModal from "./ShareModal";
import scaleSize from "../../../helper/scaleSize";
import theme from "../../../theme/mfpDark";

const ShareBottomSheet = ({
    shareBottomSheetCloseFlag,
    shareBottomSheetExpandFlag,
    onDismiss,
}) => {
    const bottomSheetRef = useRef(null);

    // Define snap points with scaling
    const snapPoints = useMemo(() => ['92%'], []); // Adjust based on design

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
                enablePanDownToClose
                handleStyle={styles.hiddenHandle}
                backgroundStyle={styles.bottomSheetBackground}
                onChange={(index) => {
                    if (index === -1 && typeof onDismiss === 'function') {
                        try { onDismiss(); } catch { }
                    }
                }}
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
        backgroundColor: theme.surface,
        borderTopLeftRadius: scaleSize(25),
        borderTopRightRadius: scaleSize(25)
    }
});

export default memo(ShareBottomSheet);
