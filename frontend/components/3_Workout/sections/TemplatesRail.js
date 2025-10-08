import React, { useRef, memo, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Platform, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
    DOTS_H,
    TPL_CARD_H,
    TPL_HEIGHT,
    BLUE,
} from "./workoutTheme";
import { Weight } from "iconsax-react-native";
import scaleSize, { ts } from "../../../helper/scaleSize";
import { strong as haptic } from "../../../utils/haptics";

function TemplatesRail({ templates = [], onIndexChange, onAddTemplate, onOpenTemplate }) {
    const { width: windowWidth } = useWindowDimensions();
    const pageWidth = useMemo(() => Math.max(windowWidth || 1, 1), [windowWidth]);
    const x = useRef(new Animated.Value(0)).current;

    const lastReportedIndex = useRef(0);

    const notifyIndexChange = useCallback((idx) => {
        if (idx === lastReportedIndex.current) return;
        lastReportedIndex.current = idx;
        try { haptic(); } catch { }
        onIndexChange && onIndexChange(idx);
    }, [onIndexChange]);

    const onScroll = useMemo(() => Animated.event(
        [{ nativeEvent: { contentOffset: { x } } }],
        {
            useNativeDriver: false,
            listener: (event) => {
                const nextIndex = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
                notifyIndexChange(nextIndex);
            },
        }
    ), [x, notifyIndexChange, pageWidth]);

    const handleScrollEndDrag = useCallback((e) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
        notifyIndexChange(idx);
    }, [notifyIndexChange, pageWidth]);

    const handleMomentumEnd = useCallback((e) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
        notifyIndexChange(idx);
    }, [notifyIndexChange, pageWidth]);

    const renderItem = useCallback(({ item }) => {
        const isNone = !!item.isNone;

        const handlePress = () => {
            try { haptic(); } catch { }
            if (isNone) {
                onAddTemplate && onAddTemplate();
            } else {
                onOpenTemplate && onOpenTemplate(item);
            }
        };

        const exercisesCount = Array.isArray(item.exercises)
            ? item.exercises.length
            : Number.isFinite(item.exercises) ? item.exercises : 0;

        const exercisesLabel = exercisesCount === 1 ? "exercise" : "exercises";

        const lastDateLabel = typeof item?.lastDate === "string"
            ? item.lastDate.trim() || "New"
            : item?.lastDate ? String(item.lastDate) : "New";

        const metaBadges = [
            lastDateLabel ? { key: "last", label: lastDateLabel } : null,
            exercisesCount > 0 ? { key: "exercises", label: `${exercisesCount} ${exercisesLabel}` } : null,
        ].filter(Boolean);

        return (
            <View style={[styles.page, { width: pageWidth }]}>
                <Pressable
                    onPress={handlePress}
                    android_ripple={{ color: "rgba(0,0,0,0.08)" }}
                    style={({ pressed }) => [styles.railTouchable, pressed && styles.railPressed]}
                    accessibilityRole="button"
                >
                    {isNone ? (
                        <View style={styles.emptyShadow}>
                            <View style={[styles.cardBase, styles.cardEmpty]}>
                                <View style={styles.emptyIconWrap}>
                                    <Ionicons name="add" size={18} color={'#fff'} />
                                </View>
                                <View style={styles.emptyTextColumn}>
                                    <Text numberOfLines={1} style={styles.emptyTitle}>{item.name}</Text>
                                    <View style={styles.emptySubWrap}>
                                        <Ionicons name="sparkles-outline" size={14} color={BLUE.ACCENT} />
                                        <Text style={styles.emptySubtitle}>Tap to create</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.selectedShadow}>
                            <View style={[styles.cardBase, styles.cardTemplate]}>
                                <View style={styles.templateIconWrap}>
                                    <Weight size={scaleSize(21)} color={TEMPLATE_ICON_COLOR} variant="Broken" />
                                </View>
                                <View style={styles.templateTextColumn}>
                                    <Text numberOfLines={1} style={styles.templateTitle}>{item.name}</Text>
                                    <View style={styles.templateSubWrap}>
                                        <Ionicons name="sparkles-outline" size={14} color={BLUE.ACCENT} />
                                        <Text style={styles.templateSubtitle}>Tap to edit</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}
                </Pressable>
            </View>
        );
    }, [onAddTemplate, onOpenTemplate, pageWidth]);

    return (
        <View style={[styles.wrap, { height: TPL_HEIGHT }]}>
            <Animated.FlatList
                data={templates}
                keyExtractor={(it) => it.id || it.tid}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={pageWidth}
                snapToAlignment="start"
                disableIntervalMomentum
                decelerationRate={Platform.OS === "ios" ? "fast" : 0.92}
                bounces={false}
                overScrollMode="never"
                onScrollEndDrag={handleScrollEndDrag}
                onMomentumScrollEnd={handleMomentumEnd}
                onScroll={onScroll}
                scrollEventThrottle={16}
                renderItem={renderItem}
                getItemLayout={(_, index) => ({ length: pageWidth, offset: pageWidth * index, index })}
                initialNumToRender={1}
                maxToRenderPerBatch={2}
            />

            {/* indicators (tight to the cards) */}
            <View style={[styles.dotsRow, { height: DOTS_H }]}>
                {templates.map((_, i) => {
                    const inputRange = [(i - 1) * pageWidth, i * pageWidth, (i + 1) * pageWidth];
                    const w = x.interpolate({ inputRange, outputRange: [8, 34, 8], extrapolate: "clamp" });
                    const o = x.interpolate({ inputRange, outputRange: [0.25, 0.9, 0.25], extrapolate: "clamp" });
                    return <Animated.View key={i} style={[styles.dash, { width: w, opacity: o }]} />;
                })}
            </View>
        </View>
    );
}

