// components/3_Workout/DayDetailsSheet.jsx
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { Clock } from "iconsax-react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";
import NewWorkoutModal from "./NewWorkout/NewWorkoutModal";
import { useNavigation } from "@react-navigation/native";

// Friend-view handle accents (match FriendsActivitySheet)
const HANDLE_FRIEND_ACCENT = "#E0A500";
const HANDLE_FRIEND_BACKGROUND = "#e0a4002c";
const fmt = (d) =>
    d
        ? d.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            // year: "numeric",
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

// shift a date by delta days, normalized to start of day
const shiftDate = (d, delta) => {
    let base = d ? new Date(d) : new Date();
    if (Number.isNaN(base.getTime())) base = new Date();
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() + (delta || 0));
    return base;
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
    onChangeDate,
}) => {
    const bottomSheetRef = useRef(null);
    const navigation = useNavigation();
    const [isExpanded, setIsExpanded] = useState(false);
    const snapPoints = useMemo(() => ["95%"], []);
    // Viewer overlay (for workout detail)
    const [selectedWorkout, setSelectedWorkout] = useState(null);
    const [viewerReady, setViewerReady] = useState(false);
    const listOpacity = useRef(new Animated.Value(1)).current;
    const viewerOpacity = useRef(new Animated.Value(0)).current;
    const timerRef = useRef("");

    // Expand helper that tolerates ref not being ready on first render
    const expandSafely = useCallback(() => {
        let tries = 0;
        const tryExpand = () => {
            const ref = bottomSheetRef.current;
            if (ref && typeof ref.expand === "function") {
                try { ref.expand(); } catch {}
                setIsExpanded(true);
            } else if (tries < 6) {
                tries += 1;
                requestAnimationFrame(tryExpand);
            }
        };
        tryExpand();
    }, []);

    // explicit visible
    useEffect(() => {
        if (typeof visible === "undefined") return;
        if (visible) {
            // Make sure it expands even on the first mount
            expandSafely();
        } else {
            try { bottomSheetRef.current?.close(); } catch {}
            setIsExpanded(false);
        }
    }, [visible, expandSafely]);

    // any openToggle flip expands
    useEffect(() => {
        if (typeof openToggle === "undefined") return;
        expandSafely();
    }, [openToggle, expandSafely]);

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
        // reset viewer if open
        if (selectedWorkout) {
            setSelectedWorkout(null);
            try { listOpacity.setValue(1); viewerOpacity.setValue(0); } catch {}
        }
        setIsExpanded(false);
        onClose?.();
    }, [onClose, selectedWorkout, listOpacity, viewerOpacity]);

    const title = useMemo(() => fmt(date), [date]);
    const isToday = useMemo(() => dayKey(date) === dayKey(new Date()), [date]);

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

    const openViewer = useCallback((w) => {
        if (!w) return;
        // Normalize minimal fields expected by NewWorkoutModal
        const fallback = {
            wid: w?.wid || w?.id,
            creatorUID: w?.creatorUID || w?.creatorUid || (global?.userData?.uid || ""),
            created: w?.created || w?.createdAt || Date.now(),
            exercises: Array.isArray(w?.exercises) ? w.exercises : [],
            duration: w?.duration,
            volume: w?.volume,
            reps: w?.reps,
            PBs: w?.PBs ?? w?.pbs ?? 0,
            templateName: w?.templateName || w?.template?.name,
        };
        const wk = { ...fallback, ...w };
        // Resolve friend uid + pfp (fallbacks similar to FriendsActivitySheet)
        const friendUid = String(wk.creatorUID || wk.creatorUid || "");
        const friendPfp =
            wk.pfp || wk.pfpUrl || wk.photoURL || wk.image || wk.avatar ||
            (friendUid && friendUid === String(global?.userData?.uid || "")
                ? (global?.userData?.pfp || global?.userData?.photoURL || global?.userData?.image || "")
                : null);
        wk.__friendUid = friendUid;
        wk.__friendPfp = friendPfp;
        setSelectedWorkout(wk);
        // Mount content immediately; animate the cross-fade concurrently
        setViewerReady(true);
        try {
            Animated.parallel([
                Animated.timing(listOpacity, { toValue: 0, duration: 140, useNativeDriver: true }),
                Animated.timing(viewerOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
            ]).start();
        } catch {}
    }, [listOpacity, viewerOpacity]);

    const closeViewer = useCallback(() => {
        Animated.parallel([
            Animated.timing(viewerOpacity, { toValue: 0, duration: 140, useNativeDriver: true }),
            Animated.timing(listOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        ]).start(({ finished }) => { if (finished) { setSelectedWorkout(null); setViewerReady(false); } });
    }, [listOpacity, viewerOpacity]);

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
                <Animated.View style={[styles.card, { opacity: listOpacity }] }>
                    <View style={styles.dateHeaderRow}>
                        <Pressable onPress={() => onChangeDate && onChangeDate(shiftDate(date, -1))} hitSlop={8} style={styles.dateNavBtn}>
                            <Ionicons name="chevron-back" size={24} color="#0F172A" />
                        </Pressable>
                        <Text style={styles.title}>{title || "Select a date"}</Text>
                        <Pressable onPress={() => onChangeDate && onChangeDate(shiftDate(date, 1))} hitSlop={8} style={styles.dateNavBtn}>
                            <Ionicons name="chevron-forward" size={24} color="#0F172A" />
                        </Pressable>
                    </View>

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
                            const durMs = w?.duration ?? Math.max(0, (Date.now() - Number(w?.created || 0)));
                            const pbs = Number(w?.PBs ?? 0);
                            const title = w?.templateName || w?.template?.name || "Workout";
                            const subtitle = `${exCount} exercises • ${setCount} sets`;
                            return (
                                <Pressable key={`${w?.wid || i}`} style={styles.faPanel} onPress={() => openViewer(w)}>
                                    <View style={styles.faHeaderRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.faTitle} numberOfLines={1}>{title}</Text>
                                            <Text style={styles.faSub}>{subtitle}</Text>
                                        </View>
                                        <View style={styles.faRightAccessories}>
                                            {pbs > 0 && (
                                                <View style={styles.faPrPill}>
                                                    <MaterialCommunityIcons name="trophy" size={11} color="#6B5B00" />
                                                    <Text style={styles.faPrText}>{pbs} PR{pbs === 1 ? "" : "s"}</Text>
                                                </View>
                                            )}
                                            <MaterialCommunityIcons name="chevron-right" size={20} color="rgba(15,23,42,0.45)" />
                                        </View>
                                    </View>

                                    <View style={styles.faDivider} />

                                    <View style={styles.faStatsRow}>
                                        <View style={styles.faStatCard}>
                                            <View style={styles.faStatIconWrap}>
                                                <Clock color="#0F172A" size={13} variant="Bold" />
                                            </View>
                                            <Text style={styles.faStatLabel}>Duration</Text>
                                            <Text style={styles.faStatValue}>{minutesLabel(durMs)}</Text>
                                        </View>

                                        <View style={styles.faStatCard}>
                                            <View style={styles.faStatIconWrap}>
                                                <MaterialCommunityIcons name="weight-lifter" size={13} color="#0F172A" />
                                            </View>
                                            <Text style={styles.faStatLabel}>Volume</Text>
                                            <Text style={styles.faStatValue}>{toNumber(w?.volume).toLocaleString()} lb</Text>
                                        </View>

                                        <View style={styles.faStatCard}>
                                            <View style={styles.faStatIconWrap}>
                                                <MaterialCommunityIcons name="counter" size={13} color="#0F172A" />
                                            </View>
                                            <Text style={styles.faStatLabel}>Reps</Text>
                                            <Text style={styles.faStatValue}>{toNumber(w?.reps)}</Text>
                                        </View>
                                    </View>
                                </Pressable>
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
                        {isToday && (
                            <Pressable style={[styles.btn, styles.primary]} onPress={handleStartWorkout}>
                                <Text style={[styles.btnText, styles.primaryText]}>Start Workout</Text>
                            </Pressable>
                        )}
                    </View>
                </Animated.View>

                {/* Viewer overlay */}
                <Animated.View style={[StyleSheet.absoluteFill, { opacity: viewerOpacity }]} pointerEvents={selectedWorkout ? "auto" : "none"}>
                    {/* Simulated friend-view handle bar (yellow) */}
                    {selectedWorkout && (
                        <View style={styles.viewerHandleWrap}>
                            <View style={styles.viewerHandleIndicator} />
                        </View>
                    )}
                    {!selectedWorkout || !viewerReady ? null : (
                        <View style={{ flex: 1 }}>
                            <NewWorkoutModal
                                timerRef={timerRef}
                                workout={selectedWorkout}
                                cancelWorkout={() => {}}
                                updateWorkout={() => {}}
                                finishWorkout={() => {}}
                                showGroupModal={() => {}}
                                userWorkoutStats={global?.userData?.statsExercises || {}}
                                onPressBack={closeViewer}
                                onCheer={() => {}}
                                onCopyTemplate={undefined}
                                onPressPfp={() => {
                                    try { bottomSheetRef.current?.close(); } catch {}
                                    const uid = String(selectedWorkout?.__friendUid || selectedWorkout?.creatorUID || '');
                                    if (!uid) return;
                                    const meUid = String(global?.userData?.uid || '');
                                    const rootNav = navigation?.getParent?.('ROOT');
                                    if (uid === meUid) {
                                        if (rootNav?.navigate) rootNav.navigate('Profile', { transition: 'slide-from-right' });
                                        else navigation.navigate('Profile', { transition: 'slide-from-right' });
                                    } else {
                                        if (rootNav?.navigate) rootNav.navigate('ViewProfile', { user: { uid } });
                                        else navigation.navigate('ViewProfile', { user: { uid } });
                                    }
                                }}
                                forceViewingFriend={String(selectedWorkout.__friendUid || selectedWorkout.creatorUID || "")}
                                friendPfp={selectedWorkout.__friendPfp || null}
                                streamLive={false}
                            />
                        </View>
                    )}
                </Animated.View>
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
    // Match MacroTracking DateHeader typography
    title: { flex: 1, fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: "#0F172A", textAlign: "center" },
    dateHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    dateNavBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },

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

    // FriendsActivity-style workout panel
    faPanel: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.07,
        shadowRadius: 12,
        elevation: 7,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(2, 6, 23, 0.03)",
        marginBottom: 8,
    },
    faHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 10 },
    faRightAccessories: { flexDirection: "row", alignItems: "center", gap: 10 },
    faTitle: { fontSize: 12.5, fontFamily: "Outfit_700Bold", color: "#0F172A" },
    faSub: { marginTop: 2, fontSize: 12, fontFamily: "Outfit_500Medium", color: "#64748B" },
    faDivider: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(2,6,23,0.06)", marginVertical: 6 },
    faStatsRow: { flexDirection: "row", gap: 8 },
    faStatCard: {
        flex: 1,
        backgroundColor: "#F7FAFF",
        borderRadius: 14,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(100,116,139,0.10)",
    },
    faStatIconWrap: {
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#EEF2F7",
        marginBottom: 4,
    },
    faStatLabel: { fontFamily: "Outfit_500Medium", fontSize: 10, color: "rgba(100,116,139,0.9)" },
    faStatValue: { marginTop: 1, fontFamily: "Outfit_700Bold", fontSize: 13, color: "#0F172A" },
    faPrPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(250, 204, 21, 0.18)",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(250, 204, 21, 0.45)",
        paddingVertical: 4.5,
        paddingHorizontal: 8,
        borderRadius: 999,
    },
    faPrText: { fontFamily: "Outfit_700Bold", fontSize: 11.5, color: "#6B5B00" },

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
    // bullet used in Food rows
    exDot: { marginRight: 6, color: "#94A3B8", fontSize: 16, lineHeight: 16 },
    moreHint: { marginTop: 4, fontFamily: "Outfit_600SemiBold", fontSize: 12, color: "#64748B" },

    actions: { flexDirection: "row", gap: 10, marginTop: 14 },
    btn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    primary: { backgroundColor: "#0F172A" },
    primaryText: { color: "#fff" },
    secondary: { backgroundColor: "#EEF2FF" },
    secondaryText: { color: "#0F172A" },
    btnText: { fontFamily: "Outfit_700Bold", fontSize: 14 },
    // Friend-view handle accents (top of viewer overlay)
    viewerHandleWrap: {
        paddingTop: 8,
        paddingBottom: 6,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: HANDLE_FRIEND_BACKGROUND,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        // align visually with hidden handle spacing
        marginTop: 0,
    },
    viewerHandleIndicator: {
        width: 40,
        height: 4,
        borderRadius: 999,
        backgroundColor: HANDLE_FRIEND_ACCENT,
    },
});

export default memo(DayDetailsSheet);
