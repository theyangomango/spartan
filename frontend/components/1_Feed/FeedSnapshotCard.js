import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Animated, Easing } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import theme from "../../theme/mfpDark";
import scaleSize from "../../helper/scaleSize";
import formatHexStat from "../../utils/formatHexStat";
import { subscribeUserData } from "../../utils/userDataEvents";

const RANK_TAB_CONFIG = [
    {
        key: "rank",
        label: "Your Rank",
    },
    {
        key: "bodygraph",
        label: "Your Body",
        placeholderTitle: "Bodygraph Insights",
        placeholderSubtitle: "Coming soon: visualize weekly trends and body stats here.",
    },
    {
        key: "leagues",
        label: "Leagues",
        placeholderTitle: "Leagues Overview",
        placeholderSubtitle: "Track upcoming league placements and unlock rewards soon.",
    },
];

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

const formatShortMonthDay = (timestamp) => {
    if (!Number.isFinite(timestamp)) return "--/--";
    try {
        return new Date(timestamp).toLocaleDateString("en-US", {
            month: "numeric",
            day: "numeric",
        });
    } catch {
        return "--/--";
    }
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const getWeekNumberLabel = (timestamp) => {
    if (!Number.isFinite(timestamp)) return null;
    try {
        const date = new Date(timestamp);
        date.setHours(0, 0, 0, 0);
        const dayShift = (date.getDay() + 6) % 7; // shift so Monday is 0
        date.setDate(date.getDate() - dayShift + 3);
        const firstThursday = new Date(date.getFullYear(), 0, 4);
        const week = 1 + Math.round((date - firstThursday) / WEEK_MS);
        return Number.isFinite(week) ? week : null;
    } catch {
        return null;
    }
};


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

    const formattedRange = `${formatShortMonthDay(weekStart)} - ${formatShortMonthDay(now)}`;
    const weekNumber = getWeekNumberLabel(now);
    const rangeLabel = weekNumber ? `${formattedRange}, Week ${weekNumber}` : formattedRange;

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

export default function FeedSnapshotCard({ onPressOverall, onPressCard }) {
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

    const [activeRankTab, setActiveRankTab] = useState(RANK_TAB_CONFIG[0].key);
    const activeRankTabConfig = useMemo(
        () => RANK_TAB_CONFIG.find((tab) => tab.key === activeRankTab) || RANK_TAB_CONFIG[0],
        [activeRankTab]
    );
    const placeholderCopy =
        activeRankTabConfig.key === "rank"
            ? null
            : {
                  title: activeRankTabConfig.placeholderTitle || activeRankTabConfig.label,
                  subtitle: activeRankTabConfig.placeholderSubtitle || "Content coming soon.",
              };
    const isRankTabActive = activeRankTabConfig.key === "rank";

    const particles = useMemo(() => {
        const particleCount = 36;
        const colors = ["rgba(230, 220, 147, 0.95)", "rgba(255,209,93,0.95)", "rgba(255,157,43,0.92)"];
        const originPoints = [
            { top: "50%", left: "34%" },
            { top: "46%", left: "48%" },
            { top: "58%", left: "45%" },
            { top: "53%", left: "60%" },
        ];
        return Array.from({ length: particleCount }).map((_, index) => {
            const baseAngle = (Math.PI * 2 * index) / particleCount;
            const jitter = (Math.random() - 0.5) * 1.1;
            const origin = originPoints[index % originPoints.length];
            return {
                key: `rank-particle-${index}`,
                progress: new Animated.Value(0),
                angle: baseAngle + jitter,
                distance: scaled(80 + Math.random() * 140),
                size: scaled(4.5 + Math.random() * 7),
                delay: Math.random() * 900,
                duration: 1000 + Math.random() * 1100,
                color: colors[index % colors.length],
                blur: 6 + Math.random() * 10,
                origin,
            };
        });
    }, []);

    useEffect(() => {
        if (!isRankTabActive) {
            particles.forEach((particle) => {
                if (typeof particle.progress.stopAnimation === "function") {
                    try {
                        particle.progress.stopAnimation();
                    } catch { }
                }
                particle.progress.setValue(0);
            });
            return undefined;
        }

        let isMounted = true;
        const activeAnimations = new Map();

        const startBurst = (particle) => {
            if (!isMounted) return;
            particle.progress.setValue(0);
            const animation = Animated.sequence([
                Animated.delay(particle.delay),
                Animated.timing(particle.progress, {
                    toValue: 1,
                    duration: particle.duration,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
            ]);
            activeAnimations.set(particle.key, animation);
            animation.start(({ finished }) => {
                if (finished && isMounted) {
                    startBurst(particle);
                }
            });
        };

        particles.forEach(startBurst);

        return () => {
            isMounted = false;
            activeAnimations.forEach((animation) => {
                try {
                    animation.stop();
                } catch { }
            });
            activeAnimations.clear();
        };
    }, [isRankTabActive, particles]);

    const isCardPressable = typeof onPressCard === "function";
    const CardWrapper = isCardPressable ? TouchableOpacity : View;
    const cardWrapperProps = isCardPressable
        ? {
              onPress: onPressCard,
              activeOpacity: 0.88,
              accessibilityRole: "button",
              accessibilityLabel: "View detailed progress",
              hitSlop: { top: scaleSize(6), bottom: scaleSize(6), left: scaleSize(8), right: scaleSize(8) },
          }
        : {};

    return (
        <View style={styles.wrapper}>
            <View style={styles.rankSection}>
                <View style={styles.rankTabsRow}>
                    {RANK_TAB_CONFIG.map((tab) => {
                        const isActive = tab.key === activeRankTabConfig.key;
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                style={[styles.rankTab, isActive ? styles.rankTabActive : styles.rankTabInactive]}
                                onPress={() => setActiveRankTab(tab.key)}
                                activeOpacity={0.85}
                                accessibilityRole="button"
                                accessibilityLabel={tab.label}
                            >
                                <Text
                                    style={[
                                        styles.rankTabText,
                                        isActive ? styles.rankTabTextActive : styles.rankTabTextInactive,
                                    ]}
                                >
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                {isRankTabActive ? (
                    <LinearGradient
                        colors={["#ffea9cdf", "#d29b2eff", "#955e23ff"]}
                        locations={[0, 0.55, 1]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.rankCard}
                    >
                        <View pointerEvents="none" style={styles.rankParticleLayer}>
                            {particles.map((particle) => {
                                const translateX = particle.progress.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, Math.cos(particle.angle) * particle.distance],
                                });
                                const translateY = particle.progress.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, Math.sin(particle.angle) * particle.distance],
                                });
                                const opacity = particle.progress.interpolate({
                                    inputRange: [0, 0.2, 0.8, 1],
                                    outputRange: [0, 1, 0.4, 0],
                                });
                                const scale = particle.progress.interpolate({
                                    inputRange: [0, 0.35, 1],
                                    outputRange: [0.3, 1, 0.2],
                                });
                                return (
                                    <Animated.View
                                        key={particle.key}
                                        style={[
                                            styles.rankParticle,
                                            {
                                                top: particle.origin.top,
                                                left: particle.origin.left,
                                                width: particle.size,
                                                height: particle.size,
                                                marginLeft: -particle.size / 2,
                                                marginTop: -particle.size / 2,
                                                backgroundColor: particle.color,
                                                shadowColor: particle.color,
                                                shadowRadius: scaleSize(particle.blur),
                                                opacity,
                                                transform: [{ translateX }, { translateY }, { scale }],
                                            },
                                        ]}
                                    />
                                );
                            })}
                        </View>
                        <View style={styles.rankCardContent}>
                            <View style={styles.rankBadgeCluster}>
                                <LinearGradient
                                    colors={["rgba(255,255,255,0.5)", "rgba(255,255,255,0.08)"]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={[styles.rankWing, styles.rankWingLeft]}
                                />
                                <LinearGradient
                                    colors={["rgba(255,255,255,0.5)", "rgba(255,255,255,0.08)"]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={[styles.rankWing, styles.rankWingRight]}
                                />
                                <LinearGradient
                                    colors={["#fff4bf", "#f8c34a"]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.rankBadgeOuter}
                                >
                                    <LinearGradient
                                        colors={["#fdf6d7", "#f9d667"]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.rankBadgeInner}
                                    >
                                        <View style={styles.rankBadgeCore}>
                                            <View style={styles.rankBadgeGem} />
                                            <View style={styles.rankBadgeGemInner} />
                                        </View>
                                    </LinearGradient>
                                </LinearGradient>
                            </View>
                            <Text style={styles.rankTitle}>
                                GOLD III
                                <Text style={styles.rankTitleSecondary}> · 87 OVR</Text>
                            </Text>
                        </View>
                        <View pointerEvents="none" style={styles.rankCardBorderTop} />
                        <View pointerEvents="none" style={styles.rankCardBorderBottom} />
                    </LinearGradient>
                ) : (
                    <View style={[styles.rankCard, styles.rankPlaceholderCard]}>
                        <Text style={styles.rankPlaceholderTitle}>
                            {placeholderCopy?.title || activeRankTabConfig.label}
                        </Text>
                        <Text style={styles.rankPlaceholderSubtitle}>
                            {placeholderCopy?.subtitle || "Feature preview coming soon."}
                        </Text>
                    </View>
                )}
            </View>
            {/* <CardWrapper style={styles.card} {...cardWrapperProps}>
                <View style={styles.headerRow}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.title}>Your Weekly Snapshot</Text>
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
                                    activeScale={0.94}
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
            </CardWrapper> */}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        paddingHorizontal: 0,
        paddingBottom: scaled(10),
    },
    rankSection: {
        paddingBottom: scaled(16),
        backgroundColor: theme.bg,
    },
    rankTabsRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(12),
        paddingTop: scaled(4),
        paddingBottom: scaled(8),
        marginBottom: scaled(2),
    },
    rankTab: {
        paddingVertical: scaled(7),
        paddingHorizontal: scaled(16),
        borderRadius: scaled(20),
        marginRight: scaled(10),
        borderWidth: scaleSize(2),
    },
    rankTabActive: {
        backgroundColor: "#59a9ff",
        borderColor: "#59a9ff",
        shadowColor: "#59a9ff",
        shadowOpacity: 0.35,
        shadowRadius: scaleSize(12),
        shadowOffset: { width: 0, height: 4 },
    },
    rankTabInactive: {
        backgroundColor: "rgba(8,8,21,0.92)",
        borderColor: "rgba(255,255,255,0.18)",
    },
    rankTabText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaled(14),
        letterSpacing: 0.3,
    },
    rankTabTextActive: {
        color: "#05060f",
    },
    rankTabTextInactive: {
        color: "rgba(255,255,255,0.7)",
    },
    rankCard: {
        borderRadius: 0,
        paddingVertical: scaled(26),
        paddingHorizontal: scaleSize(24),
        justifyContent: "center",
        overflow: "hidden",
        position: "relative",
        minHeight: scaleSize(190),
        height: scaleSize(190),
    },
    rankCardBorderTop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: scaled(5),
        backgroundColor: "#f9d564",
        zIndex: 5,
    },
    rankCardBorderBottom: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: scaled(5),
        backgroundColor: "#f9d564",
        zIndex: 5,
    },
    rankCardContent: {
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: scaleSize(4),
        zIndex: 2,
    },
    rankBadgeCluster: {
        width: scaled(96),
        height: scaled(88),
        justifyContent: "center",
        alignItems: "center",
        marginBottom: scaled(14),
        position: "relative",
    },
    rankParticleLayer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
    },
    rankParticle: {
        position: "absolute",
        borderRadius: 999,
        shadowOpacity: 0.75,
        shadowOffset: { width: 0, height: 0 },
    },
    rankPlaceholderCard: {
        backgroundColor: "rgba(6, 8, 18, 0.85)",
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.14)",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: scaleSize(40),
    },
    rankPlaceholderTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaled(18),
        color: "#f1f3ff",
        letterSpacing: 0.5,
        textAlign: "center",
    },
    rankPlaceholderSubtitle: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaled(13),
        color: "rgba(255,255,255,0.75)",
        textAlign: "center",
        marginTop: scaleSize(6),
        lineHeight: scaled(18),
    },
    rankBadgeOuter: {
        width: "100%",
        height: "90%",
        borderRadius: scaleSize(26),
        justifyContent: "center",
        alignItems: "center",
    },
    rankBadgeInner: {
        width: "80%",
        height: "78%",
        borderRadius: scaleSize(22),
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.08)",
        borderWidth: scaleSize(1),
        borderColor: "rgba(255,255,255,0.25)",
    },
    rankBadgeCore: {
        width: "78%",
        height: "74%",
        backgroundColor: "#f9d564",
        borderRadius: scaleSize(20),
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#a45900",
        shadowOpacity: 0.35,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: scaleSize(10),
        elevation: 4,
    },
    rankBadgeGem: {
        width: scaled(28),
        height: scaled(28),
        backgroundColor: "#fff5c1",
        transform: [{ rotate: "45deg" }],
        borderRadius: scaleSize(6),
        borderWidth: scaleSize(1),
        borderColor: "rgba(166,106,13,0.4)",
    },
    rankBadgeGemInner: {
        position: "absolute",
        width: scaled(14),
        height: scaled(14),
        backgroundColor: "#f1b739",
        transform: [{ rotate: "45deg" }],
        borderRadius: scaleSize(3),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.5)",
        top: "50%",
        left: "50%",
        marginLeft: -scaled(7),
        marginTop: -scaled(7),
    },
    rankWing: {
        position: "absolute",
        width: scaled(36),
        height: scaled(52),
        borderRadius: scaleSize(14),
        opacity: 0.8,
    },
    rankWingLeft: {
        left: -scaleSize(22),
        transform: [{ rotate: "-10deg" }],
    },
    rankWingRight: {
        right: -scaleSize(22),
        transform: [{ rotate: "10deg" }],
    },
    rankTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaled(20),
        color: "#fffef4",
        marginTop: scaled(6),
        letterSpacing: 0.25,
        textAlign: "center",
        textTransform: "uppercase",
    },
    rankTitleSecondary: {
        fontFamily: "Outfit_600SemiBold",
        color: "#f9da73ff",
        fontSize: scaled(20),
    },
    card: {
        backgroundColor: theme.surface,
        width: "100%",
        paddingHorizontal: scaleSize(0),
        paddingTop: scaleSize(14),
        paddingBottom: scaleSize(8),
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: scaleSize(32),
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
        fontSize: scaled(14),
        color: theme.textPrimary,
        letterSpacing: 0.15,
    },
    subtitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaled(12),
        color: "rgba(234, 240, 247, 0.56)",
        marginTop: scaleSize(2),
    },
    workoutCountText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaled(13),
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
        fontSize: scaled(14),
        color: theme.primary,
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
