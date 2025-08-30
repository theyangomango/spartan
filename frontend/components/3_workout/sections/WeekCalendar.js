// components/3_Workout/sections/WeekCalendar.jsx
import React, { useMemo, useRef, useState, useCallback, memo } from "react";
import { View, Text, StyleSheet, Dimensions, Platform, VirtualizedList, Pressable } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { useFoodLogs } from "../../../hooks/useFoodLogs";

const { width: W } = Dimensions.get("window");
const DAY_LETTERS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

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

const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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

    const PILL_H = 44;
    const CAL_HEIGHT = PILL_H + 20;
    const cellWidth = useMemo(() => {
        const usable = W - OUTER_HPAD * 2 - INNER_HPAD * 2 - CELL_GAP * 6;
        return Math.floor(usable / 7);
    }, []);
    const halfBar = useMemo(() => Math.round(cellWidth * 0.5), [cellWidth]);
    const pageWidth = useMemo(() => cellWidth * 7 + CELL_GAP * 6, [cellWidth]);

    /* ---- virtual weeks ---- */
    const TOTAL_WEEKS = 520; // ~10 years (ample + lighter)
    const BASE_INDEX = Math.floor(TOTAL_WEEKS / 2);
    const [weekIndex, setWeekIndex] = useState(BASE_INDEX);
    const flatRef = useRef(null);

    // Header month label
    const currentWeekOffset = weekIndex - BASE_INDEX;
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

    /* ---- workouts map (fallback if prop omitted) ---- */
    const computedWorkoutsMap = useMemo(() => {
        const hasKeys = workoutsMap && Object.keys(workoutsMap).length > 0;
        if (hasKeys) return workoutsMap;

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

    // Update weekIndex faster when the centered page is mostly visible.
    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80, minimumViewTime: 40 }).current;
    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (!viewableItems?.length) return;
        // pick the item with the largest visibility
        let best = viewableItems[0];
        for (const v of viewableItems) {
            if ((v.isViewable && (v?.index ?? 0) !== undefined) && (v.percentVisible ?? 0) > (best.percentVisible ?? 0)) {
                best = v;
            }
        }
        const nextIndex = best?.index ?? weekIndex;
        if (nextIndex !== weekIndex) {
            setWeekIndex(nextIndex);
            onWeekChange?.(nextIndex - BASE_INDEX);
        }
    }).current;

    // Only the centered week mounts nutrition hooks
    const isNutritionWeek = useCallback((index) => index === weekIndex, [weekIndex]);

    /* ---- renderer ---- */
    const renderWeek = useCallback(
        ({ index }) => {
            return (
                <WeekPage
                    key={index}
                    index={index}
                    baseIndex={BASE_INDEX}
                    pageWidth={pageWidth}
                    calHeight={CAL_HEIGHT}
                    cellWidth={cellWidth}
                    cellGap={CELL_GAP}
                    halfBar={halfBar}
                    workoutsMap={computedWorkoutsMap}
                    onDayPress={onDayPress}
                    enableNutrition={isNutritionWeek(index)}
                />
            );
        },
        [BASE_INDEX, pageWidth, CAL_HEIGHT, cellWidth, CELL_GAP, halfBar, computedWorkoutsMap, onDayPress, isNutritionWeek]
    );

    const getItemLayout = useCallback(
        (_data, index) => ({ length: pageWidth, offset: pageWidth * index, index }),
        [pageWidth]
    );

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

                {/* Smooth, snapping VirtualizedList */}
                <VirtualizedList
                    ref={flatRef}
                    horizontal
                    style={{ height: CAL_HEIGHT }}
                    contentContainerStyle={{ height: CAL_HEIGHT }}
                    showsHorizontalScrollIndicator={false}
                    data={null}
                    initialScrollIndex={BASE_INDEX}
                    getItemCount={() => TOTAL_WEEKS}
                    getItem={(_d, index) => index}
                    renderItem={renderWeek}
                    keyExtractor={(item) => String(item)}
                    getItemLayout={getItemLayout}
                    onScrollToIndexFailed={(info) => {
                        setTimeout(() => flatRef.current?.scrollToIndex({ index: info.index, animated: false }), 10);
                    }}
                    scrollEventThrottle={16}
                    decelerationRate={Platform.OS === "ios" ? "fast" : 0.98}
                    pagingEnabled={false}
                    snapToInterval={pageWidth}
                    snapToAlignment="start"
                    disableIntervalMomentum
                    onMomentumScrollEnd={handleMomentumEnd}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                    overScrollMode="never"
                    windowSize={3}
                    initialNumToRender={1}
                    maxToRenderPerBatch={1}
                    removeClippedSubviews
                />
            </View>
        </View>
    );
}

