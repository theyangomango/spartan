// components/3_Workout/sections/WeekCalendar.jsx
import React, { useMemo, useRef, useState, useCallback, memo } from "react";
import { View, Text, StyleSheet, Dimensions, Platform, FlatList } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { useFoodLogs } from "../../../hooks/useFoodLogs";

const { width: W } = Dimensions.get("window");

// YYYY-MM-DD
const toDayKey = (msOrDate) => {
    if (!msOrDate && msOrDate !== 0) return "";
    let ms = msOrDate;
    if (typeof msOrDate === "object") {
        if (typeof msOrDate?.toMillis === "function") ms = msOrDate.toMillis();
        else if (msOrDate instanceof Date) ms = msOrDate.getTime();
        else ms = 0;
    }
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return "";
    d.setHours(0, 0, 0, 0);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

/**
 * Props:
 *  - workoutsMap?: { 'YYYY-MM-DD': true }
 *  - onWeekChange?: (offset:number) => void
 *  - onDayPress?: (date: Date) => void
 */
export default function WeekCalendar({ workoutsMap = {}, onWeekChange, onDayPress }) {
    /* ---- layout ---- */
    const OUTER_HPAD = 16;
    const INNER_HPAD = 14;
    const CELL_GAP = 8;

    // explicit row height so the horizontal FlatList always has height on iOS
    const PILL_H = 44;
    const CAL_HEIGHT = PILL_H + 20; // margins 10 + 10 (top/bottom)
    const cellWidth = useMemo(() => {
        const usable = W - OUTER_HPAD * 2 - INNER_HPAD * 2 - CELL_GAP * 6;
        return Math.floor(usable / 7);
    }, []);

    const pageWidth = useMemo(() => cellWidth * 7 + CELL_GAP * 6, [cellWidth]);
    const DAY_LETTERS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

    /* ---- virtual weeks ---- */
    const TOTAL_WEEKS = 5200; // ~100 years
    const BASE_INDEX = Math.floor(TOTAL_WEEKS / 2); // today's week
    const [weekIndex, setWeekIndex] = useState(BASE_INDEX);
    const flatRef = useRef(null);

    const isSameDay = (a, b) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

    const dayKey = (d) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const getStartOfWeekByOffset = (offset) => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        const sundayOffset = d.getDay();
        d.setDate(d.getDate() - sundayOffset + offset * 7);
        return d;
    };

    const makeWeekDays = (startDate) =>
        Array.from({ length: 7 }, (_, i) => {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            d.setHours(0, 0, 0, 0);
            return d;
        });

    // Header month label
    const currentWeekOffset = useMemo(() => weekIndex - BASE_INDEX, [weekIndex]);
    const currentStart = useMemo(() => getStartOfWeekByOffset(currentWeekOffset), [currentWeekOffset]);
    const currentWeekDays = useMemo(() => makeWeekDays(currentStart), [currentStart]);

    const monthLabel = useMemo(() => {
        if (!currentWeekDays.length) return "";
        const start = currentWeekDays[0];
        const end = currentWeekDays[currentWeekDays.length - 1];
        const abbr = (d) => d.toLocaleDateString(undefined, { month: "short" }).slice(0, 3).toUpperCase();
        return start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
            ? abbr(start)
            : `${abbr(start)} & ${abbr(end)}`;
    }, [currentWeekDays]);

    /* ---- build workouts map (fallback if prop omitted) ---- */
    const computedWorkoutsMap = useMemo(() => {
        const providedHasKeys = workoutsMap && Object.keys(workoutsMap).length > 0;
        if (providedHasKeys) return workoutsMap;

        const out = Object.create(null);
        const list = Array.isArray(global?.userData?.completedWorkouts) ? global.userData.completedWorkouts : [];
        for (const w of list) {
            const k = toDayKey(w?.created ?? w?.createdAt ?? 0);
            if (k) out[k] = true;
        }
        const active = global?.userData?.currentWorkout;
        if (active?.created) {
            const k = toDayKey(active.created);
            if (k) out[k] = true;
        }
        return out;
    }, [workoutsMap]);

    /* ---- handlers ---- */
    const handleMomentumEnd = useCallback(
        (e) => {
            const x = e.nativeEvent.contentOffset.x;
            const i = Math.round(x / pageWidth);
            if (i !== weekIndex) {
                setWeekIndex(i);
                onWeekChange?.(i - BASE_INDEX);
            }
        },
        [pageWidth, weekIndex, onWeekChange]
    );

    const goToToday = useCallback(() => {
        try {
            flatRef.current?.scrollToIndex({ index: BASE_INDEX, animated: true });
            setWeekIndex(BASE_INDEX);
            onWeekChange?.(0);
        } catch {
            requestAnimationFrame(() => {
                flatRef.current?.scrollToIndex?.({ index: BASE_INDEX, animated: false });
                setWeekIndex(BASE_INDEX);
                onWeekChange?.(0);
            });
        }
    }, [onWeekChange]);

    const renderWeek = useCallback(
        ({ index }) => {
            const offset = index - BASE_INDEX;
            const start = getStartOfWeekByOffset(offset);
            const days = makeWeekDays(start);

            return (
                <View style={[styles.page, { width: pageWidth, height: CAL_HEIGHT }]}>
                    <View style={styles.row}>
                        {days.map((d, idx) => {
                            const today = new Date();
                            const isToday = isSameDay(d, today);
                            const letter = DAY_LETTERS[d.getDay()];
                            const k = dayKey(d);
                            return (
                                <DayCell
                                    key={`${k}_${idx}`}
                                    d={d}
                                    letter={letter}
                                    isToday={isToday}
                                    cellWidth={cellWidth}
                                    isLast={idx === 6}
                                    workoutOn={!!computedWorkoutsMap[k]}
                                    onPress={onDayPress}
                                />
                            );
                        })}
                    </View>
                </View>
            );
        },
        [pageWidth, cellWidth, computedWorkoutsMap, onDayPress]
    );

    const getItemLayout = useCallback(
        (_data, index) => ({ length: pageWidth, offset: pageWidth * index, index }),
        [pageWidth]
    );

    const onScrollToIndexFailed = useCallback((info) => {
        setTimeout(() => {
            flatRef.current?.scrollToIndex({ index: info.index, animated: false });
        }, 10);
    }, []);

    return (
        <View style={[styles.wrap, { paddingHorizontal: OUTER_HPAD }]}>
            <View style={[styles.card, { paddingHorizontal: INNER_HPAD }]}>
                {/* Caption */}
                <View style={styles.captionRow}>
                    <Text style={styles.calCaption}>{monthLabel}</Text>
                    <RNBounceable
                        onPress={goToToday}
                        bounceEffectIn={0.95}
                        bounceEffectOut={1.0}
                        style={styles.jumpLinkTouch}
                        accessibilityRole="button"
                        accessibilityLabel="Jump to Today"
                        hitSlop={6}
                    >
                        <Text style={styles.jumpLink}>Jump to Today</Text>
                    </RNBounceable>
                </View>

                {/* Smooth, snapping FlatList */}
                <FlatList
                    ref={flatRef}
                    horizontal
                    style={{ height: CAL_HEIGHT }}                   // 👈 give it height
                    contentContainerStyle={{ height: CAL_HEIGHT }}   // 👈 ensure children measure
                    showsHorizontalScrollIndicator={false}
                    data={Array.from({ length: TOTAL_WEEKS })}
                    renderItem={renderWeek}
                    keyExtractor={(_, i) => String(i)}
                    initialScrollIndex={BASE_INDEX}
                    getItemLayout={getItemLayout}
                    onScrollToIndexFailed={onScrollToIndexFailed}
                    scrollEventThrottle={16}
                    decelerationRate={Platform.OS === "ios" ? "fast" : 0.98}
                    pagingEnabled={false}
                    snapToInterval={pageWidth}
                    snapToAlignment="start"
                    disableIntervalMomentum={false}
                    onMomentumScrollEnd={handleMomentumEnd}
                    overScrollMode="never"
                    windowSize={5}
                    initialNumToRender={3}
                    maxToRenderPerBatch={3}
                    removeClippedSubviews={false}
                />
            </View>
        </View>
    );
}

