import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { customFonts } from './fonts';  
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

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const AuthenticationStack = () => {
  return (
    <Stack.Navigator initialRouteName='SignUp' screenOptions={{ headerShown: false }}>
      <Stack.Screen name='SignUp' component={SignUp} />
      <Stack.Screen name='LogIn' component={LogIn} />
      <Stack.Screen name='NewUserCreation' component={NewUserCreation} />
      <Stack.Screen name='UserLogInCredentials' component={UserLogInCredentials} />
    </Stack.Navigator>
  );
};

const FeedStack = ({ route }) => {
  return (
    <Stack.Navigator initialRouteName='Feed' screenOptions={{ headerShown: false }}>
      <Stack.Screen name='Feed' component={Feed} initialParams={route.params} />
      <Stack.Screen name='Messages' component={Messages} />
      <Stack.Screen name='Chat' component={Chat} />
      <Stack.Screen name='ViewProfile' component={ViewProfile} />
    </Stack.Navigator>
  );
};

const CompetitionStack = ({ route }) => {
  return (
    <Stack.Navigator initialRouteName='Competition' screenOptions={{ headerShown: false }}>
      <Stack.Screen name='Competition' component={Competition} />
      <Stack.Screen name='ViewProfile' component={ViewProfile} />
    </Stack.Navigator>
  );
};

const ExploreStack = ({ route }) => {
  return (
    <Stack.Navigator initialRouteName='Explore' screenOptions={{ headerShown: false }}>
      <Stack.Screen name='Explore' component={Explore} />
      <Stack.Screen name='ViewProfile' component={ViewProfile} />
    </Stack.Navigator>
  );
};

const ProfileStack = ({ route }) => {
  return (
    <Stack.Navigator initialRouteName='Profile' screenOptions={{ headerShown: false }}>
      <Stack.Screen name='Profile' component={Profile} />
      <Stack.Screen name='SelectPhotos' component={SelectPhotosScreen} />
      <Stack.Screen name='PostOptions' component={PostUploadOptionsScreen} />
    </Stack.Navigator>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts(customFonts);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const uidRef = useRef(null);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    try {
      const uid = await AsyncStorage.getItem('uid'); // user ID is stored within the device's async storage
      if (uid) {
        uidRef.current = uid;
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (!fontsLoaded) return null;

  return (
    
    <GestureHandlerRootView style={{ flex: 1 }}>
        
      <NavigationContainer>
        <Tab.Navigator
          initialRouteName={isAuthenticated ? 'FeedStack' : 'AuthenticationStack'}
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}
        >
          <Tab.Screen name='AuthenticationStack' component={AuthenticationStack} />
          <Tab.Screen
            name='FeedStack'
            component={FeedStack}
            initialParams={{ uid: uidRef.current }}
          />
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
