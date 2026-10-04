import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
import { dequeueRankPromotion, subscribeRankPromotions, subscribeUserData } from "../../../utils/userDataEvents";
import { LADDER_SCROLL_TARGET_KEY } from "../../../utils/competitionTabEvents";
import formatHexStat from "../../../utils/formatHexStat";
import styles from "./ExercisesSection.styles";
import LadderQuestPanel from "./LadderQuestPanel";

const FOOTER_SAFE_OFFSET = scaleSize(16);
const TABBAR_HEIGHT = scaleSize(88);
const TOP_SPACER_EPSILON = scaleSize(12);

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
    const promotionStatuses = rankProgress.promotionStatuses;
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
        attemptCenterCurrentCard({ animated: true, preserveTarget: true });
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
        // The queue subscription updates local state; slicing here as well would skip a step.
        dequeueRankPromotion();
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
                            {hasRequirements && (
                                <LadderQuestPanel
                                    entry={entry}
                                    promotionThemeKey={promotionThemeKey}
                                    tasksToRender={tasksToRender}
                                    requirementsCompleted={requirementsCompleted}
                                    shouldDimRequirementsBlock={shouldDimRequirementsBlock}
                                    showHeader={isImmediatePromotionTarget}
                                />
                            )}
                        </View>
                    );
                })}
            </ScrollView>
        </>
    );
}

export default React.memo(ExercisesSection);
