// components/3_Workout/sections/WeekCalendar.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Platform,
    ScrollView,
} from "react-native";
import { BLUE } from "./workoutTheme";

const { width: W } = Dimensions.get("window");

// One-week calendar (Sun–Sat), stationary card with native-paged swiping.
// Props:
//  - macrosMap:   { 'YYYY-MM-DD': true }  -> top bar (green)
//  - workoutsMap: { 'YYYY-MM-DD': true }  -> bottom bar (blue)
//  - onWeekChange?: (offset:number) => void
export default function WeekCalendar({ macrosMap = {}, workoutsMap = {}, onWeekChange }) {
    /* ---- layout constants ---- */
    const OUTER_HPAD = 16;   // outside card (matches screen padding)
    const INNER_HPAD = 14;   // inside card (tiny bump for nicer balance with caption)
    const CELL_GAP = 8;

    // Fit 7 cells + 6 gaps into the inner width exactly (no clipping).
    const cellWidth = useMemo(() => {
        const usable = W - OUTER_HPAD * 2 - INNER_HPAD * 2 - CELL_GAP * 6;
        return Math.floor(usable / 7);
    }, []);

    // Width of 7 cells + 6 gaps (the page viewport).
    const pageWidth = useMemo(() => cellWidth * 7 + CELL_GAP * 6, [cellWidth]);

    // Letters for weekdays
    const DAY_LETTERS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

    /* ---- week offset & data ---- */
    const [weekOffset, setWeekOffset] = useState(0); // 0 = current week

    const getStartOfWeek = (offset) => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        const sundayOffset = d.getDay(); // 0..6
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

    // Build prev / current / next weeks so swiping is seamless.
    const prevWeekDays = useMemo(() => makeWeekDays(getStartOfWeek(weekOffset - 1)), [weekOffset]);
    const currWeekDays = useMemo(() => makeWeekDays(getStartOfWeek(weekOffset)), [weekOffset]);
    const nextWeekDays = useMemo(() => makeWeekDays(getStartOfWeek(weekOffset + 1)), [weekOffset]);

    // Month label for the CURRENT (center) week — uppercase 3-letter abbrev
    const monthLabel = useMemo(() => {
        if (!currWeekDays.length) return "";
        const start = currWeekDays[0];
        const end = currWeekDays[currWeekDays.length - 1];

        const abbr = (d) =>
            d.toLocaleDateString(undefined, { month: "short" }).slice(0, 3).toUpperCase();

        return start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
            ? abbr(start)
            : `${abbr(start)} & ${abbr(end)}`;
    }, [currWeekDays]);

    const isSameDay = (a, b) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

    const k = (d) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    /* ---- native scroll pager (smooth, no lag) ---- */
    const scrollRef = useRef(null);

    // Jump to the middle page initially and whenever layout changes.
    useEffect(() => {
        if (scrollRef.current && pageWidth > 0) {
            // center page (index 1)
            scrollRef.current.scrollTo({ x: pageWidth, animated: false });
        }
    }, [pageWidth, weekOffset]);

    const onMomentumEnd = (e) => {
        const x = e.nativeEvent.contentOffset.x;
        const pageIndex = Math.round(x / pageWidth); // 0, 1, or 2
        if (pageIndex === 1) return; // stayed on current — nothing to do

        // If user swiped to prev (0) or next (2), update offset then recenter instantly.
        setWeekOffset((o) => {
            const next = o + (pageIndex === 2 ? 1 : -1);
            onWeekChange?.(next);
            return next;
        });

        // Instantly jump back to the center page so future swipes are seamless.
        requestAnimationFrame(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTo({ x: pageWidth, animated: false });
            }
        });
    };

    /* ---- render ---- */
    const innerWidth = pageWidth; // viewport width

    return (
        <View style={[styles.wrap, { paddingHorizontal: OUTER_HPAD }]}>
            {/* Stationary white card */}
            <View style={[styles.card, { paddingHorizontal: INNER_HPAD }]}>
                {/* Month caption INSIDE the card (matches other card captions) */}
                <Text style={styles.calCaption}>{monthLabel}</Text>

                {/* Fixed-width viewport so cells align perfectly */}
                <View style={[styles.viewport, { width: innerWidth }]}>
                    <ScrollView
                        ref={scrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        bounces={false}
                        pagingEnabled
                        snapToInterval={pageWidth}   // helps Android
                        decelerationRate="fast"
                        onMomentumScrollEnd={onMomentumEnd}
                        contentOffset={{ x: pageWidth, y: 0 }} // start centered
                    >
                        {/* Prev page */}
                        <View style={[styles.page, { width: pageWidth }]}>
                            <View style={styles.row}>
                                {prevWeekDays.map((d, idx) => {
                                    const today = new Date();
                                    const isToday = isSameDay(d, today);
                                    const letter = DAY_LETTERS[d.getDay()];
                                    const macrosOn = !!macrosMap[k(d)];
                                    const workoutOn = !!workoutsMap[k(d)];
                                    return (
                                        <View
                                            key={`p_${d.toISOString()}_${idx}`}
                                            style={[
                                                styles.cell,
                                                { width: cellWidth, marginRight: idx === 6 ? 0 : CELL_GAP },
                                            ]}
                                        >
                                            <View
                                                style={[
                                                    styles.topBar,
                                                    macrosOn ? styles.topBarOn : styles.topBarOff,
                                                    { width: Math.round(cellWidth * 0.5) },
                                                ]}
                                            />
                                            <View style={[styles.centerPill, isToday && styles.centerPillToday]}>
                                                <Text style={styles.dayLetter}>{letter}</Text>
                                                <Text style={styles.dayNum}>{d.getDate()}</Text>
                                            </View>
                                            <View
                                                style={[
                                                    styles.bottomBar,
                                                    workoutOn ? styles.bottomBarOn : styles.bottomBarOff,
                                                    { width: Math.round(cellWidth * 0.5) },
                                                ]}
                                            />
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Current page */}
                        <View style={[styles.page, { width: pageWidth }]}>
                            <View style={styles.row}>
                                {currWeekDays.map((d, idx) => {
                                    const today = new Date();
                                    const isToday = isSameDay(d, today);
                                    const letter = DAY_LETTERS[d.getDay()];
                                    const macrosOn = !!macrosMap[k(d)];
                                    const workoutOn = !!workoutsMap[k(d)];
                                    return (
                                        <View
                                            key={`c_${d.toISOString()}_${idx}`}
                                            style={[
                                                styles.cell,
                                                { width: cellWidth, marginRight: idx === 6 ? 0 : CELL_GAP },
                                            ]}
                                        >
                                            <View
                                                style={[
                                                    styles.topBar,
                                                    macrosOn ? styles.topBarOn : styles.topBarOff,
                                                    { width: Math.round(cellWidth * 0.5) },
                                                ]}
                                            />
                                            <View style={[styles.centerPill, isToday && styles.centerPillToday]}>
                                                <Text style={styles.dayLetter}>{letter}</Text>
                                                <Text style={styles.dayNum}>{d.getDate()}</Text>
                                            </View>
                                            <View
                                                style={[
                                                    styles.bottomBar,
                                                    workoutOn ? styles.bottomBarOn : styles.bottomBarOff,
                                                    { width: Math.round(cellWidth * 0.5) },
                                                ]}
                                            />
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Next page */}
                        <View style={[styles.page, { width: pageWidth }]}>
                            <View style={styles.row}>
                                {nextWeekDays.map((d, idx) => {
                                    const today = new Date();
                                    const isToday = isSameDay(d, today);
                                    const letter = DAY_LETTERS[d.getDay()];
                                    const macrosOn = !!macrosMap[k(d)];
                                    const workoutOn = !!workoutsMap[k(d)];
                                    return (
                                        <View
                                            key={`n_${d.toISOString()}_${idx}`}
                                            style={[
                                                styles.cell,
                                                { width: cellWidth, marginRight: idx === 6 ? 0 : CELL_GAP },
                                            ]}
                                        >
                                            <View
                                                style={[
                                                    styles.topBar,
                                                    macrosOn ? styles.topBarOn : styles.topBarOff,
                                                    { width: Math.round(cellWidth * 0.5) },
                                                ]}
                                            />
                                            <View style={[styles.centerPill, isToday && styles.centerPillToday]}>
                                                <Text style={styles.dayLetter}>{letter}</Text>
                                                <Text style={styles.dayNum}>{d.getDate()}</Text>
                                            </View>
                                            <View
                                                style={[
                                                    styles.bottomBar,
                                                    workoutOn ? styles.bottomBarOn : styles.bottomBarOff,
                                                    { width: Math.round(cellWidth * 0.5) },
                                                ]}
                                            />
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        marginTop: 6,
        marginBottom: 6,
    },

    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        paddingVertical: 12, // a touch more space to balance caption + row
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(2,6,23,0.06)",
        overflow: "hidden",
        ...Platform.select({
            ios: { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
            android: { elevation: 1 },
        }),
    },

    // Caption inside the card — matches card captions in Workout.jsx
    calCaption: {
        color: "#64748B",
        fontSize: 12,
        fontFamily: "Outfit_700Bold",
        marginBottom: 8,
    },

    viewport: {
        alignSelf: "center", // centers the exact-width viewport
    },

    page: {
        // width is set dynamically
    },

    row: {
        flexDirection: "row",
    },

    cell: {
        alignItems: "center",
        position: "relative",
    },

    /* exact bars (top & bottom identical) */
    topBar: {
        position: "absolute",
        top: 4,
        height: 6,
        borderRadius: 3,
    },
    topBarOn: { backgroundColor: "#22C55E" },
    topBarOff: { backgroundColor: "#E6EEF6" },

    bottomBar: {
        position: "absolute",
        bottom: 4,
        height: 6,
        borderRadius: 3,
    },
    bottomBarOn: { backgroundColor: BLUE || "#2D9EFF" },
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
