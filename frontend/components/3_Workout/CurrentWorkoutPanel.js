// components/3_Workout/FriendsActivitySheet.jsx
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Image, FlatList, Pressable, Animated } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";

/* ------------------------------ utils ------------------------------ */
const toMillis = (v) => {
    if (!v) return undefined;
    try {
        if (typeof v === "number") return v;
        if (v?.toMillis) return v.toMillis();
        const t = new Date(v).getTime();
        return Number.isFinite(t) ? t : undefined;
    } catch {
        return undefined;
    }
};
const bestTimestamp = (it) =>
    Math.max(
        toMillis(it?.created) ?? 0,
        toMillis(it?.startedAt) ?? 0,
        toMillis(it?.finishedAt) ?? 0
    );

const timeAgo = (ts) => {
    const d = typeof ts === "number" ? ts : (ts?.toMillis?.() ?? Date.now());
    const diff = Math.max(0, Date.now() - d);
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    return `${days}d ago`;
};

const toSec = (x) => {
    const n = Number(x ?? 0);
    return n > 9_999 ? Math.round(n / 1000) : Math.round(n);
};
const formatTimer = (secLike) => {
    const s = toSec(secLike);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const mmStr = String(m).padStart(2, "0");
    const ssStr = String(ss).padStart(2, "0");
    return h > 0 ? `${h}:${mmStr}:${ssStr}` : `${mmStr}:${ssStr}`;
};

const safeNum = (n, d = 0) => (Number.isFinite(Number(n)) ? Number(n) : d);
const firstName = (name = "") => {
    const str = String(name).trim();
    if (!str) return "Friend";
    const tokens = str.split(/\s+/);
    const raw = tokens[0] || str;
    return raw.replace(/[.,;:]+$/, "");
};

// Try to preview up to 2 exercise names from various shapes
const previewExercises = (item) => {
    const takeNames = (arr) =>
        (arr || [])
            .map((x) =>
                typeof x === "string"
                    ? x
                    : x?.name || x?.exercise || x?.title || null
            )
            .filter(Boolean)
            .slice(0, 2);

    if (Array.isArray(item?.exercises)) return takeNames(item.exercises);
    if (Array.isArray(item?.exerciseNames)) return (item.exerciseNames || []).slice(0, 2);
    if (Array.isArray(item?.preview)) return takeNames(item.preview);
    if (typeof item?.topExercises === "string") return item.topExercises.split(/[•,|·]/).map(s => s.trim()).filter(Boolean).slice(0, 2);
    return [];
};

