import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetFooter } from "@gorhom/bottom-sheet";
import CreateGroupChatModal from "./CreateGroupChatModal";

const CreateGroupChatBottomSheet = ({ isVisible, setIsVisible, createGroupChat }) => {
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
            handleStyle={{ display: 'none' }}
            enablePanDownToClose
            onClose={() => setIsVisible(false)}
        >
            <CreateGroupChatModal createGroupChat={createGroupChat}/>
        </BottomSheet>
    );
};

export default React.memo(CreateGroupChatBottomSheet);

const styles = StyleSheet.create({
})