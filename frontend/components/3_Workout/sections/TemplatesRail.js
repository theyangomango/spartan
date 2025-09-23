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

    const onScroll = Animated.event([{ nativeEvent: { contentOffset: { x } } }], {
        useNativeDriver: false,
    });

    const handleMomentumEnd = useCallback((e) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
        onIndexChange && onIndexChange(idx);
    }, [onIndexChange, pageWidth]);

    const renderItem = useCallback(({ item }) => {
        const isNone = !!item.isNone;

        const handlePress = () => {
            try { haptic(); } catch {}
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

        return (
            <View style={[styles.page, { width: pageWidth }]}>
                <Pressable
                    onPress={handlePress}
                    android_ripple={{ color: "rgba(0,0,0,0.08)" }}
                    style={({ pressed }) => [styles.railTouchable, pressed && styles.railPressed]}
                    accessibilityRole="button"
                >
                    {isNone ? (
                        <View style={[styles.cardBase, styles.cardEmpty]}>
                            <View style={styles.emptyIconWrap}>
                                <Ionicons name="add" size={22} color={BLUE.ACCENT} />
                            </View>
                            <View style={styles.emptyTextColumn}>
                                <Text numberOfLines={1} style={styles.emptyTitle}>{item.name}</Text>
                                <View style={styles.emptySubWrap}>
                                    <Ionicons name="sparkles-outline" size={14} color={BLUE.ACCENT} />
                                    <Text style={styles.emptySubtitle}>Tap to create</Text>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <LinearGradient
                            colors={SELECTED_TEMPLATE_GRADIENT}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[styles.cardBase, styles.cardSelected]}
                        >
                            <View style={styles.selectedContent}>
                                <View style={styles.iconPill}>
                                    <Weight size={scaleSize(21)} color={ICON_PILL_ICON} variant="Broken" />
                                </View>
                                <View style={styles.selectedTextColumn}>
                                    <Text style={styles.selectedTag}>Selected Template</Text>
                                    <Text numberOfLines={1} style={styles.selectedTitle}>{item.name}</Text>
                                    <View style={styles.metaRow}>
                                        <View style={styles.metaBadge}>
                                            <Ionicons name="barbell-outline" size={13} color={META_BADGE_ICON} />
                                            <Text style={styles.metaBadgeText}>{exercisesCount} {exercisesLabel}</Text>
                                        </View>
                                        <View style={styles.metaBadge}>
                                            <Ionicons name="calendar-outline" size={13} color={META_BADGE_ICON} />
                                            <Text style={styles.metaBadgeText}>{item.lastDate ?? "New!"}</Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.chevronPill}>
                                    <Ionicons name="chevron-forward" size={16} color={CHEVRON_ICON} />
                                </View>
                            </View>
                        </LinearGradient>
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
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToInterval={pageWidth}
                decelerationRate="fast"
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

const EMPTY_CARD_BG = "rgba(38, 56, 88, 0.88)";
const EMPTY_CARD_BORDER = "rgba(126, 186, 246, 0.58)";
const SELECTED_TEMPLATE_GRADIENT = ["#17345D", "#0A1527"];
const SELECTED_TEMPLATE_BORDER = "rgba(114, 187, 255, 0.38)";
const ICON_PILL_BG = "rgba(125, 196, 255, 0.22)";
const ICON_PILL_BORDER = "rgba(144, 210, 255, 0.46)";
const ICON_PILL_ICON = "#9DD1FF";
const SELECTED_TAG_COLOR = "rgba(198, 223, 255, 0.82)";
const SELECTED_TITLE_COLOR = "#F4F9FF";
const META_BADGE_BG = "rgba(136, 205, 255, 0.22)";
const META_BADGE_BORDER = "rgba(160, 218, 255, 0.45)";
const META_BADGE_TEXT = "#E0EEFF";
const META_BADGE_ICON = "#A6D6FF";
const CHEVRON_BG = "rgba(128, 199, 255, 0.2)";
const CHEVRON_BORDER = "rgba(156, 214, 255, 0.45)";
const CHEVRON_ICON = "#F1F6FF";

const ICON_PILL_SIZE = scaleSize(32);
const ICON_PILL_RADIUS = scaleSize(18);
const FONT_SELECTED_TAG = ts(10);
const FONT_SELECTED_TITLE = ts(13);
const FONT_META_BADGE = ts(10);

const styles = StyleSheet.create({
    wrap: { justifyContent: "space-between" },
    page: { height: TPL_CARD_H, justifyContent: "center" },
    railTouchable: {
        height: TPL_CARD_H,
        marginHorizontal: scaleSize(16),
        borderRadius: scaleSize(22),
        overflow: "hidden",
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOpacity: 0.14,
                shadowRadius: scaleSize(8),
                shadowOffset: { width: 0, height: scaleSize(4) },
            },
            android: { elevation: 2 },
        }),
        backgroundColor: "transparent",
    },
    railPressed: { transform: [{ scale: 0.98 }] },
    cardBase: {
        flexDirection: "row",
        alignItems: "center",
        height: TPL_CARD_H,
        paddingVertical: scaleSize(14),
        paddingHorizontal: scaleSize(18),
        borderRadius: scaleSize(22),
        position: "relative",
    },
    cardSelected: {
        borderWidth: scaleSize(1),
        borderColor: SELECTED_TEMPLATE_BORDER,
        overflow: "hidden",
        paddingHorizontal: scaleSize(18),
        paddingVertical: scaleSize(8),
        minHeight: scaleSize(78),
    },
    selectedContent: {
        flexDirection: "row",
        alignItems: "center",
        minHeight: "100%",
        flex: 1,
        width: "100%",
        paddingVertical: scaleSize(4),
    },
    iconPill: {
        width: ICON_PILL_SIZE,
        height: ICON_PILL_SIZE,
        borderRadius: ICON_PILL_RADIUS,
        alignItems: "center",
        justifyContent: "center",
        marginRight: scaleSize(14),
        backgroundColor: ICON_PILL_BG,
        borderWidth: scaleSize(1),
        borderColor: ICON_PILL_BORDER,
    },
    selectedTextColumn: {
        flex: 1,
        minWidth: 0,
        marginRight: scaleSize(12),
        justifyContent: "center",
        paddingLeft: scaleSize(2),
        paddingTop: scaleSize(2),
    },
    selectedTag: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(FONT_SELECTED_TAG),
        letterSpacing: 1,
        textTransform: "uppercase",
        color: SELECTED_TAG_COLOR,
        includeFontPadding: false,
        marginBottom: scaleSize(2),
    },
    selectedTitle: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: scaleSize(FONT_SELECTED_TITLE),
        color: SELECTED_TITLE_COLOR,
        includeFontPadding: false,
        letterSpacing: 0.3,
        marginBottom: 0,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: scaleSize(6),
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
        marginRight: scaleSize(4),
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
    chevronPill: {
        width: scaleSize(30),
        height: scaleSize(30),
        borderRadius: scaleSize(16),
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: CHEVRON_BG,
        borderWidth: scaleSize(1),
        borderColor: CHEVRON_BORDER,
        marginLeft: scaleSize(8),
        alignSelf: "center",
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
        width: scaleSize(44),
        height: scaleSize(44),
        borderRadius: scaleSize(22),
        borderWidth: scaleSize(1.3),
        borderColor: EMPTY_CARD_BORDER,
        backgroundColor: "rgba(46, 74, 120, 0.72)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: scaleSize(10),
    },
    emptyTextColumn: { flex: 1, minWidth: 0, gap: scaleSize(4) },
    emptyTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(15),
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
