import React, { useRef, memo } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Dimensions, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
    DOTS_H,
    TPL_CARD_H,
    TPL_HEIGHT,
    BLUE,
    SAVED_TPL_TINT,
    SAVED_TPL_BORDER,
} from "./workoutTheme";
import { Weight } from "iconsax-react-native";
import theme from "../../../theme/mfpDark";
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

                    const railStyle = [
                        styles.rail,
                        isNone ? styles.railEmpty : styles.railSaved,
                    ];

                    const handlePress = () => {
                        try { haptic(); } catch {}
                        if (isNone) {
                            onAddTemplate && onAddTemplate();
                        } else {
                            onOpenTemplate && onOpenTemplate(item);
                        }
                    };

                    return (
                        <View style={[styles.page, { width: PAGE_W }]}>
                            <Pressable
                                onPress={handlePress}
                                android_ripple={{ color: "rgba(0,0,0,0.06)" }}
                                style={({ pressed }) => [railStyle, pressed && styles.railPressed]}
                                accessibilityRole="button"
                            >
                                <View style={styles.left}>
                                    <View
                                        style={[
                                            styles.dumbbell,
                                            isNone ? styles.dumbbellEmpty : styles.dumbbellSaved,
                                        ]}
                                    >
                                        {!isNone && <Weight size={23} color={'#7FC2FF'} variant='Broken' />}
                                    </View>

                                    <View style={{ flex: 1, minWidth: 0 }}>
                                        <Text numberOfLines={1} style={[styles.title, isNone && styles.titleNone]}>
                                            {item.name}
                                        </Text>

                                        <View style={styles.metaRow}>
                                            {isNone ? (
                                                <View style={styles.metaChunk}>
                                                    <Ionicons name="sparkles-outline" size={12.5} color="#64748B" />
                                                    <Text style={styles.metaSub}>Tap to create</Text>
                                                </View>
                                            ) : (
                                                <>
                                                    <View style={styles.metaChunk}>
                                                        <Weight size={19} color={BLUE.ACCENT} variant='Broken' />
                                                        <Text style={styles.metaLabel}>
                                                            {(Array.isArray(item.exercises) ? item.exercises.length : item.exercises || 0)} exercises
                                                        </Text>
                                                    </View>
                                                    <View style={styles.metaChunk}>
                                                        <Ionicons name="calendar-outline" size={12.5} color={BLUE.ACCENT} />
                                                        <Text style={styles.metaLabel}>{item.lastDate ?? "New!"}</Text>
                                                    </View>
                                                </>
                                            )}
                                        </View>
                                    </View>
                                </View>

                                <Ionicons name="chevron-forward" size={18} color={BLUE.ACCENT} />
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

const EMPTY_CARD_BG = "#1d2c45b3";
const EMPTY_CARD_BORDER = "rgba(95, 155, 215, 0.33)";

const styles = StyleSheet.create({
    wrap: { justifyContent: "space-between" },
    page: { height: TPL_CARD_H }, 
    rail: {
        height: TPL_CARD_H,
        marginHorizontal: scaleSize(16),
        borderRadius: scaleSize(18),
        paddingVertical: scaleSize(14),
        paddingHorizontal: scaleSize(14),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",

        backgroundColor: theme.surface,
        borderWidth: scaleSize(1),
        borderColor: theme.hairline,
        ...Platform.select({
            ios: {
                backgroundColor: theme.surface,
                shadowColor: "#000",
                shadowOpacity: 0.12,
                shadowRadius: scaleSize(6),
                shadowOffset: { width: 0, height: scaleSize(3) },
            },
            android: { elevation: 1 },
        }),
    },
    railPressed: { transform: [{ scale: 0.99 }] },
    // Empty shows dashed border hint; saved uses solid border
    railEmpty: {
        backgroundColor: EMPTY_CARD_BG,
        borderStyle: "dashed",
        borderColor: EMPTY_CARD_BORDER,
        borderWidth: scaleSize(1.5),
    },
    railSaved: { backgroundColor: theme.surface, borderColor: theme.hairline },
    dumbbellSaved: {
        backgroundColor: theme.field,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
        ...Platform.select({
            ios: {
                backgroundColor: theme.field,
                shadowColor: "#000",
                shadowOpacity: 0.12,
                shadowRadius: scaleSize(5),
                shadowOffset: { width: 0, height: scaleSize(2) },
            },
            android: { elevation: 1 },
        })
    },
    
    left: { flexDirection: "row", alignItems: "center", gap: scaleSize(10), flex: 1, minWidth: 0 },

    dumbbell: {
        width: scaleSize(36),
        height: scaleSize(36),
        borderRadius: scaleSize(18),
        alignItems: "center",
        justifyContent: "center",
    },
    dumbbellEmpty: {
        backgroundColor: EMPTY_CARD_BG,
        borderWidth: scaleSize(1),
        borderColor: EMPTY_CARD_BORDER,
        ...Platform.select({
            ios: {
                backgroundColor: EMPTY_CARD_BG,
                shadowColor: "#000",
                shadowOpacity: 0.12,
                shadowRadius: scaleSize(5),
                shadowOffset: { width: 0, height: scaleSize(2) },
            },
            android: { elevation: 1 },
        })
    },

    title: { fontFamily: "Outfit_700Bold", fontSize: scaleSize(16), color: "#E5E7EB", includeFontPadding: false },
    titleNone: { color: "#E5E7EB" },

    metaRow: { flexDirection: "row", alignItems: "center", gap: scaleSize(12), marginTop: scaleSize(4) },
    metaChunk: { flexDirection: "row", alignItems: "center", gap: scaleSize(5) },
    metaLabel: { fontFamily: "Outfit_700Bold", fontSize: scaleSize(12.5), color: "#E5E7EB" },
    metaSub: { fontFamily: "Outfit_600SemiBold", fontSize: scaleSize(12.5), color: "#94A3B8" },

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
