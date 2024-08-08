import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetFooter } from "@gorhom/bottom-sheet";
import ProfileBottomModal from "./ProfileBottomModal";
import Footer from "../../Footer";

const ProfileBottomBottomSheet = ({ selectedPanel, setSelectedPanel, posts, navigation }) => {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ["58%", "94%"], []);

    const handleSheetChanges = useCallback((index) => {
        console.log("handleSheetChanges", index);
    }, []);

    const renderBackdrop = useCallback(
        (props) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={0}
                appearsOnIndex={1}
                opacity={0}
            />
        ),
        []
    );

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={0}
            backdropComponent={renderBackdrop}
            snapPoints={snapPoints}
            onChange={handleSheetChanges}
            handleStyle={{ display: 'none' }}
            detached
        >
            <ProfileBottomModal
                selectedPanel={selectedPanel}
                setSelectedPanel={setSelectedPanel}
                posts={posts}
            />

        </BottomSheet>
    );
};

export default React.memo(ProfileBottomBottomSheet);

const styles = StyleSheet.create({
})