const sig = (arr) => {
    if (!Array.isArray(arr)) return '';
    try {
        return arr
            .map((t) => {
                const id = t?.id || t?.tid || '';
                const name = t?.name || '';
                const exLen = Array.isArray(t?.exercises) ? t.exercises.length : (t?.exercises || 0);
                const last = t?.lastDate || '';
                // Include a simple shape of exercises to detect add/remove quickly
                const exSig = Array.isArray(t?.exercises)
                    ? t.exercises.map((ex) => `${ex?.name || ''}:${Array.isArray(ex?.sets) ? ex.sets.length : 0}`).join(',')
                    : '';
                return `${id}~${name}~${exLen}~${last}~${exSig}`;
            })
            .join('|');
    } catch {
        return '';
    }
};

const eq = (a, b) => {
    if (a.onAddTemplate !== b.onAddTemplate || a.onOpenTemplate !== b.onOpenTemplate || a.onIndexChange !== b.onIndexChange) return false;
    if (a.templates === b.templates) return true;
    return sig(a.templates) === sig(b.templates);
};

export default memo(TemplatesRail, eq);

const EMPTY_CARD_BG = "rgba(24, 40, 68, 0.92)";
const EMPTY_CARD_BORDER = "rgba(124, 194, 255, 0.52)";
const TEMPLATE_CARD_BG = "rgba(18, 34, 60, 0.94)";
const TEMPLATE_CARD_BORDER = "rgba(134, 204, 255, 0.46)";
const TEMPLATE_ICON_BG = "rgba(86, 160, 255, 0.2)";
const TEMPLATE_ICON_BORDER = "rgba(138, 206, 255, 0.52)";
const TEMPLATE_ICON_COLOR = "#D4E8FF";
const TEMPLATE_SUBTITLE_COLOR = "#C5E1FF";
const META_BADGE_BG = "rgba(84, 146, 226, 0.24)";
const META_BADGE_BORDER = "rgba(140, 210, 255, 0.48)";
const META_BADGE_TEXT = "#E6F2FF";
const FONT_META_BADGE = ts(10);
const CARD_RADIUS = scaleSize(28);
const CARD_MIN_HEIGHT = scaleSize(78);
const CARD_SHADOW_COLOR = "rgba(10, 26, 52, 0.65)";
const EMPTY_ICON_BG = "rgba(60, 100, 160, 0.52)";
const CARD_SHADOW_OFFSET = scaleSize(10);
const CARD_SHADOW_RADIUS = scaleSize(20);

