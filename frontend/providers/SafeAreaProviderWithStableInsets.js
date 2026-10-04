import React from 'react';
import {
    SafeAreaProvider,
    SafeAreaInsetsContext,
} from 'react-native-safe-area-context';

import useStableSafeAreaInsets from '../hooks/useStableSafeAreaInsets';

// Wraps SafeAreaProvider so new screens never see a zero safe-area inset.
function StableInsetsBridge({ children }) {
    const stableInsets = useStableSafeAreaInsets();

    return (
        <SafeAreaInsetsContext.Provider value={stableInsets}>
            {children}
        </SafeAreaInsetsContext.Provider>
    );
}

export default function SafeAreaProviderWithStableInsets({ children, ...props }) {
    return (
        <SafeAreaProvider {...props}>
            <StableInsetsBridge>
                {children}
            </StableInsetsBridge>
        </SafeAreaProvider>
    );
}