/* ------------------------------ row ------------------------------ */
const FriendRow = memo(({ item, now, onJoin, onView }) => {
    const isLive = Boolean(item?.live);
    const pulse = useRef(new Animated.Value(1)).current;
    const pulseOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!isLive) return;
        const loop = Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(pulse, { toValue: 1.25, duration: 900, useNativeDriver: true }),
                    Animated.timing(pulse, { toValue: 1.0, duration: 900, useNativeDriver: true }),
                ]),
                Animated.sequence([
                    Animated.timing(pulseOpacity, { toValue: 0.55, duration: 900, useNativeDriver: true }),
                    Animated.timing(pulseOpacity, { toValue: 1.0, duration: 900, useNativeDriver: true }),
                ]),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [isLive, pulse, pulseOpacity]);

    // Determine live elapsed seconds
    let liveElapsed = undefined;
    if (isLive) {
        if (item?.timerRef && typeof item.timerRef.current !== "undefined") {
            liveElapsed = item.timerRef.current;
        } else if (typeof item?.elapsedSec !== "undefined") {
            liveElapsed = item.elapsedSec;
        } else if (typeof item?.elapsedMs !== "undefined") {
            liveElapsed = item.elapsedMs;
        } else {
            const started = toMillis(item?.startedAt) ?? toMillis(item?.created);
            if (started) liveElapsed = Math.max(0, Math.round((now - started) / 1000));
        }
    }

    const pbCount = Number.isFinite(Number(item?.PBs))
        ? Number(item.PBs)
        : (Number.isFinite(Number(item?.pbs)) ? Number(item.pbs) : null);

    // Base chips
    const chips = [
        `${safeNum(item?.exercises)} exercises`,
        `${safeNum(item?.duration)} min`,
    ];

    // More info (all optional, short + readable)
    if (Number.isFinite(Number(item?.volume))) chips.push(`${safeNum(item.volume).toLocaleString()} lb`);
    if (Number.isFinite(Number(item?.reps))) chips.push(`${safeNum(item.reps)} reps`);
    if (Number.isFinite(Number(item?.calories))) chips.push(`${safeNum(item.calories)} kcal`);
    if (pbCount != null) chips.push(`${pbCount} PB${pbCount === 1 ? "" : "s"}`);
    if (item?.templateName) chips.push(item.templateName);
    if (item?.gymName) chips.push(`@ ${item.gymName}`);
    if (Number.isFinite(Number(item?.streakDays))) chips.push(`🔥 ${safeNum(item.streakDays)}d`);
    if (item?.tribeName) chips.push(`#${item.tribeName}`);

    const preview = previewExercises(item);
    const previewText = preview.length ? `• ${preview.join(" · ")}` : "";

    const handlePressCard = () => {
        // Finished → onView; Live → quick-join
        isLive ? onJoin?.(item) : onView?.(item);
    };

    return (
        <Pressable
            onPress={handlePressCard}
            style={({ pressed }) => [
                styles.row,
                isLive && styles.rowLive,
                pressed && styles.rowPressed,
            ]}
            android_ripple={{ color: "rgba(2,6,23,0.05)" }}
        >
            <View style={[styles.avatarWrap, isLive && styles.avatarWrapLive]}>
                <Image source={{ uri: item.pfp }} style={styles.avatar} />
            </View>

            <View style={styles.rowCenter}>
                <View style={styles.topLine}>
                    <Text style={styles.name} numberOfLines={1}>{firstName(item?.name)}</Text>

                    {isLive && (
                        <View style={styles.livePill}>
                            <Animated.View style={[styles.liveDot, { transform: [{ scale: pulse }], opacity: pulseOpacity }]} />
                            <Text style={styles.liveText}>{formatTimer(liveElapsed)}</Text>
                        </View>
                    )}
                </View>

                {/* primary chips */}
                <View style={styles.metaRow}>
                    {chips.slice(0, 5).map((txt, idx) => (
                        <View key={`${txt}-${idx}`} style={styles.chip}>
                            <Text style={styles.chipText} numberOfLines={1}>{txt}</Text>
                        </View>
                    ))}
                </View>

                {/* tiny exercise peek */}
                {previewText ? (
                    <Text style={styles.preview} numberOfLines={1}>{previewText}</Text>
                ) : null}

                {/* timestamp */}
                <Text style={styles.metaTime} numberOfLines={1}>
                    {isLive ? "Live now" : "Finished"} • {timeAgo(item.created)}
                </Text>
            </View>

            {/* keep explicit Join on live */}
            {isLive && (
                <Pressable
                    style={[styles.cta, styles.joinBtn]}
                    onPress={() => onJoin?.(item)}
                    android_ripple={{ color: "rgba(255,255,255,0.15)" }}
                >
                    <Text style={[styles.ctaText, styles.joinText]}>Join</Text>
                </Pressable>
            )}
        </Pressable>
    );
});

