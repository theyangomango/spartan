import React, { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import Feed from '../screens/FeedScreen';
import MacroTracking from '../screens/MacroTracking';
import Competition from '../screens/2_Competition';
import Profile from '../screens/5_Profile';

const Tab = createBottomTabNavigator();

/**
 * Bottom tab navigator used by the root stack. All tab screens hide the tab bar and
 * rely on a custom footer overlay, so we freeze and keep everything mounted.
 */
const MainTabs = ({ route }) => {
    const initialParams = useMemo(() => route?.params || {}, [route?.params]);

    return (
        <Tab.Navigator
            initialRouteName="Feed"
            screenOptions={{
                headerShown: false,
                tabBarStyle: { display: 'none' },
                lazy: false,
                unmountOnBlur: false,
                detachInactiveScreens: false,
                freezeOnBlur: true,
            }}
        >
            <Tab.Screen name="Feed" component={Feed} initialParams={initialParams} />
            <Tab.Screen name="MacroTracking" component={MacroTracking} />
            <Tab.Screen name="Competition" component={Competition} />
            <Tab.Screen name="Profile" component={Profile} />
        </Tab.Navigator>
    );
};

export default React.memo(MainTabs);
