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
import calculate1RM from '../helper/calculate1RM';

const TABS = [
    { key: 'about', label: 'About' },
    { key: 'history', label: 'History' },
    // Temporarily hiding progress until designs are finalized.
    // { key: 'progress', label: 'Progress' },
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

const HISTORY_SESSION_LIMIT = 15;
const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const WORKOUT_TIMESTAMP_FIELDS = [
    'finishedAt',
    'completedAt',
    'updatedAt',
    'startedAt',
    'createdAt',
    'created',
];

const toMillisSafe = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? 0 : value.getTime();
    if (typeof value?.toMillis === 'function') {
        const result = Number(value.toMillis());
        return Number.isFinite(result) ? result : 0;
    }
    if (typeof value === 'object' && typeof value.seconds === 'number') {
        return value.seconds * 1000;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return 0;
        const numeric = Number(trimmed);
        if (Number.isFinite(numeric)) return numeric;
        const parsed = new Date(trimmed).getTime();
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

const parseDayKeyToDate = (dayKey) => {
    if (typeof dayKey !== 'string') return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey.trim());
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    const candidate = new Date(year, month, day);
    return Number.isNaN(candidate.getTime()) ? null : candidate;
};

const formatNumberCompact = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '0';
    const rounded = Math.round(num * 10) / 10;
    if (Math.abs(rounded - Math.round(rounded)) < 1e-6) return String(Math.round(rounded));
    return rounded.toFixed(1).replace(/\.0$/, '');
};

const formatWeightValue = (weight) => {
    const num = Number(weight);
    if (!Number.isFinite(num) || num <= 0) return '—';
    return formatNumberCompact(num);
};

const firstAvailableString = (...values) => {
    for (const value of values) {
        if (value === null || value === undefined) continue;
        if (typeof value === 'string' || typeof value === 'number') {
            const str = String(value).trim();
            if (str) return str;
        }
    }
    return '';
};

const deriveSessionTitle = (workout, timestamp) => {
    const candidate = firstAvailableString(
        workout?.templateName,
        workout?.template?.name,
        workout?.name,
        workout?.title,
        workout?.caption
    );
    if (candidate) return candidate;

    const date = timestamp ? new Date(timestamp) : null;
    if (date && !Number.isNaN(date.getTime())) {
        const hours = date.getHours();
        if (hours < 12) return 'Morning session';
        if (hours < 17) return 'Afternoon session';
        return 'Evening session';
    }
    return 'Workout session';
};

const buildSessionMeta = (timestamp, dayKey) => {
    let dateObj = null;
    if (timestamp) {
        const candidate = new Date(timestamp);
        if (!Number.isNaN(candidate.getTime())) dateObj = candidate;
    }
    if (!dateObj) {
        const parsed = parseDayKeyToDate(dayKey);
        if (parsed) dateObj = parsed;
    }
    if (!dateObj) return '';

    let datePart = '';
    let timePart = '';
    try {
        datePart = dateObj.toLocaleDateString(undefined, {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        datePart = '';
    }
    if (timestamp) {
        try {
            timePart = dateObj.toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
            });
        } catch {
            timePart = '';
        }
    }
    if (datePart && timePart) return `${datePart} at ${timePart}`;
    return datePart || timePart || '';
};

const setKeyForStatSet = (set) => {
    if (!set || typeof set !== 'object') return '';
    const weight = Number(set.weight);
    const reps = Number(set.reps);
    if (!Number.isFinite(weight) || !Number.isFinite(reps)) return '';
    return `${Math.round(weight * 1000)}:${Math.round(reps * 1000)}`;
};

