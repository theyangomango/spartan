import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import HumanMuscleOutline from "../../../../assets/human_muscle_outline";
import HumanMuscleBackOutline from "../../../../assets/human_muscle_back_outline";

const BASE_COLOR_ACTIVE = "#747881ff";
const BASE_COLOR_DIMMED = "#474e5bff";
const HIGHLIGHT_ACTIVE = "#4FAEFF";
const HIGHLIGHT_DIMMED = "#2C7BD6";
const STROKE_ACTIVE = "#f4f7ff";
const STROKE_DIMMED = "#c6d0e5";
const STROKE_WIDTH = 10;

export default function MuscleGroupIcon({
  segments = [],
  dimmed = false,
  strokeWidth = STROKE_WIDTH,
  highlightColor = null,
  dimHighlightColor = null,
}) {
  const fills = useMemo(() => {
    const activeHighlight = highlightColor || HIGHLIGHT_ACTIVE;
    const dimmedHighlight = dimHighlightColor || HIGHLIGHT_DIMMED;
    const highlight = dimmed ? dimmedHighlight : activeHighlight;
    return (Array.isArray(segments) ? segments : []).reduce((map, segment) => {
      if (segment) {
        map[segment] = highlight;
      }
      return map;
    }, {});
  }, [segments, dimmed]);

  const useBackView = useMemo(() => {
    if (!Array.isArray(segments) || segments.length === 0) return false;
    const normalized = segments.filter(Boolean);
    if (normalized.length === 0) return false;
    const allowed = new Set(["back", "traps"]);
    const allAllowed = normalized.every((segment) => allowed.has(segment));
    return allAllowed && normalized.includes("back");
  }, [segments]);

  const OutlineComponent = useBackView ? HumanMuscleBackOutline : HumanMuscleOutline;

  return (
    <View style={[styles.container, dimmed && styles.dimmedContainer]}>
      <OutlineComponent
        color={dimmed ? BASE_COLOR_DIMMED : BASE_COLOR_ACTIVE}
        fills={fills}
        width="100%"
        height="100%"
        strokeColor={dimmed ? STROKE_DIMMED : STROKE_ACTIVE}
        strokeWidth={strokeWidth || STROKE_WIDTH}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  dimmedContainer: {
    opacity: 0.85,
  },
});
