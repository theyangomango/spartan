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
import { navigationRef } from './navigationRef';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStackNavigator, CardStyleInterpolators, TransitionSpecs } from '@react-navigation/stack';
import { Platform, Modal, View, Text, Pressable, StyleSheet, Dimensions, Vibration, TextInput, LogBox } from 'react-native';
import { rs, ts } from './frontend/helper/scaleSize';
import { useSharedValue, runOnUI, withTiming, Easing } from 'react-native-reanimated';
import { Entypo, FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Network from 'expo-network';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { enableScreens, enableFreeze } from 'react-native-screens';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { customFonts } from './fonts';
import { db } from './firebase.config';
import { doc, onSnapshot, collection, query, where, getDoc, getDocFromCache } from 'firebase/firestore';
import { initCommunityStats, refreshCommunityStats } from './frontend/logic/communityStats';
import { ensureAuthBackgroundAsync } from './frontend/utils/authBackground';

/* Screens */
import SignUp from './frontend/screens/0.0_SignUp';
import LogIn from './frontend/screens/0.1_LogIn';
import NewUserCreation from './frontend/screens/0.2_NewUserCreation';
import CreateUsername from './frontend/screens/0.4_CreateUsername';
import UserLogInCredentials from './frontend/screens/0.3_UserLogInCredentials';
import Feed from './frontend/screens/FeedScreen';
import Profile from './frontend/screens/5_Profile';
import SelectPhotosScreen from './frontend/components/5_Profile/MakePost/SelectPhotosScreen';
import PostUploadOptionsScreen from './frontend/components/5_Profile/MakePost/PostUploadOptionsScreen';
import Explore from './frontend/screens/4_Explore';
import Competition from './frontend/screens/2_Competition';
import ExerciseDetail from './frontend/screens/ExerciseDetail';
import Messages from './frontend/screens/1.1_Messages';
import Chat from './frontend/screens/1.2_Chat';
import ViewProfile from './frontend/screens/4.1_ViewProfile';
import PastWorkoutScreen from './frontend/screens/PastWorkoutScreen';
import MacroTracking from './frontend/screens/MacroTracking';
import Notifications from './frontend/screens/Notifications';
import FoodDetail from './frontend/screens/FoodDetail';
import SearchUsers from './frontend/screens/SearchUsers';
import Settings from './frontend/screens/Settings';
import PrivacyPolicy from './frontend/screens/PrivacyPolicy';
import TermsOfService from './frontend/screens/TermsOfService';
import Credits from './frontend/screens/Credits';
import PrivateProfileInfo from './frontend/screens/PrivateProfileInfo';
import DeleteAccount from './frontend/screens/DeleteAccount';
import ProfileWorkoutsAndPostsScreen from './frontend/screens/ProfileWorkoutsAndPostsScreen';
import ProfileLoggedFoodsScreen from './frontend/screens/ProfileLoggedFoodsScreen';
import WeightMeasurementsScreen from './frontend/screens/WeightMeasurementsScreen';
import NoInternet from './frontend/screens/NoInternet';
// Dark theme palette
import theme from './frontend/theme/mfpDark';
import ActiveWorkoutBottomSheet from './frontend/components/3_Workout/NewWorkout/ActiveWorkoutBottomSheet';
import WorkoutExperiencePortal from './frontend/components/3_Workout/WorkoutExperiencePortal';
import Footer from './frontend/components/Footer';
import MainTabs from './frontend/navigation/MainTabs';
import useFooterSuppressionStore, { setFooterSuppressed, clearFooterSuppression } from './frontend/state/footerSuppressionStore';
import { preloadMessagesForUid, resetMessagesState } from './frontend/logic/messagesPreloader';
import { ensureNotificationsListener, stopNotificationsListener } from './frontend/state/notificationsStore';
import WorkoutInviteOverlay from './frontend/components/WorkoutInviteOverlay';
import { openActiveWorkout } from './frontend/workout/workoutActions';

const PRELOADED_FONTS = {
    ...customFonts,
    ...Entypo.font,
    ...FontAwesome.font,
};

// Ensure a defined global.userData early so screens can read without crashing
try { global.userData = global.userData || {}; } catch { }
// Single root stack: iOS uses classic stack for left-slide; Android uses native-stack for perf
const RootStack = Platform.OS === 'ios' ? createStackNavigator() : createNativeStackNavigator();

const FOOTER_MAIN_SCREENS = ['Feed', 'MacroTracking', 'Competition', 'Profile'];
const FOOTER_ROUTE_TAB_OVERRIDES = {
    ViewProfile: 'Profile',
};

// Enable native screens for reduced memory and faster transitions
enableScreens(true);
enableFreeze(true);

// (no screens optimization toggles — use defaults)

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
    // Load every registered font (frontend/fonts.js) before hiding the splash screen
    const [fontsReady] = useFonts(PRELOADED_FONTS);
    const [authChecked, setAuthChecked] = useState(false);
    const [currentTabName, setCurrentTabName] = useState('Feed');
    const [isFooterNavEligible, setIsFooterNavEligible] = useState(false);
    const [isFooterVisible, setIsFooterVisible] = useState(false);
    const [isFeedPostFocused, setIsFeedPostFocused] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userReady, setUserReady] = useState(false);
    const [communityStatsReady, setCommunityStatsReady] = useState(false);
    const [authBackgroundReady, setAuthBackgroundReady] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [networkType, setNetworkType] = useState(null);
    const [lastNetworkCheck, setLastNetworkCheck] = useState(0);
    const [pendingChatGate, setPendingChatGate] = useState({ cid: null, ready: true });
    const [hasShownAppOnce, setHasShownAppOnce] = useState(false);
    const authBackgroundReadyRef = useRef(false);
    const feedOverlayProgressSV = useSharedValue(1);
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

    const evaluateNetworkState = useCallback((state) => {
        const timestamp = Date.now();
        setLastNetworkCheck(timestamp);
        if (!state || typeof state !== 'object') {
            return;
        }
        const offline = !state.isConnected || state.isInternetReachable === false;
        setIsOffline((prev) => (prev === offline ? prev : offline));
        const nextType = state.type || null;
        setNetworkType((prev) => (prev === nextType ? prev : nextType));
    }, []);

    const handleRetryNetwork = useCallback(() => {
        Network.getNetworkStateAsync()
            .then((state) => evaluateNetworkState(state))
            .catch(() => setLastNetworkCheck(Date.now()));
    }, [evaluateNetworkState]);

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

        if (!showFooter && isFeedPostFocused) {
            setIsFeedPostFocused(false);
            feedOverlayProgressSV.value = 1;
        }
    }, [currentTabName, isFeedPostFocused, feedOverlayProgressSV, setIsFooterNavEligible]);

    useEffect(() => {
        let mounted = true;
        Network.getNetworkStateAsync()
            .then((state) => { if (mounted) evaluateNetworkState(state); })
            .catch(() => { if (mounted) setLastNetworkCheck(Date.now()); });
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

    useEffect(() => {
        const setter = (id, suppressed) => {
            const key = typeof id === 'string' ? id : (id == null ? '' : String(id));
            if (!key) {
                return;
            }
            setFooterSuppressed(key, !!suppressed);
        };
        try { global.__setStickyElementsSuppressed = setter; } catch { }
        return () => {
            try {
                if (global.__setStickyElementsSuppressed === setter) {
                    delete global.__setStickyElementsSuppressed;
                }
            } catch { }
            clearFooterSuppression();
        };
    }, []);

    useEffect(() => {
        try { global.__USE_GLOBAL_FOOTER = true; } catch { }
        return () => { try { delete global.__USE_GLOBAL_FOOTER; } catch { } };
    }, []);

    useEffect(() => {
        try {
            global.__setFeedOverlayHidden = (hidden) => {
                const isHidden = !!hidden;
                feedOverlayProgressSV.value = isHidden ? 0 : 1;
                setIsFeedPostFocused((prev) => (prev === isHidden ? prev : isHidden));
            };
            global.__setFeedOverlayProgress = (progress) => {
                const numeric = Number(progress);
                if (!Number.isFinite(numeric)) return;
                const clamped = numeric < 0 ? 0 : numeric > 1 ? 1 : numeric;
                feedOverlayProgressSV.value = clamped;
            };
        } catch { }
        return () => {
            try { delete global.__setFeedOverlayHidden; } catch { }
            try { delete global.__setFeedOverlayProgress; } catch { }
        };
    }, [feedOverlayProgressSV]);

    useEffect(() => {
        const sv = feedOverlayProgressSV;
        runOnUI(() => {
            'worklet';
            global.__feedOverlayProgressSV = sv;
        })();
        return () => {
            runOnUI(() => {
                'worklet';
                if (global.__feedOverlayProgressSV === sv) {
                    global.__feedOverlayProgressSV = null;
                }
            })();
        };
    }, [feedOverlayProgressSV]);

    useEffect(() => {
        // Expose a minimal auth setter so login/signup can notify App immediately
        // AsyncStorage.clear();

        global.setAuthUid = (uid) => {
            const normalizedUid = uid ? String(uid) : null;
            try {
                if (normalizedUid) {
                    AsyncStorage.setItem('uid', normalizedUid).catch(() => { });
                } else {
                    AsyncStorage.removeItem('uid').catch(() => { });
                }
            } catch { }
            if (!normalizedUid) {
                try { logoutCleanupRef.current?.(); } catch { }
                uidRef.current = null;
                setUserReady(false);
                try { global.userData = {}; } catch { }
                try { delete global.__userDocHydrated; } catch { }
                prevMessagesSigRef.current = '';
                resetMessagesState();
                stopNotificationsListener();
            } else {
                if (logoutResetTimerRef.current) {
                    try { clearTimeout(logoutResetTimerRef.current); } catch { }
                    logoutResetTimerRef.current = null;
                }
                uidRef.current = normalizedUid;
                try { delete global.__userDocHydrated; } catch { }
                prevMessagesSigRef.current = '';
            }
            setIsAuthenticated(!!normalizedUid);
        };

        global.logout = () => {
            try { global.setAuthUid?.(null); } catch { }
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
            try { delete global.setAuthUid; delete global.logout; } catch { }
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
    const pendingChatDataRef = useRef(Object.create(null));
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
                }).catch(() => { });
            }
        } catch (e) {
            if (__DEV__) console.log('expo-notifications unavailable:', e?.message || e);
        }
        return () => { mounted = false; };
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
                const type = data?.type;
                if (type === 'chat' && data?.cid) {
                    const cid = String(data.cid);
                    pendingChatCidRef.current = cid;
                    prefetchChatData(cid);
                    // Try now or queue until ready
                    if (!tryNavigateToPendingChat()) {
                        // Navigation not ready yet; a separate effect will retry
                    }
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
    }, [notificationsRef.current, prefetchChatData, tryNavigateToPendingChat]);

    // Request push permissions and register token on login
    useEffect(() => {
        // cleanup previous subscription
        if (unsubRef.current) { try { unsubRef.current(); } catch { } unsubRef.current = null; }
        setUserReady(false);

        const uid = uidRef.current;
        if (!isAuthenticated || !uid) return;
        try { delete global.__userDocHydrated; } catch { }
        const ref = doc(db, 'users', uid);
        unsubRef.current = onSnapshot(ref, async (snap) => {
            try { global.userData = { uid, ...(snap.data() || {}) }; } catch { }
            setUserReady(true);
            try { global.__userDocHydrated = true; } catch { }
            ensureNotificationsListener(uid);
            try {
                const maybeRefresh = refreshCommunityStats({ force: true });
                if (maybeRefresh && typeof maybeRefresh.catch === 'function') {
                    maybeRefresh.catch(() => { });
                }
            } catch { }

            const data = snap.data() || {};
            const messagesArr = Array.isArray(data.messages) ? data.messages : [];
            const sig = (() => {
                if (!messagesArr.length) return 'len:0';
                const mids = messagesArr
                    .map((entry) => String(entry?.mid || ''))
                    .filter((mid) => mid.length > 0);
                return `len:${mids.length}:${mids.join('|')}`;
            })();
            if (prevMessagesSigRef.current !== sig) {
                prevMessagesSigRef.current = sig;
                preloadMessagesForUid(uid, { userDoc: data }).catch(() => { });
            }

            // Register for push notifications (EAS project id required)
            try {
                if (Device.isDevice && notificationsRef.current) {
                    const wantsPush = (global?.userData?.settings?.push !== false);
                    // If user disabled push and we previously had a token, clear it
                    if (!wantsPush && global?.userData?.expoPushToken) {
                        try {
                            const updateDoc = require('./backend/helper/firebase/updateDoc').default;
                            await updateDoc('users', uid, { expoPushToken: '' });
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
                        if (t && t !== (global?.userData?.expoPushToken || '')) {
                            const updateDoc = require('./backend/helper/firebase/updateDoc').default;
                            await updateDoc('users', uid, { expoPushToken: t });
                            try { global.userData.expoPushToken = t; } catch { }
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
                    try { if (navigationRef?.isReady?.() && navigationRef?.getCurrentRoute) { route = navigationRef.getCurrentRoute(); } } catch { }
                    if (!route || route?.name !== 'Chat') {
                        const soundsOn = (global?.userData?.settings?.sounds !== false);
                        if (soundsOn) buzzOnce();
                    }
                    prevUnreadMsgRef.current = nextCount;
                } else {
                    prevUnreadMsgRef.current = nextCount;
                }
            } catch { }
        }, (err) => {
            console.warn('User document subscription error:', err?.message || err);
            // proceed but keep ready false to avoid crashing screens
        });
        return () => {
            if (unsubRef.current) { try { unsubRef.current(); } catch { } unsubRef.current = null; }
            stopNotificationsListener();
        };
    }, [isAuthenticated]);

    // Safety: if user doc doesn't arrive promptly (offline, slow network), proceed with minimal data
    useEffect(() => {
        if (!isAuthenticated || userReady) return;
        const id = setTimeout(() => {
            if (!userReady) {
                try { const uid = uidRef.current; global.userData = { ...(global.userData || {}), uid, id: uid }; } catch { }
                setUserReady(true);
                try { global.__userDocHydrated = true; } catch { }
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
            if (logoutResetTimerRef.current) {
                try { clearTimeout(logoutResetTimerRef.current); } catch { }
                logoutResetTimerRef.current = null;
            }
            if (unsubRef.current) {
                try { unsubRef.current(); } catch { }
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
                } catch { }
            });
        } catch { }
        return () => { if (notifUnsubRef.current) { try { notifUnsubRef.current(); } catch { } notifUnsubRef.current = null; } };
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
        } catch { }
        return () => {
            try { delete global.__markHubRowReady; } catch { }
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
    const shouldWaitForAuthBackground = !isAuthenticated;
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
    const onLayoutRootView = React.useCallback(() => {
        setHasLaidOut(true);
        if (appReady
            && (!shouldWaitForHubRow || hubRowReady)
            && (!shouldWaitForAuthBackground || authBackgroundReadyRef.current)) {
            // Wait a frame after layout so content can paint before hiding splash
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    SplashScreen.hideAsync().catch(() => { });
                });
            });
        }
    }, [appReady, hubRowReady, shouldWaitForAuthBackground, shouldWaitForHubRow]);

    // Safety: if readiness flips after initial layout, still hide splash
    useEffect(() => {
        if (appReady
            && hasLaidOut
            && (!shouldWaitForHubRow || hubRowReady)
            && (!shouldWaitForAuthBackground || authBackgroundReadyRef.current)) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    SplashScreen.hideAsync().catch(() => { });
                });
            });
        }
    }, [appReady, hasLaidOut, hubRowReady, shouldWaitForAuthBackground, shouldWaitForHubRow]);

    // Absolute fallback: ensure splash hides even if layout event didn't fire
    useEffect(() => {
        if (appForceReady) {
            hubRowReadyRef.current = true;
            setHubRowReady(true);
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
            <SafeAreaProvider initialMetrics={initialWindowMetrics}>
                <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#ffffff' }} onLayout={onLayoutRootView} />
            </SafeAreaProvider>
        );
    }

    // Tabs is a stable component defined outside App to avoid remounts and extra hooks
    // No global suppression by default; handled within target screens only


    const handleOpenWorkoutFromReminder = () => {
        try {
            openActiveWorkout();
        } catch { }
        // Acknowledge this cycle to avoid re-showing until a new timer starts
        try { const cid = Number(restReminderCycleRef.current || 0); if (cid) { global.__restCycleAck = cid; restAckRef.current = cid; } } catch { }
        setRestReminderVisible(false);
    };


return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.bg }} onLayout={onLayoutRootView}>
            {authChecked && (
                <NavigationContainer
                    ref={navigationRef}
                    onReady={handleNavigationStateUpdate}
                    onStateChange={handleNavigationStateUpdate}
                >
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
                        <RootStack.Screen name="CreateUsername" component={CreateUsername} />
                        <RootStack.Screen name="UserLogInCredentials" component={UserLogInCredentials} />

                        {/* Main tabs (kept mounted). Force no animation when focusing Tabs. */}
                        <RootStack.Screen
                            name="Tabs"
                            component={MainTabs}
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
                        <RootStack.Screen
                            name="ExerciseDetail"
                            component={ExerciseDetail}
                            options={{ headerShown: false }}
                        />

                        <RootStack.Screen name="Profile" component={Profile} />
                        <RootStack.Screen name="ProfileWorkoutsAndPosts" component={ProfileWorkoutsAndPostsScreen} />
                        <RootStack.Screen name="ProfileLoggedFoods" component={ProfileLoggedFoodsScreen} />
                        <RootStack.Screen
                            name="WeightMeasurements"
                            component={WeightMeasurementsScreen}
                            options={{ headerShown: false }}
                        />
                        <RootStack.Screen name="Explore" component={Explore} />

                        {/* Messaging / social */}
                        <RootStack.Screen name="Messages" component={Messages} />
                        <RootStack.Screen
                            name="Notifications"
                            component={Notifications}
                            options={{ headerShown: false }}
                        />
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
                        <RootStack.Screen
                            name="PastWorkout"
                            component={PastWorkoutScreen}
                            options={{ headerShown: false }}
                        />
                        <RootStack.Screen name="SearchUsers" component={SearchUsers} />
                        <RootStack.Screen name="Settings" component={Settings} />
                        <RootStack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
                        <RootStack.Screen name="TermsOfService" component={TermsOfService} />
                        <RootStack.Screen name="Credits" component={Credits} />
                        <RootStack.Screen name="PrivateProfileInfo" component={PrivateProfileInfo} />
                        <RootStack.Screen name="DeleteAccount" component={DeleteAccount} />

                        {/* Creator */}
                        <RootStack.Screen name="SelectPhotos" component={SelectPhotosScreen} />
                        <RootStack.Screen
                            name="PostOptions"
                            component={PostUploadOptionsScreen}
                            options={Platform.select({
                                ios: {
                                    headerShown: false,
                                    gestureEnabled: false,
                                    presentation: 'modal',
                                    cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
                                    transitionSpec: {
                                        open: TransitionSpecs.TransitionIOSSpec,
                                        close: TransitionSpecs.TransitionIOSSpec,
                                    },
                                },
                                android: {
                                    headerShown: false,
                                    presentation: 'fullScreenModal',
                                    animation: 'slide_from_bottom',
                                    gestureEnabled: false,
                                    fullScreenGestureEnabled: false,
                                },
                                default: {
                                    headerShown: false,
                                    gestureEnabled: false,
                                },
                            })}
                        />
                        {/* Nutrition */}
                        <RootStack.Screen name="FoodDetail" component={FoodDetail} />
                    </RootStack.Navigator>
                </NavigationContainer>
            )}
            <WorkoutInviteOverlay enabled={authChecked && isAuthenticated} />
            {authChecked && isAuthenticated && (
                <WorkoutExperiencePortal uid={uidRef.current} enabled />
            )}
            {authChecked && isAuthenticated && (
                <ActiveWorkoutBottomSheet
                    hideForFocus={isFeedPostFocused}
                    overlayProgressSV={feedOverlayProgressSV}
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
                    isHiddenByFocus={isFeedPostFocused}
                    overlayProgressSV={feedOverlayProgressSV}
                    visibilityProgressSV={footerVisibilitySV}
                    disableInteractions={!isFooterVisible}
                    workoutSheetProgressSV={workoutSheetProgressSV}
                />
            )}
            {isOffline && (
                <NoInternet
                    onRetry={handleRetryNetwork}
                    networkType={networkType}
                    lastChecked={lastNetworkCheck}
                    style={[StyleSheet.absoluteFillObject, { zIndex: 999 }]}
                />
            )}
            {/* Global Rest Reminder Modal */}
            <Modal
                key={`rest-reminder-${restReminderKey}`}
                visible={restReminderVisible}
                transparent
                animationType="fade"
                onRequestClose={() => { try { const cid = Number(restReminderCycleRef.current || 0); if (cid) { global.__restCycleAck = cid; restAckRef.current = cid; } } catch { }; setRestReminderVisible(false); }}
            >
                <Pressable style={restStyles.overlay} onPress={() => { try { const cid = Number(restReminderCycleRef.current || 0); if (cid) { global.__restCycleAck = cid; restAckRef.current = cid; } } catch { }; setRestReminderVisible(false); }}>
                    <View style={restStyles.card}>
                        <View style={restStyles.iconRow}>
                            <View style={restStyles.iconCircle}><Ionicons name="timer-outline" size={rs(26)} color={theme.accentBlue} /></View>
                        </View>
                        <Text style={restStyles.title}>Rest Complete</Text>
                        <Text style={restStyles.body}>Time to crush your next set 🥱</Text>
                        <View style={restStyles.row}>
                            <Pressable style={[restStyles.btn, restStyles.secondary]} onPress={() => { try { const cid = Number(restReminderCycleRef.current || 0); if (cid) { global.__restCycleAck = cid; restAckRef.current = cid; } } catch { }; setRestReminderVisible(false); }}>
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
    </SafeAreaProvider>
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
