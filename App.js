import 'expo-dev-client';
import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './navigationRef';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStackNavigator, CardStyleInterpolators, TransitionSpecs } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableScreens, enableFreeze } from 'react-native-screens';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { customFonts } from './fonts';
import { db } from './firebase.config';
import { doc, onSnapshot } from 'firebase/firestore';

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

export default function App() {
    const [fontsLoaded] = useFonts(customFonts);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userReady, setUserReady] = useState(false);
    const uidRef = useRef(null);
    const unsubRef = useRef(null);

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
    useEffect(() => {
        // cleanup previous subscription
        if (unsubRef.current) { try { unsubRef.current(); } catch {} unsubRef.current = null; }
        setUserReady(false);

        const uid = uidRef.current;
        if (!isAuthenticated || !uid) return;
        const ref = doc(db, 'users', uid);
        unsubRef.current = onSnapshot(ref, (snap) => {
            try { global.userData = { uid, ...(snap.data() || {}) }; } catch {}
            setUserReady(true);
        }, (err) => {
            console.warn('User document subscription error:', err?.message || err);
            // proceed but keep ready false to avoid crashing screens
        });
        return () => { if (unsubRef.current) { try { unsubRef.current(); } catch {} unsubRef.current = null; } };
    }, [isAuthenticated]);


    if (!fontsLoaded) return null;

    // Splash/guard until user is hydrated if authenticated
    if (isAuthenticated && !userReady) {
        return <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#F7FAFF' }} />;
    }

    const Tabs = ({ route }) => (
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
            <Tab.Screen name="Feed" component={Feed} initialParams={route?.params || { uid: uidRef.current }} />
            <Tab.Screen name="MacroTracking" component={MacroTracking} />
            <Tab.Screen name="Workout" component={Workout} initialParams={route?.params || { uid: uidRef.current }} />
            <Tab.Screen name="Competition" component={Competition} />
            <Tab.Screen name="Profile" component={Profile} />
        </Tab.Navigator>
    );


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

                    {/* Creator */}
                    <RootStack.Screen name="SelectPhotos" component={SelectPhotosScreen} />
                    <RootStack.Screen name="PostOptions" component={PostUploadOptionsScreen} />
                </RootStack.Navigator>
            </NavigationContainer>
        </GestureHandlerRootView>
    );
}
