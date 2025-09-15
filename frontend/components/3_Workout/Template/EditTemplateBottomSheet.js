import React, { useCallback, useEffect, useMemo, useRef } from "react";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import EditTemplateModal from "./EditTemplateModal";
import theme from "../../../theme/mfpDark";

import scaleSize from "../../../helper/scaleSize";

const EditTemplateBottomSheet = ({ isVisible, setIsVisible, openedTemplateRef, updateTemplate, deleteTemplate }) => {
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
            try { bottomSheetRef.current?.expand?.(); } catch {}
        } else {
            try { bottomSheetRef.current?.close?.(); } catch {}
        }
    }, [isVisible]);

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={isVisible ? 0 : -1}
            snapPoints={snapPoints}
            backdropComponent={renderBackdrop}
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            enablePanDownToClose
            enableContentPanningGesture={false}
            onClose={() => { try { setIsVisible(false); } catch {} }}
            onChange={(index) => { if (index < 0) { try { setIsVisible(false); } catch {} } }}
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
            {isVisible &&
                <EditTemplateModal
                    openedTemplateRef={openedTemplateRef}
                    updateTemplate={updateTemplate}
                    deleteTemplate={deleteTemplate}
                />
            }
        </BottomSheet>
    );
};

export default React.memo(EditTemplateBottomSheet);
