import React from "react";
import { View, StyleSheet } from "react-native";
import HumanMuscleOutline from "../../../../assets/human_muscle_outline";

const ACTIVE_COLOR = "#4FAEFF";
const INACTIVE_COLOR = "#2F3A55";
const BASE_COLOR = "#1A2237";

export default function MuscleGroupIcon({ figure = "front", dimmed = false }) {
  const tint = dimmed ? INACTIVE_COLOR : ACTIVE_COLOR;

  return (
    <View style={styles.container}>
      <HumanMuscleOutline
        color={BASE_COLOR}
        width="100%"
        height="100%"
        style={figure === "back" ? styles.backFigure : undefined}
      />
      <HumanMuscleOutline
        color={tint}
        width="100%"
        height="100%"
        style={[
          styles.highlight,
          figure === "back" ? styles.backFigure : undefined,
        ]}
        opacity={dimmed ? 0.45 : 0.9}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  highlight: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  backFigure: {
    transform: [{ scaleX: -1 }],
  },
});
