import React, { useCallback, useMemo, useRef, useState } from "react";
import { Dimensions } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import scaleSize from "../../../helper/scaleSize";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import theme from "../../../theme/mfpDark";
import ProfileBottomModal from "./ProfileBottomModal";

const ProfileBottomBottomSheet = ({ selectedPanel, setSelectedPanel, posts, savedPosts, completedWorkouts, onOpenWorkout, topOffset = 0 }) => {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ["58%", "94%"], []);
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
    const screenHeight = Dimensions.get('window').height;
    const safeTop = insets.top || 0;
    const baseMargin = useMemo(() => scaleSize(12), []);
    const collapsedRatio = 0.58;
    const sheetMarginTop = useMemo(() => {
        // Adjust the detached sheet’s anchor so the collapsed state sits
        // directly beneath the measured profile header height. Solving for
        // margin: topOffset = margin + (1 - ratio) * (screenHeight - margin).
        const measured = Number.isFinite(topOffset) ? Math.max(0, Math.round(topOffset)) : 0;
        if (!measured) return baseMargin;

        const defaultTop = (1 - collapsedRatio) * screenHeight;
        if (measured <= defaultTop) return baseMargin;

        const delta = measured - defaultTop;
        const marginFromDelta = Math.round(delta / collapsedRatio);
        return Math.max(baseMargin, marginFromDelta);
    }, [baseMargin, screenHeight, topOffset]);

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
            style={{ marginTop: sheetMarginTop }}
            bottomInset={insets.bottom || 0}
            topInset={safeTop + scaleSize(6)}
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
