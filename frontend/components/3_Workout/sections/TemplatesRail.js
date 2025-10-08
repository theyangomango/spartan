import React, { useRef, memo, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Platform, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
                    android_ripple={{ color: "rgba(99, 192, 255, 0.18)" }}
                    style={({ pressed }) => [styles.railTouchable, pressed && styles.railPressed]}
                    accessibilityRole="button"
                >
                    {isNone ? (
                        <View style={styles.emptyShadow}>
                            <View style={[styles.cardBase, styles.cardEmpty]}>
                                <LinearGradient
                                    colors={EMPTY_CARD_GRADIENT}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.cardBackground}
                                />
                                <View style={styles.emptySheen} />
                                <View style={styles.emptyIconWrap}>
                                    <Ionicons name="add" size={18} color="#F4F8FF" />
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
                                <LinearGradient
                                    colors={TEMPLATE_CARD_GRADIENT}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.cardBackground}
                                />
                                <View style={styles.templateSheen} />
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

const TEMPLATE_CARD_GRADIENT = ["#203662", "#101C34"];
const TEMPLATE_CARD_BORDER = "rgba(126, 208, 255, 0.45)";
const TEMPLATE_CARD_SHEEN = "rgba(102, 188, 255, 0.16)";
const EMPTY_CARD_GRADIENT = ["rgba(28, 48, 78, 0.96)", "rgba(14, 26, 46, 0.96)"];
const EMPTY_CARD_BORDER = "rgba(130, 204, 255, 0.46)";
const EMPTY_CARD_SHEEN = "rgba(96, 174, 255, 0.14)";
const TEMPLATE_ICON_BG = "rgba(82, 148, 232, 0.32)";
const TEMPLATE_ICON_BORDER = "rgba(150, 212, 255, 0.5)";
const TEMPLATE_ICON_COLOR = "#F4F8FF";
const TEMPLATE_SUBTITLE_COLOR = "#D2E6FF";
const META_BADGE_BG = "rgba(84, 146, 226, 0.22)";
const META_BADGE_BORDER = "rgba(142, 208, 255, 0.42)";
const META_BADGE_TEXT = "#E7F3FF";
const FONT_META_BADGE = ts(10);
const CARD_RADIUS = scaleSize(28);
const CARD_MIN_HEIGHT = scaleSize(86);
const CARD_SHADOW_COLOR = "rgba(8, 22, 44, 0.7)";
const EMPTY_ICON_BG = "rgba(70, 120, 188, 0.32)";
const DOT_ACTIVE = "#63C0FF";
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
    railPressed: {
        transform: [{ scale: 0.98 }],
        opacity: 0.92,
    },
    emptyShadow: {
        flex: 1,
        borderRadius: scaleSize(22),
        backgroundColor: "transparent",
        width: "100%",
        ...Platform.select({
            ios: {
                shadowColor: CARD_SHADOW_COLOR,
                shadowOpacity: 0.18,
                shadowRadius: scaleSize(9),
                shadowOffset: { width: 0, height: scaleSize(5) },
            },
            android: { elevation: 3 },
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
        overflow: "hidden",
    },
    cardTemplate: {
        flex: 1,
        minHeight: CARD_MIN_HEIGHT,
        borderWidth: scaleSize(1.2),
        borderColor: TEMPLATE_CARD_BORDER,
        borderRadius: scaleSize(22),
        justifyContent: "flex-start",
        gap: scaleSize(18),
    },
    cardBackground: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: scaleSize(22),
        pointerEvents: "none",
    },
    templateSheen: {
        position: "absolute",
        top: -scaleSize(60),
        right: -scaleSize(50),
        width: scaleSize(176),
        height: scaleSize(176),
        borderRadius: scaleSize(90),
        backgroundColor: TEMPLATE_CARD_SHEEN,
        opacity: 0.75,
        transform: [{ rotate: "25deg" }],
        pointerEvents: "none",
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
        color: "#F5F8FF",
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
        borderStyle: "dashed",
        borderColor: EMPTY_CARD_BORDER,
        borderWidth: scaleSize(1.5),
        justifyContent: "flex-start",
        gap: scaleSize(18),
        overflow: "hidden",
    },
    emptySheen: {
        position: "absolute",
        bottom: -scaleSize(54),
        left: -scaleSize(26),
        width: scaleSize(165),
        height: scaleSize(165),
        borderRadius: scaleSize(82),
        backgroundColor: EMPTY_CARD_SHEEN,
        opacity: 0.75,
        pointerEvents: "none",
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
        color: "#F5F8FF",
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
        color: "#D3E6FF",
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
    dash: {
        height: scaleSize(4),
        borderRadius: scaleSize(999),
        backgroundColor: DOT_ACTIVE,
    },
});
