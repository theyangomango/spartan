// Quest panel under a ladder rank card: one row per promotion requirement, with a header on the user's next rank.
import React from "react";
import { Text, View } from "react-native";
import { Check } from "lucide-react-native";

import { scaleSize } from "../layoutConstants";
import styles from "./ExercisesSection.styles";
import {
    CARD_THEME_COLORS,
    clampRatio,
    describeRequirement,
    formatRequirementProgressText,
} from "./ladderQuestFormat";
import QuestRing, { QuestMuscleIcon } from "./QuestRing";

export default function LadderQuestPanel({
    entry,
    promotionThemeKey,
    tasksToRender,
    requirementsCompleted,
    shouldDimRequirementsBlock,
    showHeader,
}) {
    const themeColors =
        CARD_THEME_COLORS[promotionThemeKey || entry.rankTier] || CARD_THEME_COLORS.gold;
    const completedCount = tasksToRender.filter((task) => task?.complete).length;
    return (
        <View style={[styles.questPanel, shouldDimRequirementsBlock && styles.dimmedCard]}>
            {showHeader && (
                <View style={styles.questPanelHeader}>
                    <View>
                        <Text style={styles.questPanelEyebrow}>
                            {requirementsCompleted ? "Unlocked" : "Next rank"}
                        </Text>
                        <Text style={[styles.questPanelTitle, { color: themeColors.accent }]}>
                            {entry.rankLabel}
                        </Text>
                    </View>
                    <Text style={styles.questCountText}>
                        {completedCount}
                        <Text style={styles.questCountTotal}> / {tasksToRender.length}</Text>
                    </Text>
                </View>
            )}
            <View style={[styles.questList, !showHeader && styles.questListBare]}>
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
                    const { title, unit, Icon, muscleKey } = describeRequirement(
                        taskStatus?.label || "",
                        descriptor
                    );
                    const QuestIcon = taskComplete ? Check : Icon;
                    return (
                        <View
                            key={`${entry.key}-requirement-${requirementIndex}`}
                            style={[
                                styles.questRow,
                                requirementIndex === 0 && !showHeader && styles.questRowFirst,
                            ]}
                        >
                            <QuestRing
                                ratio={progressRatio}
                                color={themeColors.accent}
                                trackColor="rgba(255,255,255,0.08)"
                            >
                                {muscleKey && !taskComplete ? (
                                    <QuestMuscleIcon muscleKey={muscleKey} />
                                ) : (
                                    <QuestIcon
                                        size={scaleSize(19)}
                                        color={themeColors.accent}
                                        strokeWidth={taskComplete ? 3 : 2}
                                    />
                                )}
                            </QuestRing>
                            <Text style={styles.questTitle} numberOfLines={1}>
                                {title}
                            </Text>
                            <Text
                                style={[
                                    styles.questValue,
                                    taskComplete && { color: themeColors.accent },
                                ]}
                            >
                                {taskComplete ? "Done" : currentText}
                                {!!targetText && !taskComplete && (
                                    <Text style={styles.questValueTarget}>
                                        {" "}/ {targetText}
                                        {unit}
                                    </Text>
                                )}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}
