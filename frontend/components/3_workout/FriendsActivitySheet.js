// components/3_Workout/FriendsActivitySheet.jsx
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    Image,
    SectionList,
    Animated,
    Dimensions,
} from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { Clock } from "iconsax-react-native";
import { MaterialCommunityIcons, FontAwesome6 } from "@expo/vector-icons";
import { usePfp } from "../../helper/usePFPs";

/* ------------------------------ scale & theme ------------------------------ */
const { height: screenHeight } = Dimensions.get("window");
const scale = screenHeight / 844;
const s = (n) => Math.round(n * scale);

const COLORS = {
    bg: "#F6FAFF",
    card: "#FFFFFF",
    text: "#0F172A",
    subtext: "#64748B",
    hairline: "rgba(2, 6, 23, 0.06)",
    blue: "#2D9EFF",
    iconBg: "#EEF2F7",
    statBg: "#F7FAFF",
    statBorder: "rgba(100,116,139,0.10)",
};

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

const toSec = (x) => {
    const n = Number(x ?? 0);
    return n > 9_999 ? Math.round(n / 1000) : Math.round(n);
};

const formatTimer = (value) => {
    if (value == null) return "00:00";
    if (typeof value === "string") return value;
    const sec = Number(value) || 0;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

const formatNumber = (n) => {
    if (n === undefined || n === null) return "0";
    try {
        return Number(n).toLocaleString();
    } catch {
        return String(n);
    }
};

const firstName = (name = "") => {
    const str = String(name).trim();
    if (!str) return "Friend";
    const raw = (str.split(/\s+/)[0] || str).replace(/[.,;:]+$/, "");
    return raw;
};

const initials = (name = "") => {
    const parts = `${name}`.trim().split(/\s+/);
    const a = parts[0]?.[0] ?? "";
    const b = parts[1]?.[0] ?? "";
    return (a + b).toUpperCase() || "F";
};

const templateName = (item) =>
    item?.templateName ??
    item?.template?.name ??
    item?.template_title ??
    item?.title ??
    "Workout";

const handleText = (item) => {
    const raw =
        item?.handle ??
        item?.username ??
        item?.userName ??
        firstName(item?.name)?.toLowerCase();
    if (!raw) return "Friend";
    const sRaw = String(raw);
    return sRaw.startsWith("@") ? sRaw : `@${sRaw}`;
};

const dateLabel = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    const nowYear = new Date().getFullYear();
    const opts =
        d.getFullYear() === nowYear
            ? { month: "short", day: "numeric" }
            : { month: "short", day: "numeric", year: "2-digit" };
    return d.toLocaleDateString(undefined, opts);
};

/* ------------------------------ time grouping ------------------------------ */
const startOfToday = (now = new Date()) => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
};
const startOfYesterday = (now = new Date()) => {
    const d = startOfToday(now);
    d.setDate(d.getDate() - 1);
    return d;
};
const startOfWeekSunday = (now = new Date()) => {
    const d = startOfToday(now);
    d.setDate(d.getDate() - d.getDay());
    return d;
};
const startOfLastWeek = (now = new Date()) => {
    const d = startOfWeekSunday(now);
    d.setDate(d.getDate() - 7);
    return d;
};
const minusMonths = (now, months) => {
    const d = startOfToday(now);
    d.setMonth(d.getMonth() - months);
    return d;
};
const minusYears = (now, years) => {
    const d = startOfToday(now);
    d.setFullYear(d.getFullYear() - years);
    return d;
};