/* ---------- Per-day cell ---------- */
const DayCell = memo(function DayCell({
    d,
    letter,
    isToday,
    cellWidth,
    isLast,
    workoutOn,
    onPress,
}) {
    const { totals } = useFoodLogs(d);
    const cals = Math.max(0, Number(totals?.calories || 0));
    const goal =
        Number((global?.userData?.macroGoals?.calories ?? global?.userData?.macrosGoal?.calories ?? 0)) || 0;

    // ✅ Only green if tracked and within ±20% of goal; otherwise grey
    const topStyle =
        cals > 0 && goal > 0 && Math.abs(cals - goal) / Math.max(1, goal) <= 0.2
            ? styles.topBarGreen
            : styles.topBarOff;

    return (
        <RNBounceable
            onPress={() => onPress?.(d)}
            bounceEffectIn={0.96}
            bounceEffectOut={1}
            style={[styles.cell, { width: cellWidth, marginRight: isLast ? 0 : 8, height: "100%" }]}
            accessibilityRole="button"
            accessibilityLabel={`Open details for ${d.toDateString()}`}
        >
            {/* Top nutrition bar */}
            <View style={[styles.topBar, topStyle, { width: Math.round(cellWidth * 0.5) }]} />

            {/* Day label */}
            <View style={[styles.centerPill, isToday && styles.centerPillToday]}>
                <Text style={styles.dayLetter}>{letter}</Text>
                <Text style={styles.dayNum}>{d.getDate()}</Text>
            </View>

            {/* Bottom workout bar */}
            <View
                style={[
                    styles.bottomBar,
                    workoutOn ? styles.bottomBarOn : styles.bottomBarOff,
                    { width: Math.round(cellWidth * 0.5) },
                ]}
            />
        </RNBounceable>
    );
});

