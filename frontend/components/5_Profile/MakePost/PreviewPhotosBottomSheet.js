import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { StyleSheet } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import PreviewPhotosModal from "./PreviewPhotosModal";

const PreviewPhotosBottomSheet = ({ assets, images, setImages }) => {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ["35", "94%"], []);

    const handleSheetChanges = useCallback((index) => {
        console.log("handleSheetChanges", index);
    }, []);

    const renderBackdrop = useCallback(
        (props) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={0}
                appearsOnIndex={1}
                opacity={0.6}
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
            onClose={() => {
            }}
            handleStyle={styles.handle}
        >
            <PreviewPhotosModal assets={assets} images={images} setImages={setImages} />
        </BottomSheet>
    );
};

export default React.memo(PreviewPhotosBottomSheet);

const styles = StyleSheet.create({
    handle: {
        backgroundColor: '#e7e7e7',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
    }
})