/* ------------------------------ sheet ------------------------------ */
const FriendsActivitySheet = ({
    visible,
    openToggle,
    items = [],
    onClose,
    onJoin,
    onView,
}) => {
    const bottomSheetRef = useRef(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const snapPoints = useMemo(() => ["90%"], []);

    // Sort newest → oldest
    const sortedItems = useMemo(() => {
        return [...(items || [])].sort((a, b) => bestTimestamp(b) - bestTimestamp(a));
    }, [items]);

    // global "now" tick only if any live
    const hasLive = useMemo(() => sortedItems?.some((it) => it?.live), [sortedItems]);
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!hasLive) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [hasLive]);

    // Open/close by explicit visible
    useEffect(() => {
        if (!bottomSheetRef.current || typeof visible === "undefined") return;
        if (visible) {
            bottomSheetRef.current.expand();
            setIsExpanded(true);
        } else {
            bottomSheetRef.current.close();
        }
    }, [visible]);

    // Expand on ANY toggle flip
    useEffect(() => {
        if (!bottomSheetRef.current || typeof openToggle === "undefined") return;
        bottomSheetRef.current.expand();
        setIsExpanded(true);
    }, [openToggle]);

    const renderBackdrop = useCallback(
        (props) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.6}
            />
        ),
        []
    );

    const handleClose = useCallback(() => {
        setIsExpanded(false);
        onClose?.();
    }, [onClose]);

    const keyExtractor = useCallback((it, i) => it.id ?? it.uid ?? `f-${i}`, []);
    const renderItem = useCallback(
        ({ item }) => <FriendRow item={item} now={now} onJoin={onJoin} onView={onView} />,
        [now, onJoin, onView]
    );

    const liveCount = useMemo(() => sortedItems.filter((x) => x?.live).length, [sortedItems]);

    return (
        <View style={styles.outer} pointerEvents="box-none">
            <BottomSheet
                ref={bottomSheetRef}
                index={-1}
                snapPoints={snapPoints}
                enablePanDownToClose
                backdropComponent={renderBackdrop}
                handleStyle={styles.hiddenHandle}
                backgroundStyle={styles.sheetBg}
                onClose={handleClose}
            >
                {/* Grabber */}
                <View style={styles.handle} />

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Friends training</Text>
                    <Text style={styles.headerSub}>
                        {sortedItems.length} updates • {liveCount} live
                    </Text>
                </View>

                {/* List */}
                <FlatList
                    data={sortedItems}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    contentContainerStyle={styles.listContent}
                    ItemSeparatorComponent={() => <View style={styles.sep} />}
                    showsVerticalScrollIndicator={false}
                />
            </BottomSheet>
        </View>
    );
};

/* ------------------------------ styles ------------------------------ */
const styles = StyleSheet.create({
    outer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
    hiddenHandle: { display: "none" },
    sheetBg: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    handle: {
        alignSelf: "center",
        width: 46,
        height: 5,
        borderRadius: 999,
        backgroundColor: "#E2E8F0",
        marginTop: 8,
        marginBottom: 6,
    },

    header: { paddingHorizontal: 16, paddingVertical: 8 },
    headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 18, color: "#0F172A" },
    headerSub: { marginTop: 2, fontFamily: "Outfit_500Medium", fontSize: 12.5, color: "#64748B" },

    listContent: { paddingHorizontal: 12, paddingBottom: 24 },
    sep: { height: 10 },

    row: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(2,6,23,0.06)",
    },
    rowPressed: {
        transform: [{ scale: 0.995 }],
        backgroundColor: "#F8FAFC",
    },
    rowLive: {
        borderColor: "rgba(244,63,94,0.25)",
        backgroundColor: "#FFF1F2",
    },

    avatarWrap: { marginRight: 12, borderRadius: 24, padding: 2 },
    avatarWrapLive: { backgroundColor: "rgba(244,63,94,0.10)" },
    avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#E2E8F0" },

    rowCenter: { flex: 1 },

    topLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    name: { flex: 1, fontFamily: "Outfit_700Bold", fontSize: 14.5, color: "#0F172A" },

    /* live pill */
    livePill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#FFFFFF",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(244,63,94,0.25)",
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 999,
    },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444" },
    liveText: { fontFamily: "Outfit_700Bold", fontSize: 12.5, color: "#0F172A", letterSpacing: 0.2 },

    /* chips */
    metaRow: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
    chip: {
        backgroundColor: "#F8FAFC",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(100,116,139,0.15)",
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 999,
    },
    chipText: { fontFamily: "Outfit_600SemiBold", fontSize: 11.5, color: "#0F172A" },

    /* tiny preview line */
    preview: { marginTop: 4, fontFamily: "Outfit_500Medium", fontSize: 12, color: "#334155" },

    metaTime: { marginTop: 4, fontFamily: "Outfit_500Medium", fontSize: 12.5, color: "#64748B" },

    cta: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        marginLeft: 10,
    },
    joinBtn: { backgroundColor: "#0F172A", borderColor: "transparent" },
    joinText: { color: "#fff" },
    ctaText: { fontFamily: "Outfit_700Bold", fontSize: 12.5 },
});

export default memo(FriendsActivitySheet);