const normalizeStatSet = (rawSet) => {
    if (!rawSet || typeof rawSet !== 'object') return null;
    const weight = Number(rawSet.weight ?? rawSet.kg ?? rawSet.lbs ?? rawSet.load ?? 0);
    const reps = Number(rawSet.reps ?? rawSet.rep ?? rawSet.r ?? 0);
    if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(reps) || reps <= 0) return null;
    const normalized = { weight, reps };

    if (typeof rawSet.date === 'string' && rawSet.date.trim()) normalized.date = rawSet.date.trim();

    if (rawSet.wid !== null && rawSet.wid !== undefined) {
        try {
            const widStr = String(rawSet.wid).trim();
            if (widStr) normalized.wid = widStr;
        } catch {
            // ignore
        }
    }

    const ts = toMillisSafe(rawSet.timestamp ?? rawSet.ts ?? null);
    if (ts) normalized.timestamp = ts;

    if (typeof rawSet.privacyMode === 'string' && rawSet.privacyMode.trim()) {
        normalized.privacyMode = rawSet.privacyMode.trim();
    }

    return normalized;
};

const normalizeStatsExercises = (raw) => {
    if (!raw || typeof raw !== 'object') return {};
    return Object.entries(raw).reduce((acc, [key, value]) => {
        if (!value || typeof value !== 'object') return acc;
        const sets = Array.isArray(value.sets) ? value.sets.map(normalizeStatSet).filter(Boolean) : [];
        acc[key] = { ...value, sets };
        return acc;
    }, {});
};

const extractWid = (workout) => {
    if (!workout || typeof workout !== 'object') return '';
    const candidates = [workout?.wid, workout?.id, workout?.workoutId, workout?.pid];
    for (const candidate of candidates) {
        if (candidate === null || candidate === undefined) continue;
        const str = String(candidate).trim();
        if (str) return str;
    }
    return '';
};

const resolveWorkoutTimestamp = (workout) => {
    if (!workout || typeof workout !== 'object') return 0;
    for (const field of WORKOUT_TIMESTAMP_FIELDS) {
        const ms = toMillisSafe(workout?.[field]);
        if (ms) return ms;
    }
    return 0;
};

const statsExercisesSignature = (map) => {
    if (!map || typeof map !== 'object') return '';
    const entries = Object.keys(map)
        .sort((a, b) => a.localeCompare(b))
        .map((key) => {
            const entry = map[key] || {};
            const sets = Array.isArray(entry.sets) ? entry.sets : [];
            const last = sets[sets.length - 1] || {};
            return [
                key,
                Number(entry?.['1RM'] || 0) || 0,
                sets.length,
                Number(last?.weight || 0) || 0,
                Number(last?.reps || 0) || 0,
                last?.date || null,
                last?.wid || null,
            ];
        });
    return JSON.stringify(entries);
};

const completedWorkoutsSignature = (list) => {
    if (!Array.isArray(list)) return '';
    const sample = list.slice(0, 40).map((workout) => {
        const wid = extractWid(workout);
        const ts = resolveWorkoutTimestamp(workout);
        return [wid, ts];
    });
    return JSON.stringify(sample);
};

const sanitizeCompletedWorkouts = (raw) => {
    if (!Array.isArray(raw)) return [];
    return raw.filter(Boolean);
};

const getInitialStatsExercises = () => {
    try {
        return normalizeStatsExercises(global?.userData?.statsExercises);
    } catch {
        return {};
    }
};

const getInitialCompletedWorkouts = () => {
    try {
        return sanitizeCompletedWorkouts(global?.userData?.completedWorkouts);
    } catch {
        return [];
    }
};

const resolvePreferredWeightUnit = (payload) => {
    const source = payload || (() => {
        try {
            return global?.userData || null;
        } catch {
            return null;
        }
    })();
    try {
        const raw = source?.settings?.units ?? source?.units;
        if (!raw) return 'lb';
        const normalized = String(raw).trim().toLowerCase();
        return normalized === 'kg' ? 'kg' : 'lb';
    } catch {
        return 'lb';
    }
};

const findStatsEntry = (statsMap, exerciseName) => {
    if (!statsMap || typeof statsMap !== 'object') return null;
    if (!exerciseName) return null;
    if (statsMap[exerciseName]) return statsMap[exerciseName];
    const lower = exerciseName.toLowerCase();
    const match = Object.keys(statsMap).find((key) => key.toLowerCase() === lower);
    return match ? statsMap[match] : null;
};

