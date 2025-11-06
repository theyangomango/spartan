import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import theme from "../../theme/mfpDark";
import scaleSize from "../../helper/scaleSize";
import workoutTypography from "../3_Workout/shared/workoutTypography";
import ExerciseAvatar from "../common/ExerciseAvatar";
import { computeDisplayNumbers, formatSetLabel, normalizeSetType } from "../3_Workout/shared/setTypeUtils";
import { resolveExerciseWeighting } from "../../utils/bodyweight";

const normalizePrev = (value) => {
  if (!value || typeof value !== "object") return null;
  const weight = Number(value?.weight) || 0;
  const reps = Number(value?.reps) || 0;
  if (!weight && !reps) return null;
  return { weight, reps };
};

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

const buildPreviousDisplay = (value, weighting) => {
  const normalized = normalizePrev(value);
  if (!normalized) return null;

  const reps = Number(normalized.reps) || 0;
  const weightVal = Number(normalized.weight) || 0;
  const absWeight = Math.abs(weightVal);

  const repsLabel = reps > 0 ? formatNumber(reps) : null;

  let weightLabel = null;
  if (weighting === "weighted bodyweight") {
    weightLabel = absWeight > 0 ? `+${formatNumber(absWeight)} lb` : "Bodyweight";
  } else if (weighting === "assisted bodyweight") {
    weightLabel = absWeight > 0 ? `-${formatNumber(absWeight)} lb` : "Bodyweight";
  } else if (absWeight > 0) {
    weightLabel = `${formatNumber(weightVal)} lb`;
  }

  if (!repsLabel && !weightLabel) return null;
  return { repsLabel, weightLabel };
};

