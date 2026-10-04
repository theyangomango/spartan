// Top pager of the Progress tab: the muscle body map and the stats hexagon, under the lifetime-workout label and the OVR pill.
import React, { useCallback, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import HumanMuscleOutline from "../../../../assets/human_muscle_outline";
import HumanMuscleBackOutline from "../../../../assets/human_muscle_back_outline";
import { BODYGRAPH_OUTLINE_COLOR } from "../../../../utils/muscleTierColors";
import { chartCardLayout } from "../../../charts/chartStyles";
import { DEVICE_WIDTH, scaleSize } from "../../layoutConstants";
import HexagonalStats from "../../UserStats/HexagonalStats";
import styles from "./ProgressSection.styles";

const BodyOverviewPager = ({
    completedWorkoutsCount,
    completedWorkoutsCountLabel,
    overallHexDisplay,
    muscleFills,
    statsHexagon,
}) => {
    const [topPagerIndex, setTopPagerIndex] = useState(0);
    const topPagerIndexRef = useRef(0);

    const handleTopPagerMomentum = useCallback((event) => {
        const x = event?.nativeEvent?.contentOffset?.x || 0;
        const nextIndex = Math.round(x / DEVICE_WIDTH);
        if (nextIndex !== topPagerIndexRef.current) {
            topPagerIndexRef.current = nextIndex;
            setTopPagerIndex(nextIndex);
        }
    }, []);

    return (
        <View style={styles.topPagerContainer}>
            <View style={styles.bodyLabelOverlayContainer}>
                <Text style={styles.bodyLabelOverlay}>Your Body</Text>
                <Text style={styles.bodyLabelSubtitle}>
                    {`${completedWorkoutsCountLabel} lifetime ${
                        completedWorkoutsCount === 1 ? "workout" : "workouts"
                    }`}
                </Text>
            </View>
            <View style={styles.ovrPill}>
                <Text style={styles.ovrPillLabel}>OVR</Text>
                <Text style={styles.ovrPillValue}>{overallHexDisplay}</Text>
            </View>
            <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToAlignment="center"
                decelerationRate="fast"
                onMomentumScrollEnd={handleTopPagerMomentum}
            >
                <View style={[styles.topPagerPage, { width: DEVICE_WIDTH }]}>
                    <View
                        style={[
                            chartCardLayout.card,
                            styles.card,
                            styles.bodyCard,
                            styles.topPagerCard,
                        ]}
                    >
                        <View style={styles.bodyFiguresRow}>
                            <View style={[styles.bodyFigureSlot, styles.bodyFigureSlotFront]}>
                                <HumanMuscleOutline
                                    color={BODYGRAPH_OUTLINE_COLOR}
                                    width="120%"
                                    height="118%"
                                    preserveAspectRatio="xMidYMid meet"
                                    fills={muscleFills}
                                    style={styles.bodyFigure}
                                />
                            </View>
                            <View style={[styles.bodyFigureSlot, styles.bodyFigureSlotBack]}>
                                <HumanMuscleBackOutline
                                    color={BODYGRAPH_OUTLINE_COLOR}
                                    width="120%"
                                    height="118%"
                                    preserveAspectRatio="xMidYMid meet"
                                    fills={muscleFills}
                                    style={styles.bodyFigure}
                                />
                            </View>
                        </View>
                    </View>
                </View>
                <View style={[styles.topPagerPage, { width: DEVICE_WIDTH }]}>
                    <View
                        style={[
                            chartCardLayout.card,
                            styles.card,
                            styles.hexCard,
                            styles.topPagerCard,
                        ]}
                    >
                        <View style={styles.hexGraphWrap}>
                            <HexagonalStats
                                statsHexagon={statsHexagon}
                                size={scaleSize(300)}
                                labelFontPx={14}
                                valueFontPx={16}
                                valueFontBigPx={18}
                            />
                        </View>
                    </View>
                </View>
            </ScrollView>
            <View style={styles.topPagerDots}>
                {[0, 1].map((index) => (
                    <View
                        key={index}
                        style={[
                            styles.topPagerDot,
                            topPagerIndex === index ? styles.topPagerDotActive : null,
                        ]}
                    />
                ))}
            </View>
        </View>
    );
};

export default BodyOverviewPager;