export default function ExerciseDetail() {
    const navigation = useNavigation();
    const route = useRoute();
    const insets = useStableSafeAreaInsets();
    const [activeTab, setActiveTab] = useState('about');
    const [savedExercisesMap, setSavedExercisesMap] = useState(() => getInitialSavedExercises());
    const [statsExercisesMap, setStatsExercisesMap] = useState(() => getInitialStatsExercises());
    const [completedWorkouts, setCompletedWorkouts] = useState(() => getInitialCompletedWorkouts());
    const [weightUnit, setWeightUnit] = useState(() => resolvePreferredWeightUnit());
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

    const exerciseStatsEntry = useMemo(() => {
        const direct = findStatsEntry(statsExercisesMap, name);
        if (direct) return direct;
        if (displayTitle && displayTitle !== name) {
            return findStatsEntry(statsExercisesMap, displayTitle);
        }
        return null;
    }, [statsExercisesMap, name, displayTitle]);

    const historySessions = useMemo(() => {
        const entry = exerciseStatsEntry;
        const sets = Array.isArray(entry?.sets) ? entry.sets : [];
        if (!sets.length) return [];

        const workoutsArray = Array.isArray(completedWorkouts) ? completedWorkouts : [];
        const workoutsByWid = new Map();
        workoutsArray.forEach((workout) => {
            const wid = extractWid(workout);
            if (wid) workoutsByWid.set(wid, workout);
        });

        const grouped = new Map();
        sets.forEach((set) => {
            const wid = set?.wid ? String(set.wid) : '';
            const dayKey = typeof set?.date === 'string' && set.date ? set.date : null;
            const groupKey = wid ? `wid:${wid}` : `day:${dayKey || 'unknown'}`;
            let session = grouped.get(groupKey);
            if (!session) {
                const workout = wid ? workoutsByWid.get(wid) : null;
                session = {
                    key: groupKey,
                    wid: wid || null,
                    dayKey,
                    workout,
                    sets: [],
                    timestamps: [],
                };
                grouped.set(groupKey, session);
            }
            const timestamp = toMillisSafe(set?.timestamp);
            if (timestamp) session.timestamps.push(timestamp);
            session.sets.push({
                weight: Number(set.weight) || 0,
                reps: Number(set.reps) || 0,
                raw: set,
            });
        });

        let bestSetKey = '';
        if (entry?.bestSet) {
            bestSetKey = setKeyForStatSet(entry.bestSet);
        }
        const recordedBest1RM = Number(entry?.['1RM']) || 0;
        let bestOneRm = recordedBest1RM > 0 ? recordedBest1RM : 0;
        if ((!bestOneRm || bestOneRm <= 0) && entry?.bestSet) {
            const computed = calculate1RM(
                Number(entry.bestSet.weight) || 0,
                Number(entry.bestSet.reps) || 0
            );
            bestOneRm = Number.isFinite(computed) ? computed : 0;
        }

        const unitNormalized = typeof weightUnit === 'string' ? weightUnit.trim().toLowerCase() : '';
        const highlightUnit = unitNormalized === 'kg' ? 'kg' : unitNormalized === 'lb' ? 'lb' : '';
        const highlightValue = bestOneRm > 0 ? formatWeightValue(bestOneRm) : '';
        const highlightLabel =
            bestSetKey && highlightValue && highlightValue !== '—'
                ? `1RM (${highlightValue}${highlightUnit})`
                : '';

        let sessions = Array.from(grouped.values()).map((session) => {
            const workoutTs = resolveWorkoutTimestamp(session.workout);
            const setTs = session.timestamps.length ? Math.max(...session.timestamps) : 0;
            const dayDate = parseDayKeyToDate(session.dayKey);
            const fallbackTs = dayDate ? dayDate.getTime() : 0;
            const timestamp = workoutTs || setTs || fallbackTs;
            const dateObj = timestamp ? new Date(timestamp) : dayDate;
            const dayLabel = dateObj ? WEEKDAY_LABELS[dateObj.getDay()] || '' : '';

            const title = deriveSessionTitle(session.workout, timestamp || fallbackTs);
            const meta = buildSessionMeta(timestamp || fallbackTs, session.dayKey);

            let highlightConsumed = false;
            const parsedSets = session.sets.map((item, index) => {
                const repsNumber = Number.isFinite(item.reps) ? item.reps : 0;
                const highlightMatch =
                    !highlightConsumed &&
                    bestSetKey &&
                    setKeyForStatSet(item.raw) === bestSetKey;
                if (highlightMatch) highlightConsumed = true;

                return {
                    key: `${session.key}-set-${index}`,
                    index: index + 1,
                    weightLabel: formatWeightValue(item.weight),
                    repsLabel: repsNumber > 0 ? String(Math.round(repsNumber)) : '—',
                    highlight: highlightMatch && highlightLabel ? highlightLabel : null,
                };
            });

            return {
                key: session.key,
                wid: session.wid,
                timestamp,
                dayLabel,
                title,
                meta,
                sets: parsedSets,
            };
        });

        sessions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        if (HISTORY_SESSION_LIMIT && sessions.length > HISTORY_SESSION_LIMIT) {
            sessions = sessions.slice(0, HISTORY_SESSION_LIMIT);
        }
        return sessions;
    }, [exerciseStatsEntry, completedWorkouts, weightUnit]);

    const weightColumnLabel = useMemo(() => {
        const normalized = typeof weightUnit === 'string' ? weightUnit.trim().toLowerCase() : '';
        if (normalized === 'kg') return 'kg';
        if (normalized === 'lb') return 'lb';
        if (!normalized) return 'lb';
        return normalized;
    }, [weightUnit]);

    useEffect(() => {
        const unsubscribe = subscribeUserData((payload) => {
            const next = normalizeSavedExercises(payload?.savedExercises);
            setSavedExercisesMap((prev) => {
                const prevSig = savedExercisesSignature(prev);
                const nextSig = savedExercisesSignature(next);
                if (prevSig === nextSig) return prev;
                return next;
            });
            const nextStats = normalizeStatsExercises(payload?.statsExercises);
            const nextStatsSig = statsExercisesSignature(nextStats);
            setStatsExercisesMap((prev) => {
                const prevSig = statsExercisesSignature(prev);
                if (prevSig === nextStatsSig) return prev;
                return nextStats;
            });
            const nextWorkouts = sanitizeCompletedWorkouts(payload?.completedWorkouts);
            const nextWorkoutsSig = completedWorkoutsSignature(nextWorkouts);
            setCompletedWorkouts((prev) => {
                const prevSig = completedWorkoutsSignature(prev);
                if (prevSig === nextWorkoutsSig) return prev;
                return nextWorkouts;
            });
            const nextUnit = resolvePreferredWeightUnit(payload);
            setWeightUnit((prev) => (prev === nextUnit ? prev : nextUnit));
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
        </View>
    );

    const renderHistory = () => {
        if (!historySessions.length) {
            return (
                <View style={styles.placeholder}>
                    <Text style={styles.placeholderTitle}>No history yet</Text>
                    <Text style={styles.placeholderBody}>
                        Log {displayTitle} in your workouts to populate recent sessions and personal records.
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.historySection}>
                {historySessions.map((session) => (
                    <View key={session.key} style={styles.historyCard}>
                        <View style={styles.historyHeaderRow}>
                            <View style={styles.historyHeaderTextBlock}>
                                <Text style={styles.historyTitle}>{session.title}</Text>
                                {session.meta ? (
                                    <Text style={styles.historySubtitle}>{session.meta}</Text>
                                ) : null}
                            </View>
                        </View>

                        <View style={styles.historyTableHeader}>
                            <View style={styles.historySetColumn}>
                                <Text style={styles.historyTableHeaderText}>Set</Text>
                            </View>
                            <View style={styles.historyWeightColumn}>
                                <Text style={styles.historyTableHeaderText}>{weightColumnLabel}</Text>
                            </View>
                            <View style={styles.historyRepsColumn}>
                                <Text style={styles.historyTableHeaderText}>Reps</Text>
                            </View>
                        </View>

                        {session.sets.map((set, index) => {
                            const isLast = index === session.sets.length - 1;
                            const rowStyle = [styles.historyRow];
                            if (isLast) rowStyle.push(styles.historyRowLast);
                            if (set.highlight) rowStyle.push(styles.historyRowWithBadge);
                            return (
                                <View key={set.key} style={rowStyle}>
                                    <View
                                        style={[
                                            styles.historySetColumn,
                                            set.highlight && styles.historyCellWithBadge,
                                        ]}
                                    >
                                        <Text style={styles.historySetValue}>{set.index}</Text>
                                    </View>
                                    <View
                                        style={[
                                            styles.historyWeightColumn,
                                            set.highlight && styles.historyWeightColumnWithBadge,
                                        ]}
                                    >
                                        <Text style={styles.historyValueText}>{set.weightLabel}</Text>
                                        {set.highlight ? (
                                            <View style={styles.historyBadge}>
                                                <Text style={styles.historyBadgeText}>{set.highlight}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    <View
                                        style={[
                                            styles.historyRepsColumn,
                                            set.highlight && styles.historyCellWithBadge,
                                        ]}
                                    >
                                        <Text style={styles.historyValueText}>{set.repsLabel}</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                ))}
            </View>
        );
    };

    // const renderProgress = () => (
    //     <View style={styles.placeholder}>
    //         <Text style={styles.placeholderTitle}>Progress coming soon</Text>
    //         <Text style={styles.placeholderBody}>
    //             Keep tracking sets for {displayTitle}. We will visualize trends and PRs here shortly.
    //         </Text>
    //     </View>
    // );

    let tabContent = null;
    if (activeTab === 'history') tabContent = renderHistory();
    // else if (activeTab === 'progress') tabContent = renderProgress();
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
                    <View style={styles.headerSideSpacer} />
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
    headerSideSpacer: {
        width: scaleSize(44),
        height: scaleSize(36),
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
        paddingHorizontal: scaleSize(12),
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
    historySection: {
        paddingTop: scaleSize(18),
    },
    historyCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: scaleSize(20),
        paddingVertical: scaleSize(16),
        paddingHorizontal: scaleSize(16),
        marginBottom: scaleSize(18),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    historyHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scaleSize(14),
        paddingHorizontal: scaleSize(6)
    },
    historyDayBadge: {
        width: scaleSize(46),
        height: scaleSize(46),
        borderRadius: scaleSize(12),
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scaleSize(12),
    },
    historyDayBadgeText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: ts(14),
        color: theme.textPrimary,
    },
    historyHeaderTextBlock: {
        flex: 1,
    },
    historyTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: ts(15),
        color: theme.textPrimary,
    },
    historySubtitle: {
        marginTop: scaleSize(4),
        fontFamily: 'Outfit_400Regular',
        fontSize: ts(12),
        color: theme.textSecondary,
    },
    historyTableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: scaleSize(8),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.12)',
        marginBottom: scaleSize(4),
    },
    historyTableHeaderText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: ts(11),
        letterSpacing: 0.4,
        color: 'rgba(255,255,255,0.6)',
        textTransform: 'uppercase',
    },
    historySetColumn: {
        width: scaleSize(52),
        alignItems: 'center',
        justifyContent: 'center',
    },
    historyWeightColumn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    historyWeightColumnWithBadge: {
        justifyContent: 'flex-start',
    },
    historyRepsColumn: {
        width: scaleSize(70),
        alignItems: 'center',
        justifyContent: 'center',
    },
    historyCellWithBadge: {
        justifyContent: 'flex-start',
    },
    historyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: scaleSize(10),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    historyRowLast: {
        borderBottomWidth: 0,
        paddingBottom: scaleSize(6),
    },
    historyRowWithBadge: {
        alignItems: 'flex-start',
        paddingTop: scaleSize(6),
        paddingBottom: scaleSize(12),
    },
    historySetValue: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: ts(13),
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
    },
    historyValueText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: ts(14),
        color: theme.textPrimary,
        textAlign: 'center',
    },
    historyBadge: {
        marginTop: scaleSize(4),
        paddingHorizontal: scaleSize(10),
        paddingVertical: scaleSize(4),
        borderRadius: scaleSize(12),
        backgroundColor: 'rgba(255,215,111,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    historyBadgeText: {
        fontFamily: 'Outfit_500Medium',
        fontSize: ts(11),
        color: '#FFD76F',
        textAlign: 'center',
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
