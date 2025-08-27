// components/1_Feed/Pulse/ActivityChips.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, View, Dimensions, Platform, TouchableOpacity } from "react-native";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { Weight } from "iconsax-react-native";
import FastImage from "react-native-fast-image";

import { db } from "../../../../firebase.config";
import scaleSize from "../../../helper/scaleSize";
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

/* ---------- two types only ---------- */
const TYPE_STYLES = {
    workout: { badgeBg: "#bbd3ffff" },   // blue
    leaderboard: { badgeBg: "#FDE68A", icon: "podium" },   // gold/yellow
};
const styleFor = (t) => TYPE_STYLES[t] ?? TYPE_STYLES.workout;

/* ---------- time + text builders ---------- */
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
const ordinal = (n) => {
    const x = Number(n);
    if (!Number.isFinite(x)) return "";
    const s = ["th", "st", "nd", "rd"], v = x % 100;
    const suf = s[(v - 20) % 10] || s[v] || s[0];
    return `${x}${suf}`;
};

const sentenceFromEvent = (ev) => {
    if (ev?.type === "workout") {
        const tpl =
            ev?.templateName ||
            ev?.template ||
            ev?.workoutName ||
            ev?.detail ||
            "";
        const name = String(tpl).trim();
        return name ? `Hit ${name}` : "Worked out";
    }
}

