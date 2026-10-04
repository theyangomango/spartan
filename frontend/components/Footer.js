import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, InteractionManager, Text, Modal, Animated as RNAnimated } from 'react-native';
import { Home, Cup, Weight, Profile as ProfileIcon } from 'iconsax-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useWorkoutStore, { WORKOUT_SHEET_STATES } from '../state/workoutStore';
import { jumpToTab, navigationRef } from '../../navigationRef';
import theme from '../theme/mfpDark';
import Animated, { useAnimatedStyle, useDerivedValue, useSharedValue, withSpring, withSequence } from 'react-native-reanimated';
import scaleSize from "../helper/scaleSize";
import { deep as triggerStartWorkoutHaptic } from "../utils/haptics";
import { openActiveWorkout, startFreshWorkout } from "../workout/workoutActions";
import styles, { COLORS, FOOTER_HIDE_OFFSET } from './Footer.styles';

const FooterBar = ({
    currentScreenName,
    navigation,
    isHiddenByFocus = false,
    overlayProgressSV,
    visibilityProgressSV,
    disableInteractions = false,
    workoutSheetProgressSV = null,
}) => {
    useEffect(() => {
        let interactionHandle = null;
        let timeoutId = null;
        const prefetchHeavyModules = () => {
            Promise.all([
                import('./3_Workout/NewWorkout/SelectExercise/SelectExerciseModal').catch(() => {}),
                import('./3_Workout/NewWorkout/ActiveWorkoutModal').catch(() => {}),
                import('@shopify/flash-list').catch(() => {}),
            ]);
        };
        if (InteractionManager?.runAfterInteractions) {
            interactionHandle = InteractionManager.runAfterInteractions(prefetchHeavyModules);
        } else {
            timeoutId = setTimeout(prefetchHeavyModules, 0);
        }
        return () => {
            try { interactionHandle?.cancel?.(); } catch {}
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, []);
    const [isWorkoutPromptVisible, setWorkoutPromptVisible] = useState(false);
    const startPromptAnim = useRef(new RNAnimated.Value(0)).current;

    useEffect(() => {
        if (!isWorkoutPromptVisible) return;
        startPromptAnim.stopAnimation();
        startPromptAnim.setValue(0);
        requestAnimationFrame(() => {
            RNAnimated.timing(startPromptAnim, {
                toValue: 1,
                duration: 220,
                useNativeDriver: true,
            }).start();
        });
    }, [isWorkoutPromptVisible, startPromptAnim]);

    useEffect(() => () => {
        startPromptAnim.stopAnimation();
    }, [startPromptAnim]);

    const openStartPrompt = useCallback(() => {
        setWorkoutPromptVisible(true);
    }, []);

    const closeStartPrompt = useCallback((afterClose) => {
        if (!isWorkoutPromptVisible) {
            if (typeof afterClose === 'function') afterClose();
            return;
        }
        RNAnimated.timing(startPromptAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setWorkoutPromptVisible(false);
            if (typeof afterClose === 'function') afterClose();
        });
    }, [isWorkoutPromptVisible, startPromptAnim]);

    const startPromptBackdropOpacity = useMemo(() => (
        startPromptAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.45],
        })
    ), [startPromptAnim]);

    const startPromptTranslateY = useMemo(() => (
        startPromptAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [scaleSize(220), 0],
        })
    ), [startPromptAnim]);
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

        const fallbackParams = params || {};

        // Jump to the tab, removing overlays if needed, with minimal state change
        if (!jumpToTab(screenName, params)) {
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
    const weightCircleColor = workoutHighlighted ? COLORS.actionCircleActive : COLORS.actionCircle;

    const weightPressScale = useSharedValue(1);
    const weightHighlightScale = useSharedValue(workoutHighlighted ? 1.04 : 1);

    useEffect(() => {
        weightHighlightScale.value = withSpring(workoutHighlighted ? 1.05 : 1, {
            damping: workoutHighlighted ? 17 : 14,
            stiffness: workoutHighlighted ? 220 : 160,
        });
    }, [weightHighlightScale, workoutHighlighted]);

    const weightAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: weightHighlightScale.value * weightPressScale.value }],
    }));

    const handleStartWorkout = useCallback(() => {
        triggerStartWorkoutHaptic?.();
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

    const handleWorkoutPromptStart = useCallback(() => {
        closeStartPrompt(() => {
            handleStartWorkout();
        });
    }, [closeStartPrompt, handleStartWorkout]);

    const handleWorkoutPromptCancel = useCallback(() => {
        closeStartPrompt();
    }, [closeStartPrompt]);

    const handleWeightPressIn = useCallback(() => {
        weightPressScale.value = withSpring(0.88, { stiffness: 360, damping: 18 });
        if (hasActiveWorkout) {
            handleStartWorkout();
            return;
        }
        openStartPrompt();
    }, [handleStartWorkout, hasActiveWorkout, openStartPrompt, weightPressScale]);

    const handleWeightPressOut = useCallback(() => {
        weightPressScale.value = withSequence(
            withSpring(1.12, { stiffness: 260, damping: 14, mass: 0.3 }),
            withSpring(1, { stiffness: 200, damping: 15 })
        );
    }, [weightPressScale]);

    return (
        <>
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
                            onPressIn={handleWeightPressIn}
                            onPressOut={handleWeightPressOut}
                            hitSlop={10}
                        >
                            <Animated.View
                                style={[
                                    styles.workout_action,
                                    { backgroundColor: weightCircleColor },
                                    workoutHighlighted && styles.workout_action_active,
                                    weightAnimatedStyle,
                                ]}
                            >
                                <Weight size={24} color={'#000'} variant="Bold" />
                            </Animated.View>
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
        {isWorkoutPromptVisible ? (
            <Modal
                transparent
                animationType="none"
                visible
                onRequestClose={handleWorkoutPromptCancel}
            >
                <View style={styles.startPromptModalRoot}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleWorkoutPromptCancel}>
                        <RNAnimated.View
                            style={[styles.startPromptBackdrop, { opacity: startPromptBackdropOpacity }]}
                        />
                    </Pressable>
                        <RNAnimated.View
                            style={[
                                styles.startPromptSheet,
                                { transform: [{ translateY: startPromptTranslateY }] },
                            ]}
                        >
                            <Pressable
                                style={({ pressed }) => [
                                    styles.startPromptItem,
                                    pressed ? styles.startPromptItemPressed : null,
                                ]}
                                onPress={handleWorkoutPromptStart}
                            >
                                <View style={styles.startPromptItemRow}>
                                    <View style={styles.startPromptItemLeft}>
                                        <MaterialCommunityIcons
                                            name="lightning-bolt-outline"
                                            size={scaleSize(20)}
                                            color={COLORS.actionCircle}
                                            style={styles.startPromptItemIcon}
                                        />
                                        <Text style={[styles.startPromptItemText, styles.startPromptStartText]}>
                                            Start Workout
                                        </Text>
                                    </View>
                                    <MaterialCommunityIcons
                                        name="chevron-right"
                                        size={scaleSize(20)}
                                        color={COLORS.actionCircle}
                                        style={styles.startPromptItemChevron}
                                    />
                                </View>
                            </Pressable>
                            <View style={styles.startPromptDivider} />
                            <Pressable
                                style={({ pressed }) => [
                                    styles.startPromptItem,
                                    pressed ? styles.startPromptItemPressed : null,
                                ]}
                                onPress={handleWorkoutPromptCancel}
                            >
                                <View style={styles.startPromptItemRow}>
                                    <View style={styles.startPromptItemLeft}>
                                        <MaterialCommunityIcons
                                            name="close"
                                            size={scaleSize(20)}
                                            color={theme.textSecondary}
                                            style={styles.startPromptItemIcon}
                                        />
                                        <Text style={[styles.startPromptItemText, styles.startPromptCancelText]}>
                                            Cancel
                                        </Text>
                                    </View>
                                </View>
                            </Pressable>
                        </RNAnimated.View>
                    </View>
                </Modal>
        ) : null}
        </>
    );
};

// In-screen instances render nothing while App mounts the global overlay footer
const Footer = (props) => {
    const globalOverlayEnabled = Boolean(global?.__USE_GLOBAL_FOOTER);
    if (!props.isOverlay && globalOverlayEnabled) {
        return null;
    }
    return <FooterBar {...props} />;
};

// Avoid unnecessary re-renders across tab switches
export default React.memo(Footer, (prev, next) => (
    prev.currentScreenName === next.currentScreenName &&
    prev.isHiddenByFocus === next.isHiddenByFocus &&
    prev.overlayProgressSV === next.overlayProgressSV &&
    prev.visibilityProgressSV === next.visibilityProgressSV &&
    prev.disableInteractions === next.disableInteractions &&
    prev.workoutSheetProgressSV === next.workoutSheetProgressSV
));
