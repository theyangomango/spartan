import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { StyleSheet } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import EditTemplateModal from "./EditTemplateModal";

const EditTemplateBottomSheet = ({ isVisible, setIsVisible, openedTemplateRef, updateTemplate }) => {
    console.log(openedTemplateRef.current);

    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ["94%"], []);

    const handleSheetChanges = useCallback((index) => {
        console.log("handleSheetChanges", index);
    }, []);

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
            onChange={handleSheetChanges}
            enablePanDownToClose
            enableContentPanningGesture={false}
            onClose={() => {
                setIsVisible(false);
            }}
        >
            {isVisible &&
                <EditTemplateModal openedTemplateRef={openedTemplateRef} updateTemplate={updateTemplate}/>
            }
        </BottomSheet>
    );
};

export default React.memo(EditTemplateBottomSheet);
