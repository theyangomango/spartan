import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
    StyleSheet,
    View,
    Modal,
    Text,
    Animated,
    Dimensions,
    Pressable,
    InteractionManager,
} from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { Weight } from "iconsax-react-native";
import ProgressBanner from "./Tracking/ProgressBanner";
import ExerciseLog from "./Tracking/ExerciseLog";
import SelectExerciseModal from "./SelectExercise/SelectExerciseModal";
import calculate1RM from "../../../helper/calculate1RM";
import millisToHoursMinutesSeconds from "../../../helper/millisToHoursMinutesSeconds";

// 🔴 Realtime
import { getFirestore, doc, onSnapshot } from "firebase/firestore";

// Group bits
import { useGroupViewing } from "./Group/useGroupViewing";
import GroupHeader from "./Group/GroupHeader";
import GroupMenu from "./Group/GroupMenu";

import RestTimerModal from "./RestTimerModal";

const { height: screenHeight } = Dimensions.get("window");
const scale = screenHeight / 844;
const scaledSize = (size) => Math.round(size * scale);

const toMs = (v) => {
    if (!v && v !== 0) return 0;
    if (typeof v === "number") return v;
    if (v?.toMillis) return v.toMillis();
    if (typeof v?.seconds === "number") return v.seconds * 1000;
    const n = new Date(v).getTime();
    return Number.isFinite(n) ? n : 0;
};

