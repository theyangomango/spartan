import React, { useMemo, useRef, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, Animated, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import LeaderboardCard from "../2_Competition/LeaderboardCard";
import scaleSize from "../../helper/scaleSize";
import { withStrongPress } from "../../utils/haptics";
import { Weight } from "iconsax-react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
// Scaled paddings and derived widths
const H_PADDING = scaleSize(16);
const BANNER_OUTER_PADDING = scaleSize(16);
const BANNER_PAGE_WIDTH = SCREEN_WIDTH;
const BANNER_WIDTH = SCREEN_WIDTH - BANNER_OUTER_PADDING * 2;

// Scaled fonts (slightly larger for readability)
const ts = require('../../helper/scaleSize').ts;
const FONT_SELECTOR = ts(13);
const FONT_METRIC = ts(13);
const FONT_BANNER_TITLE = ts(13);
const FONT_BANNER_META = ts(11);

// Scaled icons
const ICON_TROPHY = scaleSize(19);
const ICON_TROPHY_LG = scaleSize(20);
const ICON_CHEVRON = scaleSize(18);
const ICON_WEIGHT = scaleSize(21);

// Scaled layout
const CONTAINER_PT = scaleSize(12);
const HEADER_GAP = scaleSize(10);
const HEADER_MB = scaleSize(12);
const SELECTOR_PAD_L = scaleSize(16);
const SELECTOR_PAD_R = scaleSize(12);
const SELECTOR_PAD_V = scaleSize(8);
const SELECTOR_GAP = scaleSize(8);
const METRIC_PAD_H = scaleSize(14);
const METRIC_PAD_V = scaleSize(8);

const BANNER_RADIUS = scaleSize(28);
const BANNER_PAD_H = scaleSize(18);
const BANNER_PAD_V = scaleSize(5);
const BANNER_MIN_HEIGHT = scaleSize(78);
const BANNER_MB = scaleSize(2);
const BANNER_PAGER_PT = scaleSize(6);
const BANNER_PAGER_PB = scaleSize(4);

const ICON_PILL_SIZE = scaleSize(32);
const ICON_PILL_RADIUS = scaleSize(18);
const ICON_PILL_MR = scaleSize(14);

const DOT_HEIGHT = scaleSize(4);
const DOT_MIN_WIDTH = scaleSize(8);
const DOT_MAX_WIDTH = scaleSize(32);
const DOT_RADIUS = scaleSize(999);
const DOT_GAP = scaleSize(6);
const DOT_MT = scaleSize(6);
const DOT_MB = scaleSize(2);

// Accent palette (warm gold on a deep coffee base, echoing TribeStatsCard)
const ACCENT = "#F8C981";
const ACCENT_BG = "rgba(248, 201, 129, 0.28)";
const ACCENT_BORDER = "rgba(248, 201, 129, 0.55)";
const BANNER_GRADIENT = ["#6B3A1F", "#251F30"];
const BANNER_BORDER = "rgba(248, 201, 129, 0.44)";
const BANNER_TEXT_PRIMARY = "#FFF3DB";
const BANNER_TEXT_SECONDARY = "rgba(254, 233, 203, 0.82)";
const BADGE_BG = "rgba(255, 239, 208, 0.88)";
const BADGE_BORDER = "rgba(255, 224, 178, 0.92)";
const BADGE_SECONDARY_BG = "rgba(135, 122, 188, 0.32)";
const BADGE_SECONDARY_BORDER = "rgba(186, 174, 233, 0.55)";
const BADGE_TEXT = "#4A341C";
const BADGE_TEXT_SECONDARY = "#EADFFF";
const BANNER_TAG_COLOR = "rgba(255, 229, 193, 0.78)";
const CHEVRON_BG = "rgba(248, 201, 129, 0.18)";
const CHEVRON_BORDER = "rgba(248, 201, 129, 0.32)";
// Dark mode palette for Competition
const THEME = require("../../theme/mfpDark").default;
const TITLE_COLOR = THEME.textPrimary;   // light text on dark

export default function LeaderboardModal({
    userList,
    categoryCompared,
    comparedMetric,
    onToggleMetric,
    openModal,
    openBottomSheet,
    isBottomSheetExpanded,

    // tribe
    isTribeFocused,
    tribeComparisons = [],
    activeCompIndex = 0,
    onActiveCompChange = () => { },
    tribeComparisonSummary,
    onOpenTribeComparison,
    // Custom canvas color for Leaderboard cards
    canvasColor,
}) {
    const hasComparisons = isTribeFocused && tribeComparisons.length > 0;
    const safeActiveIndex = useMemo(() => {
        if (!hasComparisons) return 0;
        const maxIndex = Math.max(0, tribeComparisons.length - 1);
        return Math.min(Math.max(0, activeCompIndex), maxIndex);
    }, [activeCompIndex, hasComparisons, tribeComparisons.length]);

    const activeComp = hasComparisons ? tribeComparisons[safeActiveIndex] : null;

    const exercise = isTribeFocused
        ? (activeComp?.exercise || "Bench Press (Barbell)")
        : (categoryCompared || "Bench Press (Barbell)");

    const metric = isTribeFocused
        ? (activeComp?.metric || "1RM")
        : (comparedMetric || "1RM");
    const metricLabel = (m) => (m === '1RM' ? '1RM' : m);

    const normalizeByBodyweight = !!(isTribeFocused && activeComp?.normalizeByBodyweight);

    const scrollX = useRef(new Animated.Value(safeActiveIndex * BANNER_PAGE_WIDTH)).current;
    const lastReportedBannerIndex = useRef(safeActiveIndex);

    useEffect(() => {
        lastReportedBannerIndex.current = safeActiveIndex;
    }, [safeActiveIndex]);

    const notifyBannerChange = useCallback((idx) => {
        if (!hasComparisons) return;
        if (idx === lastReportedBannerIndex.current) return;
        lastReportedBannerIndex.current = idx;
        onActiveCompChange(idx);
    }, [hasComparisons, onActiveCompChange]);

    const handleScroll = useMemo(() => (
        Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            {
                useNativeDriver: false,
                listener: (event) => {
                    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / BANNER_PAGE_WIDTH);
                    notifyBannerChange(nextIndex);
                },
            }
        )
    ), [scrollX, notifyBannerChange]);

    const onScrollEndDrag = useCallback((e) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / BANNER_PAGE_WIDTH);
        notifyBannerChange(idx);
    }, [notifyBannerChange]);

    const onScrollEnd = useCallback((e) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / BANNER_PAGE_WIDTH);
        notifyBannerChange(idx);
    }, [notifyBannerChange]);

    const bannerRef = useRef(null);

    useEffect(() => {
        if (!hasComparisons) return;
        scrollX.setValue(safeActiveIndex * BANNER_PAGE_WIDTH);
    }, [safeActiveIndex, hasComparisons, scrollX]);

    // Keep banner scrolled to the active comparison when index changes post-mount
    useEffect(() => {
        if (!isTribeFocused) return;
        if (!(hasComparisons)) return;
        try {
            const ref = bannerRef.current;
            if (ref && typeof ref.scrollToIndex === 'function') {
                ref.scrollToIndex({
                    index: safeActiveIndex,
                    animated: false,
                });
            }
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [safeActiveIndex, isTribeFocused, hasComparisons]);

    const header = useMemo(() => {
        if (isTribeFocused) {
            if (hasComparisons) {
                return (
                    <View style={styles.bannerPager}>
                        <Animated.FlatList
                            ref={bannerRef}
                            horizontal
                            data={tribeComparisons}
                            keyExtractor={(_, i) => `tribe-comp-${i}`}
                            showsHorizontalScrollIndicator={false}
                            snapToAlignment="start"
                            snapToInterval={BANNER_PAGE_WIDTH}
                            disableIntervalMomentum
                            decelerationRate={Platform.OS === "ios" ? "fast" : 0.92}
                            bounces={false}
                            overScrollMode="never"
                            onScrollEndDrag={onScrollEndDrag}
                            onMomentumScrollEnd={onScrollEnd}
                            initialScrollIndex={safeActiveIndex}
                            onScroll={handleScroll}
                            scrollEventThrottle={16}
                            getItemLayout={(_, index) => ({ length: BANNER_PAGE_WIDTH, offset: BANNER_PAGE_WIDTH * index, index })}
                            renderItem={({ item, index }) => {
                                const metricCopy = metricLabel(item.metric);
                                const summary = `Ranked by ${metricCopy}${item.normalizeByBodyweight ? " • per lb" : ""}`;
                                return (
                                    <View style={{ width: BANNER_PAGE_WIDTH }}>
                                        <TouchableOpacity
                                            activeOpacity={0.92}
                                            style={styles.bannerTouchable}
                                            onPress={withStrongPress(onOpenTribeComparison)}
                                        >
                                            <View style={styles.bannerShadow}>
                                                <LinearGradient
                                                    colors={BANNER_GRADIENT}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                    style={styles.bannerCard}
                                                >
                                                    <View style={styles.bannerContent}>
                                                        <View style={styles.iconPill}>
                                                            <Ionicons name="trophy" size={ICON_TROPHY} color={ACCENT} />
                                                        </View>
                                                        <View style={styles.bannerTextColumn}>
                                                            <Text style={styles.bannerTag}>Active Comparison</Text>
                                                            <Text style={styles.bannerTitle} numberOfLines={1}>
                                                                {item.exercise}
                                                            </Text>
                                                            <View style={styles.bannerMetaRow}>
                                                                <View style={styles.metricBadge}>
                                                                    <Text style={styles.metricBadgeText}>{metricLabel(item.metric)}</Text>
                                                                </View>
                                                                {item.normalizeByBodyweight && (
                                                                    <View style={[styles.metricBadge, styles.metricBadgeSecondary]}>
                                                                        <Text style={[styles.metricBadgeText, styles.metricBadgeTextSecondary]}>per lb</Text>
                                                                    </View>
                                                                )}
                                                            </View>
                                                            {/* <Text style={styles.bannerSummary} numberOfLines={1}>
                                                                {summary}
                                                            </Text> */}
                                                        </View>
                                                        <View style={styles.chevronPill}>
                                                            <Ionicons name="chevron-forward" size={ICON_CHEVRON} color={BANNER_TEXT_SECONDARY} />
                                                        </View>
                                                    </View>
                                                </LinearGradient>
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                );
                            }}
                            contentContainerStyle={{}}
                        />
                        {tribeComparisons.length > 1 && (
                            <View style={styles.dotsRow}>
                                {tribeComparisons.map((_, i) => {
                                    const inputRange = [
                                        (i - 1) * BANNER_PAGE_WIDTH,
                                        i * BANNER_PAGE_WIDTH,
                                        (i + 1) * BANNER_PAGE_WIDTH,
                                    ];

                                    const width = scrollX.interpolate({
                                        inputRange,
                                        outputRange: [DOT_MIN_WIDTH, DOT_MAX_WIDTH, DOT_MIN_WIDTH],
                                        extrapolate: "clamp",
                                    });

                                    const opacity = scrollX.interpolate({
                                        inputRange,
                                        outputRange: [0.25, 1, 0.25],
                                        extrapolate: "clamp",
                                    });

                                    const backgroundColor = scrollX.interpolate({
                                        inputRange,
                                        outputRange: [
                                            "rgba(255, 236, 204, 0.32)",
                                            ACCENT,
                                            "rgba(255, 236, 204, 0.32)",
                                        ],
                                        extrapolate: "clamp",
                                    });

                                    return (
                                        <Animated.View
                                            key={`dot-${i}`}
                                            style={[styles.dot, { width, opacity, backgroundColor }]}
                                        />
                                    );
                                })}
                            </View>
                        )}
                    </View>
                );
            }
            // No comparisons yet → simple CTA (no extra explainer line)
            return (
                <View style={styles.bannerPager}>
                    <TouchableOpacity
                        activeOpacity={0.92}
                        onPress={withStrongPress(onOpenTribeComparison)}
                        style={styles.bannerTouchable}
                    >
                        <View style={styles.bannerShadow}>
                            <LinearGradient
                                colors={BANNER_GRADIENT}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.bannerCard}
                            >
                                <View style={styles.bannerContent}>
                                    <View style={styles.iconPill}>
                                        <Ionicons name="trophy" size={ICON_TROPHY_LG} color={ACCENT} />
                                    </View>
                                    <View style={styles.bannerTextColumn}>
                                        <Text style={styles.bannerTag}>Set Comparison</Text>
                                        <Text style={styles.bannerTitle} numberOfLines={1}>
                                            Set Tribe Comparisons
                                        </Text>
                                        <Text style={styles.bannerDescription} numberOfLines={1} ellipsizeMode="tail">
                                            Add lifts or metrics your tribe cares about.
                                        </Text>
                                    </View>
                                    <View style={styles.chevronPill}>
                                        <Ionicons name="chevron-forward" size={ICON_CHEVRON} color={BANNER_TEXT_SECONDARY} />
                                    </View>
                                </View>
                            </LinearGradient>
                        </View>
                    </TouchableOpacity>
                </View>
            );
        }

        // Non-tribe: selector + metric toggle (unchanged)
        return (
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={withStrongPress(openModal)} activeOpacity={0.85} style={styles.selectorPill}>
                    {/* <Ionicons name="barbell" size={16} color="#222" /> */}
                    <Weight size={ICON_WEIGHT} color={TITLE_COLOR} variant='Broken' />
                    <Text style={styles.selectorText} numberOfLines={1}>{categoryCompared}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={withStrongPress(onToggleMetric)} activeOpacity={0.85} style={styles.metricPill}>
                    <Text style={styles.metricText}>{metricLabel(comparedMetric)}</Text>
                </TouchableOpacity>
            </View>
        );
    }, [
        isTribeFocused,
        hasComparisons,
        tribeComparisons,
        activeCompIndex,
        onOpenTribeComparison,
        openModal,
        categoryCompared,
        comparedMetric,
        onToggleMetric,
        handleScroll,
        scrollX,
    ]);

    // Compute display ranks with ties (standard competition ranking: 1,1,3,4 or 1,1,1,4,...)
    const displayRanks = useMemo(() => {
        if (!Array.isArray(userList) || userList.length === 0) return [];

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
    }, [userList, isTribeFocused, normalizeByBodyweight, categoryCompared, metric]);

    const renderItem = ({ item, index }) => {
        const isBW = normalizeByBodyweight;
        const missingBW = !!(isBW && item?.__noWeightForBW);
        const value = isTribeFocused && typeof item?._tribeValue === "number"
            ? item._tribeValue
            : (item?.statsExercises?.[exercise]?.[metric] ?? 0);

        const bestSet = item?.statsExercises?.[exercise]?.bestSet;

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
                metric={metric}
                exercise={exercise}
                normalizeByBodyweight={normalizeByBodyweight}
                missingWeightData={missingBW}
                showBestSetWhenNotTribe
                bgColor={canvasColor}
            />
        );
    };

    // no explicit getItemLayout — let FlatList measure items, and use a large footer to
    // guarantee the last card can scroll fully into view under the bottom sheet

    return (
        <View style={styles.container}>
            {header}
            <FlatList
                data={userList}
                keyExtractor={(u, i) => u?.uid || String(i)}
                renderItem={renderItem}
                contentContainerStyle={{ paddingBottom: scaleSize(24) }}
                ListFooterComponent={<View style={{ height: isBottomSheetExpanded ? scaleSize(100) : scaleSize(400) }} />}
                showsVerticalScrollIndicator={false}
            />
            <View style={{ height: isBottomSheetExpanded ? 24 : 8 }} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: H_PADDING, paddingTop: CONTAINER_PT },

    // non-tribe header
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: HEADER_MB,
        gap: HEADER_GAP,
    },
    selectorPill: {
        flexDirection: "row",
        alignItems: "center",
        paddingRight: SELECTOR_PAD_R,
        paddingLeft: SELECTOR_PAD_L,
        paddingVertical: SELECTOR_PAD_V,
        // Higher-contrast pill vs. sheet background
        backgroundColor: '#34425C',
        borderWidth: scaleSize(1),
        borderColor: '#567099',
        borderRadius: scaleSize(999),
        flex: 1,
        gap: SELECTOR_GAP,
    },
    selectorText: { fontFamily: "Outfit_600SemiBold", fontSize: scaleSize(FONT_SELECTOR), color: TITLE_COLOR, flexShrink: 1, letterSpacing: 0.2 },
    metricPill: {
        paddingHorizontal: METRIC_PAD_H,
        paddingVertical: METRIC_PAD_V,
        backgroundColor: '#34425C',
        borderWidth: scaleSize(1),
        borderColor: '#567099',
        borderRadius: scaleSize(999),
    },
    metricText: { fontFamily: "Outfit_700Bold", fontSize: scaleSize(FONT_METRIC), color: '#6FB8FF', letterSpacing: 0.2 },

    bannerPager: {
        marginBottom: scaleSize(10),
        marginHorizontal: -H_PADDING,
        paddingTop: BANNER_PAGER_PT,
        paddingBottom: BANNER_PAGER_PB,
        width: SCREEN_WIDTH,
        alignSelf: "center",
    },
    bannerTouchable: {
        borderRadius: BANNER_RADIUS,
        marginBottom: BANNER_MB,
        marginHorizontal: BANNER_OUTER_PADDING,
        width: BANNER_WIDTH,
    },
    bannerShadow: {
        borderRadius: BANNER_RADIUS,
        width: "100%",
        shadowColor: "rgba(24, 15, 8, 0.5)",
        shadowOffset: { width: 0, height: scaleSize(12) },
        shadowOpacity: 0.22,
        shadowRadius: scaleSize(20),
        elevation: 6,
        minHeight: BANNER_MIN_HEIGHT,
    },
    bannerCard: {
        borderRadius: BANNER_RADIUS,
        paddingHorizontal: BANNER_PAD_H,
        paddingVertical: BANNER_PAD_V,
        width: "100%",
        borderWidth: scaleSize(1),
        borderColor: BANNER_BORDER,
        overflow: "hidden",
        minHeight: BANNER_MIN_HEIGHT,
    },
    bannerContent: {
        flexDirection: "row",
        alignItems: "center",
        minHeight: BANNER_MIN_HEIGHT - BANNER_PAD_V * 2,
        paddingVertical: scaleSize(4),
    },
    iconPill: {
        width: ICON_PILL_SIZE,
        height: ICON_PILL_SIZE,
        borderRadius: ICON_PILL_RADIUS,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: ACCENT_BG,
        borderWidth: scaleSize(1),
        borderColor: ACCENT_BORDER,
        marginRight: ICON_PILL_MR,
    },
    bannerTextColumn: {
        flex: 1,
        marginRight: scaleSize(12),
        minWidth: 0,
        justifyContent: "center",
        paddingLeft: scaleSize(2),
        paddingTop: scaleSize(2),
    },
    bannerTag: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(10),
        color: BANNER_TAG_COLOR,
        letterSpacing: 1,
        textTransform: "uppercase",
        marginBottom: scaleSize(2),
    },
    bannerTitle: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: scaleSize(FONT_BANNER_TITLE),
        color: BANNER_TEXT_PRIMARY,
        letterSpacing: 0.3,
    },
    bannerMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "nowrap",
        marginTop: scaleSize(4),
    },
    bannerSummary: {
        marginTop: scaleSize(6),
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(11),
        color: BANNER_TEXT_SECONDARY,
        letterSpacing: 0.15,
    },
    metricBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(10),
        paddingVertical: scaleSize(3),
        marginTop: scaleSize(1),
        borderRadius: scaleSize(999),
        backgroundColor: BADGE_BG,
        borderWidth: scaleSize(1),
        borderColor: BADGE_BORDER,
        marginRight: scaleSize(4),
        marginBottom: scaleSize(4),
    },
    metricBadgeSecondary: {
        backgroundColor: BADGE_SECONDARY_BG,
        borderColor: BADGE_SECONDARY_BORDER,
    },
    metricBadgeText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(10.5),
        color: BADGE_TEXT,
        letterSpacing: 0.38,
        textTransform: "uppercase",
    },
    metricBadgeTextSecondary: {
        color: BADGE_TEXT_SECONDARY,
    },
    bannerMeta: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(FONT_BANNER_META),
        color: BANNER_TEXT_SECONDARY,
        letterSpacing: 0.25,
        marginLeft: scaleSize(4),
        flexShrink: 1,
    },
    bannerDescription: {
        marginTop: scaleSize(4),
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(10.5),
        color: BANNER_TEXT_SECONDARY,
        letterSpacing: 0.2,
    },
    chevronPill: {
        width: scaleSize(30),
        height: scaleSize(30),
        borderRadius: scaleSize(16),
        alignItems: "center",
        justifyContent: "center",
        borderWidth: scaleSize(1),
        borderColor: CHEVRON_BORDER,
        backgroundColor: CHEVRON_BG,
        marginLeft: scaleSize(8),
        alignSelf: "center",
    },

    // pager dots
    dotsRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: DOT_GAP,
        marginTop: DOT_MT,
        marginBottom: DOT_MB,
    },
    dot: {
        height: DOT_HEIGHT,
        borderRadius: DOT_RADIUS,
        backgroundColor: "rgba(255, 236, 204, 0.32)",
    },
});
