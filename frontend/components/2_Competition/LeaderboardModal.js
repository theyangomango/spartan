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
const CARD_HEIGHT = scaleSize(64);
const SELF_CARD_HEIGHT = scaleSize(86);
const CARD_SPACING = scaleSize(12.5);
const DEFAULT_ROW_HEIGHT = CARD_HEIGHT + CARD_SPACING;
const SELF_ROW_HEIGHT = SELF_CARD_HEIGHT + CARD_SPACING;

export default function LeaderboardModal({
    userList,
    categoryCompared,
    comparedMetric,
    onUserPress,
    isPanelExpanded,
    scopeKey = null,
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
    const listRef = useRef(null);

    const exercise = isTribeFocused
        ? (activeComp?.exercise || "Overall")
        : (categoryCompared || "Overall");

    const metric = isTribeFocused
        ? (activeComp?.metric || "1RM")
        : (usingHexFocus ? "Hex" : (comparedMetric || "1RM"));

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

    const currentUserId = global?.userData?.uid;

    const normalizedCurrentUid = useMemo(() => {
        if (currentUserId === null || typeof currentUserId === 'undefined') return null;
        try {
            const str = String(currentUserId);
            return str.length > 0 ? str : null;
        } catch {
            return null;
        }
    }, [currentUserId]);

    const isSelfItem = useCallback((item) => {
        if (!item) return false;
        if (item?.isSelf || item?.userIsSelf || item?.self) return true;
        const uidCandidates = [item?.uid, item?.user?.uid, item?.id, item?.userId];
        for (let i = 0; i < uidCandidates.length; i++) {
            const candidate = uidCandidates[i];
            if (candidate === null || typeof candidate === 'undefined') continue;
            try {
                const str = String(candidate);
                if (normalizedCurrentUid && str === normalizedCurrentUid) return true;
            } catch {
                continue;
            }
        }
        return false;
    }, [normalizedCurrentUid]);

    const selfIndex = useMemo(() => {
        if (!Array.isArray(userList) || userList.length === 0) return -1;
        for (let i = 0; i < userList.length; i++) {
            if (isSelfItem(userList[i])) return i;
        }
        return -1;
    }, [userList, isSelfItem]);

    const rowHeights = useMemo(() => {
        if (!Array.isArray(userList) || userList.length === 0) return [];
        return userList.map((_, idx) => (idx === selfIndex ? SELF_ROW_HEIGHT : DEFAULT_ROW_HEIGHT));
    }, [userList, selfIndex]);

    const rowOffsets = useMemo(() => {
        if (!Array.isArray(rowHeights) || rowHeights.length === 0) return [];
        const offsets = new Array(rowHeights.length);
        let running = 0;
        for (let i = 0; i < rowHeights.length; i++) {
            offsets[i] = running;
            running += rowHeights[i];
        }
        return offsets;
    }, [rowHeights]);

    const getItemLayout = useCallback((_, index) => {
        const length = rowHeights[index] ?? DEFAULT_ROW_HEIGHT;
        const offset = rowOffsets[index] ?? index * DEFAULT_ROW_HEIGHT;
        return { length, offset, index };
    }, [rowHeights, rowOffsets]);

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

        const userIsSelf = index === selfIndex || isSelfItem(item);

        return (
            <LeaderboardCard
                pfp={item?.image}
                handle={item?.handle || "Athlete"}
                name={item?.displayName || item?.name || item?.handle || " "}
                value={Number(value) || 0}
                rank={displayRanks[index] ?? (index + 1)}
                lastRank={item?.lastRank}
                handlePress={() => {
                    if (typeof onUserPress === 'function') {
                        onUserPress(item);
                    }
                }}
                userIsSelf={userIsSelf}
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
    const autoScrollTimeoutRef = useRef(null);
    const autoScrollSignatureRef = useRef(null);

    const clearAutoScrollTimeout = useCallback(() => {
        const timeoutId = autoScrollTimeoutRef.current;
        if (!timeoutId) return;
        clearTimeout(timeoutId);
        autoScrollTimeoutRef.current = null;
    }, []);

    useEffect(() => () => {
        clearAutoScrollTimeout();
    }, [clearAutoScrollTimeout]);

    const handleScrollBeginDrag = useCallback(() => {
        isDraggingRef.current = true;
        clearAutoScrollTimeout();
    }, [clearAutoScrollTimeout]);

    const handleScrollEndDrag = useCallback(() => {
        isDraggingRef.current = false;
    }, []);

    const handleMomentumScrollEnd = useCallback(() => {
        isDraggingRef.current = false;
        clearAutoScrollTimeout();
    }, [clearAutoScrollTimeout]);

    const scopeSignature = useMemo(() => {
        if (scopeKey === null || typeof scopeKey === 'undefined') return 'scope:default';
        try {
            const str = String(scopeKey);
            return str.length > 0 ? `scope:${str}` : 'scope:default';
        } catch {
            return 'scope:default';
        }
    }, [scopeKey]);

    const comparisonSignature = useMemo(() => {
        if (isTribeFocused) {
            const compExercise = activeComp?.exercise || "Overall";
            const compMetric = activeComp?.metric || "1RM";
            const normalizationKey = normalizeByBodyweight ? "norm" : "raw";
            return `tribe:${scopeSignature}:${safeActiveIndex}:${compExercise}:${compMetric}:${normalizationKey}`;
        }
        if (usingHexFocus) {
            return `hex:${scopeSignature}:${hexFocusKey || ""}:${hexFocusLabel || ""}`;
        }
        return `solo:${scopeSignature}:${categoryCompared || "Overall"}:${metric}`;
    }, [
        activeComp,
        categoryCompared,
        hexFocusKey,
        hexFocusLabel,
        isTribeFocused,
        metric,
        normalizeByBodyweight,
        safeActiveIndex,
        usingHexFocus,
        scopeSignature,
    ]);

    useEffect(() => {
        if (!Array.isArray(userList) || userList.length === 0) return;
        if (selfIndex < 0) return;
        const fallbackOffset = rowOffsets[selfIndex] ?? selfIndex * DEFAULT_ROW_HEIGHT;
        const signature = `${comparisonSignature}|${selfIndex}|${fallbackOffset}`;
        if (autoScrollSignatureRef.current === signature) return;
        if (isDraggingRef.current) return;

        autoScrollSignatureRef.current = signature;

        clearAutoScrollTimeout();
        autoScrollTimeoutRef.current = setTimeout(() => {
            const list = listRef.current;
            if (!list) return;
            try {
                list.scrollToIndex({ index: selfIndex, viewPosition: 0.45, animated: true });
            } catch (err) {
                try {
                    list.scrollToOffset({ offset: Math.max(0, fallbackOffset), animated: true });
                } catch {
                    // ignore secondary scroll errors
                }
            }
            autoScrollTimeoutRef.current = null;
        }, 120);

        return () => {
            clearAutoScrollTimeout();
        };
    }, [comparisonSignature, userList, clearAutoScrollTimeout, rowOffsets, selfIndex]);

    // getItemLayout ensures scrollToIndex always succeeds; footer padding keeps the
    // last card accessible when the panel grows taller.

    return (
        <View
            style={[
                styles.container,
                renderTribeBanners && isTribeFocused && styles.containerWithTribeBanners,
            ]}
        >
            {header}
            <FlatList
                ref={listRef}
                data={userList}
                keyExtractor={(u, i) => u?.uid || String(i)}
                renderItem={renderItem}
                getItemLayout={getItemLayout}
                contentContainerStyle={{ paddingBottom: scaleSize(6) }}
                scrollEnabled={false}
                bounces={false}
                onScrollBeginDrag={handleScrollBeginDrag}
                onScrollEndDrag={handleScrollEndDrag}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                showsVerticalScrollIndicator={false}
            />
            {!!isPanelExpanded && <View style={{ height: scaleSize(12) }} />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: H_PADDING, paddingTop: CONTAINER_PT },
    containerWithTribeBanners: {
        paddingTop: 0,
    },
});
