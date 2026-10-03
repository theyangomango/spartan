import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { CalendarCheck, Check, Dumbbell, Target } from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";

import theme from "../../../theme/mfpDark";
import { scaleSize } from "../layoutConstants";
import FeedSnapshotCard from "../../1_Feed/FeedSnapshotCard";
import rankLevelPromotionRequirements from "../../../../shared/rankLevelTasks.js";
import {
    computeRankProgressFromData,
    LADDER_LEVELS,
    buildLevelKey,
    parseRequirementTask,
    evaluateRequirementProgress,
} from "../../../../shared/rankProgress.js";
import LevelUpTransition from "../LevelUpTransition";
import MuscleGroupIcon from "../../3_Workout/NewWorkout/SelectExercise/MuscleGroupIcon";
import {
    MUSCLE_ICON_BASE_SIZE,
    MUSCLE_ICON_HIGHLIGHT,
    MUSCLE_ICON_OFFSETS,
    MUSCLE_ICON_SCALES,
    MUSCLE_ICON_STROKE_WIDTHS,
    OVERALL_MUSCLE_SEGMENTS,
} from "../muscleGroupIconLayout";
import { DEFAULT_MUSCLE_SEGMENTS } from "../../../utils/muscleTierColors";
import { dequeueRankPromotion, subscribeRankPromotions, subscribeUserData } from "../../../utils/userDataEvents";
import { LADDER_SCROLL_TARGET_KEY } from "../../../utils/competitionTabEvents";
import formatHexStat from "../../../utils/formatHexStat";
const CARD_THEME_COLORS = {
    bronze: { gradient: ["#6f3600ff", "#e19c73ff"], accent: "#f9cba1ff" },
    silver: { gradient: ["#2e3542ff", "#a8c2e6ff"], accent: "#c5e0ffff" },
    gold: { gradient: ["#d8a700ff", "#ffd95cff"], accent: "#ffeab0ff" },
    ruby: { gradient: ["#511222ff", "#e54b73"], accent: "#ffacc9ff" },
    emerald: { gradient: ["#0f5c3fff", "#8ef3c5ff"], accent: "#c8ffe3ff" },
    diamond: { gradient: ["#0d4156ff", "#86e7ffff"], accent: "#bff9ffff" },
};
const FOOTER_SAFE_OFFSET = scaleSize(16);
const TABBAR_HEIGHT = scaleSize(88);
const TOP_SPACER_EPSILON = scaleSize(12);

const formatScoreValue = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "0.0";
    return numeric.toFixed(1);
};

const formatCountValue = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "0";
    const safeValue = Math.max(0, Math.floor(numeric));
    try {
        return new Intl.NumberFormat("en-US").format(safeValue);
    } catch {
        return String(safeValue);
    }
};

const formatWeightValue = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "0";
    const safeValue = Math.max(0, Math.round(numeric));
    try {
        return new Intl.NumberFormat("en-US").format(safeValue);
    } catch {
        return String(safeValue);
    }
};

const formatRequirementProgressText = (descriptor, currentValue, targetValue, fallback) => {
    if (!descriptor || !descriptor.type) {
        return fallback;
    }
    if (descriptor.type === "workouts" && Number.isFinite(targetValue)) {
        return `${formatCountValue(currentValue)} / ${formatCountValue(targetValue)}`;
    }
    if (descriptor.type === "score" && Number.isFinite(targetValue)) {
        return `${formatScoreValue(currentValue)} / ${formatScoreValue(targetValue)}`;
    }
    if (descriptor.type === "volume" && Number.isFinite(targetValue)) {
        return `${formatWeightValue(currentValue)} / ${formatWeightValue(targetValue)}`;
    }
    return fallback;
};

// Theme colors are 8-digit hex strings; swap the alpha channel for a 0-1 opacity.
const withAlpha = (hex, opacity) => {
    const alpha = Math.round(Math.min(1, Math.max(0, opacity)) * 255)
        .toString(16)
        .padStart(2, "0");
    return `${String(hex).slice(0, 7)}${alpha}`;
};

const clampRatio = (value) => {
    if (!Number.isFinite(value)) return 0;
    return Math.min(1, Math.max(0, value));
};

