import React, { useCallback, useMemo } from 'react';
import { View, Text, ActivityIndicator, Animated, FlatList, Pressable } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import scaleSize from '../../../helper/scaleSize';
import { styles, COLORS, scaledSize, DETAIL_HEADER_GRADIENT, DETAIL_METRIC_GRADIENT } from './UserStatsStyles';
import { withStrongPress } from '../../../utils/haptics';
import WorkoutHistoryCard from '../../5_Profile/ProfileBottom/History/WorkoutHistoryCard';
import {
    extractWid,
    computeTotalReps,
    computeVolume,
    bestTopSet,
    estimate1RM,
    fmtK,
} from './userStatsUtils';

export default function UserStatsExerciseDetailScreen({
    visible,
    gesture,
    detailName,
    translateX,
    workoutIds,
    exercise,
    workouts,
    loading,
    onClose,
    onPressWorkout,
}) {
    const headerExercise = exercise || {};
    const headerName = detailName || 'Exercise';
    const setsCount = Array.isArray(headerExercise?.sets) ? headerExercise.sets.length : 0;
    const totalReps = computeTotalReps(headerExercise);
    const volume = computeVolume(headerExercise);
    const topSet = bestTopSet(headerExercise);
    const oneRM = estimate1RM(headerExercise);

    const workoutCount = workoutIds.length;
    const workoutCountLabel = useMemo(() => {
        if (!workoutCount) return null;
        return `${workoutCount} ${workoutCount === 1 ? 'workout' : 'workouts'}`;
    }, [workoutCount]);

    const metrics = useMemo(() => ([
        { label: 'Sets', value: setsCount ? String(setsCount) : '0' },
        { label: 'Reps', value: fmtK(totalReps) },
        { label: 'Volume', value: fmtK(volume) },
        { label: 'Top Set', value: topSet ? `${topSet.weight} x ${topSet.reps}` : '-' },
    ]), [setsCount, totalReps, volume, topSet]);
    const keyExtractor = useCallback((item, index) => {
        const wid = extractWid(item);
        return `${detailName || 'exercise'}-${wid || index}`;
    }, [detailName]);

    const renderWorkout = useCallback(({ item }) => (
        <Pressable onPress={withStrongPress(() => onPressWorkout(item))}>
            <WorkoutHistoryCard workout={item} />
        </Pressable>
    ), [onPressWorkout]);

    const footerComponent = useMemo(() => (
        loading ? (
            <View style={styles.detailLoadingFooter}>
                <ActivityIndicator size="small" color={COLORS.subtext} />
            </View>
        ) : (
            <View style={{ height: scaleSize(scaledSize(40)) }} />
        )
    ), [loading]);

    if (!visible) return null;

    return (
        <GestureDetector gesture={gesture}>
            <Animated.View
                pointerEvents="auto"
                style={[styles.detailOverlay, { transform: [{ translateX }] }]}
            >
                <View style={styles.detailHeaderWrapper}>
                    <LinearGradient
                        colors={DETAIL_HEADER_GRADIENT}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.detailHeaderCard}
                    >
                        <View style={styles.detailHeaderTopRow}>
                            <Pressable
                                onPress={withStrongPress(onClose)}
                                hitSlop={10}
                                style={({ pressed }) => [
                                    styles.detailBackButton,
                                    pressed && styles.detailBackButtonPressed,
                                ]}
                            >
                                <MaterialCommunityIcons name="chevron-left" size={scaledSize(18)} color={COLORS.text} />
                            </Pressable>

                            <View style={styles.detailHeaderTitleWrap}>
                                <Text numberOfLines={2} style={styles.detailHeaderTitle}>{headerName}</Text>
                                {workoutCountLabel ? (
                                    <Text numberOfLines={1} style={styles.detailHeaderSubtitle}>{workoutCountLabel}</Text>
                                ) : null}
                            </View>

                            {!!oneRM && oneRM > 0 && (
                                <View style={styles.detailOneRmPill}>
                                    <Text style={styles.detailOneRmLabel}>1RM (Adj)</Text>
                                    <Text style={styles.detailOneRmValue}>{oneRM}</Text>
                                </View>
                            )}
                        </View>

                        <LinearGradient
                            colors={DETAIL_METRIC_GRADIENT}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.detailMetricsRow}
                        >
                            {metrics.map((metric, index) => (
                                <React.Fragment key={metric.label}>
                                    <View style={styles.detailMetric}>
                                        <Text style={styles.detailMetricValue} numberOfLines={1}>{metric.value}</Text>
                                        <Text style={styles.detailMetricLabel}>{metric.label}</Text>
                                    </View>
                                    {index < metrics.length - 1 ? <View style={styles.detailMetricDivider} /> : null}
                                </React.Fragment>
                            ))}
                        </LinearGradient>
                    </LinearGradient>
                </View>

                {workoutIds.length === 0 ? (
                    <View style={styles.detailEmpty}>
                        <Text style={styles.emptyText}>No workouts yet.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={workouts}
                        keyExtractor={keyExtractor}
                        contentContainerStyle={[styles.detailListContent]}
                        showsVerticalScrollIndicator={false}
                        renderItem={renderWorkout}
                        ListEmptyComponent={(
                            <View style={styles.detailEmpty}>
                                {loading ? (
                                    <ActivityIndicator size="small" color={COLORS.subtext} />
                                ) : (
                                    <Text style={styles.emptyText}>No workouts available.</Text>
                                )}
                            </View>
                        )}
                        ListFooterComponent={footerComponent}
                    />
                )}
            </Animated.View>
        </GestureDetector>
    );
}