/* ---------- A pure memoized "page" of 7 days ---------- */
const WeekPage = memo(function WeekPage({
    index,
    baseIndex,
    pageWidth,
    calHeight,
    cellWidth,
    cellGap,
    halfBar,
    workoutsMap,
    onDayPress,
    enableNutrition,
}) {
    const offset = index - baseIndex;
    const start = getStartOfWeekByOffset(offset);
    const days = makeWeekDays(start);
    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    return (
        <View style={[styles.page, { width: pageWidth, height: calHeight }]}>
            <View style={styles.row}>
                {days.map((d, idx) => {
                    const isToday = sameDay(d, today);
                    const letter = DAY_LETTERS[d.getDay()];
                    const k = toDayKey(d);
                    return (
                        <MemoDayCell
                            key={`${k}_${idx}`}
                            d={d}
                            letter={letter}
                            isToday={isToday}
                            cellWidth={cellWidth}
                            isLast={idx === 6}
                            workoutOn={!!workoutsMap[k]}
                            onPress={onDayPress}
                            enableNutrition={enableNutrition}
                            halfBar={halfBar}
                            cellGap={cellGap}
                        />
                    );
                })}
            </View>
        </View>
    );
}, (prev, next) => {
    // Only re-render if page identity or nutrition flag changes
    return (
        prev.index === next.index &&
        prev.enableNutrition === next.enableNutrition &&
        prev.pageWidth === next.pageWidth &&
        prev.calHeight === next.calHeight &&
        prev.cellWidth === next.cellWidth &&
        prev.halfBar === next.halfBar &&
        prev.workoutsMap === next.workoutsMap
    );
});

/* ---------- Nutrition bar ---------- */
const NutritionBar = memo(function NutritionBar({ d, halfBar }) {
    const { totals } = useFoodLogs(d);
    const cals = Math.max(0, Number(totals?.calories || 0));
    const goal = Number((global?.userData?.macroGoals?.calories ?? global?.userData?.macrosGoal?.calories ?? 0)) || 0;

    const onTarget = cals > 0 && goal > 0 && Math.abs(cals - goal) / Math.max(1, goal) <= 0.2;
    return <View style={[styles.topBar, onTarget ? styles.topBarGreen : styles.topBarOff, { width: halfBar }]} />;
});

/* ---------- Per-day cell (pure) ---------- */
const DayCell = function DayCell({
    d,
    letter,
    isToday,
    cellWidth,
    isLast,
    workoutOn,
    onPress,
    enableNutrition,
    halfBar,
    cellGap,
}) {
    const Container = Platform.OS === "android" ? Pressable : RNBounceable; // lighter on Android
    return (
        <Container
            onPress={() => onPress?.(d)}
            {...(Platform.OS !== "android" ? { bounceEffectIn: 0.96, bounceEffectOut: 1 } : {})}
            style={[styles.cell, { width: cellWidth, marginRight: isLast ? 0 : cellGap, height: "100%" }]}
            accessibilityRole="button"
            accessibilityLabel={`Open details for ${d.toDateString()}`}
        >
            {/* Top nutrition bar: only mount hook on the centered week */}
            {enableNutrition ? (
                <NutritionBar d={d} halfBar={halfBar} />
            ) : (
                <View style={[styles.topBar, styles.topBarOff, { width: halfBar }]} />
            )}

            {/* Day label */}
            <View style={[styles.centerPill, isToday && styles.centerPillToday]}>
                <Text style={styles.dayLetter}>{letter}</Text>
                <Text style={styles.dayNum}>{d.getDate()}</Text>
            </View>

            {/* Bottom workout bar */}
            <View style={[styles.bottomBar, workoutOn ? styles.bottomBarOn : styles.bottomBarOff, { width: halfBar }]} />
        </Container>
    );
};

// Avoid re-renders unless visual props actually change
const MemoDayCell = memo(DayCell, (a, b) => {
    return (
        a.isToday === b.isToday &&
        a.cellWidth === b.cellWidth &&
        a.isLast === b.isLast &&
        a.workoutOn === b.workoutOn &&
        a.enableNutrition === b.enableNutrition &&
        a.letter === b.letter &&
        a.halfBar === b.halfBar &&
        a.cellGap === b.cellGap &&
        toDayKey(a.d) === toDayKey(b.d)
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

    calCaption: { color: "#64748B", fontSize: 12, fontFamily: "Outfit_700Bold" },

    jumpLinkTouch: { paddingHorizontal: 2, paddingVertical: 2 },
    jumpLink: { color: "#2D9EFF", fontSize: 12, fontFamily: "Outfit_700Bold", letterSpacing: 0.2 },

    page: { justifyContent: "center" },
    row: { flexDirection: "row", alignItems: "center", height: "100%" },

    cell: { alignItems: "center", position: "relative" },

    // Top nutrition bar
    topBar: { position: "absolute", top: 4, height: 6, borderRadius: 3 },
    topBarGreen: { backgroundColor: "#6fd093ff" },
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
    dayLetter: { fontFamily: "Outfit_700Bold", fontSize: 9.5, color: "#94A3B8", marginBottom: 2, letterSpacing: 0.3 },
    dayNum: { fontFamily: "Outfit_800ExtraBold", fontSize: 15, color: "#0F172A" },
});
