import React, { useMemo, useCallback } from "react";
import { StyleSheet, View, Text, FlatList, Dimensions } from "react-native";
import scaleSize from "../../../../helper/scaleSize";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Clock } from "iconsax-react-native";
import roundToNearestMinute from "../../../../helper/roundToNearestMinute";
import formatTimestampToDateString from "../../../../helper/formatTimestampToDateString";

const { height: screenHeight } = Dimensions.get("window");
const scaledSize = (n) => scaleSize(n);

const COLORS = {
    card: "#FFFFFF",
    text: "#0F172A",
    subtext: "#64748B",
    hairline: "rgba(2, 6, 23, 0.06)",
    chipText: "#FFFFFF",
    blue: "#2D9EFF",
    statBg: "#F8FAFC",
    statBorder: "rgba(100,116,139,0.15)",
    pillBg: "#EEF2FF",
    pillBorder: "rgba(99,102,241,0.35)",
    iconHalo: "#E2E8F0",
};

const MUSCLE_COLORS = {
    Chest: "#FFAFB8",
    Shoulders: "#A1CDEE",
    Arms: "#CBBCFF",
    Back: "#95E0C8",
    Triceps: "#FFD580",
    Legs: "#FFB347",
    Abs: "#FF7561",
};

function bestSet(sets) {
    if (!Array.isArray(sets) || sets.length === 0) return null;
    const parsed = sets.map((s) => ({
        weight: Number(s?.weight ?? 0),
        reps: Number(s?.reps ?? 0),
    }));
    parsed.sort((a, b) => b.weight - a.weight || b.reps - a.reps);
    return parsed[0];
}

const Divider = () => <View style={styles.divider} />;

