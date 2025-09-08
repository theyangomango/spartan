import 'expo-dev-client';
import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
// Lazy-load expo-notifications to avoid native module errors on simulator
// and in dev clients that weren't rebuilt with the module.
import * as Device from 'expo-device';
import { navigationRef } from './navigationRef';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStackNavigator, CardStyleInterpolators, TransitionSpecs } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, Modal, View, Text, Pressable, StyleSheet, Dimensions, Vibration } from 'react-native';
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
import Feed from './frontend/screens/1_Feed';
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
import SearchUsers from './frontend/screens/SearchUsers';
import Settings from './frontend/screens/Settings';
import PrivacyPolicy from './frontend/screens/PrivacyPolicy';
import TermsOfService from './frontend/screens/TermsOfService';
import PrivateProfileInfo from './frontend/screens/PrivateProfileInfo';

const NativeStack = createNativeStackNavigator();

// Single root stack: iOS uses classic stack for left-slide; Android uses native-stack for perf
const RootStack = Platform.OS === 'ios' ? createStackNavigator() : createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Enable native screens for reduced memory and faster transitions
enableScreens(true);
enableFreeze(true);

// (no screens optimization toggles — use defaults)

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
    const [fontsLoaded] = useFonts(customFonts);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userReady, setUserReady] = useState(false);
    const uidRef = useRef(null);
    const unsubRef = useRef(null);
    const notifUnsubRef = useRef(null);
    const prevUnreadNotifRef = useRef(null);
    const prevUnreadMsgRef = useRef(null);
    const lastBuzzAtRef = useRef(0);
    const lastNotificationBuzzAtRef = useRef(0); // dedupe foreground push vs unread snapshot

    useEffect(() => {
        // Expose a minimal auth setter so login/signup can notify App immediately
        // AsyncStorage.clear();

        global.setAuthUid = (uid) => {
            try { if (uid) AsyncStorage.setItem('uid', uid).catch(() => {}); } catch {}
            uidRef.current = uid || null;
            setIsAuthenticated(!!uid);
        };

        (async () => {
            try {
                const uid = await AsyncStorage.getItem('uid');
                if (uid) { uidRef.current = uid; setIsAuthenticated(true); }
                else { setIsAuthenticated(false); setUserReady(false); }
            } catch (err) { console.error(err); }
        })();
    }, []);

    // Hydrate global.userData as early as possible when authenticated
    // Foreground notification behavior (show banner + play sound)
    // Load notifications module conditionally to prevent crashes on iOS simulator
    // when the dev client doesn't include expo-notifications.
    const notificationsRef = useRef(null);
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
                    const route = navigationRef?.getCurrentRoute?.();
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


    // ---------- Rest Reminder (global) ----------
    const [restReminderVisible, setRestReminderVisible] = useState(false);
    const [restReminderKey, setRestReminderKey] = useState(0);
    const notifListenerRef = useRef(null);
    useEffect(() => {
        global.triggerRestReminder = () => {
            const soundsOn = (global?.userData?.settings?.sounds !== false);
            if (soundsOn) {
                try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
                try { Vibration.vibrate(180); } catch {}
            }
            setRestReminderKey((k) => k + 1);
            setRestReminderVisible(true);
        };
        return () => { try { global.triggerRestReminder = null; } catch {} };
    }, []);

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
                        const route = navigationRef?.getCurrentRoute?.();
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
                    if (title.includes('rest complete')) {
                        setRestReminderKey((k) => k + 1);
                        setRestReminderVisible(true);
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

    if (!fontsLoaded) return null;

    // Splash/guard until user is hydrated if authenticated
    if (isAuthenticated && !userReady) {
        return <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#F7FAFF' }} />;
    }

    // Tabs is a stable component defined outside App to avoid remounts and extra hooks


    const handleOpenWorkoutFromReminder = () => {
        try {
            const { jumpToTab } = require('./navigationRef');
            if (jumpToTab) jumpToTab('Workout');
            try { global.openCurrentWorkoutSignal = Date.now(); } catch {}
        } catch {}
        setRestReminderVisible(false);
    };


    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <NavigationContainer ref={navigationRef}>
                {/* Single root navigator with all screens */}
                <RootStack.Navigator
                    id="ROOT"
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
                                animationEnabled: !isNone,
                                gestureDirection: isSlideLeft ? 'horizontal-inverted' : 'horizontal',
                                cardStyleInterpolator: isFade
                                    ? CardStyleInterpolators.forFadeFromCenter
                                    : CardStyleInterpolators.forHorizontalIOS,
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

                    <RootStack.Screen name="Profile" component={Profile} />
                    <RootStack.Screen name="Explore" component={Explore} />

                    {/* Messaging / social */}
                    <RootStack.Screen name="Messages" component={Messages} />
                    <RootStack.Screen name="Chat" component={Chat} />
                    <RootStack.Screen name="ViewProfile" component={ViewProfile} />
                    <RootStack.Screen name="SearchUsers" component={SearchUsers} />
                    <RootStack.Screen name="Settings" component={Settings} />
                    <RootStack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
                    <RootStack.Screen name="TermsOfService" component={TermsOfService} />
                    <RootStack.Screen name="PrivateProfileInfo" component={PrivateProfileInfo} />

                    {/* Creator */}
                    <RootStack.Screen name="SelectPhotos" component={SelectPhotosScreen} />
                    <RootStack.Screen name="PostOptions" component={PostUploadOptionsScreen} />
                </RootStack.Navigator>
            </NavigationContainer>
            {/* Global Rest Reminder Modal */}
            <Modal
                key={`rest-reminder-${restReminderKey}`}
                visible={restReminderVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setRestReminderVisible(false)}
            >
                <Pressable style={restStyles.overlay} onPress={() => setRestReminderVisible(false)}>
                    <View style={restStyles.card}>
                        <View style={restStyles.iconRow}>
                            <View style={restStyles.iconCircle}><Ionicons name="timer-outline" size={rs(26)} color="#0369A1" /></View>
                        </View>
                        <Text style={restStyles.title}>Rest Complete</Text>
                        <Text style={restStyles.body}>Time to crush your next set 🥱</Text>
                        <View style={restStyles.row}>
                            <Pressable style={[restStyles.btn, restStyles.secondary]} onPress={() => setRestReminderVisible(false)}>
                                <Ionicons name="close" size={rs(16)} color="#0F172A" style={{ marginRight: rs(6) }} />
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

const restScale = Dimensions.get('window').height / 844;
const rs = (n) => Math.round(n * restScale);
const restStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: rs(18) },
    card: {
        width: '90%', maxWidth: 380,
        backgroundColor: '#fff', borderRadius: rs(18), paddingVertical: rs(16), paddingHorizontal: rs(16),
        alignItems: 'center',
        shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: rs(18), shadowOffset: { width: 0, height: rs(10) },
        elevation: 6,
        borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(2,6,23,0.06)'
    },
    iconRow: { marginBottom: rs(8) },
    iconCircle: { width: rs(46), height: rs(46), borderRadius: rs(23), backgroundColor: '#EAF3FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(4,153,254,0.25)' },
    title: { fontFamily: 'Outfit_800ExtraBold', fontSize: rs(18), color: '#0F172A', marginTop: rs(10) },
    body: { marginTop: rs(6), fontFamily: 'Outfit_600SemiBold', fontSize: rs(13), color: 'rgba(15,23,42,0.72)', textAlign: 'center' },
    row: { flexDirection: 'row', marginTop: rs(16), width: '100%', gap: rs(8) },
    btn: { flex: 1, paddingVertical: rs(11), borderRadius: rs(12), alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
    primary: { backgroundColor: '#0499FE', shadowColor: '#0499FE', shadowOpacity: 0.25, shadowRadius: rs(10), shadowOffset: { width: 0, height: rs(4) } },
    primaryText: { color: '#fff' },
    secondary: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: 'rgba(2,6,23,0.06)' },
    secondaryText: { color: '#0F172A' },
    btnText: { fontFamily: 'Outfit_700Bold', fontSize: rs(14) },
});