// Build ordered SectionList sections; keep live items in a dedicated top section
const groupByTime = (items, nowMs) => {
    const now = new Date(nowMs || Date.now());
    const T0 = startOfToday(now).getTime();
    const Y0 = startOfYesterday(now).getTime();
    const W0 = startOfWeekSunday(now).getTime();
    const LW0 = startOfLastWeek(now).getTime();
    const M1 = minusMonths(now, 1).getTime();
    const M3 = minusMonths(now, 3).getTime();
    const Y1 = minusYears(now, 1).getTime();

    const live = [];
    const rest = [];
    for (const it of items) (it?.live ? live : rest).push(it);

    const buckets = {
        "Today": [],
        "Yesterday": [],
        "This Week": [],
        "Last Week": [],
        "Last Month": [],
        "Last Three Months": [],
        "Last Year": [],
        "Older": [],
    };

    for (const it of rest) {
        const ts = bestTimestamp(it);
        if (!ts) {
            buckets["Older"].push(it);
            continue;
        }
        if (ts >= T0) buckets["Today"].push(it);
        else if (ts >= Y0) buckets["Yesterday"].push(it);
        else if (ts >= W0) buckets["This Week"].push(it);
        else if (ts >= LW0) buckets["Last Week"].push(it);
        else if (ts >= M1) buckets["Last Month"].push(it);
        else if (ts >= M3) buckets["Last Three Months"].push(it);
        else if (ts >= Y1) buckets["Last Year"].push(it);
        else buckets["Older"].push(it);
    }

    const ordered = [];
    if (live.length) ordered.push({ title: "Live Now", data: live });
    const order = [
        "Today",
        "Yesterday",
        "This Week",
        "Last Week",
        "Last Month",
        "Last Three Months",
        "Last Year",
        "Older",
    ];
    for (const key of order) {
        const data = buckets[key];
        if (data.length) ordered.push({ title: key, data });
    }
    return ordered;
};

/* ------------------------------ Row ------------------------------ */
const FriendPanel = memo(({ item, now, onJoin, onView }) => {

    const isLive = !!item?.live;

    // live elapsed
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

    // pulse animation
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
                    Animated.timing(pulseOpacity, { toValue: 0.6, duration: 900, useNativeDriver: true }),
                    Animated.timing(pulseOpacity, { toValue: 1.0, duration: 900, useNativeDriver: true }),
                ]),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [isLive, pulse, pulseOpacity]);

    // stats
    const durationSec = isLive
        ? toSec(liveElapsed)
        : Math.max(0, Math.round(Number(item?.duration || 0) * 60));
    const volume = item?.volume ?? 0;
    const pbs = Number(item?.PBs ?? item?.pbs ?? 0);

    const onPrimary = () => (isLive ? onJoin?.(item) : onView?.(item));

    // ✅ Use PFP cache hook with fallback
    const cachedPfp = usePfp(item?.uid);
    const pfpUri =
        cachedPfp ||
        item?.pfp ||
        item?.pfpUrl ||
        item?.photoURL ||
        item?.photo ||
        item?.avatar;

    const when = dateLabel(bestTimestamp(item));

    return (
        <RNBounceable style={styles.panel} onPress={onPrimary} activeScale={0.965}>
            {/* Header */}
            <View style={styles.headerRow}>
                {/* PFP */}
                {pfpUri ? (
                    <Image source={{ uri: pfpUri }} style={styles.pfp} />
                ) : (
                    <View style={[styles.pfp, styles.pfpFallback]}>
                        <Text style={styles.pfpInitials}>{initials(item?.name)}</Text>
                    </View>
                )}

                {/* Title stack */}
                <View style={{ flex: 1 }}>
                    <Text style={styles.templateTitle} numberOfLines={1} ellipsizeMode="tail">
                        {templateName(item)}
                    </Text>
                    <Text style={styles.handleText}>
                        {handleText(item)}
                        {when ? ` · ${when}` : ""}
                    </Text>
                </View>

                {/* Right */}
                <View style={styles.rightAccessories}>
                    {isLive && (
                        <View style={styles.livePill}>
                            <Animated.View
                                style={[styles.liveDot, { transform: [{ scale: pulse }], opacity: pulseOpacity }]}
                            />
                            <Clock color={COLORS.text} size={s(14)} variant="Bold" />
                            <Text style={styles.liveText}>{formatTimer(durationSec)}</Text>
                        </View>
                    )}
                    <MaterialCommunityIcons name="chevron-right" size={s(22)} color="rgba(15,23,42,0.45)" />
                </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Stat chips */}
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <View style={styles.statIconWrap}>
                        <Clock color={COLORS.text} size={s(13)} variant="Bold" />
                    </View>
                    <Text style={styles.statLabel}>Duration</Text>
                    <Text style={styles.statValue}>{formatTimer(durationSec)}</Text>
                </View>

                <View style={styles.statCard}>
                    <View style={styles.statIconWrap}>
                        <MaterialCommunityIcons name="weight-lifter" size={s(13)} color={COLORS.text} />
                    </View>
                    <Text style={styles.statLabel}>Volume</Text>
                    <Text style={styles.statValue}>{formatNumber(volume)} lb</Text>
                </View>

                <View style={styles.statCard}>
                    <View style={styles.statIconWrap}>
                        <FontAwesome6 name="trophy" size={s(11)} color={COLORS.text} />
                    </View>
                    <Text style={styles.statLabel}>PBs</Text>
                    <Text style={styles.statValue}>{formatNumber(pbs)}</Text>
                </View>
            </View>
        </RNBounceable>
    );
});

