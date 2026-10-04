// Horizontal row of muscle-group chips that filters the exercise picker by body part.
import React from "react";
import { View, ScrollView, Pressable } from "react-native";
import scaleSize from "../../../../helper/scaleSize";
import {
    MUSCLE_ICON_HIGHLIGHT,
    MUSCLE_ICON_HIGHLIGHT_DIM,
    MUSCLE_ICON_STROKE_WIDTHS,
    OVERALL_MUSCLE_SEGMENTS,
} from "../../../2_Competition/muscleGroupIconLayout";
import MuscleGroupIcon from "./MuscleGroupIcon";
import styles from "./selectExerciseModalStyles";

// Apply scaling at SVG render-time to keep icons crisp.
const MUSCLE_ICON_SCALES = {
    shoulders: 2.6,
    chest: 2.8,
    arms: 1.8,
    back: 2.2,
    abs: 3,
    legs: 2.4,
    overall: 1.6,
};
const MUSCLE_ICON_OFFSETS = {
    shoulders: scaleSize(70),
    chest: scaleSize(80),
    arms: scaleSize(25),
    back: scaleSize(50),
    abs: scaleSize(40),
    legs: scaleSize(-20),
    overall: scaleSize(10),
};
const MUSCLE_FILTER_ORDER = ["overall", "chest", "shoulders", "arms", "back", "legs", "abs"];

const MUSCLE_FILTERS = [
    {
        label: "Full Body",
        value: null,
        segments: OVERALL_MUSCLE_SEGMENTS,
    },
    { label: "Chest", value: "Chest", segments: ["chest"] },
    { label: "Shoulders", value: "Shoulders", segments: ["shoulders"] },
    { label: "Arms", value: "Arms", segments: ["arms", "forearms"] },
    { label: "Legs", value: "Legs", segments: ["quads", "calves"] },
    { label: "Abs", value: "Abs", segments: ["abs", "obliques"] },
    { label: "Back", value: "Back", segments: ["back", "traps"] },
];

export default function MuscleFilterBar({ bodyPartValue, setBodyPartValue }) {
    return (
        <View style={styles.muscleFilterSection}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.muscleFilterScroll}
                contentContainerStyle={styles.muscleFilterContent}
                snapToAlignment="start"
                decelerationRate="fast"
            >
                <View style={styles.muscleFilterRow}>
                    {MUSCLE_FILTERS.slice()
                        .sort((a, b) => {
                            const aKey = (a.value || "").toString().toLowerCase();
                            const bKey = (b.value || "").toString().toLowerCase();
                            const aIdx = MUSCLE_FILTER_ORDER.indexOf(aKey === "" ? "overall" : aKey);
                            const bIdx = MUSCLE_FILTER_ORDER.indexOf(bKey === "" ? "overall" : bKey);
                            const aPos = aIdx === -1 ? Number.MAX_SAFE_INTEGER : aIdx;
                            const bPos = bIdx === -1 ? Number.MAX_SAFE_INTEGER : bIdx;
                            return aPos - bPos;
                        })
                        .map((option, index) => {
                        const isActive = option.value === bodyPartValue;
                        return (
                            <Pressable
                                key={option.label}
                                style={[
                                    styles.muscleFilterChip,
                                    isActive && styles.muscleFilterChipActive,
                                    index === MUSCLE_FILTERS.length - 1 &&
                                    styles.muscleFilterChipLast,
                                ]}
                                onPress={() =>
                                    setBodyPartValue(isActive ? null : option.value)
                                }
                                accessibilityRole="button"
                                accessibilityLabel={option.label}
                            >
                                <View
                                    style={[
                                        styles.muscleFilterIconWrap,
                                        isActive && styles.muscleFilterIconWrapActive,
                                    ]}
                                >
                                    <View
                                        style={[
                                            styles.muscleFilterIconInner,
                                            styles.muscleFilterIconZoom,
                                            MUSCLE_ICON_OFFSETS[
                                                (option.value || "overall").toString().toLowerCase()
                                            ]
                                                ? {
                                                    marginTop:
                                                        MUSCLE_ICON_OFFSETS[
                                                            (option.value || "overall").toString().toLowerCase()
                                                        ],
                                                }
                                                : null,
                                        ]}
                                    >
                                        <MuscleGroupIcon
                                            segments={option.segments}
                                            dimmed={!isActive}
                                            highlightColor={MUSCLE_ICON_HIGHLIGHT}
                                            dimHighlightColor={MUSCLE_ICON_HIGHLIGHT_DIM}
                                            strokeWidth={
                                                MUSCLE_ICON_STROKE_WIDTHS[
                                                    (option.value || "").toString().toLowerCase()
                                                ] || undefined
                                            }
                                            scale={
                                                MUSCLE_ICON_SCALES[
                                                    (option.value || "overall").toString().toLowerCase()
                                                ] || 1
                                            }
                                        />
                                    </View>
                                </View>
                            </Pressable>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}
