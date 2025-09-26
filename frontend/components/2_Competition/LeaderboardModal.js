import React, { useMemo, useRef, useEffect, useCallback } from "react";
import { View, StyleSheet, FlatList } from "react-native";
import LeaderboardCard from "../2_Competition/LeaderboardCard";
import scaleSize from "../../helper/scaleSize";
import TribeComparisonBannerCarousel from "./TribeComparisonBannerCarousel";

// Scaled paddings and derived widths
const H_PADDING = scaleSize(16);

// Scaled fonts (slightly larger for readability)
// Scaled layout
const CONTAINER_PT = scaleSize(12);

export default function LeaderboardModal({
    userList,
    categoryCompared,
    comparedMetric,
    openBottomSheet,
    isBottomSheetExpanded,
    isHexFocus = false,
    hexFocusKey = null,
    hexFocusLabel = "",

    // tribe
    isTribeFocused,
    tribeComparisons = [],
    activeCompIndex = 0,
    onActiveCompChange = () => { },
    tribeComparisonSummary,
    onOpenTribeComparison,
    // Custom canvas color for Leaderboard cards
    canvasColor,
    onScrollExpandRequest,
    renderTribeBanners = true,
}) {
    const hasComparisons = isTribeFocused && tribeComparisons.length > 0;
    const safeActiveIndex = useMemo(() => {
        if (!hasComparisons) return 0;
        const maxIndex = Math.max(0, tribeComparisons.length - 1);
        return Math.min(Math.max(0, activeCompIndex), maxIndex);
    }, [activeCompIndex, hasComparisons, tribeComparisons.length]);

    const activeComp = hasComparisons ? tribeComparisons[safeActiveIndex] : null;

    const usingHexFocus = !isTribeFocused && isHexFocus && !!hexFocusKey;

    const exercise = isTribeFocused
        ? (activeComp?.exercise || "Bench Press (Barbell)")
        : (categoryCompared || "Bench Press (Barbell)");

    const metric = isTribeFocused
        ? (activeComp?.metric || "1RM")
        : (usingHexFocus ? "Hex" : (comparedMetric || "1RM"));
    const metricLabel = (m) => (m === '1RM' ? '1RM (Adj)' : m);

    const normalizeByBodyweight = !!(isTribeFocused && activeComp?.normalizeByBodyweight);

    const header = useMemo(() => {
        if (!renderTribeBanners || !isTribeFocused) return null;
        return (
            <TribeComparisonBannerCarousel
                isTribeFocused={isTribeFocused}
                tribeComparisons={tribeComparisons}
                activeCompIndex={activeCompIndex}
                onActiveCompChange={onActiveCompChange}
                onOpenTribeComparison={onOpenTribeComparison}
                horizontalPadding={H_PADDING}
            />
        );
    }, [
        renderTribeBanners,
        isTribeFocused,
        tribeComparisons,
        activeCompIndex,
        onActiveCompChange,
        onOpenTribeComparison,
    ]);

    // Compute display ranks with ties (standard competition ranking: 1,1,3,4 or 1,1,1,4,...)
    const displayRanks = useMemo(() => {
        if (!Array.isArray(userList) || userList.length === 0) return [];

        if (usingHexFocus) {
            const values = userList.map((item) => {
                const raw = Number(item?.__hexValue ?? item?.statsHexagon?.[hexFocusKey] ?? 0);
                return Number.isFinite(raw) ? Math.round(raw * 1000) / 1000 : 0;
            });
            const ranks = new Array(values.length);
            let lastVal = null;
            let lastRank = 0;
            for (let i = 0; i < values.length; i++) {
                const v = values[i];
                if (i === 0) {
                    ranks[i] = 1;
                    lastRank = 1;
                    lastVal = v;
                    continue;
                }
                const isEqual = Object.is(v, lastVal) || Math.abs((v || 0) - (lastVal || 0)) < 1e-9;
                if (isEqual) {
                    ranks[i] = lastRank;
                } else {
                    ranks[i] = i + 1;
                    lastRank = ranks[i];
                    lastVal = v;
                }
            }
            return ranks;
        }

        // Extract the value used for ordering for each user as shown in the list.
        const values = userList.map((item) => {
            if (isTribeFocused) {
                // In tribe-focused view, list may be normalized by bodyweight and may have missing weight data
                const missingBW = !!(normalizeByBodyweight && item?.__noWeightForBW);
                if (missingBW) return Number.NEGATIVE_INFINITY;
                const v = typeof item?._tribeValue === 'number' ? item._tribeValue : 0;
                // Reduce floating noise for equality checks; align with UI precision when normalized
                return normalizeByBodyweight ? Math.round(v * 100) / 100 : v;
            }
            const ex = item?.statsExercises?.[categoryCompared] || {};
            const key = metric === '1RM' ? '1RM' : metric;
            const v = Number(ex?.[key] ?? 0);
            // Non-normalized values are usually integers; keep as-is
            return v;
        });

        const ranks = new Array(values.length);
        let lastVal = null;
        let lastRank = 0;
        for (let i = 0; i < values.length; i++) {
            const v = values[i];
            if (i === 0) {
                ranks[i] = 1;
                lastRank = 1;
                lastVal = v;
                continue;
            }
            const isEqual = Object.is(v, lastVal) || Math.abs((v || 0) - (lastVal || 0)) < 1e-9;
            if (isEqual) {
                ranks[i] = lastRank;
            } else {
                ranks[i] = i + 1; // standard competition ranking assumes list already sorted desc
                lastRank = ranks[i];
                lastVal = v;
            }
        }
        return ranks;
    }, [userList, usingHexFocus, hexFocusKey, isTribeFocused, normalizeByBodyweight, categoryCompared, metric]);

    const renderItem = ({ item, index }) => {
        const isBW = normalizeByBodyweight;
        const missingBW = !!(isBW && item?.__noWeightForBW);
        let rawValue;
        if (isTribeFocused) {
            rawValue = typeof item?._tribeValue === "number" ? item._tribeValue : 0;
        } else if (usingHexFocus) {
            const val = Number(item?.__hexValue ?? item?.statsHexagon?.[hexFocusKey] ?? 0);
            rawValue = Number.isFinite(val) ? val : 0;
        } else {
            rawValue = item?.statsExercises?.[exercise]?.[metric] ?? 0;
        }

        const value = Number.isFinite(rawValue) ? rawValue : 0;

        const bestSet = usingHexFocus ? null : item?.statsExercises?.[exercise]?.bestSet;
        const cardMetric = usingHexFocus ? "Hex" : metric;
        const cardExercise = usingHexFocus ? (hexFocusLabel || hexFocusKey || "Overall") : exercise;

        return (
            <LeaderboardCard
                pfp={item?.image}
                handle={item?.handle || "Athlete"}
                name={item?.displayName || item?.name || item?.handle || " "}
                value={Number(value) || 0}
                rank={displayRanks[index] ?? (index + 1)}
                lastRank={item?.lastRank}
                handlePress={() => openBottomSheet(item)}
                userIsSelf={item?.uid === global?.userData?.uid}
                bestSet={bestSet}
                isTribeFocused={!!isTribeFocused}
                metric={cardMetric}
                exercise={cardExercise}
                normalizeByBodyweight={usingHexFocus ? false : normalizeByBodyweight}
                missingWeightData={usingHexFocus ? false : missingBW}
                showBestSetWhenNotTribe={!usingHexFocus}
                bgColor={canvasColor}
            />
        );
    };

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

    const handleListScroll = useCallback((event) => {
        if (typeof onScrollExpandRequest !== 'function') return;
        if (!isDraggingRef.current && !recentlyDraggedRef.current) return;
        try {
            const offsetY = event?.nativeEvent?.contentOffset?.y ?? 0;
            onScrollExpandRequest(Math.max(0, offsetY));
        } catch {
            // ignore any errors from malformed scroll events
        }
    }, [onScrollExpandRequest]);

    // no explicit getItemLayout — let FlatList measure items, and use a large footer to
    // guarantee the last card can scroll fully into view under the bottom sheet

    return (
        <View
            style={[
                styles.container,
                renderTribeBanners && isTribeFocused && styles.containerWithTribeBanners,
            ]}
        >
            {header}
            <FlatList
                data={userList}
                keyExtractor={(u, i) => u?.uid || String(i)}
                renderItem={renderItem}
                contentContainerStyle={{ paddingBottom: scaleSize(24) }}
                ListFooterComponent={<View style={{ height: isBottomSheetExpanded ? scaleSize(100) : scaleSize(400) }} />}
                onScroll={handleListScroll}
                scrollEventThrottle={16}
                onScrollBeginDrag={handleScrollBeginDrag}
                onScrollEndDrag={handleScrollEndDrag}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                showsVerticalScrollIndicator={false}
            />
            <View style={{ height: isBottomSheetExpanded ? 24 : 8 }} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: H_PADDING, paddingTop: CONTAINER_PT },
    containerWithTribeBanners: {
        paddingTop: 0,
    },
});
