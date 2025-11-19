import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import theme from "../../../theme/mfpDark";
import { scaleSize } from "../layoutConstants";
import FeedSnapshotCard from "../../1_Feed/FeedSnapshotCard";
import rankLevelPromotionRequirements from "../../../data/rankLevelTasks";

const SCREEN_WIDTH = Dimensions.get("window").width || 360;
const REQUIREMENT_TEXT_WIDTH = SCREEN_WIDTH * 0.4;

const TIER_ORDER_DESC = ["diamond", "platinum", "ruby", "gold", "silver", "bronze"];
const LEVEL_ORDER_DESC = ["V", "IV", "III", "II", "I"];
const DISPLAY_TITLES = {
    bronze: "Bronze",
    silver: "Silver",
    gold: "Gold",
    ruby: "Ruby",
    platinum: "Platinum",
    diamond: "Diamond",
};
const CURRENT_RANK = { tier: "gold", level: "III" };

const CARD_THEME_COLORS = {
    bronze: { gradient: ["#402515", "#8b5a2b"], accent: "#f7d6a0" },
    silver: { gradient: ["#4e617c", "#a1b7d6"], accent: "#e5f2ff" },
    gold: { gradient: ["#6b4000", "#f0c15a"], accent: "#ffe9b8" },
    ruby: { gradient: ["#6c1a2e", "#e54b73"], accent: "#ffc6d9" },
    platinum: { gradient: ["#324a63", "#7dbff2"], accent: "#daf0ff" },
    diamond: { gradient: ["#0c2538", "#6ae0ff"], accent: "#d8fbff" },
};

const CURRENT_CARD_OFFSET = scaleSize(-400);

const LADDER_LEVELS = TIER_ORDER_DESC.flatMap((tier) =>
    LEVEL_ORDER_DESC.map((level) => {
        const label = `${DISPLAY_TITLES[tier] || tier} ${level}`;
        const isCurrent = tier === CURRENT_RANK.tier && level === CURRENT_RANK.level;
        return {
            key: `${tier}-${level}`,
            rankTier: tier,
            rankLabel: label,
            isCurrent,
        };
    })
);
const CURRENT_RANK_INDEX = LADDER_LEVELS.findIndex((entry) => entry.isCurrent);
const CURRENT_RANK_KEY = CURRENT_RANK_INDEX >= 0 ? LADDER_LEVELS[CURRENT_RANK_INDEX]?.key : null;

const buildLevelKey = (tier, rankLabel) => {
    const normalizedTier = String(tier || "").toLowerCase().trim();
    if (!normalizedTier) return null;
    const tokens = String(rankLabel || "").trim().split(" ");
    const levelToken = tokens[tokens.length - 1]?.toLowerCase()?.replace(/[^iv]+/g, "") || tokens[tokens.length - 1]?.toLowerCase();
    const normalizedLevel = levelToken || tokens[tokens.length - 1]?.toLowerCase();
    if (!normalizedLevel) return null;
    return `${normalizedTier}-${normalizedLevel}`;
};

