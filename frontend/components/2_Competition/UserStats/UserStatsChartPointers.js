// Tooltip contents shown for the selected point of the stats preview chart (volume, reps, personal records).
import React from "react";
import { View, Text, Pressable } from "react-native";

import { chartTypography } from "../../charts/chartStyles";
import { formatVolumeValue } from "../../charts/chartMath";
import PointerBubbleCard from "../../charts/PointerBubbleCard";
import styles from "./UserStatsProgressPreview.styles";
import { CHART_ACCENTS, toDisplayWeightUnit, formatTimestamp } from "./userStatsChartUtils";

export const VolumePointerLabel = ({ entry, unit, accent, isRightAligned, onWorkoutPress }) => {
    if (!entry) return null;
    const unitText = toDisplayWeightUnit(unit);
    const totalText = `${formatVolumeValue(entry.value)} ${unitText}`;
    const incrementText = entry.increment ? `+${formatVolumeValue(entry.increment)} ${unitText}` : null;
    const timestampText = formatTimestamp(entry.recordedAt);
    const workoutName = (typeof entry.name === "string" && entry.name.trim()) || null;
    const canNavigate = !!workoutName && typeof onWorkoutPress === "function";

    return (
        <PointerBubbleCard
            label="Total Volume"
            accent={accent || CHART_ACCENTS.volume}
            isRightAligned={isRightAligned}
            accessibilityLabel={`Total volume ${totalText} recorded ${timestampText}`}
        >
            <Text style={chartTypography.pointerTitle}>{totalText}</Text>
            {incrementText ? (
                <Text
                    style={[
                        chartTypography.pointerBody,
                        styles.pointerBubbleLineSpacing,
                        chartTypography.pointerAccentGreen,
                    ]}
                >
                    {incrementText}
                </Text>
            ) : null}
            {workoutName ? (
                canNavigate ? (
                    <Pressable
                        onPress={() => onWorkoutPress(entry)}
                        hitSlop={8}
                        accessibilityRole="link"
                        accessibilityLabel={`View workout ${workoutName}`}
                    >
                        <Text
                            style={[
                                chartTypography.pointerBody,
                                styles.pointerBubbleLineSpacing,
                                chartTypography.pointerAccentBlue,
                            ]}
                        >
                            {workoutName}
                        </Text>
                    </Pressable>
                ) : (
                    <Text
                        style={[
                            chartTypography.pointerBody,
                            styles.pointerBubbleLineSpacing,
                            chartTypography.pointerAccentBlue,
                        ]}
                    >
                        {workoutName}
                    </Text>
                )
            ) : null}
            <View style={styles.pointerBubbleDivider} />
            <Text style={[chartTypography.pointerTimestamp, styles.pointerBubbleTimestampSpacing]}>
                {timestampText}
            </Text>
        </PointerBubbleCard>
    );
};

export const RepsPointerLabel = ({ entry, accent, isRightAligned, onWorkoutPress }) => {
    if (!entry) return null;
    const totalText = `${formatVolumeValue(entry.value)} reps`;
    const incrementText = entry.increment ? `+${formatVolumeValue(entry.increment)} reps` : null;
    const timestampText = formatTimestamp(entry.recordedAt);
    const workoutName = (typeof entry.name === "string" && entry.name.trim()) || null;
    const canNavigate = !!workoutName && typeof onWorkoutPress === "function";

    return (
        <PointerBubbleCard
            label="Total Reps"
            accent={accent || CHART_ACCENTS.volume}
            isRightAligned={isRightAligned}
            accessibilityLabel={`Total reps ${totalText} recorded ${timestampText}`}
        >
            <Text style={chartTypography.pointerTitle}>{totalText}</Text>
            {incrementText ? (
                <Text
                    style={[
                        chartTypography.pointerBody,
                        styles.pointerBubbleLineSpacing,
                        chartTypography.pointerAccentGreen,
                    ]}
                >
                    {incrementText}
                </Text>
            ) : null}
            {workoutName ? (
                canNavigate ? (
                    <Pressable
                        onPress={() => onWorkoutPress(entry)}
                        hitSlop={8}
                        accessibilityRole="link"
                        accessibilityLabel={`View workout ${workoutName}`}
                    >
                        <Text
                            style={[
                                chartTypography.pointerBody,
                                styles.pointerBubbleLineSpacing,
                                chartTypography.pointerAccentBlue,
                            ]}
                        >
                            {workoutName}
                        </Text>
                    </Pressable>
                ) : (
                    <Text
                        style={[
                            chartTypography.pointerBody,
                            styles.pointerBubbleLineSpacing,
                            chartTypography.pointerAccentBlue,
                        ]}
                    >
                        {workoutName}
                    </Text>
                )
            ) : null}
            <View style={styles.pointerBubbleDivider} />
            <Text style={[chartTypography.pointerTimestamp, styles.pointerBubbleTimestampSpacing]}>
                {timestampText}
            </Text>
        </PointerBubbleCard>
    );
};

export const PersonalRecordPointerLabel = ({ entry, accent, isRightAligned, onWorkoutPress }) => {
    if (!entry) return null;
    const totalText = `${formatVolumeValue(entry.value)} PRs`;
    const incrementValue = Number(entry.increment) || 0;
    const incrementText = incrementValue > 0 ? `+${formatVolumeValue(incrementValue)} PR${incrementValue === 1 ? "" : "s"}` : null;
    const timestampText = formatTimestamp(entry.recordedAt);
    const workoutName = (typeof entry.name === "string" && entry.name.trim()) || null;
    const canNavigate = !!workoutName && typeof onWorkoutPress === "function";

    return (
        <PointerBubbleCard
            label="Personal Records"
            accent={accent || CHART_ACCENTS.volume}
            isRightAligned={isRightAligned}
            accessibilityLabel={`Personal records ${totalText} recorded ${timestampText}`}
        >
            <Text style={chartTypography.pointerTitle}>{totalText}</Text>
            {incrementText ? (
                <Text
                    style={[
                        chartTypography.pointerBody,
                        styles.pointerBubbleLineSpacing,
                        chartTypography.pointerAccentGreen,
                    ]}
                >
                    {incrementText}
                </Text>
            ) : null}
            {workoutName ? (
                canNavigate ? (
                    <Pressable
                        onPress={() => onWorkoutPress(entry)}
                        hitSlop={8}
                        accessibilityRole="link"
                        accessibilityLabel={`View workout ${workoutName}`}
                    >
                        <Text
                            style={[
                                chartTypography.pointerBody,
                                styles.pointerBubbleLineSpacing,
                                chartTypography.pointerAccentBlue,
                            ]}
                        >
                            {workoutName}
                        </Text>
                    </Pressable>
                ) : (
                    <Text
                        style={[
                            chartTypography.pointerBody,
                            styles.pointerBubbleLineSpacing,
                            chartTypography.pointerAccentBlue,
                        ]}
                    >
                        {workoutName}
                    </Text>
                )
            ) : null}
            {incrementValue === 0 ? (
                <Text
                    style={[
                        chartTypography.pointerBody,
                        styles.pointerBubbleLineSpacing,
                        chartTypography.pointerDeltaNeutral,
                    ]}
                >
                    No new PRs
                </Text>
            ) : null}
            <View style={styles.pointerBubbleDivider} />
            <Text style={[chartTypography.pointerTimestamp, styles.pointerBubbleTimestampSpacing]}>
                {timestampText}
            </Text>
        </PointerBubbleCard>
    );
};
