import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import EditTemplateModal from "./EditTemplateModal";
import theme from "../../../theme/mfpDark";

import scaleSize from "../../../helper/scaleSize";

const EditTemplateBottomSheet = ({ isVisible, setIsVisible, openedTemplateRef, updateTemplate, deleteTemplate }) => {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ["100%"], []);
    const [renderContent, setRenderContent] = useState(isVisible);

    const handleClose = useCallback(() => {
        try { bottomSheetRef.current?.close?.(); } catch {}
        try { setIsVisible(false); } catch {}
    }, [setIsVisible]);

    const handleSave = useCallback(() => {
        handleClose();
    }, [handleClose]);

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
            setRenderContent(true);
            try { bottomSheetRef.current?.expand?.(); } catch {}
        } else {
            try { bottomSheetRef.current?.close?.(); } catch {}
        }
    }, [isVisible]);

    const handleSheetClose = useCallback(() => {
        setRenderContent(false);
        try { setIsVisible(false); } catch {}
    }, [setIsVisible]);

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={isVisible ? 0 : -1}
            snapPoints={snapPoints}
            backdropComponent={renderBackdrop}
            keyboardBehavior="interactive"
            keyboardBlurBehavior="none"
            enablePanDownToClose={false}
            enableHandlePanningGesture={false}
            enableContentPanningGesture={false}
            onClose={handleSheetClose}
            onChange={(index) => { if (index < 0) handleSheetClose(); }}
            handleStyle={{
                borderTopLeftRadius: scaleSize(22),
                borderTopRightRadius: scaleSize(22),
            }}
            handleIndicatorStyle={{
                backgroundColor: theme.field,
            }}
            backgroundStyle={{
                backgroundColor: theme.surface,
                borderTopLeftRadius: scaleSize(22),
                borderTopRightRadius: scaleSize(22),
            }}
        >
            {renderContent &&
                <EditTemplateModal
                    openedTemplateRef={openedTemplateRef}
                    updateTemplate={updateTemplate}
                    deleteTemplate={deleteTemplate}
                    closeModal={handleClose}
                    onSave={handleSave}
                />
            }
        </BottomSheet>
    );
};

export default React.memo(EditTemplateBottomSheet);
