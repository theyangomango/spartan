import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import HumanMuscleOutline from "../../../../assets/human_muscle_outline";
import HumanMuscleBackOutline from "../../../../assets/human_muscle_back_outline";

const BASE_COLOR_ACTIVE = "#747881ff";
const BASE_COLOR_DIMMED = "#474e5bff";
const HIGHLIGHT_ACTIVE = "#4FAEFF";
const HIGHLIGHT_DIMMED = "#2C7BD6";
const FULL_BODY_SEGMENTS = [
  "calves",
  "quads",
  "abs",
  "obliques",
  "back",
  "forearms",
  "arms",
  "shoulders",
  "chest",
  "traps",
];

const LOWER_BODY_SEGMENTS = new Set([
  "legs",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
]);
const CORE_SEGMENTS = new Set(["abs", "obliques"]);
const ARM_SEGMENTS = new Set(["arms", "forearms"]);

const FOCUS_VIEWBOX = {
  back: "150 190 360 360",
  traps: "190 140 280 220",
  chest: "120 160 420 420",
  shoulders: "90 90 480 380",
  arms: "40 140 580 520",
  forearms: "110 220 440 400",
  abs: "190 330 280 320",
  obliques: "170 320 320 340",
  legs: "150 540 360 480",
  quads: "190 520 280 360",
  hamstrings: "190 560 280 400",
  glutes: "200 540 260 260",
  calves: "200 820 260 320",
};

export default function MuscleGroupIcon({ segments = [], dimmed = false }) {
  const fills = useMemo(() => {
    const highlight = dimmed ? HIGHLIGHT_DIMMED : HIGHLIGHT_ACTIVE;
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

  const focusViewBox = useMemo(() => {
    if (!Array.isArray(segments) || segments.length === 0) return null;
    const normalized = Array.from(new Set(segments.filter(Boolean)));
    if (normalized.length === 0) return null;
    const isFullBody =
      normalized.length === FULL_BODY_SEGMENTS.length &&
      FULL_BODY_SEGMENTS.every((segment) => normalized.includes(segment));
    if (isFullBody) return null;

    if (normalized.includes("back")) return FOCUS_VIEWBOX.back;
    if (normalized.includes("traps") && !normalized.includes("back")) {
      return FOCUS_VIEWBOX.traps;
    }

    if (normalized.some((segment) => LOWER_BODY_SEGMENTS.has(segment))) {
      if (normalized.length === 1) {
        const [onlySegment] = normalized;
        return FOCUS_VIEWBOX[onlySegment] || FOCUS_VIEWBOX.legs;
      }
      if (
        normalized.length === 2 &&
        normalized.includes("quads") &&
        normalized.includes("calves")
      ) {
        return FOCUS_VIEWBOX.legs;
      }
      if (normalized.includes("calves") && normalized.length <= 2) {
        return FOCUS_VIEWBOX.calves;
      }
      if (normalized.includes("glutes") && normalized.length <= 2) {
        return FOCUS_VIEWBOX.glutes;
      }
      if (normalized.includes("hamstrings") && normalized.length <= 2) {
        return FOCUS_VIEWBOX.hamstrings;
      }
      if (normalized.includes("quads") && normalized.length <= 2) {
        return FOCUS_VIEWBOX.quads;
      }
      return FOCUS_VIEWBOX.legs;
    }

    if (normalized.some((segment) => CORE_SEGMENTS.has(segment))) {
      return FOCUS_VIEWBOX.abs;
    }

    if (normalized.includes("chest")) return FOCUS_VIEWBOX.chest;
    if (normalized.includes("shoulders")) return FOCUS_VIEWBOX.shoulders;
    if (normalized.some((segment) => ARM_SEGMENTS.has(segment))) {
      return FOCUS_VIEWBOX.arms;
    }
    if (normalized.includes("traps")) return FOCUS_VIEWBOX.traps;
    return null;
  }, [segments]);

  const OutlineComponent = useBackView ? HumanMuscleBackOutline : HumanMuscleOutline;

  return (
    <View style={[styles.container, dimmed && styles.dimmedContainer]}>
      <OutlineComponent
        color={dimmed ? BASE_COLOR_DIMMED : BASE_COLOR_ACTIVE}
        fills={fills}
        width="100%"
        height="100%"
        focusBox={focusViewBox}
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
