// Mirrors the app's foreground/background state to usersPrivate while a user is signed in.
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { serverTimestamp } from 'firebase/firestore';

import updateDoc from '../../backend/helper/firebase/updateDoc';

export default function usePresenceSync(uidRef, isAuthenticated, userReady) {
    const appStateStatusRef = useRef(AppState.currentState || 'unknown');

    // Track foreground/background to update server-side presence for chat push gating
    useEffect(() => {
        const uid = uidRef.current;
        if (!uid) return;

        const updatePresence = async (foreground) => {
            try {
                const payload = foreground
                    ? { appForeground: true, lastForegroundAt: serverTimestamp() }
                    : { appForeground: false, lastBackgroundAt: serverTimestamp() };
                await updateDoc('usersPrivate', uid, payload);
            } catch { }
        };

        // Initial sync based on current app state
        updatePresence(appStateStatusRef.current === 'active');

        const handleAppStateChange = (nextState) => {
            appStateStatusRef.current = nextState;
            updatePresence(nextState === 'active');
        };

        const subscription = AppState.addEventListener
            ? AppState.addEventListener('change', handleAppStateChange)
            : null;

        return () => {
            if (uidRef.current === uid) {
                updatePresence(false);
            }
            if (subscription?.remove) subscription.remove();
            else {
                try { AppState.removeEventListener?.('change', handleAppStateChange); } catch { }
            }
        };
    }, [isAuthenticated, userReady]);
}
