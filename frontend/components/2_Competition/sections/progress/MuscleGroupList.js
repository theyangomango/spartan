// Muscle groups of the Progress tab with their score; a row opens that group's exercises.
import React from "react";
import { Text, View } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { Ionicons } from "@expo/vector-icons";

import MuscleGroupIcon from "../../../3_Workout/NewWorkout/SelectExercise/MuscleGroupIcon";
import { chartCardLayout } from "../../../charts/chartStyles";
import { scaleSize } from "../../layoutConstants";
import { MUSCLE_ICON_HIGHLIGHT, MUSCLE_ICON_HIGHLIGHT_DIM } from "../../muscleGroupIconLayout";
import styles from "./ProgressSection.styles";

const MuscleGroupList = ({ items, onPress }) => {
    return (
        <View
        style={[
            chartCardLayout.card,
            styles.card,
            styles.muscleListCard,
        ]}
        >
            <View style={styles.muscleList}>
                {items.map((item) => {
                    const isOverall = item.key === "overall";
                    return (
                        <RNBounceable
                            key={item.key}
                            style={styles.muscleRow}
                            onPress={() => onPress(item)}
                            activeScale={0.97}
                            accessibilityRole="button"
                            accessibilityLabel={`View ${item.label} exercises`}
                        >
                            <View style={styles.muscleLeft}>
                                <View style={styles.muscleBadge}>
                                    <View style={styles.muscleIconContainer}>
                                        <View
                                            style={[
                                                styles.muscleIconZoom,
                                                item.iconOffset ? { marginTop: item.iconOffset } : null,
                                            ]}
                                        >
                                            <MuscleGroupIcon
                                                segments={item.segments}
                                                dimmed={false}
                                                strokeWidth={item.iconStrokeWidth}
                                                highlightColor={MUSCLE_ICON_HIGHLIGHT}
                                                dimHighlightColor={MUSCLE_ICON_HIGHLIGHT_DIM}
                                                scale={item.iconScale}
                                            />
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.muscleLabelColumn}>
                                    <Text
                                        style={[
                                            styles.muscleLabel,
                                            isOverall ? styles.muscleLabelOverall : null,
                                        ]}
                                    >
                                        {item.label}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.muscleRight}>
                                <Text
                                    style={[
                                        styles.muscleValue,
                                        isOverall ? styles.muscleValueOverall : null,
                                    ]}
                                >
                                    {item.display}
                                </Text>
                                <Ionicons name="chevron-forward" size={scaleSize(18)} color="rgba(255,255,255,0.55)" />
                            </View>
                        </RNBounceable>
                    );
                })}
            </View>
        </View>
    );
};

export default MuscleGroupList;
