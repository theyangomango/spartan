// Root stack navigator: registers every screen of the app on one stack.
import React from 'react';
import { Platform, Dimensions } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStackNavigator, CardStyleInterpolators, TransitionSpecs } from '@react-navigation/stack';

/* Screens */
import {
    SignUp,
    LogIn,
    NewUserCreation,
    CreateUsername,
    ChangeUsername,
    ChangeName,
    UserLogInCredentials,
    Feed,
    Profile,
    Explore,
    Competition,
    ExerciseDetail,
    // Messages, // messaging is disabled
    // Chat,
    ViewProfile,
    PastWorkoutScreen,
    MacroTracking,
    Notifications,
    FoodDetail,
    SearchUsers,
    MuscleGroupExercises,
    Settings,
    PrivacyPolicy,
    TermsOfService,
    Credits,
    PrivateProfileInfo,
    DeleteAccount,
    ProfileWorkoutsAndPostsScreen,
    ProfileLoggedFoodsScreen,
    WeightMeasurementsScreen,
    UserStatsScreen,
} from '../screens';
import SelectPhotosScreen from '../components/5_Profile/MakePost/SelectPhotosScreen';
import PostUploadOptionsScreen from '../components/5_Profile/MakePost/PostUploadOptionsScreen';
import ClipBuilderScreen from '../components/5_Profile/MakePost/ClipBuilderScreen';
import MainTabs from './MainTabs';

// Single root stack: iOS uses classic stack for left-slide; Android uses native-stack for perf
const RootStack = Platform.OS === 'ios' ? createStackNavigator() : createNativeStackNavigator();

// NewClip and EditClip present the clip builder the same way
const CLIP_MODAL_OPTIONS = Platform.select({
    ios: {
        headerShown: false,
        presentation: 'modal',
        cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
        transitionSpec: {
            open: TransitionSpecs.TransitionIOSSpec,
            close: TransitionSpecs.TransitionIOSSpec,
        },
    },
    android: {
        headerShown: false,
        animation: 'slide_from_bottom',
    },
    default: {
        headerShown: false,
    },
});

export default function RootNavigator({ isAccountReady, uid }) {
    return (
        <RootStack.Navigator
            id="ROOT"
            key={isAccountReady ? 'auth' : 'guest'}
            initialRouteName={isAccountReady ? 'Tabs' : 'SignUp'}
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
            <RootStack.Screen name="ChangeUsername" component={ChangeUsername} />
            <RootStack.Screen name="ChangeName" component={ChangeName} />
            <RootStack.Screen name="UserLogInCredentials" component={UserLogInCredentials} />

            {/* Main tabs (kept mounted). Force no animation when focusing Tabs. */}
            <RootStack.Screen
                name="Tabs"
                component={MainTabs}
                initialParams={{ uid, transition: 'none' }}
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
            <RootStack.Screen name="Feed" component={Feed} initialParams={{ uid }} />

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
            <RootStack.Screen
                name="MuscleGroupExercises"
                component={MuscleGroupExercises}
                options={{ headerShown: false }}
            />
            <RootStack.Screen name="Explore" component={Explore} />

            {/* Messaging / social */}
            {/* Messaging is disabled: restore this route and the Chat route below to bring it back.
            <RootStack.Screen name="Messages" component={Messages} />
            */}
            <RootStack.Screen
                name="Notifications"
                component={Notifications}
                options={{ headerShown: false }}
            />
            {/* Messaging is disabled.
            <RootStack.Screen
                name="Chat"
                component={Chat}
                options={Platform.select({
                    ios: {
                        Disable the native back swipe so Chat's custom gesture can fully control the transition.
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
            */}
            <RootStack.Screen name="ViewProfile" component={ViewProfile} />
            <RootStack.Screen name="UserStats" component={UserStatsScreen} />
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
                name="NewClip"
                component={ClipBuilderScreen}
                initialParams={{ mode: 'new' }}
                options={CLIP_MODAL_OPTIONS}
            />
            <RootStack.Screen
                name="EditClip"
                component={ClipBuilderScreen}
                initialParams={{ mode: 'edit' }}
                options={CLIP_MODAL_OPTIONS}
            />
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
    );
}
