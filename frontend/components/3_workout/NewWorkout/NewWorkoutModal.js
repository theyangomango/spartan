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
import TimerDisplay from "./TimerDisplay";
import calculate1RM from "../../../helper/calculate1RM";

// Group bits
import { useGroupViewing } from "./Group/useGroupViewing";
import GroupHeader from "./Group/GroupHeader";
import GroupMenu from "./Group/GroupMenu";

const { height: screenHeight } = Dimensions.get("window");
const scale = screenHeight / 844; // iPhone 13 baseline
const scaledSize = (size) => Math.round(size * scale);

const NewWorkoutModal = ({
    workout,
    cancelWorkout,
    updateWorkout,
    finishWorkout,
    timerRef,
    showGroupModal,
    userWorkoutStats,
    onViewingChange,
}) => {
    // UI
    const [selectExerciseModalVisible, setSelectExerciseModalVisible] = useState(false);
    const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] = useState(false);
    const [finishConfirmModalVisible, setFinishConfirmModalVisible] = useState(false);
    const [isFinishing, setIsFinishing] = useState(false); // NEW: prevent double-tap & help UX
    const [countdown, setCountdown] = useState(0);
    const scrollY = useRef(new Animated.Value(0)).current;

    // banner totals
    const [totalReps, setTotalReps] = useState(0);
    const [totalVolume, setTotalVolume] = useState(0);
    const [personalBests, setPersonalBests] = useState(0);

    // done flags (self only)
    const [isDoneState, setIsDoneState] = useState(() =>
        (workout?.exercises || []).map((ex) => (ex.sets || []).map(() => false))
    );

    // Group hook
    const {
        viewing,
        viewingSelf,
        participants,
        menuVisible,
        openMenu,
        closeMenu,
        overlayPfp,
        activeWorkout,       // friend's workout (null when viewing self)
        activeStats,         // stats for whoever is being viewed
        friendDoneDerived,   // derived "done" for friend sets
        waitingFriend,       // true when waiting for friend's workout
    } = useGroupViewing({
        wid: workout?.wid,
        meUid: global?.userData?.uid,
        userImage: global?.userData?.image,
        userHandle: global?.userData?.handle,
        userWorkoutStats,
    });

    // Let parent know when we flip self/friend
    useEffect(() => {
        onViewingChange?.(viewingSelf);
    }, [viewingSelf, onViewingChange]);

    /** TIMERS */
    useEffect(() => {
        let t = null;
        if (countdown > 0) t = setInterval(() => setCountdown((s) => Math.max(0, s - 1)), 1000);
        return () => t && clearInterval(t);
    }, [countdown]);
    const handleAddTime = () => setCountdown((s) => s + 30);

    /** keep isDoneState in sync with self workout sets */
    useEffect(() => {
        if (!viewingSelf) return;
        const ex = workout?.exercises || [];
        setIsDoneState((prev) =>
            ex.map((e, i) => {
                const sets = e.sets || [];
                const row = prev[i] || [];
                if (row.length === sets.length) return row;
                return sets.map((_, si) => row[si] || false);
            })
        );
    }, [workout?.exercises, viewingSelf]);

    /** 🔑 Use SELF workout when viewingSelf, else FRIEND workout */
    const baseWorkout = viewingSelf ? workout : activeWorkout;

    /** Lists for render */
    const exercisesToRender = baseWorkout?.exercises || [];
    const doneForRender = viewingSelf ? isDoneState : (friendDoneDerived || []);

    /** Totals (compute from baseWorkout for both self & friend) */
    const totals = useMemo(() => {
        const w = baseWorkout;
        if (!w?.exercises) return { reps: 0, volume: 0, PBs: 0 };

        let reps = 0;
        let volume = 0;
        let PBs = 0;

        (w.exercises || []).forEach((exercise, exIdx) => {
            let hitPB = false;
            (exercise.sets || []).forEach((set, setIdx) => {
                const done = viewingSelf
                    ? (isDoneState[exIdx] && isDoneState[exIdx][setIdx]) || false
                    : (Number(set?.weight) > 0 && Number(set?.reps) > 0);

                if (!done) return;
                const r = Number(set?.reps) || 0;
                const wt = Number(set?.weight) || 0;

                reps += r;
                volume += r * wt;

                const prevMax = activeStats?.[exercise?.name]?.["1RM"] || 0;
                const maxNow = calculate1RM(wt, r);
                if (!hitPB && maxNow > prevMax) {
                    hitPB = true;
                    PBs += 1;
                }
            });
        });

        return { reps, volume, PBs };
    }, [baseWorkout, activeStats, isDoneState, viewingSelf]);

    // Mirror totals to banner + only update self workout if changed
    useEffect(() => {
        setTotalReps(totals.reps);
        setTotalVolume(totals.volume);
        setPersonalBests(totals.PBs);

        if (
            viewingSelf &&
            workout &&
            (workout.reps !== totals.reps ||
                workout.volume !== totals.volume ||
                workout.PBs !== totals.PBs)
        ) {
            updateWorkout({ ...workout, reps: totals.reps, volume: totals.volume, PBs: totals.PBs });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totals.reps, totals.volume, totals.PBs, viewingSelf]);

    /** editing actions (disabled when viewing friend) */
    const showSelectExerciseModal = useCallback(() => {
        if (!viewingSelf) return;
        setSelectExerciseModalVisible(true);
    }, [viewingSelf]);
    const closeSelectExerciseModal = useCallback(() => setSelectExerciseModalVisible(false), []);

    const appendExercises = useCallback(
        (exercises) => {
            if (!viewingSelf || !workout) return;
            const next = {
                ...workout,
                exercises: [
                    ...(workout.exercises || []),
                    ...exercises.map((ex) => ({
                        name: ex.name,
                        muscle: ex.muscle,
                        sets: [{ weight: 0, reps: 0 }],
                    })),
                ],
            };
            updateWorkout(next);
            setIsDoneState((prev) => prev.concat(exercises.map(() => [false])));
        },
        [workout, updateWorkout, viewingSelf]
    );

    const updateSets = useCallback(
        (index, newSets) => {
            if (!viewingSelf || !workout) return;
            const updated = (workout.exercises || []).map((ex, i) =>
                i === index ? { ...ex, sets: newSets } : ex
            );
            updateWorkout({ ...workout, exercises: updated });
        },
        [workout, updateWorkout, viewingSelf]
    );

    const replaceExercise = useCallback(() => { }, []);

    const deleteExercise = useCallback(
        (index) => {
            if (!viewingSelf || !workout) return;
            const filtered = (workout.exercises || []).filter((_, i) => i !== index);
            updateWorkout({ ...workout, exercises: filtered });
            setIsDoneState((prev) => prev.filter((_, i) => i !== index));
        },
        [workout, updateWorkout, viewingSelf]
    );

    const toggleIsDone = useCallback(
        (exerciseIndex, setIndex) => {
            if (!viewingSelf || !workout) return;
            const curr = workout.exercises?.[exerciseIndex]?.sets?.[setIndex];
            if (!curr) return;
            if (isDoneState[exerciseIndex][setIndex] === false) {
                if (isNaN(curr.weight) || isNaN(curr.reps)) return;
            }
            setIsDoneState((prev) => {
                const next = prev.map((row) => row.slice());
                next[exerciseIndex][setIndex] = !next[exerciseIndex][setIndex];
                return next;
            });
        },
        [isDoneState, workout, viewingSelf]
    );

    const confirmCancelWorkout = () => {
        if (!viewingSelf) return; // no cancel when viewing friend
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

    // Finish confirm triggers
    const openFinishConfirm = useCallback(() => {
        if (!viewingSelf) return;
        setFinishConfirmModalVisible(true);
    }, [viewingSelf]);

    const handleFinishWorkout = useCallback(() => {
        if (isFinishing) return;
        setIsFinishing(true);
        // Close modal first, then defer heavy work until interactions/animations are done.
        setFinishConfirmModalVisible(false);
        InteractionManager.runAfterInteractions(() => {
            requestAnimationFrame(() => {
                Promise.resolve(finishWorkout?.())
                    .catch(() => { }) // swallow to avoid unhandled promise rejection
                    .finally(() => setIsFinishing(false));
            });
        });
    }, [finishWorkout, isFinishing]);

    /** visuals */
    const borderOpacity = scrollY.interpolate({
        inputRange: [0, 98],
        outputRange: [0, 1],
        extrapolate: "clamp",
    });
    const overallOpacity = viewingSelf ? 1 : 0.74;

    return (
        <View style={styles.main_ctnr}>
            {/* Header */}
            <View style={[styles.header, { opacity: overallOpacity }]}>
                <GroupHeader
                    viewingSelf={viewingSelf}
                    overlayPfp={overlayPfp}
                    onOpenMenu={openMenu}
                    onLongPressInvite={showGroupModal}
                    onFinish={openFinishConfirm} // show confirm modal
                    countdown={countdown}
                    onAddTime={handleAddTime}
                    timerRef={timerRef}
                    headerStyle={[styles.headerInner]}
                />
            </View>
            <Animated.View style={[styles.headerShadow, { opacity: borderOpacity }]} />

            {/* Body */}
            {!viewingSelf && waitingFriend ? (
                <View style={[styles.waitingWrap, { opacity: overallOpacity }]}>
                    <Text style={styles.waitingText}>Loading friend…</Text>
                </View>
            ) : (
                <Animated.ScrollView
                    showsVerticalScrollIndicator={false}
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
                    scrollEventThrottle={16}
                    style={[styles.scrollview, { opacity: overallOpacity }]}
                >
                    <ProgressBanner totalReps={totalReps} totalVolume={totalVolume} personalBests={personalBests} />

                    {(exercisesToRender || []).map((ex, exerciseIndex) => (
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
                        />
                    ))}

                    <RNBounceable
                        onPress={showSelectExerciseModal}
                        style={[styles.add_exercise_btn, !viewingSelf && { opacity: 0.5 }]}
                        disabled={!viewingSelf}
                    >
                        <Text style={styles.add_exercise_text}>Add Exercises</Text>
                        <Weight size={scaledSize(22)} color="#5DBDFF" variant="Bold" />
                    </RNBounceable>

                    <RNBounceable
                        onPress={confirmCancelWorkout}
                        style={[styles.cancel_btn, !viewingSelf && { opacity: 0.5 }]}
                        disabled={!viewingSelf}
                    >
                        <Text style={styles.cancel_btn_text}>Cancel Workout</Text>
                    </RNBounceable>

                    <View style={{ height: scaledSize(150) }} />
                </Animated.ScrollView>
            )}

            {/* Add Exercises */}
            <Modal animationType="fade" transparent visible={selectExerciseModalVisible}>
                <SelectExerciseModal
                    closeModal={closeSelectExerciseModal}
                    appendExercises={appendExercises}
                    userWorkoutStats={activeStats}
                />
            </Modal>

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

            {/* Finish confirm (tap outside to cancel) */}
            <Modal
                animationType="fade"
                transparent
                visible={finishConfirmModalVisible}
                onRequestClose={() => setFinishConfirmModalVisible(false)}
                statusBarTranslucent
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setFinishConfirmModalVisible(false)}
                >
                    <Pressable
                        style={styles.finishModalContainer}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <Text style={styles.finishTitle}>Finish workout?</Text>

                        <RNBounceable
                            onPress={handleFinishWorkout}
                            style={[styles.finishBtn, isFinishing && { opacity: 0.6 }]}
                            disabled={isFinishing}
                        >
                            <Text style={styles.finishBtnText}>{isFinishing ? "Finishing…" : "Finish Workout"}</Text>
                        </RNBounceable>

                        <RNBounceable
                            onPress={() => setFinishConfirmModalVisible(false)}
                            style={styles.keepEditingBtn}
                        >
                            <Text style={styles.keepEditingText}>Keep Working</Text>
                        </RNBounceable>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Group Menu */}
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

    // generic modal overlay
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

    // Finish modal styles
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
    finishBtnText: {
        color: "#fff",
        fontSize: scaledSize(14.5),
        fontFamily: "Outfit_700Bold",
    },
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
