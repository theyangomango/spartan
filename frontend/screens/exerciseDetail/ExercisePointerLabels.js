// Tooltip labels shown above the active point of the ExerciseDetail progress charts.
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import dayjs from 'dayjs';

import { chartPointerStyles, chartTypography } from '../../components/charts/chartStyles';
import { toDisplayWeightUnit } from '../../utils/weightUnits';
import { formatNumberCompact, formatWeightValue } from './exerciseDetailUtils';
import styles from './ExerciseDetail.styles';

export const ExerciseVolumePointerLabel = React.memo(({ entry, unit, isRightAligned, onWorkoutPress }) => {
    if (!entry) return null;
    const unitText = toDisplayWeightUnit(unit);
    const totalText = `${formatNumberCompact(entry.value)} ${unitText}`;
    const incrementText = entry.increment ? `+${formatNumberCompact(entry.increment)} ${unitText}` : null;
    const workoutName = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : null;
    const timestampText = dayjs(entry.recordedAt).format('MMM D, h:mm A');
    const canNavigate = typeof onWorkoutPress === 'function';

    return (
        <View
            pointerEvents="box-none"
            style={[
                chartPointerStyles.root,
                isRightAligned ? chartPointerStyles.alignRight : chartPointerStyles.alignLeft,
            ]}
        >
            <View
                style={[
                    chartPointerStyles.bubbleWrapper,
                    isRightAligned ? chartPointerStyles.alignRight : chartPointerStyles.alignLeft,
                ]}
            >
                <View style={chartPointerStyles.bubble}>
                    <Text style={chartTypography.pointerTitle}>{totalText}</Text>
                    {incrementText ? (
                        <Text
                            style={[
                                chartTypography.pointerSubtitle,
                                styles.progressPointerLineSpacing,
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
                                        chartTypography.pointerSubtitle,
                                        styles.progressPointerLineSpacing,
                                        chartTypography.pointerAccentBlue,
                                    ]}
                                >
                                    {workoutName}
                                </Text>
                            </Pressable>
                        ) : (
                            <Text
                                style={[
                                    chartTypography.pointerSubtitle,
                                    styles.progressPointerLineSpacing,
                                    chartTypography.pointerAccentBlue,
                                ]}
                            >
                                {workoutName}
                            </Text>
                        )
                    ) : null}
                    <Text
                        style={[
                            chartTypography.pointerTimestamp,
                            styles.progressPointerTimestampSpacing,
                        ]}
                    >
                        {timestampText}
                    </Text>
                </View>
            </View>
        </View>
    );
});

export const ExerciseOneRmPointerLabel = React.memo(({ entry, unit, isRightAligned, onWorkoutPress }) => {
    if (!entry) return null;
    const unitText = toDisplayWeightUnit(unit);
    const totalText = `${formatNumberCompact(entry.value)} ${unitText}`;
    const deltaValue = Number(entry.increment) || 0;
    const deltaMagnitude = Math.abs(deltaValue);
    const hasDelta = deltaMagnitude > 0;
    const deltaText = hasDelta
        ? `${deltaValue > 0 ? '+' : '-'}${formatNumberCompact(deltaMagnitude)} ${unitText} vs last`
        : null;
    const deltaColor = deltaValue > 0 ? '#65F2B6' : '#FF6B6B';
    const weightValue = Number(entry.weight) || 0;
    const repsValue = Number(entry.reps) || 0;
    const hasSetDetails = weightValue > 0 && repsValue > 0;
    const topSetText = hasSetDetails
        ? `${Math.round(repsValue)} x ${formatWeightValue(weightValue)} ${unitText}`
        : null;
    const workoutName = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : null;
    const timestampText = dayjs(entry.recordedAt).format('MMM D, h:mm A');
    const canNavigate = typeof onWorkoutPress === 'function';

    return (
        <View
            pointerEvents="box-none"
            style={[
                chartPointerStyles.root,
                isRightAligned ? chartPointerStyles.alignRight : chartPointerStyles.alignLeft,
            ]}
        >
            <View
                style={[
                    chartPointerStyles.bubbleWrapper,
                    isRightAligned ? chartPointerStyles.alignRight : chartPointerStyles.alignLeft,
                ]}
            >
                <View style={chartPointerStyles.bubble}>
                    <Text style={chartTypography.pointerTitle}>{totalText}</Text>
                    {deltaText ? (
                        <Text
                            style={[
                                chartTypography.pointerSubtitle,
                                styles.progressPointerLineSpacing,
                                { color: deltaColor },
                            ]}
                        >
                            {deltaText}
                        </Text>
                    ) : null}
                    {topSetText ? (
                        <Text
                            style={[
                                chartTypography.pointerSubtitle,
                                styles.progressPointerLineSpacing,
                                { color: '#F6F8FF' },
                            ]}
                        >
                            {topSetText}
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
                                        chartTypography.pointerSubtitle,
                                        styles.progressPointerLineSpacing,
                                        chartTypography.pointerAccentBlue,
                                    ]}
                                >
                                    {workoutName}
                                </Text>
                            </Pressable>
                        ) : (
                            <Text
                                style={[
                                    chartTypography.pointerSubtitle,
                                    styles.progressPointerLineSpacing,
                                    chartTypography.pointerAccentBlue,
                                ]}
                            >
                                {workoutName}
                            </Text>
                        )
                    ) : null}
                    <Text
                        style={[
                            chartTypography.pointerTimestamp,
                            styles.progressPointerTimestampSpacing,
                        ]}
                    >
                        {timestampText}
                    </Text>
                </View>
            </View>
        </View>
    );
});

