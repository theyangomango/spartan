import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

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
import RankTierMiniBadge from "../RankTierMiniBadge";
import LevelUpTransition from "../LevelUpTransition";
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

const clampRatio = (value) => {
    if (!Number.isFinite(value)) return 0;
    return Math.min(1, Math.max(0, value));
};

const capitalizeLabel = (value) => {
    if (!value || typeof value !== "string") return "";
    return value.charAt(0).toUpperCase() + value.slice(1);
};

const renderRequirementLabel = (taskLabel, descriptor, taskComplete, emphasisColor) => {
    const baseStyle = [styles.requirementCardTitle, taskComplete && styles.requirementTextCompleted];
    const emphasisStyle = [styles.requirementCardTitleEmphasis, emphasisColor ? { color: emphasisColor } : null];

    if (!descriptor || !descriptor.type) {
        return <Text style={baseStyle}>{taskLabel}</Text>;
    }

    if (descriptor.type === "score") {
        const bodyLabel = descriptor.key === "overall" ? "Overall" : capitalizeLabel(descriptor.key);
        const targetNumber = formatScoreValue(descriptor.target || 0);
        return (
            <Text style={baseStyle}>
                Reach <Text style={emphasisStyle}>{targetNumber}+</Text> <Text style={emphasisStyle}>{bodyLabel}</Text>
            </Text>
        );
    }

    if (descriptor.type === "volume") {
        const weightNumber = formatWeightValue(descriptor.target || 0);
        return (
            <Text style={baseStyle}>
                Lift <Text style={emphasisStyle}>{weightNumber}</Text> lbs Total
            </Text>
        );
    }

    if (descriptor.type === "workouts") {
        const workoutsNumber = formatCountValue(descriptor.target || 0);
        return (
            <Text style={baseStyle}>
                Log <Text style={emphasisStyle}>{workoutsNumber}</Text> Workouts
            </Text>
        );
    }

    return <Text style={baseStyle}>{taskLabel}</Text>;
};

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
    const rankCardHeightsRef = useRef({});
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

            const rankCardHeight = rankCardHeightsRef.current[targetKey] || 0;
            const desiredOffset = cardBottom - viewportAnchor - scrollContainerHeight + rankCardHeight;
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
                                <View
                                    onLayout={(event) => {
                                        const h = event?.nativeEvent?.layout?.height || 0;
                                        if (h > 0) rankCardHeightsRef.current[entry.key] = h;
                                    }}
                                >
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
                                    />
                                </View>
                            </View>
                            {hasRequirements && (
                                <View
                                    style={[
                                        styles.requirementCardsColumn,
                                        shouldDimRequirementsBlock && styles.dimmedCard,
                                    ]}
                                >
                                    {tasksToRender.map((taskStatus, requirementIndex) => {
                                        const themeKey = promotionThemeKey || entry.rankTier;
                                        const themeColors = CARD_THEME_COLORS[themeKey] || CARD_THEME_COLORS.gold;
                                        const taskLabel = taskStatus?.label || "";
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
                                            taskComplete ? "Completed" : "In progress"
                                        );
                                        const statusLabel = taskComplete ? "Completed" : "In Progress";
                                        const fillColor = themeColors.accent;
                                        const fillPercent = Math.min(
                                            100,
                                            Math.max(0, Math.round(progressRatio * 100))
                                        );
                                        const badgeContent = taskComplete ? (
                                            <RankTierMiniBadge tier={promotionThemeKey} level="III" size={scaleSize(34)} />
                                        ) : (
                                            <View
                                                style={[
                                                    styles.requirementOutlineBadge,
                                                    { borderColor: themeColors.accent },
                                                ]}
                                            />
                                        );
                                        return (
                                            <View key={`${entry.key}-requirement-${requirementIndex}`} style={styles.requirementCardWrapper}>
                                                <LinearGradient colors={themeColors.gradient} style={styles.requirementCard}>
                                                    <View style={styles.requirementCardRow}>
                                                        <View style={styles.requirementBadge}>
                                                            {badgeContent}
                                                        </View>
                                                        <View style={styles.requirementTextContainer}>
                                                            {renderRequirementLabel(taskLabel, descriptor, taskComplete, themeColors.accent)}
                                                        </View>
                                                        <View
                                                            style={[
                                                                styles.requirementStatusBadge,
                                                                taskComplete
                                                                    ? [
                                                                          styles.requirementStatusBadgeDone,
                                                                          { backgroundColor: themeColors.accent, borderColor: themeColors.accent },
                                                                      ]
                                                                    : [
                                                                          styles.requirementStatusBadgeActive,
                                                                          { borderColor: themeColors.accent },
                                                                      ],
                                                            ]}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.requirementStatusIcon,
                                                                    taskComplete
                                                                        ? styles.requirementStatusIconDone
                                                                        : { color: themeColors.accent },
                                                                ]}
                                                            >
                                                                {statusLabel}
                                                            </Text>
                                                    </View>
                                                    </View>
                                                    <View style={styles.requirementProgressTrack}>
                                                        <View
                                                            style={[
                                                                styles.requirementProgressFill,
                                                                {
                                                                    width: `${fillPercent}%`,
                                                                    backgroundColor: fillColor,
                                                                },
                                                            ]}
                                                        />
                                                        <Text style={styles.requirementProgressText}>
                                                            {progressText}
                                                        </Text>
                                                    </View>
                                                </LinearGradient>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
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
        opacity: 0.18,
    },
    requirementCardsColumn: {
        marginTop: scaleSize(14),
    },
    requirementCardWrapper: {
        marginBottom: scaleSize(14),
        borderRadius: scaleSize(18),
        overflow: "hidden",
        shadowColor: "#000000",
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: scaleSize(5) },
        shadowRadius: scaleSize(8),
    },
    requirementCard: {
        borderRadius: scaleSize(18),
        paddingVertical: scaleSize(14),
        paddingHorizontal: scaleSize(16),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.2)",
    },
    requirementCardRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: scaleSize(12),
    },
    requirementBadge: {
        width: scaleSize(34),
        height: scaleSize(34),
        alignItems: "center",
        justifyContent: "center",
        marginRight: scaleSize(2),
    },
    requirementOutlineBadge: {
        width: scaleSize(32),
        height: scaleSize(32),
        borderRadius: scaleSize(16),
        borderWidth: scaleSize(2.2),
        backgroundColor: "transparent",
    },
    requirementTextContainer: {
        flex: 1,
        paddingHorizontal: scaleSize(6),
        justifyContent: "center",
    },
    requirementCardTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(13.5),
        color: "#ffffff",
        letterSpacing: 0.5,
    },
    requirementCardTitleEmphasis: {
        fontFamily: "Outfit_900Black",
        fontSize: scaleSize(13),
    },
    requirementStatusBadge: {
        paddingHorizontal: scaleSize(12),
        minHeight: scaleSize(28),
        paddingVertical: scaleSize(5),
        minWidth: scaleSize(96),
        borderRadius: scaleSize(14),
        alignItems: "center",
        justifyContent: "center",
        borderWidth: scaleSize(1),
        borderColor: "rgba(255,255,255,0.35)",
        backgroundColor: "rgba(0,0,0,0.25)",
        alignSelf: "center",
    },
    requirementStatusBadgeDone: {
        backgroundColor: theme.primary,
    },
    requirementStatusBadgeActive: {
        backgroundColor: "rgba(255,255,255,0.15)",
    },
    requirementStatusIcon: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: scaleSize(10),
        color: "#ffffff",
        letterSpacing: 0.2,
        textTransform: "uppercase",
        textAlign: "center",
        lineHeight: scaleSize(12),
    },
    requirementStatusIconDone: {
        color: "#0a0a0a",
    },
    requirementProgressTrack: {
        height: scaleSize(22),
        borderRadius: scaleSize(12),
        backgroundColor: "rgba(0,0,0,0.35)",
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center",
        alignSelf: "stretch",
        width: "100%",
        marginTop: scaleSize(4),
    },
    requirementProgressFill: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        borderRadius: scaleSize(12),
    },
    requirementProgressText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(11),
        color: "#0a0a0a",
        textAlign: "center",
    },
    requirementTextCompleted: {
        color: "#ffffff",
    },
});

export default React.memo(ExercisesSection);