export default function ActivityChips({
    following = [...(global?.userData?.following || []), global?.userData].filter(Boolean),
    navigation,
    onPressChip,
    maxUsers = 24,
    fallbackItems = [],
    perUserLimit = 5, // <-- NEW: how many pulses per user to show
}) {
    // uid -> Pulse[]
    const [map, setMap] = useState(new Map());
    const unsubs = useRef([]);

    useEffect(() => {
        unsubs.current.forEach((u) => u && u());
        unsubs.current = [];

        const ids = normalizeUids(following).slice(0, maxUsers);
        if (ids.length === 0) {
            setMap(new Map());
            return;
        }

        const subs = ids.map((uid) => {
            try {
                const qy = query(
                    collection(db, "users", uid, "pulse"),
                    orderBy("ts", "desc"),
                    limit(perUserLimit) // <-- CHANGED: grab multiple
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
        // flatten all users' pulses
        const fromLive = Array.from(map.values()).flat();

        // filter to the two supported types
        const filtered = fromLive.filter((e) => e?.type === "workout" || e?.type === "leaderboard");

        // include fallback if nothing found
        const base = filtered.length === 0 && Array.isArray(fallbackItems) && fallbackItems.length
            ? fallbackItems.filter((e) => e?.type === "workout" || e?.type === "leaderboard")
            : filtered;

        // sort newest first
        return base.sort((a, b) => toMillis(b.ts) - toMillis(a.ts));
    }, [map, fallbackItems]);

    if (items.length === 0) return null;

    return (
        <View style={styles.wrap}>
            <FlatList
                data={items}
                keyExtractor={(it, i) => String(it?.id ? `${it.uid}:${it.id}` : `${it?.uid ?? "f"}:${i}`)} // <-- stable keys
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

/* ---------- Chip (auto-width based on primary sentence; fixed height) ---------- */
const AVATAR = scaleSize(35);
const BADGE = ss(20);

const H_PAD = ss(10);
const GAP_AVATAR_TEXT = ss(8);
const COPY_LEFT_MARGIN = 3;
const EXTRA_FUDGE = 2;
const CHEVRON_W = ss(14);
const CHEVRON_GAP = ss(8);

const MAX_CHIP_W = Math.round(W * 0.92);
const MIN_CHIP_W = Math.max(140, AVATAR + 2 * H_PAD + CHEVRON_W + CHEVRON_GAP + 40);

const CHIP_H = AVATAR + ss(20);

function Chip({ ev, navigation, onPressChip }) {
    const pfpUri = usePfp(ev?.uid, ev?.pfpVersion ?? 0);
    const tint = styleFor(ev?.type);
    const timeMs = toMillis(ev?.ts);

    const [chipW, setChipW] = useState(null);

    const primary = sentenceFromEvent(ev);
    const rel = timeMs ? relTime(timeMs) : "";

    // emphasize template name for workout events
    const tplName =
        ev?.type === "workout"
            ? (ev?.templateName || ev?.template || ev?.workoutName || ev?.detail || "").trim()
            : "";


    const onPrimaryTextLayout = (e) => {
        const w = e?.nativeEvent?.lines?.[0]?.width;
        if (!w) return;
        const calc =
            2 * H_PAD +
            AVATAR + GAP_AVATAR_TEXT +
            COPY_LEFT_MARGIN +
            w + EXTRA_FUDGE +
            CHEVRON_W + CHEVRON_GAP;
        const finalW = Math.max(MIN_CHIP_W, Math.min(MAX_CHIP_W, Math.round(calc)));
        if (chipW !== finalW) setChipW(finalW);
    };

    const handlePress = () => {
        if (onPressChip) return onPressChip(ev);
        if (ev?.workoutId) {
            navigation?.navigate?.("ViewWorkout", { workoutId: ev.workoutId, uid: ev.uid });
        } else {
            const user = { uid: ev?.uid, name: ev?.name, handle: ev?.handle };
            navigation?.navigate?.(ev?.uid === global?.userData?.uid ? "Profile" : "ViewProfile", { user });
        }
    };

    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={handlePress}
            style={[styles.chip, { height: CHIP_H }, chipW ? { width: chipW } : null]}
        >
            {/* Left: avatar with colored ring + badge */}
            <View style={styles.avatarWrap}>
                <View style={[styles.pfpMask, { borderColor: tint.badgeBg, borderWidth: 2.5 }]}>
                    {pfpUri ? (
                        <FastImage
                            source={{ uri: pfpUri, priority: FastImage.priority.normal, cache: FastImage.cacheControl.immutable }}
                            style={styles.pfp}
                            resizeMode={FastImage.resizeMode.cover}
                        />
                    ) : (
                        <View style={[styles.pfp, styles.pfp_placeholder]} />
                    )}
                </View>

                <View style={[styles.badge, { backgroundColor: tint.badgeBg }]}>
                    {ev?.type === "workout" ? (
                        <Weight size={ss(11.5)} variant="Bold" color="rgba(0, 0, 0, 0.84)" />
                    ) : (
                        <Icon name="podium" size={ss(12)} color="#0F172A" />
                    )}
                </View>
            </View>

            {/* Right: copy */}
            <View style={styles.copyCol}>
                <Text numberOfLines={1} onTextLayout={onPrimaryTextLayout} style={styles.primary}>
                    {ev?.type === "workout" && tplName
                        ? <>{"Hit "}<Text style={styles.primaryEmphasis}>{tplName}</Text></>
                        : primary}
                </Text>

                {!!rel && (
                    <Text numberOfLines={1} style={styles.secondary}>
                        <Text style={{ color: tint.badgeBg }}>●</Text> {rel}
                    </Text>
                )}
            </View>

            {/* Chevron */}
            <Icon name="chevron-right" size={ss(16)} color="#93A0B2" style={styles.trailing} />
        </TouchableOpacity>
    );
}

/* ---------- styles (unchanged) ---------- */
const styles = StyleSheet.create({
    wrap: {
        backgroundColor: "#F7FAFF",
        paddingBottom: 10,
        paddingTop: 6,
        overflow: "visible",
    },
    list: { overflow: "visible" },
    listContent: {
        paddingLeft: 14,
        paddingRight: 8,
        columnGap: 6,
        overflow: "visible",
    },

    chip: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: ss(10),
        paddingHorizontal: ss(10),
        borderRadius: ss(16),
        backgroundColor: "#FFFFFF",
        ...Platform.select({
            ios: { shadowColor: "#0F172A", shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 2, height: 6 } },
            android: { elevation: 4 },
        }),
    },

    avatarWrap: { width: AVATAR, height: AVATAR, marginRight: GAP_AVATAR_TEXT, position: "relative", overflow: "visible" },
    pfpMask: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, overflow: "hidden", backgroundColor: "#EDF1F7" },
    pfp: { width: "100%", height: "100%" },
    pfp_placeholder: { backgroundColor: "#E6EBF2" },

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

    copyCol: { minWidth: 0, marginLeft: 3 },
    primary: {
        fontFamily: "Nunito_700Bold",
        fontSize: 12.1,
        color: "#0F172A",
        alignSelf: "flex-end",
    },

    primaryEmphasis: {
        color: "#0499FE",
        fontFamily: "Nunito_800ExtraBold",
    },

    secondary: {
        marginTop: ss(2),
        fontFamily: "Nunito_700Bold",
        fontSize: ss(11),
        color: "#6B7280",
        alignSelf: "flex-end",
    },

    trailing: { marginLeft: ss(8) },
});
