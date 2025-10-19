import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { toExerciseSlug } from '../components/common/exerciseImageMap';
import { withStrongPress } from '../utils/haptics';
import useSyncSavedExercises from '../hooks/useSyncSavedExercises';
import { subscribeUserData, emitUserDataUpdate } from '../utils/userDataEvents';

const TABS = [
    { key: 'about', label: 'About' },
    { key: 'history', label: 'History' },
    { key: 'progress', label: 'Progress' },
];

const STEP_SOURCE_KEYS = ['howToSteps', 'instructions', 'steps', 'howTo'];

const normalizeSavedExercises = (raw) => {
    if (!raw) return {};
    if (Array.isArray(raw)) {
        return raw.reduce((acc, entry) => {
            if (!entry) return acc;
            const name = String(entry?.name || entry).trim();
            if (!name) return acc;
            const muscleGroup = entry?.muscleGroup ?? entry?.muscle ?? null;
            acc[name] = {
                name,
                muscleGroup,
                muscle: entry?.muscle ?? entry?.muscleGroup ?? muscleGroup ?? null,
                slug: entry?.slug ?? null,
            };
            return acc;
        }, {});
    }
    if (typeof raw === 'object') {
        return Object.entries(raw).reduce((acc, [key, value]) => {
            if (!value && value !== 0) return acc;
            const name = String(value?.name || key).trim();
            if (!name) return acc;
            const muscleGroup = value?.muscleGroup ?? value?.muscle ?? null;
            acc[name] = {
                name,
                muscleGroup,
                muscle: value?.muscle ?? value?.muscleGroup ?? muscleGroup ?? null,
                slug: value?.slug ?? null,
            };
            return acc;
        }, {});
    }
    return {};
};

const savedExercisesSignature = (map) => {
    if (!map || typeof map !== 'object') return '';
    const entries = Object.keys(map)
        .sort((a, b) => a.localeCompare(b))
        .map((key) => {
            const value = map[key] || {};
            return [
                key,
                value?.muscleGroup ?? null,
                value?.muscle ?? null,
                value?.slug ?? null,
            ];
        });
    return JSON.stringify(entries);
};

const getInitialSavedExercises = () => {
    try {
        return normalizeSavedExercises(global?.userData?.savedExercises);
    } catch {
        return {};
    }
};

const normalizeHowToSteps = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
        return raw
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter(Boolean);
    }
    if (typeof raw === 'string') {
        return raw
            .split(/\r?\n+/)
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return [];
};

const resolveProvidedHowToSteps = (exercise = {}) => {
    for (const key of STEP_SOURCE_KEYS) {
        const candidate = normalizeHowToSteps(exercise?.[key]);
        if (candidate.length) return candidate;
    }

    const howToObject = exercise?.howTo;
    if (howToObject && typeof howToObject === 'object') {
        const fromObject = normalizeHowToSteps(howToObject.steps || howToObject.items || howToObject.list || howToObject);
        if (fromObject.length) return fromObject;
    }

    return [];
};

const buildFallbackHowToSteps = ({ title, muscleGroup, equipment }) => {
    const safeTitle = typeof title === 'string' && title.trim() ? title.trim() : 'this exercise';

    let sanitizedEquipment =
        typeof equipment === 'string' && equipment.trim() && equipment.trim() !== '—'
            ? equipment.trim()
            : null;
    if (sanitizedEquipment) {
        const lowered = sanitizedEquipment.toLowerCase();
        if (['body weight', 'bodyweight', 'none', 'no equipment'].includes(lowered)) {
            sanitizedEquipment = null;
        }
    }
    const sanitizedMuscle =
        typeof muscleGroup === 'string' && muscleGroup.trim() && muscleGroup.trim() !== '—'
            ? muscleGroup.trim().toLowerCase()
            : 'target muscles';

    return [
        sanitizedEquipment
            ? `Set up for ${safeTitle} and position your equipment (${sanitizedEquipment}).`
            : `Set up for ${safeTitle} by getting into a strong, stable starting position.`,
        `Keep your ${sanitizedMuscle} engaged and move through a controlled range of motion.`,
        `Breathe steadily, focus on smooth reps, and reset before starting the next set.`,
    ];
};

