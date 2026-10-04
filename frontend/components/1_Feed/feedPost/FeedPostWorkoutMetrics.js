// Body graph and metric column (duration, volume, calories, records) of a workout feed post.

import React from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import HumanMuscleOutline from "../../../assets/human_muscle_outline";
import HumanMuscleBackOutline from "../../../assets/human_muscle_back_outline";
import scaleSize from "../../../helper/scaleSize";
import { BODYGRAPH_OUTLINE_COLOR } from "../../../utils/muscleTierColors";
import styles from "../SimpleFeedPost.styles";

const FeedPostWorkoutMetrics = ({
    onPress,
    muscleFills,
    isLivePost,
    durationLabel,
    volumeLabel,
    weightUnit,
    caloriesLabel,
    hasCalories,
    onPressCaloriesInfo,
    recordsLabel,
}) => (
    <Pressable
        onPress={onPress}
        style={styles.metricsRow}
    >
        <View style={styles.metricsFigures}>
            <View style={[styles.metricsFigureSlot, styles.metricsFigureFront]}>
                <HumanMuscleOutline
                    color={BODYGRAPH_OUTLINE_COLOR}
                    width="120%"
                    height="120%"
                    preserveAspectRatio="xMidYMid meet"
                    fills={muscleFills}
                    style={styles.metricsFigure}
                />
            </View>
            <View style={[styles.metricsFigureSlot, styles.metricsFigureBack]}>
                <HumanMuscleBackOutline
                    color={BODYGRAPH_OUTLINE_COLOR}
                    width="120%"
                    height="120%"
                    preserveAspectRatio="xMidYMid meet"
                    fills={muscleFills}
                    style={styles.metricsFigure}
                />
            </View>
        </View>

        <View style={styles.metricsColumnStack}>
            <View style={styles.metricTopStack}>
                <View style={styles.metricStackRow}>
                    <View style={styles.metricLabelRow}>
                        {isLivePost ? <View style={styles.metricLiveDot} /> : null}
                        <Text style={[styles.metricLabel, styles.metricLabelRight]}>Duration</Text>
                    </View>
                    <Text style={[styles.metricValue, styles.metricValueRight]}>{durationLabel}</Text>
                </View>

                <View style={styles.metricStackRow}>
                    <View style={styles.metricLabelRow}>
                        {isLivePost ? <View style={styles.metricLiveDot} /> : null}
                        <Text style={[styles.metricLabel, styles.metricLabelRight]}>Volume</Text>
                    </View>
                    <Text style={[styles.metricValue, styles.metricValueRight]}>{volumeLabel} {weightUnit}</Text>
                </View>

                <View style={styles.metricStackRow}>
                    <View style={styles.metricLabelRow}>
                        {isLivePost ? <View style={styles.metricLiveDot} /> : null}
                        <Text style={[styles.metricLabel, styles.metricLabelRight]}>Calories</Text>
                    </View>
                    <View style={[styles.metricValueRow, styles.metricValueRowRight]}>
                        <Text style={[styles.metricValue, styles.metricValueRight]}>
                            {caloriesLabel}
                            {hasCalories ? " kcal" : ""}
                        </Text>
                        {!hasCalories ? (
                            <Pressable
                                onPress={onPressCaloriesInfo}
                                hitSlop={8}
                                style={styles.metricInfoIcon}
                                accessibilityRole="button"
                                accessibilityLabel="How are calories estimated?"
                            >
                                <MaterialCommunityIcons
                                    name="information-outline"
                                    size={scaleSize(15)}
                                    color="#9aa6bf"
                                />
                            </Pressable>
                        ) : null}
                    </View>
                </View>
            </View>

            <View style={[styles.metricStackRow, styles.metricStackRowLast]}>
                <View style={styles.metricLabelRow}>
                    {isLivePost ? <View style={styles.metricLiveDot} /> : null}
                    <Text style={[styles.metricLabel, styles.metricLabelRight]}>Records</Text>
                </View>
                <View style={styles.recordsValueRow}>
                    <MaterialCommunityIcons name="medal" size={scaleSize(16)} color="#FFD700" />
                    <Text style={[styles.metricValue, styles.metricValueRight]}>{recordsLabel}</Text>
                </View>
            </View>
        </View>
    </Pressable>
);

export default FeedPostWorkoutMetrics;