const NewWorkoutModal = ({
    workout,
    cancelWorkout,
    updateWorkout,
    finishWorkout,
    timerRef,           // ← self-timer (kept)
    showGroupModal,
    userWorkoutStats,
    onViewingChange,
    onPressBack,        // friend view back
    onCheer,            // friend view cheer
    forceViewingFriend = false,
    friendPfp = null,
}) => {
    const db = getFirestore();

    const [selectExerciseModalVisible, setSelectExerciseModalVisible] = useState(false);
    const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] = useState(false);
    const [finishConfirmModalVisible, setFinishConfirmModalVisible] = useState(false);
    const [isFinishing, setIsFinishing] = useState(false);
    const [countdown, setCountdown] = useState(0);

    const [restModalVisible, setRestModalVisible] = useState(false);
    const [restModalKey, setRestModalKey] = useState(0);
    const openRestModal = useCallback(() => {
        setRestModalKey((k) => k + 1);
        setRestModalVisible(true);
    }, []);
    const closeRestModal = useCallback(() => setRestModalVisible(false), []);

    const scrollY = useRef(new Animated.Value(0)).current;

    const [totalReps, setTotalReps] = useState(0);
    const [totalVolume, setTotalVolume] = useState(0);
    const [personalBests, setPersonalBests] = useState(0);

    // Local UI toggle state for snappy feedback (truth lives on set.isDone)
    const [isDoneState, setIsDoneState] = useState(
        () => (workout?.exercises || []).map((ex) => (ex.sets || []).map((s) => !!s?.isDone))
    );
    const [replaceIndex, setReplaceIndex] = useState(null);

    const {
        viewing,
        viewingSelf,
        participants,
        menuVisible,
        openMenu,
        closeMenu,
        overlayPfp,
        activeWorkout,
        activeStats,
        waitingFriend,
    } = useGroupViewing({
        wid: workout?.wid,
        meUid: global?.userData?.uid,
        userImage: global?.userData?.image,
        userHandle: global?.userData?.handle,
        userWorkoutStats,
    });

    // Force read-only if requested
    const effViewingSelf = forceViewingFriend ? false : viewingSelf;

    useEffect(() => {
        onViewingChange?.(effViewingSelf);
    }, [effViewingSelf, onViewingChange]);

    useEffect(() => {
        let t = null;
        if (countdown > 0) t = setInterval(() => setCountdown((s) => Math.max(0, s - 1)), 1000);
        return () => t && clearInterval(t);
    }, [countdown]);

    // Keep local toggle array in sync (when self)
    useEffect(() => {
        if (!effViewingSelf) return;
        const ex = workout?.exercises || [];
        setIsDoneState((prev) =>
            ex.map((e, i) => {
                const sets = e.sets || [];
                const row = prev[i] || [];
                return sets.map((s, si) =>
                    typeof row[si] === "boolean" ? row[si] : !!s?.isDone
                );
            })
        );
    }, [workout?.exercises, effViewingSelf]);

    /* ------------------------------------------------------------------
       🔴 DIRECT LIVE SUB USING creatorUID
       Subscribe to users/{creatorUID}.currentWorkout and only accept
       the one with wid we’re viewing.
    -------------------------------------------------------------------*/
    const targetCreatorUid = useMemo(() => {
        if (effViewingSelf) return null;
        return (
            workout?.creatorUID ??
            workout?.creatorUid ??
            activeWorkout?.creatorUID ??
            activeWorkout?.creatorUid ??
            (Array.isArray(participants)
                ? participants.find((p) => p?.uid && p?.uid !== global?.userData?.uid)?.uid
                : null) ??
            null
        );
    }, [
        effViewingSelf,
        workout?.creatorUID, workout?.creatorUid,
        activeWorkout?.creatorUID, activeWorkout?.creatorUid,
        participants,
    ]);

    const targetWid = useMemo(() => {
        if (effViewingSelf) return null;
        return workout?.wid ?? activeWorkout?.wid ?? null;
    }, [effViewingSelf, workout?.wid, activeWorkout?.wid]);

    const [friendLiveWorkout, setFriendLiveWorkout] = useState(null);

    useEffect(() => {
        if (effViewingSelf || !targetCreatorUid || !targetWid) return;
        const userRef = doc(db, "users", String(targetCreatorUid));
        const unsub = onSnapshot(userRef, (snap) => {
            const cw = snap.data()?.currentWorkout || null;
            if (cw?.wid === targetWid) setFriendLiveWorkout(cw);
        });
        return () => unsub();
    }, [db, effViewingSelf, targetCreatorUid, targetWid]);

    /** Active workout for rendering */
    const baseWorkout = useMemo(() => {
        if (effViewingSelf) return workout;
        return friendLiveWorkout || activeWorkout || workout || null;
    }, [effViewingSelf, workout, friendLiveWorkout, activeWorkout]);

    /** Booleans from data (local override when self) */
    const doneForRender = useMemo(() => {
        const src = baseWorkout?.exercises || [];
        const raw = src.map((ex) => (ex.sets || []).map((s) => !!s?.isDone));
        if (!effViewingSelf) return raw;
        return raw.map((row, i) =>
            row.map((v, j) =>
                Array.isArray(isDoneState[i]) && typeof isDoneState[i][j] === "boolean"
                    ? isDoneState[i][j]
                    : v
            )
        );
    }, [baseWorkout, effViewingSelf, isDoneState]);

    // ⏱️ Friend workout timer (top center) — live HH:MM:SS like your self timer
    const friendTimerRef = useRef("");
    useEffect(() => {
        if (effViewingSelf) return; // self uses parent timerRef
        const createdMs =
            toMs(baseWorkout?.created) || toMs(baseWorkout?.createdAt) || 0;
        if (!createdMs) {
            friendTimerRef.current = "";
            return;
        }
        const tick = () => {
            const diff = Math.max(0, Date.now() - createdMs);
            friendTimerRef.current = millisToHoursMinutesSeconds(Math.max(1000, diff));
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [effViewingSelf, baseWorkout?.created, baseWorkout?.createdAt]);

    const totals = useMemo(() => {
        const w = baseWorkout;
        if (!w?.exercises) return { reps: 0, volume: 0, PBs: 0 };
        let reps = 0, volume = 0, PBs = 0;
        (w.exercises || []).forEach((exercise) => {
            let hitPB = false;
            (exercise.sets || []).forEach((set) => {
                const done = !!set?.isDone;
                if (!done) return;
                const r = Number(set?.reps) || 0;
                const wt = Number(set?.weight) || 0;
                reps += r;
                volume += r * wt;
                const prevMax = activeStats?.[exercise?.name]?.["1RM"] || 0;
                const maxNow = calculate1RM(wt, r);
                if (!hitPB && maxNow > prevMax) { hitPB = true; PBs += 1; }
            });
        });
        return { reps, volume, PBs };
    }, [baseWorkout, activeStats]);

    useEffect(() => {
        setTotalReps(totals.reps);
        setTotalVolume(totals.volume);
        setPersonalBests(totals.PBs);
        if (
            effViewingSelf &&
            workout &&
            (workout.reps !== totals.reps ||
                workout.volume !== totals.volume ||
                workout.PBs !== totals.PBs)
        ) {
            updateWorkout({
                ...workout,
                reps: totals.reps,
                volume: totals.volume,
                PBs: totals.PBs,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totals.reps, totals.volume, totals.PBs, effViewingSelf]);

    const showSelectExerciseModal = useCallback(() => {
        if (!effViewingSelf) return;
        setSelectExerciseModalVisible(true);
    }, [effViewingSelf]);

    const closeSelectExerciseModal = useCallback(() => {
        setSelectExerciseModalVisible(false);
        setReplaceIndex(null);
    }, []);

    const normalizeSet = (s) => ({
        weight: Number(s?.weight) || 0,
        reps: Number(s?.reps) || 0,
        isDone: !!s?.isDone,
    });

    const appendExercises = useCallback(
        (exercises) => {
            if (!effViewingSelf || !workout) return;
            const next = {
                ...workout,
                exercises: [
                    ...(workout.exercises || []),
                    ...exercises.map((ex) => ({
                        name: ex.name,
                        muscle: ex.muscle,
                        sets: [normalizeSet({ weight: 0, reps: 0, isDone: false })],
                    })),
                ],
            };
            updateWorkout(next);
            setIsDoneState((prev) => prev.concat(exercises.map(() => [false])));
        },
        [workout, updateWorkout, effViewingSelf]
    );

    const updateSets = useCallback(
        (index, newSets) => {
            if (!effViewingSelf || !workout) return;
            const normalized = (newSets || []).map(normalizeSet);
            const updated = (workout.exercises || []).map((ex, i) =>
                i === index ? { ...ex, sets: normalized } : ex
            );
            updateWorkout({ ...workout, exercises: updated });
            setIsDoneState((prev) => {
                const next = prev.map((row) => row.slice());
                next[index] = normalized.map((s) => !!s.isDone);
                return next;
            });
        },
        [workout, updateWorkout, effViewingSelf]
    );

    const replaceExercise = useCallback(
        (index) => {
            if (!effViewingSelf) return;
            setReplaceIndex(index);
            setSelectExerciseModalVisible(true);
        },
        [effViewingSelf]
    );

    const handleAppendOrReplace = useCallback(
        (picked) => {
            if (!effViewingSelf || !workout) return;
            const choice = Array.isArray(picked) ? picked[0] : picked;
            const isReplacing = replaceIndex !== null && replaceIndex >= 0;

            if (isReplacing && choice) {
                const oldSets = workout.exercises?.[replaceIndex]?.sets ?? [normalizeSet({})];
                const newSets = oldSets.map(() => normalizeSet({ weight: 0, reps: 0, isDone: false }));
                const nextExercises = (workout.exercises || []).map((ex, i) =>
                    i === replaceIndex ? { name: choice.name, muscle: choice.muscle, sets: newSets } : ex
                );
                updateWorkout({ ...workout, exercises: nextExercises });
                setIsDoneState((prev) => {
                    const next = prev.map((row) => row.slice());
                    next[replaceIndex] = newSets.map((s) => !!s.isDone);
                    return next;
                });
                setReplaceIndex(null);
                setSelectExerciseModalVisible(false);
                return;
            }

            appendExercises(Array.isArray(picked) ? picked : [picked]);
            setSelectExerciseModalVisible(false);
        },
        [appendExercises, replaceIndex, effViewingSelf, workout, updateWorkout]
    );

    const deleteExercise = useCallback(
        (index) => {
            if (!effViewingSelf || !workout) return;
            const filtered = (workout.exercises || []).filter((_, i) => i !== index);
            updateWorkout({ ...workout, exercises: filtered });
            setIsDoneState((prev) => prev.filter((_, i) => i !== index));
        },
        [workout, updateWorkout, effViewingSelf]
    );

    const toggleIsDone = useCallback(
        (exerciseIndex, setIndex) => {
            if (!effViewingSelf || !workout) return;
            const curr = workout.exercises?.[exerciseIndex]?.sets?.[setIndex];
            if (!curr) return;
            if (!curr.isDone && (isNaN(curr.weight) || isNaN(curr.reps))) return;

            setIsDoneState((prev) => {
                const next = prev.map((row) => row.slice());
                const val = !!(next[exerciseIndex]?.[setIndex]);
                if (!next[exerciseIndex]) next[exerciseIndex] = [];
                next[exerciseIndex][setIndex] = !val;
                return next;
            });

            const updated = (workout.exercises || []).map((ex, i) => {
                if (i !== exerciseIndex) return ex;
                const sets = (ex.sets || []).map((s, si) =>
                    si === setIndex ? { ...s, isDone: !s?.isDone } : s
                );
                return { ...ex, sets };
            });

            updateWorkout({ ...workout, exercises: updated });
        },
        [isDoneState, workout, updateWorkout, effViewingSelf]
    );

    const confirmCancelWorkout = () => {
        if (!effViewingSelf) return;
        if (!workout || (workout.exercises || []).length === 0) {
            setDeleteConfirmModalVisible(false);
            cancelWorkout();
        } else {
            setDeleteConfirmModalVisible(true);
        }
    };
    const handleDeleteWorkout = useCallback(() => {
        setDeleteConfirmModalVisible(false);
        cancelWorkout();
    }, [cancelWorkout]);

    const openFinishConfirm = useCallback(() => {
        if (!effViewingSelf) return;
        setFinishConfirmModalVisible(true);
    }, [effViewingSelf]);

    const handleFinishWorkout = useCallback(() => {
        if (isFinishing) return;
        setIsFinishing(true);
        setFinishConfirmModalVisible(false);
        InteractionManager.runAfterInteractions(() => {
            requestAnimationFrame(() => {
                Promise.resolve(finishWorkout?.())
                    .catch(() => { })
                    .finally(() => setIsFinishing(false));
            });
        });
    }, [finishWorkout, isFinishing]);

    const borderOpacity = scrollY.interpolate({
        inputRange: [0, 98],
        outputRange: [0, 1],
        extrapolate: "clamp",
    });

    const overallOpacity = 1;

    const friendWaiting =
        !effViewingSelf && waitingFriend && !(baseWorkout?.exercises?.length);

    return (
        <View style={styles.main_ctnr}>
            {/* Header */}
            <View style={[styles.header, { opacity: overallOpacity }]}>
                <GroupHeader
                    viewingSelf={effViewingSelf}
                    overlayPfp={friendPfp || overlayPfp}
                    onOpenMenu={openMenu}
                    onLongPressInvite={showGroupModal}
                    onFinish={openFinishConfirm}
                    onCheer={onCheer}
                    countdown={countdown}
                    onAddTime={openRestModal}
                    // ⏱ Pass friend timer ref when viewing a friend
                    timerRef={effViewingSelf ? timerRef : friendTimerRef}
                    headerStyle={[styles.headerInner]}
                    onBack={onPressBack}
                    // disable group button while viewing friend (safety double-check inside header too)
                    disableGroup={!effViewingSelf}
                />
            </View>
            <Animated.View style={[styles.headerShadow, { opacity: borderOpacity }]} />

            {/* Body */}
            {friendWaiting ? (
                <View style={[styles.waitingWrap, { opacity: overallOpacity }]}>
                    <Text style={styles.waitingText}>Loading friend…</Text>
                </View>
            ) : (
                <Animated.ScrollView
                    showsVerticalScrollIndicator={false}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                        { useNativeDriver: false }
                    )}
                    scrollEventThrottle={16}
                    style={[styles.scrollview, { opacity: overallOpacity }]}
                >
                    <ProgressBanner
                        totalReps={totalReps}
                        totalVolume={totalVolume}
                        personalBests={personalBests}
                    />

                    {(baseWorkout?.exercises || []).map((ex, exerciseIndex) => (
                        <ExerciseLog
                            key={ex.name + exerciseIndex}
                            name={ex.name}
                            muscle={ex.muscle}
                            exerciseIndex={exerciseIndex}
                            sets={ex.sets}
                            updateSets={updateSets}
                            replaceExercise={replaceExercise}
                            deleteExercise={() => deleteExercise(exerciseIndex)}
                            calculateStats={() => { }}
                            isDoneState={(doneForRender && doneForRender[exerciseIndex]) || []}
                            toggleIsDone={toggleIsDone}
                            userWorkoutStats={activeStats}
                            readOnly={!effViewingSelf}   // <<< added
                        />
                    ))}


                    {/* Editing actions only when viewing self */}
                    {effViewingSelf && (
                        <>
                            <RNBounceable onPress={showSelectExerciseModal} style={styles.add_exercise_btn}>
                                <Text style={styles.add_exercise_text}>Add Exercises</Text>
                                <Weight size={scaledSize(22)} color="#5DBDFF" variant="Bold" />
                            </RNBounceable>

                            <RNBounceable onPress={confirmCancelWorkout} style={styles.cancel_btn}>
                                <Text style={styles.cancel_btn_text}>Cancel Workout</Text>
                            </RNBounceable>
                        </>
                    )}

                    <View style={{ height: scaledSize(150) }} />
                </Animated.ScrollView>
            )}

            {/* Add / Replace Exercises */}
            <Modal animationType="fade" transparent visible={selectExerciseModalVisible}>
                <SelectExerciseModal
                    closeModal={closeSelectExerciseModal}
                    appendExercises={handleAppendOrReplace}
                    userWorkoutStats={activeStats}
                />
            </Modal>

            {/* Rest Timer Modal */}
            <RestTimerModal
                key={restModalKey}
                visible={restModalVisible}
                onClose={closeRestModal}
                countdown={countdown}
                onStart={(secs) => setCountdown(secs)}
                onAdd={(secs) => setCountdown((s) => s + secs)}
                onReset={() => setCountdown(0)}
            />

            {/* Delete confirm */}
            <Modal
                animationType="fade"
                transparent
                visible={deleteConfirmModalVisible}
                onRequestClose={() => setDeleteConfirmModalVisible(false)}
                statusBarTranslucent
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalText}>Are you sure you want to delete this workout?</Text>
                        <RNBounceable onPress={handleDeleteWorkout} style={styles.deleteWorkoutBtn}>
                            <Text style={styles.deleteWorkoutText}>Delete Workout</Text>
                        </RNBounceable>
                        <RNBounceable onPress={() => setDeleteConfirmModalVisible(false)} style={styles.cancelDeleteBtn}>
                            <Text style={styles.cancelDeleteText}>Cancel</Text>
                        </RNBounceable>
                    </View>
                </View>
            </Modal>

            {/* Finish confirm (self only) */}
            <Modal
                animationType="fade"
                transparent
                visible={finishConfirmModalVisible}
                onRequestClose={() => setFinishConfirmModalVisible(false)}
                statusBarTranslucent
            >
                <Pressable style={styles.modalOverlay} onPress={() => setFinishConfirmModalVisible(false)}>
                    <Pressable style={styles.finishModalContainer} onPress={(e) => e.stopPropagation()}>
                        <Text style={styles.finishTitle}>Finish workout?</Text>

                        <RNBounceable
                            onPress={handleFinishWorkout}
                            style={[styles.finishBtn, isFinishing && { opacity: 0.6 }]}
                            disabled={isFinishing}
                        >
                            <Text style={styles.finishBtnText}>{isFinishing ? "Finishing…" : "Finish Workout"}</Text>
                        </RNBounceable>

                        <RNBounceable onPress={() => setFinishConfirmModalVisible(false)} style={styles.keepEditingBtn}>
                            <Text style={styles.keepEditingText}>Keep Working</Text>
                        </RNBounceable>
                    </Pressable>
                </Pressable>
            </Modal>

            <GroupMenu
                visible={menuVisible}
                onClose={closeMenu}
                participants={participants}
                viewing={viewing}
                onInvite={() => {
                    closeMenu();
                    showGroupModal();
                }}
                onSelectParticipant={() => { }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    main_ctnr: { flex: 1 },

    header: { backgroundColor: "#fff" },
    headerInner: {
        paddingBottom: scaledSize(6),
        paddingHorizontal: scaledSize(22),
        paddingTop: scaledSize(6),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#fff",
        zIndex: 5,
    },
    headerShadow: { height: scaledSize(2), backgroundColor: "#eaeaea" },

    scrollview: { paddingTop: scaledSize(5), backgroundColor: "#fff" },

    waitingWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
    waitingText: { marginTop: 6, fontFamily: "Nunito_700Bold", color: "#444" },

    add_exercise_btn: {
        marginHorizontal: scaledSize(20),
        marginTop: scaledSize(18),
        height: scaledSize(35),
        borderRadius: scaledSize(12),
        backgroundColor: "#E1F0FF",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
    },
    add_exercise_text: {
        fontSize: scaledSize(16),
        fontFamily: "Outfit_700Bold",
        color: "#0499FE",
        marginRight: scaledSize(4.5),
    },

    cancel_btn: {
        marginHorizontal: scaledSize(20),
        marginTop: scaledSize(18),
        height: scaledSize(35),
        borderRadius: scaledSize(12),
        backgroundColor: "#FFECEC",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
    },
    cancel_btn_text: {
        fontSize: scaledSize(16),
        fontFamily: "Outfit_700Bold",
        color: "#F27171",
        marginRight: scaledSize(4.5),
    },

    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
        paddingHorizontal: scaledSize(24),
    },
    modalContainer: {
        width: "100%",
        padding: scaledSize(20),
        backgroundColor: "#fff",
        borderRadius: scaledSize(15),
        alignItems: "center",
    },
    modalText: {
        fontSize: scaledSize(16),
        color: "#333",
        fontFamily: "Outfit_700Bold",
        marginBottom: scaledSize(20),
        textAlign: "center",
    },
    deleteWorkoutBtn: {
        width: "100%",
        paddingVertical: scaledSize(8),
        backgroundColor: "#FFECEC",
        borderRadius: scaledSize(8),
        alignItems: "center",
        marginBottom: scaledSize(10),
    },
    deleteWorkoutText: { color: "#F27171", fontSize: scaledSize(14), fontFamily: "Outfit_700Bold" },
    cancelDeleteBtn: {
        width: "100%",
        paddingVertical: scaledSize(8),
        backgroundColor: "#eee",
        borderRadius: scaledSize(8),
        alignItems: "center",
    },
    cancelDeleteText: { color: "#666", fontSize: scaledSize(14), fontFamily: "Outfit_700Bold" },

    finishModalContainer: {
        width: "100%",
        padding: scaledSize(20),
        backgroundColor: "#fff",
        borderRadius: scaledSize(16),
        alignItems: "center",
    },
    finishTitle: {
        fontSize: scaledSize(18),
        color: "#111827",
        fontFamily: "Outfit_700Bold",
        textAlign: "center",
        marginBottom: scaledSize(16),
    },
    finishBtn: {
        width: "100%",
        paddingVertical: scaledSize(10),
        backgroundColor: "#40D99B",
        borderRadius: scaledSize(10),
        alignItems: "center",
        marginBottom: scaledSize(10),
    },
    finishBtnText: { color: "#fff", fontSize: scaledSize(14.5), fontFamily: "Outfit_700Bold" },
    keepEditingBtn: {
        width: "100%",
        paddingVertical: scaledSize(10),
        backgroundColor: "#F1F5F9",
        borderRadius: scaledSize(10),
        alignItems: "center",
    },
    keepEditingText: {
        color: "#0F172A",
        fontSize: scaledSize(14),
        fontFamily: "Outfit_600SemiBold",
    },
});

export default NewWorkoutModal;
