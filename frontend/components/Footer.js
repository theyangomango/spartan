import React from 'react';
import { Pressable, StyleSheet, View, Platform } from 'react-native';
import { Home, Cup, Weight, Profile as ProfileIcon } from 'iconsax-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useWorkoutStore from '../state/workoutStore';
import { jumpToTab, navigationRef } from '../../navigationRef';
import theme from '../theme/mfpDark';

import scaleSize from "../helper/scaleSize";

const COLORS = {
    active: theme.textPrimary,
    // Darker inactive for stronger selected contrast
    inactive: '#4F5A69',
    // Align indicator + icon with brand primary for dark theme
    workoutActive: theme.primary,
    // Subtle brand-tinted halo for dark surfaces
    workoutHalo: 'rgba(45, 158, 255, 0.16)', // theme.primary @ 16%
    workoutHaloBorder: 'rgba(45, 158, 255, 0.6)',
    bg: theme.bg,
    hairline: theme.hairline,
};

const Footer = ({ currentScreenName, navigation }) => {
    // Switch tabs fast and without animations; clears overlays one-way
    const go = (screenName, params) => () => {
        // If already on the target tab, avoid any navigation work
        if (currentScreenName === screenName) return;
        // Ensure tab switch is instant; rely on navigator-level options

        // Jump to the tab, removing overlays if needed, with minimal state change
        if (!jumpToTab(screenName, params)) {
            // Fallback to targeting the existing Tabs route explicitly
            try {
                if (navigation?.navigate) {
                    navigation.navigate('Tabs', { transition: 'none', screen: screenName, params: params || {} });
                } else {
                    navigationRef.navigate('Tabs', { transition: 'none', screen: screenName, params: params || {} });
                }
            } catch {}
        }
    };

    // Subscribe to workout presence only (boolean); avoids polling and reduces rerenders
    const hasActiveWorkout = useWorkoutStore((s) => !!s.workout) || !!global?.isCurrentlyWorkingOut;

    const getIconColor = (screenName) => {
        if (screenName === 'Workout' && hasActiveWorkout) {
            // Keep icon white when actively on Workout; otherwise show blue hint
            return currentScreenName === 'Workout' ? COLORS.active : COLORS.workoutActive;
        }
        return currentScreenName === screenName ? COLORS.active : COLORS.inactive;
    };

    const getWorkoutIndicatorStyle = () => ({
        backgroundColor: hasActiveWorkout ? COLORS.workoutHalo : 'transparent',
        borderWidth: hasActiveWorkout ? StyleSheet.hairlineWidth : 0,
        borderColor: hasActiveWorkout ? COLORS.workoutHaloBorder : 'transparent',
        padding: hasActiveWorkout ? 7 : 3,
        ...(
            hasActiveWorkout
                ? Platform.select({
                    ios: {
                        backgroundColor: COLORS.workoutHalo,
                        shadowColor: theme.primary,
                        shadowOpacity: 0.18,
                        shadowRadius: scaleSize(7),
                        shadowOffset: { width: 0, height: scaleSize(2) },
                    },
                    android: { elevation: 2 },
                    default: {},
                })
                : {}
        ),
    });

    return (
        <View style={styles.outer_view} pointerEvents="auto">
            <View style={styles.main_ctnr}>
                    {/* Feed (Stack tab → child Feed) */}
                    <View style={styles.icon_ctnr}>
                        <Pressable
                            delayPressIn={0}
                            onPressIn={() => {
                                const alreadyOnFeed = currentScreenName === 'Feed';
                                const params = alreadyOnFeed
                                    ? { scrollToTop: true, _t: Date.now() }
                                    : undefined;
                                // Immediate scroll when re-tapping Home on Feed
                                if (alreadyOnFeed) {
                                    try { global.scrollFeedToTop && global.scrollFeedToTop(); } catch {}
                                    // Keep legacy signal as a defensive fallback
                                    try { global.scrollFeedToTopSignal = Date.now(); } catch {}
                                }
                                go('Feed', params)();
                            }}
                            hitSlop={10}
                        >
                            <View style={currentScreenName === 'Feed' ? styles.selectedIcon : styles.icon}>
                                <Home size={24.5} color={getIconColor('Feed')} variant="Bold" />
                            </View>
                        </Pressable>
                    </View>

                {/* Macros (ExploreStack → MacroTracking) */}
                <View style={styles.icon_ctnr}>
                    <Pressable delayPressIn={0} onPressIn={go('MacroTracking')} hitSlop={10}>
                        <View style={currentScreenName === 'MacroTracking' ? styles.selectedIcon : styles.icon}>
                            <MaterialCommunityIcons name="food-apple" size={26} color={getIconColor('MacroTracking')} />
                        </View>
                    </Pressable>
                </View>

                {/* Workout (direct tab) */}
                <View style={styles.workout_icon_ctnr}>
                    <View style={[styles.workout_indicator_ctnr, getWorkoutIndicatorStyle()]}>
                        <Pressable
                            delayPressIn={0}
                            onPressIn={() => {
                                const alreadyOnWorkout = currentScreenName === 'Workout';
                                if (hasActiveWorkout) {
                                    if (alreadyOnWorkout) {
                                        // Open the New Workout modal immediately when on Workout
                                        try { global.openWorkoutModal && global.openWorkoutModal(); } catch {}
                                    } else {
                                        // Navigating to Workout: hint it should open on arrival
                                        try { global.openCurrentWorkoutSignal = Date.now(); } catch {}
                                    }
                                }
                                go('Workout')();
                            }}
                            hitSlop={10}
                        >
                            <View style={currentScreenName === 'Workout' ? styles.selectedIcon : styles.icon}>
                                <Weight size={27.5} color={getIconColor('Workout')} variant="Bold" />
                            </View>
                        </Pressable>
                    </View>
                </View>

                {/* Competition (CompetitionStack → Competition) */}
                <View style={styles.icon_ctnr}>
                    <Pressable delayPressIn={0} onPressIn={go('Competition')} hitSlop={10}>
                        <View style={currentScreenName === 'Competition' ? styles.selectedIcon : styles.icon}>
                            <Cup size={24.5} color={getIconColor('Competition')} variant="Bold" />
                        </View>
                    </Pressable>
                </View>

                {/* Profile (ProfileStack → Profile) */}
                <View style={styles.icon_ctnr}>
                    <Pressable delayPressIn={0} onPressIn={go('Profile')} hitSlop={10}>
                        <View style={currentScreenName === 'Profile' ? styles.selectedIcon : styles.icon}>
                            <ProfileIcon size={22.5} color={getIconColor('Profile')} variant="Bold" />
                        </View>
                    </Pressable>
                </View>
            </View>
            {/* Dead zone: bottom 20% intercepts touches to avoid accidental tab presses */}
            <View
                style={styles.dead_zone}
                // Ensure this view becomes the responder and swallows touches
                onStartShouldSetResponder={() => true}
                pointerEvents="auto"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    outer_view: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: scaleSize(87),
    },
    main_ctnr: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        paddingHorizontal: scaleSize(13),
        paddingBottom: scaleSize(13),
        backgroundColor: COLORS.bg,
        borderTopLeftRadius: scaleSize(40),
        borderTopRightRadius: scaleSize(40),

        // Remove hairline to avoid visible white line at top
        borderTopWidth: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaleSize(-2) },
        shadowOpacity: 0.5,
        shadowRadius: scaleSize(6),
        elevation: 4,
    },
    icon_ctnr: { flex: 1, alignItems: 'center', padding: scaleSize(10) },
    workout_icon_ctnr: { flex: 1, alignItems: 'center', paddingHorizontal: scaleSize(10), paddingVertical: scaleSize(8.2) },
    workout_indicator_ctnr: { borderRadius: scaleSize(100), padding: scaleSize(3) },
    icon: { padding: scaleSize(13.5), borderRadius: scaleSize(25) },
    selectedIcon: { padding: scaleSize(13.5), borderRadius: scaleSize(30) },
    dead_zone: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '40%', // bottom 20% of the footer area
        backgroundColor: 'transparent',
        zIndex: 2,
    },
});

// Avoid unnecessary re-renders across tab switches
export default React.memo(Footer, (prev, next) => {
    return (
        prev.currentScreenName === next.currentScreenName
    );
});
