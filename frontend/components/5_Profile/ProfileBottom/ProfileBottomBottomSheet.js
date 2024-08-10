import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetFooter } from "@gorhom/bottom-sheet";
import ProfileBottomModal from "./ProfileBottomModal";
import Footer from "../../Footer";

const ProfileBottomBottomSheet = ({ selectedPanel, setSelectedPanel, posts, navigation }) => {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ["58%", "94%"], []);
    const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false);

    const handleSheetChanges = useCallback((index) => {
        setIsBottomSheetExpanded(index);
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
                isBottomSheetExpanded={isBottomSheetExpanded}
            />

        </BottomSheet>
    );
};

export default React.memo(ProfileBottomBottomSheet);
