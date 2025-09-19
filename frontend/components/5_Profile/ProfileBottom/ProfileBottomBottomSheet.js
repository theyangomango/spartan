import React, { useCallback, useMemo, useRef, useState } from "react";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import theme from "../../../theme/mfpDark";
import ProfileBottomModal from "./ProfileBottomModal";

const ProfileBottomBottomSheet = ({ selectedPanel, setSelectedPanel, posts, savedPosts, completedWorkouts, onOpenWorkout }) => {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ["55%", "94%"], []);
    const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false);

    const handleSheetChanges = useCallback((idx) => {
        const index = typeof idx === 'number' ? idx : -1;
        try {
            requestAnimationFrame(() => setIsBottomSheetExpanded(index === 1));
        } catch {
            setIsBottomSheetExpanded(index === 1);
        }
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

    const insets = useSafeAreaInsets();

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={0}
            backdropComponent={renderBackdrop}
            snapPoints={snapPoints}
            onChange={handleSheetChanges}
            handleStyle={{ display: 'none' }}
            // Match Feed background to keep top/bottom consistent
            backgroundStyle={{ backgroundColor: theme.bg }}
            bottomInset={insets.bottom || 0}
            topInset={insets.top || 0}
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
