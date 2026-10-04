// Progress ring of a ladder quest tile, and the zoomed muscle figure that can sit inside it.
import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import MuscleGroupIcon from "../../3_Workout/NewWorkout/SelectExercise/MuscleGroupIcon";
import { DEFAULT_MUSCLE_SEGMENTS } from "../../../utils/muscleTierColors";
import { scaleSize } from "../layoutConstants";
import {
    MUSCLE_ICON_BASE_SIZE,
    MUSCLE_ICON_HIGHLIGHT,
    MUSCLE_ICON_OFFSETS,
    MUSCLE_ICON_SCALES,
    MUSCLE_ICON_STROKE_WIDTHS,
    OVERALL_MUSCLE_SEGMENTS,
} from "../muscleGroupIconLayout";

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

const styles = StyleSheet.create({
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
});

export { QuestMuscleIcon };
export default QuestRing;
