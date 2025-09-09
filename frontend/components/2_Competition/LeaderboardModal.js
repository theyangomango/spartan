import React, { useMemo } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import LeaderboardCard from "../2_Competition/LeaderboardCard";
import scaleSize from "../../helper/scaleSize";
import { Weight } from "iconsax-react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
// Scaled paddings and derived widths
const H_PADDING = scaleSize(16);
const BANNER_WIDTH = SCREEN_WIDTH - H_PADDING * 2;

// Scaled fonts (slightly larger for readability)
const FONT_SELECTOR = scaleSize(14);
const FONT_METRIC = scaleSize(14);
const FONT_BANNER_TITLE = scaleSize(15);
const FONT_BANNER_META = scaleSize(14);
const FONT_TRIBE_TITLE = scaleSize(16);

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
const BANNER_PAD_V = scaleSize(14);
const BANNER_MB = scaleSize(2);

const ICON_PILL_SIZE = scaleSize(35);
const ICON_PILL_RADIUS = scaleSize(20);
const ICON_PILL_MR = scaleSize(10);

const TRIBE_BTN_RADIUS = scaleSize(18);
const TRIBE_BTN_PAD_H = scaleSize(16);
const TRIBE_BTN_PAD_V = scaleSize(12);
const TRIBE_BTN_GAP = scaleSize(10);
const TRIBE_BTN_MB = scaleSize(10);

const DOT_SIZE = scaleSize(6);
const DOT_ACTIVE_SIZE = scaleSize(8);
const DOT_RADIUS = DOT_SIZE / 2;
const DOT_ACTIVE_RADIUS = DOT_ACTIVE_SIZE / 2;
const DOT_GAP = scaleSize(6);
const DOT_MT = scaleSize(4);
const DOT_MB = scaleSize(2);

// Accent palette (tweak here if you want a different vibe)
const ACCENT = "#f6b000ff";            // rich gold
const ACCENT_BG = "#f6b00041";
// Dark mode palette for Competition
const THEME = require("../../theme/mfpDark").default;
const BANNER_BG = THEME.surface;         // neutral modal pill/bg
const TITLE_COLOR = THEME.textPrimary;   // light text on dark
const ICON_MUTED = THEME.textSecondary;

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
}) {
    const hasComparisons = isTribeFocused && tribeComparisons.length > 0;
    const activeComp = hasComparisons ? tribeComparisons[Math.min(activeCompIndex, tribeComparisons.length - 1)] : null;

    const exercise = isTribeFocused
        ? (activeComp?.exercise || "Bench Press (Barbell)")
        : (categoryCompared || "Bench Press (Barbell)");

    const metric = isTribeFocused
        ? (activeComp?.metric || "1RM")
        : (comparedMetric || "1RM");
    const metricLabel = (m) => (m === '1RM' ? '1RM (Adj)' : m);

    const normalizeByBodyweight = !!(isTribeFocused && activeComp?.normalizeByBodyweight);

    const onScrollEnd = (e) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / BANNER_WIDTH);
        if (idx !== activeCompIndex) onActiveCompChange(idx);
    };

    const header = useMemo(() => {
        if (isTribeFocused) {
            if (hasComparisons) {
                return (
                    <View style={{ marginBottom: 10 }}>
                        <FlatList
                            horizontal
                            data={tribeComparisons}
                            keyExtractor={(_, i) => `tribe-comp-${i}`}
                            showsHorizontalScrollIndicator={false}
                            pagingEnabled
                            snapToAlignment="start"
                            decelerationRate="fast"
                            onMomentumScrollEnd={onScrollEnd}
                            initialScrollIndex={activeCompIndex}
                            getItemLayout={(_, index) => ({ length: BANNER_WIDTH, offset: BANNER_WIDTH * index, index })}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    activeOpacity={0.95}
                                    style={[styles.bannerCard, { width: BANNER_WIDTH }]}
                                    onPress={onOpenTribeComparison}
                                >
                                    <View style={styles.iconPill}>
                                        <Ionicons name="trophy" size={ICON_TROPHY} color={ACCENT} />
                                    </View>
                                    <View style={{ flex: 1, marginRight: 8 }}>
                                        {/* Line 1: exercise */}
                                        <Text style={styles.bannerTitle} numberOfLines={1}>
                                            {item.exercise}
                                        </Text>
                                        {/* Line 2: metric + per-lb */}
                                        <Text style={styles.bannerMeta} numberOfLines={1}>
                                            {metricLabel(item.metric)}{item.normalizeByBodyweight ? " • per lb" : ""}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={ICON_CHEVRON} color={ICON_MUTED} />
                                </TouchableOpacity>
                            )}
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
                    activeOpacity={0.9}
                    onPress={onOpenTribeComparison}
                    style={styles.tribeHeaderButton}
                >
                    <View style={styles.iconPill}>
                        <Ionicons name="trophy" size={ICON_TROPHY_LG} color={ACCENT} />
                    </View>
                    <Text style={styles.tribeHeaderTitle} numberOfLines={1}>
                        Set Tribe Comparisons
                    </Text>
                    <Ionicons name="chevron-forward" size={ICON_CHEVRON} color={ICON_MUTED} />
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
                rank={index + 1}
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
                contentContainerStyle={{ paddingBottom: 24 }}
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
        backgroundColor: require("../../theme/mfpDark").default.field,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        borderRadius: 999,
        flex: 1,
        gap: SELECTOR_GAP,
    },
    selectorText: { fontFamily: "Outfit_600SemiBold", fontSize: FONT_SELECTOR, color: TITLE_COLOR, flexShrink: 1, letterSpacing: 0.2 },
    metricPill: {
        paddingHorizontal: METRIC_PAD_H,
        paddingVertical: METRIC_PAD_V,
        backgroundColor: require("../../theme/mfpDark").default.field,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        borderRadius: 999,
    },
    metricText: { fontFamily: "Outfit_700Bold", fontSize: FONT_METRIC, color: THEME.accentBlue, letterSpacing: 0.2 },

    // tribe banner — modern warm “gold” card (no border)
    bannerCard: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: BANNER_PAD_H,
        paddingVertical: BANNER_PAD_V,
        borderRadius: BANNER_RADIUS,
        backgroundColor: "#262F42",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
        elevation: 4,
        marginBottom: BANNER_MB,
    },
    iconPill: {
        width: ICON_PILL_SIZE,
        height: ICON_PILL_SIZE,
        borderRadius: ICON_PILL_RADIUS,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: ACCENT_BG,
        marginRight: ICON_PILL_MR,
    },
    bannerTitle: { fontFamily: "Outfit_700Bold", fontSize: FONT_BANNER_TITLE, color: TITLE_COLOR },
    bannerMeta: { fontFamily: "Outfit_600SemiBold", fontSize: FONT_BANNER_META, color: ICON_MUTED, opacity: 0.98, marginTop: scaleSize(2), letterSpacing: 0.2 },

    // minimal “no comparisons yet” CTA
    tribeHeaderButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: TRIBE_BTN_PAD_H,
        paddingVertical: TRIBE_BTN_PAD_V,
        borderRadius: TRIBE_BTN_RADIUS,
        backgroundColor: BANNER_BG,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
        marginBottom: TRIBE_BTN_MB,
        gap: TRIBE_BTN_GAP,
    },
    tribeHeaderTitle: {
        flex: 1,
        fontFamily: "Outfit_700Bold",
        fontSize: FONT_TRIBE_TITLE,
        color: TITLE_COLOR,
        letterSpacing: 0.2,
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