const capitalizeLabel = (value) => {
    if (!value || typeof value !== "string") return "";
    return value.charAt(0).toUpperCase() + value.slice(1);
};

// Splits a quest into what is measured (title), what to hit (goal), and an icon for its kind.
const describeRequirement = (taskLabel, descriptor) => {
    if (descriptor?.type === "score") {
        const isOverall = descriptor.key === "overall";
        return {
            title: isOverall ? "Overall score" : `${capitalizeLabel(descriptor.key)} score`,
            goal: `Reach ${formatScoreValue(descriptor.target || 0)}`,
            Icon: Target,
            muscleKey: MUSCLE_ICON_SCALES[descriptor.key] ? descriptor.key : null,
        };
    }
    if (descriptor?.type === "volume") {
        return {
            title: "Total volume",
            goal: `Lift ${formatWeightValue(descriptor.target || 0)} lbs`,
            Icon: Dumbbell,
        };
    }
    if (descriptor?.type === "workouts") {
        return {
            title: "Workouts",
            goal: `Log ${formatCountValue(descriptor.target || 0)}`,
            Icon: CalendarCheck,
        };
    }
    return { title: taskLabel, goal: "", Icon: Target };
};

const RING_SIZE = scaleSize(38);
const RING_STROKE = scaleSize(3);
const RING_ICON_SIZE = RING_SIZE - 2 * RING_STROKE - scaleSize(3);

// The same zoomed muscle figure as the Progress tab, sized to sit inside a quest ring.
function QuestMuscleIcon({ muscleKey }) {
    const segments = muscleKey === "overall" ? OVERALL_MUSCLE_SEGMENTS : DEFAULT_MUSCLE_SEGMENTS[muscleKey] || [];
    const offset = ((MUSCLE_ICON_OFFSETS[muscleKey] || 0) * RING_ICON_SIZE) / MUSCLE_ICON_BASE_SIZE;
    return (
        <View style={styles.questMuscleIcon}>
            <View style={[styles.questMuscleIconZoom, { marginTop: offset }]}>
                <MuscleGroupIcon
                    segments={segments}
                    strokeWidth={MUSCLE_ICON_STROKE_WIDTHS[muscleKey] || null}
                    highlightColor={MUSCLE_ICON_HIGHLIGHT}
                    scale={MUSCLE_ICON_SCALES[muscleKey] || 1}
                />
            </View>
        </View>
    );
}

function QuestRing({ ratio, color, trackColor, children }) {
    const radius = (RING_SIZE - RING_STROKE) / 2;
    const circumference = 2 * Math.PI * radius;
    return (
        <View style={styles.questRing}>
            <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
                <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={radius}
                    stroke={trackColor}
                    strokeWidth={RING_STROKE}
                    fill="none"
                />
                {ratio > 0 && (
                    <Circle
                        cx={RING_SIZE / 2}
                        cy={RING_SIZE / 2}
                        r={radius}
                        stroke={color}
                        strokeWidth={RING_STROKE}
                        strokeLinecap="round"
                        strokeDasharray={`${circumference * ratio} ${circumference}`}
                        fill="none"
                        transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                    />
                )}
            </Svg>
            {children}
        </View>
    );
}