const PastWorkoutCard = ({ workout }) => {
    // Derived values
    const dateText = useMemo(
        () => formatTimestampToDateString(workout?.created),
        [workout?.created]
    );

    const totalSets = useMemo(() => {
        try {
            return workout?.exercises?.reduce((acc, e) => acc + (e.sets?.length || 0), 0) ?? 0;
        } catch {
            return 0;
        }
    }, [workout?.exercises]);

    const renderExercise = useCallback(({ item }) => {
        const chipColor = MUSCLE_COLORS[item?.muscle] || "#CBD5E1";
        const top = bestSet(item?.sets);
        return (
            <View style={styles.row}>
                <View style={styles.rowLeft}>
                    <Text style={styles.exerciseName} numberOfLines={1} ellipsizeMode="tail">
                        {`${item?.sets?.length || 0} x ${item?.name || "Exercise"}`}
                    </Text>
                    {!!item?.muscle && (
                        <View style={[styles.muscleChip, { backgroundColor: chipColor }]}>
                            <Text style={styles.muscleChipText}>{item.muscle}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.rowRight}>
                    {top ? (
                        <View style={styles.bestPill}>
                            <MaterialCommunityIcons name="weight" size={scaledSize(14)} color={COLORS.text} />
                            <Text style={styles.bestPillText}>{`${top.weight} lb × ${top.reps}`}</Text>
                        </View>
                    ) : (
                        <Text style={styles.naText}>N/A</Text>
                    )}
                </View>
            </View>
        );
    }, []);

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerDate}>{dateText}</Text>
                    <Text style={styles.headerSub}>
                        {workout?.exercises?.length || 0} exercises • {totalSets} sets
                    </Text>
                </View>

                <View style={styles.headerBadge}>
                    <MaterialCommunityIcons name="trophy" color={COLORS.text} size={scaledSize(16)} />
                    <Text style={styles.headerBadgeText}>
                        {(workout?.PBs ?? 0)} PR{(workout?.PBs ?? 0) === 1 ? "" : "s"}
                    </Text>
                </View>
            </View>
            {/* Stats */}
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <View style={styles.statIconWrap}>
                        <Clock color={COLORS.text} size={scaledSize(16)} variant="Bold" />
                    </View>
                    <Text style={styles.statLabel}>Duration</Text>
                    <Text style={styles.statValue}>{roundToNearestMinute(workout?.duration)} min</Text>
                </View>
                <View style={styles.statCard}>
                    <View style={styles.statIconWrap}>
                        <MaterialCommunityIcons name="weight-lifter" size={scaledSize(16)} color={COLORS.text} />
                    </View>
                    <Text style={styles.statLabel}>Volume</Text>
                    <Text style={styles.statValue}>
                        {Number(workout?.volume || 0).toLocaleString()} lb
                    </Text>
                </View>
                <View style={styles.statCard}>
                    <View style={styles.statIconWrap}>
                        <MaterialCommunityIcons name="arm-flex" size={scaledSize(16)} color={COLORS.text} />
                    </View>
                    <Text style={styles.statLabel}>Highlights</Text>
                    <Text style={styles.statValue}>{workout?.PBs ?? 0} PR</Text>
                </View>
            </View>
            {/* Table header */}
            <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Exercise</Text>
                <Text style={styles.tableHeaderText}>Best Set</Text>
            </View>
            <Divider />
            {/* Exercise list */}
            <FlatList
                data={workout?.exercises || []}
                renderItem={renderExercise}
                keyExtractor={(item, index) => `${item?.name || "ex"}-${index}`}
                ItemSeparatorComponent={Divider}
                contentContainerStyle={{ paddingBottom: scaleSize(scaledSize(6)) }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: scaleSize(scaledSize(22)),
        marginVertical: scaleSize(scaledSize(10)),
        marginHorizontal: scaleSize(scaledSize(16)),
        backgroundColor: COLORS.card,
        paddingVertical: scaleSize(scaledSize(14)),
        paddingHorizontal: scaleSize(scaledSize(16)),
        shadowColor: "#000",
        shadowOffset: { width: 0, height: scaleSize(scaledSize(8)) },
        shadowOpacity: 0.12,
        shadowRadius: scaleSize(scaledSize(18)),
        elevation: 10,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(2, 6, 23, 0.04)",
    },

    header: {
        marginBottom: scaleSize(scaledSize(10)),
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    headerDate: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(17),
        color: COLORS.blue,
    },
    headerSub: {
        marginTop: scaleSize(scaledSize(2)),
        fontFamily: "Outfit_400Regular",
        fontSize: scaleSize(12.5),
        color: COLORS.subtext,
    },
    headerBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(253,224,71,0.2)",
        borderRadius: scaleSize(scaledSize(999)),
        paddingVertical: scaleSize(scaledSize(6)),
        paddingHorizontal: scaleSize(scaledSize(10)),
        gap: scaleSize(scaledSize(6)),
    },
    headerBadgeText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(12.5),
        color: COLORS.text,
    },

    statsRow: {
        flexDirection: "row",
        gap: scaleSize(scaledSize(10)),
        marginBottom: scaleSize(scaledSize(10)),
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.statBg,
        borderRadius: scaleSize(scaledSize(14)),
        paddingVertical: scaleSize(scaledSize(10)),
        paddingHorizontal: scaleSize(scaledSize(12)),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.statBorder,
    },
    statIconWrap: {
        width: scaleSize(scaledSize(26)),
        height: scaleSize(scaledSize(26)),
        borderRadius: scaleSize(scaledSize(13)),
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.iconHalo,
        marginBottom: scaleSize(scaledSize(6)),
    },
    statLabel: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(11.5),
        color: COLORS.subtext,
    },
    statValue: {
        marginTop: scaleSize(scaledSize(2)),
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(15),
        color: COLORS.text,
    },

    tableHeader: {
        paddingTop: scaleSize(scaledSize(4)),
        paddingBottom: scaleSize(scaledSize(8)),
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
    },
    tableHeaderText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(12.5),
        color: COLORS.subtext,
    },

    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: COLORS.hairline,
    },

    row: {
        minHeight: scaleSize(scaledSize(46)),
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: scaleSize(scaledSize(6)),
    },
    rowLeft: {
        flex: 1,
        paddingRight: scaleSize(scaledSize(10)),
    },
    exerciseName: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(13.5),
        color: "#111827",
        marginBottom: scaleSize(scaledSize(4)),
    },
    muscleChip: {
        alignSelf: "flex-start",
        borderRadius: scaleSize(scaledSize(999)),
        paddingHorizontal: scaleSize(scaledSize(8)),
        paddingVertical: scaleSize(scaledSize(2)),
    },
    muscleChipText: {
        fontFamily: "Poppins_700Bold",
        fontSize: scaleSize(10.5),
        color: COLORS.chipText,
    },

    rowRight: {
        width: "32%",
        alignItems: "flex-end",
    },
    bestPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: scaleSize(scaledSize(6)),
        borderRadius: scaleSize(scaledSize(999)),
        paddingVertical: scaleSize(scaledSize(6)),
        paddingHorizontal: scaleSize(scaledSize(10)),
        backgroundColor: COLORS.pillBg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.pillBorder,
    },
    bestPillText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(12.5),
        color: COLORS.text,
    },
    naText: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12.5),
        color: COLORS.subtext,
    },
});

export default React.memo(PastWorkoutCard);
