import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetFooter } from "@gorhom/bottom-sheet";
import LeaderboardModal from "../LeaderboardModal";
import UserStatsModal from "./UserStatsModal";

import { onHexagonUpdate } from "../../../utils/hexagonEvents";

const LeaderboardBottomSheet = ({ isVisible, setIsVisible, user, navigation }) => {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ["94%"], []);
    const [tick, setTick] = useState(0);

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

    // Live refresh when hexagon changes elsewhere in the app
    useEffect(() => {
        const off = onHexagonUpdate(() => setTick((t) => t + 1));
        return () => off && off();
    }, []);

    function toViewProfile() {
        const u = user || global?.userData;
        if (!u) return;
        navigation.navigate('ViewProfile', {
            user: {
                handle: u.handle,
                name: u.name,
                pfp: u.pfp || u.image,
                uid: u.uid,
            },
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
            {(user || global?.userData) && (
                <UserStatsModal
                    key={tick}
                    user={user || global?.userData}
                    toViewProfile={toViewProfile}
                />
            )}
        </BottomSheet>
    );
};

export default React.memo(LeaderboardBottomSheet);

const styles = StyleSheet.create({
})
