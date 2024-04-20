// import Authentication from "./frontend/screens/Authentication";
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import Feed from "./frontend/screens/Feed";
import Profile from './frontend/screens/Profile';
import Explore from './frontend/screens/Explore';
import Workout from './frontend/screens/Workout';
import Competition from './frontend/screens/Competition';
import Messages from './frontend/screens/Messages';

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

const Stack = createNativeStackNavigator();

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
    });
    if (!fontsLoaded) {
        return <></>
    }
    else return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName='Feed' screenOptions={{
                headerShown: false
            }}>
                <Stack.Screen name='Feed' component={Feed} options={{
                    animation: 'none'
                }} />
                <Stack.Screen name='Competition' component={Competition} options={{
                    animation: 'none'
                }} />
                <Stack.Screen name='Workout' component={Workout} options={{
                    animation: 'none'
                }} />
                <Stack.Screen name='Explore' component={Explore} options={{
                    animation: 'none'
                }} />
                <Stack.Screen name='Profile' component={Profile} options={{
                    animation: 'none'
                }} />
                <Stack.Screen name='Messages' component={Messages} options={{
                    animation: 'none'
                }} />
            </Stack.Navigator>
        </NavigationContainer>
    )
}