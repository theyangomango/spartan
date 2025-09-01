import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    Image,
    SectionList,
    Animated,
    Dimensions,
    ActivityIndicator,
} from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { Clock } from "iconsax-react-native";
import { MaterialCommunityIcons, FontAwesome6 } from "@expo/vector-icons";
import { usePfp } from "../../helper/usePFPs";
import NewWorkoutModal from "./NewWorkout/NewWorkoutModal";

const { height: screenHeight } = Dimensions.get("window");
const scale = screenHeight / 844;
const s = (n) => Math.round(n * scale);

const COLORS = {
    bg: "#F6FAFF",
    card: "#FFFFFF",
    text: "#0F172A",
    subtext: "#64748B",
    hairline: "rgba(2, 6, 23, 0.06)",
    iconBg: "#EEF2F7",
    statBg: "#F7FAFF",
    statBorder: "rgba(100,116,139,0.10)",
};

const HANDLE_SELF = "#D0D7E2";
const HANDLE_FRIEND_ACCENT = "#E0A500";
const HANDLE_FRIEND_BACKGROUND = "#e0a4002c";

/* ---------------- utils ---------------- */
const toMillis = (v) => {
    if (!v && v !== 0) return undefined;
    if (typeof v === "number") return v;
    if (v?.toMillis) return v.toMillis();
    const t = new Date(v).getTime();
    return Number.isFinite(t) ? t : undefined;
};
const bestTimestamp = (it) =>
    Math.max(
        toMillis(it?.created) ?? 0,
        toMillis(it?.startedAt) ?? 0,
        toMillis(it?.finishedAt) ?? 0
    );
const toSec = (x) => {
    const n = Number(x ?? 0);
    return n > 9999 ? Math.round(n / 1000) : Math.round(n);
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
    try { return Number(n).toLocaleString(); } catch { return String(n); }
};
const firstName = (name = "") => {
    const str = String(name).trim();
    if (!str) return "Friend";
    const raw = (str.split(/\s+/)[0] || str).replace(/[.,;:]+$/, "");
    return raw;
};
const initials = (name = "") => {
    const parts = String(name).trim().split(/\s+/);
    const a = (parts[0] || "").charAt(0);
    const b = (parts[1] || "").charAt(0);
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

/* ---------------- grouping ---------------- */
const startOfToday = (now = new Date()) => { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; };
const startOfYesterday = (now = new Date()) => { const d = startOfToday(now); d.setDate(d.getDate() - 1); return d; };
const startOfWeekSunday = (now = new Date()) => { const d = startOfToday(now); d.setDate(d.getDate() - d.getDay()); return d; };
const startOfLastWeek = (now = new Date()) => { const d = startOfWeekSunday(now); d.setDate(d.getDate() - 7); return d; };
const minusMonths = (now, months) => { const d = startOfToday(now); d.setMonth(d.getMonth() - months); return d; };
const minusYears = (now, years) => { const d = startOfToday(now); d.setFullYear(d.getFullYear() - years); return d; };

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
        Today: [],
        Yesterday: [],
        "This Week": [],
        "Last Week": [],
        "Last Month": [],
        "Last Three Months": [],
        "Last Year": [],
        Older: [],
    };

    for (const it of rest) {
        const ts = bestTimestamp(it);
        if (!ts) { buckets["Older"].push(it); continue; }
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
    const order = ["Today", "Yesterday", "This Week", "Last Week", "Last Month", "Last Three Months", "Last Year", "Older"];
    for (const key of order) {
        const data = buckets[key];
        if (data.length) ordered.push({ title: key, data });
    }
    return ordered;
};

