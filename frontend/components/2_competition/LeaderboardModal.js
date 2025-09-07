import React, { useMemo } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import LeaderboardCard from "../2_Competition/LeaderboardCard";
import scaleSize from "../../helper/scaleSize";
import { Weight } from "iconsax-react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const H_PADDING = 16;
const BANNER_WIDTH = SCREEN_WIDTH - H_PADDING * 2;

// Accent palette (tweak here if you want a different vibe)
const ACCENT = "#f6b000ff";            // rich gold
const ACCENT_BG = "#f6b00041";
const BANNER_BG = "#ffe1685c";       // very light warm wash
const TITLE_COLOR = "#2F2500";       // deep warm text
const ICON_MUTED = "#8A8F98";

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
                                        <Ionicons name="trophy" size={19} color={ACCENT} />
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
                                    <Ionicons name="chevron-forward" size={18} color={ICON_MUTED} />
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
                        <Ionicons name="trophy" size={20} color={ACCENT} />
                    </View>
                    <Text style={styles.tribeHeaderTitle} numberOfLines={1}>
                        Set Tribe Comparisons
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={ICON_MUTED} />
                </TouchableOpacity>
            );
        }

        // Non-tribe: selector + metric toggle (unchanged)
        return (
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={openModal} activeOpacity={0.85} style={styles.selectorPill}>
                    {/* <Ionicons name="barbell" size={16} color="#222" /> */}
                    <Weight size={21} color="#222" variant='Broken' />
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
    container: { flex: 1, paddingHorizontal: H_PADDING, paddingTop: 12 },

    // non-tribe header
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        gap: 10,
    },
    selectorPill: {
        flexDirection: "row",
        alignItems: "center",
        paddingRight: 12,
        paddingLeft: 16,
        paddingVertical: 8,
        backgroundColor: "#F2F4F8",
        borderRadius: 999,
        flex: 1,
        gap: 8,
    },
    selectorText: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: "#222", flexShrink: 1 },
    metricPill: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: "#E8F0FF",
        borderRadius: 999,
    },
    metricText: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: "#2A65D9" },

    // tribe banner — modern warm “gold” card (no border)
    bannerCard: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 22,
        backgroundColor: BANNER_BG,
        // shadow disabled per your last snippet
        // elevation: 4,
        marginBottom: 2,
    },
    iconPill: {
        width: 35,
        height: 35,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: ACCENT_BG,
        marginRight: 10,
    },
    bannerTitle: { fontFamily: "Outfit_700Bold", fontSize: 14, color: TITLE_COLOR },
    bannerMeta: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: TITLE_COLOR, opacity: 0.9, marginTop: 2 },

    // minimal “no comparisons yet” CTA
    tribeHeaderButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 18,
        backgroundColor: BANNER_BG,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
        marginBottom: 10,
        gap: 10,
    },
    tribeHeaderTitle: {
        flex: 1,
        fontFamily: "Outfit_700Bold",
        fontSize: 15,
        color: TITLE_COLOR,
    },

    // pager dots
    dotsRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
        marginTop: 4,
        marginBottom: 2,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "rgba(0,0,0,0.15)",
    },
    dotActive: { backgroundColor: ACCENT, width: 8, height: 8, borderRadius: 4 },
});
