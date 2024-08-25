import { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import SignUp from './frontend/screens/0.0_SignUp'
import LogIn from './frontend/screens/0.1_LogIn';
import NewUserCreation from './frontend/screens/0.2_NewUserCreation';
import UserLogInCredentials from './frontend/screens/0.3_UserLogInCredentials';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Feed from "./frontend/screens/1_Feed";
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

import {
    useFonts,
    Inter_100Thin,
    Inter_200ExtraLight,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
} from '@expo-google-fonts/inter';
import {
    Lato_100Thin,
    Lato_100Thin_Italic,
    Lato_300Light,
    Lato_300Light_Italic,
    Lato_400Regular,
    Lato_400Regular_Italic,
    Lato_700Bold,
    Lato_700Bold_Italic,
    Lato_900Black,
    Lato_900Black_Italic,
} from '@expo-google-fonts/lato';
import {
    SourceSansPro_200ExtraLight,
    SourceSansPro_200ExtraLight_Italic,
    SourceSansPro_300Light,
    SourceSansPro_300Light_Italic,
    SourceSansPro_400Regular,
    SourceSansPro_400Regular_Italic,
    SourceSansPro_600SemiBold,
    SourceSansPro_600SemiBold_Italic,
    SourceSansPro_700Bold,
    SourceSansPro_700Bold_Italic,
    SourceSansPro_900Black,
    SourceSansPro_900Black_Italic,
} from '@expo-google-fonts/source-sans-pro';
import {
    Poppins_100Thin,
    Poppins_100Thin_Italic,
    Poppins_200ExtraLight,
    Poppins_200ExtraLight_Italic,
    Poppins_300Light,
    Poppins_300Light_Italic,
    Poppins_400Regular,
    Poppins_400Regular_Italic,
    Poppins_500Medium,
    Poppins_500Medium_Italic,
    Poppins_600SemiBold,
    Poppins_600SemiBold_Italic,
    Poppins_700Bold,
    Poppins_700Bold_Italic,
    Poppins_800ExtraBold,
    Poppins_800ExtraBold_Italic,
    Poppins_900Black,
    Poppins_900Black_Italic,
} from '@expo-google-fonts/poppins';
import {
    Outfit_100Thin,
    Outfit_200ExtraLight,
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Outfit_900Black,
} from '@expo-google-fonts/outfit';
import {
    Mulish_200ExtraLight,
    Mulish_300Light,
    Mulish_400Regular,
    Mulish_500Medium,
    Mulish_600SemiBold,
    Mulish_700Bold,
    Mulish_800ExtraBold,
    Mulish_900Black,
    Mulish_200ExtraLight_Italic,
    Mulish_300Light_Italic,
    Mulish_400Regular_Italic,
    Mulish_500Medium_Italic,
    Mulish_600SemiBold_Italic,
    Mulish_700Bold_Italic,
    Mulish_800ExtraBold_Italic,
    Mulish_900Black_Italic,
} from '@expo-google-fonts/mulish';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const AuthenticationStack = (({ navigation, route }) => {
    return (
        <Stack.Navigator initialRouteName='SignUp' screenOptions={{
            headerShown: false
        }}>
            <Stack.Screen name='SignUp' component={SignUp} />
            <Stack.Screen name='LogIn' component={LogIn} />
            <Stack.Screen name='NewUserCreation' component={NewUserCreation} />
            <Stack.Screen name='UserLogInCredentials' component={UserLogInCredentials} />
        </Stack.Navigator>
    )
});

const FeedStack = (({ navigation, route }) => {
    return (
        <Stack.Navigator initialRouteName='Feed' screenOptions={{
            headerShown: false
        }}>
            <Stack.Screen name='Feed' component={Feed} initialParams={route.params} />
            <Stack.Screen name='Messages' component={Messages} />
            <Stack.Screen name='Chat' component={Chat} />
            <Stack.Screen name='ViewProfile' component={ViewProfile} />
        </Stack.Navigator>
    )
});

const CompetitionStack = (({ navigation, route }) => {
    return (
        <Stack.Navigator initialRouteName='Competition' screenOptions={{
            headerShown: false
        }}>
            <Tab.Screen name='Competition' component={Competition} />
            <Tab.Screen name='ViewProfile' component={ViewProfile} />
        </Stack.Navigator>
    )
});

const ExploreStack = (({ navigation, route }) => {
    return (
        <Stack.Navigator initialRouteName='Explore' screenOptions={{
            headerShown: false
        }}>
            <Tab.Screen name='Explore' component={Explore} />
            <Tab.Screen name='ViewProfile' component={ViewProfile} />
        </Stack.Navigator>
    )
});

const ProfileStack = (({ navigation, route }) => {
    return (
        <Stack.Navigator initialRouteName='Profile' screenOptions={{
            headerShown: false
        }}>
            <Stack.Screen name='Profile' component={Profile} />
            <Stack.Screen name='SelectPhotos' component={SelectPhotosScreen} />
            <Stack.Screen name='PostOptions' component={PostUploadOptionsScreen} />
        </Stack.Navigator>
    )
});




export default function App() {
    let [fontsLoaded] = useFonts({
        Inter_100Thin,
        Inter_200ExtraLight,
        Inter_300Light,
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
        Inter_800ExtraBold,
        Inter_900Black,

        Lato_100Thin,
        Lato_100Thin_Italic,
        Lato_300Light,
        Lato_300Light_Italic,
        Lato_400Regular,
        Lato_400Regular_Italic,
        Lato_700Bold,
        Lato_700Bold_Italic,
        Lato_900Black,
        Lato_900Black_Italic,

        SourceSansPro_200ExtraLight,
        SourceSansPro_200ExtraLight_Italic,
        SourceSansPro_300Light,
        SourceSansPro_300Light_Italic,
        SourceSansPro_400Regular,
        SourceSansPro_400Regular_Italic,
        SourceSansPro_600SemiBold,
        SourceSansPro_600SemiBold_Italic,
        SourceSansPro_700Bold,
        SourceSansPro_700Bold_Italic,
        SourceSansPro_900Black,
        SourceSansPro_900Black_Italic,

        Poppins_100Thin,
        Poppins_100Thin_Italic,
        Poppins_200ExtraLight,
        Poppins_200ExtraLight_Italic,
        Poppins_300Light,
        Poppins_300Light_Italic,
        Poppins_400Regular,
        Poppins_400Regular_Italic,
        Poppins_500Medium,
        Poppins_500Medium_Italic,
        Poppins_600SemiBold,
        Poppins_600SemiBold_Italic,
        Poppins_700Bold,
        Poppins_700Bold_Italic,
        Poppins_800ExtraBold,
        Poppins_800ExtraBold_Italic,
        Poppins_900Black,
        Poppins_900Black_Italic,

        Outfit_100Thin,
        Outfit_200ExtraLight,
        Outfit_300Light,
        Outfit_400Regular,
        Outfit_500Medium,
        Outfit_600SemiBold,
        Outfit_700Bold,
        Outfit_800ExtraBold,
        Outfit_900Black,

        Mulish_200ExtraLight,
        Mulish_300Light,
        Mulish_400Regular,
        Mulish_500Medium,
        Mulish_600SemiBold,
        Mulish_700Bold,
        Mulish_800ExtraBold,
        Mulish_900Black,
        Mulish_200ExtraLight_Italic,
        Mulish_300Light_Italic,
        Mulish_400Regular_Italic,
        Mulish_500Medium_Italic,
        Mulish_600SemiBold_Italic,
        Mulish_700Bold_Italic,
        Mulish_800ExtraBold_Italic,
        Mulish_900Black_Italic,
    });
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const uidRef = useRef(null);

    useEffect(() => {
        init();
    }, []);

    async function init() {
        try {
            let uid = await AsyncStorage.getItem('uid');

            if (uid) {
                console.log(uid);
                uidRef.current = uid;
                setIsAuthenticated(true);
            }
            else {
            }
        }
        catch (err) {
            console.log(err);
        }

    }

    if (!fontsLoaded) {
        return <></>
    }
    if (!isAuthenticated) {
        return (
            <GestureHandlerRootView style={{ flex: 1 }}>
                <NavigationContainer>
                    <Tab.Navigator initialRouteName='AuthenticationStack' screenOptions={{
                        headerShown: false,
                        tabBarStyle: {
                            display: 'none'
                        }
                    }}>
                        <Tab.Screen name='AuthenticationStack' component={AuthenticationStack} />
                        <Tab.Screen name='FeedStack' component={FeedStack} />
                        <Tab.Screen name='CompetitionStack' component={CompetitionStack} />
                        <Tab.Screen name='Workout' component={Workout} />
                        <Tab.Screen name='ExploreStack' component={ExploreStack} />
                        <Tab.Screen name='ProfileStack' component={ProfileStack} />
                        <Tab.Screen name='PostList' component={PostList} />
                    </Tab.Navigator>
                </NavigationContainer>
            </GestureHandlerRootView>
        );
    }
    else {
        return (
            <GestureHandlerRootView style={{ flex: 1 }}>
                <NavigationContainer>
                    <Tab.Navigator initialRouteName='FeedStack' screenOptions={{
                        headerShown: false,
                        tabBarStyle: {
                            display: 'none'
                        },
                    }}>
                        <Tab.Screen name='AuthenticationStack' component={AuthenticationStack} />
                        <Tab.Screen name='FeedStack' initialParams={{ uid: uidRef.current }} component={FeedStack} />
                        <Tab.Screen name='CompetitionStack' component={CompetitionStack} />
                        <Tab.Screen name='Workout' component={Workout} />
                        <Tab.Screen name='ExploreStack' component={ExploreStack} />
                        <Tab.Screen name='ProfileStack' component={ProfileStack} />
                        <Tab.Screen name='PostList' component={PostList} />
                    </Tab.Navigator>
                </NavigationContainer>
            </GestureHandlerRootView>
        );
    }
}