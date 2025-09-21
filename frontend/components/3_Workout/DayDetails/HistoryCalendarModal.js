import React, { memo, useCallback, useMemo, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, InteractionManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import theme from "../../../theme/mfpDark";
import scaleSize from "../../../helper/scaleSize";

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const dayKey = (d) => {
    if (!d) return '';
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return '';
    x.setHours(0, 0, 0, 0);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

const monthIndexOf = (date) => (date.getFullYear() * 12) + date.getMonth();

const parseKeyToDate = (key) => {
    if (!key) return null;
    const parts = key.split('-');
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
    const offset = (firstDay + 6) % 7; // Monday start

    const cells = [];
    for (let i = 0; i < offset; i += 1) cells.push(null);
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
        monthIndex: (year * 12) + month,
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
        const month = idx - (year * 12);
        months.push(buildMonthData(year, month, baseSet, selectedKey, todayKey));
    }
    return months;
};

const HistoryCalendarModal = memo(function HistoryCalendarModal({ visible, onClose, onSelectDate, selectedDate, markedDayKeys }) {
    const insets = useSafeAreaInsets();
    const scrollViewRef = useRef(null);
    const scrolledRef = useRef(false);

    const marksSet = useMemo(() => {
        if (!markedDayKeys) return new Set();
        if (markedDayKeys instanceof Set) return markedDayKeys;
        if (Array.isArray(markedDayKeys)) return new Set(markedDayKeys);
        if (typeof markedDayKeys === 'object') return new Set(Object.keys(markedDayKeys || {}));
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

    return (
        <Modal visible={!!visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
            <View style={styles.modalRoot}>
                <Pressable style={styles.backdrop} onPress={onClose}>
                    <View />
                </Pressable>
                <View
                    style={[
                        styles.modalContent,
                        {
                            paddingTop: insets.top + scaleSize(18),
                            paddingBottom: Math.max(scaleSize(18), insets.bottom + scaleSize(12)),
                        },
                    ]}
                    pointerEvents="box-none"
                >
                    <View style={styles.card}>
                        <View style={styles.headerRow}>
                            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close calendar">
                                <Ionicons name="close" size={20} color={theme.textPrimary} />
                            </Pressable>
                            <Text style={styles.title}>Calendar</Text>
                            <View style={styles.headerSpacer} />
                        </View>
                        <View style={styles.weekHeader}>
                            {WEEKDAY_LABELS.map((label) => (
                                <Text key={label} style={styles.weekdayText}>{label}</Text>
                            ))}
                        </View>
                        <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                            {months.map((month) => (
                                <View
                                    key={month.monthIndex}
                                    style={styles.monthBlock}
                                    onLayout={(event) => {
                                        const { layout } = event?.nativeEvent || {};
                                        if (!layout || typeof layout.y !== 'number') return;
                                        handleTargetLayout(month.monthIndex, layout.y);
                                    }}
                                >
                                    <Text style={styles.monthLabel}>{month.label}</Text>
                                    <View style={styles.grid}>
                                        {month.cells.map((cell, index) => {
                                            const key = cell ? `${month.monthIndex}-${cell.key}` : `placeholder-${month.monthIndex}-${index}`;
                                            if (!cell) {
                                                return <View key={key} style={styles.cell} />;
                                            }
                                            return (
                                                <Pressable
                                                    key={key}
                                                    style={styles.cell}
                                                    hitSlop={10}
                                                    onPress={() => onSelectDate?.(cell.timestamp)}
                                                    accessibilityRole="button"
                                                    accessibilityLabel={`Go to ${cell.key}`}
                                                >
                                                    <View
                                                        style={[
                                                            styles.dayCircle,
                                                            cell.isMarked && styles.dayLogged,
                                                            cell.isToday && styles.dayToday,
                                                            cell.isSelected && styles.daySelected,
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.dayText,
                                                                (cell.isMarked || cell.isSelected) && styles.dayTextActive,
                                                            ]}
                                                        >
                                                            {cell.day}
                                                        </Text>
                                                    </View>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </View>
        </Modal>
    );
});

export default HistoryCalendarModal;

const styles = StyleSheet.create({
    modalRoot: { flex: 1, justifyContent: 'flex-start', alignItems: 'center' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
    modalContent: { flex: 1, width: '100%', alignItems: 'center', paddingHorizontal: scaleSize(18) },
    card: {
        width: '92%',
        maxHeight: '80%',
        backgroundColor: theme.fieldDeep,
        borderRadius: scaleSize(22),
        paddingHorizontal: scaleSize(18),
        paddingVertical: scaleSize(16),
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: scaleSize(18),
        shadowOffset: { width: 0, height: scaleSize(12) },
        elevation: 14,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: scaleSize(14) },
    closeBtn: {
        width: scaleSize(34),
        height: scaleSize(34),
        borderRadius: scaleSize(12),
        backgroundColor: '#39414fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: { fontFamily: 'Nunito_800ExtraBold', fontSize: scaleSize(18), color: theme.textPrimary },
    headerSpacer: { width: scaleSize(34), height: scaleSize(34) },
    weekHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: scaleSize(12) },
    weekdayText: { flex: 1, textAlign: 'center', fontFamily: 'Outfit_600SemiBold', fontSize: scaleSize(12.5), color: theme.muted },
    scrollContent: { paddingBottom: scaleSize(28) },
    monthBlock: { marginBottom: scaleSize(22) },
    monthLabel: { fontFamily: 'Nunito_800ExtraBold', fontSize: scaleSize(15.5), color: theme.textPrimary, marginBottom: scaleSize(10) },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: { width: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginBottom: scaleSize(12) },
    dayCircle: {
        width: scaleSize(36),
        height: scaleSize(36),
        borderRadius: scaleSize(18),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.fieldDeep,
    },
    dayLogged: { backgroundColor: 'rgba(45, 158, 255, 0.26)' },
    dayToday: { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.primary },
    daySelected: { borderWidth: scaleSize(2), borderColor: theme.success, backgroundColor: theme.fieldDeep },
    dayText: { fontFamily: 'Outfit_600SemiBold', fontSize: scaleSize(13), color: theme.textSecondary },
    dayTextActive: { color: theme.textPrimary },
});
