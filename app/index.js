import { StyleSheet, View, Text, SafeAreaView } from "react-native";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import Feed from './screens/Feed';
import Community from './screens/Community';
import Workout from './screens/Workout';
import Explore from './screens/Explore';
import Profile from './screens/Profile';

const Tab = createBottomTabNavigator();

export default function App() {
    return (
        <View style={styles.main_ctnr}>
            <Tab.Navigator
                screenOptions={{
                    tabBarShowLabel: false,
                    tabBarStyle: styles.tab_bar,
                    headerShown: false,
                }}>
                <Tab.Screen name="feed" component={Feed} />
                <Tab.Screen name="community" component={Community} />
                <Tab.Screen name="workout" component={Workout} />
                <Tab.Screen name="explore" component={Explore} />
                <Tab.Screen name="profile" component={Profile} />
            </Tab.Navigator>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
    }
});