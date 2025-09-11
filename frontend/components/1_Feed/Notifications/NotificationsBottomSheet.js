/**
 * Displays a bottom sheet containing user notifications.
 * Resets new notification counts upon closing.
 */
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import NotificationsModal from "./NotificationsModal";
import scaleSize from "../../../helper/scaleSize";
import theme from "../../../theme/mfpDark";
import resetNewNotifications from "../../../helper/resetNewNotifications";

const NotificationsBottomSheet = ({ notificationsBottomSheetExpandFlag }) => {
    const bottomSheetRef = useRef(null);
    const insets = useSafeAreaInsets();
    // Define snap points for the bottom sheet (approximate modal height)
    const snapPoints = useMemo(() => [scaleSize(800)], []);
    const [isExpanded, setIsExpanded] = useState(false);

    // Expand only when the flag toggles AFTER mount; remain fully closed initially
    const didMountRef = useRef(false);
    useEffect(() => {
        if (!didMountRef.current) { didMountRef.current = true; return; }
        const ref = bottomSheetRef.current;
        if (ref) {
            ref.expand();
            setIsExpanded(true);
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

    function handleClose() {
        setIsExpanded(false);
        resetNewNotifications();
    }

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
                onClose={handleClose}
            >
                <NotificationsModal
                    visible={isExpanded}
                    uid={global?.userData?.uid || null}
                    closeBottomSheet={() => bottomSheetRef.current?.close?.()}
                />
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
        // Ensure this sits above header overlays and top safe-area mask in Feed
        zIndex: 100,
    },
    hiddenHandle: {
        display: "none", // Hide the default handle
    },
    bottomSheetBackground: {
        backgroundColor: theme.bg,
        borderTopLeftRadius: scaleSize(25),
        borderTopRightRadius: scaleSize(25),
    },
});

export default memo(NotificationsBottomSheet);
