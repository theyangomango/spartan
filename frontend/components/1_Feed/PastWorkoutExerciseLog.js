import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import theme from "../../theme/mfpDark";
import scaleSize from "../../helper/scaleSize";
import workoutTypography from "../3_Workout/shared/workoutTypography";

const formatNumber = (value, fallback = "0") => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  try {
    return num.toLocaleString();
  } catch {
    return String(num);
  }
};

const formatWeight = (set) => {
  if (!set || typeof set !== "object") return "—";
  const raw = set.weight ?? set.lbs ?? set.kg ?? set.load ?? 0;
  const weight = Number(raw);
  if (!Number.isFinite(weight) || weight <= 0) {
    if (set?.bodyweight || String(set?.unit || "").toLowerCase().includes("body")) {
      return "Bodyweight";
    }
    return "—";
  }
  const unitRaw = set.unit || set.units || set.weightUnit || (set.kg != null ? "kg" : set.lbs != null ? "lb" : "");
  const unit = String(unitRaw || "lb").toLowerCase();
  const normalizedUnit = unit === "kgs" ? "kg" : unit === "lbs" ? "lb" : unit;
  return `${formatNumber(weight)} ${normalizedUnit}`.trim();
};

const formatReps = (set) => {
  if (!set || typeof set !== "object") return "—";
  const reps = Number(set.reps ?? set.rep ?? set.r ?? 0);
  if (Number.isFinite(reps) && reps > 0) return `${reps}`;
  const duration = Number(set.duration ?? set.time ?? 0);
  if (Number.isFinite(duration) && duration > 0) return `${Math.round(duration)}s`;
  return "—";
};

const formatPreviousLabel = (set) => {
  if (!set || typeof set !== "object") return "—";
  const weightLabel = formatWeight(set);
  const repsLabel = formatReps(set);
  if (weightLabel === "—" && repsLabel === "—") return "—";
  if (weightLabel === "Bodyweight") {
    return repsLabel === "—" ? "Bodyweight" : `Bodyweight x ${repsLabel}`;
  }
  if (weightLabel !== "—" && repsLabel !== "—") return `${weightLabel} x ${repsLabel}`;
  if (weightLabel !== "—") return weightLabel;
  return repsLabel;
};

