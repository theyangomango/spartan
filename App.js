// import Authentication from "./frontend/screens/Authentication";
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import Feed from "./frontend/screens/Feed";

const Stack = createNativeStackNavigator();

export default function App() {
    // return <Feed />;
    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{
                headerShown: false
            }}>
                <Stack.Screen name='Feed' component={Feed}/>
            </Stack.Navigator>
        </NavigationContainer>
    )
}