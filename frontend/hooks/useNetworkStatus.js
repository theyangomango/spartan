// Tracks whether the device is offline: one probe on mount, then the expo-network listener.
import { useCallback, useEffect, useState } from 'react';
import * as Network from 'expo-network';

export default function useNetworkStatus() {
    const [isOffline, setIsOffline] = useState(false);

    const evaluateNetworkState = useCallback((state) => {
        if (!state || typeof state !== 'object') {
            return;
        }
        const offline = !state.isConnected || state.isInternetReachable === false;
        setIsOffline((prev) => (prev === offline ? prev : offline));
    }, []);

    useEffect(() => {
        let mounted = true;
        Network.getNetworkStateAsync()
            .then((state) => { if (mounted) evaluateNetworkState(state); })
            .catch(() => { });
        let subscription = null;
        if (typeof Network.addNetworkStateListener === 'function') {
            subscription = Network.addNetworkStateListener((state) => {
                evaluateNetworkState(state);
            });
        }
        return () => {
            mounted = false;
            if (subscription && typeof subscription.remove === 'function') {
                subscription.remove();
            }
        };
    }, [evaluateNetworkState]);

    return { isOffline };
}
