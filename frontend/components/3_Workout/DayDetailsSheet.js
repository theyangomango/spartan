// components/3_Workout/DayDetailsSheet.jsx
import React, { memo, useCallback, useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { View, Text, StyleSheet, Pressable, Animated, useWindowDimensions, VirtualizedList, Easing, Modal, ScrollView, InteractionManager } from "react-native";
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import theme from "../../theme/mfpDark";
import { FoodDetailInline } from "../../screens/FoodDetail";
import DateHeader from "./DayDetails/DateHeader";
import OverlayContainer from "./DayDetails/OverlayContainer";
import { parseMacrosFromDescription, parseExtraNutrientsFromDescription, summarizeFood } from "../../utils/nutrition";
// No foodLogs usage: macros derive only from global.userData.loggedFoods
import scaleSize from "../../helper/scaleSize";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { strong as haptic } from "../../utils/haptics";
import { FlashList } from "@shopify/flash-list";
import MealItemCard from "../2_MacroTracking/MealItemCard";
import { useNavigation } from "@react-navigation/native";
import SimpleFeedPost from "../1_Feed/SimpleFeedPost";
import CommentsBottomSheet from "../1_Feed/Comments/CommentsBottomSheet";
import { navigateOneWay } from "../../../navigationRef";
import { db } from "../../../firebase.config";
import { doc, onSnapshot, collection, query, where, limit, getDocs } from "firebase/firestore";

const HEADER_HEIGHT = scaleSize(48);
const EDGE_BACK_GESTURE_WIDTH = 200; // px area from left edge to trigger back swipe
const BACK_SWIPE_TRIGGER = 36;       // px translation to confirm back
const fmt = (d) =>
    d
        ? d.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            // year: "numeric",
        })
        : "";

// YYYY-MM-DD
const dayKey = (d) => {
    if (!d) return "";
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return "";
    x.setHours(0, 0, 0, 0);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

const FOOD_CARD_COLORS = {
    card: theme.surface,
    text: theme.textPrimary,
    subtext: theme.textSecondary,
    hairline: theme.hairline,
};

// shift a date by delta days, normalized to start of day
const shiftDate = (d, delta) => {
    let base = d ? new Date(d) : new Date();
    if (Number.isNaN(base.getTime())) base = new Date();
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() + (delta || 0));
    return base;
};

const toMillis = (value) => {
    if (!value && value !== 0) return undefined;
    if (typeof value === "number") return value;
    if (value?.toMillis) return value.toMillis();
    const t = new Date(value).getTime();
    return Number.isFinite(t) ? t : undefined;
};

const bestTimestamp = (workout) => Math.max(
    toMillis(workout?.finishedAt) ?? 0,
    toMillis(workout?.completedAt) ?? 0,
    toMillis(workout?.startedAt) ?? 0,
    toMillis(workout?.createdAt) ?? 0,
    toMillis(workout?.created) ?? 0,
);

const buildWorkoutPid = (uid, workout, fallbackIndex) => {
    const safeUid = uid ? String(uid) : "self";
    const baseId = workout?.pid
        ?? workout?.wid
        ?? workout?.id
        ?? workout?.workoutId
        ?? workout?.logId
        ?? workout?.sessionId;
    const suffix = baseId ? String(baseId) : String(bestTimestamp(workout) || fallbackIndex || Date.now());
    return `workout:${safeUid}:${suffix}`;
};

const sanitizeEntry = (entry) => {
    if (!entry || typeof entry !== "object") return entry;
    try {
        return JSON.parse(JSON.stringify(entry, (_key, val) => (typeof val === "function" ? undefined : val)));
    } catch {
        return { ...entry };
    }
};

const ensureHandle = (value) => {
    if (!value) return "";
    const str = String(value).trim();
    return str.startsWith("@") ? str.slice(1) : str;
};

const ensureAtHandle = (value) => {
    const base = ensureHandle(value);
    return base ? `@${base}` : "";
};

const sanitizeWorkoutForRoute = (workout) => {
    if (!workout || typeof workout !== "object") return null;

    const replacer = (_key, value) => (typeof value === "function" ? undefined : value);

    try {
        return JSON.parse(JSON.stringify(workout, replacer));
    } catch {
        const clone = { ...workout };
        clone.exercises = Array.isArray(workout.exercises)
            ? workout.exercises.map((exercise) => {
                if (!exercise || typeof exercise !== "object") return {};
                const sets = Array.isArray(exercise.sets)
                    ? exercise.sets.map((set) => {
                        if (!set || typeof set !== "object") return {};
                        const { weight, reps, unit, units, weightUnit, kg, lbs, ...rest } = set;
                        const normalized = {
                            ...rest,
                            weight: Number(weight ?? kg ?? lbs ?? 0) || 0,
                            reps: Number(reps ?? set?.rep ?? set?.r ?? 0) || 0,
                        };
                        const resolvedUnit = unit || units || weightUnit || (kg != null ? "kg" : undefined);
                        if (resolvedUnit) normalized.unit = resolvedUnit;
                        return normalized;
                    })
                    : [];
                return { ...exercise, sets };
            })
            : [];
        return clone;
    }
};

const toNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};

const extractPidFromWorkout = (workout) => {
    if (!workout || typeof workout !== "object") return "";
    const candidates = [
        workout.pid,
        workout.postPid,
        workout.post_id,
        workout.postId,
        workout.linkedPostPid,
        workout.linkedPostId,
        workout.post?.pid,
        workout.feedItem?.pid,
    ];
    for (const candidate of candidates) {
        if (!candidate && candidate !== 0) continue;
        const str = String(candidate).trim();
        if (str) return str;
    }
    return "";
};

const buildFeedPostData = (workout, fallbackIndex = 0) => {
    if (!workout || typeof workout !== "object") return null;

    const viewer = (() => { try { return global?.userData || null; } catch { return null; } })();
    const ownerUid = workout?.uid ?? workout?.userUid ?? workout?.creatorUid ?? workout?.creatorUID ?? viewer?.uid ?? "self";
    const handle = workout?.handle || workout?.username || viewer?.handle || "";
    const name = workout?.name || viewer?.name || handle || "You";
    const pfp = workout?.pfp || workout?.pfpUrl || workout?.photoURL || workout?.photo || viewer?.image || viewer?.pfp || viewer?.pfpUrl || "";
    const pfpVersion = workout?.pfpVersion ?? workout?.pfp_version ?? viewer?.pfpVersion ?? viewer?.pfp_version ?? 0;
    const created = bestTimestamp(workout);
    const pid = extractPidFromWorkout(workout) || buildWorkoutPid(ownerUid, workout, fallbackIndex);

    return {
        pid,
        uid: String(ownerUid || ""),
        handle,
        name,
        pfp,
        pfpVersion,
        workout,
        created,
        createdAt: created,
        likes: Array.isArray(workout?.likes) ? workout.likes : [],
        likeCount: Number(workout?.likeCount ?? workout?.likesCount ?? 0) || 0,
        comments: Array.isArray(workout?.comments) ? workout.comments : [],
        commentCount: Number(workout?.commentCount ?? workout?.commentsCount ?? 0) || 0,
        media: Array.isArray(workout?.media) ? workout.media : [],
        images: Array.isArray(workout?.images) ? workout.images : [],
        caption: workout?.caption || workout?.templateName || workout?.template?.name || workout?.name || "",
        __synthetic: true,
    };
};

const MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const monthIndexOf = (date) => (date.getFullYear() * 12) + date.getMonth();

