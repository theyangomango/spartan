import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import theme from "../../../theme/mfpDark";
import ProfileBottomModal from "./ProfileBottomModal";
import scaleSize from "../../../helper/scaleSize";

const AUTO_EXPAND_SCROLL_THRESHOLD = 200;

const ProfileBottomBottomSheet = ({ selectedPanel, setSelectedPanel, posts, templates, completedWorkouts, onOpenWorkout, topContentHeight }) => {
    const bottomSheetRef = useRef(null);
    const autoExpandTriggeredRef = useRef(false);
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
    const snapPoints = useMemo(() => {
        const B = insets.bottom || 0;
        const T = insets.top || 0;
        const safeHeight = Math.max(windowHeight, 1);
        const fallbackTop = T + safeHeight * 0.45;
        let targetTop = typeof topContentHeight === 'number' && topContentHeight > 0 ? (T + topContentHeight) : fallbackTop;
        // Keep the top anchor within the screen bounds to avoid negative snap sizes.
        const maxTop = Math.max(0, safeHeight - B - 1);
        const collapsedInset = scaleSize(0);
        targetTop = Math.min(Math.max(targetTop + collapsedInset, 0), maxTop);
        const collapsed = Math.max(1, Math.ceil(safeHeight - targetTop - B));
        const expanded = Math.max(collapsed + 1, Math.ceil(safeHeight * 0.94 - B));
        return [collapsed, expanded];
    }, [insets.bottom, insets.top, windowHeight, topContentHeight]);
    const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false);

    useEffect(() => {
        if (topContentHeight == null) return;
        bottomSheetRef.current?.snapToIndex(0);
    }, [topContentHeight, insets.top]);

    const handleSheetChanges = useCallback((idx) => {
        const index = typeof idx === 'number' ? idx : -1;
        if (index < 0) {
            autoExpandTriggeredRef.current = false;
            bottomSheetRef.current?.snapToIndex(0);
            setIsBottomSheetExpanded(false);
            return;
        }
        try {
            requestAnimationFrame(() => setIsBottomSheetExpanded(index === 1));
        } catch {
            setIsBottomSheetExpanded(index === 1);
        }
        if (index === 0) {
            autoExpandTriggeredRef.current = false;
        }
    }, []);

    const handleAutoExpandScroll = useCallback((offsetY = 0) => {
        const distance = Math.max(0, Number(offsetY) || 0);
        if (distance < AUTO_EXPAND_SCROLL_THRESHOLD) {
            autoExpandTriggeredRef.current = false;
            return;
        }
        if (isBottomSheetExpanded || autoExpandTriggeredRef.current) return;
        autoExpandTriggeredRef.current = true;
        bottomSheetRef.current?.snapToIndex(1);
    }, [isBottomSheetExpanded]);

    const renderBackdrop = useCallback(
        (props) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={0}
                appearsOnIndex={1}
                pressBehavior="collapse"
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
            // Match Feed background to keep top/bottom consistent
            backgroundStyle={{ backgroundColor: theme.bg }}
            bottomInset={insets.bottom || 0}
            topInset={insets.top || 0}
            enablePanDownToClose={false}
            enableOverDrag={false}
            detached
        >
            <ProfileBottomModal
                selectedPanel={selectedPanel}
                setSelectedPanel={setSelectedPanel}
                posts={posts}
                templates={templates}
                completedWorkouts={completedWorkouts}
                isBottomSheetExpanded={isBottomSheetExpanded}
                onOpenWorkout={onOpenWorkout}
                onScrollExpandRequest={handleAutoExpandScroll}
            />
        </BottomSheet>
    );
};

export default React.memo(ProfileBottomBottomSheet);
