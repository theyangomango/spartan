import React, { useCallback, useMemo } from 'react';
import { View, Text, ActivityIndicator, Animated, FlatList, Pressable } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import scaleSize from '../../../helper/scaleSize';
import { styles, COLORS, scaledSize } from './UserStatsStyles';
import { withStrongPress } from '../../../utils/haptics';
import WorkoutHistoryCard from '../../5_Profile/ProfileBottom/History/WorkoutHistoryCard';
import { extractWid } from './userStatsUtils';

export default function UserStatsExerciseDetailScreen({
    visible,
    gesture,
    detailName,
    translateX,
    workoutCount,
    workoutIds,
    workouts,
    loading,
    onClose,
    onPressWorkout,
}) {
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
                <View style={styles.detailHeader}>
                    <Pressable onPress={withStrongPress(onClose)} hitSlop={10} style={styles.detailBackRow}>
                        <MaterialCommunityIcons name="chevron-left" size={scaledSize(18)} color={COLORS.text} />
                        <Text numberOfLines={1} style={styles.detailTitle}>{detailName}</Text>
                    </Pressable>
                    <View style={styles.detailCountPill}>
                        <MaterialCommunityIcons name="view-grid-outline" size={scaledSize(11)} color={COLORS.subtext} />
                        <Text style={styles.detailCountText}>
                            {workoutCount} {workoutCount === 1 ? 'workout' : 'workouts'}
                        </Text>
                    </View>
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
