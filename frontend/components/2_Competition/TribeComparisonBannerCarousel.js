import React, { useMemo, useRef, useCallback } from "react";
import { View, StyleSheet, TouchableOpacity, Platform, Animated, useWindowDimensions, Dimensions, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import scaleSize from "../../helper/scaleSize";
const ts = require("../../helper/scaleSize").ts;
import { withStrongPress, strong as triggerStrongHaptic } from "../../utils/haptics";

const { width: DEFAULT_SCREEN_WIDTH } = Dimensions.get("window");

// Layout constants dedicated to the tribe comparison banners
const BANNER_OUTER_PADDING = scaleSize(16);
const BANNER_RADIUS = scaleSize(28);
const BANNER_PAD_H = scaleSize(24);
const BANNER_PAD_V = scaleSize(5);
const BANNER_MIN_HEIGHT = scaleSize(88);
const BANNER_MB = scaleSize(2);
const BANNER_PAGER_PT = scaleSize(6);
const BANNER_PAGER_PB = scaleSize(4);

const ICON_TROPHY = scaleSize(16);
const ICON_TROPHY_LG = scaleSize(16);
const ICON_CHEVRON = scaleSize(18);
const ICON_PILL_SIZE = scaleSize(30);
const ICON_PILL_RADIUS = scaleSize(18);
const ICON_PILL_MR = scaleSize(14);

const FONT_BANNER_TITLE = ts(14);
const FONT_BANNER_META = ts(11);

const DOT_HEIGHT = scaleSize(4);
const DOT_MIN_WIDTH = scaleSize(8);
const DOT_MAX_WIDTH = scaleSize(32);
const DOT_RADIUS = scaleSize(999);
const DOT_GAP = scaleSize(6);
const DOT_MT = scaleSize(6);
const DOT_MB = scaleSize(2);

const ACCENT = "#F8C981";
const ACCENT_BG = "rgba(248, 201, 129, 0.28)";
const ACCENT_BORDER = "rgba(248, 201, 129, 0.55)";
const BANNER_GRADIENT = ["#6B3A1F", "#251F30"];
const BANNER_BORDER = "rgba(248, 201, 129, 0.44)";
const BANNER_TEXT_PRIMARY = "#FFF3DB";
const BANNER_TEXT_SECONDARY = "rgba(254, 233, 203, 0.82)";
const BADGE_BG = "rgba(255, 239, 208, 0.88)";
const BADGE_BORDER = "rgba(255, 224, 178, 0.92)";
const BADGE_SECONDARY_BG = "rgba(116, 154, 198, 0.32)";
const BADGE_SECONDARY_BORDER = "rgba(134, 177, 230, 0.55)";
const BADGE_TEXT = "#4A341C";
const BADGE_TEXT_SECONDARY = "#dfeeffff";
const BANNER_TAG_COLOR = "rgba(255, 229, 193, 0.78)";
const CHEVRON_BG = "rgba(248, 201, 129, 0.18)";
const CHEVRON_BORDER = "rgba(248, 201, 129, 0.32)";

export const TribeComparisonBannerCarousel = React.memo(({
    isTribeFocused,
    tribeComparisons = [],
    activeCompIndex = 0,
    onActiveCompChange = () => { },
    onOpenTribeComparison = () => { },
    horizontalPadding = 0,
    style,
}) => {
    const hasComparisons = isTribeFocused && Array.isArray(tribeComparisons) && tribeComparisons.length > 0;

    const { width: windowWidth } = useWindowDimensions();
    const pageWidth = useMemo(
        () => Math.max(windowWidth || DEFAULT_SCREEN_WIDTH || 1, 1),
        [windowWidth]
    );
    const cardWidth = useMemo(
        () => Math.max(pageWidth - BANNER_OUTER_PADDING * 2, 1),
        [pageWidth]
    );

    const safeActiveIndex = useMemo(() => {
        if (!hasComparisons) return 0;
        const maxIndex = Math.max(0, tribeComparisons.length - 1);
        return Math.min(Math.max(0, activeCompIndex), maxIndex);
    }, [hasComparisons, tribeComparisons.length, activeCompIndex]);

    const scrollX = useRef(new Animated.Value(0)).current;
    const bannerRef = useRef(null);
    const lastReportedBannerIndex = useRef(safeActiveIndex);
    const previousPageWidth = useRef(pageWidth);
    const hasSyncedOnceRef = useRef(false);

    const notifyBannerChange = useCallback((idx) => {
        if (!hasComparisons) return;
        if (idx === lastReportedBannerIndex.current) return;
        lastReportedBannerIndex.current = idx;
        try { triggerStrongHaptic(); } catch {}
        onActiveCompChange(idx);
    }, [hasComparisons, onActiveCompChange]);

    const computeIndexFromOffset = useCallback((offset) => {
        if (!hasComparisons) return 0;
        const width = pageWidth || 1;
        const clamped = Math.max(0, Number(offset) || 0);
        const nextIndex = Math.round(clamped / width);
        const maxIndex = Math.max(0, tribeComparisons.length - 1);
        return Math.min(Math.max(nextIndex, 0), maxIndex);
    }, [hasComparisons, pageWidth, tribeComparisons.length]);

    const handleScroll = useMemo(() => (
        Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            {
                useNativeDriver: false,
                listener: (event) => {
                    const nextIndex = computeIndexFromOffset(event.nativeEvent.contentOffset.x);
                    notifyBannerChange(nextIndex);
                },
            }
        )
    ), [scrollX, notifyBannerChange, computeIndexFromOffset]);

    const onScrollEndDrag = useCallback((e) => {
        const idx = computeIndexFromOffset(e.nativeEvent.contentOffset.x);
        notifyBannerChange(idx);
    }, [notifyBannerChange, computeIndexFromOffset]);

    const onMomentumEnd = useCallback((e) => {
        const idx = computeIndexFromOffset(e.nativeEvent.contentOffset.x);
        notifyBannerChange(idx);
    }, [notifyBannerChange, computeIndexFromOffset]);

    React.useEffect(() => {
        const widthChanged = Math.abs((previousPageWidth.current || 0) - pageWidth) > 0.5;
        previousPageWidth.current = pageWidth;

        if (!hasComparisons) {
            lastReportedBannerIndex.current = safeActiveIndex;
            scrollX.setValue(0);
            hasSyncedOnceRef.current = false;
            return;
        }

        const targetOffset = safeActiveIndex * pageWidth;
        const indexChanged = safeActiveIndex !== lastReportedBannerIndex.current;

        if (!hasSyncedOnceRef.current) {
            scrollX.setValue(targetOffset);
            hasSyncedOnceRef.current = true;
        }

        if (widthChanged) {
            scrollX.setValue(targetOffset);
        }

        if (indexChanged || widthChanged) {
            lastReportedBannerIndex.current = safeActiveIndex;
            try {
                const ref = bannerRef.current;
                if (ref && typeof ref.scrollToIndex === "function") {
                    ref.scrollToIndex({ index: safeActiveIndex, animated: !widthChanged });
                }
            } catch { }
        }
    }, [hasComparisons, safeActiveIndex, pageWidth, scrollX]);

    const metricLabel = useCallback((m) => (m === "1RM" ? "1RM (Adj)" : m), []);

    if (!isTribeFocused) return null;

    if (!hasComparisons) {
        return (
            <View
                style={[
                    styles.bannerPager,
                    style,
                    {
                        width: pageWidth,
                        marginHorizontal: -horizontalPadding,
                    },
                ]}
            >
                <TouchableOpacity
                    activeOpacity={0.92}
                    onPress={withStrongPress(onOpenTribeComparison)}
                    style={[styles.bannerTouchable, { width: cardWidth }]}
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

    return (
        <View
            style={[
                styles.bannerPager,
                style,
                {
                    width: pageWidth,
                    marginHorizontal: -horizontalPadding,
                },
            ]}
        >
            <Animated.FlatList
                ref={bannerRef}
                horizontal
                data={tribeComparisons}
                keyExtractor={(_, i) => `tribe-comp-${i}`}
                showsHorizontalScrollIndicator={false}
                snapToAlignment="start"
                snapToInterval={pageWidth}
                disableIntervalMomentum
                decelerationRate={Platform.OS === "ios" ? "fast" : 0.92}
                bounces={false}
                overScrollMode="never"
                onScrollEndDrag={onScrollEndDrag}
                onMomentumScrollEnd={onMomentumEnd}
                initialScrollIndex={safeActiveIndex}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                getItemLayout={(_, index) => ({ length: pageWidth, offset: pageWidth * index, index })}
                renderItem={({ item }) => (
                    <View style={{ width: pageWidth }}>
                        <TouchableOpacity
                            activeOpacity={0.92}
                            style={[styles.bannerTouchable, { width: cardWidth }]}
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
                                            <Text style={styles.bannerTitle} numberOfLines={1}>
                                                {item.exercise}
                                            </Text>
                                            <View style={styles.bannerMetaRow}>
                                                <View style={styles.metricBadge}>
                                                    <Text style={styles.metricBadgeText}>{metricLabel(item.metric)}</Text>
                                                </View>
                                                {item.normalizeByBodyweight && (
                                                    <View style={[styles.metricBadge, styles.metricBadgeSecondary]}>
                                                        <Text style={[styles.metricBadgeText, styles.metricBadgeTextSecondary]}>
                                                            per lb
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                </LinearGradient>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}
                contentContainerStyle={{}}
            />
            {tribeComparisons.length > 1 && (
                <View style={styles.dotsRow}>
                    {tribeComparisons.map((_, i) => {
                        const inputRange = [
                            (i - 1) * pageWidth,
                            i * pageWidth,
                            (i + 1) * pageWidth,
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
});

const styles = StyleSheet.create({
    bannerPager: {
        marginBottom: scaleSize(10),
        paddingTop: BANNER_PAGER_PT,
        paddingBottom: BANNER_PAGER_PB,
        alignSelf: "center",
    },
    bannerTouchable: {
        borderRadius: BANNER_RADIUS,
        marginBottom: BANNER_MB,
        marginHorizontal: BANNER_OUTER_PADDING,
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
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(FONT_BANNER_TITLE),
        color: BANNER_TEXT_PRIMARY,
        letterSpacing: 0.3,
    },
    bannerMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "nowrap",
        marginTop: scaleSize(6),
    },
    bannerDescription: {
        marginTop: scaleSize(4),
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(10.5),
        color: BANNER_TEXT_SECONDARY,
        letterSpacing: 0.2,
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
        fontSize: scaleSize(11),
        color: BADGE_TEXT,
        letterSpacing: 0.38,
        textTransform: "uppercase",
    },
    metricBadgeTextSecondary: {
        color: BADGE_TEXT_SECONDARY,
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

export default TribeComparisonBannerCarousel;
