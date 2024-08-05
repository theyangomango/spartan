import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetFooter } from "@gorhom/bottom-sheet";
import LeaderboardModal from "./LeaderboardModal";

const LeaderboardBottomSheet = ({ userList, categoryCompared, showFollowers, toggleFollowers, openModal, openBottomSheet, navigation }) => {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ["53%", "94%"], []);

    const handleSheetChanges = useCallback((index) => {
        console.log("handleSheetChanges", index);
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

    const renderFooter = useCallback(
        props => (
            <BottomSheetFooter {...props}>
                <Footer navigation={navigation} currentScreenName={'Profile'} />
            </BottomSheetFooter>
        ),
        []
    );

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={0}
            backdropComponent={renderBackdrop}
            // footerComponent={renderFooter}
            snapPoints={snapPoints}
            onChange={handleSheetChanges}
            // handleStyle={styles.handle}
            handleStyle={{ display: 'none' }}
            detached
        >
            <LeaderboardModal
                userList={userList}
                categoryCompared={categoryCompared}
                showFollowers={showFollowers}
                toggleFollowers={toggleFollowers}
                openModal={openModal}
                openBottomSheet={openBottomSheet}
            />
        </BottomSheet>
    );
};

export default React.memo(LeaderboardBottomSheet);

const styles = StyleSheet.create({
})