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

                    const handlePress = () =>
                        isNone ? onAddTemplate && onAddTemplate() : onOpenTemplate && onOpenTemplate(item);

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

const eq = (a, b) => {
    if (a.templates === b.templates && a.onAddTemplate === b.onAddTemplate && a.onOpenTemplate === b.onOpenTemplate && a.onIndexChange === b.onIndexChange) return true;
    const aIds = Array.isArray(a.templates) ? a.templates.map((t) => t.id || t.tid).join('|') : '';
    const bIds = Array.isArray(b.templates) ? b.templates.map((t) => t.id || t.tid).join('|') : '';
    return aIds === bIds && a.onAddTemplate === b.onAddTemplate && a.onOpenTemplate === b.onOpenTemplate && a.onIndexChange === b.onIndexChange;
};

export default memo(TemplatesRail, eq);

const styles = StyleSheet.create({
    wrap: { justifyContent: "space-between" },
    page: { height: TPL_CARD_H },
    rail: {
        height: TPL_CARD_H,
        marginHorizontal: 16,
        borderRadius: 18,
        paddingVertical: 14,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",

        backgroundColor: "#252733",
        borderWidth: 1,
        borderColor: "#3B4350",
        ...Platform.select({
            ios: { shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 10 } },
            android: { elevation: 1 },
        }),
    },
    railPressed: { transform: [{ scale: 0.99 }] },
    // Reverse backgrounds: empty (no template) appears darker; saved templates a bit lighter
    railEmpty: { backgroundColor: "#252733", borderStyle: "dashed", borderColor: "rgba(255,255,255,0.16)" },
    railSaved: { backgroundColor: "#252733", borderColor: "rgba(255,255,255,0.10)" },
    dumbbellSaved: {
        backgroundColor: "#2F3340",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.16)",
        ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } }, android: { elevation: 2 } })
    },
    
    left: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },

    dumbbell: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    dumbbellEmpty: {
        backgroundColor: "#2F3340",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.14)",
        ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } }, android: { elevation: 2 } })
    },

    title: { fontFamily: "Outfit_700Bold", fontSize: 16, color: "#E5E7EB", includeFontPadding: false },
    titleNone: { color: "#E5E7EB" },

    metaRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
    metaChunk: { flexDirection: "row", alignItems: "center", gap: 5 },
    metaLabel: { fontFamily: "Outfit_700Bold", fontSize: 12.5, color: "#E5E7EB" },
    metaSub: { fontFamily: "Outfit_600SemiBold", fontSize: 12.5, color: "#94A3B8" },

    dotsRow: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 2,
        height: DOTS_H,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingHorizontal: 16,
    },
    dash: { height: 4, borderRadius: 999, backgroundColor: BLUE.ACCENT },
});
