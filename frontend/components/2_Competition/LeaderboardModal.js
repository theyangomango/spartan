import React, { useMemo, useRef, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import LeaderboardCard from "../2_Competition/LeaderboardCard";
import scaleSize from "../../helper/scaleSize";
import { Weight } from "iconsax-react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
// Scaled paddings and derived widths
const H_PADDING = scaleSize(16);
const BANNER_WIDTH = SCREEN_WIDTH - H_PADDING * 2;
const BANNER_GAP = scaleSize(12);
const BANNER_PAGE_WIDTH = SCREEN_WIDTH;
const BANNER_PAGE_MARGIN = H_PADDING;

// Scaled fonts (slightly larger for readability)
const ts = require('../../helper/scaleSize').ts;
const FONT_SELECTOR = ts(13);
const FONT_METRIC = ts(13);
const FONT_BANNER_TITLE = ts(14.5);
const FONT_BANNER_META = ts(11.5);

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

const BANNER_RADIUS = scaleSize(22);
const BANNER_PAD_H = scaleSize(16);
const BANNER_PAD_V = scaleSize(12);
const BANNER_MIN_HEIGHT = scaleSize(78);
const BANNER_MB = scaleSize(2);

const ICON_PILL_SIZE = scaleSize(32);
const ICON_PILL_RADIUS = scaleSize(18);
const ICON_PILL_MR = scaleSize(14);

const DOT_SIZE = scaleSize(6);
const DOT_ACTIVE_SIZE = scaleSize(8);
const DOT_RADIUS = DOT_SIZE / 2;
const DOT_ACTIVE_RADIUS = DOT_ACTIVE_SIZE / 2;
const DOT_GAP = scaleSize(6);
const DOT_MT = scaleSize(4);
const DOT_MB = scaleSize(2);

// Accent palette (tweak here if you want a different vibe)
const ACCENT = "#FFDFA3";            // warm gold accent
const ACCENT_BG = "rgba(255, 214, 153, 0.18)";
const ACCENT_BORDER = "rgba(255, 214, 153, 0.45)";
const BANNER_GRADIENT = ["#59411B", "#3A2511"];
const BANNER_BORDER = "rgba(255, 206, 124, 0.55)";
const BANNER_TEXT_PRIMARY = "#FFF6E0";
const BANNER_TEXT_SECONDARY = "rgba(255, 238, 210, 0.82)";
const BADGE_BG = "rgba(255, 206, 124, 0.18)";
const BADGE_BORDER = "rgba(255, 206, 124, 0.46)";
const BADGE_SECONDARY_BG = "rgba(255, 206, 124, 0.12)";
const BADGE_SECONDARY_BORDER = "rgba(255, 206, 124, 0.3)";
const BADGE_TEXT = "#FFD07C";
const BADGE_TEXT_SECONDARY = "#FFEBC1";
const CHEVRON_BG = "rgba(255, 206, 124, 0.18)";
const CHEVRON_BORDER = "rgba(255, 206, 124, 0.34)";
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
    const activeComp = hasComparisons ? tribeComparisons[Math.min(activeCompIndex, tribeComparisons.length - 1)] : null;

    const exercise = isTribeFocused
        ? (activeComp?.exercise || "Bench Press (Barbell)")
        : (categoryCompared || "Bench Press (Barbell)");

    const metric = isTribeFocused
        ? (activeComp?.metric || "1RM")
        : (comparedMetric || "1RM");
    const metricLabel = (m) => (m === '1RM' ? '1RM' : m);

    const normalizeByBodyweight = !!(isTribeFocused && activeComp?.normalizeByBodyweight);

    const onScrollEnd = (e) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / BANNER_PAGE_WIDTH);
        if (idx !== activeCompIndex) onActiveCompChange(idx);
    };

    const bannerRef = useRef(null);

    // Keep banner scrolled to the active comparison when index changes post-mount
    useEffect(() => {
        if (!isTribeFocused) return;
        if (!(hasComparisons)) return;
        try {
            const ref = bannerRef.current;
            if (ref && typeof ref.scrollToIndex === 'function') {
                ref.scrollToIndex({
                    index: Math.max(0, Math.min(activeCompIndex, tribeComparisons.length - 1)),
                    animated: false,
                });
            }
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCompIndex, isTribeFocused, hasComparisons]);

    const header = useMemo(() => {
        if (isTribeFocused) {
            if (hasComparisons) {
                return (
                    <View style={{ marginBottom: scaleSize(10), marginHorizontal: -H_PADDING }}>
                        <FlatList
                            ref={bannerRef}
                            horizontal
                            data={tribeComparisons}
                            keyExtractor={(_, i) => `tribe-comp-${i}`}
                            showsHorizontalScrollIndicator={false}
                            pagingEnabled
                            snapToAlignment="start"
                            snapToInterval={BANNER_PAGE_WIDTH}
                            decelerationRate="fast"
                            onMomentumScrollEnd={onScrollEnd}
                            initialScrollIndex={activeCompIndex}
                            getItemLayout={(_, index) => ({ length: BANNER_PAGE_WIDTH, offset: BANNER_PAGE_WIDTH * index, index })}
                            renderItem={({ item, index }) => {
                                const isFirst = index === 0;
                                const isLast = index === tribeComparisons.length - 1;
                                const marginLeft = isFirst ? BANNER_PAGE_MARGIN : BANNER_GAP / 2;
                                const marginRight = isLast ? BANNER_PAGE_MARGIN : BANNER_GAP / 2;

                                return (
                                    <View style={{ width: BANNER_PAGE_WIDTH }}>
                                        <TouchableOpacity
                                            activeOpacity={0.92}
                                            style={[styles.bannerTouchable, { marginLeft, marginRight }]}
                                            onPress={onOpenTribeComparison}
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
                            contentContainerStyle={{ paddingHorizontal: 0 }}
                        />
                        {tribeComparisons.length > 1 && (
                            <View style={styles.dotsRow}>
                                {tribeComparisons.map((_, i) => (
                                    <View
                                        key={`dot-${i}`}
                                        style={[styles.dot, i === activeCompIndex && styles.dotActive]}
                                    />
                                ))}
                            </View>
                        )}
                    </View>
                );
            }
            // No comparisons yet → simple CTA (no extra explainer line)
            return (
                <TouchableOpacity
                    activeOpacity={0.92}
                    onPress={onOpenTribeComparison}
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
            );
        }

        // Non-tribe: selector + metric toggle (unchanged)
        return (
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={openModal} activeOpacity={0.85} style={styles.selectorPill}>
                    {/* <Ionicons name="barbell" size={16} color="#222" /> */}
                    <Weight size={ICON_WEIGHT} color={TITLE_COLOR} variant='Broken' />
                    <Text style={styles.selectorText} numberOfLines={1}>{categoryCompared}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onToggleMetric} activeOpacity={0.85} style={styles.metricPill}>
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

    // tribe banner — premium treatment inspired by workout cards
    bannerTouchable: {
        borderRadius: BANNER_RADIUS,
        marginBottom: BANNER_MB,
        width: BANNER_WIDTH,
    },
    bannerShadow: {
        borderRadius: BANNER_RADIUS,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: scaleSize(10) },
        shadowOpacity: 0.18,
        shadowRadius: scaleSize(18),
        elevation: 6,
        minHeight: BANNER_MIN_HEIGHT,
    },
    bannerCard: {
        borderRadius: BANNER_RADIUS,
        paddingHorizontal: BANNER_PAD_H,
        paddingVertical: BANNER_PAD_V,
        borderWidth: scaleSize(1),
        borderColor: BANNER_BORDER,
        overflow: "hidden",
        minHeight: BANNER_MIN_HEIGHT,
    },
    bannerContent: {
        flexDirection: "row",
        alignItems: "center",
        minHeight: BANNER_MIN_HEIGHT - BANNER_PAD_V * 2,
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
    metricBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(10),
        paddingVertical: scaleSize(3),
        borderRadius: scaleSize(999),
        backgroundColor: BADGE_BG,
        borderWidth: scaleSize(1),
        borderColor: BADGE_BORDER,
        marginRight: scaleSize(6),
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
        marginTop: scaleSize(6),
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
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: DOT_RADIUS,
        backgroundColor: "rgba(255,255,255,0.28)",
    },
    dotActive: { backgroundColor: "#6FB8FF", width: DOT_ACTIVE_SIZE, height: DOT_ACTIVE_SIZE, borderRadius: DOT_ACTIVE_RADIUS },
});
