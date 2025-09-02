import 'expo-dev-client';
import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { customFonts } from './fonts';

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
import PostList from './frontend/screens/PostList';
import ViewProfile from './frontend/screens/4.1_ViewProfile';
import MacroTracking from './frontend/screens/MacroTracking';

const Tab = createBottomTabNavigator();
const NativeStack = createNativeStackNavigator();

/** JS stack used ONLY for cross-tab overlay with left slide */
const RootOverlayStack = createStackNavigator();

/* ---------- Sub-stacks (native-stack) ---------- */
const AuthenticationStack = () => (
    <NativeStack.Navigator initialRouteName="SignUp" screenOptions={{ headerShown: false }}>
        <NativeStack.Screen name="SignUp" component={SignUp} />
        <NativeStack.Screen name="LogIn" component={LogIn} />
        <NativeStack.Screen name="NewUserCreation" component={NewUserCreation} />
        <NativeStack.Screen name="UserLogInCredentials" component={UserLogInCredentials} />
    </NativeStack.Navigator>
);

const FeedStack = ({ route }) => (
    <NativeStack.Navigator initialRouteName="Feed" screenOptions={{ headerShown: false }}>
        <NativeStack.Screen name="Feed" component={Feed} initialParams={route?.params} />
        <NativeStack.Screen name="Messages" component={Messages} />
        <NativeStack.Screen name="Chat" component={Chat} />
        <NativeStack.Screen name="ViewProfile" component={ViewProfile} />
    </NativeStack.Navigator>
);

const WorkoutStack = ({ route }) => (
    <NativeStack.Navigator initialRouteName="Workout" screenOptions={{ headerShown: false }}>
        <NativeStack.Screen name="Workout" component={Workout} initialParams={route?.params} />
        <NativeStack.Screen name="Messages" component={Messages} />
        <NativeStack.Screen name="Chat" component={Chat} />
        <NativeStack.Screen name="ViewProfile" component={ViewProfile} />
    </NativeStack.Navigator>
);

const CompetitionStack = () => (
    <NativeStack.Navigator initialRouteName="Competition" screenOptions={{ headerShown: false }}>
        <NativeStack.Screen name="Competition" component={Competition} />
        <NativeStack.Screen name="ViewProfile" component={ViewProfile} />
    </NativeStack.Navigator>
);

const ExploreStack = () => (
    <NativeStack.Navigator initialRouteName="MacroTracking" screenOptions={{ headerShown: false }}>
        <NativeStack.Screen name="MacroTracking" component={MacroTracking} />
        <NativeStack.Screen name="ViewProfile" component={ViewProfile} />
    </NativeStack.Navigator>
);

const ProfileStack = () => (
    <NativeStack.Navigator initialRouteName="Profile" screenOptions={{ headerShown: false }}>
        <NativeStack.Screen name="Profile" component={Profile} />
        <NativeStack.Screen name="SelectPhotos" component={SelectPhotosScreen} />
        <NativeStack.Screen name="PostOptions" component={PostUploadOptionsScreen} />
    </NativeStack.Navigator>
);

export default function App() {
    const [fontsLoaded] = useFonts(customFonts);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const uidRef = useRef(null);

    useEffect(() => {
        (async () => {
            try {
                const uid = await AsyncStorage.getItem('uid');
                if (uid) { uidRef.current = uid; setIsAuthenticated(true); }
            } catch (err) { console.error(err); }
        })();
    }, []);

    if (!fontsLoaded) return null;

    const Tabs = () => (
        <Tab.Navigator
            initialRouteName={isAuthenticated ? 'Workout' : 'AuthenticationStack'}
            screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}
        >
            <Tab.Screen name="AuthenticationStack" component={AuthenticationStack} />
            <Tab.Screen name="FeedStack" component={FeedStack} initialParams={{ uid: uidRef.current }} />
            <Tab.Screen name="CompetitionStack" component={CompetitionStack} />
            <Tab.Screen name="Workout" component={WorkoutStack} initialParams={{ uid: uidRef.current }} />
            <Tab.Screen name="ExploreStack" component={ExploreStack} />
            <Tab.Screen name="ProfileStack" component={ProfileStack} />
            <Tab.Screen name="PostList" component={PostList} />
        </Tab.Navigator>
    );

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <NavigationContainer>
                {/* Use a JS stack JUST for overlay routes with L←R slide */}
                <RootOverlayStack.Navigator screenOptions={{ headerShown: false }}>
                    <RootOverlayStack.Screen name="Tabs" component={Tabs} />
                    <RootOverlayStack.Screen
                        name="MacroTrackingOverlay"
                        component={MacroTracking}
                        options={{
                            gestureEnabled: true,
                            gestureDirection: 'horizontal-inverted', // 👈 slide from LEFT
                            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
                        }}
                    />
                </RootOverlayStack.Navigator>
            </NavigationContainer>
        </GestureHandlerRootView>
    );
}
