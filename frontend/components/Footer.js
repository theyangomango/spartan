import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Home, Cup, Weight, Profile as ProfileIcon } from 'iconsax-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useWorkoutStore, { WORKOUT_SHEET_STATES } from '../state/workoutStore';
import { jumpToTab, navigationRef } from '../../navigationRef';
import theme from '../theme/mfpDark';
import Animated, { useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';
import scaleSize from "../helper/scaleSize";
import { openActiveWorkout, startFreshWorkout } from "../workout/workoutActions";

const FOOTER_BASE_HEIGHT = scaleSize(87);
export const FOOTER_HIDE_OFFSET = FOOTER_BASE_HEIGHT + scaleSize(18);

const COLORS = {
    active: theme.textPrimary,
    // Darker inactive for stronger selected contrast
    inactive: '#4F5A69',
    bg: theme.bg,
    hairline: theme.hairline,
    actionCircle: '#4F9DFF',
    actionCircleActive: '#4F9DFF',
    actionIcon: '#F6FBFF',
    actionIconActive: '#FFFFFF',
    selectedIconBg: 'rgba(34, 61, 100, 0.32)',
};

const Footer = ({
    currentScreenName,
    navigation,
    isOverlay = false,
    isHiddenByFocus = false,
    overlayProgressSV,
    visibilityProgressSV,
    disableInteractions = false,
    workoutSheetProgressSV = null,
}) => {
    const globalOverlayEnabled = Boolean(global?.__USE_GLOBAL_FOOTER);
    if (!isOverlay && globalOverlayEnabled) {
        return null;
    }
    const nav = (navigation && typeof navigation.navigate === 'function')
        ? navigation
        : (navigationRef.current && typeof navigationRef.current.navigate === 'function')
            ? navigationRef.current
            : navigationRef;
    // Switch tabs fast and without animations; clears overlays one-way
    const go = (screenName, params, options = {}) => () => {
        const { force = false } = options;
        // If already on the target tab, avoid any navigation work unless forced
        if (!force && currentScreenName === screenName) return;

        const navParams = typeof params === 'undefined' ? undefined : params;
        const fallbackParams = params || {};

        // Jump to the tab, removing overlays if needed, with minimal state change
        if (!jumpToTab(screenName, navParams)) {
            try {
                nav.navigate('Tabs', { transition: 'none', screen: screenName, params: fallbackParams });
            } catch {
                try {
                    navigationRef.navigate('Tabs', { transition: 'none', screen: screenName, params: fallbackParams });
                } catch {}
            }
        }
    };

    // Subscribe to workout presence only (boolean); avoids polling and reduces rerenders
    const hasActiveWorkout = useWorkoutStore((s) => !!s.workout) || !!global?.isCurrentlyWorkingOut;
    const startWorkoutHandler = useWorkoutStore((s) => s.sheetHandlers?.startWorkout);
    const sheetSharedAnimatedIndex = useWorkoutStore((s) => s.sheetSharedAnimatedIndex);

    const collapseProgressSharedValue = workoutSheetProgressSV ?? sheetSharedAnimatedIndex;
    const sheetState = useWorkoutStore((s) => s.sheetState);

    const getIconColor = (screenName) => (
        currentScreenName === screenName ? COLORS.active : COLORS.inactive
    );

    const footerPointerEvents = useMemo(() => (
        (disableInteractions || isHiddenByFocus || (hasActiveWorkout && sheetState === WORKOUT_SHEET_STATES.EXPANDED)) ? 'none' : 'auto'
    ), [disableInteractions, hasActiveWorkout, sheetState, isHiddenByFocus]);

    const footerReveal = useDerivedValue(() => {
        if (!collapseProgressSharedValue) return 1;
        const value = collapseProgressSharedValue.value;
        const clamped = value < 0 ? 0 : value > 1 ? 1 : value;
        return 1 - clamped;
    }, [collapseProgressSharedValue]);

    const outerAnimatedStyle = useAnimatedStyle(() => {
        const overlayProgress = overlayProgressSV?.value ?? (isHiddenByFocus ? 0 : 1);
        const visibility = visibilityProgressSV?.value ?? (disableInteractions ? 0 : 1);
        const combinedRaw = footerReveal.value * overlayProgress * visibility;
        const combined = combinedRaw < 0 ? 0 : combinedRaw > 1 ? 1 : combinedRaw;
        return {
            transform: [{ translateY: FOOTER_HIDE_OFFSET * (1 - combined) }],
            opacity: combined,
        };
    });

    const workoutHighlighted = hasActiveWorkout && sheetState !== WORKOUT_SHEET_STATES.HIDDEN;
    const weightIconColor = workoutHighlighted ? COLORS.actionIconActive : COLORS.actionIcon;
    const weightCircleColor = workoutHighlighted ? COLORS.actionCircleActive : COLORS.actionCircle;

    const handleStartWorkout = useCallback(() => {
        if (hasActiveWorkout) {
            openActiveWorkout();
            return;
        }
        const options = { forceFresh: true, skipUI: false };
        const startFn = typeof startWorkoutHandler === 'function' ? startWorkoutHandler : null;
        if (startFn) {
            try {
                startFn(null, options);
            } catch {
                startFreshWorkout(null, options);
                return;
            }
            openActiveWorkout();
            return;
        }
        startFreshWorkout(null, options);
    }, [hasActiveWorkout, startWorkoutHandler]);

    return (
        <Animated.View style={[styles.outer_view, outerAnimatedStyle]} pointerEvents={footerPointerEvents}>
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
                                    try {
                                        const stamp = Number(global.scrollFeedToTopSignal) || Date.now();
                                        global.scrollFeedToTopSignal = stamp;
                                        global.scrollFeedToTopHandled = stamp;
                                    } catch {}
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
                    <View style={styles.workout_indicator_ctnr}>
                        <Pressable
                            delayPressIn={0}
                            onPressIn={handleStartWorkout}
                            hitSlop={10}
                        >
                            <View
                                style={[
                                    styles.workout_action,
                                    { backgroundColor: weightCircleColor },
                                    workoutHighlighted && styles.workout_action_active,
                                ]}
                            >
                                <Weight size={24} color={'#000'} variant="Bold" />
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
                    <Pressable
                        delayPressIn={0}
                        onPressIn={() => {
                            const alreadyOnProfile = currentScreenName === 'Profile';
                            if (alreadyOnProfile) {
                                const stamp = Date.now();
                                const params = { ensureSelfProfile: true, _t: stamp };
                                go('Profile', params, { force: true })();
                                return;
                            }
                            go('Profile')();
                        }}
                        hitSlop={10}
                    >
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
        </Animated.View>
    );
};


const styles = StyleSheet.create({
    outer_view: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: FOOTER_BASE_HEIGHT,
        justifyContent: 'flex-end',
        zIndex: 2147483647,
        elevation: 2147483647,
    },
    main_ctnr: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        height: FOOTER_BASE_HEIGHT,
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
    workout_indicator_ctnr: { borderRadius: scaleSize(100), padding: scaleSize(4) },
    workout_action: {
        width: scaleSize(52),
        aspectRatio: 1,
        borderRadius: scaleSize(27),
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: 'rgba(7, 20, 54, 0.7)',
        shadowOffset: { width: 0, height: scaleSize(6) },
        shadowOpacity: 0.35,
        shadowRadius: scaleSize(10),
        elevation: scaleSize(5),
    },
    workout_action_active: {
        shadowOpacity: 0.42,
        transform: [{ scale: 1.03 }],
    },
    icon: { padding: scaleSize(13.5), borderRadius: scaleSize(25) },
    selectedIcon: {
        padding: scaleSize(13.5),
        borderRadius: scaleSize(30),
        backgroundColor: COLORS.selectedIconBg,
    },
    dead_zone: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: scaleSize(35),
        backgroundColor: 'transparent',
        zIndex: 2147483647,
    },
});

// Avoid unnecessary re-renders across tab switches
export default React.memo(Footer, (prev, next) => (
    prev.currentScreenName === next.currentScreenName &&
    prev.isHiddenByFocus === next.isHiddenByFocus &&
    prev.overlayProgressSV === next.overlayProgressSV &&
    prev.visibilityProgressSV === next.visibilityProgressSV &&
    prev.disableInteractions === next.disableInteractions &&
    prev.workoutSheetProgressSV === next.workoutSheetProgressSV
));