/* ---------------- row ---------------- */
const FriendPanel = memo(({ item, now, onSelect }) => {
    const isLive = !!item?.live;
    let liveElapsed;
    if (isLive) {
        const started = toMillis(item?.startedAt) ?? toMillis(item?.created);
        if (started) liveElapsed = Math.max(0, Math.round((now - started) / 1000));
    }

    const durationSec = isLive ? toSec(liveElapsed) : Math.max(0, Math.round(Number(item?.duration || 0) * 60));
    const volume = item?.volume ?? 0;
    const pbs = Number(item?.PBs ?? item?.pbs ?? 0);

    const cachedPfp = usePfp(item?.uid);
    const pfpUri = cachedPfp || item?.pfp || item?.pfpUrl || item?.photoURL || item?.photo || item?.avatar;
    const when = dateLabel(bestTimestamp(item));

    return (
        <RNBounceable style={styles.panel} onPress={() => onSelect?.(item, pfpUri)} activeScale={0.965}>
            <View style={styles.headerRow}>
                {pfpUri ? (
                    <Image source={{ uri: pfpUri }} style={styles.pfp} />
                ) : (
                    <View style={[styles.pfp, styles.pfpFallback]}>
                        <Text style={styles.pfpInitials}>{initials(item?.name)}</Text>
                    </View>
                )}

                <View style={{ flex: 1 }}>
                    <Text style={styles.templateTitle} numberOfLines={1} ellipsizeMode="tail">
                        {templateName(item)}
                    </Text>
                    <Text style={styles.handleText}>
                        {handleText(item)}
                        {when ? ` · ${when}` : ""}
                    </Text>
                </View>

                <View style={styles.rightAccessories}>
                    {isLive && (
                        <View style={styles.livePill}>
                            <View style={styles.liveDot} />
                            <Clock color={COLORS.text} size={s(14)} variant="Bold" />
                            <Text style={styles.liveText}>{formatTimer(durationSec)}</Text>
                        </View>
                    )}
                    <MaterialCommunityIcons name="chevron-right" size={s(22)} color="rgba(15,23,42,0.45)" />
                </View>
            </View>

            <View style={styles.divider} />

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

/* ---------------- sheet ---------------- */
const FriendsActivitySheet = ({
    visible,
    openToggle,
    items = [],
    onClose,
    onViewed,
}) => {
    const bottomSheetRef = useRef(null);
    const cacheRef = useRef([]);

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
        if (!bottomSheetRef.current || typeof visible === "undefined") return;
        if (visible) bottomSheetRef.current.expand();
        else bottomSheetRef.current.close();
    }, [visible]);

    useEffect(() => {
        if (!bottomSheetRef.current || !visible) return;
        bottomSheetRef.current.expand();
    }, [openToggle, visible]);

    const viewedOnceRef = useRef(false);
    useEffect(() => {
        if (!visible) { viewedOnceRef.current = false; return; }
        if (!viewedOnceRef.current) {
            viewedOnceRef.current = true;
            try { onViewed?.(); } catch { }
        }
    }, [visible, openToggle, onViewed]);

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

    const [selectedItem, setSelectedItem] = useState(null);
    const [viewerSelf, setViewerSelf] = useState(true);
    const listOpacity = useRef(new Animated.Value(1)).current;
    const viewerOpacity = useRef(new Animated.Value(0)).current;

    const openViewer = useCallback((item, pfpUri) => {
        const widFromItem = String(item?.wid || item?.id || item?.workout?.wid || "");
        const myActiveWid = String(global?.userData?.currentWorkout?.wid || "");
        const selfActive = !!widFromItem && widFromItem === myActiveWid;

        const createdMs =
            toMillis(item?.startedAt) ??
            toMillis(item?.created) ??
            Date.now();

        const fallbackWorkout = {
            wid: item?.wid || item?.id,
            creatorUID: item?.uid,
            created: createdMs,
            exercises: Array.isArray(item?.exercises) ? item.exercises : [],
            duration: item?.duration,
            volume: item?.volume,
            reps: item?.reps,
            PBs: item?.PBs ?? item?.pbs ?? 0,
            templateName: item?.templateName,
        };

        // If I'm actively in THIS workout, prefer my live copy so UI is identical to opening from the Workout screen.
        const wk = selfActive
            ? (global?.userData?.currentWorkout || fallbackWorkout)
            : ((item?.workout && typeof item.workout === "object") ? item.workout : fallbackWorkout);

        setSelectedItem({
            ...item,
            workout: wk,
            friendPfp: pfpUri || null,
            selfActive,
        });

        Animated.parallel([
            Animated.timing(listOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
            Animated.timing(viewerOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        ]).start();
    }, [listOpacity, viewerOpacity]);

    const closeViewer = useCallback(() => {
        Animated.parallel([
            Animated.timing(viewerOpacity, { toValue: 0, duration: 140, useNativeDriver: true }),
            Animated.timing(listOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start(({ finished }) => {
            if (finished) setSelectedItem(null);
        });
    }, [listOpacity, viewerOpacity]);

    const handleIndicatorColor = selectedItem ? HANDLE_FRIEND_ACCENT : HANDLE_SELF;
    const handleBackgroundColor = selectedItem ? HANDLE_FRIEND_BACKGROUND : "transparent";

    const sections = useMemo(() => groupByTime(sortedItems, now), [sortedItems, now]);
    const keyExtractor = useCallback((it, i) => it.id ?? it.uid ?? `f-${i}`, []);
    const renderItem = useCallback(
        ({ item }) => <FriendPanel item={item} now={now} onSelect={openViewer} />,
        [now, openViewer]
    );
    const renderSectionHeader = useCallback(({ section }) => {
        return (
            <View style={styles.sectionHeaderWrap}>
                <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
        );
    }, []);

    const liveCount = useMemo(() => sortedItems.filter((x) => x?.live).length, [sortedItems]);
    const noop = () => { };
    const timerRef = useRef("");

    return (
        <View style={styles.outer} pointerEvents="box-none">
            <BottomSheet
                ref={bottomSheetRef}
                index={-1}
                snapPoints={["94%"]}
                enablePanDownToClose
                backdropComponent={renderBackdrop}
                handleStyle={[styles.handleWrap, { backgroundColor: handleBackgroundColor }]}
                handleIndicatorStyle={{ backgroundColor: handleIndicatorColor }}
                backgroundStyle={styles.sheetBg}
                onClose={() => {
                    if (selectedItem) {
                        setSelectedItem(null);
                        listOpacity.setValue(1);
                        viewerOpacity.setValue(0);
                    }
                    onClose?.();
                }}
            >
                <Animated.View style={{ flex: 1, opacity: listOpacity }}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Friends training</Text>
                        <Text style={styles.headerSub}>
                            {sortedItems.length} updates • {liveCount} live
                        </Text>
                    </View>

                    <SectionList
                        sections={sections}
                        renderSectionHeader={renderSectionHeader}
                        renderItem={renderItem}
                        keyExtractor={keyExtractor}
                        style={{ flex: 1 }}
                        contentContainerStyle={styles.listContent}
                        ItemSeparatorComponent={() => <View style={{ height: s(10) }} />}
                        SectionSeparatorComponent={() => <View style={{ height: s(12) }} />}
                        stickySectionHeadersEnabled={false}
                        showsVerticalScrollIndicator={false}
                        initialNumToRender={12}
                        windowSize={15}
                        maxToRenderPerBatch={20}
                        ListFooterComponent={<View style={{ height: s(28) }} />}
                        ListEmptyComponent={
                            <View style={styles.emptyWrap}>
                                <Text style={styles.emptyText}>No recent activity</Text>
                            </View>
                        }
                    />
                </Animated.View>

                <Animated.View style={[styles.viewerContainer, { opacity: viewerOpacity }]} pointerEvents={selectedItem ? "auto" : "none"}>
                    {!selectedItem ? (
                        <View style={styles.loadingWrap}>
                            <ActivityIndicator />
                        </View>
                    ) : (
                        <View style={{ flex: 1 }}>
                            <View style={{ flex: 1 }}>
                                <NewWorkoutModal
                                    timerRef={timerRef}
                                    workout={selectedItem.workout}
                                    cancelWorkout={noop}
                                    updateWorkout={noop}
                                    finishWorkout={noop}
                                    showGroupModal={noop}
                                    userWorkoutStats={global?.userData?.statsExercises || {}}
                                    onViewingChange={setViewerSelf}
                                    onPressBack={closeViewer}
                                    onCheer={() => { }}
                                    /* KEY: only “self” if I’m actively in this workout; otherwise read-only friend view */
                                    forceViewingFriend={!selectedItem.selfActive}
                                    /* friend PFP only matters in friend view */
                                    friendPfp={selectedItem.selfActive ? null : (selectedItem.friendPfp || null)}
                                />
                            </View>
                        </View>
                    )}
                </Animated.View>
            </BottomSheet>
        </View>
    );
};

const styles = StyleSheet.create({
    outer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
    sheetBg: { backgroundColor: COLORS.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
    handleWrap: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },
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

    listContent: { paddingHorizontal: s(16), paddingBottom: s(24) },

    sectionHeaderWrap: { paddingTop: s(6), paddingBottom: s(4) },
    sectionHeaderText: {
        fontFamily: "Outfit_700Bold",
        fontSize: s(12),
        color: "rgba(15,23,42,0.65)",
        letterSpacing: 0.3,
    },

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
    headerRow: { flexDirection: "row", alignItems: "center", marginBottom: s(6), gap: s(10) },
    rightAccessories: { flexDirection: "row", alignItems: "center", gap: s(10) },
    pfp: { width: s(38), height: s(38), borderRadius: s(19), backgroundColor: "#E2E8F0" },
    pfpFallback: { alignItems: "center", justifyContent: "center" },
    pfpInitials: { fontFamily: "Outfit_700Bold", fontSize: s(12), color: COLORS.text, opacity: 0.9 },
    templateTitle: { fontSize: s(12.5), fontFamily: "Outfit_700Bold", color: COLORS.text },
    handleText: { marginTop: s(2), fontSize: s(12), fontFamily: "Outfit_500Medium", color: COLORS.subtext },

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
    liveDot: { width: s(8), height: s(8), borderRadius: s(4), backgroundColor: "#EF4444" },
    liveText: { fontFamily: "Outfit_700Bold", fontSize: s(11.5), color: COLORS.text },

    divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.hairline, marginVertical: s(6) },

    statsRow: { flexDirection: "row", gap: s(8) },
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
    statLabel: { fontFamily: "Outfit_500Medium", fontSize: s(10), color: "rgba(100,116,139,0.9)" },
    statValue: { marginTop: s(1), fontFamily: "Outfit_700Bold", fontSize: s(13), color: COLORS.text },

    viewerContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: "transparent" },
    loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

    emptyWrap: { paddingVertical: s(24), alignItems: "center" },
    emptyText: { fontFamily: "Outfit_600SemiBold", color: "rgba(15,23,42,0.5)", fontSize: s(12) },
});

export default memo(FriendsActivitySheet);
