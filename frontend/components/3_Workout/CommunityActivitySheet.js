// components/3_Workout/CommunityActivitySheet.jsx
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    SectionList,
    Animated,
    Dimensions,
    ActivityIndicator,
    InteractionManager,
    Easing,
} from "react-native";
import FastImage from "react-native-fast-image";
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import theme from "../../theme/mfpDark";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import SpectatingWorkoutModal from "./NewWorkout/SpectatingWorkoutModal";
import { getPfpUrl } from "../../pfpCache";
import { onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase.config";
import calculate1RM from "../../helper/calculate1RM";
import { useNavigation } from "@react-navigation/native";

import scaleSize from "../../helper/scaleSize";
import WorkoutPanelCard from "./ui/WorkoutPanelCard";
import { sanitizeStatsForViewer } from "../../utils/workoutPrivacy";
import { buildExerciseSummaries } from "../../utils/workoutSummary";
import { usePfp } from "../../helper/usePFPs";

const { height: screenHeight, width: screenWidth } = Dimensions.get("window");
const scale = screenHeight / 844;
const s = (n) => Math.round(n * scale);

// Static separators to avoid re-creating functions each render
const CARD_GAP = 14;
const LIST_HORIZONTAL_PADDING = scaleSize(s(14));
const SectionSeparator = () => <View style={{ height: scaleSize(CARD_GAP) }} />;

const COLORS = {
    bg: theme.bg,
    card: theme.surface,
    text: theme.textPrimary,
    subtext: theme.textSecondary,
    hairline: theme.hairline,
    iconBg: theme.field,
    statBg: theme.field,
    statBorder: theme.hairline,
};

const HANDLE_SELF = "#D0D7E2";
const HANDLE_FRIEND_ACCENT = "#E0A500";
const HANDLE_FRIEND_BACKGROUND = "#e0a4002c";
const EDGE_BACK_GESTURE_WIDTH = 200; // px — left-edge zone to trigger back
const BACK_SWIPE_TRIGGER = 36;      // px — horizontal drag to confirm back

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
    item?.workout?.name ??
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
const dateTimeLabel = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    let timePart = "";
    try {
        timePart = d
            .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })
            .toLowerCase()
            .replace(/[\s.]/g, "");
    } catch {
        timePart = "";
    }
    const datePart = dateLabel(ts);
    if (timePart && datePart) return `${timePart}, ${datePart}`;
    return timePart || datePart;
};

const clampStat = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return num < 0 ? 0 : num;
};

const sumVolumeReps = (exercises) => {
    let volumeTotal = 0;
    let repsTotal = 0;
    if (!Array.isArray(exercises)) return { volume: 0, reps: 0 };
    for (const ex of exercises) {
        const sets = Array.isArray(ex?.sets) ? ex.sets : [];
        for (const set of sets) {
            const weight = Number(set?.weight) || 0;
            const reps = Number(set?.reps) || 0;
            volumeTotal += weight * reps;
            repsTotal += reps;
        }
    }
    return { volume: volumeTotal, reps: repsTotal };
};

