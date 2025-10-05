import React, { forwardRef } from 'react';
import { TextInput, Platform } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import KeyboardDismissAccessory, { useKeyboardAccessoryId } from './KeyboardDismissAccessory';

const DismissableTextInput = forwardRef(({
    enableAccessory = true,
    inputAccessoryViewID: providedAccessoryId,
    useBottomSheetInput = false,
    ...rest
}, ref) => {
    const generatedId = useKeyboardAccessoryId();
    const shouldAttachAccessory = enableAccessory && Platform.OS === 'ios';
    const accessoryID = shouldAttachAccessory ? (providedAccessoryId || generatedId) : providedAccessoryId;
    const InputComponent = useBottomSheetInput ? BottomSheetTextInput : TextInput;

    return (
        <>
            <InputComponent
                ref={ref}
                {...rest}
                inputAccessoryViewID={accessoryID}
            />
            {shouldAttachAccessory && !providedAccessoryId && (
                <KeyboardDismissAccessory accessoryID={accessoryID} />
            )}
        </>
    );
});

export default DismissableTextInput;
