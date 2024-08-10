import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetFooter } from "@gorhom/bottom-sheet";
import LeaderboardModal from "./LeaderboardModal";

const LeaderboardBottomSheet = ({ userList, categoryCompared, showFollowers, toggleFollowers, openModal, openBottomSheet, navigation }) => {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ["62%", "94%"], []);
    const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false);

    const handleSheetChanges = useCallback((index) => {
        if (index == 1) setIsBottomSheetExpanded(true);
        else setIsBottomSheetExpanded(false);
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
            handleStyle={{ display: 'none' }}
            style={styles.bottomsheet}
            backgroundStyle={{ borderTopLeftRadius: 30, borderTopRightRadius: 30 }}
            enablePanDownToClose={false}
        >
            {userList &&
                <LeaderboardModal
                    userList={userList}
                    categoryCompared={categoryCompared}
                    showFollowers={showFollowers}
                    toggleFollowers={toggleFollowers}
                    openModal={openModal}
                    openBottomSheet={openBottomSheet}
                    isBottomSheetExpanded={isBottomSheetExpanded}
                />
            }
        </BottomSheet>
    );
};

export default React.memo(LeaderboardBottomSheet);

const styles = StyleSheet.create({
    bottomsheet: {
        shadowColor: '#ddd',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.8,
        shadowRadius: 5,
        elevation: 5,
        borderTopRightRadius: 25,
        borderTopLeftRadius: 25,
        backgroundColor: '#fff'
    }
})