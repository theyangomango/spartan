// components/3_Workout/DayDetailsSheet.jsx
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";

const fmt = (d) =>
    d
        ? d.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
        })
        : "";

// YYYY-MM-DD
const dayKey = (d) => {
    if (!d) return "";
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return "";
    x.setHours(0, 0, 0, 0);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

const mins = (ms) => Math.max(0, Math.round(Number(ms || 0) / 60000));
const minutesLabel = (ms) => `${mins(ms)} min`;
const toNumber = (n) => (Number(n || 0) || 0);

const DayDetailsSheet = ({
    /** OPTION A: explicit visibility */
    visible,

    /** OPTION B: toggle flag — any flip triggers expand */
    openToggle,

    /** Core context */
    date,

    /** Workout + food data are FED IN by the parent */
    workouts = [],             // ← array of workout objects (already filtered to the selected day)
    meals = { Breakfast: [], Lunch: [], Dinner: [] }, // ← from useFoodLogs
    totals = { calories: 0, protein: 0, carbs: 0, fat: 0 }, // ← from useFoodLogs

    /** Back-compat props (kept working) */
    calories = 0,              // optional — if totals.calories missing, we’ll show this
    workoutOn = false,         // optional — quick visual flag

    /** Actions */
    onClose,
    onStartWorkout,
    onOpenMacros,
}) => {
    const bottomSheetRef = useRef(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const snapPoints = useMemo(() => ["95%"], []);

    // explicit visible
    useEffect(() => {
        if (!bottomSheetRef.current || typeof visible === "undefined") return;
        if (visible) {
            bottomSheetRef.current.expand();
            setIsExpanded(true);
        } else {
            bottomSheetRef.current.close();
        }
    }, [visible]);

    // any openToggle flip expands
    useEffect(() => {
        if (!bottomSheetRef.current || typeof openToggle === "undefined") return;
        bottomSheetRef.current.expand();
        setIsExpanded(true);
    }, [openToggle]);

    const renderBackdrop = useCallback(
        (props) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.6}
            />
        ),
        []
    );

    const handleClose = useCallback(() => {
        setIsExpanded(false);
        onClose?.();
    }, [onClose]);

    const title = useMemo(() => fmt(date), [date]);

    // Flatten the meal buckets to a small display list (cap to avoid scroll requirement)
    const foodsList = useMemo(() => {
        const buckets = ["Breakfast", "Lunch", "Dinner"];
        const out = [];
        for (const b of buckets) {
            const arr = Array.isArray(meals?.[b]) ? meals[b] : [];
            for (const it of arr) {
                out.push({
                    name: it?.name || "Food",
                    desc: it?.desc || "",
                    qty: typeof it?.quantity === "number" ? it.quantity : null,
                    bucket: b,
                });
            }
        }
        return out.slice(0, 8); // cap for compact view
    }, [meals]);

    const calsToShow = Number(totals?.calories || calories || 0);

    const handleOpenMacros = useCallback(() => {
        bottomSheetRef.current?.close();
        onOpenMacros?.();
    }, [onOpenMacros]);

    const handleStartWorkout = useCallback(() => {
        bottomSheetRef.current?.close();
        onStartWorkout?.();
    }, [onStartWorkout]);

    return (
        <View style={styles.outerContainer} pointerEvents="box-none">
            <BottomSheet
                ref={bottomSheetRef}
                index={-1}
                snapPoints={snapPoints}
                enablePanDownToClose
                backdropComponent={renderBackdrop}
                handleStyle={styles.hiddenHandle}
                backgroundStyle={styles.bottomSheetBackground}
                onClose={handleClose}
            >
                {/* Custom grabber */}
                <View style={styles.handle} />

                {/* Content */}
                <View style={styles.card}>
                    <Text style={styles.title}>{title || "Select a date"}</Text>

                    {/* ------- Workouts ------- */}
                    <View style={styles.sectionHdrRow}>
                        <Text style={styles.sectionHdr}>Workouts</Text>
                        <Text style={[styles.sectionMeta, (workouts?.length || workoutOn) ? styles.metaOn : styles.metaOff]}>
                            {(workouts?.length || 0) > 0 || workoutOn ? "Logged" : "None"}
                        </Text>
                    </View>

                    {(!workouts || workouts.length === 0) ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyText}>No completed workouts for this day.</Text>
                        </View>
                    ) : (
                        workouts.slice(0, 3).map((w, i) => {
                            const exCount = Array.isArray(w?.exercises) ? w.exercises.length : 0;
                            const setCount = Array.isArray(w?.exercises)
                                ? w.exercises.reduce((acc, e) => acc + (e?.sets?.length || 0), 0)
                                : 0;
                            const dur = w?.duration ?? Math.max(0, (Date.now() - Number(w?.created || 0)));
                            return (
                                <View key={`${w?.wid || i}`} style={styles.workoutCard}>
                                    <View style={styles.rowBetween}>
                                        <Text style={styles.workoutTitle}>
                                            {exCount} exercises • {setCount} sets
                                        </Text>
                                        <Text style={styles.badge}>
                                            {(w?.PBs ?? 0)} PR{(w?.PBs ?? 0) === 1 ? "" : "s"}
                                        </Text>
                                    </View>

                                    <View style={styles.statsRow}>
                                        <View style={styles.statBlock}>
                                            <Text style={styles.statLabel}>Duration</Text>
                                            <Text style={styles.statValue}>{minutesLabel(dur)}</Text>
                                        </View>
                                        <View style={styles.statBlock}>
                                            <Text style={styles.statLabel}>Volume</Text>
                                            <Text style={styles.statValue}>
                                                {toNumber(w?.volume).toLocaleString()} lb
                                            </Text>
                                        </View>
                                        <View style={styles.statBlock}>
                                            <Text style={styles.statLabel}>Reps</Text>
                                            <Text style={styles.statValue}>{toNumber(w?.reps)}</Text>
                                        </View>
                                    </View>

                                    {/* Peek first two exercises */}
                                    {Array.isArray(w?.exercises) && w.exercises.length > 0 && (
                                        <View style={styles.exList}>
                                            {w.exercises.slice(0, 2).map((ex, j) => (
                                                <View key={`${ex?.name || "ex"}-${j}`} style={styles.exRow}>
                                                    <Text style={styles.exDot}>•</Text>
                                                    <Text style={styles.exName} numberOfLines={1}>
                                                        {`${ex?.sets?.length || 0} × ${ex?.name || "Exercise"}`}
                                                    </Text>
                                                </View>
                                            ))}
                                            {w.exercises.length > 2 && (
                                                <Text style={styles.moreHint}>+{w.exercises.length - 2} more…</Text>
                                            )}
                                        </View>
                                    )}
                                </View>
                            );
                        })
                    )}

                    {/* ------- Foods ------- */}
                    <View style={[styles.sectionHdrRow, { marginTop: 12 }]}>
                        <Text style={styles.sectionHdr}>Foods</Text>
                        <Text style={styles.sectionMeta}>{calsToShow.toLocaleString()} kcal</Text>
                    </View>

                    {foodsList.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyText}>No foods logged for this day.</Text>
                        </View>
                    ) : (
                        <View style={styles.foodListCard}>
                            {foodsList.map((it, idx) => {
                                const line = it.qty ? `${it.name} — ${it.qty} × (${it.bucket})` : `${it.name} (${it.bucket})`;
                                return (
                                    <View key={`${it.name}-${idx}`} style={styles.foodRow}>
                                        <Text style={styles.exDot}>•</Text>
                                        <Text style={styles.foodName} numberOfLines={1}>{line}</Text>
                                    </View>
                                );
                            })}
                            {foodsList.length >= 8 && <Text style={styles.moreHint}>+ more…</Text>}
                        </View>
                    )}

                    {/* Actions */}
                    <View style={styles.actions}>
                        <Pressable style={[styles.btn, styles.secondary]} onPress={handleOpenMacros}>
                            <Text style={[styles.btnText, styles.secondaryText]}>Open Macros</Text>
                        </Pressable>
                        <Pressable style={[styles.btn, styles.primary]} onPress={handleStartWorkout}>
                            <Text style={[styles.btnText, styles.primaryText]}>Start Workout</Text>
                        </Pressable>
                    </View>
                </View>
            </BottomSheet>
        </View>
    );
};

