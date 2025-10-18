import React from "react";
import { View, Image, StyleSheet } from "react-native";
import HumanMuscleOutline from "../../../../assets/human_muscle_outline";

const BASE_COLOR_ACTIVE = "#1C2439";
const BASE_COLOR_DIMMED = "#111827";
const OVERLAY_SCALE = 0.8;
const OVERLAY_OFFSET_Y = -6;

export default function MuscleGroupIcon({
  figure = "front",
  sources = [],
  dimmed = false,
}) {
  const iconSources = Array.isArray(sources) ? sources.filter(Boolean) : [];
  const baseColor = dimmed ? BASE_COLOR_DIMMED : BASE_COLOR_ACTIVE;
  const overlayTransform = [];
  if (figure === "back") {
    overlayTransform.push({ scaleX: -1 });
  }
  overlayTransform.push({ translateY: OVERLAY_OFFSET_Y });
  overlayTransform.push({ scale: OVERLAY_SCALE });

  return (
    <View style={[styles.container, dimmed && styles.dimmedContainer]}>
      <HumanMuscleOutline
        color={baseColor}
        width="108%"
        height="108%"
        style={[styles.baseFigure, figure === "back" && styles.backFigure]}
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
    overflow: "hidden",
  },
  baseFigure: {
    position: "absolute",
    transform: [{ translateY: OVERLAY_OFFSET_Y / 2 }],
  },
  overlay: {
    width: "110%",
    height: "110%",
  },
  dimmedOverlay: {
    opacity: 0.65,
  },
  dimmedContainer: {
    opacity: 0.6,
  },
  backFigure: {
    transform: [{ scaleX: -1 }],
  },
});
