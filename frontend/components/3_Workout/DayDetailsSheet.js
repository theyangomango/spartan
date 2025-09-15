// components/3_Workout/DayDetailsSheet.jsx
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import theme from "../../theme/mfpDark";
import { Ionicons } from "@expo/vector-icons";
import NewWorkoutModal from "./NewWorkout/NewWorkoutModal";
import CopyTemplateToast from "./ui/CopyTemplateToast";
import updateDoc from "../../../backend/helper/firebase/updateDoc";
import makeID from "../../../backend/helper/makeID";
import { useNavigation } from "@react-navigation/native";
import WorkoutPanelCard from "./ui/WorkoutPanelCard";
import { FoodDetailInline } from "../../screens/FoodDetail";
import { parseMacrosFromDescription, parseExtraNutrientsFromDescription } from "../../utils/nutrition";

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
    // Copy Template toast
    const toastAnim = useRef(new Animated.Value(0)).current;
    const [toastText, setToastText] = useState("Template added");
    // Food viewer state
    const [selectedFood, setSelectedFood] = useState(null);

    // Expand helper that tolerates ref not being ready on first render
    const expandSafely = useCallback(() => {
        let tries = 0;
        const tryExpand = () => {
            const ref = bottomSheetRef.current;
            if (ref && typeof ref.expand === "function") {
                try { ref.expand(); } catch { }
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
            try { bottomSheetRef.current?.close(); } catch { }
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
        if (selectedWorkout || selectedFood) {
            setSelectedWorkout(null);
            setSelectedFood(null);
            try { listOpacity.setValue(1); viewerOpacity.setValue(0); } catch { }
        }
        setIsExpanded(false);
        onClose?.();
    }, [onClose, selectedWorkout, selectedFood, listOpacity, viewerOpacity]);

    const title = useMemo(() => fmt(date), [date]);
    const isToday = useMemo(() => dayKey(date) === dayKey(new Date()), [date]);

    // Flatten the meal buckets to a small display list (cap to avoid scroll requirement)
    const foodsList = useMemo(() => {
        const buckets = ["Breakfast", "Lunch", "Dinner", "Snack"];
        const out = [];
        for (const b of buckets) {
            const arr = Array.isArray(meals?.[b]) ? meals[b] : [];
            for (const it of arr) {
                out.push({
                    name: it?.name || "Food",
                    desc: it?.desc || "",
                    qty: typeof it?.quantity === "number" ? it.quantity : null,
                    bucket: b,
                    brand: it?.brand || '',
                    foodId: it?.foodId || it?.food_id || '',
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
        } catch { }
    }, [listOpacity, viewerOpacity]);

    const closeViewer = useCallback(() => {
        Animated.parallel([
            Animated.timing(viewerOpacity, { toValue: 0, duration: 140, useNativeDriver: true }),
            Animated.timing(listOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        ]).start(({ finished }) => { if (finished) { setSelectedWorkout(null); setSelectedFood(null); setViewerReady(false); } });
    }, [listOpacity, viewerOpacity]);

    const showToast = useCallback((msg) => {
        setToastText(msg || "Template added");
        try {
            Animated.sequence([
                Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
                Animated.delay(1500),
                Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]).start();
        } catch { }
    }, [toastAnim]);

    const handleCopyTemplate = useCallback((wk) => {
        try {
            const uid = String(global?.userData?.uid || "");
            if (!wk || !uid) return;
            const tid = makeID();
            const name = wk?.templateName || wk?.template?.name || "Copied Template";
            const exercises = (Array.isArray(wk?.exercises) ? wk.exercises : []).map((ex) => ({
                name: ex?.name || "",
                muscle: ex?.muscle || "",
                sets: (Array.isArray(ex?.sets) ? ex.sets : []).map((s) => ({
                    weight: Number(s?.weight) || 0,
                    reps: Number(s?.reps) || 0,
                })),
            }));
            const newTemplate = { id: tid, tid, name, exercises, lastDate: null };
            const prev = Array.isArray(global?.userData?.templates) ? global.userData.templates : [];
            updateDoc("users", uid, { templates: [...prev, newTemplate] }).catch(() => { });
            try { global.userData.templates = [...prev, newTemplate]; } catch { }
            showToast("Template copied ✓");
        } catch { }
    }, [showToast]);

    // Open food details overlay
    const openFood = useCallback((entry) => {
        if (!entry) return;
        const qty = typeof entry?.qty === 'number' ? entry.qty : (Number(entry?.qty) || 1);
        const macros = parseMacrosFromDescription(entry?.desc || '', qty);
        const extras = parseExtraNutrientsFromDescription(entry?.desc || '', qty);
        setSelectedFood({ ...entry, qty, macros, extras });
        setViewerReady(true);
        try {
            Animated.parallel([
                Animated.timing(listOpacity, { toValue: 0, duration: 140, useNativeDriver: true }),
                Animated.timing(viewerOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
            ]).start();
        } catch { }
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

                {/* Content (scrollable) */}
                <BottomSheetScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <Animated.View style={[styles.ctnr, { opacity: listOpacity }]}>
                        <View style={styles.dateHeaderRow}>
                            <Pressable onPress={() => onChangeDate && onChangeDate(shiftDate(date, -1))} hitSlop={8} style={styles.dateNavBtn}>
                                <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
                            </Pressable>
                            <Text style={styles.title}>{title || "Select a date"}</Text>
                            <Pressable onPress={() => onChangeDate && onChangeDate(shiftDate(date, 1))} hitSlop={8} style={styles.dateNavBtn}>
                                <Ionicons name="chevron-forward" size={24} color={theme.textPrimary} />
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
                                const title = w?.templateName || w?.template?.name || w?.name || "Workout";
                                const hasTemplate = (w && w.tid != null);
                                const subtitle = `${exCount} exercises • ${setCount} sets`;
                                return (
                                    <WorkoutPanelCard
                                        key={`${w?.wid || i}`}
                                        title={title}
                                        titleStyle={hasTemplate ? { color: theme.primary } : null}
                                        subtitle={subtitle}
                                        pbs={pbs}
                                        durationMs={durMs}
                                        volume={toNumber(w?.volume)}
                                        reps={toNumber(w?.reps)}
                                        onPress={() => openViewer(w)}
                                        showChevron
                                    />
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
                            <View style={styles.foodListCol}>
                                {foodsList.map((it, idx) => {
                                    const kcal = Math.round(parseMacrosFromDescription(it?.desc || '', it?.qty ?? 1).calories || 0);
                                    return (
                                        <Pressable key={`${it.name}-${idx}`} style={styles.foodRowCard} onPress={() => openFood(it)}>
                                            <View style={{ flex: 1, paddingRight: 12 }}>
                                                <Text style={styles.foodRowName} numberOfLines={1}>{it.name}</Text>
                                                <Text style={styles.foodRowBucketLine} numberOfLines={1}>{it.bucket}</Text>
                                            </View>
                                            <Text style={styles.foodRowCals}>{kcal}</Text>
                                        </Pressable>
                                    );
                                })}
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
                </BottomSheetScrollView>

                {/* Viewer overlay */}
                <Animated.View style={[StyleSheet.absoluteFill, { opacity: viewerOpacity }]} pointerEvents={(selectedWorkout || selectedFood) ? "auto" : "none"}>
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
                                cancelWorkout={() => { }}
                                updateWorkout={() => { }}
                                finishWorkout={() => { }}
                                showGroupModal={() => { }}
                                userWorkoutStats={global?.userData?.statsExercises || {}}
                                onPressBack={closeViewer}
                                onCheer={() => { }}
                                onCopyTemplate={handleCopyTemplate}
                                onPressPfp={() => {
                                    try { bottomSheetRef.current?.close(); } catch { }
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
                            {/* Copy Template toast centered near top of overlay */}
                            <View pointerEvents="none" style={styles.toastWrap}>
                                <CopyTemplateToast anim={toastAnim} text={toastText} />
                            </View>
                        </View>
                    )}
                    {/* Food details overlay */}
                    {!selectedFood || !viewerReady ? null : (
                        <FoodDetailInline
                            entry={{
                                name: selectedFood?.name,
                                brand: selectedFood?.brand,
                                desc: selectedFood?.desc,
                                quantity: selectedFood?.qty,
                                foodId: selectedFood?.foodId,
                            }}
                            onClose={closeViewer}
                            containerStyle={{ flex: 1, backgroundColor: 'transparent', paddingTop: 16 }}
                        />
                    )}
                </Animated.View>
            </BottomSheet>
        </View>
    );
};

const styles = StyleSheet.create({
    outerContainer: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, zIndex: 1 },
    hiddenHandle: { display: "none" },
    bottomSheetBackground: { borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: theme.bg },
    scrollContent: { paddingBottom: 18 },
    handle: {
        alignSelf: "center",
        width: 46,
        height: 5,
        borderRadius: 999,
        backgroundColor: theme.field,
        marginTop: 8,
        marginBottom: 6,
    },
    ctnr: { flex: 1, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 16, backgroundColor: theme.bg },
    // Match MacroTracking DateHeader typography
    title: { flex: 1, fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: theme.textPrimary, textAlign: "center" },
    dateHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    dateNavBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },

    sectionHdrRow: { marginTop: 6, marginBottom: 6, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
    sectionHdr: { fontFamily: "Outfit_700Bold", fontSize: 14.5, color: theme.textPrimary },
    sectionMeta: { fontFamily: "Outfit_600SemiBold", fontSize: 12.5, color: theme.textSecondary },
    metaOn: { color: theme.primary },
    metaOff: { color: theme.textSecondary },

    emptyCard: {
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: theme.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
    },
    emptyText: { fontFamily: "Outfit_500Medium", fontSize: 12.5, color: theme.textSecondary },

    // FriendsActivity-style workout panel
    faPanel: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: theme.surface,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.07,
        shadowRadius: 12,
        elevation: 7,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
        marginBottom: 8,
    },
    faHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 10 },
    faRightAccessories: { flexDirection: "row", alignItems: "center", gap: 10 },
    faTitle: { fontSize: 13, fontFamily: "Outfit_800ExtraBold", color: theme.textPrimary },
    faTitleBlue: { color: theme.primary },
    faSub: { marginTop: 2, fontSize: 12.5, fontFamily: "Outfit_600SemiBold", color: theme.textSecondary },
    faDivider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.hairline, marginVertical: 6 },
    faStatsRow: { flexDirection: "row", gap: 6 },
    faStatCard: {
        flex: 1,
        // backgroundColor: theme.field,
        paddingVertical: 6,
        // borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
    },
    faStatIconWrap: {
        width: 30,
        height: 30,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: '#ffffff2e',
        marginBottom: 6,
    },
    faStatLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: theme.textSecondary },
    faStatValue: { marginTop: 1, fontFamily: "Outfit_800ExtraBold", fontSize: 13, color: theme.textPrimary },
    faStatTextCol: { flex: 1, minWidth: 0 },
    faPrPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(250, 204, 21, 0.24)",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(250, 204, 21, 0.60)",
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderRadius: 999,
    },
    faPrText: { fontFamily: "Outfit_800ExtraBold", fontSize: 12, color: "#FACC15" },

    foodListCard: {
        borderRadius: 16,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: theme.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
        marginBottom: 8,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
    },
    foodRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
    foodName: { flex: 1, fontFamily: "Outfit_500Medium", fontSize: 12.5, color: theme.textPrimary },
    // bullet used in Food rows
    exDot: { marginRight: 6, color: theme.textSecondary, fontSize: 16, lineHeight: 16 },
    moreHint: { marginTop: 4, fontFamily: "Outfit_600SemiBold", fontSize: 12, color: theme.textSecondary },

    // New food card grid
    foodListCol: { marginBottom: 8 },
    foodRowCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: theme.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
        marginVertical: 4,
    },
    foodRowName: { flex: 1, fontFamily: 'Nunito_700Bold', fontSize: 12, color: theme.textPrimary },
    foodRowBucketLine: { fontFamily: 'Outfit_600SemiBold', fontSize: 12, color: theme.textSecondary, marginTop: 2 },
    foodRowCals: { marginLeft: 12, fontFamily: 'Outfit_800ExtraBold', fontSize: 14, color: theme.textPrimary },

    // Food details overlay
    // Obsolete inline detail styles kept for reference
    // foodDetailHeader, foodDetailCard, etc. no longer used

    actions: { flexDirection: "row", gap: 10, marginTop: 14 },
    btn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    primary: { backgroundColor: theme.primary },
    primaryText: { color: "#fff" },
    secondary: { backgroundColor: theme.field },
    secondaryText: { color: theme.textPrimary },
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
    // Position toast near the top of the overlay content
    toastWrap: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 14,
        alignItems: "center",
        zIndex: 40,
    },
});

export default memo(DayDetailsSheet);