const parseKeyToDate = (key) => {
    if (!key) return null;
    const parts = key.split('-');
    if (parts.length !== 3) return null;
    const [y, m, d] = parts.map((part) => Number(part));
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
    const firstDay = first.getDay(); // 0 = Sunday
    const offset = firstDay; // align grid to Sunday-first index

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
        rows: Math.max(1, Math.ceil(cells.length / 7)),
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
    const marksArray = Array.from(baseSet).map((key) => parseKeyToDate(key)).filter(Boolean);
    const markIndices = marksArray.map((date) => monthIndexOf(date));

    let minIdx = selectedMonthIdx - 6;
    let maxIdx = selectedMonthIdx + 6;

    if (markIndices.length) {
        minIdx = Math.min(minIdx, ...markIndices);
        maxIdx = Math.max(maxIdx, ...markIndices);
    }

    minIdx = Math.min(minIdx, todayIdx);
    maxIdx = Math.max(maxIdx, todayIdx);

    // Add buffer months so lists never feel cramped
    minIdx -= 1;
    maxIdx += 1;

    const months = [];
    for (let idx = minIdx; idx <= maxIdx; idx += 1) {
        const year = Math.floor(idx / 12);
        const month = idx - (year * 12);
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
}) {
    const insets = useSafeAreaInsets();
    const listRef = useRef(null);
    const monthsCacheRef = useRef({ key: null, months: [] });
    const lastTargetRef = useRef({ key: null, index: null });
    const alignedSignatureRef = useRef(null);
    const [months, setMonths] = useState(() => monthsCacheRef.current.months || []);
    const [listReady, setListReady] = useState(false);
    const { width: screenWidth } = useWindowDimensions();

    const marksSet = useMemo(() => {
        if (!markedDayKeys) return new Set();
        if (markedDayKeys instanceof Set) return markedDayKeys;
        if (Array.isArray(markedDayKeys)) return new Set(markedDayKeys);
        if (typeof markedDayKeys === 'object') return new Set(Object.keys(markedDayKeys || {}));
        return new Set();
    }, [markedDayKeys]);

    const marksSignature = useMemo(() => {
        if (!marksSet?.size) return 'empty';
        try {
            return Array.from(marksSet).sort().join('|');
        } catch {
            return 'marks';
        }
    }, [marksSet]);

    const normalizedSelectedDate = useMemo(() => {
        if (!selectedDate) return null;
        const next = new Date(selectedDate);
        if (Number.isNaN(next.getTime())) return null;
        next.setHours(0, 0, 0, 0);
        return next;
    }, [selectedDate]);

    const selectedSignature = normalizedSelectedDate ? String(normalizedSelectedDate.getTime()) : 'null';

    const monthsCacheKey = useMemo(() => `${marksSignature}|${selectedSignature}`, [marksSignature, selectedSignature]);

    useEffect(() => {
        const cached = monthsCacheRef.current;
        if (cached.key === monthsCacheKey && cached.months.length) {
            setMonths(cached.months);
            return;
        }

        let cancelled = false;
        const task = InteractionManager.runAfterInteractions(() => {
            if (cancelled) return;
            const computed = buildCalendarMonths(normalizedSelectedDate, marksSet);
            monthsCacheRef.current = { key: monthsCacheKey, months: computed };
            setMonths(computed);
        });

        return () => {
            cancelled = true;
            try { task?.cancel?.(); } catch { }
        };
    }, [monthsCacheKey, normalizedSelectedDate, marksSet]);

    const targetMonthIndex = useMemo(() => {
        if (!months.length) return 0;
        const selectedIdx = normalizedSelectedDate ? monthIndexOf(normalizedSelectedDate) : null;
        if (selectedIdx !== null) {
            const match = months.findIndex((m) => m.monthIndex === selectedIdx);
            if (match !== -1) return match;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayIdx = monthIndexOf(today);
        const todayMatch = months.findIndex((m) => m.monthIndex === todayIdx);
        if (todayMatch !== -1) return todayMatch;
        return months.length - 1;
    }, [months, normalizedSelectedDate]);

    const safeTargetIndex = useMemo(() => {
        if (!months.length) return null;
        return Math.min(Math.max(targetMonthIndex, 0), months.length - 1);
    }, [months, targetMonthIndex]);

    useEffect(() => {
        lastTargetRef.current = { key: monthsCacheKey, index: null };
        alignedSignatureRef.current = null;
        setListReady(false);
    }, [monthsCacheKey]);

    const targetSignature = useMemo(() => {
        if (safeTargetIndex === null) return null;
        return `${monthsCacheKey}-${safeTargetIndex}`;
    }, [monthsCacheKey, safeTargetIndex]);

    useEffect(() => {
        if (!visible) {
            lastTargetRef.current = { key: null, index: null };
            alignedSignatureRef.current = null;
            setListReady(false);
        }
    }, [visible]);

    useEffect(() => {
        if (visible && !months.length) {
            setListReady(true);
        }
    }, [months.length, visible]);

    const handleSelect = useCallback((timestamp) => {
        if (!Number.isFinite(timestamp)) return;
        const next = new Date(timestamp);
        if (Number.isNaN(next.getTime())) return;
        next.setHours(0, 0, 0, 0);
        onSelectDate?.(next);
    }, [onSelectDate]);

    const monthHeights = useMemo(() => {
        if (!months.length) return [];
        const contentPadding = scaleSize(18) * 2;
        const cardPadding = scaleSize(18) * 2;
        const cardWidth = Math.max(0, screenWidth - contentPadding);
        const gridWidth = Math.max(0, cardWidth - cardPadding);
        const cellSize = gridWidth > 0 ? (gridWidth / 7) : scaleSize(42);
        const cellSpacing = scaleSize(12);
        const labelHeight = scaleSize(18);
        const labelMarginBottom = scaleSize(10);
        const blockMarginBottom = scaleSize(22);

        return months.map((item) => {
            const rows = item?.rows && Number.isFinite(item.rows) ? item.rows : Math.max(1, Math.ceil((item?.cells?.length || 7) / 7));
            const gridHeight = rows * (cellSize + cellSpacing);
            const total = labelHeight + labelMarginBottom + gridHeight + blockMarginBottom;
            return Math.max(1, Math.round(total));
        });
    }, [months, screenWidth]);

    const monthOffsets = useMemo(() => {
        if (!monthHeights.length) return [];
        const offsets = new Array(monthHeights.length);
        let running = 0;
        for (let i = 0; i < monthHeights.length; i += 1) {
            offsets[i] = running;
            running += monthHeights[i];
        }
        return offsets;
    }, [monthHeights]);

    const overrideItemLayout = useCallback((layout, _item, index) => {
        const size = monthHeights[index];
        if (!size) return;
        layout.size = size;
        layout.offset = monthOffsets[index] ?? 0;
    }, [monthHeights, monthOffsets]);

    const estimatedItemSize = useMemo(() => {
        if (monthHeights.length) {
            const targetIdx = safeTargetIndex ?? 0;
            const idx = Math.min(Math.max(targetIdx, 0), monthHeights.length - 1);
            return monthHeights[idx] || monthHeights[0];
        }

        const contentPadding = scaleSize(18) * 2;
        const cardPadding = scaleSize(18) * 2;
        const cardWidth = Math.max(0, screenWidth - contentPadding);
        const gridWidth = Math.max(0, cardWidth - cardPadding);
        const cellSize = gridWidth > 0 ? gridWidth / 7 : scaleSize(42);
        const rowHeight = cellSize + scaleSize(12);
        const labelHeight = scaleSize(24);
        const spacing = scaleSize(22);
        return Math.max(240, Math.round(labelHeight + (rowHeight * 6) + spacing));
    }, [monthHeights, safeTargetIndex, screenWidth]);

    useLayoutEffect(() => {
        if (!visible) return;
        if (targetSignature == null) return;
        if (!months.length) return;

        const list = listRef.current;
        if (!list || typeof list.scrollToIndex !== 'function') return;

        if (alignedSignatureRef.current === targetSignature) {
            setListReady(true);
            return;
        }

        let cancelled = false;
        const attemptScroll = (retries = 4) => {
            if (cancelled) return;
            try {
                list.scrollToIndex({ index: safeTargetIndex, animated: false });
                lastTargetRef.current = { key: targetSignature, index: safeTargetIndex };
                setListReady(true);
            } catch {
                if (retries <= 0) {
                    setListReady(true);
                    return;
                }
                requestAnimationFrame(() => attemptScroll(retries - 1));
            }
        };

        attemptScroll();

        return () => {
            cancelled = true;
        };
    }, [visible, targetSignature, safeTargetIndex, months.length]);

    const handleMonthLayout = useCallback((monthIndex) => {
        if (!visible) return;
        if (targetSignature == null) return;
        if (alignedSignatureRef.current === targetSignature) return;
        const target = months[safeTargetIndex ?? -1];
        if (!target || target.monthIndex !== monthIndex) return;

        alignedSignatureRef.current = targetSignature;
        setListReady(true);
    }, [visible, targetSignature, months, safeTargetIndex]);

    const renderMonth = useCallback(({ item }) => (
        <View
            style={styles.calendarMonthBlock}
            onLayout={(event) => {
                handleMonthLayout(item.monthIndex);
            }}
        >
            <Text style={styles.calendarMonthLabel}>{item.label}</Text>
            <View style={styles.calendarGrid}>
                {item.cells.map((cell, idx) => {
                    const cellKey = cell ? `${item.monthIndex}-${cell.key}` : `placeholder-${item.monthIndex}-${idx}`;
                    if (!cell) {
                        return <View key={cellKey} style={styles.calendarCell} />;
                    }
                    return (
                        <Pressable
                            key={cellKey}
                            style={styles.calendarCell}
                            hitSlop={10}
                            onPress={() => { try { haptic(); } catch {} handleSelect(cell.timestamp); }}
                            accessibilityRole="button"
                            accessibilityLabel={`Go to ${cell.key}`}
                        >
                            <View
                                style={[
                                    styles.calendarDayCircle,
                                    cell.isToday && styles.calendarDayToday,
                                    cell.isSelected && styles.calendarDaySelected,
                                    cell.isMarked && styles.calendarDayLogged,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.calendarDayText,
                                        (cell.isMarked || cell.isSelected) && styles.calendarDayTextActive,
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
    ), [handleSelect, handleMonthLayout]);

    const keyExtractor = useCallback((item) => String(item.monthIndex), []);

    const renderEmpty = useCallback(() => (
        <View style={styles.calendarLoadingWrap}>
            <Text style={styles.calendarLoadingText}>Loading…</Text>
        </View>
    ), []);

    const initialScrollIndex = safeTargetIndex ?? undefined;

    return (
        <Modal
            visible={!!visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.calendarModalRoot}>
                <Pressable
                    style={styles.calendarBackdrop}
                    onPress={() => { try { haptic(); } catch {} onClose?.(); }}
                >
                    <View />
                </Pressable>
                <View
                    style={[
                        styles.calendarModalContent,
                        {
                            paddingTop: insets.top + scaleSize(18),
                            paddingBottom: Math.max(scaleSize(18), insets.bottom + scaleSize(12)),
                        },
                    ]}
                    pointerEvents="box-none"
                >
                    <View style={styles.calendarCard}>
                        <View style={styles.calendarHeaderRow}>
                            <Pressable
                                onPress={() => { try { haptic(); } catch {} onClose?.(); }}
                                hitSlop={12}
                                style={styles.calendarCloseBtn}
                                accessibilityRole="button"
                                accessibilityLabel="Close calendar"
                            >
                                <Ionicons name="close" size={20} color={theme.textPrimary} />
                            </Pressable>
                            <Text style={styles.calendarTitle}>Calendar</Text>
                            <View style={styles.calendarHeaderSpacer} />
                        </View>

                        <View style={styles.calendarWeekHeader}>
                            {WEEKDAY_LABELS.map((label, idx) => (
                                <Text key={`${label}-${idx}`} style={styles.calendarWeekdayText}>{label}</Text>
                            ))}
                        </View>

                        <View style={[styles.calendarListWrap, listReady ? null : styles.calendarListHidden]}>
                            <FlashList
                                key={targetSignature || monthsCacheKey}
                                ref={listRef}
                                data={months}
                                keyExtractor={keyExtractor}
                                renderItem={renderMonth}
                                estimatedItemSize={estimatedItemSize}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.calendarScrollContent}
                                initialScrollIndex={initialScrollIndex}
                                onScrollToIndexFailed={({ index }) => {
                                    requestAnimationFrame(() => {
                                        try { listRef.current?.scrollToIndex({ index, animated: false }); } catch { }
                                    });
                                }}
                                extraData={monthsCacheKey}
                                ListEmptyComponent={renderEmpty}
                                overrideItemLayout={overrideItemLayout}
                                removeClippedSubviews
                            />
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
});

const DayDetailsSheet = ({
    /** OPTION A: explicit visibility */
    visible,

    /** OPTION B: toggle flag — any flip triggers expand */
    openToggle,

    /** Core context */
    date,
    workoutOn = false,         // optional — quick visual flag
    session,

    /** Actions */
    onClose,
    onStartWorkout,
    onOpenMacros,
    onChangeDate,
}) => {
    const bottomSheetRef = useRef(null);
    const navigation = useNavigation();
    const postCacheRef = useRef(new Map());
    const postSubscriptionsRef = useRef(new Map());
    const [postCacheVersion, setPostCacheVersion] = useState(0);
    const [activeCommentsPost, setActiveCommentsPost] = useState(null);
    const [commentsVisible, setCommentsVisible] = useState(false);
    const [commentsExpandSignal, setCommentsExpandSignal] = useState(0);
    const viewerData = (() => {
        try { return global?.userData || null; } catch { return null; }
    })();
    const viewerUid = viewerData?.uid ? String(viewerData.uid) : "";
    const { width: screenWidth } = useWindowDimensions();
    const [isExpanded, setIsExpanded] = useState(false);
    // Header date updates instantly as you swipe (independent from committed date)
    const [headerDate, setHeaderDate] = useState(date);
    const [headerHeight, setHeaderHeight] = useState(HEADER_HEIGHT);
    const snapPoints = useMemo(() => ["95%"], []);
    // Viewer overlay for inline detail panes
    const [viewerReady, setViewerReady] = useState(false);
    const listOpacity = useRef(new Animated.Value(1)).current;
    const viewerTranslateX = useRef(new Animated.Value(screenWidth)).current;
    // Yellow handle accent fades with viewer slide progress
    const HANDLE_NEUTRAL = "#D0D7E2";
    // Food viewer state
    const [selectedFood, setSelectedFood] = useState(null);
    // Horizontal pager ref
    const pagerRef = useRef(null);
    const listRef = useRef(null);
    const TOTAL_PAGES = 100000;
    const BASE_INDEX = Math.floor(TOTAL_PAGES / 2);
    const [baseIndex, setBaseIndex] = useState(BASE_INDEX);
    const [calendarVisible, setCalendarVisible] = useState(false);
    const [hasMountedCalendar, setHasMountedCalendar] = useState(false);

    // Expand helper that tolerates ref not being ready on first render
    const openSessionsRef = useRef([]);

    const expandSafely = useCallback((sessionId) => {
        let tries = 0;
        const tryExpand = () => {
            const ref = bottomSheetRef.current;
            if (ref && typeof ref.expand === "function") {
                try { ref.expand(); } catch { }
                setIsExpanded(true);
                if (sessionId != null) {
                    const queue = openSessionsRef.current;
                    if (queue[queue.length - 1] !== sessionId) queue.push(sessionId);
                }
            } else if (tries < 6) {
                tries += 1;
                requestAnimationFrame(tryExpand);
            }
        };
        tryExpand();
    }, []);

    const completedWorkouts = useMemo(() => (
        Array.isArray(global?.userData?.completedWorkouts) ? global.userData.completedWorkouts : []
    ), [(global?.userData?.completedWorkouts || [])]);

    const completedWorkoutsSignature = useMemo(() => {
        if (!completedWorkouts.length) return "empty";
        try {
            return completedWorkouts
                .map((w) => `${extractPidFromWorkout(w)}:${bestTimestamp(w) || 0}`)
                .join("|");
        } catch {
            return String(completedWorkouts.length);
        }
    }, [completedWorkouts]);

    const workoutPids = useMemo(() => {
        if (!completedWorkouts.length) return [];
        const set = new Set();
        completedWorkouts.forEach((w) => {
            const pid = extractPidFromWorkout(w);
            if (pid) set.add(pid);
        });
        return Array.from(set);
    }, [completedWorkouts, completedWorkoutsSignature]);

    const workoutPidsSignature = useMemo(() => {
        if (!workoutPids.length) return "none";
        try {
            return workoutPids.join("|");
        } catch {
            return String(workoutPids.length);
        }
    }, [workoutPids]);

    const subscribeToPost = useCallback((pid) => {
        if (!pid) return () => {};
        const postRef = doc(db, "posts", pid);
        let isActive = true;
        let attemptedFallback = false;

        const applyData = (sourcePid, data) => {
            if (!isActive) return;
            const payload = data ? { pid: sourcePid, ...data } : null;
            postCacheRef.current.set(pid, payload);
            setPostCacheVersion((v) => v + 1);
        };

        const fetchByField = async () => {
            if (attemptedFallback || !isActive) return;
            attemptedFallback = true;
            try {
                const q = query(collection(db, "posts"), where("pid", "==", pid), limit(1));
                const snap = await getDocs(q);
                if (snap.empty) {
                    applyData(pid, null);
                    return;
                }
                const docSnap = snap.docs[0];
                const data = docSnap.data() || {};
                const resolvedPid = String(data?.pid || docSnap.id || pid);
                applyData(resolvedPid, data);
            } catch (error) {
                console.warn("DayDetailsSheet: failed fallback fetch for post", pid, error);
            }
        };

        const unsubscribe = onSnapshot(
            postRef,
            (snap) => {
                if (!isActive) return;
                if (!snap.exists()) {
                    fetchByField();
                    return;
                }
                const data = snap.data() || {};
                const resolvedPid = String(data?.pid || snap.id || pid);
                applyData(resolvedPid, data);
            },
            (error) => {
                console.warn("DayDetailsSheet: post subscription error", pid, error);
                fetchByField();
            },
        );

        return () => {
            isActive = false;
            try { unsubscribe?.(); } catch { }
        };
    }, [setPostCacheVersion]);

    useEffect(() => {
        const subs = postSubscriptionsRef.current;
        const targetSet = new Set(workoutPids);

        subs.forEach((unsubscribe, pid) => {
            if (!targetSet.has(pid)) {
                try { unsubscribe?.(); } catch { }
                subs.delete(pid);
                postCacheRef.current.delete(pid);
            }
        });

        workoutPids.forEach((pid) => {
            if (!pid || subs.has(pid)) return;
            const unsubscribe = subscribeToPost(pid);
            subs.set(pid, unsubscribe);
        });

        return () => { };
    }, [workoutPidsSignature, workoutPids, subscribeToPost]);

    useEffect(() => () => {
        postSubscriptionsRef.current.forEach((unsubscribe) => {
            try { unsubscribe?.(); } catch { }
        });
        postSubscriptionsRef.current.clear();
    }, []);

    // explicit visible
    useEffect(() => {
        if (typeof visible === "undefined") return;
        if (visible) {
            // Make sure it expands even on the first mount
            expandSafely(session);
        } else {
            try { bottomSheetRef.current?.close(); } catch { }
            setIsExpanded(false);
        }
    }, [visible, session, expandSafely]);

    // any openToggle flip expands
    useEffect(() => {
        if (typeof visible !== "undefined") return;
        if (typeof openToggle === "undefined") return;
        expandSafely(session);
    }, [openToggle, visible, session, expandSafely]);

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
        // reset viewer if open
        if (selectedFood) {
            setSelectedFood(null);
            try { listOpacity.setValue(1); } catch { }
        }
        setIsExpanded(false);
        const queue = openSessionsRef.current;
        const closingSession = queue.shift();
        onClose?.(closingSession);
    }, [onClose, selectedFood, listOpacity]);

    const isToday = useMemo(() => dayKey(date) === dayKey(new Date()), [date]);
    const titleScale = useRef(new Animated.Value(1)).current;
    const handleTitlePress = useCallback(() => {
        // Bounce animation then jump to today
        try {
            Animated.sequence([
                Animated.timing(titleScale, { toValue: 0.94, duration: 90, useNativeDriver: true }),
                Animated.spring(titleScale, { toValue: 1, speed: 14, bounciness: 14, useNativeDriver: true }),
            ]).start();
        } catch { }
        if (!isToday) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            onChangeDate?.(today);
        }
    }, [isToday, onChangeDate, titleScale]);

    // Page-level components compute foodsList and calories per day

    const handleOpenMacros = useCallback(() => {
        bottomSheetRef.current?.close();
        onOpenMacros?.();
    }, [onOpenMacros]);

    const handleStartWorkout = useCallback(() => {
        bottomSheetRef.current?.close();
        onStartWorkout?.();
    }, [onStartWorkout]);

    const closeViewer = useCallback(() => {
        // Slide out overlay; header remains visible (always part of main screen)
        Animated.timing(viewerTranslateX, { toValue: screenWidth, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
            if (finished) {
                setSelectedFood(null);
                setViewerReady(false);
            }
        });
    }, [viewerTranslateX, screenWidth]);

    const openCommentsForPost = useCallback((postData) => {
        if (!postData || !postData.pid) return;
        setActiveCommentsPost(postData);
        setCommentsVisible(true);
        setCommentsExpandSignal(Date.now());
    }, []);

    const closeComments = useCallback(() => {
        setCommentsVisible(false);
        setActiveCommentsPost(null);
    }, []);

    useEffect(() => {
        if (!isExpanded) {
            closeComments();
        }
    }, [isExpanded, closeComments]);

    const openPastWorkoutScreen = useCallback((postData, fallbackWorkout) => {
        const workoutInput = postData?.workout || fallbackWorkout;
        if (!workoutInput) return;

        const fallback = {
            wid: workoutInput?.wid || workoutInput?.id,
            creatorUID: workoutInput?.creatorUID || workoutInput?.creatorUid || postData?.uid || viewerUid || "",
            created: workoutInput?.created || workoutInput?.createdAt || Date.now(),
            exercises: Array.isArray(workoutInput?.exercises) ? workoutInput.exercises : [],
            duration: workoutInput?.duration,
            volume: workoutInput?.volume,
            reps: workoutInput?.reps,
            PBs: workoutInput?.PBs ?? workoutInput?.pbs ?? 0,
            templateName: workoutInput?.templateName || workoutInput?.template?.name,
        };

        const mergedWorkout = { ...fallback, ...workoutInput };

        const ownerUid = String(postData?.uid || mergedWorkout.creatorUID || mergedWorkout.creatorUid || viewerUid || "");
        const ownerHandle = ensureAtHandle(postData?.handle || mergedWorkout.handle || mergedWorkout.username || "");
        const ownerName = postData?.name || mergedWorkout.ownerName || mergedWorkout.name || "";
        const ownerPfp = postData?.pfp || mergedWorkout.pfp || mergedWorkout.pfpUrl || mergedWorkout.photoURL || mergedWorkout.photo || "";
        const ownerPfpVersion = postData?.pfpVersion ?? mergedWorkout.pfpVersion ?? mergedWorkout.version ?? 0;

        const sanitizedWorkout = sanitizeWorkoutForRoute({
            ...mergedWorkout,
            creatorUID: ownerUid || mergedWorkout.creatorUID,
            creatorUid: ownerUid || mergedWorkout.creatorUid,
            handle: ownerHandle || mergedWorkout.handle,
            pfp: ownerPfp,
            pfpUrl: ownerPfp,
            pfpVersion: ownerPfpVersion,
            ownerName,
        });

        if (!sanitizedWorkout) return;

        const likeCount = Array.isArray(postData?.likes) ? postData.likes.length : toNumber(postData?.likeCount);
        const commentCount = Array.isArray(postData?.comments)
            ? Math.max(0, postData.comments.length - 1)
            : toNumber(postData?.commentCount);
        const likesForRoute = Array.isArray(postData?.likes) ? postData.likes.map(sanitizeEntry) : [];
        const mediaForRoute = Array.isArray(postData?.media) ? postData.media.map(sanitizeEntry) : [];
        const imagesForRoute = Array.isArray(postData?.images) ? postData.images.map(sanitizeEntry) : [];
        const tagsForRoute = Array.isArray(postData?.tags) ? [...postData.tags] : [];
        const taggedForRoute = Array.isArray(postData?.tagged) ? [...postData.tagged] : [];

        const params = {
            workout: sanitizedWorkout,
            owner: {
                uid: ownerUid,
                handle: ownerHandle,
                name: ownerName,
                pfp: ownerPfp,
                pfpVersion: ownerPfpVersion,
            },
            postMeta: {
                pid: postData?.pid ?? postData?.id ?? `${ownerUid}:${sanitizedWorkout?.wid ?? sanitizedWorkout?.id ?? ""}`,
                caption: typeof postData?.caption === "string" ? postData.caption : "",
                created: postData?.created ?? postData?.createdAt ?? sanitizedWorkout?.created ?? null,
                likeCount,
                commentCount,
                likes: likesForRoute,
                media: mediaForRoute,
                images: imagesForRoute,
                shareCount: toNumber(postData?.shareCount),
                tags: tagsForRoute,
                tagged: taggedForRoute,
            },
        };

        const routed = navigateOneWay("PastWorkout", { animation: "slide-from-right", params });
        if (!routed) {
            navigation?.navigate?.("PastWorkout", params);
        }
    }, [navigation, viewerUid]);

    const openProfileFromPost = useCallback((postData, fallbackWorkout) => {
        const source = postData || {};
        const workoutSource = fallbackWorkout || source?.workout || {};
        const targetUid = String(source.uid || workoutSource.uid || workoutSource.creatorUID || workoutSource.creatorUid || "");
        if (!targetUid) return;

        const rawHandle = source.handle || workoutSource.handle || workoutSource.username || "";
        const cleanHandle = ensureHandle(rawHandle);
        const name = source.name || workoutSource.ownerName || workoutSource.name || "";
        const pfp = source.pfp || workoutSource.pfp || workoutSource.pfpUrl || workoutSource.photoURL || workoutSource.photo || "";

        const meUid = String(global?.userData?.uid || "");
        const rootNav = navigation?.getParent?.("ROOT");

        if (targetUid === meUid) {
            if (rootNav?.navigate) rootNav.navigate("Profile", { transition: "slide-from-right" });
            else navigation?.navigate?.("Profile", { transition: "slide-from-right" });
            return;
        }

        const routeParams = { user: { uid: targetUid, handle: cleanHandle, name, pfp } };
        if (rootNav?.navigate) rootNav.navigate("ViewProfile", routeParams);
        else navigation?.navigate?.("ViewProfile", routeParams);
    }, [navigation]);

    const openProfileFromComment = useCallback((user) => {
        if (!user) return;
        const uid = String(user.uid || "");
        if (!uid) return;
        const meUid = String(global?.userData?.uid || "");
        const handle = ensureHandle(user.handle);
        const name = user.name || "";
        const pfp = user.pfp || user.pfpUrl || user.image || user.photoURL || "";
        const rootNav = navigation?.getParent?.("ROOT");

        if (uid === meUid) {
            if (rootNav?.navigate) rootNav.navigate("Profile", { transition: "slide-from-right" });
            else navigation?.navigate?.("Profile", { transition: "slide-from-right" });
            return;
        }

        const routeParams = { user: { uid, handle, name, pfp } };
        if (rootNav?.navigate) rootNav.navigate("ViewProfile", routeParams);
        else navigation?.navigate?.("ViewProfile", routeParams);
    }, [navigation]);

    useEffect(() => {
        if (!activeCommentsPost?.pid) return;
        const latest = postCacheRef.current.get(activeCommentsPost.pid);
        if (latest === null) {
            setActiveCommentsPost(null);
            setCommentsVisible(false);
            return;
        }
        if (latest && latest !== activeCommentsPost) {
            setActiveCommentsPost(latest);
        }
    }, [postCacheVersion, activeCommentsPost]);

    // Open food details overlay
    const openFood = useCallback((entry) => {
        if (!entry) return;
        const qty = typeof entry?.qty === 'number' ? entry.qty : (Number(entry?.qty) || 1);
        const macros = entry?.macros || parseMacrosFromDescription(entry?.desc || '', qty);
        const extras = parseExtraNutrientsFromDescription(entry?.desc || '', qty);
        setSelectedFood({ ...entry, qty, macros, extras });
        setViewerReady(true);
        try { viewerTranslateX.setValue(screenWidth); } catch {}
        try {
            Animated.timing(viewerTranslateX, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
        } catch { }
    }, [viewerTranslateX, screenWidth]);

    // Avoid mounting heavy pager until expanded or explicitly visible
    const shouldRenderContent = isExpanded || !!visible;

    // Back-swipe gesture (edge left-to-right) to close overlay
    const onBackUpdateX = useCallback((dx) => {
        try { viewerTranslateX.setValue(Math.max(0, dx || 0)); } catch { }
    }, [viewerTranslateX]);
    const onBackEnd = useCallback((dx, vx) => {
        const shouldClose = (dx || 0) > BACK_SWIPE_TRIGGER || (vx || 0) > 600;
        if (shouldClose) closeViewer();
        else {
            try {
                Animated.timing(viewerTranslateX, { toValue: 0, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
            } catch { }
        }
    }, [closeViewer, viewerTranslateX]);
    const backEligible = useSharedValue(0);
    const backPan = useMemo(() => (
        Gesture.Pan()
            // Restrict activation to the left-edge zone only
            .hitSlop({ left: 0, width: EDGE_BACK_GESTURE_WIDTH })
            .minDistance(8)
            .activeOffsetX([-16, 16])
            .failOffsetY([-12, 12])
            .onBegin((e) => { 'worklet'; backEligible.value = 1; })
            .onUpdate((e) => { 'worklet'; if (!backEligible.value) return; runOnJS(onBackUpdateX)(e.translationX); })
            .onEnd((e) => { 'worklet'; backEligible.value = 0; runOnJS(onBackEnd)(e.translationX, e.velocityX); })
            .onFinalize(() => { 'worklet'; backEligible.value = 0; })
    ), [backEligible, onBackEnd, onBackUpdateX]);

    // --- Helpers: build day data from global.userData ---
    const buildWorkoutsFromGlobal = useCallback((d) => {
        const targetKey = dayKey(d);
        if (!targetKey) return [];
        return completedWorkouts.filter((workout) => {
            const ts = bestTimestamp(workout) || workout?.created || workout?.createdAt || workout?.startedAt || workout?.finishedAt || workout?.completedAt || 0;
            const keyFromTimestamp = dayKey(ts);
            if (keyFromTimestamp) return keyFromTimestamp === targetKey;
            const explicitKey = typeof workout?.dayKey === "string" ? workout.dayKey : "";
            return explicitKey === targetKey;
        });
    }, [completedWorkouts, completedWorkoutsSignature]);

    const normalizeMealBucket = useCallback((m) => {
        const t = String(m || '').toLowerCase();
        if (t.startsWith('break')) return 'Breakfast';
        if (t.startsWith('lun')) return 'Lunch';
        if (t.startsWith('din')) return 'Dinner';
        return 'Snacks';
    }, []);

    const buildMealsFromGlobal = useCallback((d) => {
        const uid = String(global?.userData?.uid || '');
        const dk = dayKey(d);
        const buckets = { Breakfast: [], Lunch: [], Dinner: [], Snacks: [] };
        const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        try {
            const map = global?.userData?.loggedFoods || {};
            const looksNested = map && typeof map === 'object' && map[dk] && !('dayKey' in (Object.values(map)[0] || {}));
            const source = looksNested ? (map[dk] || {}) : map;
            const entries = Object.entries(source || {});
            for (const [k, entry] of entries) {
                const e = looksNested ? entry : (String(entry?.dayKey || '') === dk ? entry : null);
                if (!e) continue;
                const bucket = normalizeMealBucket(e?.meal);
                const macros = e?.macros || parseMacrosFromDescription(e?.desc || '', Number(e?.quantity) || 1);
                const qty = (() => {
                    const direct = Number(e?.quantity ?? e?.qty);
                    return Number.isFinite(direct) && direct > 0 ? direct : 1;
                })();
                const item = {
                    key: k,
                    name: e?.name || 'Food',
                    brand: e?.brand || '',
                    desc: e?.desc || '',
                    qty,
                    foodId: e?.foodId || e?.food_id || '',
                    macros,
                };
                buckets[bucket].push(item);
                totals.calories = Math.round((totals.calories || 0) + (Number(macros?.calories) || 0));
                totals.protein = Math.round((totals.protein || 0) + (Number(macros?.protein) || 0));
                totals.carbs = Math.round((totals.carbs || 0) + (Number(macros?.carbs) || 0));
                totals.fat = Math.round((totals.fat || 0) + (Number(macros?.fat) || 0));
            }
        } catch { /* ignore */ }

        return { meals: buckets, totals };
    }, [normalizeMealBucket]);

    const loggedFoodsCount = useMemo(() => {
        const map = global?.userData?.loggedFoods || {};
        try {
            const looksNested = map && typeof map === 'object' && Object.values(map)[0] && !('dayKey' in Object.values(map)[0]);
            if (!looksNested) return Object.keys(map).length;
            let n = 0; Object.values(map).forEach((m) => { n += Object.keys(m || {}).length; }); return n;
        } catch { return 0; }
    }, [global?.__loggedFoodsSig]);

    const calendarMarkedSet = useMemo(() => {
        const set = new Set();
        completedWorkouts.forEach((w) => {
            const key = dayKey(bestTimestamp(w) || w?.created || w?.createdAt || w?.dayKey || 0);
            if (key) set.add(key);
        });
        return set;
    }, [completedWorkouts, completedWorkoutsSignature]);

    // Current, prev, next day data from global (instant render)
    const prevDate = useMemo(() => shiftDate(date, -1), [date]);
    const nextDate = useMemo(() => shiftDate(date, 1), [date]);
    const currentData = useMemo(() => ({
        workouts: buildWorkoutsFromGlobal(date),
        ...buildMealsFromGlobal(date),
    }), [date, buildMealsFromGlobal, buildWorkoutsFromGlobal, loggedFoodsCount, completedWorkoutsSignature]);
    const prevData = useMemo(() => ({
        workouts: buildWorkoutsFromGlobal(prevDate),
        ...buildMealsFromGlobal(prevDate),
    }), [prevDate, buildMealsFromGlobal, buildWorkoutsFromGlobal, loggedFoodsCount, completedWorkoutsSignature]);
    const nextData = useMemo(() => ({
        workouts: buildWorkoutsFromGlobal(nextDate),
        ...buildMealsFromGlobal(nextDate),
    }), [nextDate, buildMealsFromGlobal, buildWorkoutsFromGlobal, loggedFoodsCount, completedWorkoutsSignature]);

    // No prefetch from Firestore: rely on global.userData.loggedFoods only

    // Inner component: one day's details page
    const DayDetailsPage = useCallback(({ dayWorkouts, dayMeals, dayTotals, dayCalories }) => {
        const foodsList = useMemo(() => {
            const buckets = ["Breakfast", "Lunch", "Dinner", "Snacks"];
            const out = [];
            for (const b of buckets) {
                const arr = Array.isArray(dayMeals?.[b]) ? dayMeals[b] : [];
                for (const it of arr) {
                    const qty = (() => {
                        if (typeof it?.qty === 'number') return it.qty;
                        if (typeof it?.quantity === 'number') return it.quantity;
                        const parsed = Number(it?.qty ?? it?.quantity);
                        return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
                    })();
                    const macros = it?.macros || parseMacrosFromDescription(it?.desc || '', qty);
                    out.push({
                        ...it,
                        name: it?.name || "Food",
                        desc: it?.desc || "",
                        qty,
                        bucket: b,
                        brand: it?.brand || '',
                        foodId: it?.foodId || it?.food_id || '',
                        macros,
                        key: it?.key || `${b}-${out.length}`,
                    });
                }
            }
            return out.slice(0, 8);
        }, [dayMeals]);

        const calsToShowPage = Number(dayTotals?.calories || dayCalories || 0);

        const renderFoodSummary = useCallback((entry) => {
            const qty = Number(entry?.qty ?? entry?.quantity ?? 1) || 1;
            const detailRaw = summarizeFood(entry?.desc || '', entry?.brand || '', qty);
            const detail = detailRaw.replace(/^\s*\d+(?:\.\d+)?\s*(?:kcal|cal(?:ories)?)\s*,?\s*/i, '').trim();
            const bucketLabel = entry?.bucket ? String(entry.bucket) : '';
            return [bucketLabel, detail].filter(Boolean).join(' · ');
        }, []);

        const workoutFeedPosts = useMemo(() => {
            if (!Array.isArray(dayWorkouts) || dayWorkouts.length === 0) return [];
            const list = dayWorkouts.slice(0, 3);
            return list.map((wk, idx) => {
                const pid = extractPidFromWorkout(wk);
                const cached = pid ? postCacheRef.current.get(pid) : undefined;
                const fallbackPost = buildFeedPostData(wk, idx);

                let postForRender = null;
                if (cached && typeof cached === "object") {
                    if (!cached.pid && fallbackPost?.pid) cached.pid = fallbackPost.pid;
                    if (wk) {
                        const mergedWorkout = { ...(cached.workout || {}), ...wk };
                        cached.workout = mergedWorkout;
                    }
                    postForRender = cached;
                } else if (cached === null) {
                    postForRender = fallbackPost;
                } else {
                    postForRender = fallbackPost;
                }

                if (!postForRender) return null;
                const key = postForRender.pid || pid || `${wk?.wid || wk?.id || idx}`;
                return { key, post: postForRender, workout: wk };
            }).filter(Boolean);
        }, [dayWorkouts, postCacheVersion]);

        return (
            <View style={styles.ctnr}>
                {/* Header is static above; this page starts with section content */}
                {/* ------- Workouts ------- */}
                <View style={styles.sectionHdrRow}>
                    <Text style={styles.sectionHdr}>Training</Text>
                </View>

                {(Array.isArray(dayWorkouts) && dayWorkouts.length > 0 && workoutFeedPosts.length > 0) ? (
                    workoutFeedPosts.map(({ key, post, workout }, idx) => (
                        <View key={key} style={styles.feedPostWrapper}>
                            <SimpleFeedPost
                                data={post}
                                index={idx}
                                highlightPid={null}
                                highlightSignal={0}
                                onPressWorkout={(_, data) => openPastWorkoutScreen(data || post, workout)}
                                onPressComments={(_, data) => openCommentsForPost(data || post)}
                                onPressLikes={() => { }}
                                onPressProfile={(_, data) => openProfileFromPost(data || post, workout)}
                                onPressShare={() => { }}
                            />
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyText}>No completed workouts for this day.</Text>
                    </View>
                )}

                {/* ------- Foods ------- */}
                <View style={[styles.sectionHdrRow, { marginTop: scaleSize(20) }]}>
                    <Text style={styles.sectionHdr}>Foods</Text>
                    <Text style={styles.sectionMeta}>{calsToShowPage.toLocaleString()} kcal</Text>
                </View>

                {foodsList.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyText}>No foods logged for this day.</Text>
                    </View>
                ) : (
                    <View style={styles.foodListCol}>
                        {foodsList.map((it, idx) => (
                            <MealItemCard
                                key={it?.key || `${it.bucket || 'food'}-${idx}`}
                                entry={it}
                                COLORS={FOOD_CARD_COLORS}
                                cardStyle={[styles.foodCard, idx === 0 ? styles.foodCardFirst : null]}
                                showCaloriesRight
                                onPress={openFood}
                                renderSummary={renderFoodSummary}
                                enableSwipe={false}
                            />
                        ))}
                    </View>
                )}

                {/* Actions */}
                {/* <View style={styles.actions}>
                    <Pressable
                        style={[styles.btn, styles.secondary]}
                        onPress={() => { try { haptic(); } catch {} handleOpenMacros(); }}
                    >
                        <Text style={[styles.btnText, styles.secondaryText]}>Open Macros</Text>
                    </Pressable>
                    {isTodayPage && (
                        <Pressable
                            style={[styles.btn, styles.primary]}
                            onPress={() => { try { haptic(); } catch {} handleStartWorkout(); }}
                        >
                            <Text style={[styles.btnText, styles.primaryText]}>Start Workout</Text>
                        </Pressable>
                    )}
                </View> */}
            </View>
        );
    }, [openFood, postCacheVersion, openPastWorkoutScreen, openCommentsForPost, openProfileFromPost]);

    // Static header (doesn't move when swiping pages)
    useEffect(() => {
        // Keep header in sync with committed date changes
        setHeaderDate(date);
    }, [date]);

    useEffect(() => {
        if (!visible) setCalendarVisible(false);
    }, [visible]);

    // Slide pages horizontally by delta days; always animate
    const slideBy = useCallback((delta) => {
        try {
            listRef.current?.scrollToIndex({ index: baseIndex + delta, animated: true });
        } catch {
            setTimeout(() => {
                try { listRef.current?.scrollToIndex({ index: baseIndex + delta, animated: true }); } catch {}
            }, 16);
        }
    }, [baseIndex]);

    const openCalendar = useCallback(() => setCalendarVisible(true), []);
    const closeCalendar = useCallback(() => setCalendarVisible(false), []);

    const handleCalendarSelect = useCallback((picked) => {
        if (!picked) return;
        const normalized = new Date(picked);
        if (Number.isNaN(normalized.getTime())) return;
        normalized.setHours(0, 0, 0, 0);
        setHeaderDate(normalized);
        onChangeDate?.(normalized);
        setCalendarVisible(false);
        try {
            requestAnimationFrame(() => {
                try { listRef.current?.scrollToIndex({ index: baseIndex, animated: false }); } catch { }
            });
        } catch { }
    }, [baseIndex, onChangeDate]);

    useEffect(() => {
        if (calendarVisible) setHasMountedCalendar(true);
    }, [calendarVisible]);

    const StaticHeaderRow = useMemo(() => {
        const title = fmt(headerDate) || "Select a date";
        return (
            <DateHeader
                title={title}
                onPrev={() => slideBy(-1)}
                onNext={() => slideBy(1)}
                onPressTitle={handleTitlePress}
                titleScale={titleScale}
                onLayout={(e) => {
                    try {
                        const h = e?.nativeEvent?.layout?.height || HEADER_HEIGHT;
                        if (h && Math.abs(h - headerHeight) > 1) setHeaderHeight(h);
                    } catch {}
                }}
                onOpenCalendar={openCalendar}
            />
        );
    }, [headerDate, handleTitlePress, titleScale, headerHeight, slideBy, openCalendar]);

    return (
        <>
            {(calendarVisible || hasMountedCalendar) && (
                <HistoryCalendarModal
                    visible={calendarVisible}
                    onClose={closeCalendar}
                    onSelectDate={handleCalendarSelect}
                    selectedDate={headerDate}
                    markedDayKeys={calendarMarkedSet}
                />
            )}
            <View style={styles.outerContainer} pointerEvents="box-none">
                <BottomSheet
                    ref={bottomSheetRef}
                    index={-1}
                    snapPoints={snapPoints}
                    enablePanDownToClose
                    enableContentPanningGesture={true}
                    enableHandlePanningGesture={true}
                    backdropComponent={renderBackdrop}
                    handleComponent={() => (
                    <View style={styles.handleWrap}>
                        <View style={{ alignItems: 'center', paddingVertical: scaleSize(8) }}>
                            <View
                                style={{
                                    width: scaleSize(42),
                                    height: scaleSize(4),
                                    borderRadius: scaleSize(2),
                                    backgroundColor: HANDLE_NEUTRAL,
                                }}
                            />
                        </View>
                    </View>
                    )}
                    backgroundStyle={styles.bottomSheetBackground}
                    simultaneousHandlers={listRef}
                    onClose={handleClose}
                >
                {/* Content (static header + horizontally paged days via VirtualizedList) */}
                <BottomSheetView style={{ flex: 1 }}>
                    {!shouldRenderContent ? null : (
                    <Animated.View style={{ flex: 1, opacity: listOpacity }}>
                        {StaticHeaderRow}
                        <VirtualizedList
                            ref={listRef}
                            style={{ flex: 1 }}
                            horizontal
                            pagingEnabled
                            directionalLockEnabled
                            decelerationRate="fast"
                            bounces={false}
                            overScrollMode="never"
                            scrollEventThrottle={16}
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={(item, index) => String(index)}
                            getItemCount={() => TOTAL_PAGES}
                            getItem={(_data, index) => index}
                            initialScrollIndex={baseIndex}
                            getItemLayout={(_data, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
                            onLayout={() => {
                                try { listRef.current?.scrollToIndex({ index: baseIndex, animated: false }); } catch { }
                            }}
                            onScroll={(e) => {
                                try {
                                    const x = e?.nativeEvent?.contentOffset?.x || 0;
                                    const nextIndex = Math.round(x / (screenWidth || 1));
                                    const delta = nextIndex - baseIndex;
                                    const predicted = shiftDate(date, delta);
                                    setHeaderDate(predicted);
                                } catch {}
                            }}
                            onContentSizeChange={() => {
                                try { listRef.current?.scrollToIndex({ index: baseIndex, animated: false }); } catch { }
                            }}
                            onScrollToIndexFailed={({ index }) => {
                                setTimeout(() => {
                                    try { listRef.current?.scrollToIndex({ index, animated: true }); } catch { }
                                }, 16);
                            }}
                            onMomentumScrollEnd={(e) => {
                                const x = e?.nativeEvent?.contentOffset?.x || 0;
                                const nextIndex = Math.round(x / (screenWidth || 1));
                                if (Number.isFinite(nextIndex) && nextIndex !== baseIndex) {
                                    const delta = nextIndex - baseIndex;
                                    setBaseIndex(nextIndex);
                                    onChangeDate?.(shiftDate(date, delta));
                                }
                            }}
                            renderItem={({ index }) => {
                                const offset = index - baseIndex;
                                const d = shiftDate(date, offset);
                                const data = offset === -1 ? prevData : offset === 0 ? currentData : offset === 1 ? nextData : {
                                    workouts: buildWorkoutsFromGlobal(d),
                                    ...buildMealsFromGlobal(d),
                                };
                                return (
                                    <ScrollView
                                        style={{ width: screenWidth }}
                                        contentContainerStyle={styles.scrollContent}
                                        directionalLockEnabled
                                        nestedScrollEnabled
                                        showsVerticalScrollIndicator={false}
                                    >
                                        <DayDetailsPage
                                            dayWorkouts={data.workouts}
                                            dayMeals={data.meals}
                                            dayTotals={data.totals}
                                            dayCalories={data.totals?.calories || 0}
                                        />
                                    </ScrollView>
                                );
                            }}
                            windowSize={5}
                            initialNumToRender={3}
                            removeClippedSubviews={false}
                        />
                    </Animated.View>
                    )}
                </BottomSheetView>

                {/* Viewer overlay */}
                <OverlayContainer translateX={viewerTranslateX} gesture={backPan} visible={!!selectedFood}>
                        <View style={{ flex: 1 }}>
                            {!selectedFood || !viewerReady ? null : (
                                <FoodDetailInline
                                    entry={{
                                        name: selectedFood?.name,
                                        brand: selectedFood?.brand,
                                        desc: selectedFood?.desc,
                                        quantity: selectedFood?.qty,
                                        foodId: selectedFood?.foodId,
                                    }}
                                    onClose={closeViewer}
                                    containerStyle={{
                                        flex: 1,
                                        backgroundColor: theme.bg,
                                    }}
                                />
                            )}
                        </View>
                </OverlayContainer>
                </BottomSheet>
            </View>
            <CommentsBottomSheet
                isVisible={commentsVisible && !!activeCommentsPost}
                postData={activeCommentsPost}
                commentsBottomSheetExpandFlag={commentsExpandSignal}
                toViewProfile={openProfileFromComment}
                onShowLikesSheet={() => {}}
                onDismiss={closeComments}
            />
        </>
    );
};

const styles = StyleSheet.create({
    outerContainer: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, zIndex: 1 },
    bottomSheetBackground: { borderTopLeftRadius: scaleSize(20), borderTopRightRadius: scaleSize(20), backgroundColor: theme.bg },
    scrollContent: { paddingBottom: scaleSize(18) },
    invisibleHandle: { display: 'none' },
    handleWrap: { borderTopLeftRadius: scaleSize(20), borderTopRightRadius: scaleSize(20) },
    ctnr: { flex: 1, paddingHorizontal: scaleSize(16), paddingTop: scaleSize(8), paddingBottom: scaleSize(16) },
    feedPostWrapper: { marginHorizontal: -scaleSize(16) },
    

    sectionHdrRow: { marginTop: scaleSize(6), marginBottom: scaleSize(6), flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
    sectionHdr: { fontFamily: "Outfit_700Bold", fontSize: scaleSize(14.5), color: theme.textPrimary },
    sectionMeta: { fontFamily: "Outfit_600SemiBold", fontSize: scaleSize(12.5), color: theme.textSecondary },
    metaOn: { color: theme.primary },
    metaOff: { color: theme.textSecondary },

    emptyCard: {
        marginHorizontal: -scaleSize(16),
        borderRadius: 0,
        paddingVertical: scaleSize(14),
        paddingHorizontal: scaleSize(16),
        backgroundColor: theme.surface,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
    },
    emptyText: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12.5),
        color: theme.textSecondary,
    },

    

    // Food cards mimic MacroTracking under-meal list styling
    foodListCol: {
        marginBottom: 0,
        marginHorizontal: -scaleSize(16),
        paddingHorizontal: 0,
    },
    foodCard: {
        borderWidth: 0,
        borderRadius: 0,
        paddingVertical: scaleSize(10),
        paddingHorizontal: scaleSize(26),
        marginVertical: 0,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
        shadowOpacity: 0,
        elevation: 0,
        backgroundColor: theme.surface,
    },
    foodCardFirst: {
        borderTopWidth: StyleSheet.hairlineWidth,
    },

    // Food details overlay
    // Obsolete inline detail styles kept for reference
    // foodDetailHeader, foodDetailCard, etc. no longer used

    actions: { flexDirection: "row", gap: scaleSize(10), marginTop: scaleSize(14) },
    btn: { flex: 1, paddingVertical: scaleSize(10), borderRadius: scaleSize(12), alignItems: "center", justifyContent: "center" },
    primary: { backgroundColor: theme.primary },
    primaryText: { color: "#fff" },
    secondary: { backgroundColor: theme.field },
    secondaryText: { color: theme.textPrimary },
    btnText: { fontFamily: "Outfit_700Bold", fontSize: scaleSize(14) },

    calendarModalRoot: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    calendarBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
    calendarModalContent: { flex: 1, width: '100%', alignItems: 'center', paddingHorizontal: scaleSize(18) },
    calendarCard: {
        width: '100%',
        height: '90%',
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
    calendarHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: scaleSize(20),
    },
    calendarCloseBtn: {
        width: scaleSize(34),
        height: scaleSize(34),
        borderRadius: scaleSize(12),
        backgroundColor: '#39414fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    calendarTitle: {
        fontFamily: 'Nunito_800ExtraBold',
        fontSize: scaleSize(16),
        color: theme.textPrimary,
    },
    calendarHeaderSpacer: { width: scaleSize(34), height: scaleSize(34) },
    calendarWeekHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: scaleSize(12),
    },
    calendarWeekdayText: {
        flex: 1,
        textAlign: 'center',
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(12.5),
        color: theme.muted,
    },
    calendarScrollContent: { paddingBottom: scaleSize(28) },
    calendarMonthBlock: { marginBottom: scaleSize(22) },
    calendarMonthLabel: {
        fontFamily: 'Nunito_800ExtraBold',
        fontSize: scaleSize(15.5),
        color: theme.textPrimary,
        marginBottom: scaleSize(10),
    },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    calendarCell: {
        width: '14.2857%',
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: scaleSize(12),
    },
    calendarDayCircle: {
        width: scaleSize(36),
        height: scaleSize(36),
        borderRadius: scaleSize(18),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.fieldDeep,
    },
    calendarDayLogged: {
        backgroundColor: 'rgba(45, 158, 255, 0.26)',
    },
    calendarDayToday: {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.primary,
    },
    calendarDaySelected: {
        borderWidth: scaleSize(2),
        borderColor: theme.success,
    },
    calendarDayText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(13),
        color: theme.textSecondary,
    },
    calendarDayTextActive: { color: theme.textPrimary },
    calendarListWrap: { flex: 1, alignSelf: 'stretch' },
    calendarListHidden: { opacity: 0 },
    calendarLoadingWrap: { paddingVertical: scaleSize(40), alignItems: 'center', justifyContent: 'center' },
    calendarLoadingText: { fontFamily: 'Outfit_600SemiBold', fontSize: scaleSize(12.5), color: theme.textSecondary },

    // Position toast near the top of the overlay content
    toastWrap: {
        position: "absolute",
        left: 0,
        right: 0,
        top: scaleSize(14),
        alignItems: "center",
        zIndex: 40,
    },
    lockedWrap: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scaleSize(28),
    },
    lockedTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(16),
        color: theme.textPrimary,
        marginBottom: scaleSize(6),
        textAlign: "center",
    },
    lockedSubtitle: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(13),
        color: theme.textSecondary,
        textAlign: "center",
    },
});

export default memo(DayDetailsSheet);