const styles = StyleSheet.create({
    outerContainer: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, zIndex: 1 },
    hiddenHandle: { display: "none" },
    bottomSheetBackground: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    handle: {
        alignSelf: "center",
        width: 46,
        height: 5,
        borderRadius: 999,
        backgroundColor: "#E2E8F0",
        marginTop: 8,
        marginBottom: 6,
    },
    card: { flex: 1, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 16 },
    title: { fontFamily: "Outfit_700Bold", fontSize: 18, color: "#0F172A", marginBottom: 10 },

    sectionHdrRow: { marginTop: 6, marginBottom: 6, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
    sectionHdr: { fontFamily: "Outfit_700Bold", fontSize: 14.5, color: "#0F172A" },
    sectionMeta: { fontFamily: "Outfit_600SemiBold", fontSize: 12.5, color: "#64748B" },
    metaOn: { color: "#2D9EFF" },
    metaOff: { color: "#94A3B8" },

    emptyCard: {
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: "#F8FAFC",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(2,6,23,0.08)",
    },
    emptyText: { fontFamily: "Outfit_500Medium", fontSize: 12.5, color: "#64748B" },

    workoutCard: {
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: "#FFFFFF",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(2,6,23,0.08)",
        marginBottom: 8,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    workoutTitle: { fontFamily: "Outfit_700Bold", fontSize: 13.5, color: "#0F172A" },
    badge: {
        fontFamily: "Outfit_700Bold",
        fontSize: 12,
        color: "#0F172A",
        backgroundColor: "rgba(253,224,71,0.2)",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    statsRow: { flexDirection: "row", marginTop: 10, marginBottom: 6, gap: 8 },
    statBlock: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 10,
        backgroundColor: "#F8FAFC",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(100,116,139,0.15)",
    },
    statLabel: { fontFamily: "Outfit_500Medium", fontSize: 11, color: "#64748B" },
    statValue: { fontFamily: "Outfit_700Bold", fontSize: 14, color: "#0F172A", marginTop: 2 },

    exList: { marginTop: 4 },
    exRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
    exDot: { marginRight: 6, color: "#94A3B8", fontSize: 16, lineHeight: 16 },
    exName: { flex: 1, fontFamily: "Outfit_500Medium", fontSize: 12.5, color: "#0F172A" },
    moreHint: { marginTop: 4, fontFamily: "Outfit_600SemiBold", fontSize: 12, color: "#64748B" },

    foodListCard: {
        borderRadius: 16,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: "#FFFFFF",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(2,6,23,0.08)",
        marginBottom: 8,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
    },
    foodRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
    foodName: { flex: 1, fontFamily: "Outfit_500Medium", fontSize: 12.5, color: "#0F172A" },

    actions: { flexDirection: "row", gap: 10, marginTop: 14 },
    btn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    primary: { backgroundColor: "#0F172A" },
    primaryText: { color: "#fff" },
    secondary: { backgroundColor: "#EEF2FF" },
    secondaryText: { color: "#0F172A" },
    btnText: { fontFamily: "Outfit_700Bold", fontSize: 14 },
});

export default memo(DayDetailsSheet);
