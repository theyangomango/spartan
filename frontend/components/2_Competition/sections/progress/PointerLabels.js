// Tooltip contents shown above the active point of the Progress tab charts (body weight, volume, reps, PRs).
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import dayjs from "dayjs";

import { toDisplayWeightUnit } from "../../../../utils/weightUnits";
import { formatVolumeValue } from "../../../charts/chartMath";
import { chartTypography } from "../../../charts/chartStyles";
import PointerBubbleCard from "../../../charts/PointerBubbleCard";
import { scaleSize } from "../../layoutConstants";
import { POINTER_PANEL_ACCENTS } from "./progressConstants";
import { formatWeightValue } from "./progressMetrics";

export const PointerLabelBubble = React.memo(({ entry, unit, delta, isRightAligned }) => {
    if (!entry) return null;

    const weightText = `${formatWeightValue(entry.weight)} ${unit}`;
    const timestampText = dayjs(entry.recordedAt).format("MMM D, h:mm A");
    const shouldShowDelta = typeof delta === "number" && delta !== null;

    const buildDeltaText = () => {
        if (!shouldShowDelta) return null;
        const absValue = Math.abs(delta);
        const formatDeltaValue = (value) => {
            if (!Number.isFinite(value)) return null;
            if (value >= 100) return Math.round(value).toString();
            const rounded = Math.round(value * 10) / 10;
            return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
        };

        const formattedValue = formatDeltaValue(absValue);
        if (formattedValue == null) return null;

        const unitLabel = (() => {
            if (typeof unit === "string") {
                const normalized = unit.toLowerCase();
                if (normalized === "lb" || normalized === "lbs" || normalized.startsWith("lb")) {
                    return absValue === 1 ? "lb" : "lbs";
                }
            }
            return unit;
        })();

        const prefix = delta > 0 ? "+" : delta < 0 ? "-" : "+";
        return `${prefix}${formattedValue} ${unitLabel}`;
    };

    const deltaText = buildDeltaText();
    const isPositiveDelta = typeof delta === "number" && delta > 0;
    const isNegativeDelta = typeof delta === "number" && delta < 0;
    const deltaStyle = [
        chartTypography.pointerBody,
        styles.pointerBubbleLineSpacing,
        isPositiveDelta
            ? chartTypography.pointerAccentGreen
            : isNegativeDelta
                ? chartTypography.pointerDeltaNegative
                : chartTypography.pointerDeltaNeutral,
    ];

    return (
        <PointerBubbleCard
            accent={POINTER_PANEL_ACCENTS.weight}
            label="Body Weight"
            isRightAligned={isRightAligned}
            accessibilityLabel={`Weight ${weightText} logged ${timestampText}`}
        >
            <Text style={chartTypography.pointerTitle}>{weightText}</Text>
            {deltaText ? <Text style={deltaStyle}>{deltaText}</Text> : null}
            <View style={styles.pointerBubbleDivider} />
            <Text
                style={[chartTypography.pointerTimestamp, styles.pointerBubbleTimestampSpacing]}
            >
                {timestampText}
            </Text>
        </PointerBubbleCard>
    );
});

export const VolumePointerLabel = React.memo(({ entry, unit, isRightAligned, onWorkoutPress }) => {
    if (!entry) return null;

    const unitText = toDisplayWeightUnit(unit);
    const totalText = `${formatVolumeValue(entry.value)} ${unitText}`;
    const incrementText = entry.increment ? `+${formatVolumeValue(entry.increment)} ${unitText}` : null;
    const timestampText = dayjs(entry.recordedAt).format("MMM D, h:mm A");
    const workoutName = (typeof entry.name === "string" && entry.name.trim()) || null;
    const canNavigate = typeof onWorkoutPress === "function";

    return (
        <PointerBubbleCard
            label="Total Volume"
            accent={POINTER_PANEL_ACCENTS.volume}
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
});

export const RepsPointerLabel = React.memo(({ entry, isRightAligned, onWorkoutPress }) => {
    if (!entry) return null;

    const totalText = `${formatVolumeValue(entry.value)} reps`;
    const incrementText = entry.increment ? `+${formatVolumeValue(entry.increment)} reps` : null;
    const timestampText = dayjs(entry.recordedAt).format("MMM D, h:mm A");
    const workoutName = (typeof entry.name === "string" && entry.name.trim()) || null;
    const canNavigate = typeof onWorkoutPress === "function";

    return (
        <PointerBubbleCard
            label="Total Reps"
            accent={POINTER_PANEL_ACCENTS.reps}
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
});

export const PersonalRecordPointerLabel = React.memo(({ entry, isRightAligned, onWorkoutPress }) => {
    if (!entry) return null;

    const totalText = `${formatVolumeValue(entry.value)} PRs`;
    const incrementValue = Number(entry.increment) || 0;
    const incrementText = incrementValue > 0 ? `+${formatVolumeValue(incrementValue)} PR${incrementValue === 1 ? "" : "s"}` : null;
    const workoutName = (typeof entry.name === "string" && entry.name.trim()) || null;
    const noRecordText = incrementValue === 0 ? "No new PRs" : null;
    const timestampText = dayjs(entry.recordedAt).format("MMM D, h:mm A");
    const canNavigate = typeof onWorkoutPress === "function";

    return (
        <PointerBubbleCard
            label="Personal Records"
            accent={POINTER_PANEL_ACCENTS.prs}
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
            {noRecordText ? (
                <Text
                    style={[
                        chartTypography.pointerBody,
                        styles.pointerBubbleLineSpacing,
                        chartTypography.pointerDeltaNeutral,
                    ]}
                >
                    {noRecordText}
                </Text>
            ) : null}
            <View style={styles.pointerBubbleDivider} />
            <Text style={[chartTypography.pointerTimestamp, styles.pointerBubbleTimestampSpacing]}>
                {timestampText}
            </Text>
        </PointerBubbleCard>
    );
});

const styles = StyleSheet.create({
    pointerBubbleDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: "rgba(255,255,255,0.08)",
        marginTop: scaleSize(10),
        marginBottom: scaleSize(6),
    },
    pointerBubbleLineSpacing: {
        marginTop: scaleSize(2),
    },
    pointerBubbleTimestampSpacing: {
        marginTop: scaleSize(2),
    },
});
