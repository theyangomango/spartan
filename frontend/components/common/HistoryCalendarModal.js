import React, { memo, useCallback, useMemo, useRef, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, InteractionManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import theme from "../../theme/mfpDark";
import scaleSize from "../../helper/scaleSize";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const dayKey = (dateLike) => {
    if (!dateLike) return "";
    const date = new Date(dateLike);
    if (Number.isNaN(date.getTime())) return "";
    date.setHours(0, 0, 0, 0);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const monthIndexOf = (date) => date.getFullYear() * 12 + date.getMonth();

const parseKeyToDate = (key) => {
    if (!key) return null;
    const parts = key.split("-");
    if (parts.length !== 3) return null;
    const [y, m, d] = parts.map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    const date = new Date(y, m - 1, d);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
};

const buildMonthData = (year, month, markedSet, selectedKey, todayKey) => {
    const first = new Date(year, month, 1);
    first.setHours(0, 0, 0, 0);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = first.getDay();

    const cells = [];
    for (let i = 0; i < firstDay; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
        const date = new Date(year, month, day);
        date.setHours(0, 0, 0, 0);
        const key = dayKey(date);
        cells.push({
            key,
            day,
            timestamp: date.getTime(),
            isMarked: markedSet?.has?.(key) || false,
            isSelected: key === selectedKey,
            isToday: key === todayKey,
        });
    }
    while (cells.length % 7 !== 0) cells.push(null);

    return {
        label: `${MONTH_NAMES[month]} ${year}`,
        cells,
        monthIndex: year * 12 + month,
    };
};

const buildCalendarMonths = (selectedDate, markedSet) => {
    const safeDate = selectedDate ? new Date(selectedDate) : new Date();
    if (Number.isNaN(safeDate.getTime())) safeDate.setTime(Date.now());
    safeDate.setHours(0, 0, 0, 0);
    const selectedMonthIdx = monthIndexOf(safeDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIdx = monthIndexOf(today);
    const selectedKey = dayKey(safeDate);
    const todayKey = dayKey(today);

    const baseSet = markedSet instanceof Set ? markedSet : new Set();
    const marksArray = Array.from(baseSet).map(parseKeyToDate).filter(Boolean);
    const markIndices = marksArray.map((date) => monthIndexOf(date));

    let minIdx = selectedMonthIdx - 6;
    let maxIdx = selectedMonthIdx + 6;
    if (markIndices.length) {
        minIdx = Math.min(minIdx, ...markIndices);
        maxIdx = Math.max(maxIdx, ...markIndices);
    }
    minIdx = Math.min(minIdx, todayIdx) - 1;
    maxIdx = Math.max(maxIdx, todayIdx) + 1;

    const months = [];
    for (let idx = minIdx; idx <= maxIdx; idx += 1) {
        const year = Math.floor(idx / 12);
        const month = idx - year * 12;
        months.push(buildMonthData(year, month, baseSet, selectedKey, todayKey));
    }
    return months;
};

const HistoryCalendarModal = memo(function HistoryCalendarModal({
    visible,
    onClose,
    onSelectDate,
    selectedDate,
    markedDayKeys,
    title = "Calendar",
}) {
    const insets = useSafeAreaInsets();
    const sheetRef = useRef(null);
    const scrollViewRef = useRef(null);
    const scrolledRef = useRef(false);
    const [mounted, setMounted] = useState(visible);
    const sheetSnapPoints = useMemo(() => ["94%"], []);
    const contentPaddingBottom = useMemo(
        () => Math.max(scaleSize(28), insets.bottom + scaleSize(18)),
        [insets.bottom]
    );

    useEffect(() => {
        if (visible) {
            setMounted(true);
            return undefined;
        }
        const timer = setTimeout(() => setMounted(false), 320);
        return () => clearTimeout(timer);
    }, [visible]);

    useEffect(() => {
        if (!mounted) return undefined;
        const frame = typeof requestAnimationFrame === "function"
            ? requestAnimationFrame
            : (cb) => setTimeout(cb, 0);
        const handle = frame(() => {
            try {
                if (visible) sheetRef.current?.snapToIndex?.(0);
                else sheetRef.current?.close?.();
            } catch { }
        });
        return () => {
            if (typeof handle === "number" && typeof cancelAnimationFrame === "function") {
                cancelAnimationFrame(handle);
            } else if (typeof handle === "number") {
                clearTimeout(handle);
            }
        };
    }, [visible, mounted]);

    const renderBackdrop = useCallback(
        (props) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
                pressBehavior="close"
                opacity={0.5}
            />
        ),
        []
    );

    const renderHandle = useCallback(() => (
        <View style={styles.dragRegion}>
            <View style={styles.sheetHandleWrap}>
                <View style={styles.sheetHandleIndicator} />
            </View>
            <View style={styles.headerRow}>
                <Pressable
                    onPress={onClose}
                    hitSlop={8}
                    style={styles.closeBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Close calendar"
                >
                    <Ionicons name="close" size={22} color={theme.textSecondary} />
                </Pressable>
                <Text style={styles.title}>{title}</Text>
                <View style={styles.headerSpacer} />
            </View>
        </View>
    ), [onClose, title]);

    const marksSet = useMemo(() => {
        if (!markedDayKeys) return new Set();
        if (markedDayKeys instanceof Set) return markedDayKeys;
        if (Array.isArray(markedDayKeys)) return new Set(markedDayKeys);
        if (typeof markedDayKeys === "object") return new Set(Object.keys(markedDayKeys || {}));
        return new Set();
    }, [markedDayKeys]);

    const months = useMemo(() => buildCalendarMonths(selectedDate, marksSet), [selectedDate, marksSet]);

    const targetMonthIndex = useMemo(() => {
        if (!months.length) return 0;
        const selectedIdx = selectedDate ? monthIndexOf(new Date(selectedDate)) : null;
        if (selectedIdx !== null) {
            const selectedMatch = months.findIndex((m) => m.monthIndex === selectedIdx);
            if (selectedMatch !== -1) return selectedMatch;
        }
        const todayIdx = monthIndexOf(new Date());
        const todayMatch = months.findIndex((m) => m.monthIndex === todayIdx);
        if (todayMatch !== -1) return todayMatch;
        return months.length - 1;
    }, [months, selectedDate]);

    useEffect(() => {
        scrolledRef.current = false;
    }, [visible, targetMonthIndex, months.length]);

    const handleTargetLayout = useCallback((monthIndex, layoutY) => {
        if (!visible || scrolledRef.current) return;
        const target = months[targetMonthIndex];
        if (!target || monthIndex !== target.monthIndex) return;
        const offset = Math.max(0, layoutY);
        const performScroll = () => {
            requestAnimationFrame(() => {
                try {
                    scrollViewRef.current?.scrollTo({ y: offset, animated: false });
                    scrolledRef.current = true;
                } catch { }
            });
        };
        if (InteractionManager?.runAfterInteractions) InteractionManager.runAfterInteractions(performScroll);
        else performScroll();
    }, [visible, months, targetMonthIndex]);

    const handleDayPress = useCallback((cell) => {
        if (!cell || !cell.key || !cell.timestamp || typeof onSelectDate !== "function") return;
        onSelectDate({
            dayKey: cell.key,
            timestamp: cell.timestamp,
            isMarked: Boolean(cell.isMarked),
            isToday: Boolean(cell.isToday),
        });
    }, [onSelectDate]);

    if (!mounted && !visible) return null;

    return (
        <View style={styles.overlayRoot} pointerEvents="box-none">
            <BottomSheet
                ref={sheetRef}
                index={visible ? 0 : -1}
                snapPoints={sheetSnapPoints}
                enablePanDownToClose
                onClose={onClose}
                handleComponent={renderHandle}
                backdropComponent={renderBackdrop}
                backgroundStyle={styles.sheetBackground}
                style={styles.sheetContainer}
                contentContainerStyle={[styles.sheetContent, { paddingBottom: contentPaddingBottom }]}
            >
                    <View style={styles.weekHeader}>
                        {WEEKDAY_LABELS.map((label) => (
                            <Text key={label} style={styles.weekdayText}>
                                {label}
                            </Text>
                        ))}
                    </View>
                    <ScrollView
                        ref={scrollViewRef}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {months.map((month) => (
                            <View
                                key={month.monthIndex}
                                style={styles.monthBlock}
                                onLayout={(event) => {
                                    const { layout } = event?.nativeEvent || {};
                                    if (!layout || typeof layout.y !== "number") return;
                                    handleTargetLayout(month.monthIndex, layout.y);
                                }}
                            >
                                <Text style={styles.monthLabel}>{month.label}</Text>
                                <View style={styles.grid}>
                                    {month.cells.map((cell, index) => {
                                        const key = cell
                                            ? `${month.monthIndex}-${cell.key}`
                                            : `placeholder-${month.monthIndex}-${index}`;
                                        if (!cell) {
                                            return <View key={key} style={styles.cell} />;
                                        }
                                        const isDisabled = !cell.isMarked;
                                        return (
                                            <View key={key} style={styles.cell}>
                                                <Pressable
                                                    onPress={() => handleDayPress(cell)}
                                                    style={[
                                                        styles.cellPressable,
                                                        isDisabled && styles.cellPressableDisabled,
                                                    ]}
                                                    disabled={isDisabled}
                                                    hitSlop={8}
                                                    accessibilityRole="button"
                                                    accessibilityLabel={`Select ${MONTH_NAMES[new Date(cell.timestamp).getMonth()]} ${cell.day}`}
                                                >
                                                    <View
                                                        style={[
                                                        styles.dayCircle,
                                                        cell.isToday && styles.dayToday,
                                                        cell.isMarked && styles.dayLogged,
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.dayText,
                                                            cell.isMarked && styles.dayTextActive,
                                                        ]}
                                                    >
                                                        {cell.day}
                                                    </Text>
                                                        {cell.isMarked && <View style={styles.dayDot} />}
                                                    </View>
                                                </Pressable>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        ))}
                    </ScrollView>
            </BottomSheet>
        </View>
    );
});

export default HistoryCalendarModal;

const styles = StyleSheet.create({
    overlayRoot: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 6,
    },
    sheetContainer: { },
    sheetBackground: {
        backgroundColor: theme.bg,
        borderTopLeftRadius: scaleSize(26),
        borderTopRightRadius: scaleSize(26),
    },
    sheetContent: {
        paddingHorizontal: scaleSize(20),
        paddingTop: scaleSize(12),
    },
    sheetHandleWrap: {
        alignItems: "center",
        paddingVertical: scaleSize(12),
    },
    sheetHandleIndicator: {
        width: scaleSize(42),
        height: scaleSize(4),
        borderRadius: scaleSize(2),
        backgroundColor: "rgba(255,255,255,0.7)",
    },
    dragRegion: { paddingHorizontal: scaleSize(20) },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: scaleSize(18) },
    closeBtn: {
        padding: scaleSize(6),
    },
    title: { fontFamily: "Nunito_800ExtraBold", fontSize: scaleSize(17), color: theme.textPrimary },
    headerSpacer: { width: scaleSize(34), height: scaleSize(34) },
    weekHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: scaleSize(14), paddingLeft: scaleSize(20) },
    weekdayText: { flex: 1, textAlign: "center", fontFamily: "Outfit_600SemiBold", fontSize: scaleSize(13.5), color: theme.muted },
    scrollContent: { paddingBottom: scaleSize(40) },
    monthBlock: { marginBottom: scaleSize(26), paddingLeft: scaleSize(20) },
    monthLabel: { fontFamily: "Nunito_800ExtraBold", fontSize: scaleSize(16.5), color: theme.textPrimary, marginBottom: scaleSize(12) },
    grid: { flexDirection: "row", flexWrap: "wrap" },
    cell: { width: "14.2857%", aspectRatio: 1, alignItems: "center", justifyContent: "center", marginBottom: scaleSize(14) },
    cellPressable: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    cellPressableDisabled: {
        opacity: 0.5,
    },
    dayCircle: {
        width: scaleSize(38),
        height: scaleSize(38),
        borderRadius: scaleSize(19),
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
    },
    dayLogged: {},
    dayToday: { borderWidth: scaleSize(2), borderColor: "#3b82f6", borderRadius: scaleSize(19) },
    dayText: { fontFamily: "Outfit_600SemiBold", fontSize: scaleSize(14), color: theme.textSecondary },
    dayTextActive: { color: theme.textPrimary },
    dayDot: {
        position: "absolute",
        top: scaleSize(4),
        width: scaleSize(6),
        height: scaleSize(6),
        borderRadius: scaleSize(3),
        backgroundColor: "#f97316",
    },
});
