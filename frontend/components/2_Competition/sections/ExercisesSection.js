import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
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
import { subscribeUserData } from "../../../utils/userDataEvents";
import { LADDER_SCROLL_TARGET_KEY } from "../../../utils/competitionTabEvents";

const CARD_THEME_COLORS = {
    bronze: { gradient: ["#6f3600ff", "#e19c73ff"], accent: "#f9cba1ff" },
    silver: { gradient: ["#2e3542ff", "#a8c2e6ff"], accent: "#c5e0ffff" },
    gold: { gradient: ["#a1650cff", "#ffd987ff"], accent: "#ffedbbff" },
    ruby: { gradient: ["#511222ff", "#e54b73"], accent: "#ffacc9ff" },
    platinum: { gradient: ["rgba(141, 180, 225, 1)", "#dbefffff"], accent: "#f7fcffff" },
    diamond: { gradient: ["#0d4156ff", "#86e7ffff"], accent: "#bff9ffff" },
};

const CURRENT_CARD_OFFSET = scaleSize(-400);

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

export default function ExercisesSection({ onScroll, scrollSignal = 0 }) {
    const [userData, setUserData] = useState(() => {
        try {
            return global?.userData || null;
        } catch {
            return null;
        }
    });
    const scrollViewRef = useRef(null);
    const cardLayoutsRef = useRef({});
    const hasCenteredRef = useRef(false);
    const [scrollContainerHeight, setScrollContainerHeight] = useState(0);

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
    const promotionStatuses = rankProgress.promotionStatuses || new Map();

    const handleScroll = useCallback(
        (event) => {
            if (typeof onScroll === "function") {
                onScroll(event);
            }
        },
        [onScroll]
    );

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
            const targetOffset = Math.max(
                0,
                layout.y - scrollContainerHeight / 2 + (layout.height || 0) / 2 + CURRENT_CARD_OFFSET
            );
            try {
                scrollView.scrollTo({ y: targetOffset, animated: options.animated });
                if (!options.forceKeep) {
                    hasCenteredRef.current = true;
                }
            } catch {
                // ignore scroll failures
            }
        },
        [scrollContainerHeight, currentRankKey]
    );

    useEffect(() => {
        if (hasCenteredRef.current) return;
        attemptCenterCurrentCard({ animated: false, preserveTarget: true });
    }, [attemptCenterCurrentCard]);

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

    return (
        <ScrollView
            ref={scrollViewRef}
            style={styles.screen}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            onLayout={handleScrollViewLayout}
            scrollEventThrottle={16}
        >
            <Text style={[styles.topNoticeText, styles.dimmedCard]}>
                More Ranks Coming Soon!
            </Text>
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
                const tasksToRender =
                    (promotionStatus?.tasks && promotionStatus.tasks.length > 0
                        ? promotionStatus.tasks
                        : baseTasks) || [];
                const requirementsCompleted =
                    promotionStatus?.allComplete ??
                    (tasksToRender.length ? tasksToRender.every((task) => task.complete) : false);
                const hasRequirements = tasksToRender.length > 0;
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
                            />
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
                                    const fillPercent = Math.min(
                                        100,
                                        Math.max(0, Math.round(progressRatio * 100))
                                    );
                                    return (
                                        <View key={`${entry.key}-requirement-${requirementIndex}`} style={styles.requirementCardWrapper}>
                                            <LinearGradient colors={themeColors.gradient} style={styles.requirementCard}>
                                                <View style={styles.requirementCardRow}>
                                                    <RankTierMiniBadge
                                                        tier={promotionThemeKey}
                                                        level="III"
                                                        size={scaleSize(30)}
                                                        style={styles.requirementBadge}
                                                    />
                                                    <View style={styles.requirementTextContainer}>
                                                        <Text
                                                            style={[
                                                                styles.requirementCardTitle,
                                                                taskComplete && styles.requirementTextCompleted,
                                                            ]}
                                                        >
                                                            {taskLabel}
                                                        </Text>
                                                    </View>
                                                    <View
                                                        style={[
                                                            styles.requirementStatusBadge,
                                                            taskComplete
                                                                ? [styles.requirementStatusBadgeDone, { backgroundColor: themeColors.accent }]
                                                                : styles.requirementStatusBadgeActive,
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.requirementStatusIcon,
                                                                taskComplete && styles.requirementStatusIconDone,
                                                            ]}
                                                        >
                                                            ✓
                                                        </Text>
                                                </View>
                                                </View>
                                                <View style={styles.requirementProgressTrack}>
                                                    <View
                                                        style={[
                                                            styles.requirementProgressFill,
                                                            {
                                                                width: `${fillPercent}%`,
                                                                backgroundColor: themeColors.accent,
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
        marginTop: scaleSize(18),
    },
    requirementCardWrapper: {
        marginBottom: scaleSize(18),
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
        marginRight: scaleSize(4),
    },
    requirementTextContainer: {
        flex: 1,
        paddingHorizontal: scaleSize(10),
    },
    requirementCardTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(15),
        color: "#ffffff",
        letterSpacing: 0.5,
    },
    requirementStatusBadge: {
        width: scaleSize(32),
        height: scaleSize(32),
        borderRadius: scaleSize(16),
        alignItems: "center",
        justifyContent: "center",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.35)",
        backgroundColor: "rgba(0,0,0,0.25)",
    },
    requirementStatusBadgeDone: {
        backgroundColor: theme.primary,
    },
    requirementStatusBadgeActive: {
        backgroundColor: "rgba(255,255,255,0.15)",
    },
    requirementStatusIcon: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(16),
        color: "#1c1c1c",
    },
    requirementStatusIconDone: {
        color: "#ffffff",
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
        fontSize: scaleSize(12),
        color: "#0a0a0a",
        textAlign: "center",
    },
    requirementTextCompleted: {
        color: "#ffffff",
    },
});
