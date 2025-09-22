import 'react-native-gesture-handler';
import 'expo-dev-client';
// Reanimated global side effects (must be imported at the top-level)
import 'react-native-reanimated';
// Polyfills required by Firebase Storage in RN (atob/btoa)
import './frontend/polyfills/base64';
import React, { useEffect, useRef, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer } from '@react-navigation/native';
// Lazy-load expo-notifications to avoid native module errors on simulator
// and in dev clients that weren't rebuilt with the module.
import * as Device from 'expo-device';
import { navigationRef } from './navigationRef';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStackNavigator, CardStyleInterpolators, TransitionSpecs } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, Modal, View, Text, Pressable, StyleSheet, Dimensions, Vibration, TextInput, LogBox } from 'react-native';
import { rs, ts } from './frontend/helper/scaleSize';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableScreens, enableFreeze } from 'react-native-screens';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { customFonts } from './fonts';
import { db } from './firebase.config';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';

/* Screens */
import SignUp from './frontend/screens/0.0_SignUp';
import LogIn from './frontend/screens/0.1_LogIn';
import NewUserCreation from './frontend/screens/0.2_NewUserCreation';
import UserLogInCredentials from './frontend/screens/0.3_UserLogInCredentials';
import Feed from './frontend/screens/FeedScreen';
import Profile from './frontend/screens/5_Profile';
import SelectPhotosScreen from './frontend/components/5_Profile/MakePost/SelectPhotosScreen';
import PostUploadOptionsScreen from './frontend/components/5_Profile/MakePost/PostUploadOptionsScreen';
import Explore from './frontend/screens/4_Explore';
import Workout from './frontend/screens/3_Workout';
import Competition from './frontend/screens/2_Competition';
import Messages from './frontend/screens/1.1_Messages';
import Chat from './frontend/screens/1.2_Chat';
import ViewProfile from './frontend/screens/4.1_ViewProfile';
import MacroTracking from './frontend/screens/MacroTracking';
import FoodDetail from './frontend/screens/FoodDetail';
import SearchUsers from './frontend/screens/SearchUsers';
import Settings from './frontend/screens/Settings';
import PrivacyPolicy from './frontend/screens/PrivacyPolicy';
import TermsOfService from './frontend/screens/TermsOfService';
import Credits from './frontend/screens/Credits';
import PrivateProfileInfo from './frontend/screens/PrivateProfileInfo';
import DeleteAccount from './frontend/screens/DeleteAccount';
// Dark theme palette
import theme from './frontend/theme/mfpDark';
import ActiveWorkoutBottomSheet from './frontend/components/3_Workout/NewWorkout/ActiveWorkoutBottomSheet';

// Ensure a defined global.userData early so screens can read without crashing
try { global.userData = global.userData || {}; } catch {}

const NativeStack = createNativeStackNavigator();

// Single root stack: iOS uses classic stack for left-slide; Android uses native-stack for perf
const RootStack = Platform.OS === 'ios' ? createStackNavigator() : createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Enable native screens for reduced memory and faster transitions
enableScreens(true);
enableFreeze(true);

// (no screens optimization toggles — use defaults)

// Keep native splash screen visible while we preload fonts and hydrate auth
try { SplashScreen.preventAutoHideAsync(); } catch {}

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
} catch {}

/* No nested stacks; everything registers on RootStack */

/* ---------- Universal One-Way Overlay ---------- */
// Register the screens you want to be able to open as one-way overlays
const OVERLAY_SCREENS = {
    MacroTracking,
    Competition,
    ViewProfile,
    SearchUsers,
    Feed,
    Workout,
    Profile,
    Messages,
    Chat,
};

const OneWayScreen = ({ route, navigation }) => {
    const { target, params } = route?.params || {};
    const Comp = target ? OVERLAY_SCREENS[target] : null;
    if (!Comp) return null;
    // Provide a route shape so child screens can read route.params as usual
    const childRoute = { key: `${target}-overlay`, name: target, params };
    return <Comp navigation={navigation} route={childRoute} />;
};

