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
  scale = 1,
  offsetX = 0,
  offsetY = 0,
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
  }, [segments, dimmed, highlightColor, dimHighlightColor]);

  const useBackView = useMemo(() => {
    if (!Array.isArray(segments) || segments.length === 0) return false;
    const normalized = segments.filter(Boolean);
    if (normalized.length === 0) return false;
    const allowed = new Set(["back", "traps"]);
    const allAllowed = normalized.every((segment) => allowed.has(segment));
    return allAllowed && normalized.includes("back");
  }, [segments]);

  const OutlineComponent = useBackView ? HumanMuscleBackOutline : HumanMuscleOutline;
  const scaledWrapperStyle = useMemo(() => {
    const pct = `${Math.max(0.1, scale) * 100}%`;
    return [styles.svgWrapper, { width: pct, height: pct }];
  }, [scale]);
  const wrapperTransformStyle = useMemo(() => {
    const transforms = [];
    if (offsetX) transforms.push({ translateX: offsetX });
    if (offsetY) transforms.push({ translateY: offsetY });
    return transforms.length ? { transform: transforms } : null;
  }, [offsetX, offsetY]);

  return (
    <View style={[styles.container, dimmed && styles.dimmedContainer]}>
      <View style={[scaledWrapperStyle, wrapperTransformStyle]}>
        <OutlineComponent
          color={dimmed ? BASE_COLOR_DIMMED : BASE_COLOR_ACTIVE}
          fills={fills}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          strokeColor={dimmed ? STROKE_DIMMED : STROKE_ACTIVE}
          strokeWidth={strokeWidth || STROKE_WIDTH}
        />
      </View>
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
  svgWrapper: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});
