import React, { memo, useRef, useCallback, useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, Platform, Pressable, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import scaleSize from "../../../helper/scaleSize";
import { strong as haptic, burst as burstHaptic } from "../../../utils/haptics";
import { useCommunityStats, refreshCommunityStats } from "../../../logic/communityStats";
import { subscribeUserData } from "../../../utils/userDataEvents";

const CARD_BG = "#2B213C";
const CARD_GRADIENT = ["#c46f47ce", "#3B2857ce"];
const CARD_BORDER = "rgba(255, 216, 191, 0.42)";
const TEXT_PRIMARY = "#FFF8EC";
const TEXT_SECONDARY = "rgba(255, 236, 218, 0.8)";
const DIVIDER_COLOR = "rgba(255, 224, 203, 0.32)";
const RIPPLE_COLOR = "rgba(255, 220, 196, 0.24)";

const formatWithSeparators = (value) => {
    const n = Math.round(Number(value) || 0);
    try { return n.toLocaleString(); } catch { return String(n); }
};

const formatCompact = (value) => {
    const n = Number(value) || 0;
    if (!Number.isFinite(n) || n <= 0) return "0";
    if (n >= 1_000_000) {
        const scaled = n / 1_000_000;
        const decimals = scaled >= 10 ? 0 : 1;
        return `${scaled.toFixed(decimals)}M`;
    }
    if (n >= 1_000) {
        const scaled = n / 1_000;
        const decimals = scaled >= 10 ? 0 : 1;
        return `${scaled.toFixed(decimals)}k`;
    }
    return formatWithSeparators(n);
};

const normalizeUid = (entry) => {
    if (!entry) return "";
    if (typeof entry === "string" || typeof entry === "number") return String(entry);
    if (typeof entry === "object") {
        return String(
            entry.uid ||
            entry.id ||
            entry.userUid ||
            entry.followerUid ||
            entry.followUid ||
            ""
        );
    }
    return "";
};

const hasMutualFriends = (viewer) => {
    const meUid = viewer?.uid ? String(viewer.uid) : "";
    const toSet = (source) => {
        const set = new Set();
        if (!Array.isArray(source)) return set;
        source.forEach((entry) => {
            const uid = normalizeUid(entry);
            if (!uid) return;
            const normalized = String(uid);
            if (!normalized || normalized === meUid) return;
            set.add(normalized);
        });
        return set;
    };
    const followingSet = toSet(viewer?.following);
    const followersSet = toSet(viewer?.followers);
    for (const uid of followingSet) {
        if (followersSet.has(uid)) return true;
    }
    return false;
};

function TribeStatsCardCmp({ onPress }) {
    const scale = useRef(new Animated.Value(1)).current;
    const { stats, loading, ready, updatedAt } = useCommunityStats();

    const hasSnapshot = updatedAt > 0 || ready;

    const [viewerData, setViewerData] = useState(() => {
        try { return global?.userData || null; } catch { return null; }
    });

    useEffect(() => subscribeUserData((payload) => {
        setViewerData(payload ? { ...payload } : null);
    }), []);

    const friendsAvailable = useMemo(() => hasMutualFriends(viewerData), [viewerData?.followers, viewerData?.following, viewerData?.uid]);

    const statsDisplay = useMemo(() => {
        const base = hasSnapshot ? stats || { reps: 0, volume: 0, pbs: 0 } : { reps: 0, volume: 0, pbs: 0 };
        return [
            {
                key: "reps",
                label: "Total Reps",
                value: hasSnapshot ? formatWithSeparators(base.reps) : "--",
            },
            {
                key: "volume",
                label: "Lbs Lifted",
                value: hasSnapshot ? formatCompact(base.volume) : "--",
            },
            {
                key: "pbs",
                label: "PRs",
                value: hasSnapshot ? formatWithSeparators(base.pbs) : "--",
            },
        ];
    }, [hasSnapshot, stats]);

    const animateTo = useCallback((value) => {
        Animated.spring(scale, {
            toValue: value,
            useNativeDriver: true,
            speed: 18,
            bounciness: 8,
        }).start();
    }, [scale]);

    const handlePressIn = useCallback(() => animateTo(0.97), [animateTo]);
    const handlePressOut = useCallback(() => animateTo(1), [animateTo]);
    const handlePress = useCallback(() => {
        try {
            const maybeRefresh = refreshCommunityStats({ force: true });
            if (maybeRefresh && typeof maybeRefresh.catch === "function") {
                maybeRefresh.catch(() => { });
            }
        } catch { }
        if (!onPress) return;
        if (!friendsAvailable) {
            try { burstHaptic(5, 60); } catch { }
            return;
        }
        try { haptic(); } catch { }
        onPress();
    }, [onPress, friendsAvailable]);

    const interactive = typeof onPress === "function";
    const cardOpacity = friendsAvailable ? 1 : 0.55;

    return (
        <View style={styles.wrap}>
            <Pressable
                disabled={!interactive}
                android_ripple={{ color: RIPPLE_COLOR }}
                style={styles.pressable}
                accessibilityRole="button"
                accessibilityLabel="Open friends activity"
                accessibilityState={{ disabled: !interactive }}
                hitSlop={scaleSize(8)}
                onPress={handlePress}
                onPressIn={interactive ? handlePressIn : undefined}
                onPressOut={interactive ? handlePressOut : undefined}
            >
                <View style={styles.cardContainer}>
                    <Animated.View style={[styles.cardShadow, { transform: [{ scale }], opacity: cardOpacity }]}>
                        <LinearGradient
                            colors={CARD_GRADIENT}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.card}
                        >
                            <View style={styles.metaColumn}>
                                <Text style={styles.subtitle}>You and your friends' totals this week.</Text>
                                <View style={styles.subtitleActionRow}>
                                    <Ionicons
                                        name="sparkles-outline"
                                        size={scaleSize(11)}
                                        color={TEXT_PRIMARY}
                                        style={styles.subtitleTapIcon}
                                    />
                                    <Text style={styles.subtitleAction}>Tap to view</Text>
                                </View>
                            </View>
                            <View style={styles.statsRow}>
                                {statsDisplay.map((stat, idx) => (
                                    <View
                                        // eslint-disable-next-line react/no-array-index-key
                                        key={stat.key || idx}
                                        style={[
                                            styles.statCol,
                                            idx === 2 ? styles.statColCompact : styles.statColWide,
                                            idx === 1 && styles.statColMiddle,
                                            loading && !hasSnapshot && styles.statColLoading,
                                        ]}
                                    >
                                        <Text
                                            style={[styles.statValue, idx === 2 && styles.statValueCompact]}
                                            numberOfLines={1}
                                            ellipsizeMode="clip"
                                        >
                                            {stat.value}
                                        </Text>
                                        <Text
                                            style={[styles.statLabel, idx === 2 && styles.statLabelCompact]}
                                            numberOfLines={1}
                                            ellipsizeMode="tail"
                                        >
                                            {stat.label}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </LinearGradient>
                    </Animated.View>
                    {!friendsAvailable && (
                        <Animated.View pointerEvents="none" style={[styles.noticeOverlay, { transform: [{ scale }] }]}>
                            <Text style={styles.noticeBadge}>Add a friend to unlock</Text>
                        </Animated.View>
                    )}
                </View>
            </Pressable>
        </View>
    );
}

export default memo(TribeStatsCardCmp);

const CARD_RADIUS = scaleSize(24);

const styles = StyleSheet.create({
    wrap: { paddingHorizontal: scaleSize(16), marginBottom: scaleSize(6) },
    pressable: { borderRadius: CARD_RADIUS },
    cardContainer: { position: "relative" },
    cardShadow: {
        borderRadius: CARD_RADIUS,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOpacity: 0.12,
                shadowRadius: scaleSize(14),
                shadowOffset: { width: 0, height: scaleSize(6) },
            },
            android: {
                elevation: 4,
            },
        }),
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: CARD_BG,
        borderRadius: CARD_RADIUS,
        paddingVertical: scaleSize(22),
        paddingLeft: scaleSize(26),
        paddingRight: scaleSize(10),
        borderWidth: scaleSize(1),
        borderColor: CARD_BORDER,
    },
    metaColumn: {
        gap: scaleSize(2),
        maxWidth: scaleSize(110),
        alignItems: "flex-start",
        justifyContent: "center",
        // paddingRight: scaleSize(8),
        flexShrink: 1,
    },
    subtitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(10),
        color: TEXT_SECONDARY,
        letterSpacing: 0.28,
    },
    subtitleAction: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: scaleSize(10),
        color: TEXT_PRIMARY,
    },
    subtitleActionRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: scaleSize(6),
    },
    subtitleTapIcon: {
        marginTop: scaleSize(1),
    },
    statsRow: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginLeft: scaleSize(6),
        paddingRight: scaleSize(4),
    },
    statCol: {
        flexBasis: 0,
        flexGrow: 0,
        flexShrink: 1,
        minWidth: 0,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scaleSize(2),
    },
    statColWide: {
        flexGrow: 35,
    },
    statColMiddle: {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderColor: DIVIDER_COLOR,
        paddingHorizontal: scaleSize(6),
    },
    statColCompact: {
        flexGrow: 30,
        minWidth: 0,
        alignItems: "center",
        justifyContent: "center",
    },
    statColLoading: {
        opacity: 0.7,
    },
    statValue: { fontFamily: "Outfit_800ExtraBold", fontSize: scaleSize(18), color: TEXT_PRIMARY, letterSpacing: 0.24 },
    statValueCompact: { fontSize: scaleSize(18) },
    statLabel: {
        marginTop: scaleSize(2),
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(11),
        color: TEXT_SECONDARY,
        letterSpacing: 0.24,
    },
    statLabelCompact: { fontSize: scaleSize(11) },
    noticeOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: CARD_RADIUS,
    },
    noticeBadge: {
        backgroundColor: "rgba(129, 107, 101, 0.91)",
        borderColor: "rgba(255, 223, 186, 0.55)",
        borderWidth: StyleSheet.hairlineWidth,
        color: TEXT_PRIMARY,
        paddingHorizontal: scaleSize(18),
        paddingVertical: scaleSize(7),
        borderRadius: scaleSize(15),
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(12),
        letterSpacing: 0.3,
        textAlign: "center",
        overflow: 'hidden'
        // shadowColor: "#000",
        // shadowOpacity: 0.18,
        // shadowRadius: scaleSize(10),
        // shadowOffset: { width: 0, height: scaleSize(6) },
        // elevation: 6,
    },
});
