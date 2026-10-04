// Quest panel under a ladder rank card: header, progress segments and one tile per promotion requirement.
import React from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Check } from "lucide-react-native";

import { scaleSize } from "../layoutConstants";
import styles from "./ExercisesSection.styles";
import {
    CARD_THEME_COLORS,
    clampRatio,
    describeRequirement,
    formatRequirementProgressText,
    withAlpha,
} from "./ladderQuestFormat";
import QuestRing, { QuestMuscleIcon } from "./QuestRing";

export default function LadderQuestPanel({
    entry,
    promotionThemeKey,
    tasksToRender,
    requirementsCompleted,
    shouldDimRequirementsBlock,
}) {
    const themeColors =
        CARD_THEME_COLORS[promotionThemeKey || entry.rankTier] || CARD_THEME_COLORS.gold;
    const completedCount = tasksToRender.filter((task) => task?.complete).length;
    return (
        <View
            style={[
                styles.questPanel,
                { borderColor: withAlpha(themeColors.accent, 0.22) },
                shouldDimRequirementsBlock && styles.dimmedCard,
            ]}
        >
            <LinearGradient
                colors={[withAlpha(themeColors.gradient[1], 0.2), withAlpha(themeColors.gradient[1], 0)]}
                style={styles.questPanelGlow}
                pointerEvents="none"
            />
            <View style={styles.questPanelHeader}>
                <View>
                    <Text style={styles.questPanelEyebrow}>
                        {requirementsCompleted ? "Unlocked" : "Next rank"}
                    </Text>
                    <Text style={styles.questPanelTitle}>
                        Reach <Text style={{ color: themeColors.accent }}>{entry.rankLabel}</Text>
                    </Text>
                </View>
                <View
                    style={[
                        styles.questCountPill,
                        { backgroundColor: withAlpha(themeColors.accent, 0.14) },
                    ]}
                >
                    <Text style={[styles.questCountText, { color: themeColors.accent }]}>
                        {completedCount} of {tasksToRender.length}
                    </Text>
                </View>
            </View>
            <View style={styles.questSegments}>
                {tasksToRender.map((taskStatus, segmentIndex) => (
                    <View
                        key={`${entry.key}-segment-${segmentIndex}`}
                        style={[
                            styles.questSegment,
                            taskStatus?.complete && { backgroundColor: themeColors.accent },
                        ]}
                    />
                ))}
            </View>
            <View style={styles.questList}>
                {tasksToRender.map((taskStatus, requirementIndex) => {
                    const descriptor = taskStatus?.descriptor || null;
                    const taskComplete = !!taskStatus?.complete;
                    const progressRatio = clampRatio(
                        typeof taskStatus?.ratio === "number"
                            ? taskStatus.ratio
                            : taskComplete
                            ? 1
                            : 0
                    );
                    const progressText = formatRequirementProgressText(
                        descriptor,
                        taskStatus?.currentValue,
                        descriptor?.target,
                        ""
                    );
                    const [currentText, targetText] = progressText.split(" / ");
                    const { title, goal, Icon, muscleKey } = describeRequirement(
                        taskStatus?.label || "",
                        descriptor
                    );
                    const QuestIcon = taskComplete ? Check : Icon;
                    return (
                        <View
                            key={`${entry.key}-requirement-${requirementIndex}`}
                            style={[
                                styles.questTile,
                                taskComplete && {
                                    backgroundColor: withAlpha(themeColors.accent, 0.1),
                                },
                            ]}
                        >
                            <QuestRing
                                ratio={progressRatio}
                                color={themeColors.accent}
                                trackColor={withAlpha(themeColors.accent, 0.16)}
                            >
                                {muscleKey && !taskComplete ? (
                                    <QuestMuscleIcon muscleKey={muscleKey} />
                                ) : (
                                    <QuestIcon
                                        size={scaleSize(17)}
                                        color={themeColors.accent}
                                        strokeWidth={taskComplete ? 3 : 2}
                                    />
                                )}
                            </QuestRing>
                            <View style={styles.questText}>
                                <Text style={styles.questTitle} numberOfLines={1}>
                                    {title}
                                </Text>
                                {!!goal && (
                                    <Text style={styles.questGoal} numberOfLines={1}>
                                        {goal}
                                    </Text>
                                )}
                            </View>
                            <Text
                                style={[
                                    styles.questValue,
                                    taskComplete && { color: themeColors.accent },
                                ]}
                            >
                                {taskComplete ? "Done" : currentText}
                                {!!targetText && !taskComplete && (
                                    <Text style={styles.questValueTarget}> / {targetText}</Text>
                                )}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}
