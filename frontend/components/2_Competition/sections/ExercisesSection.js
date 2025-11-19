import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

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

const RANK_REQUIREMENT_COLORS = {
    bronze: "#f0f6ffd5",
    silver: "#f0f6ffd5",
    gold: "#f0f6ffd5",
    platinum: "#f0f6ffd5",
    ruby: "#f0f6ffd5",
    sapphire: "#f0f6ffd5",
    diamond: "#f0f6ffd5",
};
const DEFAULT_REQUIREMENT_COLOR = "#f0f6ffd5";

const CURRENT_CARD_OFFSET = scaleSize(-350);

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

const resolveTierColor = (tier) => {
    const normalized = String(tier || "").toLowerCase().trim();
    return RANK_REQUIREMENT_COLORS[normalized] || DEFAULT_REQUIREMENT_COLOR;
};

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
                const nextLevelIndex = nextLevelEntry ? index + 1 : null;
                const isImmediatePromotionTarget =
                    typeof nextLevelIndex === "number" && nextLevelIndex === CURRENT_RANK_INDEX;
                const requirementsCompleted =
                    !isImmediatePromotionTarget &&
                    typeof nextLevelIndex === "number" &&
                    CURRENT_RANK_INDEX < nextLevelIndex;
                const requirementTextColor = nextLevelEntry
                    ? resolveTierColor(nextLevelEntry.rankTier)
                    : DEFAULT_REQUIREMENT_COLOR;
                const shouldDimRequirementText =
                    requirementsCompleted && !isImmediatePromotionTarget && !entry.isCurrent;
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
                                    styles.requirementsTimeline,
                                    shouldDimRequirementsBlock && styles.dimmedCard,
                                ]}
                            >
                                {promotionRequirements.tasks.map((task, requirementIndex) => {
                                    const isLast = requirementIndex === promotionRequirements.tasks.length - 1;
                                    return (
                                        <React.Fragment key={`${entry.key}-requirement-${requirementIndex}`}>
                                            <View style={styles.requirementStep}>
                                                <View style={styles.requirementMarkerStack}>
                                                    <View
                                                        style={[
                                                            styles.requirementMarker,
                                                            requirementsCompleted && styles.requirementMarkerCompleted,
                                                        ]}
                                                    >
                                                        {requirementsCompleted && (
                                                            <Svg
                                                                width={scaleSize(22)}
                                                                height={scaleSize(22)}
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <Path
                                                                    d="M5 13l4 4L19 7"
                                                                    fill="none"
                                                                    stroke="#000000"
                                                                    strokeWidth={scaleSize(3)}
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                />
                                                            </Svg>
                                                        )}
                                                    </View>
                                                </View>
                                                    <Text
                                                        style={[
                                                            styles.requirementText,
                                                            { color: requirementTextColor },
                                                            shouldDimRequirementText && styles.requirementTextCompleted,
                                                        ]}
                                                    >
                                                        {task}
                                                    </Text>
                                            </View>
                                            {!isLast && <View style={styles.requirementSpacer} />}
                                        </React.Fragment>
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
        marginBottom: scaleSize(20),
    },
    firstCard: {
        marginTop: scaleSize(8),
    },
    dimmedCard: {
        opacity: 0.18,
    },
    requirementsTimeline: {
        marginTop: scaleSize(20),
        marginBottom: scaleSize(20),
        alignItems: "center",
    },
    requirementStep: {
        alignItems: "center",
        // marginBottom: scaleSize(8),
    },
    requirementMarkerStack: {
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
    },
    requirementMarker: {
        width: scaleSize(30),
        height: scaleSize(30),
        borderRadius: scaleSize(15),
        borderWidth: scaleSize(3),
        borderColor: "#5cc6ff",
        backgroundColor: "rgba(92,198,255,0.12)",
        shadowColor: "#5cc6ff",
        shadowOffset: { width: 0, height: scaleSize(2) },
        shadowOpacity: 0.25,
        shadowRadius: scaleSize(4),
        alignItems: "center",
        justifyContent: "center",
    },
    requirementMarkerCompleted: {
        backgroundColor: "#5cc6ff",
    },
    requirementSpacer: {
        height: scaleSize(42),
    },
    requirementText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(17),
        textAlign: "center",
        letterSpacing: 0.6,
        marginTop: scaleSize(10),
        width: REQUIREMENT_TEXT_WIDTH,
        alignSelf: "center",
    },
    requirementTextCompleted: {
    },
});