const styles = StyleSheet.create({
    wrap: { justifyContent: "space-between" },
    page: { height: TPL_CARD_H, justifyContent: "center" },
    railTouchable: {
        height: TPL_CARD_H,
        marginHorizontal: scaleSize(16),
        borderRadius: CARD_RADIUS,
        backgroundColor: "transparent",
        justifyContent: "center",
    },
    railPressed: { transform: [{ scale: 0.98 }] },
    emptyShadow: {
        flex: 1,
        borderRadius: scaleSize(22),
        backgroundColor: "transparent",
        width: "100%",
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOpacity: 0.14,
                shadowRadius: scaleSize(8),
                shadowOffset: { width: 0, height: scaleSize(4) },
            },
            android: { elevation: 2 },
        }),
    },
    selectedShadow: {
        flex: 1,
        borderRadius: CARD_RADIUS,
        minHeight: CARD_MIN_HEIGHT,
        backgroundColor: "transparent",
        width: "100%",
        ...Platform.select({
            ios: {
                shadowColor: CARD_SHADOW_COLOR,
                shadowOpacity: 0.24,
                shadowRadius: CARD_SHADOW_RADIUS,
                shadowOffset: { width: 0, height: CARD_SHADOW_OFFSET },
            },
            android: { elevation: 6 },
        }),
    },
    cardBase: {
        flexDirection: "row",
        alignItems: "center",
        height: TPL_CARD_H,
        paddingHorizontal: scaleSize(18),
        borderRadius: scaleSize(22),
        position: "relative",
    },
    cardTemplate: {
        flex: 1,
        minHeight: CARD_MIN_HEIGHT,
        backgroundColor: TEMPLATE_CARD_BG,
        borderWidth: scaleSize(1.4),
        borderColor: TEMPLATE_CARD_BORDER,
        borderRadius: scaleSize(22),
        justifyContent: "flex-start",
        gap: scaleSize(18),
    },
    templateIconWrap: {
        width: scaleSize(32),
        height: scaleSize(32),
        borderRadius: scaleSize(22),
        borderWidth: scaleSize(1.3),
        borderColor: TEMPLATE_ICON_BORDER,
        backgroundColor: TEMPLATE_ICON_BG,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: scaleSize(10),
    },
    templateTextColumn: {
        flex: 1,
        minWidth: 0,
        gap: scaleSize(6),
        paddingRight: scaleSize(4),
    },
    templateTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(14),
        color: "#EEF5FF",
        includeFontPadding: false,
    },
    templateSubWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: scaleSize(5),
    },
    templateSubtitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(12.5),
        color: TEMPLATE_SUBTITLE_COLOR,
        includeFontPadding: false,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: scaleSize(4),
        marginTop: scaleSize(4),
    },
    metaBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: scaleSize(4),
        paddingVertical: scaleSize(3),
        paddingHorizontal: scaleSize(10),
        borderRadius: scaleSize(999),
        backgroundColor: META_BADGE_BG,
        borderWidth: scaleSize(1),
        borderColor: META_BADGE_BORDER,
        marginBottom: scaleSize(4),
        marginTop: scaleSize(1),
    },
    metaBadgeText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(FONT_META_BADGE),
        color: META_BADGE_TEXT,
        includeFontPadding: false,
        letterSpacing: 0.38,
        textTransform: "uppercase",
    },
    cardEmpty: {
        backgroundColor: EMPTY_CARD_BG,
        borderStyle: "dashed",
        borderColor: EMPTY_CARD_BORDER,
        borderWidth: scaleSize(1.5),
        justifyContent: "flex-start",
        gap: scaleSize(18),
    },
    emptyIconWrap: {
        width: scaleSize(32),
        height: scaleSize(32),
        borderRadius: scaleSize(22),
        borderWidth: scaleSize(1.3),
        borderColor: EMPTY_CARD_BORDER,
        backgroundColor: EMPTY_ICON_BG,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: scaleSize(10),
    },
    emptyTextColumn: { flex: 1, minWidth: 0, gap: scaleSize(4) },
    emptyTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(14),
        color: "#E9F1FF",
        includeFontPadding: false,
    },
    emptySubWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: scaleSize(5),
    },
    emptySubtitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(12.5),
        color: "#B4C7E4",
        includeFontPadding: false,
    },
    dotsRow: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: scaleSize(2),
        height: DOTS_H,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: scaleSize(6),
        paddingHorizontal: scaleSize(16),
    },
    dash: { height: scaleSize(4), borderRadius: scaleSize(999), backgroundColor: BLUE.ACCENT },
});