export default function ExerciseDetail() {
    const navigation = useNavigation();
    const route = useRoute();
    const insets = useStableSafeAreaInsets();
    const [activeTab, setActiveTab] = useState('about');
    const [savedExercisesMap, setSavedExercisesMap] = useState(() => getInitialSavedExercises());
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
    const normalizedMuscleGroup = useMemo(() => {
        if (!muscleGroup || (typeof muscleGroup === 'string' && muscleGroup.trim() === '')) return null;
        if (muscleGroup === '—') return null;
        return muscleGroup;
    }, [muscleGroup]);
    const resolvedSlug = useMemo(() => {
        const candidate = typeof exerciseParam?.slug === 'string' ? exerciseParam.slug.trim() : '';
        if (candidate) return candidate;
        return toExerciseSlug(name);
    }, [exerciseParam?.slug, name]);
    const isFavorite = useMemo(() => Boolean(savedExercisesMap?.[name]), [savedExercisesMap, name]);
    const favoriteButtonLabel = isFavorite ? 'Remove from Favorites' : 'Add to Favorites';
    const favoriteAccessibilityLabel = isFavorite
        ? 'Remove exercise from favorites'
        : 'Add exercise to favorites';

    const howToSteps = useMemo(() => {
        const resolvedSteps = resolveProvidedHowToSteps(exerciseParam);
        if (resolvedSteps.length) return resolvedSteps;
        return buildFallbackHowToSteps({
            title: displayTitle,
            muscleGroup,
            equipment,
        });
    }, [exerciseParam, displayTitle, muscleGroup, equipment]);

    useEffect(() => {
        const unsubscribe = subscribeUserData((payload) => {
            const next = normalizeSavedExercises(payload?.savedExercises);
            setSavedExercisesMap((prev) => {
                const prevSig = savedExercisesSignature(prev);
                const nextSig = savedExercisesSignature(next);
                if (prevSig === nextSig) return prev;
                return next;
            });
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        try {
            const nextSig = savedExercisesSignature(savedExercisesMap);
            const globalNormalized = normalizeSavedExercises(global?.userData?.savedExercises);
            const globalSig = savedExercisesSignature(globalNormalized);
            if (nextSig !== globalSig) {
                if (!global.userData) global.userData = {};
                global.userData.savedExercises = savedExercisesMap || {};
                emitUserDataUpdate();
            }
        } catch {
            // ignore
        }
    }, [savedExercisesMap]);

    useSyncSavedExercises(savedExercisesMap);

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

    const handleToggleFavorite = useCallback(() => {
        if (!name) return;
        setSavedExercisesMap((prev) => {
            const exists = prev?.[name];
            if (exists) {
                const next = { ...prev };
                delete next[name];
                return next;
            }
            const next = {
                ...prev,
                [name]: {
                    name,
                    muscleGroup: normalizedMuscleGroup,
                    muscle: normalizedMuscleGroup,
                    slug: resolvedSlug,
                },
            };
            return next;
        });
    }, [name, normalizedMuscleGroup, resolvedSlug]);

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

            {howToSteps.length > 0 && (
                <View style={styles.howToBlock}>
                    <Text style={styles.howToTitle}>{`How to do ${displayTitle}`}</Text>
                    {howToSteps.map((step, index) => (
                        <View
                            key={`howTo-${index}`}
                            style={[
                                styles.howToRow,
                                index === howToSteps.length - 1 && styles.howToRowLast,
                            ]}
                        >
                            <Text style={styles.howToIndex}>{`${index + 1}.`}</Text>
                            <Text style={styles.howToText}>{step}</Text>
                        </View>
                    ))}
                </View>
            )}

            <Pressable
                style={[styles.actionButton, styles.shareButton]}
                onPress={withStrongPress(handleToggleFavorite)}
                accessibilityRole="button"
                accessibilityLabel={favoriteAccessibilityLabel}
                accessibilityState={{ selected: isFavorite }}
            >
                <View
                    style={[
                        styles.actionIcon,
                        styles.shareIcon,
                        isFavorite && styles.favoriteIconActive,
                    ]}
                >
                    <Ionicons
                        name={isFavorite ? 'bookmark' : 'bookmark-outline'}
                        size={scaleSize(16)}
                        color={isFavorite ? theme.primary : theme.surface}
                    />
                </View>
                <Text style={styles.shareText}>{favoriteButtonLabel}</Text>
                <View style={styles.actionIconSpacer} />
            </Pressable>

            <Pressable
                style={[styles.actionButton, styles.favoriteButton]}
                onPress={withStrongPress(handleShare)}
                accessibilityRole="button"
                accessibilityLabel="Share exercise"
            >
                <View style={[styles.actionIcon, styles.favoriteIcon]}>
                    <Ionicons name="share-outline" size={scaleSize(18)} color={theme.textPrimary} />
                </View>
                <Text style={styles.favoriteText}>Share Exercise</Text>
                <View style={styles.actionIconSpacer} />
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
        fontSize: ts(14),
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
        paddingVertical: scaleSize(10),
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
    favoriteIconActive: {
        backgroundColor: 'rgba(45, 158, 255, 0.22)',
    },
    shareText: {
        flex: 1,
        fontFamily: 'Outfit_700Bold',
        fontSize: ts(13),
        color: theme.surface,
        textAlign: 'center',
    },
    favoriteText: {
        flex: 1,
        fontFamily: 'Outfit_600SemiBold',
        fontSize: ts(13),
        color: theme.textPrimary,
        textAlign: 'center',
    },
    actionIconSpacer: {
        width: scaleSize(30),
        height: scaleSize(30),
        marginLeft: scaleSize(10),
        opacity: 0,
    },
    howToBlock: {
        backgroundColor: theme.surface,
        borderRadius: scaleSize(20),
        padding: scaleSize(18),
        marginBottom: scaleSize(20),
    },
    howToTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: ts(15),
        color: theme.textPrimary,
        marginBottom: scaleSize(12),
    },
    howToRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: scaleSize(10),
    },
    howToRowLast: {
        marginBottom: 0,
    },
    howToIndex: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: ts(13),
        color: theme.textPrimary,
        marginRight: scaleSize(10),
        lineHeight: ts(18),
    },
    howToText: {
        flex: 1,
        fontFamily: 'Outfit_400Regular',
        fontSize: ts(13),
        color: theme.textSecondary,
        lineHeight: ts(18),
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
