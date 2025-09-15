import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { StyleSheet } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import CreateGroupChatModal from "./CreateGroupChatModal";
import theme from "../../theme/mfpDark";

import scaleSize from "../../helper/scaleSize";

const CreateGroupChatBottomSheet = ({ isVisible, setIsVisible, initChat }) => {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ["94%"], []);

    const handleSheetChanges = useCallback((index) => {
        console.log("handleSheetChanges", index);
    }, []);

    const renderBackdrop = useCallback(
        (props) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.5}
            />
        ),
        []
    );

    useEffect(() => {
        if (isVisible) {
            bottomSheetRef.current.expand();
        }
    }, [isVisible]);

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={-1}
            backdropComponent={renderBackdrop}
            snapPoints={snapPoints}
            onChange={handleSheetChanges}
            enablePanDownToClose
            onClose={() => setIsVisible(false)}
            backgroundStyle={styles.sheetBackground}
            handleIndicatorStyle={styles.handleIndicator}
            keyboardBehavior="interactive"
        >
            <CreateGroupChatModal initChat={initChat} />
        </BottomSheet>
    );
};

export default React.memo(CreateGroupChatBottomSheet);

const styles = StyleSheet.create({
    sheetBackground: {
        // Match app background to reduce contrast with the screen behind
        backgroundColor: theme.bg,
        borderTopLeftRadius: scaleSize(22),
        borderTopRightRadius: scaleSize(22),
    },
    handleIndicator: {
        backgroundColor: theme.hairline,
        width: scaleSize(44),
        height: scaleSize(5),
        borderRadius: scaleSize(3),
        marginTop: scaleSize(6),
        marginBottom: scaleSize(6),
    },
});