export const ExerciseRepsPointerLabel = React.memo(({ entry, isRightAligned, onWorkoutPress }) => {
    if (!entry) return null;
    const totalText = `${formatNumberCompact(entry.value)} reps`;
    const incrementText = entry.increment ? `+${formatNumberCompact(entry.increment)} reps` : null;
    const workoutName = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : null;
    const timestampText = dayjs(entry.recordedAt).format('MMM D, h:mm A');
    const canNavigate = typeof onWorkoutPress === 'function';

    return (
        <View
            pointerEvents="box-none"
            style={[
                chartPointerStyles.root,
                isRightAligned ? chartPointerStyles.alignRight : chartPointerStyles.alignLeft,
            ]}
        >
            <View
                style={[
                    chartPointerStyles.bubbleWrapper,
                    isRightAligned ? chartPointerStyles.alignRight : chartPointerStyles.alignLeft,
                ]}
            >
                <View style={chartPointerStyles.bubble}>
                    <Text style={chartTypography.pointerTitle}>{totalText}</Text>
                    {incrementText ? (
                        <Text
                            style={[
                                chartTypography.pointerSubtitle,
                                styles.progressPointerLineSpacing,
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
                                        chartTypography.pointerSubtitle,
                                        styles.progressPointerLineSpacing,
                                        chartTypography.pointerAccentBlue,
                                    ]}
                                >
                                    {workoutName}
                                </Text>
                            </Pressable>
                        ) : (
                            <Text
                                style={[
                                    chartTypography.pointerSubtitle,
                                    styles.progressPointerLineSpacing,
                                    chartTypography.pointerAccentBlue,
                                ]}
                            >
                                {workoutName}
                            </Text>
                        )
                    ) : null}
                    <Text
                        style={[
                            chartTypography.pointerTimestamp,
                            styles.progressPointerTimestampSpacing,
                        ]}
                    >
                        {timestampText}
                    </Text>
                </View>
            </View>
        </View>
    );
});

export const ExercisePersonalRecordPointerLabel = React.memo(
    ({ entry, unit, isRightAligned, onWorkoutPress }) => {
        if (!entry) return null;
        const totalText = `${formatNumberCompact(entry.value)} PRs`;
        const weightValue = Number(entry.weight) || 0;
        const repsValue = Number(entry.reps) || 0;
        const hasWeight = weightValue > 0;
        const hasReps = repsValue > 0;
        const formattedWeight = hasWeight ? `${formatWeightValue(weightValue)}${unit ? unit : ''}` : null;
        const formattedCombo =
            hasReps && hasWeight ? `${Math.round(repsValue)} x ${formattedWeight}` : null;
        const incrementValue = Number(entry.increment) || 0;
        const incrementText = incrementValue > 0 ? `+${formatNumberCompact(incrementValue)} PR${incrementValue === 1 ? '' : 's'}` : null;
        const workoutName = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : null;
        const timestampText = dayjs(entry.recordedAt).format('MMM D, h:mm A');
        const canNavigate = typeof onWorkoutPress === 'function';

        return (
            <View
                pointerEvents="box-none"
                style={[
                    chartPointerStyles.root,
                    isRightAligned ? chartPointerStyles.alignRight : chartPointerStyles.alignLeft,
                ]}
            >
                <View
                    style={[
                        chartPointerStyles.bubbleWrapper,
                        isRightAligned ? chartPointerStyles.alignRight : chartPointerStyles.alignLeft,
                    ]}
                >
                    <View style={chartPointerStyles.bubble}>
                        <Text style={chartTypography.pointerTitle}>{totalText}</Text>
                        {incrementText ? (
                            <Text
                            style={[
                                chartTypography.pointerSubtitle,
                                styles.progressPointerLineSpacing,
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
                                            chartTypography.pointerSubtitle,
                                            styles.progressPointerLineSpacing,
                                            chartTypography.pointerAccentBlue,
                                        ]}
                                    >
                                        {workoutName}
                                    </Text>
                                </Pressable>
                            ) : (
                                <Text
                                    style={[
                                        chartTypography.pointerSubtitle,
                                        styles.progressPointerLineSpacing,
                                        chartTypography.pointerAccentBlue,
                                    ]}
                                >
                                    {workoutName}
                                </Text>
                            )
                        ) : null}
                        {formattedCombo ? (
                            <Text
                                style={[
                                    chartTypography.pointerSubtitle,
                                    styles.progressPointerLineSpacing,
                                    chartTypography.pointerAccentBlue,
                                ]}
                            >
                                {formattedCombo}
                            </Text>
                        ) : null}
                        <Text
                            style={[
                                chartTypography.pointerTimestamp,
                                styles.progressPointerTimestampSpacing,
                            ]}
                        >
                            {timestampText}
                        </Text>
                    </View>
                </View>
            </View>
        );
    }
);