function ExercisesSection({ onScroll, scrollSignal = 0 }) {
    const insets = useSafeAreaInsets();
    const [topSpacerHeight, setTopSpacerHeight] = useState(0);
    const [userData, setUserData] = useState(() => {
        try {
            return global?.userData || null;
        } catch {
            return null;
        }
    });
    const [levelUpQueue, setLevelUpQueue] = useState([]);
    const scrollViewRef = useRef(null);
    const cardLayoutsRef = useRef({});
    const [scrollContainerHeight, setScrollContainerHeight] = useState(0);
    const [contentHeight, setContentHeight] = useState(0);

    useEffect(() => {
        const unsubscribe = subscribeUserData((payload) => {
            setUserData(payload);
        });
        return unsubscribe;
    }, []);

    const completedWorkouts = useMemo(() => {
        if (!Array.isArray(userData?.completedWorkouts)) return [];
        return userData.completedWorkouts.filter(Boolean);
    }, [userData?.completedWorkouts]);

    const userOverallScore = useMemo(() => {
        const raw = Number(userData?.statsHexagon?.overall);
        return Number.isFinite(raw) ? formatHexStat(raw) : null;
    }, [userData?.statsHexagon?.overall]);

    const rankProgress = useMemo(
        () =>
            computeRankProgressFromData({
                completedWorkouts,
                statsHexagon: userData?.statsHexagon,
            }),
        [completedWorkouts, userData?.statsHexagon]
    );
    const currentRankKey =
        rankProgress.currentRankKey || LADDER_LEVELS[LADDER_LEVELS.length - 1]?.key || null;
    const currentRankIndex = Number.isFinite(rankProgress.currentRankIndexDesc)
        ? rankProgress.currentRankIndexDesc
        : LADDER_LEVELS.length - 1;
    const currentRankEntry = rankProgress.currentRankEntry;
    const promotionStatuses = rankProgress.promotionStatuses || new Map();
    const pendingQuestsCount = useMemo(() => {
        try {
            const firstIncomplete = Array.from(promotionStatuses.values()).find(
                (status) => !status.allComplete
            );
            if (firstIncomplete && Array.isArray(firstIncomplete.tasks)) {
                const remaining = firstIncomplete.tasks.filter((task) => !task.complete).length;
                return Number.isFinite(remaining) ? remaining : null;
            }
        } catch {
            return null;
        }
        return null;
    }, [promotionStatuses]);

    const handleScroll = useCallback(
        (event) => {
            if (typeof onScroll === "function") {
                onScroll(event);
            }
        },
        [onScroll]
    );

    useEffect(() => {
        const unsubPromotions = subscribeRankPromotions((queue) => {
            setLevelUpQueue(Array.isArray(queue) ? queue : []);
        });
        return unsubPromotions;
    }, []);

    const attemptCenterCurrentCard = useCallback(
        (options = { animated: false }) => {
            if (scrollContainerHeight <= 0) return;
            const scrollView = scrollViewRef.current;
            if (!scrollView) return;

            let targetKey = currentRankKey;
            try {
                const desiredKey = global?.[LADDER_SCROLL_TARGET_KEY];
                if (desiredKey && typeof desiredKey === "string") {
                    targetKey = desiredKey;
                    if (!options?.preserveTarget) {
                        global[LADDER_SCROLL_TARGET_KEY] = null;
                    }
                }
            } catch {
                // ignore read errors
            }
            if (!targetKey) return;

            const layout = cardLayoutsRef.current[targetKey];
            if (!layout) return;
            const maxOffset = Math.max(0, contentHeight - scrollContainerHeight);
            const footerGap = (insets?.bottom || 0) + TABBAR_HEIGHT + FOOTER_SAFE_OFFSET;

            // Ensure enough headroom above to place this card's bottom just above the footer.
            const cardBottom = (layout.y || 0) + (layout.height || 0);
            const viewportAnchor = scrollContainerHeight - footerGap;
            // If the card sits above the desired anchor, add enough top spacer to push it down.
            const requiredHeadroom = Math.max(0, viewportAnchor - cardBottom + TOP_SPACER_EPSILON);
            if (requiredHeadroom > 0) {
                if (requiredHeadroom > topSpacerHeight) {
                    setTopSpacerHeight(requiredHeadroom);
                }
                return;
            }

            // Rest the target rank card just above the footer so its quest panel sits in view above it.
            const desiredOffset = cardBottom - viewportAnchor;
            const targetOffset = Math.max(0, Math.min(maxOffset, desiredOffset));
            try {
                scrollView.scrollTo({ y: targetOffset, animated: options.animated });
            } catch {
                // ignore scroll failures
            }
        },
        [scrollContainerHeight, contentHeight, currentRankKey, insets?.bottom, topSpacerHeight]
    );

    useEffect(() => {
        attemptCenterCurrentCard({ animated: false, preserveTarget: true });
    }, [attemptCenterCurrentCard]);

    // Re-attempt centering if spacer/measurements change.
    useEffect(() => {
        if (scrollContainerHeight <= 0) return;
        attemptCenterCurrentCard({ animated: false, preserveTarget: true });
    }, [topSpacerHeight, contentHeight, scrollContainerHeight, attemptCenterCurrentCard]);

    useEffect(() => {
        if (!scrollSignal) return;
        if (scrollSignal > 0) {
            attemptCenterCurrentCard({ animated: true, forceKeep: true, preserveTarget: true });
        }
    }, [scrollSignal, attemptCenterCurrentCard]);

    const handleScrollViewLayout = useCallback((event) => {
        const height = event?.nativeEvent?.layout?.height || 0;
        setScrollContainerHeight((prev) => (Math.abs(prev - height) > 1 ? height : prev));
    }, []);

    const handleCardLayout = useCallback(
        (key, layout) => {
            if (!key || !layout) return;
            cardLayoutsRef.current[key] = layout;
            attemptCenterCurrentCard({ animated: false, preserveTarget: true });
        },
        [attemptCenterCurrentCard]
    );

    const handleContentSizeChange = useCallback((_, height) => {
        setContentHeight((prev) => (Math.abs(prev - height) > 1 ? height : prev));
    }, []);

    const activeLevelUp = Array.isArray(levelUpQueue) && levelUpQueue.length ? levelUpQueue[0] : null;

    const handleDismissLevelUp = useCallback(() => {
        dequeueRankPromotion();
        setLevelUpQueue((prev) => (Array.isArray(prev) && prev.length ? prev.slice(1) : prev));
    }, []);

    return (
        <>
            <LevelUpTransition
                visible={!!activeLevelUp}
                fromRank={activeLevelUp?.from}
                toRank={activeLevelUp?.to}
                overallRating={userOverallScore}
                onClose={handleDismissLevelUp}
            />
            <ScrollView
                ref={scrollViewRef}
                style={styles.screen}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                onLayout={handleScrollViewLayout}
                onContentSizeChange={handleContentSizeChange}
                scrollEventThrottle={16}
            >
                <Text style={[styles.topNoticeText, styles.dimmedCard]}>
                    More Ranks Coming Soon!
                </Text>
                {topSpacerHeight > 0 && <View style={{ height: topSpacerHeight }} />}
                {LADDER_LEVELS.map((entry, index) => {
                    const entryIsCurrent = entry.key === currentRankKey;
                    const cardShouldDim =
                        currentRankIndex >= 0 ? index < currentRankIndex : !entryIsCurrent;
                    const nextLevelEntry = index < LADDER_LEVELS.length - 1 ? LADDER_LEVELS[index + 1] : null;
                    const promotionKey = nextLevelEntry
                        ? buildLevelKey(nextLevelEntry.rankTier, nextLevelEntry.rankLabel)
                        : null;
                    const promotionRequirements = promotionKey ? rankLevelPromotionRequirements[promotionKey] : null;
                    const promotionThemeKey =
                        promotionRequirements?.theme || nextLevelEntry?.rankTier || entry.rankTier;
                    const promotionStatusForNext = nextLevelEntry ? promotionStatuses.get(nextLevelEntry.key) : null;
                    const nextLevelIndex = nextLevelEntry ? index + 1 : null;
                    const isImmediatePromotionTarget =
                        typeof nextLevelIndex === "number" && nextLevelIndex === currentRankIndex;
                    const shouldDimRequirementsBlock = cardShouldDim && !isImmediatePromotionTarget;
                    const promotionStatus = promotionStatuses.get(entry.key);
                    const baseTasks = (promotionRequirements?.tasks || []).map((task) => {
                        const descriptor = parseRequirementTask(task);
                        const evaluation = evaluateRequirementProgress(descriptor, rankProgress.metrics);
                        return {
                            label: task,
                            descriptor,
                            ...evaluation,
                        };
                    });
                    const matchedPromotionStatus =
                        promotionStatus?.requirementKey === promotionKey
                            ? promotionStatus
                            : promotionStatusForNext?.requirementKey === promotionKey
                            ? promotionStatusForNext
                            : null;
                    const tasksToRender =
                        (matchedPromotionStatus?.tasks && matchedPromotionStatus.tasks.length > 0
                            ? matchedPromotionStatus.tasks
                            : baseTasks) || [];
                    const requirementsCompleted =
                        matchedPromotionStatus?.allComplete ??
                        (tasksToRender.length ? tasksToRender.every((task) => task.complete) : false);
                    const hasRequirements = tasksToRender.length > 0;
                    const showOverallRating = entryIsCurrent && userOverallScore != null;
                    const currentPendingQuests = entryIsCurrent ? pendingQuestsCount : null;
                    return (
                        <View
                            key={entry.key}
                            style={[
                                styles.cardWrapper,
                                index === 0 && styles.firstCard,
                            ]}
                            onLayout={(event) => handleCardLayout(entry.key, event?.nativeEvent?.layout)}
                        >
                            <View style={cardShouldDim ? styles.dimmedCard : null}>
                                <FeedSnapshotCard
                                    rankTier={entry.rankTier}
                                    rankLabel={entry.rankLabel}
                                    rankLevel={entry.rankLevel}
                                    showRankTabs={false}
                                    forceTabKey="rank"
                                    enableRankAnimations={entryIsCurrent}
                                    overallRating={showOverallRating ? userOverallScore : null}
                                    showOverallRating={showOverallRating}
                                    pendingRequirementsCount={currentPendingQuests}
                                    eyebrowLabel={entryIsCurrent ? "Current rank" : null}
                                />
                            </View>
                            {hasRequirements && (() => {
                                const themeColors =
                                    CARD_THEME_COLORS[promotionThemeKey || entry.rankTier] || CARD_THEME_COLORS.gold;
                                const completedCount = tasksToRender.filter((task) => task?.complete).length;
                                return (
                                    <View
                                        style={[
                                            styles.questPanel,
                                            { borderColor: withAlpha(themeColors.accent, 0.22) },
                                            shouldDimRequirementsBlock && styles.dimmedCard,
                                        ]}
                                    >
                                        <LinearGradient
                                            colors={[withAlpha(themeColors.gradient[1], 0.2), withAlpha(themeColors.gradient[1], 0)]}
                                            style={styles.questPanelGlow}
                                            pointerEvents="none"
                                        />
                                        <View style={styles.questPanelHeader}>
                                            <View>
                                                <Text style={styles.questPanelEyebrow}>
                                                    {requirementsCompleted ? "Unlocked" : "Next rank"}
                                                </Text>
                                                <Text style={styles.questPanelTitle}>
                                                    Reach <Text style={{ color: themeColors.accent }}>{entry.rankLabel}</Text>
                                                </Text>
                                            </View>
                                            <View
                                                style={[
                                                    styles.questCountPill,
                                                    { backgroundColor: withAlpha(themeColors.accent, 0.14) },
                                                ]}
                                            >
                                                <Text style={[styles.questCountText, { color: themeColors.accent }]}>
                                                    {completedCount} of {tasksToRender.length}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.questSegments}>
                                            {tasksToRender.map((taskStatus, segmentIndex) => (
                                                <View
                                                    key={`${entry.key}-segment-${segmentIndex}`}
                                                    style={[
                                                        styles.questSegment,
                                                        taskStatus?.complete && { backgroundColor: themeColors.accent },
                                                    ]}
                                                />
                                            ))}
                                        </View>
                                        <View style={styles.questList}>
                                            {tasksToRender.map((taskStatus, requirementIndex) => {
                                                const descriptor = taskStatus?.descriptor || null;
                                                const taskComplete = !!taskStatus?.complete;
                                                const progressRatio = clampRatio(
                                                    typeof taskStatus?.ratio === "number"
                                                        ? taskStatus.ratio
                                                        : taskComplete
                                                        ? 1
                                                        : 0
                                                );
                                                const progressText = formatRequirementProgressText(
                                                    descriptor,
                                                    taskStatus?.currentValue,
                                                    descriptor?.target,
                                                    ""
                                                );
                                                const [currentText, targetText] = progressText.split(" / ");
                                                const { title, goal, Icon, muscleKey } = describeRequirement(
                                                    taskStatus?.label || "",
                                                    descriptor
                                                );
                                                const QuestIcon = taskComplete ? Check : Icon;
                                                return (
                                                    <View
                                                        key={`${entry.key}-requirement-${requirementIndex}`}
                                                        style={[
                                                            styles.questTile,
                                                            taskComplete && {
                                                                backgroundColor: withAlpha(themeColors.accent, 0.1),
                                                            },
                                                        ]}
                                                    >
                                                        <QuestRing
                                                            ratio={progressRatio}
                                                            color={themeColors.accent}
                                                            trackColor={withAlpha(themeColors.accent, 0.16)}
                                                        >
                                                            {muscleKey && !taskComplete ? (
                                                                <QuestMuscleIcon muscleKey={muscleKey} />
                                                            ) : (
                                                                <QuestIcon
                                                                    size={scaleSize(17)}
                                                                    color={themeColors.accent}
                                                                    strokeWidth={taskComplete ? 3 : 2}
                                                                />
                                                            )}
                                                        </QuestRing>
                                                        <View style={styles.questText}>
                                                            <Text style={styles.questTitle} numberOfLines={1}>
                                                                {title}
                                                            </Text>
                                                            {!!goal && (
                                                                <Text style={styles.questGoal} numberOfLines={1}>
                                                                    {goal}
                                                                </Text>
                                                            )}
                                                        </View>
                                                        <Text
                                                            style={[
                                                                styles.questValue,
                                                                taskComplete && { color: themeColors.accent },
                                                            ]}
                                                        >
                                                            {taskComplete ? "Done" : currentText}
                                                            {!!targetText && !taskComplete && (
                                                                <Text style={styles.questValueTarget}> / {targetText}</Text>
                                                            )}
                                                        </Text>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    </View>
                                );
                            })()}
                        </View>
                    );
                })}
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    content: {
        paddingTop: scaleSize(6),
        paddingBottom: scaleSize(140),
    },
    topNoticeText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(13),
        color: "#f5f6ff",
        letterSpacing: 0.3,
        textAlign: "center",
        marginBottom: scaleSize(10),
    },
    cardWrapper: {
        // marginBottom: scaleSize(20),
    },
    firstCard: {
        marginTop: scaleSize(8),
    },
    dimmedCard: {
        opacity: 0.4,
    },
    questPanel: {
        marginTop: scaleSize(14),
        marginBottom: scaleSize(18),
        marginHorizontal: scaleSize(14),
        borderRadius: scaleSize(20),
        borderWidth: 1,
        backgroundColor: theme.surface,
        overflow: "hidden",
    },
    questPanelGlow: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: scaleSize(72),
    },
    questPanelHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: scaleSize(16),
        paddingTop: scaleSize(16),
        paddingBottom: scaleSize(12),
    },
    questPanelEyebrow: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(10.5),
        color: theme.textSecondary,
        letterSpacing: 1.2,
        textTransform: "uppercase",
        marginBottom: scaleSize(3),
    },
    questPanelTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(18),
        color: theme.textPrimary,
    },
    questCountPill: {
        paddingHorizontal: scaleSize(11),
        paddingVertical: scaleSize(5),
        borderRadius: scaleSize(12),
    },
    questCountText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(12),
        fontVariant: ["tabular-nums"],
    },
    questSegments: {
        flexDirection: "row",
        gap: scaleSize(5),
        paddingHorizontal: scaleSize(16),
    },
    questSegment: {
        flex: 1,
        height: scaleSize(4),
        borderRadius: scaleSize(2),
        backgroundColor: "rgba(255,255,255,0.1)",
    },
    questList: {
        padding: scaleSize(10),
        paddingTop: scaleSize(12),
        gap: scaleSize(6),
    },
    questTile: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: scaleSize(7),
        paddingHorizontal: scaleSize(10),
        borderRadius: scaleSize(13),
        backgroundColor: "rgba(255,255,255,0.045)",
    },
    questRing: {
        width: RING_SIZE,
        height: RING_SIZE,
        alignItems: "center",
        justifyContent: "center",
    },
    questMuscleIcon: {
        width: RING_ICON_SIZE,
        height: RING_ICON_SIZE,
        borderRadius: RING_ICON_SIZE / 2,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
    },
    questMuscleIconZoom: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    questText: {
        flex: 1,
        paddingHorizontal: scaleSize(10),
    },
    questTitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(14),
        lineHeight: scaleSize(17),
        color: theme.textPrimary,
    },
    questGoal: {
        fontFamily: "Outfit_400Regular",
        fontSize: scaleSize(12),
        lineHeight: scaleSize(15),
        color: theme.textSecondary,
    },
    questValue: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(15),
        color: theme.textPrimary,
        fontVariant: ["tabular-nums"],
    },
    questValueTarget: {
        fontFamily: "Outfit_400Regular",
        fontSize: scaleSize(12),
        color: theme.muted,
    },
});

export default React.memo(ExercisesSection);
