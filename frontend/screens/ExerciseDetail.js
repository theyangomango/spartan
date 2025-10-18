import React, { useCallback, useMemo, useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    View,
    Pressable,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import useStableSafeAreaInsets from '../hooks/useStableSafeAreaInsets';
import theme from '../theme/mfpDark';
import scaleSize, { ts } from '../helper/scaleSize';
import ExerciseImagePreview from '../components/3_Workout/NewWorkout/SelectExercise/ExerciseImagePreview';
import { withStrongPress } from '../utils/haptics';

const TABS = [
    { key: 'about', label: 'About' },
    { key: 'history', label: 'History' },
    { key: 'progress', label: 'Progress' },
];

export default function ExerciseDetail() {
    const navigation = useNavigation();
    const route = useRoute();
    const insets = useStableSafeAreaInsets();
    const [activeTab, setActiveTab] = useState('about');
    const headerTopPadding = useMemo(
        () => (insets?.top ? scaleSize(12) : scaleSize(18)),
        [insets?.top]
    );

    const exerciseParam = route?.params?.exercise || {};
    const name = useMemo(() => {
        const raw = typeof exerciseParam?.name === 'string' ? exerciseParam.name : '';
        if (raw) return raw.trim();
        const fallback = typeof exerciseParam?.title === 'string' ? exerciseParam.title : '';
        return fallback.trim() || 'Exercise';
    }, [exerciseParam?.name, exerciseParam?.title]);

    const displayTitle = useMemo(() => {
        return name.replace(/\s+/g, ' ').trim() || 'Exercise';
    }, [name]);

    const muscleGroup = exerciseParam?.muscleGroup || exerciseParam?.muscle || '—';
    const equipment = exerciseParam?.equipment || '—';

    const handleBack = useCallback(() => {
        navigation.goBack?.();
    }, [navigation]);

    const handleShare = useCallback(async () => {
        const message = `Check out the ${displayTitle} exercise on Spartan.`;
        try {
            await Share.share({ message });
        } catch {
            Alert.alert('Unable to share right now. Please try again later.');
        }
    }, [displayTitle]);

    const handleFavorite = useCallback(() => {
        Alert.alert(
            'Coming soon',
            'Favorites are on the roadmap. Keep logging workouts to see history and progress here soon!'
        );
    }, []);

    const handleTabChange = useCallback((tabKey) => {
        setActiveTab(tabKey);
    }, []);

    const renderAbout = () => (
        <View style={styles.sectionSpacing}>
            <View style={styles.heroCard}>
                <View style={styles.heroImageWrapper}>
                    <ExerciseImagePreview
                        exercise={name}
                        size={scaleSize(260)}
                        style={styles.heroImagePreview}
                        imageStyle={styles.heroImage}
                    />
                </View>
            </View>

            <View style={styles.metaRow}>
                <View style={[styles.metaItem, styles.metaItemLeft]}>
                    <Text style={styles.metaLabel}>Primary Muscle</Text>
                    <Text style={styles.metaValue}>{muscleGroup}</Text>
                </View>
                <View style={[styles.metaItem, styles.metaItemRight]}>
                    <Text style={styles.metaLabel}>Equipment</Text>
                    <Text style={styles.metaValue}>{equipment}</Text>
                </View>
            </View>

            <Pressable
                style={[styles.actionButton, styles.shareButton]}
                onPress={withStrongPress(handleShare)}
                accessibilityRole="button"
                accessibilityLabel="Share exercise"
            >
                <View style={[styles.actionIcon, styles.shareIcon]}>
                    <Ionicons name="share-outline" size={scaleSize(18)} color={theme.surface} />
                </View>
                <Text style={styles.shareText}>Share Exercise</Text>
            </Pressable>

            <Pressable
                style={[styles.actionButton, styles.favoriteButton]}
                onPress={withStrongPress(handleFavorite)}
                accessibilityRole="button"
                accessibilityLabel="Add exercise to favorites"
            >
                <View style={[styles.actionIcon, styles.favoriteIcon]}>
                    <Ionicons name="bookmark-outline" size={scaleSize(18)} color={theme.textPrimary} />
                </View>
                <Text style={styles.favoriteText}>Add to Favorites</Text>
            </Pressable>

            <View style={styles.infoBlock}>
                <Text style={styles.infoTitle}>How to log this Exercise?</Text>
                <Text style={styles.infoBody}>
                    {`When building a workout, tap “Add Exercise” and search for “${displayTitle}”. Add sets with your reps and weight so we can track your history and progress right here.`}
                </Text>
            </View>
        </View>
    );

    const renderHistory = () => (
        <View style={styles.placeholder}>
            <Text style={styles.placeholderTitle}>History is on the way</Text>
            <Text style={styles.placeholderBody}>
                Log {displayTitle} in your workouts to populate recent sessions and personal records.
            </Text>
        </View>
    );

    const renderProgress = () => (
        <View style={styles.placeholder}>
            <Text style={styles.placeholderTitle}>Progress coming soon</Text>
            <Text style={styles.placeholderBody}>
                Keep tracking sets for {displayTitle}. We will visualize trends and PRs here shortly.
            </Text>
        </View>
    );

    let tabContent = null;
    if (activeTab === 'history') tabContent = renderHistory();
    else if (activeTab === 'progress') tabContent = renderProgress();
    else tabContent = renderAbout();

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeTop} />
            <SafeAreaView style={styles.safeArea}>
                <View style={[styles.header, { paddingTop: headerTopPadding }]}>
                    <Pressable
                        onPress={withStrongPress(handleBack)}
                        style={styles.backButton}
                        hitSlop={12}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                    >
                        <Ionicons name="chevron-back" size={scaleSize(24)} color={theme.textPrimary} />
                    </Pressable>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {displayTitle}
                    </Text>
                    <Pressable style={styles.moreButton} hitSlop={12} accessibilityRole="button">
                        <Ionicons name="ellipsis-horizontal" size={scaleSize(20)} color={theme.textPrimary} />
                    </Pressable>
                </View>

                <View style={styles.tabBar}>
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.key;
                        return (
                            <Pressable
                                key={tab.key}
                                onPress={withStrongPress(() => handleTabChange(tab.key))}
                                style={styles.tabItem}
                                accessibilityRole="tab"
                                accessibilityState={{ selected: isActive }}
                            >
                                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                                    {tab.label}
                                </Text>
                                <View style={[styles.tabIndicator, isActive && styles.tabIndicatorActive]} />
                            </Pressable>
                        );
                    })}
                </View>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: (insets?.bottom || 0) + scaleSize(32) },
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    {tabContent}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    safeTop: {
        backgroundColor: theme.bg,
    },
    safeArea: {
        flex: 1,
        backgroundColor: theme.bg,
        paddingTop: scaleSize(8),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scaleSize(18),
        paddingBottom: scaleSize(16),
    },
    backButton: {
        width: scaleSize(44),
        height: scaleSize(36),
        borderRadius: scaleSize(18),
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        fontFamily: 'Outfit_700Bold',
        fontSize: ts(16),
        color: theme.textPrimary,
        textAlign: 'center',
        marginHorizontal: scaleSize(10),
    },
    moreButton: {
        width: scaleSize(32),
        height: scaleSize(36),
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    tabBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: scaleSize(18),
        paddingBottom: scaleSize(10),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.12)',
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
    },
    tabLabel: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: ts(13),
        color: 'rgba(255,255,255,0.4)',
    },
    tabLabelActive: {
        color: 'rgba(255,255,255,0.95)',
    },
    tabIndicator: {
        height: scaleSize(3),
        backgroundColor: 'transparent',
        borderRadius: scaleSize(999),
        marginTop: scaleSize(6),
        width: '55%',
    },
    tabIndicatorActive: {
        backgroundColor: 'rgba(34, 61, 100, 0.9)',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: scaleSize(18),
    },
    sectionSpacing: {
        paddingTop: scaleSize(18),
    },
    heroCard: {
        backgroundColor: theme.surface,
        borderRadius: scaleSize(26),
        overflow: 'hidden',
        padding: scaleSize(18),
        alignItems: 'center',
        marginBottom: scaleSize(18),
    },
    heroImageWrapper: {
        width: '100%',
        height: scaleSize(260),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.fieldDeep,
        borderRadius: scaleSize(22),
        paddingVertical: scaleSize(20),
        paddingHorizontal: scaleSize(12),
        overflow: 'hidden',
    },
    heroImagePreview: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroImage: {
        width: '92%',
        height: '92%',
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: scaleSize(18),
    },
    metaItem: {
        flex: 1,
        padding: scaleSize(14),
        backgroundColor: theme.surface,
        borderRadius: scaleSize(18),
    },
    metaItemLeft: {
        marginRight: scaleSize(10),
    },
    metaItemRight: {
        marginLeft: scaleSize(10),
    },
    metaLabel: {
        fontFamily: 'Outfit_500Medium',
        fontSize: ts(12),
        color: theme.textSecondary,
        marginBottom: scaleSize(6),
    },
    metaValue: {
        fontFamily: 'Outfit_700Bold',
        fontSize: ts(15),
        color: theme.textPrimary,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: scaleSize(20),
        paddingVertical: scaleSize(11),
        paddingHorizontal: scaleSize(18),
        marginBottom: scaleSize(14),
    },
    shareButton: {
        backgroundColor: '#E2EDFF',
        borderWidth: 0,
        shadowColor: '#000000',
        shadowOpacity: 0.12,
        shadowRadius: scaleSize(8),
        shadowOffset: { width: 0, height: scaleSize(4) },
        elevation: 3,
    },
    favoriteButton: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.16)',
        marginBottom: scaleSize(20),
    },
    actionIcon: {
        width: scaleSize(30),
        height: scaleSize(30),
        borderRadius: scaleSize(15),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scaleSize(10),
    },
    shareIcon: {
        backgroundColor: 'rgba(9,9,9,0.08)',
    },
    favoriteIcon: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    shareText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: ts(13),
        color: theme.surface,
    },
    favoriteText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: ts(13),
        color: theme.textPrimary,
    },
    infoBlock: {
        backgroundColor: theme.surface,
        borderRadius: scaleSize(20),
        padding: scaleSize(18),
    },
    infoTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: ts(15),
        color: theme.textPrimary,
        marginBottom: scaleSize(10),
    },
    infoBody: {
        fontFamily: 'Outfit_400Regular',
        fontSize: ts(13),
        color: theme.textSecondary,
        lineHeight: ts(18),
    },
    placeholder: {
        paddingVertical: scaleSize(60),
        paddingHorizontal: scaleSize(18),
        alignItems: 'center',
    },
    placeholderTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: ts(16),
        color: theme.textPrimary,
        marginBottom: scaleSize(10),
        textAlign: 'center',
    },
    placeholderBody: {
        fontFamily: 'Outfit_400Regular',
        fontSize: ts(13),
        color: theme.textSecondary,
        textAlign: 'center',
        lineHeight: ts(18),
    },
});