/* ------------------------------ Sheet ------------------------------ */
const FriendsActivitySheet = ({
    visible,
    openToggle,
    items = [],
    onClose,
    onJoin,
    onView,
}) => {
    const bottomSheetRef = useRef(null);
    const cacheRef = useRef([]); // keep last non-empty list
    const openToggleDidMount = useRef(false);

    useEffect(() => {
        if (Array.isArray(items) && items.length) cacheRef.current = items;
    }, [items]);

    const displayItems = items.length ? items : cacheRef.current;
    const sortedItems = useMemo(
        () => [...(displayItems || [])].sort((a, b) => bestTimestamp(b) - bestTimestamp(a)),
        [displayItems]
    );

    const hasLive = useMemo(() => sortedItems?.some((it) => it?.live), [sortedItems]);
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!hasLive) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [hasLive]);

    useEffect(() => {
        if (typeof visible === "undefined") return;
        const node = bottomSheetRef.current;
        if (!node) return;
        if (visible) requestAnimationFrame(() => node?.expand());
        else node?.close();
    }, [visible]);

    useEffect(() => {
        // ignore the very first render (prevents auto-expand on app open)
        if (!openToggleDidMount.current) {
            openToggleDidMount.current = true;
            return;
        }
        // only expand on toggle if the sheet is already meant to be visible
        if (!visible) return;

        const node = bottomSheetRef.current;
        if (!node) return;
        requestAnimationFrame(() => node?.expand());
    }, [openToggle, visible]);

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

    const sections = useMemo(() => groupByTime(sortedItems, now), [sortedItems, now]);

    const keyExtractor = useCallback((it, i) => it.id ?? it.uid ?? `f-${i}`, []);
    const renderItem = useCallback(
        ({ item }) => <FriendPanel item={item} now={now} onJoin={onJoin} onView={onView} />,
        [now, onJoin, onView]
    );

    const renderSectionHeader = useCallback(({ section }) => {
        return (
            <View style={styles.sectionHeaderWrap}>
                <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
        );
    }, []);

    const liveCount = useMemo(() => sortedItems.filter((x) => x?.live).length, [sortedItems]);

    return (
        <View style={styles.outer} pointerEvents="box-none">
            <BottomSheet
                ref={bottomSheetRef}
                index={-1}
                snapPoints={["90%"]}
                enablePanDownToClose
                backdropComponent={renderBackdrop}
                handleStyle={styles.hiddenHandle}
                backgroundStyle={styles.sheetBg}
                onClose={onClose}
            >
                <View style={styles.handle} />

                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Friends training</Text>
                    <Text style={styles.headerSub}>
                        {sortedItems.length} updates • {liveCount} live
                    </Text>
                </View>

                {/* >>> This wrapper gives the SectionList HEIGHT inside the sheet <<< */}
                <View style={styles.listWrap}>
                    <SectionList
                        style={styles.list}
                        sections={sections}
                        renderSectionHeader={renderSectionHeader}
                        renderItem={renderItem}
                        keyExtractor={keyExtractor}
                        extraData={sortedItems.length}
                        contentContainerStyle={styles.listContent}
                        ItemSeparatorComponent={() => <View style={{ height: s(10) }} />}
                        SectionSeparatorComponent={() => <View style={{ height: s(12) }} />}
                        stickySectionHeadersEnabled={false}
                        showsVerticalScrollIndicator={false}
                        initialNumToRender={10}
                        windowSize={10}
                        maxToRenderPerBatch={12}
                        removeClippedSubviews={false}
                        keyboardShouldPersistTaps="handled"
                    />
                </View>
            </BottomSheet>
        </View>
    );
};

