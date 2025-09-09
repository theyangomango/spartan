import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View, Dimensions } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetFooter } from "@gorhom/bottom-sheet";
import theme from "../../../theme/mfpDark";
import ProfileBottomModal from "./ProfileBottomModal";

const ProfileBottomBottomSheet = ({ selectedPanel, setSelectedPanel, posts, savedPosts, completedWorkouts, onOpenWorkout }) => {
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

    // Slight vertical offset so sheet sits clearly below the profile top
    const { height: screenHeight } = Dimensions.get('window');
    const scale = screenHeight / 844;
    const scaledSize = (size) => Math.round(size * scale);

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={0}
            backdropComponent={renderBackdrop}
            snapPoints={snapPoints}
            onChange={handleSheetChanges}
            handleStyle={{ display: 'none' }}
            // Match screen canvas to keep top/bottom consistent
            backgroundStyle={{ backgroundColor: theme.screenBg }}
            style={{ marginTop: scaledSize(3) }}
            detached
        >
            <ProfileBottomModal
                selectedPanel={selectedPanel}
                setSelectedPanel={setSelectedPanel}
                posts={posts}
                savedPosts={savedPosts}
                completedWorkouts={completedWorkouts}
                isBottomSheetExpanded={isBottomSheetExpanded}
                onOpenWorkout={onOpenWorkout}
            />

        </BottomSheet>
    );
};

export default React.memo(ProfileBottomBottomSheet);
