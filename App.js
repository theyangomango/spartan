import 'react-native-gesture-handler';
import 'expo-dev-client';
// Reanimated global side effects (must be imported at the top-level)
import 'react-native-reanimated';
// Polyfills required by Firebase Storage in RN (atob/btoa)
import './frontend/polyfills/base64';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer } from '@react-navigation/native';
// Lazy-load expo-notifications to avoid native module errors on simulator
// and in dev clients that weren't rebuilt with the module.
import * as Device from 'expo-device';
import { navigationRef, navigateRoot, jumpToTab } from './navigationRef';
import { Platform, StyleSheet, Vibration, TextInput, LogBox } from 'react-native';
import { useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { Entypo, FontAwesome } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initialWindowMetrics } from 'react-native-safe-area-context';
import { enableScreens, enableFreeze } from 'react-native-screens';
import { useFonts } from 'expo-font';
import { customFonts } from './fonts';
import { auth, db } from './firebase.config';
import { doc, onSnapshot, collection, query, where, getDoc, getDocFromCache } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { initCommunityStats, refreshCommunityStats } from './frontend/logic/communityStats';
import { ensureAuthBackgroundAsync } from './frontend/utils/authBackground';
import { emitUserDataUpdate } from './frontend/utils/userDataEvents';
import { withLegacyPhotoFields } from './frontend/utils/profilePhoto';
import { backfillJoinDate, prepareProfileForAuth } from './frontend/services/userProfileService';
import { registerAuthStatusController } from './frontend/state/authStatusController';
import updateDoc from './backend/helper/firebase/updateDoc';

import RootNavigator from './frontend/navigation/RootNavigator';
import { NoInternet } from './frontend/screens';
// Dark theme palette
import theme from './frontend/theme/mfpDark';
import ActiveWorkoutBottomSheet from './frontend/components/3_Workout/NewWorkout/ActiveWorkoutBottomSheet';
import WorkoutExperiencePortal from './frontend/components/3_Workout/WorkoutExperiencePortal';
import Footer from './frontend/components/Footer';
import useFooterSuppressionStore, { clearFooterSuppression } from './frontend/state/footerSuppressionStore';
import { /* preloadMessagesForUid, */ resetMessagesState } from './frontend/logic/messagesPreloader';
import { ensureNotificationsListener, stopNotificationsListener } from './frontend/state/notificationsStore';
import WorkoutInviteOverlay from './frontend/components/WorkoutInviteOverlay';
import { openActiveWorkout } from './frontend/workout/workoutActions';
import SafeAreaProviderWithStableInsets from './frontend/providers/SafeAreaProviderWithStableInsets';
import RestReminderModal from './frontend/components/RestReminderModal';
import useNetworkStatus from './frontend/hooks/useNetworkStatus';
import usePresenceSync from './frontend/hooks/usePresenceSync';

const PRELOADED_FONTS = {
    ...customFonts,
    ...Entypo.font,
    ...FontAwesome.font,
};

// Ensure a defined global.userData early so screens can read without crashing
try { global.userData = global.userData || {}; } catch { }

const FOOTER_MAIN_SCREENS = ['Feed', 'MacroTracking', 'Competition', 'Profile'];
const FOOTER_ROUTE_TAB_OVERRIDES = {
    ViewProfile: 'Profile',
};

// Enable native screens for reduced memory and faster transitions
enableScreens(true);
enableFreeze(true);

// Keep native splash screen visible while we preload fonts and hydrate auth
SplashScreen.preventAutoHideAsync().catch(() => { });

// Prefer dark keyboard appearance globally on iOS
try {
    // Silence RN dev warning triggered by native-driven Animated updates during gestures
    LogBox.ignoreLogs?.(['onAnimatedValueUpdate', 'Sending `onAnimatedValueUpdate` with no listeners registered.']);
    if (Platform.OS === 'ios') {
        TextInput.defaultProps = TextInput.defaultProps || {};
        // Only set if not already provided at callsites
        if (!TextInput.defaultProps.keyboardAppearance) {
            TextInput.defaultProps.keyboardAppearance = 'dark';
        }
    }
} catch { }

/* No nested stacks; everything registers on RootStack */

const getActiveTabNameFromState = (state) => {
    if (!state || !state.routes) return null;
    const tabsRoute = state.routes.find((route) => route.name === 'Tabs');
    if (!tabsRoute) return null;
    let nestedState = tabsRoute.state;
    if (!nestedState || !nestedState.routes) return null;
    let route = nestedState.routes[nestedState.index ?? 0];
    while (route?.state && route.state.routes) {
        const nextState = route.state;
        route = nextState.routes[nextState.index ?? 0];
    }
    return route?.name || null;
};

