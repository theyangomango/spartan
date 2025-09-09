import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { StyleSheet } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import CreateGroupChatModal from "./CreateGroupChatModal";

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
        backgroundColor: "#252733",
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
    },
    handleIndicator: {
        backgroundColor: "#3A3D45",
        width: 44,
        height: 5,
        borderRadius: 3,
        marginTop: 6,
        marginBottom: 6,
    },
})
