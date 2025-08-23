import React, { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import LeaderboardModal from "./LeaderboardModal";

const LeaderboardBottomSheet = ({
    userList,
    categoryCompared,
    comparedMetric,
    onToggleMetric,
    openModal,
    openBottomSheet,

    // Tribe-aware
    isTribeFocused,
    tribeComparisons,          // NEW: array
    activeCompIndex,           // NEW: number
    onActiveCompChange,        // NEW: (idx)=>void
    tribeComparisonSummary,    // optional display of active
    onOpenTribeComparison,     // open manager modal
}) => {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ["60%", "94%"], []);
    const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false);

    const handleSheetChanges = useCallback((index) => {
        setIsBottomSheetExpanded(index === 1);
    }, []);

    const renderBackdrop = useCallback(
        (props) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={0}
                appearsOnIndex={1}
                opacity={0.4}
            />
        ),
        []
    );

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={0}
            enableOverDrag={false}
            backdropComponent={renderBackdrop}
            snapPoints={snapPoints}
            onChange={handleSheetChanges}
            handleStyle={{ display: "none" }}
            style={styles.bottomsheet}
            backgroundStyle={{ borderTopLeftRadius: 30, borderTopRightRadius: 30 }}
            enablePanDownToClose={false}
        >
            {userList && (
                <LeaderboardModal
                    userList={userList}
                    categoryCompared={categoryCompared}
                    comparedMetric={comparedMetric}
                    onToggleMetric={onToggleMetric}
                    openModal={openModal}
                    openBottomSheet={openBottomSheet}
                    isBottomSheetExpanded={isBottomSheetExpanded}

                    // NEW
                    isTribeFocused={isTribeFocused}
                    tribeComparisons={tribeComparisons}
                    activeCompIndex={activeCompIndex}
                    onActiveCompChange={onActiveCompChange}
                    tribeComparisonSummary={tribeComparisonSummary}
                    onOpenTribeComparison={onOpenTribeComparison}
                />
            )}
        </BottomSheet>
    );
};

export default React.memo(LeaderboardBottomSheet);

const styles = StyleSheet.create({
    bottomsheet: {
        shadowColor: "#ddd",
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.8,
        shadowRadius: 5,
        elevation: 5,
        borderTopRightRadius: 25,
        borderTopLeftRadius: 25,
        backgroundColor: "#fff",
    },
});
