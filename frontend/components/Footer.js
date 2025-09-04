import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Home, Cup, Weight, Profile as ProfileIcon } from 'iconsax-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useWorkoutStore from '../state/workoutStore';

const COLORS = {
    active: '#000',
    inactive: '#bbb',
    workoutActive: '#2291FF',
    // Softer, more visible blue halo
    workoutHalo: '#E1F0FF',
    workoutHaloBorder: '#B7D7FF',
    bg: '#fff',
    hairline: 'rgba(2,6,23,0.06)',
};

const Footer = ({ navigation, currentScreenName }) => {
    // Switch tabs without animation; keeps screens mounted
    const go = (screenName, params) => () => navigation.navigate('Tabs', { screen: screenName, params: params || {} });

    // Subscribe to workout presence only (boolean); avoids polling and reduces rerenders
    const hasActiveWorkout = useWorkoutStore((s) => !!s.workout) || !!global?.isCurrentlyWorkingOut;

    const getIconColor = (screenName) => {
        if (screenName === 'Workout' && hasActiveWorkout) return COLORS.workoutActive;
        return currentScreenName === screenName ? COLORS.active : COLORS.inactive;
    };

    const getWorkoutIndicatorStyle = () => ({
        backgroundColor: hasActiveWorkout ? COLORS.workoutHalo : 'transparent',
        borderWidth: hasActiveWorkout ? StyleSheet.hairlineWidth : 0,
        borderColor: hasActiveWorkout ? COLORS.workoutHaloBorder : 'transparent',
        padding: hasActiveWorkout ? 8 : 3,
    });

    return (
        <View style={styles.outer_view} pointerEvents="auto">
            <View style={styles.main_ctnr}>
                    {/* Feed (Stack tab → child Feed) */}
                    <View style={styles.icon_ctnr}>
                        <Pressable
                            onPress={() => {
                                if (currentScreenName === 'Feed') {
                                    try { global.scrollFeedToTopSignal = Date.now(); } catch {}
                                    navigation.navigate('Tabs', { screen: 'Feed', params: { scrollToTop: true, _t: Date.now() } });
                                } else {
                                    navigation.navigate('Tabs', { screen: 'Feed' });
                                }
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
                    <Pressable onPress={go('MacroTracking')} hitSlop={10}>
                        <View style={currentScreenName === 'MacroTracking' ? styles.selectedIcon : styles.icon}>
                            <MaterialCommunityIcons name="food-apple" size={26} color={getIconColor('MacroTracking')} />
                        </View>
                    </Pressable>
                </View>

                {/* Workout (direct tab) */}
                <View style={styles.workout_icon_ctnr}>
                    <View style={[styles.workout_indicator_ctnr, getWorkoutIndicatorStyle()]}>
                        <Pressable
                            onPress={() => {
                                if (hasActiveWorkout) {
                                    try { global.openCurrentWorkoutSignal = Date.now(); } catch {}
                                }
                                navigation.navigate('Tabs', { screen: 'Workout' });
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
                    <Pressable onPress={go('Competition')} hitSlop={10}>
                        <View style={currentScreenName === 'Competition' ? styles.selectedIcon : styles.icon}>
                            <Cup size={24.5} color={getIconColor('Competition')} variant="Bold" />
                        </View>
                    </Pressable>
                </View>

                {/* Profile (ProfileStack → Profile) */}
                <View style={styles.icon_ctnr}>
                    <Pressable onPress={() => navigation.navigate('Tabs', { screen: 'Profile' })} hitSlop={10}>
                        <View style={currentScreenName === 'Profile' ? styles.selectedIcon : styles.icon}>
                            <ProfileIcon size={22.5} color={getIconColor('Profile')} variant="Bold" />
                        </View>
                    </Pressable>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    outer_view: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: 87,
    },
    main_ctnr: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        paddingHorizontal: 13,
        paddingBottom: 13,
        backgroundColor: COLORS.bg,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,

        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.hairline,

        shadowColor: '#bbb',
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.5,
        shadowRadius: 2,
        elevation: 5,
    },
    icon_ctnr: { flex: 1, alignItems: 'center', padding: 10 },
    workout_icon_ctnr: { flex: 1, alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8.2 },
    workout_indicator_ctnr: { borderRadius: 100, padding: 3 },
    icon: { padding: 13.5, borderRadius: 25 },
    selectedIcon: { padding: 13.5, borderRadius: 30 },
});

export default Footer;
