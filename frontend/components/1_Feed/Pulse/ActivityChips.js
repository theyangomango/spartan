// components/1_Feed/Pulse/ActivityChips.js
// Unified chips with right-aligned time (own line) + accent dot matching badge color.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    FlatList,
    StyleSheet,
    Text,
    View,
    Dimensions,
    Platform,
    TouchableOpacity,
} from "react-native";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { Weight } from "iconsax-react-native";
import FastImage from "react-native-fast-image";
import theme from "../../../theme/mfpDark";

import { db } from "../../../../firebase.config";
import { usePfp } from "../../../helper/usePFPs";

/* ---------- sizing ---------- */
const { width: W, height: H } = Dimensions.get("window");
const scale = H / 844; // iPhone 13 baseline
const ss = (n) => Math.round(n * scale);

/* ---------- helpers ---------- */
const normalizeUids = (input) =>
    (Array.isArray(input) ? input : [])
        .map((x) => (typeof x === "string" ? x : x?.uid ?? x?.id ?? x?.userId ?? null))
        .filter((u) => typeof u === "string" && u.trim().length > 0);

const toMillis = (t) => {
    if (typeof t === "number" && Number.isFinite(t)) return t;
    const asTs = t && typeof t.toMillis === "function" ? t.toMillis() : undefined;
    if (typeof asTs === "number" && Number.isFinite(asTs)) return asTs;
    const n = Number(t);
    return Number.isFinite(n) ? n : 0;
};

const TYPE_STYLES = {
    workout: { badgeBg: "#2D9EFF", iconColor: "#fff" },
    leaderboard: { badgeBg: "#FFB020", iconColor: "#fff", icon: "podium" },
};
const styleFor = (t) => TYPE_STYLES[t] ?? TYPE_STYLES.workout;

const relTime = (ms) => {
    const d = Date.now() - ms;
    const m = Math.floor(d / 60000);
    if (m < 1) return "now";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const days = Math.floor(h / 24);
    return `${days}d`;
};

// Build display title + whether to emphasize
const buildPrimary = (ev) => {
    if (ev?.type === "workout") {
        const raw = ev?.templateName || ev?.template || ev?.workoutName || ev?.detail || "";
        const name = String(raw).trim();
        if (name) return { text: name, emphasize: true };
        return { text: "Workout", emphasize: false };
    }
    return { text: "Leaderboard", emphasize: false };
};

export default function ActivityChips({
    // Only people the user follows; exclude self
    following = (global?.userData?.following || []).filter(Boolean),
    navigation,
    onPressChip,
    maxUsers = 24,
    fallbackItems = [],
    perUserLimit = 5,
}) {
    const [map, setMap] = useState(new Map());
    const unsubs = useRef([]);

    useEffect(() => {
        unsubs.current.forEach((u) => u && u());
        unsubs.current = [];

        // Normalize and ensure we never include the current user's UID
        const selfUid = String(global?.userData?.uid || "");
        const ids = normalizeUids(following)
            .filter((uid) => String(uid) !== selfUid)
            .slice(0, maxUsers);
        if (ids.length === 0) {
            setMap(new Map());
            return;
        }

        const subs = ids.map((uid) => {
            try {
                const qy = query(
                    collection(db, "users", uid, "pulse"),
                    orderBy("ts", "desc"),
                    limit(perUserLimit)
                );
                return onSnapshot(
                    qy,
                    (snap) => {
                        setMap((prev) => {
                            const m = new Map(prev);
                            const rows = snap.docs.map((d) => ({ id: d.id, uid, ...d.data() }));
                            if (rows.length) m.set(uid, rows);
                            else m.delete(uid);
                            return m;
                        });
                    },
                    () => { }
                );
            } catch {
                return null;
            }
        });

        unsubs.current = subs.filter(Boolean);
        return () => unsubs.current.forEach((u) => u && u());
    }, [JSON.stringify(following), maxUsers, perUserLimit]);

    const items = useMemo(() => {
        const selfUid = String(global?.userData?.uid || "");
        const fromLive = Array.from(map.values()).flat();
        // Only show followed users' pulses (exclude self) and supported types
        const filtered = fromLive.filter(
            (e) => (e?.type === "workout" || e?.type === "leaderboard") && String(e?.uid || "") !== selfUid
        );
        const base =
            filtered.length === 0 && Array.isArray(fallbackItems) && fallbackItems.length
                ? fallbackItems.filter(
                      (e) => (e?.type === "workout" || e?.type === "leaderboard") && String(e?.uid || "") !== selfUid
                  )
                : filtered;
        return base.sort((a, b) => toMillis(b.ts) - toMillis(a.ts));
    }, [map, fallbackItems]);

    if (items.length === 0) return null;

    return (
        <View style={styles.wrap}>
            <FlatList
                data={items}
                keyExtractor={(it, i) =>
                    String(it?.id ? `${it.uid}:${it.id}` : `${it?.uid ?? "f"}:${i}`)
                }
                horizontal
                showsHorizontalScrollIndicator={false}
                removeClippedSubviews={false}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <Chip ev={item} navigation={navigation} onPressChip={onPressChip} />
                )}
            />
        </View>
    );
}

/* ---------- Single Chip ---------- */
const AVATAR = ss(38);
const BADGE = ss(21);
const CHIP_H = AVATAR + ss(28);