/* ------------------------------ styles ------------------------------ */
const styles = StyleSheet.create({
    outer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
    hiddenHandle: { display: "none" },
    sheetBg: {
        backgroundColor: COLORS.bg,
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
    },
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
    headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 16, color: COLORS.text },
    headerSub: { marginTop: 2, fontFamily: "Outfit_500Medium", fontSize: 12.5, color: COLORS.subtext },

    // <<< new: ensure list fills available space >>>
    listWrap: { flex: 1, minHeight: 1 },
    list: { flex: 1, minHeight: 1 },

    listContent: { paddingHorizontal: s(16), paddingBottom: s(20) },

    sectionHeaderWrap: {
        paddingTop: s(6),
        paddingBottom: s(4),
    },
    sectionHeaderText: {
        fontFamily: "Outfit_700Bold",
        fontSize: s(12),
        color: "rgba(15,23,42,0.65)",
        letterSpacing: 0.3,
    },

    /* Card */
    panel: {
        paddingHorizontal: s(14),
        paddingVertical: s(10),
        borderRadius: s(20),
        backgroundColor: COLORS.card,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: s(6) },
        shadowOpacity: 0.07,
        shadowRadius: s(12),
        elevation: 7,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(2, 6, 23, 0.03)",
    },

    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: s(6),
        gap: s(10),
    },

    rightAccessories: {
        flexDirection: "row",
        alignItems: "center",
        gap: s(10),
    },

    pfp: {
        width: s(38),
        height: s(38),
        borderRadius: s(19),
        backgroundColor: "#E2E8F0",
    },
    pfpFallback: {
        alignItems: "center",
        justifyContent: "center",
    },
    pfpInitials: {
        fontFamily: "Outfit_700Bold",
        fontSize: s(12),
        color: COLORS.text,
        opacity: 0.9,
    },

    templateTitle: {
        fontSize: s(12.5),
        fontFamily: "Outfit_700Bold",
        color: COLORS.text,
    },
    handleText: {
        marginTop: s(2),
        fontSize: s(12),
        fontFamily: "Outfit_500Medium",
        color: COLORS.subtext,
    },

    livePill: {
        flexDirection: "row",
        alignItems: "center",
        gap: s(6),
        backgroundColor: "rgba(45,158,255,0.12)",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(45,158,255,0.35)",
        paddingVertical: s(6),
        paddingHorizontal: s(9),
        borderRadius: s(999),
    },
    liveDot: {
        width: s(8),
        height: s(8),
        borderRadius: s(4),
        backgroundColor: "#EF4444",
    },
    liveText: {
        fontFamily: "Outfit_700Bold",
        fontSize: s(11.5),
        color: COLORS.text,
    },

    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: COLORS.hairline,
        marginVertical: s(6),
    },

    /* Stat chips */
    statsRow: {
        flexDirection: "row",
        gap: s(8),
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.statBg,
        borderRadius: s(14),
        paddingVertical: s(8),
        paddingHorizontal: s(10),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.statBorder,
    },
    statIconWrap: {
        width: s(22),
        height: s(22),
        borderRadius: s(11),
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.iconBg,
        marginBottom: s(4),
    },
    statLabel: {
        fontFamily: "Outfit_500Medium",
        fontSize: s(10),
        color: "rgba(100,116,139,0.9)",
    },
    statValue: {
        marginTop: s(1),
        fontFamily: "Outfit_700Bold",
        fontSize: s(13),
        color: COLORS.text,
    },
});

export default memo(FriendsActivitySheet);