// Stable Tabs component defined outside of App to avoid identity churn
function Tabs({ route }) {
    const Tab = createBottomTabNavigator();
    return (
        <Tab.Navigator
            initialRouteName="Workout"
            screenOptions={{
                headerShown: false,
                tabBarStyle: { display: 'none' },
                lazy: false,
                unmountOnBlur: false,
                detachInactiveScreens: false,
                freezeOnBlur: true,
            }}
        >
            <Tab.Screen name="Feed" component={Feed} initialParams={route?.params || {}} />
            <Tab.Screen name="MacroTracking" component={MacroTracking} />
            <Tab.Screen name="Workout" component={Workout} initialParams={route?.params || {}} />
            <Tab.Screen name="Competition" component={Competition} />
            <Tab.Screen name="Profile" component={Profile} />
        </Tab.Navigator>
    );
}

export default function App() {
    // Load every registered font (frontend/fonts.js) before hiding the splash screen
    const [fontsReady] = useFonts(customFonts);
    const [authChecked, setAuthChecked] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userReady, setUserReady] = useState(false);
    const uidRef = useRef(null);
    const unsubRef = useRef(null);
    const notifUnsubRef = useRef(null);
    const prevUnreadNotifRef = useRef(null);
    const prevUnreadMsgRef = useRef(null);
    const lastBuzzAtRef = useRef(0);
    const lastNotificationBuzzAtRef = useRef(0); // dedupe foreground push vs unread snapshot
    const logoutCleanupRef = useRef(null);
    const logoutResetTimerRef = useRef(null);

    useEffect(() => {
        // Expose a minimal auth setter so login/signup can notify App immediately
        // AsyncStorage.clear();

        global.setAuthUid = (uid) => {
            const normalizedUid = uid ? String(uid) : null;
            try {
                if (normalizedUid) {
                    AsyncStorage.setItem('uid', normalizedUid).catch(() => {});
                } else {
                    AsyncStorage.removeItem('uid').catch(() => {});
                }
            } catch {}
            if (!normalizedUid) {
                try { logoutCleanupRef.current?.(); } catch {}
                uidRef.current = null;
                setUserReady(false);
                try { global.userData = {}; } catch {}
            } else {
                if (logoutResetTimerRef.current) {
                    try { clearTimeout(logoutResetTimerRef.current); } catch {}
                    logoutResetTimerRef.current = null;
                }
                uidRef.current = normalizedUid;
            }
            setIsAuthenticated(!!normalizedUid);
        };

        global.logout = () => {
            try { global.setAuthUid?.(null); } catch {}
        };

        (async () => {
            try {
                const uid = await AsyncStorage.getItem('uid');
                if (uid) { uidRef.current = uid; setIsAuthenticated(true); }
                else { setIsAuthenticated(false); setUserReady(false); }
            } catch (err) { console.error(err); }
            finally { setAuthChecked(true); }
        })();
        return () => {
            try { delete global.setAuthUid; delete global.logout; } catch {}
        };
    }, []);

    // Hydrate global.userData as early as possible when authenticated
    // Foreground notification behavior (show banner + play sound)
    // Load notifications module conditionally to prevent crashes on iOS simulator
    // when the dev client doesn't include expo-notifications.
    const notificationsRef = useRef(null);
    const notifResponseSubRef = useRef(null);
    const lastHandledNotifIdRef = useRef(null);
    const pendingChatCidRef = useRef(null);
    const pendingNavTimerRef = useRef(null);
    useEffect(() => {
        let mounted = true;
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const Notifications = require('expo-notifications');
            if (!mounted) return;
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
                }).catch(() => {});
            }
        } catch (e) {
            if (__DEV__) console.log('expo-notifications unavailable:', e?.message || e);
        }
        return () => { mounted = false; };
    }, []);

    // Navigate to Chat when a push notification response is tapped.
    const tryNavigateToPendingChat = React.useCallback(() => {
        const cid = pendingChatCidRef.current;
        if (!cid) return false;
        // Require auth and a ready nav container
        if (!isAuthenticated) return false;
        try {
            const { navigateRoot, navigationRef: navObj } = require('./navigationRef');
            // If already on this Chat, consume and skip extra navigation
            try {
                if (navObj?.isReady?.() && navObj?.getCurrentRoute) {
                    const route = navObj.getCurrentRoute();
                    const rcid = route?.params?.data?.cid || route?.params?.cid;
                    if (route?.name === 'Chat' && rcid && String(rcid) === String(cid)) {
                        pendingChatCidRef.current = null;
                        return true;
                    }
                }
            } catch {}

            const ok = navigateRoot && navigateRoot('Chat', { data: { cid }, usersExcludingSelf: [] });
            if (ok) {
                pendingChatCidRef.current = null;
                return true;
            }
        } catch {}
        return false;
    }, [isAuthenticated]);

    useEffect(() => {
        // If a pending deep link exists and auth just became ready, attempt navigation
        if (pendingChatCidRef.current) {
            // clear any previous timer
            if (pendingNavTimerRef.current) { try { clearTimeout(pendingNavTimerRef.current); } catch {} pendingNavTimerRef.current = null; }
            // try immediately; if not ready, retry shortly
            const attempt = () => {
                if (tryNavigateToPendingChat()) return;
                pendingNavTimerRef.current = setTimeout(attempt, 250);
            };
            attempt();
        }
        return () => {
            if (pendingNavTimerRef.current) { try { clearTimeout(pendingNavTimerRef.current); } catch {} pendingNavTimerRef.current = null; }
        };
    }, [isAuthenticated, tryNavigateToPendingChat]);

    // Attach response listener and handle cold-start notification response
    useEffect(() => {
        const Notifications = notificationsRef.current;
        if (!Notifications) return;

        const handleResponse = (resp) => {
            try {
                const id = resp?.notification?.request?.identifier;
                if (id && lastHandledNotifIdRef.current === id) return; // dedupe
                const data = resp?.notification?.request?.content?.data || {};
                const type = data?.type;
                if (type === 'chat' && data?.cid) {
                    pendingChatCidRef.current = String(data.cid);
                    // Try now or queue until ready
                    if (!tryNavigateToPendingChat()) {
                        // Navigation not ready yet; a separate effect will retry
                    }
                }
                if (id) lastHandledNotifIdRef.current = id;
            } catch {}
        };

        // Cold start: process the last response, if any
        Notifications.getLastNotificationResponseAsync?.().then((resp) => {
            if (resp) handleResponse(resp);
        }).catch(() => {});

        notifResponseSubRef.current = Notifications.addNotificationResponseReceivedListener(handleResponse);

        return () => {
            try {
                if (notifResponseSubRef.current && Notifications?.removeNotificationSubscription) {
                    Notifications.removeNotificationSubscription(notifResponseSubRef.current);
                }
            } catch {}
            notifResponseSubRef.current = null;
        };
    }, [notificationsRef.current, tryNavigateToPendingChat]);

    // Request push permissions and register token on login
    useEffect(() => {
        // cleanup previous subscription
        if (unsubRef.current) { try { unsubRef.current(); } catch {} unsubRef.current = null; }
        setUserReady(false);

        const uid = uidRef.current;
        if (!isAuthenticated || !uid) return;
        const ref = doc(db, 'users', uid);
        unsubRef.current = onSnapshot(ref, async (snap) => {
            try { global.userData = { uid, ...(snap.data() || {}) }; } catch {}
            setUserReady(true);

            // Register for push notifications (EAS project id required)
            try {
                if (Device.isDevice && notificationsRef.current) {
                    const wantsPush = (global?.userData?.settings?.push !== false);
                    // If user disabled push and we previously had a token, clear it
                    if (!wantsPush && global?.userData?.expoPushToken) {
                        try {
                            const updateDoc = require('./backend/helper/firebase/updateDoc').default;
                            await updateDoc('users', uid, { expoPushToken: '' });
                            try { global.userData.expoPushToken = ''; } catch {}
                        } catch {}
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
                        if (t && t !== (global?.userData?.expoPushToken || '')) {
                            const updateDoc = require('./backend/helper/firebase/updateDoc').default;
                            await updateDoc('users', uid, { expoPushToken: t });
                            try { global.userData.expoPushToken = t; } catch {}
                        }
                    }
                }
            } catch (e) { console.log('Push registration error', e?.message || e); }
            // Vibrate on unread messages count increase (skip when in Chat)
            try {
                const data = snap.data() || {};
                const nextCount = Number(data?.unreadMessagesCount || 0);
                if (prevUnreadMsgRef.current === null || prevUnreadMsgRef.current === undefined) {
                    prevUnreadMsgRef.current = nextCount;
                } else if (Number.isFinite(nextCount) && nextCount > prevUnreadMsgRef.current) {
                    let route = null;
                    try { if (navigationRef?.isReady?.() && navigationRef?.getCurrentRoute) { route = navigationRef.getCurrentRoute(); } } catch {}
                    if (!route || route?.name !== 'Chat') {
                        const soundsOn = (global?.userData?.settings?.sounds !== false);
                        if (soundsOn) buzzOnce();
                    }
                    prevUnreadMsgRef.current = nextCount;
                } else {
                    prevUnreadMsgRef.current = nextCount;
                }
            } catch {}
        }, (err) => {
            console.warn('User document subscription error:', err?.message || err);
            // proceed but keep ready false to avoid crashing screens
        });
        return () => { if (unsubRef.current) { try { unsubRef.current(); } catch {} unsubRef.current = null; } };
    }, [isAuthenticated]);

    // Safety: if user doc doesn't arrive promptly (offline, slow network), proceed with minimal data
    useEffect(() => {
        if (!isAuthenticated || userReady) return;
        const id = setTimeout(() => {
            if (!userReady) {
                try { const uid = uidRef.current; global.userData = { ...(global.userData || {}), uid, id: uid }; } catch {}
                setUserReady(true);
            }
        }, 2500);
        return () => clearTimeout(id);
    }, [isAuthenticated, userReady]);

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
            } catch {}
            const soundsOn = (global?.userData?.settings?.sounds !== false);
            if (soundsOn) {
                try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
                try { Vibration.vibrate(180); } catch {}
            }
            setRestReminderKey((k) => k + 1);
            restReminderCycleRef.current = Number(cycleId || 0);
            setRestReminderVisible(true);
        };
        return () => { try { global.triggerRestReminder = null; } catch {} };
    }, []);

    useEffect(() => {
        logoutCleanupRef.current = () => {
            try { pendingChatCidRef.current = null; } catch {}
            if (pendingNavTimerRef.current) {
                try { clearTimeout(pendingNavTimerRef.current); } catch {}
                pendingNavTimerRef.current = null;
            }
            if (logoutResetTimerRef.current) {
                try { clearTimeout(logoutResetTimerRef.current); } catch {}
                logoutResetTimerRef.current = null;
            }
            if (unsubRef.current) {
                try { unsubRef.current(); } catch {}
                unsubRef.current = null;
            }
            if (notifUnsubRef.current) {
                try { notifUnsubRef.current(); } catch {}
                notifUnsubRef.current = null;
            }
            try {
                const Notifications = notificationsRef.current;
                if (notifResponseSubRef.current && Notifications?.removeNotificationSubscription) {
                    Notifications.removeNotificationSubscription(notifResponseSubRef.current);
                }
            } catch {}
            notifResponseSubRef.current = null;
            prevUnreadMsgRef.current = null;
            prevUnreadNotifRef.current = null;
            lastBuzzAtRef.current = 0;
            lastNotificationBuzzAtRef.current = 0;
            restReminderCycleRef.current = 0;
            restAckRef.current = 0;
            try { delete global.__restCycleAck; } catch {}
            setRestReminderVisible(false);

            const attemptReset = () => {
                try {
                    if (navigationRef?.isReady?.()) {
                        navigationRef.resetRoot({ index: 0, routes: [{ name: 'SignUp' }] });
                        logoutResetTimerRef.current = null;
                        return;
                    }
                } catch {}
                logoutResetTimerRef.current = setTimeout(attemptReset, 60);
            };
            attemptReset();
        };
        return () => {
            logoutCleanupRef.current = null;
            if (logoutResetTimerRef.current) {
                try { clearTimeout(logoutResetTimerRef.current); } catch {}
                logoutResetTimerRef.current = null;
            }
        };
    }, [setRestReminderVisible]);

    // Unified buzz helper with simple throttle
    const buzzOnce = () => {
        const now = Date.now();
        if (now - lastBuzzAtRef.current < 600) return; // throttle to avoid double buzz
        lastBuzzAtRef.current = now;
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        try { Vibration.vibrate(180); } catch {}
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
                        } catch {}
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
                    } catch {}
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
                } catch {}
            });
        } catch {}
        return () => {
            if (notifListenerRef.current && notificationsRef.current?.removeNotificationSubscription) {
                try { notificationsRef.current.removeNotificationSubscription(notifListenerRef.current); } catch {}
            }
            notifListenerRef.current = null;
        };
    }, []);

    // Global unread notifications watcher: vibrate on increase
    useEffect(() => {
        const uid = global?.userData?.uid;
        if (!uid) return;
        try {
            const notificationsRefFs = collection(db, 'users', uid, 'notifications');
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
                } catch {}
            });
        } catch {}
        return () => { if (notifUnsubRef.current) { try { notifUnsubRef.current(); } catch {} notifUnsubRef.current = null; } };
    }, [global?.userData?.uid]);

    const [appForceReady, setAppForceReady] = useState(false);
    const hubRowReadyRef = useRef(false);
    const [hubRowReady, setHubRowReady] = useState(false);

    useEffect(() => {
        try {
            global.__markHubRowReady = () => {
                if (!hubRowReadyRef.current) {
                    hubRowReadyRef.current = true;
                    setHubRowReady(true);
                }
            };
        } catch {}
        return () => {
            try { delete global.__markHubRowReady; } catch {}
        };
    }, []);

    useEffect(() => {
        const waitForHubRow = isAuthenticated;
        if (!waitForHubRow) {
            if (!hubRowReadyRef.current || !hubRowReady) {
                hubRowReadyRef.current = true;
                setHubRowReady(true);
            }
            return;
        }
        hubRowReadyRef.current = false;
        setHubRowReady(false);
    }, [isAuthenticated]);
    useEffect(() => {
        if (appForceReady) return;
        const id = setTimeout(() => setAppForceReady(true), 4500);
        return () => clearTimeout(id);
    }, [appForceReady]);
    const hasUserData = authChecked && (!isAuthenticated || userReady);
    const shouldWaitForHubRow = isAuthenticated;
    const appReady = fontsReady && (hasUserData || appForceReady);

    // Hide splash only after the first layout to avoid white flash
    const [hasLaidOut, setHasLaidOut] = useState(false);
    const onLayoutRootView = React.useCallback(() => {
        setHasLaidOut(true);
        if (appReady && (!shouldWaitForHubRow || hubRowReady)) {
            // Wait a frame after layout so content can paint before hiding splash
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    SplashScreen.hideAsync().catch(() => {});
                });
            });
        }
    }, [appReady, hubRowReady, shouldWaitForHubRow]);

    // Safety: if readiness flips after initial layout, still hide splash
    useEffect(() => {
        if (appReady && hasLaidOut && (!shouldWaitForHubRow || hubRowReady)) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    SplashScreen.hideAsync().catch(() => {});
                });
            });
        }
    }, [appReady, hasLaidOut, hubRowReady, shouldWaitForHubRow]);

    // Absolute fallback: ensure splash hides even if layout event didn't fire
    useEffect(() => {
        if (appForceReady) {
            hubRowReadyRef.current = true;
            setHubRowReady(true);
            SplashScreen.hideAsync().catch(() => {});
        }
    }, [appForceReady]);

    // While loading, keep a minimal root mounted for onLayout, but don't render UI
    if (!appReady) {
        return (
            <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#ffffff' }} onLayout={onLayoutRootView} />
        );
    }

    // Tabs is a stable component defined outside App to avoid remounts and extra hooks
    // No global suppression by default; handled within target screens only


    const handleOpenWorkoutFromReminder = () => {
        try {
            const { jumpToTab } = require('./navigationRef');
            if (jumpToTab) jumpToTab('Workout');
            try { global.openCurrentWorkoutSignal = Date.now(); } catch {}
        } catch {}
        // Acknowledge this cycle to avoid re-showing until a new timer starts
        try { const cid = Number(restReminderCycleRef.current || 0); if (cid) { global.__restCycleAck = cid; restAckRef.current = cid; } } catch {}
        setRestReminderVisible(false);
    };


    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.bg }} onLayout={onLayoutRootView}>
            {authChecked && (
            <NavigationContainer ref={navigationRef}>
                {/* Single root navigator with all screens */}
                <RootStack.Navigator
                    id="ROOT"
                    key={isAuthenticated ? 'auth' : 'guest'}
                    initialRouteName={isAuthenticated ? 'Tabs' : 'SignUp'}
                    screenOptions={({ route }) => {
                        const transition = route?.params?.transition; // 'slide-from-left' | 'slide-from-right' | 'fade' | 'none'
                        const isFade = transition === 'fade';
                        const isSlideLeft = transition === 'slide-from-left';
                        const isNone = transition === 'none';
                        return Platform.select({
                            ios: {
                                headerShown: false,
                                gestureEnabled: !isNone,
                                // Make back-swipe easier to trigger by expanding the response area
                                // from the default ~30px to a wider edge (approx 140px).
                                // Use a numeric value for broad compatibility with stack v6.
                                gestureResponseDistance: Math.min(200, Dimensions.get('window').width),
                                animationEnabled: !isNone,
                                gestureDirection: isSlideLeft ? 'horizontal-inverted' : 'horizontal',
                                cardStyleInterpolator: isFade
                                    ? CardStyleInterpolators.forFadeFromCenter
                                    : CardStyleInterpolators.forHorizontalIOS,
                                transitionSpec: {
                                    open: TransitionSpecs.TransitionIOSSpec,
                                    close: TransitionSpecs.TransitionIOSSpec,
                                },
                            },
                            android: {
                                headerShown: false,
                                gestureEnabled: !isNone,
                                fullScreenGestureEnabled: !isNone,
                                animation: isNone
                                    ? 'none'
                                    : (isFade
                                        ? 'fade'
                                        : (isSlideLeft ? 'slide_from_left' : 'slide_from_right')),
                            },
                            default: { headerShown: false, gestureEnabled: true },
                        });
                    }}
                >
                    {/* Auth screens */}
                    <RootStack.Screen name="SignUp" component={SignUp} />
                    <RootStack.Screen name="LogIn" component={LogIn} />
                    <RootStack.Screen name="NewUserCreation" component={NewUserCreation} />
                    <RootStack.Screen name="UserLogInCredentials" component={UserLogInCredentials} />

                    {/* Main tabs (kept mounted). Force no animation when focusing Tabs. */}
                    <RootStack.Screen
                        name="Tabs"
                        component={Tabs}
                        initialParams={{ uid: uidRef.current, transition: 'none' }}
                        options={Platform.select({
                            ios: {
                                headerShown: false,
                                animationEnabled: false,
                                gestureEnabled: false,
                                cardStyleInterpolator: CardStyleInterpolators.forNoAnimation,
                            },
                            android: {
                                headerShown: false,
                                gestureEnabled: false,
                                fullScreenGestureEnabled: false,
                                animation: 'none',
                            },
                            default: { headerShown: false },
                        })}
                    />

                    {/* Peer screens for one-way transitions */}
                    <RootStack.Screen name="Feed" component={Feed} initialParams={{ uid: uidRef.current }} />

                    {/* Overlay-capable peers with one-way (no close) animation on iOS */}
                    <RootStack.Screen
                        name="MacroTracking"
                        component={MacroTracking}
                        options={({ route }) => Platform.select({
                            ios: {
                                gestureEnabled: true,
                                gestureDirection: route?.params?.transition === 'slide-from-left' ? 'horizontal-inverted' : 'horizontal',
                                cardStyleInterpolator: route?.params?.transition === 'fade'
                                    ? CardStyleInterpolators.forFadeFromCenter
                                    : CardStyleInterpolators.forHorizontalIOS,
                                transitionSpec: {
                                    open: TransitionSpecs.TransitionIOSSpec,
                                    close: { animation: 'timing', config: { duration: 0 } },
                                },
                            },
                            android: {
                                gestureEnabled: true,
                                fullScreenGestureEnabled: true,
                                animation: route?.params?.transition === 'fade'
                                    ? 'fade'
                                    : (route?.params?.transition === 'slide-from-left' ? 'slide_from_left' : 'slide_from_right'),
                            },
                            default: {},
                        })}
                    />

                    <RootStack.Screen
                        name="Workout"
                        component={Workout}
                        initialParams={{ uid: uidRef.current }}
                        options={({ route }) => Platform.select({
                            ios: {
                                gestureEnabled: true,
                                gestureDirection: route?.params?.transition === 'slide-from-left' ? 'horizontal-inverted' : 'horizontal',
                                cardStyleInterpolator: route?.params?.transition === 'fade'
                                    ? CardStyleInterpolators.forFadeFromCenter
                                    : CardStyleInterpolators.forHorizontalIOS,
                                transitionSpec: {
                                    open: TransitionSpecs.TransitionIOSSpec,
                                    close: { animation: 'timing', config: { duration: 0 } },
                                },
                            },
                            android: {
                                gestureEnabled: true,
                                fullScreenGestureEnabled: true,
                                animation: route?.params?.transition === 'fade'
                                    ? 'fade'
                                    : (route?.params?.transition === 'slide-from-left' ? 'slide_from_left' : 'slide_from_right'),
                            },
                            default: {},
                        })}
                    />

                    <RootStack.Screen
                        name="Competition"
                        component={Competition}
                        options={({ route }) => {
                            const isSlideLeft = route?.params?.transition === 'slide-from-left';
                            const isFade = route?.params?.transition === 'fade';
                            const noSwipe = !!route?.params?.disableSwipeBack;
                            return Platform.select({
                                ios: {
                                    gestureEnabled: !noSwipe,
                                    gestureDirection: isSlideLeft ? 'horizontal-inverted' : 'horizontal',
                                    cardStyleInterpolator: isFade
                                        ? CardStyleInterpolators.forFadeFromCenter
                                        : CardStyleInterpolators.forHorizontalIOS,
                                    transitionSpec: {
                                        open: TransitionSpecs.TransitionIOSSpec,
                                        close: { animation: 'timing', config: { duration: 0 } },
                                    },
                                },
                                android: {
                                    gestureEnabled: !noSwipe,
                                    fullScreenGestureEnabled: !noSwipe,
                                    animation: isFade
                                        ? 'fade'
                                        : (isSlideLeft ? 'slide_from_left' : 'slide_from_right'),
                                },
                                default: {},
                            });
                        }}
                    />

                    <RootStack.Screen name="Profile" component={Profile} />
                    <RootStack.Screen name="Explore" component={Explore} />

                    {/* Messaging / social */}
                    <RootStack.Screen name="Messages" component={Messages} />
                    <RootStack.Screen
                        name="Chat"
                        component={Chat}
                        options={Platform.select({
                            ios: {
                                // Disable the native back swipe so Chat's custom gesture can fully control the transition.
                                gestureEnabled: false,
                                cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
                            },
                            android: {
                                gestureEnabled: true,
                                fullScreenGestureEnabled: true,
                                animation: 'slide_from_right',
                            },
                            default: {},
                        })}
                    />
                    <RootStack.Screen name="ViewProfile" component={ViewProfile} />
                    <RootStack.Screen name="SearchUsers" component={SearchUsers} />
                    <RootStack.Screen name="Settings" component={Settings} />
                    <RootStack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
                    <RootStack.Screen name="TermsOfService" component={TermsOfService} />
                    <RootStack.Screen name="Credits" component={Credits} />
                    <RootStack.Screen name="PrivateProfileInfo" component={PrivateProfileInfo} />
                    <RootStack.Screen name="DeleteAccount" component={DeleteAccount} />

                    {/* Creator */}
                    <RootStack.Screen name="SelectPhotos" component={SelectPhotosScreen} />
                    <RootStack.Screen name="PostOptions" component={PostUploadOptionsScreen} />
                    {/* Nutrition */}
                    <RootStack.Screen name="FoodDetail" component={FoodDetail} />
                </RootStack.Navigator>
            </NavigationContainer>
            )}
            <ActiveWorkoutBottomSheet />
            {/* Global Rest Reminder Modal */}
            <Modal
                key={`rest-reminder-${restReminderKey}`}
                visible={restReminderVisible}
                transparent
                animationType="fade"
                onRequestClose={() => { try { const cid = Number(restReminderCycleRef.current || 0); if (cid) { global.__restCycleAck = cid; restAckRef.current = cid; } } catch {}; setRestReminderVisible(false); }}
            >
                <Pressable style={restStyles.overlay} onPress={() => { try { const cid = Number(restReminderCycleRef.current || 0); if (cid) { global.__restCycleAck = cid; restAckRef.current = cid; } } catch {}; setRestReminderVisible(false); }}>
                    <View style={restStyles.card}>
                        <View style={restStyles.iconRow}>
                            <View style={restStyles.iconCircle}><Ionicons name="timer-outline" size={rs(26)} color={theme.accentBlue} /></View>
                        </View>
                        <Text style={restStyles.title}>Rest Complete</Text>
                        <Text style={restStyles.body}>Time to crush your next set 🥱</Text>
                        <View style={restStyles.row}>
                            <Pressable style={[restStyles.btn, restStyles.secondary]} onPress={() => { try { const cid = Number(restReminderCycleRef.current || 0); if (cid) { global.__restCycleAck = cid; restAckRef.current = cid; } } catch {}; setRestReminderVisible(false); }}>
                                <Ionicons name="close" size={rs(16)} color={theme.textPrimary} style={{ marginRight: rs(6) }} />
                                <Text style={[restStyles.btnText, restStyles.secondaryText]}>Dismiss</Text>
                            </Pressable>
                            <Pressable style={[restStyles.btn, restStyles.primary]} onPress={handleOpenWorkoutFromReminder}>
                                <MaterialCommunityIcons name="arm-flex" size={rs(18)} color="#fff" style={{ marginRight: rs(6) }} />
                                <Text style={[restStyles.btnText, restStyles.primaryText]}>Open</Text>
                            </Pressable>
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </GestureHandlerRootView>
    );
}

const restStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: rs(18),
    },
    card: {
        width: '90%',
        maxWidth: 380,
        backgroundColor: theme.surface,
        borderRadius: rs(18),
        paddingVertical: rs(16),
        paddingHorizontal: rs(16),
        alignItems: 'center',
        // Softer shadow on dark surfaces
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: rs(14), shadowOffset: { width: 0, height: rs(8) } },
            android: { elevation: 8 },
            default: {},
        }),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
    },
    iconRow: { marginBottom: rs(8) },
    iconCircle: {
        width: rs(46),
        height: rs(46),
        borderRadius: rs(23),
        backgroundColor: 'rgba(45,158,255,0.12)', // theme.primary @ 12%
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(45,158,255,0.45)',
    },
    title: { fontFamily: 'Outfit_800ExtraBold', fontSize: ts(18), color: theme.textPrimary, marginTop: rs(10) },
    body: { marginTop: rs(6), fontFamily: 'Outfit_600SemiBold', fontSize: ts(13), color: theme.textSecondary, textAlign: 'center' },
    row: { flexDirection: 'row', marginTop: rs(16), width: '100%', gap: rs(8) },
    btn: { flex: 1, paddingVertical: rs(11), borderRadius: rs(12), alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
    primary: {
        backgroundColor: theme.primary,
        ...Platform.select({ ios: { shadowColor: theme.primary, shadowOpacity: 0.28, shadowRadius: rs(10), shadowOffset: { width: 0, height: rs(4) } }, android: { elevation: 3 }, default: {} }),
    },
    primaryText: { color: '#fff' },
    secondary: { backgroundColor: theme.field, borderWidth: 1, borderColor: theme.hairline },
    secondaryText: { color: theme.textPrimary },
    btnText: { fontFamily: 'Outfit_700Bold', fontSize: ts(14) },
});