export default function App() {
    // Load every registered font (fonts.js) before hiding the splash screen
    const [fontsReady] = useFonts(PRELOADED_FONTS);
    const [authChecked, setAuthChecked] = useState(false);
    const [currentTabName, setCurrentTabName] = useState('Feed');
    const [isFooterNavEligible, setIsFooterNavEligible] = useState(false);
    const [isFooterVisible, setIsFooterVisible] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userReady, setUserReady] = useState(false);
    const [communityStatsReady, setCommunityStatsReady] = useState(false);
    const [authBackgroundReady, setAuthBackgroundReady] = useState(false);
    const [pendingChatGate, setPendingChatGate] = useState({ cid: null, ready: true });
    const [hasShownAppOnce, setHasShownAppOnce] = useState(false);
    const authBackgroundReadyRef = useRef(false);
    const footerVisibilitySV = useSharedValue(0);
    const workoutSheetProgressSV = useSharedValue(0);
    const footerVisibilityTargetRef = useRef(false);
    const isFooterSuppressed = useFooterSuppressionStore((s) => s.isSuppressed);
    const uidRef = useRef(null);
    const unsubRef = useRef(null);
    const notifUnsubRef = useRef(null);
    const prevUnreadNotifRef = useRef(null);
    const prevUnreadMsgRef = useRef(null);
    const lastBuzzAtRef = useRef(0);
    const lastNotificationBuzzAtRef = useRef(0); // dedupe foreground push vs unread snapshot
    const logoutCleanupRef = useRef(null);
    const logoutResetTimerRef = useRef(null);
    const prevMessagesSigRef = useRef('');
    const latestUserPublicRef = useRef(null);
    const latestUserPrivateRef = useRef(null);
    const pendingHandleRef = useRef(null);

    const markPendingHandle = useCallback((payload = {}) => {
        const existing = pendingHandleRef.current || {};
        const next = {
            uid: payload?.uid || existing.uid || auth.currentUser?.uid || null,
            provider: payload?.provider ?? existing.provider ?? null,
            pendingProfile: payload?.pendingProfile ?? existing.pendingProfile ?? null,
            initialHandle: typeof payload?.initialHandle === 'string'
                ? payload.initialHandle
                : (existing.initialHandle || ''),
            nextRoute: payload?.nextRoute || existing.nextRoute || 'Tabs',
            timestamp: Date.now(),
        };
        pendingHandleRef.current = next;
        setIsAuthenticated(false);
        return next;
    }, []);

    const clearPendingHandle = useCallback(() => {
        pendingHandleRef.current = null;
        const user = auth.currentUser;
        setIsAuthenticated(Boolean(user));
    }, []);

    const ensureUsernameFlow = useCallback((payload = {}) => {
        try {
            const nav = navigationRef.current;
            if (!nav?.isReady?.()) return;
            const params = {
                uid: payload?.uid || auth.currentUser?.uid || null,
                initialHandle: payload?.initialHandle || '',
                pendingProfile: payload?.pendingProfile || null,
                nextRoute: payload?.nextRoute || 'Tabs',
            };
            nav.navigate('CreateUsername', { ...params, merge: true });
        } catch { }
    }, []);

    const refreshAuthStatus = useCallback(async () => {
        const user = auth.currentUser;
        if (!user) {
            pendingHandleRef.current = null;
            setIsAuthenticated(false);
            return;
        }
        try {
            const prepared = await prepareProfileForAuth();
            if (prepared?.requiresHandle) {
                const providerId = prepared?.pendingProfile?.providerId
                    || prepared?.publicProfile?.providerId
                    || user.providerData?.[0]?.providerId
                    || null;
                if (providerId === 'password') {
                    clearPendingHandle();
                    return;
                }
                const next = markPendingHandle({
                    uid: user.uid,
                    pendingProfile: prepared?.pendingProfile || null,
                    initialHandle: prepared?.publicProfile?.handle || '',
                    provider: providerId,
                    nextRoute: 'Tabs',
                });
                ensureUsernameFlow(next);
            } else {
                clearPendingHandle();
            }
        } catch {
            clearPendingHandle();
        }
    }, [clearPendingHandle, ensureUsernameFlow, markPendingHandle]);

    useEffect(() => {
        const unregister = registerAuthStatusController({
            markPendingHandle,
            clearPendingHandle,
            refreshAuthStatus,
        });
        return unregister;
    }, [clearPendingHandle, markPendingHandle, refreshAuthStatus]);

    useEffect(() => {
        if (!authChecked) return;
        const nav = navigationRef.current;
        if (!nav?.isReady?.()) return;
        const pending = pendingHandleRef.current;
        if (pending) {
            ensureUsernameFlow(pending);
        }
    }, [authChecked, ensureUsernameFlow]);

    const animateFooterVisibility = useCallback((visible) => {
        if (footerVisibilityTargetRef.current === visible && footerVisibilitySV.value === (visible ? 1 : 0)) {
            return;
        }
        footerVisibilityTargetRef.current = visible;
        const target = visible ? 1 : 0;
        footerVisibilitySV.value = withTiming(target, {
            duration: visible ? 180 : 130,
            easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
        });
    }, [footerVisibilitySV]);

    const handleNavigationStateUpdate = useCallback(() => {
        const rootState = navigationRef.current?.getRootState?.();
        const activeTab = getActiveTabNameFromState(rootState);
        const currentRouteName = navigationRef.current?.getCurrentRoute?.()?.name;

        let showFooter = false;
        let nextFooterScreen = currentTabName;

        if (currentRouteName === 'Tabs') {
            if (activeTab && FOOTER_MAIN_SCREENS.includes(activeTab)) {
                showFooter = true;
                nextFooterScreen = activeTab;
            }
        } else if (currentRouteName && FOOTER_MAIN_SCREENS.includes(currentRouteName)) {
            showFooter = true;
            nextFooterScreen = currentRouteName;
        } else if (currentRouteName && FOOTER_ROUTE_TAB_OVERRIDES[currentRouteName]) {
            showFooter = true;
            nextFooterScreen = FOOTER_ROUTE_TAB_OVERRIDES[currentRouteName];
        }

        setIsFooterNavEligible((prev) => (prev === showFooter ? prev : showFooter));

        if (showFooter && nextFooterScreen && nextFooterScreen !== currentTabName) {
            setCurrentTabName(nextFooterScreen);
            return;
        }

        if (!showFooter && activeTab && FOOTER_MAIN_SCREENS.includes(activeTab) && activeTab !== currentTabName) {
            setCurrentTabName(activeTab);
        }

        if (pendingNotificationsNavRef.current) {
            scheduleNotificationsNavigation();
        }
    }, [currentTabName, setIsFooterNavEligible]);

    const { isOffline } = useNetworkStatus();

    useEffect(() => {
        const shouldShow = isFooterNavEligible && !isFooterSuppressed;
        animateFooterVisibility(shouldShow);
        setIsFooterVisible((prev) => (prev === shouldShow ? prev : shouldShow));
    }, [animateFooterVisibility, isFooterNavEligible, isFooterSuppressed]);

    const markAuthBackgroundReady = useCallback(() => {
        if (!authBackgroundReadyRef.current) {
            authBackgroundReadyRef.current = true;
        }
        setAuthBackgroundReady(true);
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            markAuthBackgroundReady();
            return;
        }

        let cancelled = false;
        authBackgroundReadyRef.current = false;
        setAuthBackgroundReady(false);

        ensureAuthBackgroundAsync()
            .then(() => {
                if (!cancelled) {
                    markAuthBackgroundReady();
                }
            })
            .catch(() => {
                if (!cancelled) {
                    markAuthBackgroundReady();
                }
            });

        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, markAuthBackgroundReady]);

    useEffect(() => {
        if (authBackgroundReady && !authBackgroundReadyRef.current) {
            authBackgroundReadyRef.current = true;
        }
    }, [authBackgroundReady]);

    useEffect(() => {
        if (isAuthenticated) {
            return;
        }
        try {
            global.__markAuthBackgroundReady = markAuthBackgroundReady;
        } catch { }
        return () => {
            try {
                if (global.__markAuthBackgroundReady === markAuthBackgroundReady) {
                    delete global.__markAuthBackgroundReady;
                }
            } catch { }
        };
    }, [isAuthenticated, markAuthBackgroundReady]);

    useEffect(() => () => {
        clearFooterSuppression();
    }, []);

    useEffect(() => {
        try { global.__USE_GLOBAL_FOOTER = true; } catch { }
        return () => { try { delete global.__USE_GLOBAL_FOOTER; } catch { } };
    }, []);

    useEffect(() => {
        const handleLogoutSideEffects = (prevUid) => {
            if (prevUid) {
                try {
                    updateDoc('usersPrivate', prevUid, { expoPushToken: '' }).catch(() => { });
                } catch { }
            }
            try { logoutCleanupRef.current?.(); } catch { }
            uidRef.current = null;
            setUserReady(false);
            try {
                global.userData = {};
                emitUserDataUpdate();
            } catch { }
            try { delete global.__lastKnownUid; } catch { }
            prevMessagesSigRef.current = '';
            resetMessagesState();
            stopNotificationsListener();
            pendingHandleRef.current = null;
        };

        const unsub = onAuthStateChanged(auth, (firebaseUser) => {
            const nextUid = firebaseUser?.uid ? String(firebaseUser.uid) : null;
            const prevUid = uidRef.current ? String(uidRef.current) : null;

            if (!nextUid) {
                handleLogoutSideEffects(prevUid);
                setIsAuthenticated(false);
                pendingHandleRef.current = null;
                setAuthChecked(true);
                return;
            }

            if (prevUid && prevUid !== nextUid) {
                handleLogoutSideEffects(prevUid);
            }

            if (logoutResetTimerRef.current) {
                try { clearTimeout(logoutResetTimerRef.current); } catch { }
                logoutResetTimerRef.current = null;
            }

            uidRef.current = nextUid;
            try { global.__lastKnownUid = nextUid; } catch { }
            prevMessagesSigRef.current = '';
            refreshAuthStatus()
                .catch(() => {
                    clearPendingHandle();
                })
                .finally(() => {
                    setAuthChecked(true);
                });
        });

        global.logout = async () => {
            try { await signOut(auth); } catch { }
        };

        return () => {
            try { unsub(); } catch { }
            try { delete global.logout; } catch { }
        };
    }, [clearPendingHandle, refreshAuthStatus]);

    // Foreground notification behavior (show banner + play sound)
    // Load notifications module conditionally to prevent crashes on iOS simulator
    // when the dev client doesn't include expo-notifications.
    const notificationsRef = useRef(null);
    const notifResponseSubRef = useRef(null);
    const lastHandledNotifIdRef = useRef(null);
    const pendingChatCidRef = useRef(null);
    const pendingNavTimerRef = useRef(null);
    const pendingChatDataRef = useRef(Object.create(null));
    const pendingFeedTargetRef = useRef(null);
    const pendingFeedNavTimerRef = useRef(null);
    const pendingFeedValidationTokenRef = useRef(0);
    const pendingNotificationsNavRef = useRef(false);
    const pendingNotificationsTimerRef = useRef(null);
    useEffect(() => {
        try {
            const Notifications = require('expo-notifications');
            notificationsRef.current = Notifications;
            Notifications.setNotificationHandler({
                handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false })
            });
            // Android channel for local notifications
            if (Platform.OS === 'android' && Notifications?.setNotificationChannelAsync) {
                Notifications.setNotificationChannelAsync('default', {
                    name: 'Default', importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250], lightColor: '#FF231F7C',
                    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
                    enableVibrate: true, enableLights: true,
                }).catch(() => { });
            }
        } catch (e) {
            if (__DEV__) console.log('expo-notifications unavailable:', e?.message || e);
        }
    }, []);

    const prefetchChatData = useCallback((cid) => {
        const chatId = typeof cid === 'string' ? cid : (cid ? String(cid) : '');
        if (!chatId) return;
        const store = pendingChatDataRef.current || Object.create(null);
        if (!pendingChatDataRef.current) pendingChatDataRef.current = store;
        const existing = store[chatId];
        if (existing && existing.status === 'loading') {
            return;
        }
        if (existing && existing.status === 'ready') {
            setPendingChatGate((gate) => {
                if (gate.cid === chatId && !gate.ready) {
                    return { cid: chatId, ready: true };
                }
                return gate;
            });
            return;
        }
        store[chatId] = { status: 'loading', data: { cid: chatId } };
        if (!hasShownAppOnce) {
            setPendingChatGate({ cid: chatId, ready: false });
        }
        (async () => {
            let payload = { cid: chatId };
            try {
                const ref = doc(db, 'messages', chatId);
                let resolved = false;
                try {
                    const cached = await getDocFromCache(ref);
                    if (cached?.exists()) {
                        payload = { cid: chatId, ...(cached.data() || {}) };
                        resolved = true;
                    }
                } catch {
                    // cache miss is expected; fall back to network
                }
                if (!resolved) {
                    const snap = await getDoc(ref);
                    if (snap.exists()) {
                        payload = { cid: chatId, ...(snap.data() || {}) };
                    }
                }
            } catch {
                // leave payload as minimal fallback
            }
            store[chatId] = { status: 'ready', data: payload };
            setPendingChatGate((gate) => {
                if (gate.cid === chatId) {
                    return { cid: null, ready: true };
                }
                return gate;
            });
        })();
    }, [hasShownAppOnce]);

    // Navigate to Chat when a push notification response is tapped.
    const tryNavigateToPendingChat = useCallback(() => {
        const cid = pendingChatCidRef.current;
        if (!cid) return false;
        // Require auth and a ready nav container
        if (!isAuthenticated) return false;
        try {
            // If already on this Chat, consume and skip extra navigation
            try {
                if (navigationRef?.isReady?.() && navigationRef?.getCurrentRoute) {
                    const route = navigationRef.getCurrentRoute();
                    const rcid = route?.params?.data?.cid || route?.params?.cid;
                    if (route?.name === 'Chat' && rcid && String(rcid) === String(cid)) {
                        pendingChatCidRef.current = null;
                        return true;
                    }
                }
            } catch { }

            const store = pendingChatDataRef.current;
            const entry = store ? store[cid] : null;
            if (entry && entry.status === 'loading' && !hasShownAppOnce) {
                return false;
            }
            const chatData = entry?.data || { cid };
            const currentUid = uidRef.current || global?.userData?.uid || null;
            const participants = Array.isArray(chatData?.users)
                ? chatData.users.filter((user) => {
                    try {
                        const uid = user?.uid != null ? String(user.uid) : '';
                        return uid && (!currentUid || uid !== String(currentUid));
                    } catch {
                        return false;
                    }
                })
                : [];
            const params = {
                cid,
                data: chatData,
                usersExcludingSelf: participants,
            };
            const ok = navigateRoot && navigateRoot('Chat', params);
            if (ok) {
                pendingChatCidRef.current = null;
                setPendingChatGate({ cid: null, ready: true });
                return true;
            }
        } catch { }
        return false;
    }, [hasShownAppOnce, isAuthenticated]);

    const tryNavigateToPendingFeedTarget = useCallback(() => {
        const target = pendingFeedTargetRef.current;
        if (!target) return false;
        if (!isAuthenticated) return false;
        const pid = target?.pid ? String(target.pid) : '';
        if (!pid) {
            pendingFeedTargetRef.current = null;
            return false;
        }
        try {
            const params = { focusPid: pid, _pushTs: Date.now() };
            if (jumpToTab && jumpToTab('Feed', params)) {
                pendingFeedTargetRef.current = null;
                return true;
            }
            if (navigateRoot && navigateRoot('Feed', { ...params })) {
                pendingFeedTargetRef.current = null;
                return true;
            }
        } catch { }
        return false;
    }, [isAuthenticated]);

    const schedulePendingFeedNavigation = useCallback(() => {
        if (!pendingFeedTargetRef.current) return;
        if (pendingFeedNavTimerRef.current) {
            try { clearTimeout(pendingFeedNavTimerRef.current); } catch { }
            pendingFeedNavTimerRef.current = null;
        }
        const attempt = () => {
            if (tryNavigateToPendingFeedTarget()) {
                if (pendingFeedNavTimerRef.current) {
                    try { clearTimeout(pendingFeedNavTimerRef.current); } catch { }
                    pendingFeedNavTimerRef.current = null;
                }
                return;
            }
            pendingFeedNavTimerRef.current = setTimeout(attempt, 300);
        };
        attempt();
    }, [tryNavigateToPendingFeedTarget]);

    const attemptNavigateToNotifications = useCallback(() => {
        try {
            const currentRoute = navigationRef?.getCurrentRoute?.();
            if (currentRoute?.name === 'Notifications') {
                pendingNotificationsNavRef.current = false;
                if (pendingNotificationsTimerRef.current) {
                    try { clearTimeout(pendingNotificationsTimerRef.current); } catch { }
                    pendingNotificationsTimerRef.current = null;
                }
                return true;
            }
        } catch { }

        let handled = false;
        try {
            if (navigateRoot && navigateRoot('Notifications')) {
                handled = true;
            }
        } catch { }
        if (!handled) {
            try {
                if (navigationRef?.navigate) {
                    navigationRef.navigate('Notifications');
                    handled = true;
                }
            } catch { }
        }

        if (handled) {
            pendingNotificationsNavRef.current = false;
            if (pendingNotificationsTimerRef.current) {
                try { clearTimeout(pendingNotificationsTimerRef.current); } catch { }
                pendingNotificationsTimerRef.current = null;
            }
        }

        return handled;
    }, []);

    const scheduleNotificationsNavigation = useCallback(() => {
        if (!pendingNotificationsNavRef.current) return;
        if (attemptNavigateToNotifications()) return;
        if (pendingNotificationsTimerRef.current) {
            try { clearTimeout(pendingNotificationsTimerRef.current); } catch { }
            pendingNotificationsTimerRef.current = null;
        }
        pendingNotificationsTimerRef.current = setTimeout(() => {
            scheduleNotificationsNavigation();
        }, 300);
    }, [attemptNavigateToNotifications]);

    const processFeedNotificationTarget = useCallback((target) => {
        if (!target || !target.pid) return;
        const pid = String(target.pid);
        pendingFeedTargetRef.current = null;
        const token = Date.now();
        pendingFeedValidationTokenRef.current = token;
        (async () => {
            let exists = null;
            try {
                const ref = doc(db, 'posts', pid);
                let snap = null;
                try { snap = await getDocFromCache(ref); } catch { }
                if (!snap || !snap.exists()) {
                    snap = await getDoc(ref);
                }
                exists = snap?.exists() || false;
            } catch {
                exists = null; // unknown, proceed defensively
            }
            if (pendingFeedValidationTokenRef.current !== token) return;
            if (exists === false) {
                try {
                    if (!jumpToTab || !jumpToTab('Feed')) {
                        navigateRoot?.('Feed');
                    }
                } catch { }
                return;
            }
            pendingFeedTargetRef.current = { pid, nidType: target?.nidType || null };
            schedulePendingFeedNavigation();
        })();
    }, [schedulePendingFeedNavigation]);

    useEffect(() => {
        // If a pending deep link exists and auth just became ready, attempt navigation
        if (pendingChatCidRef.current) {
            const cid = pendingChatCidRef.current;
            prefetchChatData(cid);
            // clear any previous timer
            if (pendingNavTimerRef.current) { try { clearTimeout(pendingNavTimerRef.current); } catch { } pendingNavTimerRef.current = null; }
            // try immediately; if not ready, retry shortly
            const attempt = () => {
                if (tryNavigateToPendingChat()) return;
                pendingNavTimerRef.current = setTimeout(attempt, 250);
            };
            attempt();
        }
        return () => {
            if (pendingNavTimerRef.current) { try { clearTimeout(pendingNavTimerRef.current); } catch { } pendingNavTimerRef.current = null; }
        };
    }, [isAuthenticated, prefetchChatData, tryNavigateToPendingChat]);

    // Attach response listener and handle cold-start notification response
    useEffect(() => {
        const Notifications = notificationsRef.current;
        if (!Notifications) return;

        const handleResponse = (resp) => {
            try {
                const id = resp?.notification?.request?.identifier;
                if (id && lastHandledNotifIdRef.current === id) return; // dedupe
                const data = resp?.notification?.request?.content?.data || {};
                // const type = data?.type;
                let handled = false;
                // Messaging is disabled: a tapped chat push no longer opens the chat.
                // if (type === 'chat' && data?.cid) {
                //     const cid = String(data.cid);
                //     pendingChatCidRef.current = cid;
                //     prefetchChatData(cid);
                //     // Try now; if navigation is not ready yet, a separate effect will retry
                //     tryNavigateToPendingChat();
                //     handled = true;
                // }
                const nidType = data?.nidType ? String(data.nidType) : '';
                if (!handled && (nidType === 'liked-post' || nidType === 'liked-comment') && data?.pid) {
                    processFeedNotificationTarget({ pid: data.pid, nidType });
                    handled = true;
                }
                if (!handled) {
                    const navigated = attemptNavigateToNotifications();
                    if (!navigated) {
                        pendingNotificationsNavRef.current = true;
                        scheduleNotificationsNavigation();
                    }
                    handled = true;
                }
                if (id) lastHandledNotifIdRef.current = id;
            } catch { }
        };

        // Cold start: process the last response, if any
        Notifications.getLastNotificationResponseAsync?.().then((resp) => {
            if (resp) handleResponse(resp);
        }).catch(() => { });

        notifResponseSubRef.current = Notifications.addNotificationResponseReceivedListener(handleResponse);

        return () => {
            try {
                if (notifResponseSubRef.current && Notifications?.removeNotificationSubscription) {
                    Notifications.removeNotificationSubscription(notifResponseSubRef.current);
                }
            } catch { }
            notifResponseSubRef.current = null;
        };
    }, [notificationsRef.current, prefetchChatData, tryNavigateToPendingChat, processFeedNotificationTarget, attemptNavigateToNotifications, scheduleNotificationsNavigation]);

    useEffect(() => () => {
        if (pendingFeedNavTimerRef.current) {
            try { clearTimeout(pendingFeedNavTimerRef.current); } catch { }
            pendingFeedNavTimerRef.current = null;
        }
    }, []);

    useEffect(() => () => {
        if (pendingNotificationsTimerRef.current) {
            try { clearTimeout(pendingNotificationsTimerRef.current); } catch { }
            pendingNotificationsTimerRef.current = null;
        }
        pendingNotificationsNavRef.current = false;
    }, []);

    // Request push permissions and register token on login
    useEffect(() => {
        const cleanupSubscriptions = () => {
            const current = unsubRef.current;
            if (!current) return;
            try { current?.public?.(); } catch { }
            try { current?.private?.(); } catch { }
            unsubRef.current = null;
        };

        cleanupSubscriptions();
        setUserReady(false);

        const uid = uidRef.current;
        if (!isAuthenticated || !uid) {
            return () => {
                cleanupSubscriptions();
                stopNotificationsListener();
            };
        }

        latestUserPublicRef.current = null;
        latestUserPrivateRef.current = null;

        const mergeAndApply = async (nextPublic, nextPrivate, meta = {}) => {
            const { publicExists, privateExists } = meta;
            if (nextPublic) latestUserPublicRef.current = nextPublic;
            if (nextPrivate) latestUserPrivateRef.current = nextPrivate;

            const hasPublic = publicExists !== undefined
                ? publicExists
                : !!(latestUserPublicRef.current && Object.keys(latestUserPublicRef.current).length);
            const hasPrivate = privateExists !== undefined
                ? privateExists
                : !!(latestUserPrivateRef.current && Object.keys(latestUserPrivateRef.current).length);

            if (!hasPublic && !hasPrivate) {
                latestUserPublicRef.current = null;
                latestUserPrivateRef.current = null;
                setUserReady(false);
                try {
                    global.userData = {};
                    emitUserDataUpdate();
                } catch { }
                return;
            }

            const publicData = latestUserPublicRef.current || {};
            const privateData = latestUserPrivateRef.current || {};
            const mergedData = withLegacyPhotoFields({ uid, ...publicData, ...privateData });

            try {
                global.userData = mergedData;
                global.__lastKnownUid = uid;
                emitUserDataUpdate();
            } catch { }
            setUserReady(true);
            ensureNotificationsListener(uid);
            try {
                const maybeRefresh = refreshCommunityStats({ force: true });
                if (maybeRefresh && typeof maybeRefresh.catch === 'function') {
                    maybeRefresh.catch(() => { });
                }
            } catch { }

            const messagesArr = Array.isArray(mergedData.messages) ? mergedData.messages : [];
            const sig = (() => {
                if (!messagesArr.length) return 'len:0';
                const mids = messagesArr
                    .map((entry) => String(entry?.mid || ''))
                    .filter((mid) => mid.length > 0);
                return `len:${mids.length}:${mids.join('|')}`;
            })();
            if (prevMessagesSigRef.current !== sig) {
                prevMessagesSigRef.current = sig;
                // Messaging is disabled: conversations are no longer preloaded.
                // preloadMessagesForUid(uid, { userDoc: mergedData }).catch(() => { });
            }

            // Register for push notifications (EAS project id required)
            try {
                if (Device.isDevice && notificationsRef.current) {
                    const wantsPush = (mergedData?.settings?.push !== false);
                    if (!wantsPush && mergedData?.expoPushToken) {
                        try {
                            await updateDoc('usersPrivate', uid, { expoPushToken: '' });
                            try { global.userData.expoPushToken = ''; } catch { }
                        } catch { }
                    }
                    if (!wantsPush) return;
                    const { status: existingStatus } = await notificationsRef.current.getPermissionsAsync();
                    let finalStatus = existingStatus;
                    if (existingStatus !== 'granted') {
                        const { status } = await notificationsRef.current.requestPermissionsAsync();
                        finalStatus = status;
                    }
                    if (finalStatus === 'granted') {
                        const token = await notificationsRef.current.getExpoPushTokenAsync({ projectId: '6cd30997-3609-4c85-9f1f-6e2391e0b736' });
                        const t = token?.data || '';
                        if (t && t !== (mergedData?.expoPushToken || '')) {
                            await updateDoc('usersPrivate', uid, { expoPushToken: t });
                            try { global.userData.expoPushToken = t; } catch { }
                        }
                    }
                }
            } catch (e) { console.log('Push registration error', e?.message || e); }

            // Vibrate on unread messages count increase (skip when in Chat)
            try {
                const nextCount = Number(mergedData?.unreadMessagesCount || 0);
                if (prevUnreadMsgRef.current === null || prevUnreadMsgRef.current === undefined) {
                    prevUnreadMsgRef.current = nextCount;
                } else if (Number.isFinite(nextCount) && nextCount > prevUnreadMsgRef.current) {
                    let route = null;
                    try { if (navigationRef?.isReady?.() && navigationRef?.getCurrentRoute) { route = navigationRef.getCurrentRoute(); } } catch { }
                    if (!route || route?.name !== 'Chat') {
                        const soundsOn = (mergedData?.settings?.sounds !== false);
                        if (soundsOn) buzzOnce();
                    }
                    prevUnreadMsgRef.current = nextCount;
                } else {
                    prevUnreadMsgRef.current = nextCount;
                }
            } catch { }
        };

        const publicRef = doc(db, 'usersPublic', uid);
        const privateRef = doc(db, 'usersPrivate', uid);

        const unsubPublic = onSnapshot(publicRef, (snap) => {
            const data = snap.exists() ? (snap.data() || {}) : null;
            mergeAndApply(data, null, { publicExists: snap.exists() }).catch(() => {});
            backfillJoinDate(uid, data).catch(() => {});
        }, (err) => {
            console.warn('User public document subscription error:', err?.message || err);
        });

        const unsubPrivate = onSnapshot(privateRef, (snap) => {
            const data = snap.exists() ? (snap.data() || {}) : null;
            mergeAndApply(null, data, { privateExists: snap.exists() }).catch(() => {});
        }, (err) => {
            console.warn('User private document subscription error:', err?.message || err);
        });

        unsubRef.current = { public: unsubPublic, private: unsubPrivate };

        return () => {
            cleanupSubscriptions();
            stopNotificationsListener();
        };
    }, [isAuthenticated]);

    // Safety: ensure authChecked resolves even if AsyncStorage is slow
    useEffect(() => {
        if (authChecked) return;
        const id = setTimeout(() => { setAuthChecked(true); }, 2000);
        return () => clearTimeout(id);
    }, [authChecked]);


    // ---------- Rest Reminder (global) ----------
    const [restReminderVisible, setRestReminderVisible] = useState(false);
    const [restReminderKey, setRestReminderKey] = useState(0);
    const restReminderCycleRef = useRef(0); // last cycle id surfaced in the modal
    const restAckRef = useRef(0); // last acknowledged cycle id (dismissed or opened)
    const notifListenerRef = useRef(null);
    useEffect(() => {
        global.triggerRestReminder = (cycleId = 0) => {
            try {
                // If this cycle is already acknowledged, do not show again
                const ack = Number(global.__restCycleAck || restAckRef.current || 0);
                if (cycleId && ack && cycleId === ack) return;
            } catch { }
            const soundsOn = (global?.userData?.settings?.sounds !== false);
            if (soundsOn) {
                try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch { }
                try { Vibration.vibrate(180); } catch { }
            }
            setRestReminderKey((k) => k + 1);
            restReminderCycleRef.current = Number(cycleId || 0);
            setRestReminderVisible(true);
        };
        return () => { try { global.triggerRestReminder = null; } catch { } };
    }, []);

    useEffect(() => {
        logoutCleanupRef.current = () => {
            try { pendingChatCidRef.current = null; } catch { }
            pendingChatDataRef.current = Object.create(null);
            setPendingChatGate({ cid: null, ready: true });
            setHasShownAppOnce(false);
            if (pendingNavTimerRef.current) {
                try { clearTimeout(pendingNavTimerRef.current); } catch { }
                pendingNavTimerRef.current = null;
            }
            if (pendingFeedNavTimerRef.current) {
                try { clearTimeout(pendingFeedNavTimerRef.current); } catch { }
                pendingFeedNavTimerRef.current = null;
            }
            pendingFeedTargetRef.current = null;
            pendingFeedValidationTokenRef.current = 0;
            if (pendingNotificationsTimerRef.current) {
                try { clearTimeout(pendingNotificationsTimerRef.current); } catch { }
                pendingNotificationsTimerRef.current = null;
            }
            pendingNotificationsNavRef.current = false;
            if (logoutResetTimerRef.current) {
                try { clearTimeout(logoutResetTimerRef.current); } catch { }
                logoutResetTimerRef.current = null;
            }
            const current = unsubRef.current;
            if (current) {
                try { current?.public?.(); } catch { }
                try { current?.private?.(); } catch { }
                unsubRef.current = null;
            }
            prevMessagesSigRef.current = '';
            resetMessagesState();
            stopNotificationsListener();
            if (notifUnsubRef.current) {
                try { notifUnsubRef.current(); } catch { }
                notifUnsubRef.current = null;
            }
            try {
                const Notifications = notificationsRef.current;
                if (notifResponseSubRef.current && Notifications?.removeNotificationSubscription) {
                    Notifications.removeNotificationSubscription(notifResponseSubRef.current);
                }
            } catch { }
            notifResponseSubRef.current = null;
            prevUnreadMsgRef.current = null;
            prevUnreadNotifRef.current = null;
            lastBuzzAtRef.current = 0;
            lastNotificationBuzzAtRef.current = 0;
            restReminderCycleRef.current = 0;
            restAckRef.current = 0;
            try { delete global.__restCycleAck; } catch { }
            setRestReminderVisible(false);

            const attemptReset = () => {
                try {
                    if (navigationRef?.isReady?.()) {
                        navigationRef.resetRoot({ index: 0, routes: [{ name: 'SignUp' }] });
                        logoutResetTimerRef.current = null;
                        return;
                    }
                } catch { }
                logoutResetTimerRef.current = setTimeout(attemptReset, 60);
            };
            attemptReset();
        };
        return () => {
            logoutCleanupRef.current = null;
            if (logoutResetTimerRef.current) {
                try { clearTimeout(logoutResetTimerRef.current); } catch { }
                logoutResetTimerRef.current = null;
            }
        };
    }, [setRestReminderVisible]);

    useEffect(() => {
        let cancelled = false;
        if (!isAuthenticated) {
            setCommunityStatsReady(true);
            return () => { cancelled = true; };
        }
        if (!userReady) {
            setCommunityStatsReady(false);
            return () => { cancelled = true; };
        }
        setCommunityStatsReady(false);
        initCommunityStats().then(() => {
            if (!cancelled) setCommunityStatsReady(true);
        }).catch(() => {
            if (!cancelled) setCommunityStatsReady(true);
        });
        return () => { cancelled = true; };
    }, [isAuthenticated, userReady]);

    // Unified buzz helper with simple throttle
    const buzzOnce = () => {
        const now = Date.now();
        if (now - lastBuzzAtRef.current < 600) return; // throttle to avoid double buzz
        lastBuzzAtRef.current = now;
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch { }
        try { Vibration.vibrate(180); } catch { }
    };

    // Also surface a modal whenever a notification is received while app is foreground
    useEffect(() => {
        try {
            const Notifications = notificationsRef.current;
            if (!Notifications) return;
            notifListenerRef.current = Notifications.addNotificationReceivedListener((evt) => {
                try {
                    // If it's a chat push and user is in Chat screen, skip buzz (Chat screen handles haptics)
                    try {
                        let route = null;
                        try {
                            if (navigationRef?.isReady?.() && navigationRef?.getCurrentRoute) {
                                route = navigationRef.getCurrentRoute();
                            }
                        } catch { }
                        const dtype = evt?.request?.content?.data?.type;
                        if (dtype === 'chat' && route?.name === 'Chat') {
                            // Still handle rest reminder modal detection below
                        } else {
                            const now = Date.now();
                            // Dedupe with unread snapshot buzzes
                            if (now - lastNotificationBuzzAtRef.current > 4000) {
                                const soundsOn = (global?.userData?.settings?.sounds !== false);
                                if (soundsOn) buzzOnce();
                                lastNotificationBuzzAtRef.current = now;
                            }
                        }
                    } catch { }
                    const title = String(evt?.request?.content?.title || '').toLowerCase();
                    // Prefer cycle-aware gating via data.cycleId
                    const cycleId = Number(evt?.request?.content?.data?.cycleId || 0);
                    const ack = Number(global.__restCycleAck || restAckRef.current || 0);
                    if (title.includes('rest complete')) {
                        if (!cycleId || !ack || cycleId !== ack) {
                            setRestReminderKey((k) => k + 1);
                            restReminderCycleRef.current = cycleId || restReminderCycleRef.current || 0;
                            setRestReminderVisible(true);
                        }
                    }
                } catch { }
            });
        } catch { }
        return () => {
            if (notifListenerRef.current && notificationsRef.current?.removeNotificationSubscription) {
                try { notificationsRef.current.removeNotificationSubscription(notifListenerRef.current); } catch { }
            }
            notifListenerRef.current = null;
        };
    }, []);

    // Global unread notifications watcher: vibrate on increase
    useEffect(() => {
        const uid = global?.userData?.uid;
        if (!uid) return;
        try {
            const notificationsRefFs = collection(db, 'usersPrivate', uid, 'notifications');
            const q = query(notificationsRefFs, where('read', '==', false));
            notifUnsubRef.current = onSnapshot(q, (snap) => {
                try {
                    const count = snap.size;
                    if (prevUnreadNotifRef.current === null || prevUnreadNotifRef.current === undefined) {
                        prevUnreadNotifRef.current = count;
                        return;
                    }
                    if (Number.isFinite(count) && count > prevUnreadNotifRef.current) {
                        const now = Date.now();
                        // If a foreground push just buzzed, skip this one (dedupe)
                        if (now - lastNotificationBuzzAtRef.current > 4000) {
                            const soundsOn = (global?.userData?.settings?.sounds !== false);
                            if (soundsOn) buzzOnce();
                            lastNotificationBuzzAtRef.current = now;
                        }
                    }
                    prevUnreadNotifRef.current = count;
                } catch { }
            });
        } catch { }
        return () => { if (notifUnsubRef.current) { try { notifUnsubRef.current(); } catch { } notifUnsubRef.current = null; } };
    }, [global?.userData?.uid]);

    usePresenceSync(uidRef, isAuthenticated, userReady);

    const [appForceReady, setAppForceReady] = useState(false);
    useEffect(() => {
        if (appForceReady) return;
        const id = setTimeout(() => setAppForceReady(true), 4500);
        return () => clearTimeout(id);
    }, [appForceReady]);
    const isAccountReady = isAuthenticated && userReady;
    const hasUserData = authChecked && (!isAuthenticated || userReady);
    const shouldWaitForAuthBackground = !isAccountReady;
    const baseAppReady = fontsReady
        && (hasUserData || appForceReady)
        && (communityStatsReady || appForceReady);
    const shouldBlockPendingChat = !hasShownAppOnce
        && !appForceReady
        && !!(pendingChatGate?.cid)
        && !pendingChatGate.ready;
    const appReady = baseAppReady && !shouldBlockPendingChat;

    useEffect(() => {
        if (appReady && !hasShownAppOnce) {
            setHasShownAppOnce(true);
        }
    }, [appReady, hasShownAppOnce]);

    // Hide splash only after the first layout to avoid white flash
    const [hasLaidOut, setHasLaidOut] = useState(false);
    const onLayoutRootView = useCallback(() => {
        setHasLaidOut(true);
        if (appReady
            && (!shouldWaitForAuthBackground || authBackgroundReadyRef.current)) {
            // Wait a frame after layout so content can paint before hiding splash
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    SplashScreen.hideAsync().catch(() => { });
                });
            });
        }
    }, [appReady, shouldWaitForAuthBackground]);

    // Safety: if readiness flips after initial layout, still hide splash
    useEffect(() => {
        if (appReady
            && hasLaidOut
            && (!shouldWaitForAuthBackground || authBackgroundReadyRef.current)) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    SplashScreen.hideAsync().catch(() => { });
                });
            });
        }
    }, [appReady, hasLaidOut, shouldWaitForAuthBackground]);

    // Absolute fallback: ensure splash hides even if layout event didn't fire
    useEffect(() => {
        if (appForceReady) {
            if (!authBackgroundReadyRef.current) {
                authBackgroundReadyRef.current = true;
                setAuthBackgroundReady(true);
            }
            setPendingChatGate({ cid: null, ready: true });
            SplashScreen.hideAsync().catch(() => { });
        }
    }, [appForceReady]);

    // While loading, keep a minimal root mounted for onLayout, but don't render UI
    if (!appReady) {
        return (
            <SafeAreaProviderWithStableInsets initialMetrics={initialWindowMetrics}>
                <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.bg }} onLayout={onLayoutRootView} />
            </SafeAreaProviderWithStableInsets>
        );
    }

    const dismissRestReminder = () => {
        // Acknowledge this cycle to avoid re-showing until a new timer starts
        try { const cid = Number(restReminderCycleRef.current || 0); if (cid) { global.__restCycleAck = cid; restAckRef.current = cid; } } catch { }
        setRestReminderVisible(false);
    };

    const handleOpenWorkoutFromReminder = () => {
        try {
            openActiveWorkout();
        } catch { }
        dismissRestReminder();
    };