const PastWorkoutExerciseLog = ({ exercise, index = 0 }) => {
  const name = exercise?.name || `Exercise ${index + 1}`;
  const muscle = exercise?.muscle || "";
  const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
  const previousSets = useMemo(() => {
    if (Array.isArray(exercise?.previousSets)) return exercise.previousSets;
    if (Array.isArray(exercise?.previous)) return exercise.previous;
    return [];
  }, [exercise?.previousSets, exercise?.previous]);

  return (
    <View style={styles.mainContainer}>
      <View style={styles.header}>
        <View style={styles.nameContainer}>
          <Text style={workoutTypography.exerciseName} numberOfLines={1}>{name}</Text>
        </View>
      </View>

      <View style={styles.labelsRow}>
        <View style={styles.setColumn}><Text style={workoutTypography.columnLabel}>Set</Text></View>
        <View style={styles.previousColumn}><Text style={workoutTypography.columnLabel}>Previous</Text></View>
        <View style={styles.weightColumn}><Text style={workoutTypography.columnLabel}>lbs</Text></View>
        <View style={styles.repsColumn}><Text style={workoutTypography.columnLabel}>Reps</Text></View>
        <View style={styles.doneColumn} />
      </View>

      {sets.length > 0 ? (
        sets.map((set, idx) => {
          const previous = previousSets[idx];
          const done = !!(set?.isDone || set?.done || set?.completed);
          const type = set?.type || null;
          const letter = type ? typeLetter(type) : String(idx + 1);
          const pillStyle = type ? [styles.setPill, typePillBg(type)] : styles.setPill;
          const letterStyle = type ? [workoutTypography.setNumber, workoutTypography.setLetter, typePillText(type)] : workoutTypography.setNumber;
          const previousStyle = done ? [workoutTypography.previousStat, styles.previousValueTextDone] : workoutTypography.previousStat;
          return (
            <View style={[styles.statRow, done && styles.doneRow]} key={`${name}-set-${idx}`}>
              <View style={pillStyle}>
                <Text style={letterStyle}>{letter}</Text>
              </View>

              <View style={styles.previousValueContainer}>
                <Text style={previousStyle} numberOfLines={1}>
                  {formatPreviousLabel(previous)}
                </Text>
              </View>

              <View style={styles.weightValueContainer}>
                <Text style={done ? [workoutTypography.statValue, styles.statValueText, styles.statValueTextDone] : [workoutTypography.statValue, styles.statValueText]} numberOfLines={1}>
                  {formatWeight(set)}
                </Text>
              </View>

              <View style={styles.repsValueContainer}>
                <Text style={done ? [workoutTypography.statValue, styles.statValueText, styles.statValueTextDone] : [workoutTypography.statValue, styles.statValueText]} numberOfLines={1}>
                  {formatReps(set)}
                </Text>
              </View>

              <View style={styles.doneContainer}>
                <View style={done ? styles.checkmarkSelected : styles.checkmark}>
                  <MaterialCommunityIcons
                    name="check-bold"
                    size={scaleSize(16)}
                    color={done ? "#fff" : theme.primary}
                  />
                </View>
              </View>
            </View>
          );
        })
      ) : (
        <View style={styles.emptyRow}>
          <Text style={workoutTypography.emptyRow}>No sets logged for this exercise.</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    marginTop: scaleSize(16),
    marginBottom: scaleSize(6),
    position: "relative",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: scaleSize(20),
    paddingRight: scaleSize(14),
    paddingBottom: scaleSize(10),
    marginHorizontal: scaleSize(2.5),
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    marginRight: scaleSize(10),
    flex: 1,
  },
  labelsRow: {
    flexDirection: "row",
    paddingBottom: scaleSize(5),
    marginHorizontal: scaleSize(2.5),
  },
  setColumn: {
    marginLeft: "5%",
    width: "8%",
    alignItems: "center",
  },
  previousColumn: {
    width: "38%",
    alignItems: "center",
  },
  weightColumn: {
    width: "18%",
    alignItems: "center",
  },
  repsColumn: {
    width: "18%",
    alignItems: "center",
  },
  doneColumn: {
    width: "10.5%",
  },
  statRow: {
    flexDirection: "row",
    paddingVertical: scaleSize(9),
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.16)",
  },
  doneRow: {
    backgroundColor: theme.successRowBg,
  },
  setPill: {
    marginLeft: "5%",
    width: "8%",
    height: scaleSize(24),
    borderRadius: scaleSize(8),
    backgroundColor: theme.field,
    borderWidth: scaleSize(1),
    borderColor: "rgba(255,255,255,0.30)",
    alignItems: "center",
    justifyContent: "center",
  },
  previousValueContainer: {
    width: "38%",
    alignItems: "center",
    justifyContent: "center",
  },
  previousValueTextDone: {
    color: "#afafaf",
  },
  weightValueContainer: {
    width: "18%",
    alignItems: "center",
  },
  repsValueContainer: {
    width: "18%",
    alignItems: "center",
  },
  statValueText: {
    fontFamily: "Outfit_700Bold",
  },
  statValueTextDone: {
    color: "#afafaf",
  },
  emptyRow: {
    paddingVertical: scaleSize(12),
    alignItems: "center",
  },
  doneContainer: {
    width: "10.5%",
    height: scaleSize(22),
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: {
    paddingHorizontal: scaleSize(10),
    height: "100%",
    borderRadius: scaleSize(7),
    backgroundColor: theme.restPillBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.primaryHairline,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkSelected: {
    paddingHorizontal: scaleSize(8),
    height: "100%",
    borderRadius: scaleSize(7),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.success,
  },
});

function typePillBg(type) {
  switch (type) {
    case "warmup":
      return { backgroundColor: "rgba(251,146,60,0.45)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(251,146,60,0.7)" };
    case "dropset":
      return { backgroundColor: "rgba(168,85,247,0.45)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(168,85,247,0.7)" };
    case "failure":
      return { backgroundColor: "rgba(244,63,94,0.45)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(244,63,94,0.7)" };
    default:
      return { backgroundColor: theme.field, borderWidth: scaleSize(1), borderColor: "rgba(255,255,255,0.30)" };
  }
}

function typeLetter(type) {
  switch (type) {
    case "warmup":
      return "W";
    case "dropset":
      return "D";
    case "failure":
      return "F";
    default:
      return "";
  }
}

function typePillText(type) {
  switch (type) {
    case "warmup":
    case "dropset":
    case "failure":
      return { color: "#FFFFFF" };
    default:
      return { color: theme.textPrimary };
  }
}

export default PastWorkoutExerciseLog;
