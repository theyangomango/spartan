import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import theme from "../../../theme/mfpDark";
import { scaleSize } from "../layoutConstants";
import FeedSnapshotCard from "../../1_Feed/FeedSnapshotCard";

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

export default function ExercisesSection({ onScroll }) {
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

    const attemptCenterCurrentCard = useCallback(() => {
        if (hasCenteredRef.current) return;
        if (!CURRENT_RANK_KEY) return;
        const scrollView = scrollViewRef.current;
        if (!scrollView) return;
        const layout = cardLayoutsRef.current[CURRENT_RANK_KEY];
        if (!layout) return;
        const containerHeight = scrollContainerHeight > 0 ? scrollContainerHeight : layout.height || 0;
        const targetOffset = Math.max(0, layout.y - containerHeight / 2 + (layout.height || 0) / 2);
        try {
            scrollView.scrollTo({ y: targetOffset, animated: false });
            hasCenteredRef.current = true;
        } catch {
            // ignore scroll failures
        }
    }, [scrollContainerHeight]);

    useEffect(() => {
        attemptCenterCurrentCard();
    }, [attemptCenterCurrentCard]);

    const handleScrollViewLayout = useCallback((event) => {
        const height = event?.nativeEvent?.layout?.height || 0;
        setScrollContainerHeight((prev) => (Math.abs(prev - height) > 1 ? height : prev));
    }, []);

    const handleCardLayout = useCallback(
        (key, layout) => {
            if (!key || !layout) return;
            cardLayoutsRef.current[key] = layout;
            attemptCenterCurrentCard();
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
                const shouldDim =
                    CURRENT_RANK_INDEX >= 0 ? index < CURRENT_RANK_INDEX : !entry.isCurrent;
                return (
                    <View
                        key={entry.key}
                        style={[
                            styles.cardWrapper,
                            index === 0 && styles.firstCard,
                            shouldDim && styles.dimmedCard,
                        ]}
                        onLayout={(event) => handleCardLayout(entry.key, event?.nativeEvent?.layout)}
                    >
                        <FeedSnapshotCard
                            rankTier={entry.rankTier}
                            rankLabel={entry.rankLabel}
                            showRankTabs={false}
                            forceTabKey="rank"
                            enableRankAnimations={entry.isCurrent}
                        />
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
});