return (
    <SafeAreaProviderWithStableInsets initialMetrics={initialWindowMetrics}>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.bg }} onLayout={onLayoutRootView}>
            {authChecked && (
                <NavigationContainer
                    ref={navigationRef}
                    onReady={handleNavigationStateUpdate}
                    onStateChange={handleNavigationStateUpdate}
                >
                    {/* Single root navigator with all screens */}
                    <RootNavigator isAccountReady={isAccountReady} uid={uidRef.current} />
                </NavigationContainer>
            )}
            <WorkoutInviteOverlay enabled={authChecked && isAuthenticated} />
            {authChecked && isAuthenticated && (
                <WorkoutExperiencePortal uid={uidRef.current} enabled />
            )}
            {authChecked && isAuthenticated && (
                <ActiveWorkoutBottomSheet
                    visibilityProgressSV={footerVisibilitySV}
                    isActive={isFooterVisible}
                    collapseProgressSV={workoutSheetProgressSV}
                />
            )}
            {authChecked && isAuthenticated && (
                <Footer
                    currentScreenName={currentTabName}
                    navigation={navigationRef.current}
                    isOverlay
                    visibilityProgressSV={footerVisibilitySV}
                    disableInteractions={!isFooterVisible}
                    workoutSheetProgressSV={workoutSheetProgressSV}
                />
            )}
            {isOffline && (
                <NoInternet
                    style={[StyleSheet.absoluteFillObject, { zIndex: 999 }]}
                />
            )}
            {/* Global Rest Reminder Modal */}
            <RestReminderModal
                key={`rest-reminder-${restReminderKey}`}
                visible={restReminderVisible}
                onDismiss={dismissRestReminder}
                onOpen={handleOpenWorkoutFromReminder}
            />
        </GestureHandlerRootView>
    </SafeAreaProviderWithStableInsets>
);
}
