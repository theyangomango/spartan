import React, { useRef, memo } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Dimensions, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
    DOTS_H,
    TPL_CARD_H,
    TPL_HEIGHT,
    BLUE,
} from "./workoutTheme";
import { Weight } from "iconsax-react-native";
import scaleSize from "../../../helper/scaleSize";
import { strong as haptic } from "../../../utils/haptics";

function TemplatesRail({ templates = [], onIndexChange, onAddTemplate, onOpenTemplate }) {
    const { width: PAGE_W } = Dimensions.get("window");
    const x = useRef(new Animated.Value(0)).current;

    const onScroll = Animated.event([{ nativeEvent: { contentOffset: { x } } }], {
        useNativeDriver: false,
    });

    const handleMomentumEnd = (e) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / PAGE_W);
        onIndexChange && onIndexChange(idx);
    };

    return (
        <View style={[styles.wrap, { height: TPL_HEIGHT }]}>
            <Animated.FlatList
                data={templates}
                keyExtractor={(it) => it.id || it.tid}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToInterval={PAGE_W}
                decelerationRate="fast"
                onMomentumScrollEnd={handleMomentumEnd}
                onScroll={onScroll}
                scrollEventThrottle={16}
                renderItem={({ item }) => {
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

                    return (
                        <View style={[styles.page, { width: PAGE_W }]}>
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
                                        colors={SAVED_TEMPLATE_GRADIENT}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={[styles.cardBase, styles.cardSaved]}
                                    >
                                        <View style={styles.iconWrapSaved}>
                                            <Weight size={24} color={BLUE.ACCENT} variant="Broken" />
                                        </View>
                                        <View style={styles.contentColumn}>
                                            <View style={styles.textColumn}>
                                                <View style={styles.headerRow}>
                                                    <Text numberOfLines={1} style={styles.title}>{item.name}</Text>
                                                </View>
                                                <View style={styles.metaRow}>
                                                    <View style={styles.metaPill}>
                                                        <Ionicons name="barbell-outline" size={13} color="#B9D9FF" />
                                                        <Text style={styles.metaLabel}>{exercisesCount} exercises</Text>
                                                    </View>
                                                    <View style={styles.metaPill}>
                                                        <Ionicons name="calendar-outline" size={13} color="#B9D9FF" />
                                                        <Text style={styles.metaLabel}>{item.lastDate ?? "New!"}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                            <View style={styles.chevronContainer}>
                                                <View style={styles.chevronBubble}>
                                                    <Ionicons name="chevron-forward" size={16} color="rgba(12, 23, 40, 0.9)" />
                                                </View>
                                            </View>
                                        </View>
                                    </LinearGradient>
                                )}
                            </Pressable>
                        </View>
                    );
                }}
            />

            {/* indicators (tight to the cards) */}
            <View style={[styles.dotsRow, { height: DOTS_H }]}>
                {templates.map((_, i) => {
                    const inputRange = [(i - 1) * PAGE_W, i * PAGE_W, (i + 1) * PAGE_W];
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

const EMPTY_CARD_BG = "rgba(26, 38, 61, 0.78)";
const EMPTY_CARD_BORDER = "rgba(95, 155, 215, 0.45)";
const SAVED_TEMPLATE_GRADIENT = ["#1F3D6A", "#0C172A"];

const styles = StyleSheet.create({
    wrap: { justifyContent: "space-between" },
    page: { height: TPL_CARD_H },
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
    cardSaved: {
        borderWidth: scaleSize(1),
        borderColor: "rgba(119, 184, 255, 0.32)",
        overflow: "hidden",
    },
    iconWrapSaved: {
        width: scaleSize(40),
        height: scaleSize(40),
        borderRadius: scaleSize(20),
        alignItems: "center",
        justifyContent: "center",
        marginRight: scaleSize(12),
        backgroundColor: "rgba(42, 96, 155, 0.7)",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(154, 212, 255, 0.6)",
    },
    contentColumn: {
        flex: 1,
        minWidth: 0,
        height: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    textColumn: { flex: 1, minWidth: 0, gap: scaleSize(6) },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
    },
    title: {
        flex: 1,
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(15),
        color: "#F2F6FD",
        includeFontPadding: false,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: scaleSize(6),
        flexWrap: "wrap",
    },
    metaPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: scaleSize(4),
        paddingVertical: scaleSize(3),
        paddingHorizontal: scaleSize(10),
        borderRadius: scaleSize(999),
        backgroundColor: "rgba(30, 73, 130, 0.75)",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(170, 221, 255, 0.45)",
    },
    metaLabel: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(11.5),
        color: "#F4F8FF",
        includeFontPadding: false,
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
        backgroundColor: "rgba(34, 57, 92, 0.6)",
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
    chevronContainer: {
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        paddingLeft: scaleSize(8),
    },
    chevronBubble: {
        width: scaleSize(26),
        height: scaleSize(26),
        borderRadius: scaleSize(13),
        backgroundColor: "rgba(188, 223, 255, 0.9)",
        alignItems: "center",
        justifyContent: "center",
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
