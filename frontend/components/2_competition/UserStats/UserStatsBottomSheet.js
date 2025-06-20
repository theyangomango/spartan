import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetFooter } from "@gorhom/bottom-sheet";
import LeaderboardModal from "../LeaderboardModal";
import UserStatsModal from "./UserStatsModal";

const LeaderboardBottomSheet = ({ isVisible, setIsVisible, user, navigation }) => {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ["94%"], []);

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

    function toViewProfile() {
        // bottomSheetRef.current.close();
        navigation.navigate('ViewProfile', {
            user: {
                handle: user.handle,
                name: user.name,
                pfp: user.pfp,
                uid: user.uid
            }
        });
    }

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={-1}
            backdropComponent={renderBackdrop}
            snapPoints={snapPoints}
            handleStyle={{ display: 'none' }}
            enablePanDownToClose
            onClose={() => setIsVisible(false)}
        >
            {user && 
                <UserStatsModal user={user} toViewProfile={toViewProfile}/>
            }
        </BottomSheet>
    );
};

export default React.memo(LeaderboardBottomSheet);

const styles = StyleSheet.create({
})