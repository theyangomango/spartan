import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Weight } from "iconsax-react-native";
import scaleSize from "../../../helper/scaleSize";
import { withStrongPress } from "../../../utils/haptics";
const formatCount = (value, singular) => {
    const count = Number.isFinite(value) ? value : Number(value) || 0;
    const safeCount = count < 0 ? 0 : count;
    const label = safeCount === 1 ? singular : `${singular}s`;
    return `${safeCount} ${label}`;
};

const formatWorkoutsCompleted = (value) => {
    const count = Number.isFinite(value) ? value : Number(value) || 0;
    const safeCount = count < 0 ? 0 : count;
    const unit = safeCount === 1 ? 'Workout' : 'Workouts';
    return `${safeCount} ${unit}`;
};

const ProfileContentCards = ({
    onPressWorkoutsAndPosts,
    onPressLoggedFoods = () => {},
    postsCount = 0,
    workoutsCount = 0,
    loggedFoodsCount = 0,
    contentLocked = false,
    lockedSubtitle = '',
}) => {
    const workoutsCompletedSubtitle = useMemo(() => formatWorkoutsCompleted(workoutsCount), [workoutsCount]);
    const postsSubtitle = useMemo(() => formatCount(postsCount, 'Post'), [postsCount]);
    const combinedSubtitle = useMemo(
        () => `${workoutsCompletedSubtitle} • ${postsSubtitle}`,
        [workoutsCompletedSubtitle, postsSubtitle]
    );
    const loggedFoodsSubtitle = useMemo(() => formatCount(loggedFoodsCount, 'Food'), [loggedFoodsCount]);

    if (contentLocked) {
        return (
            <View style={styles.lockedContainer}>
                <View style={styles.lockedIconWrap}>
                    <Ionicons name="lock-closed" size={scaleSize(38)} color="#A5B4FC" />
                </View>
                <Text style={styles.lockedTitle}>This account is private</Text>
                <Text style={styles.lockedSubtitle}>
                    {lockedSubtitle || 'Follow to unlock posts, workouts, and logged food items.'}
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Pressable
                onPress={withStrongPress(onPressWorkoutsAndPosts)}
                style={({ pressed }) => [
                    styles.card,
                    styles.cardDivider,
                    pressed && styles.cardPressed
                ]}
            >
                <View style={[styles.iconBadge, styles.workoutsBadge]}>
                    <Weight size={scaleSize(23)} color="#fff" />
                </View>
                <View style={styles.cardTextWrap}>
                    <Text style={styles.cardTitle}>Workouts & Posts</Text>
                    <Text style={styles.cardSubtitle} numberOfLines={1}>{combinedSubtitle}</Text>
                </View>
                <Ionicons
                    name="chevron-forward"
                    size={scaleSize(18)}
                    color="rgba(198, 206, 222, 0.84)"
                    style={styles.chevron}
                />
            </Pressable>

            <Pressable
                onPress={withStrongPress(onPressLoggedFoods)}
                style={({ pressed }) => [
                    styles.card,
                    styles.lastCard,
                    pressed && styles.cardPressed
                ]}
            >
                <View style={[styles.iconBadge, styles.loggedFoodsBadge]}>
                    <Ionicons name="restaurant-outline" size={scaleSize(20)} color='#fff' />
                </View>
                <View style={styles.cardTextWrap}>
                    <Text style={styles.cardTitle}>Logged Food Items</Text>
                    <Text style={styles.cardSubtitle} numberOfLines={1}>{loggedFoodsSubtitle}</Text>
                </View>
                <Ionicons
                    name="chevron-forward"
                    size={scaleSize(18)}
                    color="rgba(198, 206, 222, 0.84)"
                    style={styles.chevron}
                />
            </Pressable>
        </View>
    );
};

const CARD_RADIUS = scaleSize(20);
const CARD_BACKGROUND = 'transparent';
const CARD_DIVIDER = 'rgba(255, 255, 255, 0.08)';

const styles = StyleSheet.create({
    container: {
        backgroundColor: CARD_BACKGROUND,
        borderTopWidth: 2,
        borderBottomWidth: 2,
        borderColor: CARD_DIVIDER,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: scaleSize(17),
        paddingHorizontal: scaleSize(18),
        backgroundColor: 'transparent',
    },
    cardDivider: {
        borderBottomWidth: 2,
        borderBottomColor: CARD_DIVIDER,
    },
    lastCard: {
        borderBottomWidth: 0,
    },
    cardPressed: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
    iconBadge: {
        width: scaleSize(35),
        height: scaleSize(35),
        borderRadius: scaleSize(18),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scaleSize(14),
        borderWidth: scaleSize(1),
        // backgroundColor: 'rgba(38, 45, 64, 0.82)',
        // borderColor: 'rgba(168, 188, 224, 0.28)',
    },
    workoutsBadge: {
        // backgroundColor: 'rgba(108, 152, 252, 0.28)',
        // borderColor: 'rgba(141, 183, 255, 0.52)',
    },
    loggedFoodsBadge: {
        // backgroundColor: 'rgba(254, 226, 226, 0.28)',
        // borderColor: 'rgba(254, 215, 170, 0.5)',
    },
    cardTextWrap: {
        flex: 1,
    },
    cardTitle: {
        fontFamily: 'Nunito_800ExtraBold',
        fontSize: scaleSize(12.5),
        color: '#F6F8FF',
        marginBottom: scaleSize(2),
        letterSpacing: scaleSize(0.1),
    },
    cardSubtitle: {
        fontFamily: 'Nunito_700Bold',
        fontSize: scaleSize(12),
        color: 'rgba(214, 222, 238, 0.75)',
        letterSpacing: scaleSize(0.035),
    },
    chevron: {
        marginLeft: scaleSize(10),
    },
    lockedContainer: {
        alignItems: 'center',
        paddingVertical: scaleSize(36),
        paddingHorizontal: scaleSize(24),
        borderRadius: CARD_RADIUS,
        backgroundColor: 'rgba(17, 24, 39, 0.78)',
        borderWidth: scaleSize(1),
        borderColor: 'rgba(148, 163, 184, 0.32)',
    },
    lockedIconWrap: {
        width: scaleSize(64),
        height: scaleSize(64),
        borderRadius: scaleSize(32),
        backgroundColor: 'rgba(99, 102, 241, 0.25)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: scaleSize(12),
    },
    lockedTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(17),
        color: '#F1F5FF',
        marginBottom: scaleSize(6),
    },
    lockedSubtitle: {
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(13),
        lineHeight: scaleSize(19),
        textAlign: 'center',
        color: '#9CA3AF',
    },
});

export default ProfileContentCards;