/* -------------------------------- Styles -------------------------------- */
const styles = StyleSheet.create({
    wrap: { marginTop: 6, marginBottom: 6 },

    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        paddingVertical: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(2,6,23,0.06)",
        overflow: "hidden",
        ...Platform.select({
            ios: { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
            android: { elevation: 1 },
        }),
    },

    captionRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
        paddingHorizontal: 4,
    },

    calCaption: {
        color: "#64748B",
        fontSize: 12,
        fontFamily: "Outfit_700Bold",
    },

    jumpLinkTouch: { paddingHorizontal: 2, paddingVertical: 2 },
    jumpLink: {
        color: "#2D9EFF",
        fontSize: 12,
        fontFamily: "Outfit_700Bold",
        letterSpacing: 0.2,
    },

    page: { justifyContent: "center" },
    row: { flexDirection: "row", alignItems: "center", height: "100%" },

    cell: { alignItems: "center", position: "relative" },

    // Top nutrition bar
    topBar: { position: "absolute", top: 4, height: 6, borderRadius: 3 },
    topBarGreen: { backgroundColor: "#4ce885ff" },
    topBarOff: { backgroundColor: "#E6EEF6" },

    // Bottom workout bar
    bottomBar: { position: "absolute", bottom: 4, height: 6, borderRadius: 3 },
    bottomBarOn: { backgroundColor: "#2D9EFF" },
    bottomBarOff: { backgroundColor: "#E6EEF6" },

    centerPill: {
        marginTop: 10,
        marginBottom: 10,
        width: "92%",
        height: 44,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    centerPillToday: {
        backgroundColor: "#E9F2FF",
        borderWidth: 1,
        borderColor: "#6FB8FF",
    },
    dayLetter: {
        fontFamily: "Outfit_700Bold",
        fontSize: 9.5,
        color: "#94A3B8",
        marginBottom: 2,
        letterSpacing: 0.3,
    },
    dayNum: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: 15,
        color: "#0F172A",
    },
});
