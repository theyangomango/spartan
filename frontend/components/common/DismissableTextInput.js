import React, { forwardRef } from 'react';
import { TextInput, Platform } from 'react-native';
import KeyboardDismissAccessory, { useKeyboardAccessoryId } from './KeyboardDismissAccessory';

const DismissableTextInput = forwardRef(({ enableAccessory = true, inputAccessoryViewID: providedAccessoryId, ...rest }, ref) => {
    const generatedId = useKeyboardAccessoryId();
    const shouldAttachAccessory = enableAccessory && Platform.OS === 'ios';
    const accessoryID = shouldAttachAccessory ? (providedAccessoryId || generatedId) : providedAccessoryId;

    return (
        <>
            <TextInput
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
