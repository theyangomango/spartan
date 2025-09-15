import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import PreviewPhotosModal from "./PreviewPhotosModal";
import theme from '../../../theme/mfpDark';

import scaleSize from "../../../helper/scaleSize";

const PreviewPhotosBottomSheet = ({ assets, images, selectedOrderMap, toggleSelect, loadMoreAssets, loading, hasNextPage, clearSelection, isLimited, onRequestMoreAccess }) => {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ["35%", "94%"], []);
    const [expanded, setExpanded] = useState(false);

    const handleSheetChanges = useCallback((index) => {
        const isExpanded = index === 1;
        setExpanded(isExpanded);
    }, []);

    // When expanded and list content can't fill the view yet, proactively paginate
    useEffect(() => {
        const MIN_ITEMS = 60; // ensure enough rows to enable scrolling
        if (!expanded) return;
        if (loading) return;
        if (hasNextPage && assets.length < MIN_ITEMS) {
            loadMoreAssets();
        }
    }, [expanded, loading, hasNextPage, assets.length, loadMoreAssets]);

    const renderBackdrop = useCallback(
        (props) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={0}
                appearsOnIndex={1}
                opacity={0.6}
                pressBehavior="none" // prevent dismiss on backdrop press
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
            enablePanDownToClose={false}
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
                isLimited={isLimited}
                onRequestMoreAccess={onRequestMoreAccess}
            />
        </BottomSheet>
    );
};

export default React.memo(PreviewPhotosBottomSheet);

const styles = StyleSheet.create({
    background: {
        backgroundColor: theme.surface,
        borderTopLeftRadius: scaleSize(22),
        borderTopRightRadius: scaleSize(22),
    },
    handle: {
        backgroundColor: 'transparent',
        paddingVertical: scaleSize(6),
    },
    handleIndicator: {
        width: scaleSize(36),
        height: scaleSize(4),
        borderRadius: scaleSize(3),
        backgroundColor: theme.hairline,
    },
})
