import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View, Text } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { Ionicons } from "@expo/vector-icons";

import theme from "../../theme/mfpDark";
import scaleSize from "../../helper/scaleSize";
import formatHexStat from "../../utils/formatHexStat";
import { subscribeUserData } from "../../utils/userDataEvents";

const scaled = (value) => scaleSize(value);

const roundTo = (value, decimals = 1) => {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
};

const ensureNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};

const toMillis = (value) => {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }
    if (value instanceof Date) {
        const ms = value.getTime();
        return Number.isFinite(ms) ? ms : null;
    }
    if (value && typeof value === "object") {
        if (typeof value.toMillis === "function") {
            const ms = value.toMillis();
            return Number.isFinite(ms) ? ms : null;
        }
        if (typeof value.seconds === "number") {
            const ms = value.seconds * 1000;
            return Number.isFinite(ms) ? ms : null;
        }
    }
    if (typeof value === "string") {
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

const resolveWorkoutTimestamp = (workout) => {
    if (!workout) return null;
    const candidates = [
        workout?.finishedAt,
        workout?.completedAt,
        workout?.endedAt,
        workout?.timestamp,
        workout?.loggedAt,
        workout?.updatedAt,
        workout?.createdAt,
        workout?.created,
        workout?.startTime,
        workout?.date,
    ];
    for (const candidate of candidates) {
        const ms = toMillis(candidate);
        if (Number.isFinite(ms) && ms > 0) return ms;
    }
    return null;
};

const resolvePreferredWeightUnit = (user) => {
    const rawUnit =
        user?.settings?.units ||
        user?.units ||
        user?.personalInfo?.weightUnit ||
        user?.stats?.weightUnit;
    if (typeof rawUnit === "string") {
        const normalized = rawUnit.trim().toLowerCase();
        if (normalized.startsWith("k")) return "kg";
        if (normalized.includes("kilo")) return "kg";
    }
    return "lb";
};

const toDisplayWeightUnit = (unit, fallback = "lbs") => {
    if (typeof unit === "string") {
        const trimmed = unit.trim();
        const normalized = trimmed.toLowerCase();
        if (normalized) {
            if (normalized.startsWith("kg")) return "kg";
            if (normalized === "lb" || normalized === "lbs" || normalized.startsWith("lb")) return "lbs";
            return trimmed;
        }
    }
    return fallback;
};

const formatCompactNumber = (value) => {
    const number = ensureNumber(value, 0);
    if (number >= 1_000_000_000) return `${roundTo(number / 1_000_000_000, 1)}b`;
    if (number >= 1_000_000) return `${roundTo(number / 1_000_000, 1)}m`;
    if (number >= 1_000) return `${roundTo(number / 1_000, 1)}k`;
    return `${Math.round(number)}`;
};

const formatDurationLabel = (hoursInput) => {
    const totalMinutes = Math.max(0, Math.round(ensureNumber(hoursInput, 0) * 60));
    const totalHours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (!totalHours && !minutes) return "0h";
    if (totalHours && minutes) return `${totalHours}h ${minutes}m`;
    if (totalHours) return `${totalHours}h`;
    return `${minutes}m`;
};

const formatShortDate = (timestamp) => {
    if (!Number.isFinite(timestamp)) return "--/--/----";
    try {
        return new Date(timestamp).toLocaleDateString("en-US", {
            month: "numeric",
            day: "numeric",
            year: "2-digit",
        });
    } catch {
        return "--/--/----";
    }
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const computeSnapshot = (user) => {
    const workouts = Array.isArray(user?.completedWorkouts) ? user.completedWorkouts : [];
    const now = Date.now();
    const weekStart = now - WEEK_MS;
    const weeklyWorkouts = workouts.filter((workout) => {
        const ts = resolveWorkoutTimestamp(workout);
        return Number.isFinite(ts) && ts >= weekStart;
    });

    const preferredUnit = resolvePreferredWeightUnit(user);
    const displayUnit = toDisplayWeightUnit(preferredUnit);

    const rangeLabel = `${formatShortDate(weekStart)} to ${formatShortDate(now)}`;

    let weeklyVolume = 0;
    let weeklyDurationMs = 0;
    let weeklyRecords = 0;
    const weeklyHexCandidates = [];

    for (const workout of weeklyWorkouts) {
        const volume = ensureNumber(
            workout?.volume ??
                workout?.totalVolume ??
                workout?.stats?.volume ??
                (Array.isArray(workout?.exercises)
                    ? workout.exercises.reduce((acc, ex) => {
                          if (!Array.isArray(ex?.sets)) return acc;
                          return (
                              acc +
                              ex.sets.reduce((setAcc, set) => {
                                  const weight = ensureNumber(
                                      set?.weight ?? set?.kg ?? set?.lbs ?? set?.weightKg ?? set?.weightLbs
                                  );
                                  const reps = ensureNumber(set?.reps ?? set?.rep ?? set?.r);
                                  return weight > 0 && reps > 0 ? setAcc + weight * reps : setAcc;
                              }, 0)
                          );
                      }, 0)
                    : 0)
        );
        if (volume > 0) weeklyVolume += volume;

        const durationMs = (() => {
            const direct = ensureNumber(workout?.duration);
            if (direct > 0) return direct;
            const seconds = ensureNumber(workout?.durationSeconds ?? workout?.elapsedSeconds);
            if (seconds > 0) return seconds * 1000;
            const minutes = ensureNumber(workout?.durationMinutes);
            if (minutes > 0) return minutes * 60 * 1000;
            return 0;
        })();
        if (durationMs > 0) weeklyDurationMs += durationMs;

        const records = ensureNumber(workout?.PBs ?? workout?.pbs ?? workout?.pr);
        if (records > 0) weeklyRecords += records;

        const hexCandidate = ensureNumber(
            workout?.hexScore ??
                workout?.overall ??
                workout?.statsHexagon?.overall ??
                workout?.sessionStats?.overall ??
                workout?.metrics?.overall ??
                0,
            0
        );
        if (hexCandidate > 0) weeklyHexCandidates.push(hexCandidate);
    }

    const weeklyHours = weeklyDurationMs / (1000 * 60 * 60);
    const resolvedHex =
        weeklyHexCandidates.length > 0
            ? weeklyHexCandidates.reduce((sum, value) => sum + value, 0) / weeklyHexCandidates.length
            : ensureNumber(user?.statsHexagon?.overall, 0);

    const workoutCount = weeklyWorkouts.length;
    const workoutCountLabel = workoutCount === 1 ? "1 workout" : `${workoutCount} workouts`;

    return {
        displayUnit,
        volumeValue: weeklyVolume,
        volumeLabel: `${formatCompactNumber(weeklyVolume)} ${displayUnit}`,
        durationLabel: formatDurationLabel(weeklyHours),
        recordsLabel: formatCompactNumber(weeklyRecords),
        recordsValue: weeklyRecords,
        volumeRaw: weeklyVolume,
        durationHours: weeklyHours,
        hexScore: formatHexStat(resolvedHex, "0.0"),
        workoutCount,
        workoutCountLabel,
        rangeLabel,
    };
};

const EMPTY_SNAPSHOT = computeSnapshot(null);

export default function FeedSnapshotCard({ onPressOverall }) {
    const [snapshot, setSnapshot] = useState(() => {
        try {
            return computeSnapshot(global?.userData || null);
        } catch {
            return EMPTY_SNAPSHOT;
        }
    });

    useEffect(() => {
        const unsubscribe = subscribeUserData((nextUser) => {
            try {
                setSnapshot(computeSnapshot(nextUser));
            } catch {
                setSnapshot(EMPTY_SNAPSHOT);
            }
        });
        return unsubscribe;
    }, []);

    const metrics = useMemo(
        () => [
            {
                key: "volume",
                label: "Volume",
                value: snapshot.volumeLabel,
            },
            {
                key: "duration",
                label: "Duration",
                value: snapshot.durationLabel,
                showDivider: true,
            },
            {
                key: "records",
                label: "Records",
                value: snapshot.recordsLabel,
                showDivider: true,
            },
            {
                key: "overall",
                label: "OVR",
                value: snapshot.hexScore,
                accent: true,
            },
        ],
        [snapshot.durationLabel, snapshot.hexScore, snapshot.recordsLabel, snapshot.volumeLabel]
    );

    return (
        <View style={styles.wrapper}>
            <View style={styles.card}>
                <View style={styles.headerRow}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.title}>This Week</Text>
                        <Text style={styles.subtitle}>{snapshot.rangeLabel}</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.workoutCountText}>{snapshot.workoutCountLabel}</Text>
                        <Ionicons
                            name="chevron-forward"
                            size={scaled(18)}
                            color="rgba(234, 240, 247, 0.65)"
                        />
                    </View>
                </View>

                <View style={styles.metricsRow}>
                    {metrics.map((metric) => {
                        const metricStyles = [
                            styles.metricItem,
                            metric.accent ? styles.metricAccent : styles.metricStandard,
                            metric.showDivider ? styles.metricDivider : null,
                        ].filter(Boolean);
                        const isPressable = metric.accent && typeof onPressOverall === "function";
                        if (isPressable) {
                            return (
                                <RNBounceable
                                    key={metric.key}
                                    style={metricStyles}
                                    onPress={onPressOverall}
                                    activeScale={0.96}
                                    accessibilityRole="button"
                                    accessibilityLabel="Open detailed hexagon stats"
                                >
                                    <Text style={[styles.metricValue, styles.metricValueAccent]}>
                                        {metric.value}
                                    </Text>
                                    <Text style={[styles.metricLabel, styles.metricLabelAccent]}>
                                        {metric.label}
                                    </Text>
                                </RNBounceable>
                            );
                        }
                        return (
                            <View key={metric.key} style={metricStyles}>
                                <Text style={[styles.metricValue, metric.accent ? styles.metricValueAccent : null]}>
                                    {metric.value}
                                </Text>
                                <Text style={[styles.metricLabel, metric.accent ? styles.metricLabelAccent : null]}>
                                    {metric.label}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        paddingHorizontal: 0,
        paddingBottom: scaled(10),
    },
    card: {
        backgroundColor: theme.surface,
        width: "100%",
        paddingHorizontal: scaled(12),
        paddingTop: scaleSize(12),
        paddingBottom: scaleSize(8)
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: scaleSize(16),
    },
    headerLeft: {
        flexShrink: 1,
        paddingRight: scaleSize(8),
    },
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
    },
    title: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaled(13),
        color: theme.textPrimary,
        letterSpacing: 0.15,
    },
    subtitle: {
        fontFamily: "Outfit_400Regular",
        fontSize: scaled(11),
        color: "rgba(234, 240, 247, 0.65)",
        marginTop: scaleSize(2),
    },
    workoutCountText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaled(12),
        color: theme.textPrimary,
        marginRight: scaleSize(8),
        letterSpacing: 0.2,
    },
    metricsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: scaled(8),
        paddingRight: scaleSize(8)
    },
    metricItem: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    metricStandard: {
        paddingVertical: 0,
        paddingHorizontal: 0,
        borderRadius: 0,
        backgroundColor: "transparent",
        marginHorizontal: 0,
    },
    metricAccent: {
        backgroundColor: "rgba(45, 158, 255, 0.16)",
        borderColor: "rgba(45, 158, 255, 0.28)",
        borderWidth: StyleSheet.hairlineWidth,
        paddingVertical: scaled(8),
        paddingHorizontal: scaled(8),
        borderRadius: scaled(12),
        flex: 0.7
    },
    metricDivider: {
        borderLeftWidth: StyleSheet.hairlineWidth,
        borderLeftColor: "rgba(255,255,255,0.18)",
    },
    metricValue: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaled(13),
        color: theme.textPrimary,
    },
    metricValueAccent: {
        color: theme.primary,
    },
    metricLabel: {
        marginTop: scaled(4),
        fontFamily: "Outfit_500Medium",
        fontSize: scaled(9),
        color: theme.textSecondary,
        letterSpacing: 0.3,
        textTransform: "uppercase",
    },
    metricLabelAccent: {
        color: theme.primary,
    },
});
