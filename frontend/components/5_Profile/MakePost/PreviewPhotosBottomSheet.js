import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { StyleSheet } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import PreviewPhotosModal from "./PreviewPhotosModal";

const PreviewPhotosBottomSheet = ({ assets, images, selectedOrderMap, toggleSelect, loadMoreAssets, loading, hasNextPage, clearSelection }) => {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ["35%", "94%"], []);

    const handleSheetChanges = useCallback((index) => {
        // Warm up by loading next page when fully expanded (single request).
        if (index === 1 && hasNextPage && !loading) {
            loadMoreAssets();
        }
    }, [hasNextPage, loading, loadMoreAssets]);

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
            backgroundStyle={styles.background}
            handleStyle={styles.handle}
            handleIndicatorStyle={styles.handleIndicator}
        >
            <PreviewPhotosModal
                assets={assets}
                images={images}
                selectedOrderMap={selectedOrderMap}
                toggleSelect={toggleSelect}
                loadMoreAssets={loadMoreAssets}
                loading={loading}
                hasNextPage={hasNextPage}
                clearSelection={clearSelection}
            />
        </BottomSheet>
    );
};

export default React.memo(PreviewPhotosBottomSheet);

const styles = StyleSheet.create({
    background: {
        backgroundColor: '#f3f3f3',
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
    },
    handle: {
        backgroundColor: 'transparent',
        paddingVertical: 6,
    },
    handleIndicator: {
        width: 36,
        height: 4,
        borderRadius: 3,
        backgroundColor: '#CFCFCF',
    },
})