const formatDuration = (durationMs) => {
    const ms = Number(durationMs);
    if (!Number.isFinite(ms) || ms <= 0) return "--";
    const totalMinutes = Math.max(0, Math.round(ms / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    if (totalSeconds >= 60) {
        const mins = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${mins}m ${seconds}s`;
    }
    return `${totalSeconds}s`;
};

const formatNumber = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "--";
    try {
        return num.toLocaleString();
    } catch {
        return String(num);
    }
};

const resolveWorkoutTitle = (workout, fallback) => (
    workout?.templateName ||
    workout?.template?.name ||
    workout?.name ||
    fallback ||
    "Workout"
);

const resolveWeightUnit = () => {
    try {
        const raw = global?.userData?.settings?.units || global?.userData?.units;
        if (!raw) return "lb";
        const normalized = String(raw).toLowerCase();
        return normalized === "kg" ? "kg" : "lb";
    } catch {
        return "lb";
    }
};

const computeWorkoutStats = (item, overlay) => {
    const liveOverlay = overlay || {};
    let volume = liveOverlay.volume;
    if (volume == null) volume = item?.volume;
    let reps = liveOverlay.reps;
    if (reps == null) reps = item?.reps ?? item?.totalReps;
    let pbs = liveOverlay.PBs;
    if (pbs == null) pbs = liveOverlay.pbs;
    if (pbs == null) pbs = item?.PBs ?? item?.pbs;

    // Coerce to numbers so we can validate fallbacks
    volume = Number(volume);
    reps = Number(reps);
    pbs = Number(pbs);

    if (!Number.isFinite(pbs)) pbs = 0;

    if (!Number.isFinite(volume) || volume <= 0 || !Number.isFinite(reps) || reps <= 0) {
        const fromOverlay = sumVolumeReps(liveOverlay?.exercises);
        if (!Number.isFinite(volume) || volume <= 0) volume = fromOverlay.volume;
        if (!Number.isFinite(reps) || reps <= 0) reps = fromOverlay.reps;

        if (!Number.isFinite(volume) || volume <= 0 || !Number.isFinite(reps) || reps <= 0) {
            const fromWorkout = sumVolumeReps(item?.workout?.exercises);
            if (!Number.isFinite(volume) || volume <= 0) volume = fromWorkout.volume;
            if (!Number.isFinite(reps) || reps <= 0) reps = fromWorkout.reps;
        }
    }

    return {
        volume: clampStat(volume),
        reps: clampStat(reps),
        pbs: clampStat(pbs),
    };
};

const getPfpUri = (item) => (
    item?.pfp ||
    item?.pfpUri ||
    item?.pfpUrl ||
    item?.photoURL ||
    item?.photo ||
    item?.avatar ||
    item?.image ||
    ""
);

const formatStatNumber = (value) => {
    if (value == null) return "0";
    const numeric = Number(value) || 0;
    const safe = numeric < 1000 ? Math.round(numeric) : Math.round(numeric);
    try {
        return safe.toLocaleString();
    } catch {
        return String(safe);
    }
};

const coerceWeeklyGoal = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return 0;
    return Math.round(num);
};

const friendMetaFrom = (value) => {
    if (!value) return null;
    if (typeof value === "string" || typeof value === "number") {
        const uid = String(value).trim();
        return uid ? { uid } : null;
    }
    if (typeof value === "object") {
        const uid = String(value?.uid || value?.id || value?.userId || "").trim();
        if (!uid) return null;
        return {
            uid,
            handle: value?.handle || value?.username || value?.userName || "",
            name: value?.name || value?.displayName || "",
            pfp: value?.pfp || value?.pfpUri || value?.photoURL || value?.photo || value?.avatar || value?.image || "",
            pfpVersion: value?.pfpVersion ?? value?.version ?? 0,
            weeklyGoal: coerceWeeklyGoal(value?.weeklyGoal ?? value?.weeklyWorkoutGoal ?? value?.workoutGoal ?? value?.goal),
        };
    }
    return null;
};

const mergeMetaIntoEntry = (entry, meta) => {
    if (!entry || !meta) return entry;
    if (meta.name && !entry.name) entry.name = meta.name;
    if (meta.handle && !entry.handle) entry.handle = meta.handle;
    if (meta.pfp && !entry.pfp) entry.pfp = meta.pfp;
    if ((meta.pfpVersion ?? 0) > (entry.pfpVersion ?? 0)) entry.pfpVersion = meta.pfpVersion ?? 0;
    const incomingGoal = coerceWeeklyGoal(meta?.weeklyGoal ?? meta?.weeklyWorkoutGoal ?? meta?.goal ?? meta?.workoutGoal);
    if (incomingGoal > 0) {
        const currentGoal = coerceWeeklyGoal(entry?.weeklyGoal);
        if (currentGoal <= 0) entry.weeklyGoal = incomingGoal;
    }
    return entry;
};

/* ---------------- grouping ---------------- */
const startOfToday = (now = new Date()) => { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; };
const startOfWeekSunday = (now = new Date()) => { const d = startOfToday(now); d.setDate(d.getDate() - d.getDay()); return d; };

const sortFriendsItems = (items, liveOverlays) => {
    const overlayMap = liveOverlays || {};
    const src = Array.isArray(items) ? items : [];
    if (src.length <= 1) return src.slice();
    const score = (it) => {
        if (!it) return 0;
        if (it?.live) {
            const uid = String(it?.uid ?? "");
            const overlay = uid ? overlayMap[uid] : undefined;
            return overlay?.ts || toMillis(it?.startedAt) || bestTimestamp(it);
        }
        return bestTimestamp(it);
    };
    const arr = src.slice();
    arr.sort((a, b) => score(b) - score(a));
    return arr;
};

const shallowArrayEqual = (a, b) => {
    if (a === b) return true;
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
        if (a[i] !== b[i]) return false;
    }
    return true;
};

const LiveWorkoutPost = memo(({
    item,
    overlay,
    onPress,
    highlight = false,
    pfpUri,
    exerciseSummaries = [],
    durationSeconds = 0,
}) => {
    const handlePress = useCallback(() => {
        onPress?.();
    }, [onPress]);

    const resolvedPfp = usePfp(
        item?.uid ? String(item.uid) : "",
        item?.pfpVersion ?? 0,
        pfpUri || getPfpUri(item)
    );

    const displayName = useMemo(() => {
        const name = (item?.name || "").trim();
        if (name) return name;
        const handle = (
            item?.handle ??
            item?.username ??
            item?.userName ??
            ""
        );
        const normalized = String(handle).trim();
        if (normalized) return normalized;
        return "Friend";
    }, [item?.name, item?.handle, item?.username, item?.userName]);

    const timestamp = useMemo(() => dateTimeLabel(bestTimestamp(item)), [item]);

    const workout = item?.workout || null;
    const caption = (item?.caption || "").trim();
    const title = resolveWorkoutTitle(workout, caption);
    const workoutName = useMemo(() => {
        if (!workout) return "";
        const candidate =
            workout?.templateName ||
            workout?.template?.name ||
            workout?.name ||
            "";
        return typeof candidate === "string" ? candidate.trim() : String(candidate || "").trim();
    }, [workout]);

    const isWorkoutTitle = useMemo(() => {
        if (!workoutName) return false;
        const normalizedTitle = (title || "").trim();
        if (!normalizedTitle) return false;
        return normalizedTitle.toLowerCase() === workoutName.toLowerCase();
    }, [title, workoutName]);

    const shouldShowSubtitle = useMemo(() => {
        if (!caption) return false;
        const normalizedCaption = caption.toLowerCase();
        const normalizedTitle = (title || "").trim().toLowerCase();
        if (!normalizedTitle) return true;
        return normalizedCaption !== normalizedTitle;
    }, [caption, title]);

    const weightUnit = resolveWeightUnit();

    const stats = useMemo(() => computeWorkoutStats(item, overlay), [item, overlay]);

    const durationLabel = useMemo(() => {
        const seconds = Number(durationSeconds);
        if (Number.isFinite(seconds) && seconds > 0) {
            return formatDuration(seconds * 1000);
        }
        const fallbackMs = Number(workout?.duration);
        return formatDuration(Number.isFinite(fallbackMs) ? fallbackMs : 0);
    }, [durationSeconds, workout?.duration]);

    const volumeLabel = useMemo(() => formatNumber(stats.volume), [stats.volume]);
    const recordsLabel = useMemo(() => formatNumber(stats.pbs ?? 0), [stats.pbs]);

    const fallbackInitials = useMemo(() => {
        const basis = (item?.name || item?.handle || item?.username || "").replace(/^@/, "");
        return initials(basis);
    }, [item?.name, item?.handle, item?.username]);

    const hasSummaries = Array.isArray(exerciseSummaries) && exerciseSummaries.length > 0;

    const cardStyle = useMemo(() => [
        livePostStyles.card,
        highlight && livePostStyles.cardHighlight,
    ], [highlight]);

    const volumeDisplay = useMemo(() => {
        if (!volumeLabel || volumeLabel === "--") return "--";
        return `${volumeLabel} ${weightUnit}`;
    }, [volumeLabel, weightUnit]);

    return (
        <Pressable
            onPress={onPress ? handlePress : undefined}
            style={({ pressed }) => (
                pressed
                    ? [...cardStyle, livePostStyles.cardPressed]
                    : cardStyle
            )}
        >
            <View style={livePostStyles.sectionTop}>
                <View style={livePostStyles.headerRow}>
                    <View style={livePostStyles.headerLeft}>
                        <View style={livePostStyles.avatarWrap}>
                            {resolvedPfp ? (
                                <FastImage
                                    source={{
                                        uri: resolvedPfp,
                                        priority: FastImage.priority.high,
                                        cache: FastImage.cacheControl.immutable,
                                    }}
                                    style={livePostStyles.avatar}
                                    resizeMode={FastImage.resizeMode.cover}
                                />
                            ) : (
                                <View style={[livePostStyles.avatar, livePostStyles.avatarFallback]}>
                                    <Text style={livePostStyles.avatarInitials}>{fallbackInitials}</Text>
                                </View>
                            )}
                        </View>
                        <View style={livePostStyles.headerTextCol}>
                            <Text style={livePostStyles.nameText} numberOfLines={1}>
                                {displayName}
                            </Text>
                            {!!timestamp && (
                                <Text style={livePostStyles.timestampText} numberOfLines={1}>
                                    {timestamp}
                                </Text>
                            )}
                        </View>
                    </View>

                    <View style={livePostStyles.liveBadge}>
                        <View style={livePostStyles.liveBadgeDot} />
                        <Text style={livePostStyles.liveBadgeText}>LIVE</Text>
                    </View>
                </View>

                <View style={livePostStyles.titleBlock}>
                    <Text style={[livePostStyles.titleText, isWorkoutTitle ? livePostStyles.workoutTitleText : null]} numberOfLines={2}>
                        {title}
                    </Text>
                    {shouldShowSubtitle ? (
                        <Text style={livePostStyles.captionText} numberOfLines={3}>
                            {caption}
                        </Text>
                    ) : null}
                </View>
            </View>

            <View style={livePostStyles.metricsRow}>
                <View style={livePostStyles.metricsLeft}>
                    <View style={livePostStyles.metricColumnLeft}>
                        <Text style={livePostStyles.metricLabel}>Duration</Text>
                        <Text style={livePostStyles.metricValue}>{durationLabel}</Text>
                    </View>

                    <View style={[livePostStyles.metricColumnLeft, livePostStyles.metricCenter]}>
                        <Text style={livePostStyles.metricLabel}>Volume</Text>
                        <Text style={livePostStyles.metricValue}>{volumeDisplay}</Text>
                    </View>
                </View>

                <View style={[livePostStyles.metricColumn, livePostStyles.metricRight]}>
                    <Text style={livePostStyles.metricLabel}>Records</Text>
                    <View style={livePostStyles.recordsValueRow}>
                        <MaterialCommunityIcons name="medal" size={scaleSize(16)} color="#FFD700" style={livePostStyles.recordsIconFirst} />
                        <MaterialCommunityIcons name="medal" size={scaleSize(16)} color="#C0C0C0" style={livePostStyles.recordsIcon} />
                        <MaterialCommunityIcons name="medal" size={scaleSize(16)} color="#CD7F32" style={livePostStyles.recordsIcon} />
                        <Text style={[livePostStyles.metricValue, livePostStyles.recordsValueText]}>{recordsLabel}</Text>
                    </View>
                </View>
            </View>

            {hasSummaries ? (
                <View style={livePostStyles.workoutSummaryBlock}>
                    <View style={livePostStyles.workoutSummaryHeader}>
                        <Text style={[livePostStyles.workoutSummaryHeaderText, livePostStyles.workoutSummaryHeaderExercise]}>Exercise</Text>
                        <Text style={[livePostStyles.workoutSummaryHeaderText, livePostStyles.workoutSummaryHeaderBest]}>Best Set</Text>
                    </View>
                    {exerciseSummaries.map((row, idx) => {
                        const key = `${row.exercise || 'exercise'}-${idx}`;
                        const isLast = idx === exerciseSummaries.length - 1;
                        return (
                            <View
                                style={[livePostStyles.workoutSummaryRow, !isLast && livePostStyles.workoutSummaryRowBorder]}
                                key={key}
                            >
                                <Text style={livePostStyles.workoutSummaryExercise} numberOfLines={1}>{row.exercise || 'Exercise'}</Text>
                                <Text style={livePostStyles.workoutSummaryBest} numberOfLines={1}>{row.bestSet || '--'}</Text>
                            </View>
                        );
                    })}
                </View>
            ) : null}
        </Pressable>
    );
});

/* ---------------- row ---------------- */
const FriendPanel = memo(({ item, overlay, onSelect, highlight = false }) => {
    const isLive = !!item?.live;

    // Local ticker only for live rows → avoids re-rendering the whole list every second
    const [, setTick] = useState(0);
    useEffect(() => {
        if (!isLive) return;
        const id = setInterval(() => setTick((t) => (t + 1) % 1_000_000), 1000);
        return () => clearInterval(id);
    }, [isLive]);

    const started = isLive ? (toMillis(item?.startedAt) ?? toMillis(item?.created)) : undefined;
    const durationSec = isLive
        ? toSec(Math.max(0, started ? Math.round((Date.now() - started) / 1000) : 0))
        : Math.max(0, Math.round(Number(item?.duration || 0) * 60));

    const stats = useMemo(() => computeWorkoutStats(item, overlay), [item, overlay]);
    const vol = stats.volume;
    const reps = stats.reps;
    const pbs = stats.pbs;

    const pfpUri = getPfpUri(item);

    // Only consider it template-based when underlying workout carries a tid
    const hasTemplate = item?.workout && item.workout.tid != null;

    const timestamp = bestTimestamp(item);
    const metaParts = [handleText(item)];
    const dateTime = dateTimeLabel(timestamp);
    if (dateTime) metaParts.push(dateTime);
    const exerciseSummaries = buildExerciseSummaries(item?.workout);

    const handleSelect = useCallback(() => onSelect?.(item, pfpUri), [onSelect, item, pfpUri]);

    if (isLive) {
        return (
            <LiveWorkoutPost
                item={item}
                overlay={overlay}
                onPress={handleSelect}
                highlight={highlight}
                pfpUri={pfpUri}
                exerciseSummaries={exerciseSummaries}
                durationSeconds={durationSec}
            />
        );
    }

    return (
        <WorkoutPanelCard
            onPress={handleSelect}
            highlight={highlight}
            uid={item?.uid}
            pfpVersion={item?.pfpVersion || 0}
            pfpUri={pfpUri}
            fallbackLabel={initials(item?.name)}
            title={templateName(item)}
            titleStyle={hasTemplate ? styles.templateTitleBlue : null}
            metaParts={metaParts}
            isLive={isLive}
            liveDurationSeconds={durationSec}
            durationSeconds={durationSec}
            volume={vol}
            reps={reps}
            pbs={pbs}
            exerciseSummaries={exerciseSummaries}
        />
    );
}, (prev, next) => {
    // Custom comparator to minimize re-renders
    const a = prev.item || {}; const b = next.item || {};
    const sameId = String(a.id || a.wid || a.uid || '') === String(b.id || b.wid || b.uid || '');
    const sameLive = !!a.live === !!b.live;
    const sameStatic =
        sameId && sameLive &&
        (a.pfpVersion === b.pfpVersion) &&
        (a.pfp === b.pfp) && (a.pfpUrl === b.pfpUrl) && (a.photoURL === b.photoURL) &&
        (a.name === b.name) && (a.handle === b.handle) && (a.templateName === b.templateName) &&
        (a.duration === b.duration) && (a.volume === b.volume) && (a.reps === b.reps) && (a.PBs === b.PBs) &&
        (prev.highlight === next.highlight);
    if (!sameStatic) return false;
    const po = prev.overlay || {}; const no = next.overlay || {};
    return (
        po.volume === no.volume &&
        po.reps === no.reps &&
        po.PBs === no.PBs &&
        (po.exercises?.length || 0) === (no.exercises?.length || 0)
    );
});

const ContributionRow = memo(({ entry, isFirst = false }) => {
    if (!entry) return null;

    const {
        name = "",
        handle = "",
        pfp: entryPfp,
        pfpUri: entryPfpUri,
        volume = 0,
        reps = 0,
        pbs = 0,
    } = entry;

    const rawPfp = entryPfpUri || entryPfp || getPfpUri(entry);
    const resolvedPfp = usePfp(entry?.uid, entry?.pfpVersion ?? 0, rawPfp || undefined);
    const fallbackLabel = initials(name || handle);
    const stats = useMemo(() => ([
        { key: "reps", label: "reps", value: formatStatNumber(reps) },
        { key: "volume", label: "lbs", value: formatStatNumber(volume) },
        { key: "prs", label: "prs", value: formatStatNumber(pbs) },
    ]), [volume, reps, pbs]);
    const weeklyGoal = coerceWeeklyGoal(entry?.weeklyGoal ?? entry?.weeklyWorkoutGoal ?? entry?.goal);
    const workoutsCompleted = useMemo(() => {
        const raw = Number(entry?.workouts);
        if (!Number.isFinite(raw) || raw <= 0) return 0;
        return Math.round(raw);
    }, [entry?.workouts]);
    const contributionSubtext = useMemo(() => {
        let str = '';
        if (workoutsCompleted <= 0) {
            str = weeklyGoal > 0 ? `0/${weeklyGoal} workouts` : "No workouts";
        }
        else if (weeklyGoal > 0) {
            str = `${workoutsCompleted}/${weeklyGoal} workouts`;
        }
        else if (workoutsCompleted === 1) str = "1 workout";
        else str = `${workoutsCompleted} workouts`;
        return str;
    }, [weeklyGoal, workoutsCompleted]);
    const handleLabel = (() => {
        const raw = handleText(entry);
        if (raw) return raw.replace(/^@/, "");
        if (name) return String(name);
        return "Friend";
    })();

    const cardStyles = useMemo(() => (
        isFirst ? [styles.contributionCard] : [styles.contributionCard, styles.contributionCardDivider]
    ), [isFirst]);

    return (
        <View style={cardStyles}>
            <View style={styles.contributionRow}>
                <View style={styles.contributionHandleWrap}>
                    <View style={styles.contributionAvatarWrap}>
                        {resolvedPfp ? (
                            <FastImage
                                source={{ uri: resolvedPfp, priority: FastImage.priority.high, cache: FastImage.cacheControl.immutable }}
                                style={styles.contributionPfp}
                                resizeMode={FastImage.resizeMode.cover}
                            />
                        ) : (
                            <View style={[styles.contributionPfp, styles.contributionPfpFallback]}>
                                <Text style={styles.contributionPfpInitials}>{fallbackLabel}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.contributionHandleTextWrap}>
                        <Text style={styles.contributionHandle} numberOfLines={1} ellipsizeMode="tail">{handleLabel}</Text>
                        <Text style={styles.contributionHandleSubtext} numberOfLines={1} ellipsizeMode="tail">{contributionSubtext}</Text>
                    </View>
                </View>

                <View style={styles.contributionStatsRow}>
                    <View style={styles.contributionStatCellFlat}>
                        <View style={styles.contributionStatContentFlat}>
                            <Text style={styles.contributionStatValue}>{stats[0].value}</Text>
                            <Text style={styles.contributionStatLabel}>{String(stats[0].label || '').toUpperCase()}</Text>
                        </View>
                    </View>
                    <View style={styles.contributionDivider} />
                    <View style={styles.contributionStatCellFlat}>
                        <View style={styles.contributionStatContentFlat}>
                            <Text style={styles.contributionStatValue}>{stats[1].value}</Text>
                            <Text style={styles.contributionStatLabel}>{String(stats[1].label || '').toUpperCase()}</Text>
                        </View>
                    </View>
                    <View style={styles.contributionDivider} />
                    <View style={styles.contributionStatCellFlat}>
                        <View style={styles.contributionStatContentFlat}>
                            <Text style={styles.contributionStatValue}>{stats[2].value}</Text>
                            <Text style={styles.contributionStatLabel}>{String(stats[2].label || '').toUpperCase()}</Text>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
});

/* ---------------- sheet ---------------- */
const CommunityActivitySheet = ({ visible, openToggle, items = [], onClose, onViewed, onCopyTemplate, focusUid, focusWid, onConsumedFocus }) => {
    const bottomSheetRef = useRef(null);
    const cacheRef = useRef([]);
    const navigation = useNavigation();
    const viewerData = (() => {
        try { return global?.userData || null; } catch { return null; }
    })();
    const viewerUid = viewerData?.uid ? String(viewerData.uid) : "";

    useEffect(() => {
        if (Array.isArray(items) && items.length) cacheRef.current = items;
    }, [items]);

    const displayItems = items.length ? items : cacheRef.current;

    const friendRefs = useMemo(() => {
        const followingArr = Array.isArray(viewerData?.following) ? viewerData.following : [];
        const followersArr = Array.isArray(viewerData?.followers) ? viewerData.followers : [];

        const followingMap = new Map();
        const followerMap = new Map();

        followingArr.forEach((value) => {
            const meta = friendMetaFrom(value);
            if (meta?.uid) followingMap.set(meta.uid, meta);
        });

        followersArr.forEach((value) => {
            const meta = friendMetaFrom(value);
            if (meta?.uid) followerMap.set(meta.uid, meta);
        });

        const mutual = [];
        for (const [uid, meta] of followingMap.entries()) {
            if (!followerMap.has(uid)) continue;
            const entry = { uid, name: "", handle: "", pfp: "", pfpVersion: 0 };
            mergeMetaIntoEntry(entry, meta);
            mergeMetaIntoEntry(entry, followerMap.get(uid));
            mutual.push(entry);
        }

        return mutual;
    }, [viewerData?.following, viewerData?.followers]);

    // Live overlays: subscribe to users/{uid} for items that are live and update stats inline
    const liveSubsRef = useRef(new Map()); // uid -> unsubscribe
    const [liveOverlays, setLiveOverlays] = useState({}); // uid -> { volume, reps, PBs, exercises? }

    useEffect(() => {
        if (!visible) return;
        const lives = new Set((displayItems || []).filter((it) => it?.live && it?.uid).map((it) => String(it.uid)));

        // unsubscribe removed
        for (const [uid, unsub] of liveSubsRef.current.entries()) {
            if (!lives.has(uid)) { try { unsub && unsub(); } catch { } liveSubsRef.current.delete(uid); }
        }

        // subscribe new
        lives.forEach((uid) => {
            if (liveSubsRef.current.has(uid)) return;
            try {
                const unsub = onSnapshot(doc(db, "users", uid), (snap) => {
                    const data = snap.data() || {};
                    const cw = data?.currentWorkout || null;
                    if (cw) {
                        setLiveOverlays((prev) => {
                            // Derive PBs if missing using friend's statsExercises (1RM comparison), one PB per exercise
                            const friendStats = data?.statsExercises || {};
                            let derivedPBs = 0;
                            try {
                                const exsArr = Array.isArray(cw?.exercises) ? cw.exercises : [];
                                for (const ex of exsArr) {
                                    const prevMax = Number(friendStats?.[ex?.name]?.["1RM"] || 0);
                                    let hit = false;
                                    const sets = Array.isArray(ex?.sets) ? ex.sets : [];
                                    for (const s of sets) {
                                        if (hit) break;
                                        const r = Number(s?.reps) || 0;
                                        const w = Number(s?.weight) || 0;
                                        if (r > 0 && w > 0) {
                                            const est = calculate1RM(w, r);
                                            if (est > prevMax) { derivedPBs += 1; hit = true; }
                                        }
                                    }
                                }
                            } catch { }

                            const hasPBField = (cw && (Object.prototype.hasOwnProperty.call(cw, 'PBs') || Object.prototype.hasOwnProperty.call(cw, 'pbs')));
                            const pbValue = hasPBField ? Number(cw?.PBs ?? cw?.pbs ?? 0) : derivedPBs;

                            const nextEntry = {
                                volume: Number(cw?.volume || 0),
                                reps: Number(cw?.reps || 0),
                                PBs: Number.isFinite(pbValue) ? pbValue : 0,
                                exercises: Array.isArray(cw?.exercises) ? cw.exercises : undefined,
                                ts: Date.now(),
                            };
                            const curr = prev[uid];
                            if (
                                curr &&
                                curr.volume === nextEntry.volume &&
                                curr.reps === nextEntry.reps &&
                                curr.PBs === nextEntry.PBs &&
                                ((curr.exercises?.length || 0) === (nextEntry.exercises?.length || 0))
                            ) {
                                return prev; // no change
                            }
                            return { ...prev, [uid]: nextEntry };
                        });
                    } else {
                        setLiveOverlays((prev) => {
                            const next = { ...prev }; delete next[uid]; return next;
                        });
                    }
                });
                liveSubsRef.current.set(uid, unsub);
            } catch { }
        });

        return () => {
            for (const [, unsub] of liveSubsRef.current.entries()) { try { unsub && unsub(); } catch { } }
            liveSubsRef.current.clear();
        };
    }, [visible, displayItems]);

    const [sortedItems, setSortedItems] = useState(() => sortFriendsItems(displayItems, liveOverlays));

    useEffect(() => {
        let cancelled = false;
        const run = () => {
            if (cancelled) return;
            const next = sortFriendsItems(displayItems, liveOverlays);
            setSortedItems((prev) => (shallowArrayEqual(prev, next) ? prev : next));
        };
        let task;
        try {
            task = InteractionManager.runAfterInteractions(run);
        } catch {
            run();
            return () => { cancelled = true; };
        }
        return () => {
            cancelled = true;
            try { task?.cancel?.(); } catch { }
        };
    }, [displayItems, liveOverlays]);

    // Move viewer-related state above effects that depend on it to avoid TDZ issues
    const [selectedItem, setSelectedItem] = useState(null);
    const [viewerReady, setViewerReady] = useState(false);
    const listOpacity = useRef(new Animated.Value(1)).current;
    const viewerOpacity = useRef(new Animated.Value(0)).current;

    // Removed global per-second ticker to avoid re-rendering the entire list every second

    // Close when parent hides; opening is driven solely by the toggle flag
    useEffect(() => {
        if (!bottomSheetRef.current) return;
        if (!visible) {
            try { bottomSheetRef.current.close(); } catch { }
        }
    }, [visible]);

    // Open via a boolean toggle flag only; independent of `visible` truthiness
    useEffect(() => {
        if (!bottomSheetRef.current) return;
        try { bottomSheetRef.current.expand(); } catch { }
    }, [openToggle]);

    // Fire onViewed each time the sheet is toggled open
    useEffect(() => {
        try { onViewed?.(); } catch { }
    }, [openToggle, onViewed]);

    // Reset focus-consumption guard on each explicit open toggle so we can re-focus
    useEffect(() => {
        try { consumedFocusRef.current = ""; } catch { }
    }, [openToggle]);

    // If a specific friend uid or workout id is provided, auto-open the viewer focused on it
    const consumedFocusRef = useRef("");
    const [highlightWid, setHighlightWid] = useState(null);
    useEffect(() => {
        const uidTarget = String(focusUid || "").trim();
        const widTarget = String(focusWid || "").trim();
        const token = widTarget ? `w:${widTarget}` : (uidTarget ? `u:${uidTarget}` : "");
        if (!token || consumedFocusRef.current === token) return;

        const findByWid = (arr) => arr.find((x) => String(x?.wid || x?.id || x?.workout?.wid || "") === widTarget);
        const findByUid = (arr) => arr.find((x) => String(x?.uid || "") === uidTarget);
        let it = widTarget ? findByWid(sortedItems || []) : findByUid(sortedItems || []);
        // If a wid was provided but not found, gracefully fall back to the user's latest item
        if (!it && widTarget && uidTarget) it = findByUid(sortedItems || []);
        if (!it) return; // wait until items available (or none exists)
        try { bottomSheetRef.current?.expand?.(); } catch { }
        if (widTarget) {
            setHighlightWid(widTarget);
            setTimeout(() => setHighlightWid(null), 1200);
        }

        // Small delay so the sheet starts expanding, but do NOT block on image lookups
        const id = setTimeout(() => {
            try {
                // Open immediately with whatever image we already have
                const immediatePfp = it?.pfp || it?.pfpUrl || it?.photoURL || null;
                openViewer(it, immediatePfp);
                consumedFocusRef.current = token;
                try { onConsumedFocus?.(); } catch { }
                // Kick off a non-blocking PFP fetch; update if still viewing the same friend
                if (it?.uid) {
                    getPfpUrl(String(it.uid), it?.pfpVersion || 0)
                        .then((uri) => {
                            if (!uri) return;
                            setSelectedItem((prev) => {
                                if (!prev) return prev;
                                const same = String(prev?.friendUid || prev?.uid || "") === String(it.uid);
                                return same ? { ...prev, friendPfp: uri } : prev;
                            });
                        })
                        .catch(() => { });
                }
            } catch { }
        }, 60);
        return () => clearTimeout(id);
    }, [openToggle, focusUid, focusWid, sortedItems, openViewer, onConsumedFocus]);

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

    // Slide-in viewer animation state
    const viewerTranslateX = useRef(new Animated.Value(screenWidth)).current;

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
            privacyMode: item?.workout?.privacyMode ?? item?.privacyMode ?? 'global',
        };

        const wk = selfActive
            ? (global?.userData?.currentWorkout || fallbackWorkout)
            : ((item?.workout && typeof item.workout === "object") ? item.workout : fallbackWorkout);

        const safeWorkout = wk ? { ...wk, privacyMode: wk?.privacyMode ?? 'global' } : null;

        setSelectedItem({
            ...item,
            workout: safeWorkout,
            friendPfp: pfpUri || null,
            friendPfpVersion: item?.pfpVersion || 0,
            friendUid: String(item?.uid || item?.userId || item?.user?.uid || ""), // pass concrete friend uid
            selfActive,
            // stream live activity only if this item is marked live
            streamLive: !!item?.live,
        });
        // Mount content right away to minimize perceived delay
        setViewerReady(true);
        // Prepare positions and animate slide-in of the viewer
        try { viewerTranslateX.setValue(screenWidth); viewerOpacity.setValue(1); } catch { }
        try {
            Animated.parallel([
                Animated.timing(viewerTranslateX, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                Animated.timing(listOpacity, { toValue: 1, duration: 1, useNativeDriver: true }),
            ]).start();
        } catch { }
    }, [listOpacity, viewerOpacity]);

    const closeViewer = useCallback(() => {
        try {
            Animated.parallel([
                Animated.timing(viewerTranslateX, { toValue: screenWidth, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                Animated.timing(listOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
            ]).start(({ finished }) => {
                if (finished) { try { viewerOpacity.setValue(0); } catch { } setSelectedItem(null); setViewerReady(false); }
            });
        } catch {
            setSelectedItem(null); setViewerReady(false); try { viewerOpacity.setValue(0); } catch { }
        }
    }, [listOpacity, viewerOpacity]);

    // Interactive back-pan helpers (declared after closeViewer to avoid TDZ issues)
    const onBackUpdateX = useCallback((dx) => {
        try {
            const x = Math.max(0, Math.min(screenWidth, dx || 0));
            viewerTranslateX.setValue(x);
        } catch { }
    }, [viewerTranslateX]);
    const onBackEnd = useCallback((dx, vx) => {
        const x = Math.max(0, Number(dx || 0));
        const v = Number(vx || 0);
        const shouldClose = x > screenWidth * 0.28 || v > 800;
        if (shouldClose) {
            closeViewer();
        } else {
            try {
                Animated.timing(viewerTranslateX, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
            } catch { }
        }
    }, [viewerTranslateX, closeViewer]);

    // Animated handle accent opacity follows the viewer slide progress: 0 (closed) → 1 (open)
    const handleAccentOpacity = useMemo(() => (
        viewerTranslateX.interpolate({
            inputRange: [0, screenWidth],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        })
    ), [viewerTranslateX]);

    // Custom handle component with fading yellow accent matching overlay slide progress
    const Handle = useMemo(() => () => (
        <View style={styles.handleWrap}>
            {/* Fading background tint under handle while viewing workout */}
            <Animated.View
                style={[
                    StyleSheet.absoluteFillObject,
                    {
                        backgroundColor: HANDLE_FRIEND_BACKGROUND,
                        opacity: handleAccentOpacity,
                        borderTopLeftRadius: scaleSize(22),
                        borderTopRightRadius: scaleSize(22),
                    },
                ]}
                pointerEvents="none"
            />
            <View style={{ alignItems: 'center', paddingVertical: scaleSize(s(8)) }}>
                {/* Base neutral handle bar */}
                <View
                    style={{
                        width: scaleSize(s(42)),
                        height: scaleSize(s(4)),
                        borderRadius: scaleSize(s(2)),
                        backgroundColor: HANDLE_SELF,
                        overflow: 'hidden',
                    }}
                >
                    {/* Yellow accent fades in as viewer opens */}
                    <Animated.View
                        style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: 0,
                            bottom: 0,
                            backgroundColor: HANDLE_FRIEND_ACCENT,
                            opacity: handleAccentOpacity,
                            borderRadius: scaleSize(s(2)),
                        }}
                        pointerEvents="none"
                    />
                </View>
            </View>
        </View>
    ), [handleAccentOpacity]);

    const liveItems = useMemo(() => sortedItems.filter((it) => it?.live), [sortedItems]);

    const weeklyContributions = useMemo(() => {
        const weekStartMs = startOfWeekSunday().getTime();
        const map = new Map();

        const ensureEntry = (uid) => {
            const safeUid = String(uid || "").trim();
            if (!safeUid) return null;
            if (!map.has(safeUid)) {
                map.set(safeUid, {
                    uid: safeUid,
                    name: "",
                    handle: "",
                    pfp: "",
                    pfpVersion: 0,
                    volume: 0,
                    reps: 0,
                    pbs: 0,
                    workouts: 0,
                    weeklyGoal: 0,
                });
            }
            return map.get(safeUid);
        };

        const seedFromMeta = (meta) => {
            if (!meta) return;
            const entry = ensureEntry(meta.uid);
            if (!entry) return;
            mergeMetaIntoEntry(entry, meta);
        };

        const seedFromItem = (item) => {
            const uid = String(item?.uid || "").trim();
            if (!uid) return;
            const entry = ensureEntry(uid);
            if (!entry) return;
            mergeMetaIntoEntry(entry, {
                uid,
                name: item?.name,
                handle: item?.handle || item?.username,
                pfp: getPfpUri(item),
                pfpVersion: item?.pfpVersion ?? 0,
                weeklyGoal: coerceWeeklyGoal(item?.weeklyGoal ?? item?.weeklyWorkoutGoal ?? item?.goal),
            });
            const overlay = item?.uid ? liveOverlays[String(item.uid)] : undefined;
            const stats = computeWorkoutStats(item, overlay);
            entry.volume += stats.volume;
            entry.reps += stats.reps;
            entry.pbs += stats.pbs;
            entry.workouts += 1;
            if (entry.weeklyGoal <= 0) {
                const goal = coerceWeeklyGoal(item?.weeklyGoal ?? item?.weeklyWorkoutGoal ?? item?.goal);
                if (goal > 0) entry.weeklyGoal = goal;
            }
        };

        for (const item of sortedItems) {
            const ts = bestTimestamp(item);
            if (!ts || ts < weekStartMs) continue;
            seedFromItem(item);
        }

        friendRefs.forEach(seedFromMeta);

        if (viewerUid) {
            seedFromMeta({
                uid: viewerUid,
                name: viewerData?.name || viewerData?.handle || "You",
                handle: viewerData?.handle || "",
                pfp: viewerData?.pfp || viewerData?.image || viewerData?.photoURL || "",
                pfpVersion: viewerData?.pfpVersion ?? viewerData?.version ?? 0,
                weeklyGoal: coerceWeeklyGoal(viewerData?.weeklyWorkoutGoal),
            });
        }

        const arr = Array.from(map.values());
        arr.sort((a, b) => {
            const volumeDiff = b.volume - a.volume;
            if (volumeDiff !== 0) return volumeDiff;
            const repDiff = b.reps - a.reps;
            if (repDiff !== 0) return repDiff;
            const pbDiff = b.pbs - a.pbs;
            if (pbDiff !== 0) return pbDiff;
            const leftLabel = (a.handle || a.name || a.uid).toLowerCase();
            const rightLabel = (b.handle || b.name || b.uid).toLowerCase();
            return leftLabel.localeCompare(rightLabel);
        });
        return arr;
    }, [sortedItems, liveOverlays, friendRefs, viewerUid, viewerData]);

    const sections = useMemo(() => {
        const data = [];
        if (liveItems.length) {
            data.push({ title: "Live Workouts", type: "live", data: liveItems.map((it) => ({ kind: "live", item: it })) });
        }
        if (weeklyContributions.length) {
            data.push({ title: "This Week", type: "summary", data: weeklyContributions.map((entry) => ({ kind: "contribution", entry })) });
        }
        return data;
    }, [liveItems, weeklyContributions]);

    const weeklyContributorCount = useMemo(
        () => weeklyContributions.filter((entry) => (
            Number(entry?.workouts) > 0 ||
            Number(entry?.volume) > 0 ||
            Number(entry?.reps) > 0 ||
            Number(entry?.pbs) > 0
        )).length,
        [weeklyContributions]
    );

    const keyExtractor = useCallback((row, index) => {
        if (!row) return String(index);
        if (row.kind === "live") {
            const item = row.item || {};
            const wid = String(item?.wid || item?.id || item?.workout?.wid || "");
            if (wid) return `live_${wid}`;
            if (item?.uid) return `live_${item.uid}_${bestTimestamp(item) || index}`;
            return `live_${index}`;
        }
        if (row.kind === "contribution") {
            return `summary_${row.entry?.uid || index}`;
        }
        return String(index);
    }, []);

    const renderItem = useCallback(({ item: row, index, section }) => {
        if (!row) return null;
        if (row.kind === "live") {
            const item = row.item;
            const widHere = String(item?.wid || item?.id || item?.workout?.wid || "");
            const isHighlighted = !!highlightWid && widHere === String(highlightWid);
            const isLast = index === ((section?.data?.length || 0) - 1);
            return (
                <View style={[styles.liveItemWrap, isLast && styles.liveItemWrapLast]}>
                    <FriendPanel
                        item={item}
                        overlay={item?.uid ? liveOverlays[String(item.uid)] : undefined}
                        onSelect={openViewer}
                        highlight={isHighlighted}
                    />
                </View>
            );
        }
        if (row.kind === "contribution") {
            return <ContributionRow entry={row.entry} isFirst={index === 0} />;
        }
        return null;
    }, [highlightWid, liveOverlays, openViewer]);
    const renderSectionHeader = useCallback(({ section }) => {
        return (
            <View style={styles.sectionHeaderWrap}>
                <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
        );
    }, []);

    const liveCount = useMemo(() => sortedItems.filter((x) => x?.live).length, [sortedItems]);
    const noop = React.useCallback(() => { }, []);
    const noopCheer = React.useCallback(() => { }, []);
    const handleCopyTemplateCb = React.useCallback((wk) => onCopyTemplate?.(wk), [onCopyTemplate]);
    const timerRef = useRef("");

    // Fetch viewer's statsExercises once per friend when selected (non-blocking, no live stream)
    const viewerStatsRef = useRef(null);
    useEffect(() => {
        if (!selectedItem?.friendUid) {
            viewerStatsRef.current = null;
            return;
        }
        const uid = String(selectedItem.friendUid);
        let cancelled = false;
        const run = () => {
            getDoc(doc(db, 'users', uid))
                .then((snap) => {
                    if (cancelled) return;
                    const data = snap.exists() ? (snap.data() || {}) : {};
                    viewerStatsRef.current = sanitizeStatsForViewer(data?.statsExercises || null, uid, viewerUid, viewerData);
                })
                .catch(() => { });
        };
        try {
            InteractionManager.runAfterInteractions(run);
        } catch {
            run();
        }
        return () => { cancelled = true; };
    }, [selectedItem?.friendUid, viewerUid, viewerData]);

    // Edge back-swipe to close the inline viewer (iOS-like)
    const backEligible = useSharedValue(0);
    const backPan = Gesture.Pan()
        .minDistance(8)
        .activeOffsetX([-16, 16])
        .failOffsetY([-12, 12])
        .onBegin((e) => {
            'worklet';
            backEligible.value = (e.absoluteX <= EDGE_BACK_GESTURE_WIDTH) ? 1 : 0;
        })
        .onUpdate((e) => {
            'worklet';
            if (!backEligible.value) return;
            runOnJS(onBackUpdateX)(e.translationX);
        })
        .onEnd((e) => { 'worklet'; backEligible.value = 0; runOnJS(onBackEnd)(e.translationX, e.velocityX); })
        .onFinalize(() => { 'worklet'; backEligible.value = 0; });

    return (
        <View style={styles.outer} pointerEvents="box-none">
            <BottomSheet
                ref={bottomSheetRef}
                index={-1}
                snapPoints={["94%"]}
                enablePanDownToClose
                backdropComponent={renderBackdrop}
                handleComponent={Handle}
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
                <Animated.View style={{ flex: 1, opacity: listOpacity }} pointerEvents={selectedItem ? 'none' : 'auto'}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Community Training</Text>
                        <Text style={styles.headerSub}>
                            Live: {liveCount} • Weekly contributors: {weeklyContributorCount}
                        </Text>
                    </View>

                    <SectionList
                        sections={sections}
                        renderSectionHeader={renderSectionHeader}
                        renderItem={renderItem}
                        keyExtractor={keyExtractor}
                        style={{ flex: 1 }}
                        contentContainerStyle={styles.listContent}
                        removeClippedSubviews={false}
                        SectionSeparatorComponent={SectionSeparator}
                        stickySectionHeadersEnabled={false}
                        showsVerticalScrollIndicator={false}
                        initialNumToRender={10}
                        windowSize={10}
                        maxToRenderPerBatch={12}
                        ListFooterComponent={<View style={{ height: scaleSize(s(28)) }} />}
                        ListEmptyComponent={
                            <View style={styles.emptyWrap}>
                                <Text style={styles.emptyText}>No live workouts or weekly contributions yet</Text>
                            </View>
                        }
                    />
                </Animated.View>

                <Animated.View style={[styles.viewerContainer, { opacity: viewerOpacity, transform: [{ translateX: viewerTranslateX }] }]} pointerEvents={selectedItem ? "auto" : "none"}>
                    {!selectedItem || !viewerReady ? (
                        <View style={styles.loadingWrap}>
                            <ActivityIndicator />
                        </View>
                    ) : (
                        <GestureDetector gesture={backPan}>
                            <View style={{ flex: 1 }}>
                                <View style={{ flex: 1 }}>
                                    <SpectatingWorkoutModal
                                        timerRef={timerRef}
                                        workout={selectedItem.workout}
                                        userWorkoutStats={viewerStatsRef.current || undefined}
                                        onPressBack={closeViewer}
                                        onCheer={noopCheer}
                                        onCopyTemplate={handleCopyTemplateCb}
                                        onPressPfp={() => {
                                            try { bottomSheetRef.current?.close(); } catch { }
                                            const uid = String(selectedItem?.friendUid || '');
                                            if (!uid) return;
                                            const meUid = String(global?.userData?.uid || '');
                                            const rootNav = navigation?.getParent?.('ROOT');
                                            if (uid === meUid) {
                                                if (rootNav?.navigate) rootNav.navigate('Profile', { transition: 'slide-from-right' });
                                                else navigation.navigate('Profile', { transition: 'slide-from-right' });
                                            } else {
                                                if (rootNav?.navigate) rootNav.navigate('ViewProfile', { user: { uid } });
                                                else navigation.navigate('ViewProfile', { user: { uid } });
                                            }
                                        }}
                                        /* 🔒 LOCK friend view so header/controls don't flip to self */
                                        forceViewingFriend={selectedItem.friendUid}
                                        friendPfp={selectedItem.friendPfp || null}
                                        friendPfpVersion={selectedItem.friendPfpVersion || 0}
                                        /* 🚀 Stream live only when the item is live */
                                        streamLive={!!selectedItem.streamLive}
                                    />
                                </View>
                            </View>
                        </GestureDetector>
                    )}
                </Animated.View>
            </BottomSheet>
        </View>
    );
};

const livePostStyles = StyleSheet.create({
    card: {
        width: '100%',
        backgroundColor: theme.surface,
        borderRadius: 0,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
        paddingBottom: scaleSize(12),
    },
    cardHighlight: {
        borderColor: 'rgba(147,197,253,0.55)',
        borderWidth: scaleSize(1.4),
    },
    cardPressed: {
        opacity: 0.92,
    },
    sectionTop: {
        paddingHorizontal: scaleSize(18),
        paddingTop: scaleSize(14),
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        minWidth: 0,
    },
    avatarWrap: {
        width: scaleSize(34),
        aspectRatio: 1,
        borderRadius: scaleSize(23),
        overflow: 'hidden',
        marginRight: scaleSize(10),
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: scaleSize(23),
        backgroundColor: theme.field,
    },
    avatarFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitials: {
        color: theme.textPrimary,
        fontFamily: 'Poppins_600SemiBold',
        fontSize: scaleSize(15),
    },
    headerTextCol: {
        flex: 1,
        minWidth: 0,
    },
    nameText: {
        color: theme.textPrimary,
        fontFamily: 'Poppins_600SemiBold',
        fontSize: scaleSize(13),
    },
    timestampText: {
        color: theme.textSecondary,
        fontFamily: 'Outfit_400Regular',
        fontSize: scaleSize(11.5),
        marginTop: scaleSize(2),
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scaleSize(12),
        paddingVertical: scaleSize(5),
        borderRadius: scaleSize(999),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(248,113,113,0.55)',
        backgroundColor: 'rgba(239,68,68,0.14)',
        marginLeft: scaleSize(12),
    },
    liveBadgeDot: {
        width: scaleSize(7),
        height: scaleSize(7),
        borderRadius: scaleSize(3.5),
        backgroundColor: '#EF4444',
        marginRight: scaleSize(6),
    },
    liveBadgeText: {
        color: '#F87171',
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(11.5),
        letterSpacing: 0.2,
    },
    titleBlock: {
        marginTop: scaleSize(12),
        paddingBottom: scaleSize(5),
    },
    titleText: {
        color: theme.textPrimary,
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(14),
    },
    workoutTitleText: {
        color: '#74abf7ff',
    },
    captionText: {
        color: theme.textPrimary,
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(13),
        marginTop: scaleSize(4),
    },
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: scaleSize(6),
        marginHorizontal: scaleSize(20),
    },
    metricsLeft: {
        flexDirection: 'row',
        flex: 1,
    },
    metricColumnLeft: {
        width: '32%',
    },
    metricCenter: {
        paddingHorizontal: scaleSize(1),
    },
    metricColumn: {
        flexShrink: 0,
    },
    metricRight: {
        alignItems: 'flex-end',
    },
    metricLabel: {
        color: 'rgba(255,255,255,0.58)',
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(12),
        letterSpacing: 0.2,
        paddingBottom: scaleSize(1.5),
    },
    metricValue: {
        color: theme.textPrimary,
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(15.5),
    },
    recordsValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    recordsIconFirst: {
        marginRight: scaleSize(4),
    },
    recordsIcon: {
        marginRight: scaleSize(4),
    },
    recordsValueText: {
        marginLeft: scaleSize(2),
    },
    workoutSummaryBlock: {
        marginTop: scaleSize(6),
        marginHorizontal: scaleSize(20),
        paddingTop: scaleSize(10),
        paddingBottom: scaleSize(4),
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.14)',
    },
    workoutSummaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingBottom: scaleSize(2),
    },
    workoutSummaryHeaderText: {
        color: theme.textSecondary,
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(12),
        letterSpacing: 0.2,
        textTransform: 'uppercase',
    },
    workoutSummaryHeaderExercise: {
        flex: 1,
        paddingRight: scaleSize(12),
    },
    workoutSummaryHeaderBest: {
        minWidth: scaleSize(96),
        textAlign: 'right',
    },
    workoutSummaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: scaleSize(4),
    },
    workoutSummaryRowBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    workoutSummaryExercise: {
        flex: 1,
        paddingRight: scaleSize(12),
        color: theme.textPrimary,
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(13),
    },
    workoutSummaryBest: {
        minWidth: scaleSize(96),
        flexShrink: 0,
        textAlign: 'right',
        color: theme.textSecondary,
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(13),
    },
});

const styles = StyleSheet.create({
    outer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
    sheetBg: { backgroundColor: COLORS.bg, borderTopLeftRadius: scaleSize(22), borderTopRightRadius: scaleSize(22) },
    handleWrap: { borderTopLeftRadius: scaleSize(22), borderTopRightRadius: scaleSize(22) },

    header: { paddingHorizontal: scaleSize(16), paddingVertical: scaleSize(12) },
    headerTitle: { fontFamily: "Outfit_700Bold", fontSize: scaleSize(16), color: COLORS.text },
    headerSub: { marginTop: scaleSize(2), fontFamily: "Outfit_500Medium", fontSize: scaleSize(12.5), color: COLORS.subtext },

    listContent: { paddingBottom: scaleSize(s(24)) },

    sectionHeaderWrap: { paddingTop: scaleSize(s(6)), paddingBottom: scaleSize(s(4)), paddingHorizontal: LIST_HORIZONTAL_PADDING },
    sectionHeaderText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(s(12)),
        color: COLORS.subtext,
        letterSpacing: 0.3,
    },

    panel: {
        paddingHorizontal: scaleSize(s(14)),
        paddingVertical: scaleSize(s(10)),
        borderRadius: scaleSize(s(20)),
        backgroundColor: COLORS.card,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: scaleSize(s(6)) },
        shadowOpacity: 0.07,
        shadowRadius: scaleSize(s(12)),
        elevation: 7,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.hairline,
    },
    headerRow: { flexDirection: "row", alignItems: "center", marginBottom: scaleSize(s(6)), gap: scaleSize(s(10)) },
    rightAccessories: { flexDirection: "row", alignItems: "center", gap: scaleSize(s(10)) },
    pfp: { width: scaleSize(s(38)), height: scaleSize(s(38)), borderRadius: scaleSize(s(19)), backgroundColor: "#E2E8F0" },
    pfpFallback: { alignItems: "center", justifyContent: "center" },
    pfpInitials: { fontFamily: "Outfit_700Bold", fontSize: scaleSize(s(12)), color: COLORS.text, opacity: 0.9 },
    templateTitle: { fontSize: scaleSize(s(12.5)), fontFamily: "Outfit_700Bold", color: COLORS.text },
    templateTitleBlue: { color: theme.primary },
    handleText: { marginTop: scaleSize(s(2)), fontSize: scaleSize(s(12)), fontFamily: "Outfit_500Medium", color: COLORS.subtext },

    livePill: {
        flexDirection: "row",
        alignItems: "center",
        gap: scaleSize(s(6)),
        backgroundColor: "rgba(45,158,255,0.12)",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(45,158,255,0.35)",
        paddingVertical: scaleSize(s(6)),
        paddingHorizontal: scaleSize(s(9)),
        borderRadius: scaleSize(s(999)),
    },
    liveDot: { width: scaleSize(s(8)), height: scaleSize(s(8)), borderRadius: scaleSize(s(4)), backgroundColor: "#EF4444" },
    liveText: { fontFamily: "Outfit_700Bold", fontSize: scaleSize(s(11.5)), color: COLORS.text },

    divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.hairline, marginVertical: scaleSize(s(6)) },

    statsRow: { flexDirection: "row", gap: scaleSize(s(6)) },
    statCard: {
        flex: 1,
        paddingVertical: scaleSize(s(6)),
    },
    statIconWrap: {
        width: scaleSize(s(30)),
        height: scaleSize(s(30)),
        borderRadius: scaleSize(s(20)),
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: '#ffffff2e',
        marginBottom: scaleSize(s(6)),
    },
    statLabel: { fontFamily: "Outfit_600SemiBold", fontSize: scaleSize(s(11)), color: theme.textSecondary },
    statValue: { marginTop: scaleSize(s(1)), fontFamily: "Outfit_800ExtraBold", fontSize: scaleSize(s(13)), color: COLORS.text },
    statTextCol: { flex: 1, minWidth: 0 },

    liveItemWrap: {
        paddingHorizontal: 0,
        marginBottom: scaleSize(s(14)),
    },
    liveItemWrapLast: {
        marginBottom: 0,
    },

    contributionCard: {
        paddingLeft: LIST_HORIZONTAL_PADDING,
        paddingRight: scaleSize(4),
        paddingVertical: scaleSize(s(15)),
        backgroundColor: theme.fieldDeep,
        borderRadius: 0,
    },
    contributionCardDivider: {
        borderTopWidth: 1.3,
        borderColor: "rgba(255,255,255,0.12)",
    },
    contributionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: scaleSize(s(8)),
    },
    contributionHandleWrap: {
        flexDirection: "row",
        alignItems: "center",
        flexShrink: 1,
        minWidth: 0,
    },
    contributionHandleTextWrap: {
        flexShrink: 1,
        minWidth: 0,
    },
    contributionAvatarWrap: {
        borderRadius: scaleSize(s(14)),
        backgroundColor: "rgba(255,255,255,0.04)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: scaleSize(s(11)),
    },
    contributionPfp: { width: scaleSize(s(36)), aspectRatio: 1, borderRadius: scaleSize(s(100)), backgroundColor: "#E2E8F0" },
    contributionPfpFallback: { alignItems: "center", justifyContent: "center" },
    contributionPfpInitials: { fontFamily: "Outfit_700Bold", fontSize: scaleSize(s(11)), color: COLORS.text },
    contributionHandle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(s(13.5)),
        color: COLORS.text,
        maxWidth: scaleSize(s(150)),
        flexShrink: 1,
    },
    contributionHandleSubtext: {
        marginTop: scaleSize(s(2)),
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(s(12)),
        color: COLORS.subtext,
    },
    contributionStatsRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        marginLeft: 'auto',
        gap: 0,
        width: '55%'
    },
    contributionStatCellFlat: {
        flexBasis: 0,
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: scaleSize(s(3)),
    },
    contributionStatContentFlat: {
        alignItems: "center",
        justifyContent: "center",
    },
    contributionStatValue: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(s(14)),
        color: COLORS.text,
    },
    contributionStatLabel: {
        marginTop: scaleSize(s(1)),
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(s(11)),
        color: COLORS.subtext,
        textTransform: "uppercase",
        letterSpacing: 0.3,
        textAlign: "center",
    },
    contributionDivider: {
        height: scaleSize(s(18)),
        width: 1.3,
        backgroundColor: "rgba(255,255,255,0.22)",
        marginHorizontal: scaleSize(s(10)) / 2,
    },

    viewerContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.bg },
    loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
    lockedWrap: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scaleSize(s(28)),
    },
    lockedTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(s(16)),
        color: COLORS.text,
        marginBottom: scaleSize(s(6)),
        textAlign: "center",
    },
    lockedSubtitle: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(s(13)),
        color: COLORS.subtext,
        textAlign: "center",
    },

    emptyWrap: { paddingVertical: scaleSize(s(24)), alignItems: "center" },
    emptyText: { fontFamily: "Outfit_600SemiBold", color: "rgba(15,23,42,0.5)", fontSize: scaleSize(s(12)) },

    prPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: scaleSize(s(6)),
        backgroundColor: "rgba(250, 204, 21, 0.24)",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(250, 204, 21, 0.60)",
        paddingVertical: scaleSize(s(5)),
        paddingHorizontal: scaleSize(s(8)),
        borderRadius: scaleSize(s(999)),
    },
    prText: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: scaleSize(s(12)),
        color: "#FACC15",
    },
});

export default memo(CommunityActivitySheet);
