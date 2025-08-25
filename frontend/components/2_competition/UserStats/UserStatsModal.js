import React, { useMemo } from "react";
import { StyleSheet, View, Text, ScrollView, Pressable, Dimensions } from "react-native";
import FastImage from "react-native-fast-image";
import HexagonalStats from "./HexagonalStats";

const { height: screenHeight } = Dimensions.get("window");
const scale = screenHeight / 844; // iPhone 13 baseline
const scaledSize = (n) => Math.round(n * scale);

// Theme
const COLORS = {
    bg: "#F8FAFF",
    card: "#FFFFFF",
    text: "#0F172A",
    subtext: "#64748B",
    accent: "#2D9EFF",
    hairline: "#E6EEF6",
};

// ---------- helpers ----------
const safeNumber = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const fmtK = (n) => {
    const v = safeNumber(n, 0);
    if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
    return `${Math.round(v)}`;
};

// Estimate 1RM via Epley if missing; picks best set by weight*reps
const estimate1RM = (exercise) => {
    const explicit = safeNumber(exercise?.["1RM"], NaN);
    if (Number.isFinite(explicit)) return Math.round(explicit);
    const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
    if (!sets.length) return 0;
    let best = 0;
    for (const s of sets) {
        const w = safeNumber(s?.weight, 0);
        const r = safeNumber(s?.reps, 0);
        const est = w * (1 + r / 30);
        if (est > best) best = est;
    }
    return Math.round(best || 0);
};

const computeVolume = (exercise) => {
    const explicit = safeNumber(exercise?.Volume, NaN);
    if (Number.isFinite(explicit)) return explicit;
    const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
    return sets.reduce((sum, s) => sum + safeNumber(s?.weight, 0) * safeNumber(s?.reps, 0), 0);
};

const bestTopSet = (exercise) => {
    const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
    if (!sets.length) return null;
    let best = null;
    let bestScore = -Infinity;
    for (const s of sets) {
        const w = safeNumber(s?.weight, 0);
        const r = safeNumber(s?.reps, 0);
        const score = w * r;
        if (score > bestScore) {
            bestScore = score;
            best = { weight: Math.round(w), reps: Math.round(r) };
        }
    }
    return best;
};

const getExercisesSorted = (user) => {
    const map = user?.statsExercises || {};
    const entries = Object.entries(map)
        .filter(([, ex]) => (Array.isArray(ex?.sets) ? ex.sets.length > 0 : (ex?.["1RM"] || ex?.Volume)))
        .map(([name, ex]) => ({ name, exercise: ex }));

    entries.sort((a, b) => {
        const aSets = Array.isArray(a.exercise?.sets) ? a.exercise.sets.length : 0;
        const bSets = Array.isArray(b.exercise?.sets) ? b.exercise.sets.length : 0;
        if (bSets !== aSets) return bSets - aSets;
        return estimate1RM(b.exercise) - estimate1RM(a.exercise);
    });

    return entries;
};

