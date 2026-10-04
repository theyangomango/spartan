import React, { useCallback, useEffect, useMemo, useRef } from "react";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import EditProfileModal from "./EditProfileModal";
import THEME from "../../../theme/mfpDark";

const EditProfileBottomSheet = ({ isVisible, setIsVisible, setPFP }) => {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ["94%"], []);

    const renderBackdrop = useCallback(
        (props) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.6}
            />
        ),
        []
    );

    useEffect(() => {
        if (isVisible) {
            bottomSheetRef.current.expand();
        }
    }, [isVisible]);

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={-1}
            snapPoints={snapPoints}
            backdropComponent={renderBackdrop}
            backgroundStyle={{ backgroundColor: THEME.bg }}
            handleIndicatorStyle={{backgroundColor: '#fff'}}
            enablePanDownToClose
            onClose={() => {
                setIsVisible(false);
            }}
        >
            <EditProfileModal setPFP={setPFP}/>
        </BottomSheet>
    );
};

export default React.memo(EditProfileBottomSheet);