export default function ExercisesSection({ onScroll, scrollSignal = 0 }) {
    const scrollViewRef = useRef(null);
    const cardLayoutsRef = useRef({});
    const hasCenteredRef = useRef(false);
    const [scrollContainerHeight, setScrollContainerHeight] = useState(0);

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
            if (!CURRENT_RANK_KEY) return;
            if (scrollContainerHeight <= 0) return;
            const scrollView = scrollViewRef.current;
            if (!scrollView) return;
            const layout = cardLayoutsRef.current[CURRENT_RANK_KEY];
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
        [scrollContainerHeight]
    );

    useEffect(() => {
        if (hasCenteredRef.current) return;
        attemptCenterCurrentCard({ animated: false });
    }, [attemptCenterCurrentCard]);

    useEffect(() => {
        if (!scrollSignal) return;
        if (scrollSignal > 0) {
            attemptCenterCurrentCard({ animated: true, forceKeep: true });
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
            attemptCenterCurrentCard({ animated: false });
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
            {LADDER_LEVELS.map((entry, index) => {
                const cardShouldDim =
                    CURRENT_RANK_INDEX >= 0 ? index < CURRENT_RANK_INDEX : !entry.isCurrent;
                const nextLevelEntry = index < LADDER_LEVELS.length - 1 ? LADDER_LEVELS[index + 1] : null;
                const promotionKey = nextLevelEntry
                    ? buildLevelKey(nextLevelEntry.rankTier, nextLevelEntry.rankLabel)
                    : null;
                const promotionRequirements = promotionKey ? rankLevelPromotionRequirements[promotionKey] : null;
                const promotionThemeKey =
                    promotionRequirements?.theme || nextLevelEntry?.rankTier || entry.rankTier;
                const nextLevelIndex = nextLevelEntry ? index + 1 : null;
                const isImmediatePromotionTarget =
                    typeof nextLevelIndex === "number" && nextLevelIndex === CURRENT_RANK_INDEX;
                const requirementsCompleted =
                    !isImmediatePromotionTarget &&
                    typeof nextLevelIndex === "number" &&
                    CURRENT_RANK_INDEX < nextLevelIndex;
                const shouldDimRequirementsBlock = cardShouldDim && !isImmediatePromotionTarget;
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
                                showRankTabs={false}
                                forceTabKey="rank"
                                enableRankAnimations={entry.isCurrent}
                            />
                        </View>
                        {promotionRequirements && (
                            <View
                                style={[
                                    styles.requirementCardsColumn,
                                    shouldDimRequirementsBlock && styles.dimmedCard,
                                ]}
                            >
                                {promotionRequirements.tasks.map((task, requirementIndex) => {
                                    const themeKey = promotionThemeKey || entry.rankTier;
                                    const themeColors = CARD_THEME_COLORS[themeKey] || CARD_THEME_COLORS.gold;
                                    const taskComplete = requirementsCompleted;
                                    return (
                                        <View key={`${entry.key}-requirement-${requirementIndex}`} style={styles.requirementCardWrapper}>
                                            <LinearGradient colors={themeColors.gradient} style={styles.requirementCard}>
                                                <View style={styles.requirementCardRow}>
                                                    <View style={[styles.requirementTicket, { backgroundColor: `${themeColors.accent}25` }]}>
                                                        <Text style={styles.requirementTicketText}>
                                                            {String(requirementIndex + 1).padStart(2, "0")}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.requirementTextContainer}>
                                                        <Text
                                                            style={[
                                                                styles.requirementCardTitle,
                                                                taskComplete && styles.requirementTextCompleted,
                                                            ]}
                                                        >
                                                            {task}
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
                                                                width: taskComplete ? "100%" : "30%",
                                                                backgroundColor: themeColors.accent,
                                                                opacity: taskComplete ? 1 : 0.5,
                                                            },
                                                        ]}
                                                    />
                                                    <Text style={styles.requirementProgressText}>
                                                        {taskComplete ? "1 / 1" : "0 / 1"}
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
    requirementTicket: {
        borderRadius: scaleSize(14),
        paddingHorizontal: scaleSize(10),
        paddingVertical: scaleSize(4),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.25)",
    },
    requirementTicketText: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: scaleSize(12),
        color: "#fff",
    },
    requirementTextContainer: {
        flex: 1,
        paddingHorizontal: scaleSize(10),
    },
    requirementCardTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(15),
        color: "#fffdf3",
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
        height: scaleSize(16),
        borderRadius: scaleSize(10),
        backgroundColor: "rgba(0,0,0,0.35)",
        overflow: "hidden",
        justifyContent: "center",
    },
    requirementProgressFill: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        borderRadius: scaleSize(10),
    },
    requirementProgressText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(11),
        color: "rgba(10,10,10,0.78)",
        textAlign: "center",
    },
    requirementTextCompleted: {
        color: "rgba(255,255,255,0.55)",
    },
});
