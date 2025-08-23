import React, { useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import LeaderboardCard from "../2_Competition/LeaderboardCard";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const H_PADDING = 16;
const BANNER_WIDTH = SCREEN_WIDTH - H_PADDING * 2;

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
                            renderItem={({ item, index }) => (
                                <TouchableOpacity
                                    activeOpacity={0.95}
                                    style={[styles.bannerCard, { width: BANNER_WIDTH }]}
                                    onPress={onOpenTribeComparison}
                                >
                                    <Ionicons name="trophy" size={18} color="#5B4100" style={{ marginRight: 8 }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.bannerTitle} numberOfLines={1}>
                                            {item.exercise} • {item.metric}{item.normalizeByBodyweight ? " • per lb" : ""}
                                        </Text>
                                        <Text style={styles.bannerSub} numberOfLines={1}>
                                            Swipe to switch • Tap to manage
                                        </Text>
                                    </View>
                                    {/* <Ionicons name="create-outline" size={18} color="#5B4100" /> */}
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
            // No comparisons yet → golden CTA
            return (
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={onOpenTribeComparison}
                    style={styles.tribeHeaderButton}
                >
                    <Ionicons name="trophy" size={18} color="#5B4100" style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.tribeHeaderTitle}>Set Tribe Comparisons</Text>
                        <Text style={styles.tribeHeaderSubtitle} numberOfLines={1} ellipsizeMode="tail">
                            Create multiple targets for the tribe (exercise • metric • per-lb)
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#5B4100" />
                </TouchableOpacity>
            );
        }

        // Non-tribe: old selector + metric toggle
        return (
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={openModal} activeOpacity={0.85} style={styles.selectorPill}>
                    <Ionicons name="barbell" size={16} color="#222" />
                    <Text style={styles.selectorText} numberOfLines={1}>{categoryCompared}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onToggleMetric} activeOpacity={0.85} style={styles.metricPill}>
                    <Text style={styles.metricText}>{comparedMetric}</Text>
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
                showBestSetWhenNotTribe
            />
        );
    };

    return (
        <View style={styles.container}>
            {header}
            <FlatList
                data={userList}
                keyExtractor={(u, i) => u?.uid || String(i)}
                renderItem={renderItem}
                contentContainerStyle={{ paddingBottom: 24 }}
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
        paddingHorizontal: 12,
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

    // tribe banner
    bannerCard: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,       // a bit more inset
        paddingVertical: 14,
        borderRadius: 22,            // increased radius
        backgroundColor: "#fadf84ff",  // softer, warmer gold
        borderWidth: 1,
        borderColor: "#E6BF52",      // complementary edge
        marginBottom: 6,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    bannerTitle: { fontFamily: "Outfit_700Bold", fontSize: 14, color: "#4C3A00" },
    bannerSub: { fontFamily: "Outfit_500Medium", fontSize: 12, color: "#4C3A00", opacity: 0.9 },

    dotsRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
        marginTop: 2,
        marginBottom: 4,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "rgba(91,65,0,0.25)",
    },
    dotActive: { backgroundColor: "#5B4100" },
});