const PastWorkoutExerciseLog = ({ exercise, index = 0, onPress }) => {
  const name = exercise?.name || `Exercise ${index + 1}`;
  const muscle = exercise?.muscle || "";
  const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
  const previousSets = useMemo(() => {
    if (Array.isArray(exercise?.previousSets)) return exercise.previousSets;
    if (Array.isArray(exercise?.previous)) return exercise.previous;
    return [];
  }, [exercise?.previousSets, exercise?.previous]);

  const displayNumbers = useMemo(() => computeDisplayNumbers(sets), [sets]);
  const equipment = exercise?.equipment;
  const exerciseWeighting = useMemo(
    () => resolveExerciseWeighting(name, equipment),
    [name, equipment]
  );
  const weightIcon = useMemo(() => {
    if (exerciseWeighting === "weighted bodyweight") return "plus-thick";
    if (exerciseWeighting === "assisted bodyweight") return "minus-thick";
    return null;
  }, [exerciseWeighting]);

  return (
    <View style={styles.mainContainer}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View details for ${name}`}
          onPress={() => onPress?.(exercise)}
          disabled={!onPress}
          hitSlop={{ top: scaleSize(6), bottom: scaleSize(6), left: scaleSize(6), right: scaleSize(6) }}
          style={({ pressed }) => [
            styles.nameContainer,
            pressed && styles.nameContainerPressed,
            !onPress && styles.nameContainerDisabled,
          ]}
        >
          <ExerciseAvatar name={name} size={scaleSize(42)} style={styles.avatar} />
          <Text style={[workoutTypography.exerciseName, styles.nameText]} numberOfLines={1}>{name}</Text>
        </Pressable>
      </View>

      <View style={styles.labelsRow}>
        <View style={styles.setColumn}><Text style={workoutTypography.columnLabel}>Set</Text></View>
        <View style={styles.previousColumn}><Text style={workoutTypography.columnLabel}>Previous</Text></View>
        <View style={styles.weightColumn}>
          <View style={styles.weightLabel}>
            {weightIcon && (
              <MaterialCommunityIcons
                name={weightIcon}
                size={scaleSize(15)}
                color={theme.primary}
                style={styles.weightIcon}
              />
            )}
            <Text style={workoutTypography.columnLabel}>lbs</Text>
          </View>
        </View>
        <View style={styles.repsColumn}><Text style={workoutTypography.columnLabel}>Reps</Text></View>
        <View style={styles.doneColumn} />
      </View>

      {sets.length > 0 ? (
        sets.map((set, idx) => {
          const previous =
            buildPreviousDisplay(previousSets[idx], exerciseWeighting) ??
            buildPreviousDisplay(set?.prev, exerciseWeighting);
          const done = !!(set?.isDone || set?.done || set?.completed);
          const displayNumber = displayNumbers[idx] ?? (idx + 1);
          const normalizedType = normalizeSetType(set?.type);
          const label = formatSetLabel(displayNumber, normalizedType);
          const pillStyle = normalizedType ? [styles.setPill, typePillBg(normalizedType)] : styles.setPill;
          const letterStyle = normalizedType ? [workoutTypography.setNumber, workoutTypography.setLetter, typePillText(normalizedType)] : workoutTypography.setNumber;
          const previousStyle = done ? [workoutTypography.previousStat, styles.previousValueTextDone] : workoutTypography.previousStat;
          const previousIconColor = done ? "#afafaf" : "#FFFFFF";
          return (
            <View style={[styles.statRow, done && styles.doneRow]} key={`${name}-set-${idx}`}>
              <View style={pillStyle}>
                <Text style={letterStyle}>{label}</Text>
              </View>

              <View style={styles.previousValueContainer}>
                {previous ? (
                  <View style={styles.previousValueRow}>
                    {previous.repsLabel ? (
                      <Text style={previousStyle} numberOfLines={1}>
                        {previous.repsLabel}
                      </Text>
                    ) : null}
                    {previous.repsLabel && previous.weightLabel ? (
                      <MaterialCommunityIcons
                        name="close-thick"
                        size={scaleSize(12)}
                        color={previousIconColor}
                        style={styles.previousMultiplyIcon}
                      />
                    ) : null}
                    {previous.weightLabel ? (
                      <Text style={previousStyle} numberOfLines={1}>
                        {previous.weightLabel}
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  <Text style={previousStyle}>—</Text>
                )}
              </View>

              <View style={styles.weightValueContainer}>
                <Text style={done ? [workoutTypography.statValue, styles.statValueDone] : workoutTypography.statValue} numberOfLines={1}>
                  {formatWeight(set)}
                </Text>
              </View>

              <View style={styles.repsValueContainer}>
                <Text style={done ? [workoutTypography.statValue, styles.statValueDone] : workoutTypography.statValue} numberOfLines={1}>
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
    paddingBottom: scaleSize(4),
  },
  nameContainerPressed: {
    opacity: 0.7,
  },
  nameContainerDisabled: {
    opacity: 1,
  },
  avatar: {
    marginRight: scaleSize(10),
  },
  nameText: {
    flexShrink: 1,
    fontSize: scaleSize(14),
    lineHeight: scaleSize(20),
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
  weightLabel: {
    flexDirection: "row",
    alignItems: "center",
  },
  weightIcon: {
    marginRight: scaleSize(4),
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
  previousValueRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  previousMultiplyIcon: {
    marginHorizontal: scaleSize(4),
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
  statValueDone: {
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
  switch (normalizeSetType(type)) {
    case "warmup":
      return { backgroundColor: "rgba(251,146,60,0.45)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(251,146,60,0.7)" };
    case "dropset":
      return { backgroundColor: "rgba(168,85,247,0.45)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(168,85,247,0.7)" };
    case "failure":
      return { backgroundColor: "rgba(244,63,94,0.45)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(244,63,94,0.7)" };
    case "left":
      return { backgroundColor: "rgba(14,165,233,0.45)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(14,165,233,0.7)" };
    case "right":
      return { backgroundColor: "rgba(52,211,153,0.45)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(52,211,153,0.7)" };
    default:
      return { backgroundColor: theme.field, borderWidth: scaleSize(1), borderColor: "rgba(255,255,255,0.30)" };
  }
}
function typePillText(type) {
  switch (normalizeSetType(type)) {
    case "warmup":
    case "dropset":
    case "failure":
    case "left":
    case "right":
      return { color: "#FFFFFF" };
    default:
      return { color: theme.textPrimary };
  }
}

export default PastWorkoutExerciseLog;