function Chip({ ev, navigation, onPressChip }) {
    const tint = styleFor(ev?.type);
    const timeMs = toMillis(ev?.ts);
    const rel = timeMs ? relTime(timeMs) : "";

    const pfpHookUri = usePfp(ev?.uid, ev?.pfpVersion ?? ev?.version ?? 0);
    const pfpUri = pfpHookUri || ev?.pfpUrl || ev?.pfp;

    const { text, emphasize } = buildPrimary(ev);

    const handlePress = () => {
        if (onPressChip) return onPressChip(ev);

        // If this chip represents a workout event, jump to the Workout tab
        // and request the FriendsActivitySheet to open.
        if (ev?.type === "workout") {
            try {
                // Switch to the Workout tab directly (no stack push / no slide)
                const params = {
                    openFriends: true,
                    focusFriendUid: String(ev?.uid || ''),
                    focusWorkoutWid: String(ev?.workoutID || ''),
                    _t: Date.now(),
                };
                navigation?.navigate?.('Workout', params);
                return;
            } catch {}
        }

        // Otherwise, default to profile navigation
        const user = { uid: ev?.uid, name: ev?.name, handle: ev?.handle };
        navigation?.navigate?.(
            ev?.uid === global?.userData?.uid ? "Profile" : "ViewProfile",
            { user }
        );
    };

    return (
        <TouchableOpacity
            activeOpacity={0.88}
            onPress={handlePress}
            style={[styles.chip, { height: CHIP_H }]}
            hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
        >
            {/* Avatar + badge */}
            <View style={styles.avatarWrap}>
                <View style={[styles.pfpMask, { borderColor: "#DCE8FF", borderWidth: 2.5 }]}>
                    {pfpUri ? (
                        <FastImage
                            source={{
                                uri: pfpUri,
                                priority: FastImage.priority.normal,
                                cache: FastImage.cacheControl.immutable,
                            }}
                            style={styles.pfp}
                            resizeMode={FastImage.resizeMode.cover}
                        />
                    ) : (
                        <View style={[styles.pfp, styles.pfp_placeholder]} />
                    )}
                </View>

                <View
                    style={[
                        styles.badge,
                        {
                            backgroundColor: tint.badgeBg,
                            borderColor: "#FFFFFF",
                            borderWidth: 2,
                        },
                    ]}
                >
                    {ev?.type === "workout" ? (
                        <Weight size={ss(10.5)} variant="Bold" color={tint.iconColor} />
                    ) : (
                        <Icon name="podium" size={ss(12)} color={tint.iconColor} />
                    )}
                </View>
            </View>

            {/* Copy: title (left) + time row (own line, right-aligned with accent dot) */}
            <View style={styles.copyCol}>
                {emphasize ? (
                    <Text numberOfLines={1} style={styles.primaryUnified}>
                        <Text style={styles.primaryEmphasis}>{text}</Text>
                    </Text>
                ) : (
                    <Text numberOfLines={1} style={styles.primaryUnified}>
                        {text}
                    </Text>
                )}

                {!!rel && (
                    <View style={styles.timeRowRight}>
                        <View style={[styles.timeDot, { backgroundColor: tint.badgeBg }]} />
                        <Text numberOfLines={1} style={styles.timeText}>
                            {rel}
                        </Text>
                    </View>
                )}
            </View>

            {/* Prominent chevron */}
            <View style={styles.chevWrap}>
                <Icon name="chevron-right" size={ss(18)} color="#E5E7EB" />
            </View>
        </TouchableOpacity>
    );
}

/* ---------- styles ---------- */
const styles = StyleSheet.create({
    // Elevated to ensure it sits above post overlays when used as sticky header
    // Dark background to match feed container
    wrap: { backgroundColor: theme.bg, paddingBottom: 10, paddingTop: 8, marginTop: -6, zIndex: 100, elevation: 7 },
    list: { overflow: "visible" },
    listContent: { paddingLeft: 14, paddingRight: 8, columnGap: 6 },

    chip: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: ss(10),
        paddingLeft: ss(12),
        paddingRight: ss(10),
        borderRadius: ss(16),
        backgroundColor: theme.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOpacity: 0.18,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
            },
            android: { elevation: 3 },
        }),
    },

    avatarWrap: {
        width: AVATAR,
        height: AVATAR,
        marginRight: ss(9),
        position: "relative",
        overflow: "visible",
    },
    pfpMask: {
        width: AVATAR,
        height: AVATAR,
        borderRadius: AVATAR / 2.3,
        overflow: "hidden",
        backgroundColor: "#1E2128",
    },
    pfp: { width: "100%", height: "100%" },
    pfp_placeholder: { backgroundColor: "#2E323C" },

    badge: {
        position: "absolute",
        bottom: -4,
        right: -6,
        width: BADGE,
        height: BADGE,
        borderRadius: BADGE / 2,
        alignItems: "center",
        justifyContent: "center",
        ...Platform.select({
            ios: { shadowColor: "#0F172A", shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
            android: { elevation: 3 },
        }),
    },

    copyCol: {
        minWidth: 0,
        flex: 1,
        paddingRight: ss(10),
    },
    primaryUnified: {
        fontFamily: "Outfit_700Bold",
        fontSize: 13.5,
        color: "#E5E7EB",
        letterSpacing: 0.2,
    },
    primaryEmphasis: { color: "#0499FE", fontFamily: "Outfit_800ExtraBold" },

    // Time on its own line, right-aligned + accent dot
    timeRowRight: {
        marginTop: ss(2),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        alignSelf: "stretch",
        gap: 6,
    },
    timeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    timeText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 11.5,
        color: "#A1A7B3",
    },

    // Chevron
    chevWrap: {
        width: ss(26),
        height: ss(26),
        borderRadius: ss(13),
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#252733",
        marginLeft: ss(2),
    },
});