// join date: supports Firestore TS ({seconds}), ms, ISO string, or Date
const toDate = (d) => {
    if (!d) return null;
    if (d instanceof Date) return d;
    if (typeof d === "object" && Number.isFinite(d.seconds)) return new Date(d.seconds * 1000);
    if (typeof d === "number") return new Date(d);
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? null : parsed;
};
const formatJoinDate = (raw) => {
    const date = toDate(raw ?? null);
    if (!date) return "Joined";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `Joined: ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

export default function UserStatsModal({ user, toViewProfile }) {
    const exercises = useMemo(() => getExercisesSorted(user), [user]);
    const overall = Math.round(user?.statsHexagon?.overall ?? 0);
    const joinedLabel = formatJoinDate(
        user?.joinedAt ?? user?.joinDate ?? user?.createdAt ?? user?.created_at ?? user?.meta?.joinedAt
    );

    return (
        <View style={styles.container}>
            {/* Grabber */}
            <View style={styles.grabber} />

            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={toViewProfile} style={styles.headerLeft} hitSlop={10}>
                    <FastImage
                        source={{
                            uri: user.image,
                            priority: FastImage.priority.normal,
                            cache: FastImage.cacheControl.immutable,
                        }}
                        style={styles.pfp}
                    />
                    <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.handle}>
                            {user.handle}
                        </Text>
                        <Text style={styles.subHandle}>{joinedLabel}</Text>
                    </View>
                </Pressable>

                <View style={styles.scorePill}>
                    <Text style={styles.scorePillLabel}>OVR</Text>
                    <Text style={styles.scorePillValue}>{overall}</Text>
                </View>
            </View>

            {/* Content */}
            <ScrollView
                style={styles.scrollview}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Hexagon (no card background) */}
                <View style={styles.hexWrap}>
                    <HexagonalStats statsHexagon={user.statsHexagon} />
                </View>

                {/* Exercises */}
                <Text style={styles.sectionTitle}>Exercises</Text>
                <View style={styles.exerciseList}>
                    {exercises.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyText}>No exercises tracked yet.</Text>
                        </View>
                    ) : (
                        exercises.slice(0, 12).map(({ name, exercise }, idx) => {
                            const oneRM = estimate1RM(exercise);
                            const volume = computeVolume(exercise);
                            const setsCount = Array.isArray(exercise?.sets) ? exercise.sets.length : 0;
                            const top = bestTopSet(exercise);

                            return (
                                <Pressable key={`${name}-${idx}`} style={({ pressed }) => [
                                    styles.exerciseCard,
                                    pressed && styles.exerciseCardPressed
                                ]}>
                                    {/* Row: name + 1RM pill */}
                                    <View style={styles.exerciseHeader}>
                                        <View style={styles.nameRow}>
                                            {/* <View style={styles.accentDot} /> */}
                                            <Text numberOfLines={1} style={styles.exerciseName}>{name}</Text>
                                        </View>
                                        {!!oneRM && oneRM > 0 && (
                                            <View style={styles.oneRMPill}>
                                                <Text style={styles.oneRMLabel}>1RM</Text>
                                                <Text style={styles.oneRMValue}>{oneRM}</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Divider */}
                                    <View style={styles.divider} />

                                    {/* Stat row: 3 equal columns */}
                                    <View style={styles.metaRow}>
                                        <View style={styles.metaCell}>
                                            <Text style={styles.metaLabel}>Volume</Text>
                                            <Text style={styles.metaValue}>{fmtK(volume)}</Text>
                                        </View>
                                        <View style={styles.vDivider} />
                                        <View style={styles.metaCell}>
                                            <Text style={styles.metaLabel}>Sets</Text>
                                            <Text style={styles.metaValue}>{setsCount}</Text>
                                        </View>
                                        <View style={styles.vDivider} />
                                        <View style={styles.metaCell}>
                                            <Text style={styles.metaLabel}>Top set</Text>
                                            <Text style={styles.metaValue}>{top ? `${top.weight}×${top.reps}` : "-"}</Text>
                                        </View>
                                    </View>
                                </Pressable>
                            );
                        })
                    )}
                </View>

                <View style={{ height: scaledSize(100) }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
        borderTopLeftRadius: scaledSize(24),
        borderTopRightRadius: scaledSize(24),
    },
    grabber: {
        alignSelf: "center",
        width: scaledSize(44),
        height: scaledSize(5),
        borderRadius: scaledSize(3),
        backgroundColor: COLORS.hairline,
        marginTop: scaledSize(10),
        marginBottom: scaledSize(8),
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaledSize(22), // a little more horizontal padding
        paddingTop: scaledSize(8),
        paddingBottom: scaledSize(8),
        justifyContent: "space-between",
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginRight: scaledSize(12),
    },
    pfp: {
        width: scaledSize(46),
        height: scaledSize(46),
        borderRadius: scaledSize(23),
        marginRight: scaledSize(12),
        backgroundColor: "#e8eef7",
    },
    handle: {
        fontSize: scaledSize(18.5),
        fontFamily: "Outfit_600SemiBold",
        color: COLORS.text,
        letterSpacing: 0.2,
    },
    subHandle: {
        marginTop: scaledSize(2),
        fontSize: scaledSize(12),
        fontFamily: "Outfit_400Regular",
        color: COLORS.subtext,
    },

    // OVR pill
    scorePill: {
        flexDirection: "row",
        alignItems: "baseline",
        paddingHorizontal: scaledSize(12),
        paddingVertical: scaledSize(7),
        borderRadius: scaledSize(999),
        borderWidth: 1,
        borderColor: COLORS.hairline,
        backgroundColor: "#FFFFFF",
    },
    scorePillLabel: {
        fontSize: scaledSize(11),
        fontFamily: "Outfit_600SemiBold",
        color: COLORS.subtext,
        marginRight: scaledSize(6),
        letterSpacing: 1,
    },
    scorePillValue: {
        fontSize: scaledSize(15.5),
        fontFamily: "Outfit_700Bold",
        color: COLORS.accent,
        letterSpacing: 0.2,
    },

    scrollview: { flex: 1 },
    scrollContent: {
        paddingHorizontal: scaledSize(17), // a touch more
        paddingBottom: scaledSize(10),
    },

    // Hexagon wrapper (no card background)
    hexWrap: {
        paddingTop: scaledSize(2),
    },

    sectionTitle: {
        marginTop: scaledSize(12),
        marginBottom: scaledSize(8),
        paddingHorizontal: scaledSize(2),
        fontSize: scaledSize(14.5),
        fontFamily: "Outfit_600SemiBold",
        color: COLORS.subtext,
        letterSpacing: 0.4,
    },

    exerciseList: {
        gap: scaledSize(10),
    },

    // Empty state
    emptyCard: {
        backgroundColor: COLORS.card,
        borderRadius: scaledSize(14),
        borderWidth: 1,
        borderColor: COLORS.hairline,
        paddingVertical: scaledSize(16),
        alignItems: "center",
    },
    emptyText: {
        fontSize: scaledSize(13),
        fontFamily: "Outfit_500Medium",
        color: COLORS.subtext,
    },

    // Modern exercise card
    exerciseCard: {
        backgroundColor: COLORS.card,
        borderRadius: scaledSize(14),
        borderWidth: 1,
        borderColor: COLORS.hairline,
        paddingHorizontal: scaledSize(14),
        paddingVertical: scaledSize(10),
    },
    exerciseCardPressed: {
        backgroundColor: "#FCFDFF",
    },

    exerciseHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: scaledSize(8),
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        minWidth: 0,
    },
    accentDot: {
        width: scaledSize(6),
        height: scaledSize(6),
        borderRadius: scaledSize(3),
        backgroundColor: COLORS.accent,
        marginRight: scaledSize(8),
    },
    exerciseName: {
        flex: 1,
        fontSize: scaledSize(13.5), // compact, sleek
        fontFamily: "Outfit_600SemiBold",
        color: COLORS.text,
    },

    oneRMPill: {
        flexDirection: "row",
        alignItems: "baseline",
        paddingHorizontal: scaledSize(8),
        paddingVertical: scaledSize(5),
        borderRadius: scaledSize(999),
        borderWidth: 1,
        borderColor: COLORS.hairline,
        backgroundColor: "#FFFFFF",
    },
    oneRMLabel: {
        fontSize: scaledSize(10.5),
        fontFamily: "Outfit_600SemiBold",
        color: COLORS.subtext,
        marginRight: scaledSize(5),
        letterSpacing: 0.6,
    },
    oneRMValue: {
        fontSize: scaledSize(13),
        fontFamily: "Outfit_700Bold",
        color: COLORS.accent,
    },

    divider: {
        height: 1,
        backgroundColor: COLORS.hairline,
        marginBottom: scaledSize(8),
    },

    metaRow: {
        flexDirection: "row",
        alignItems: "stretch",
    },
    metaCell: {
        flex: 1,
        alignItems: "center",
    },
    vDivider: {
        width: 1,
        backgroundColor: COLORS.hairline,
        marginHorizontal: scaledSize(6),
    },
    metaLabel: {
        fontSize: scaledSize(11.5),
        fontFamily: "Outfit_500Medium",
        color: COLORS.subtext,
        marginBottom: scaledSize(2),
        letterSpacing: 0.3,
    },
    metaValue: {
        fontSize: scaledSize(12.5),
        fontFamily: "Outfit_700Bold",
        color: COLORS.text,
    },
});
