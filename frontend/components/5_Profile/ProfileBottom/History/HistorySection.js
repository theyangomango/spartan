// HistorySection.js
import React, { memo, useCallback, useEffect, useRef } from "react";
import { StyleSheet, FlatList, View, Pressable, Text } from "react-native";
import WorkoutHistoryCard from "./WorkoutHistoryCard";
import { toMillis } from "../../../../utils/friends";
import { filterViewableWorkouts } from "../../../../utils/workoutPrivacy";
import { withStrongPress } from "../../../../utils/haptics";

import scaleSize from "../../../../helper/scaleSize";
import theme from "../../../../theme/mfpDark";

const lastUsedDate = "July 6th";
const exercises = [
    { name: "3 x Incline Bench (Barbell)", muscle: "Chest" },
    { name: "3 x Decline Bench (Barbell)", muscle: "Chest" },
    { name: "3 x Chest Flys", muscle: "Chest" },
    { name: "5 x Pull Ups", muscle: "Back" },
    { name: "3 x Bicep Curls (Dumbell)", muscle: "Biceps" },
    { name: "3 x Lateral Raises", muscle: "Shoulders" },
    { name: "3 x Shoulder Press (Dumbell)", muscle: "Shoulders" },
    { name: "5 x Reverse Curls (Barbell)", muscle: "Biceps" }
];

const HistorySection = ({
    isVisible,
    isBottomSheetExpanded,
    completedWorkouts,
    onOpenWorkout,
    onScrollExpandRequest,
    ownerData,
    viewingSelf = false,
}) => {
    const viewer = (() => { try { return global?.userData || null; } catch { return null; } })();
    const viewerUid = viewer?.uid ? String(viewer.uid) : "";
    const filteredWorkouts = filterViewableWorkouts(
        Array.isArray(completedWorkouts) ? completedWorkouts : [],
        viewerUid,
        viewer,
        ownerData || viewer
    );
    const sortedWorkouts = [...filteredWorkouts].sort((a, b) => {
        const aMs = toMillis(a?.created ?? a?.createdAt ?? a?.finishedAt);
        const bMs = toMillis(b?.created ?? b?.createdAt ?? b?.finishedAt);
        return bMs - aMs;
    });
    const renderWorkout = ({ item }) => (
        <Pressable onPress={withStrongPress(() => onOpenWorkout && onOpenWorkout(item))}>
            <WorkoutHistoryCard workout={item} />
        </Pressable>
    );

    const isEmpty = sortedWorkouts.length === 0;
    const emptySubtitleText = viewingSelf
        ? 'Complete a workout to see it here.'
        : 'This user has not logged any workouts yet.';

    const isDraggingRef = useRef(false);
    const recentlyDraggedRef = useRef(false);
    const dragEndTimeoutRef = useRef(null);

    const clearDragEndTimeout = useCallback(() => {
        const timeoutId = dragEndTimeoutRef.current;
        if (!timeoutId) return;
        clearTimeout(timeoutId);
        dragEndTimeoutRef.current = null;
    }, []);

    const scheduleRecentlyDraggedReset = useCallback(() => {
        clearDragEndTimeout();
        dragEndTimeoutRef.current = setTimeout(() => {
            recentlyDraggedRef.current = false;
            dragEndTimeoutRef.current = null;
        }, 180);
    }, [clearDragEndTimeout]);

    useEffect(() => () => {
        clearDragEndTimeout();
    }, [clearDragEndTimeout]);

    useEffect(() => {
        if (isVisible) return;
        isDraggingRef.current = false;
        recentlyDraggedRef.current = false;
        clearDragEndTimeout();
    }, [isVisible, clearDragEndTimeout]);

    const handleScrollBeginDrag = useCallback(() => {
        isDraggingRef.current = true;
        recentlyDraggedRef.current = true;
        clearDragEndTimeout();
    }, [clearDragEndTimeout]);

    const handleScrollEndDrag = useCallback(() => {
        isDraggingRef.current = false;
        recentlyDraggedRef.current = true;
        scheduleRecentlyDraggedReset();
    }, [scheduleRecentlyDraggedReset]);

    const handleMomentumScrollEnd = useCallback(() => {
        isDraggingRef.current = false;
        recentlyDraggedRef.current = false;
        clearDragEndTimeout();
    }, [clearDragEndTimeout]);

    const handleScroll = useCallback((event) => {
        if (typeof onScrollExpandRequest !== 'function') return;
        const offsetY = event?.nativeEvent?.contentOffset?.y ?? 0;
        if (!isDraggingRef.current && !recentlyDraggedRef.current) return;
        onScrollExpandRequest(Math.max(0, offsetY));
    }, [onScrollExpandRequest]);

    return (
        <View style={[styles.wrap, !isVisible && styles.hidden]}>
            {isEmpty ? (
                <View style={[styles.emptyState, isBottomSheetExpanded ? styles.emptyExpanded : styles.emptyCollapsed]}>
                    <Text style={styles.emptyTitle}>No workouts yet</Text>
                    <Text style={styles.emptySubtitle}>{emptySubtitleText}</Text>
                </View>
            ) : (
                <FlatList
                    data={sortedWorkouts}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={renderWorkout}
                    contentContainerStyle={styles.scrollable_ctnr}
                    ListFooterComponent={<View style={{ height: isBottomSheetExpanded ? 100 : 400 }} />}
                    initialNumToRender={3}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    onScrollBeginDrag={handleScrollBeginDrag}
                    onScrollEndDrag={handleScrollEndDrag}
                    onMomentumScrollEnd={handleMomentumScrollEnd}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    wrap: {
        flex: 1,
    },
    scrollable_ctnr: {
        marginTop: scaleSize(5),
        flexGrow: 1,
    },
    hidden: {
        display: 'none',
    },
    emptyState: {
        alignItems: 'center',
        paddingHorizontal: scaleSize(24),
    },
    emptyCollapsed: {
        paddingVertical: scaleSize(18),
    },
    emptyExpanded: {
        flex: 1,
        justifyContent: 'center',
        paddingVertical: scaleSize(40),
    },
    emptyTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(15),
        color: '#E9F1FF',
        marginBottom: scaleSize(6),
    },
    emptySubtitle: {
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(12.5),
        color: theme.textSecondary,
        textAlign: 'center',
    },
});

export default memo(HistorySection);
