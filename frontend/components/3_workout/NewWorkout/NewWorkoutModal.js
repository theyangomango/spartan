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
import { usePfp } from "../../../helper/usePFPs";

// Realtime / Firestore
import {
    getFirestore,
    doc,
    onSnapshot,
    setDoc,
    serverTimestamp,
    arrayUnion,
    addDoc,
    collection,
} from "firebase/firestore";

// Group bits
import { useGroupViewing } from "./Group/useGroupViewing";
import GroupHeader from "./Group/GroupHeader";
import GroupMenu from "./Group/GroupMenu";

// Invite picker (bottom sheet)
import GroupModalBottomSheet from "./Group/GroupModalBottomSheet";
import RestTimerModal from "./RestTimerModal";

const { height: screenHeight } = Dimensions.get("window");
const scale = screenHeight / 844;
const scaledSize = (size) => Math.round(size * scale);

const NewWorkoutModal = ({
    workout,
    cancelWorkout,
    updateWorkout,
    finishWorkout,
    timerRef,
    userWorkoutStats,
    onViewingChange,
    onPressBack,    // for friend view
    onCheer,        // for friend view
    // kept for compatibility with callers, but auto-join now only depends on wid match
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
    const openRestModal = useCallback(() => { setRestModalKey((k) => k + 1); setRestModalVisible(true); }, []);
    const closeRestModal = useCallback(() => setRestModalVisible(false), []);

    // ---- Invite picker (BottomSheet) ----
    const [inviteSheetOpen, setInviteSheetOpen] = useState(false);
    const openInviteSheet = useCallback(() => setInviteSheetOpen(true), []);
    const closeInviteSheet = useCallback(() => setInviteSheetOpen(false), []);
    // -------------------------------------

    const scrollY = useRef(new Animated.Value(0)).current;

    const [totalReps, setTotalReps] = useState(0);
    const [totalVolume, setTotalVolume] = useState(0);
    const [personalBests, setPersonalBests] = useState(0);

    // Local UI toggle state but truth lives on set.isDone
    const [isDoneState, setIsDoneState] = useState(
        () => (workout?.exercises || []).map((ex) => (ex.sets || []).map((s) => !!s?.isDone))
    );
    const [replaceIndex, setReplaceIndex] = useState(null);

    // ===== Group / viewing state (single source of truth) =====
    const meUid = String(global?.userData?.uid || "");

    const myActiveWid = String(global?.userData?.currentWorkout?.wid || "");
    const cardWid = String(workout?.wid || "");

    // Only auto-join when the card refers to the same group as my currently active workout.
    const shouldAutoJoin = !!(myActiveWid && cardWid && myActiveWid === cardWid);

    // Decide who to look at first:
    // - If it's the same wid as mine → start by viewing myself (full control UI)
    // - Otherwise, start by viewing the friend (read-only) if available
    const friendUidFromWorkout = String(workout?.creatorUID || workout?.creatorUid || "");
    const initialViewingUid = shouldAutoJoin
        ? meUid
        : (friendUidFromWorkout && friendUidFromWorkout !== meUid ? friendUidFromWorkout : meUid);

    const {
        viewing,          // { uid, handle, image, pfpVersion, updatedAt }
        viewingSelf,      // boolean
        participants,     // array of participants ({uid,...})
        menuVisible,
        openMenu,
        closeMenu,
        overlayPfp,       // pfp from the currently viewed user's doc (live)
        activeWorkout,    // currentWorkout of the currently viewed user
        activeStats,      // stats of the currently viewed user
        friendDoneDerived,
        waitingFriend,
        setViewing,       // switch focus to another participant
    } = useGroupViewing({
        wid: cardWid,
        meUid,
        userImage: global?.userData?.image,
        userHandle: global?.userData?.handle,
        initViewingUid: initialViewingUid,
        autoJoin: shouldAutoJoin,
    });

    // keep caller informed (if they care)
    useEffect(() => { onViewingChange?.(!!viewingSelf); }, [viewingSelf, onViewingChange]);

    const canSwitchParticipants = useMemo(() => {
        const others = Array.isArray(participants)
            ? participants.some((p) => p?.uid && String(p.uid) !== meUid)
            : false;
        return others;
    }, [participants, meUid]);

    useEffect(() => {
        let t = null;
        if (countdown > 0) t = setInterval(() => setCountdown((s) => Math.max(0, s - 1)), 1000);
        return () => t && clearInterval(t);
    }, [countdown]);

    // Sync toggles from workout data when self
    useEffect(() => {
        if (!viewingSelf) return;
        const ex = workout?.exercises || [];
        setIsDoneState((prev) =>
            ex.map((e, i) => {
                const sets = e.sets || [];
                const row = prev[i] || [];
                return sets.map((s, si) => (typeof row[si] === "boolean" ? row[si] : !!s?.isDone));
            })
        );
    }, [workout?.exercises, viewingSelf]);

    const baseWorkout = viewingSelf ? workout : (activeWorkout || workout);

    const doneForRender = useMemo(() => {
        const src = baseWorkout?.exercises || [];
        return src.map((ex) => (ex.sets || []).map((s) => !!s?.isDone));
    }, [baseWorkout]);

    const totals = useMemo(() => {
        const w = baseWorkout;
        if (!w?.exercises) return { reps: 0, volume: 0, PBs: 0 };
        let reps = 0, volume = 0, PBs = 0;

        (w.exercises || []).forEach((exercise) => {
            let hitPB = false;
            (exercise.sets || []).forEach((set) => {
                if (!set?.isDone) return;
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
        if (viewingSelf && workout && (
            workout.reps !== totals.reps ||
            workout.volume !== totals.volume ||
            workout.PBs !== totals.PBs
        )) {
            updateWorkout({ ...workout, reps: totals.reps, volume: totals.volume, PBs: totals.PBs });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totals.reps, totals.volume, totals.PBs, viewingSelf]);

    const showSelectExerciseModal = useCallback(() => { if (viewingSelf) setSelectExerciseModalVisible(true); }, [viewingSelf]);
    const closeSelectExerciseModal = useCallback(() => { setSelectExerciseModalVisible(false); setReplaceIndex(null); }, []);

    const normalizeSet = (s) => ({ weight: Number(s?.weight) || 0, reps: Number(s?.reps) || 0, isDone: !!s?.isDone });

    const appendExercises = useCallback((exercises) => {
        if (!viewingSelf || !workout) return;
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
    }, [workout, updateWorkout, viewingSelf]);

    const updateSets = useCallback((index, newSets) => {
        if (!viewingSelf || !workout) return;
        const normalized = (newSets || []).map(normalizeSet);
        const updated = (workout.exercises || []).map((ex, i) => (i === index ? { ...ex, sets: normalized } : ex));
        updateWorkout({ ...workout, exercises: updated });
        setIsDoneState((prev) => { const next = prev.map((row) => row.slice()); next[index] = normalized.map((s) => !!s.isDone); return next; });
    }, [workout, updateWorkout, viewingSelf]);

    const replaceExercise = useCallback((index) => { if (viewingSelf) { setReplaceIndex(index); setSelectExerciseModalVisible(true); } }, [viewingSelf]);

    const handleAppendOrReplace = useCallback((picked) => {
        if (!viewingSelf || !workout) return;
        const choice = Array.isArray(picked) ? picked[0] : picked;
        const isReplacing = replaceIndex !== null && replaceIndex >= 0;

        if (isReplacing && choice) {
            const oldSets = workout.exercises?.[replaceIndex]?.sets ?? [normalizeSet({})];
            const newSets = oldSets.map(() => normalizeSet({ weight: 0, reps: 0, isDone: false }));
            const nextExercises = (workout.exercises || []).map((ex, i) =>
                i === replaceIndex ? { name: choice.name, muscle: choice.muscle, sets: newSets } : ex
            );
            updateWorkout({ ...workout, exercises: nextExercises });
            setIsDoneState((prev) => { const next = prev.map((row) => row.slice()); next[replaceIndex] = newSets.map((s) => !!s.isDone); return next; });
            setReplaceIndex(null);
            setSelectExerciseModalVisible(false);
            return;
        }

        appendExercises(Array.isArray(picked) ? picked : [picked]);
        setSelectExerciseModalVisible(false);
    }, [appendExercises, replaceIndex, viewingSelf, workout, updateWorkout]);

    const deleteExercise = useCallback((index) => {
        if (!viewingSelf || !workout) return;
        const filtered = (workout.exercises || []).filter((_, i) => i !== index);
        updateWorkout({ ...workout, exercises: filtered });
        setIsDoneState((prev) => prev.filter((_, i) => i !== index));
    }, [workout, updateWorkout, viewingSelf]);

    const toggleIsDone = useCallback((exerciseIndex, setIndex) => {
        if (!viewingSelf || !workout) return;
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
            const sets = (ex.sets || []).map((s, si) => (si === setIndex ? { ...s, isDone: !s?.isDone } : s));
            return { ...ex, sets };
        });
        updateWorkout({ ...workout, exercises: updated });
    }, [isDoneState, workout, updateWorkout, viewingSelf]);

    const confirmCancelWorkout = () => {
        if (!viewingSelf) return;
        if (!workout || (workout.exercises || []).length === 0) {
            setDeleteConfirmModalVisible(false);
            cancelWorkout();
        } else {
            setDeleteConfirmModalVisible(true);
        }
    };
    const handleDeleteWorkout = useCallback(() => { setDeleteConfirmModalVisible(false); cancelWorkout(); }, [cancelWorkout]);

    const openFinishConfirm = useCallback(() => { if (viewingSelf) setFinishConfirmModalVisible(true); }, [viewingSelf]);

    const handleFinishWorkout = useCallback(() => {
        if (isFinishing) return;
        setIsFinishing(true);
        setFinishConfirmModalVisible(false);
        InteractionManager.runAfterInteractions(() => {
            requestAnimationFrame(() => {
                Promise.resolve(finishWorkout?.()).catch(() => { }).finally(() => setIsFinishing(false));
            });
        });
    }, [finishWorkout, isFinishing]);

    const borderOpacity = scrollY.interpolate({ inputRange: [0, 98], outputRange: [0, 1], extrapolate: "clamp" });
    const overallOpacity = 1;

    const friendWaiting = !viewingSelf && waitingFriend && !(baseWorkout?.exercises?.length);

    // ===== Robust PFPs =====
    const selfPfpVersion = global?.userData?.pfpVersion ?? 0;
    const selfPfpUri = usePfp(meUid, selfPfpVersion) ||
        global?.userData?.pfp ||
        global?.userData?.photoURL ||
        global?.userData?.image ||
        "";

    // Use hook for whoever is currently "viewing"
    const viewingPfpUriHook = usePfp(String(viewing?.uid || ""), viewing?.pfpVersion || 0);
    const headerOverlayPfp = viewingSelf
        ? selfPfpUri
        : (viewingPfpUriHook || viewing?.image || friendPfp || "");

    // Being “in an active group” = there is at least one participant other than me
    const inActiveGroup = useMemo(
        () => Array.isArray(participants) && participants.some((p) => String(p?.uid) !== meUid),
        [participants, meUid]
    );

    // ===== Send invites from the picker =====
    const handleInviteSelected = useCallback(async (selectedUsers = []) => {
        try {
            if (!workout?.wid || !global?.userData?.uid) return;
            const wid = workout.wid;
            const myUid = global.userData.uid;

            // Ensure workout document exists and add myself to members
            await setDoc(
                doc(db, "workouts", wid),
                {
                    wid,
                    creatorUid: workout?.creatorUID || myUid,
                    active: true,
                    members: arrayUnion(myUid),
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );

            // Create invite docs
            const batch = selectedUsers.map((u) =>
                addDoc(collection(db, "workoutInvites"), {
                    wid,
                    fromUid: myUid,
                    fromHandle: global?.userData?.handle || "",
                    toUid: String(u?.uid),
                    status: "pending",
                    createdAt: serverTimestamp(),
                })
            );
            await Promise.all(batch);

        } catch (e) {
            console.log("handleInviteSelected error", e);
        } finally {
            closeInviteSheet();
        }
    }, [db, workout?.wid, workout?.creatorUID, closeInviteSheet]);

    return (
        <View style={styles.main_ctnr}>
            {/* Header */}
            <View style={[styles.header, { opacity: overallOpacity }]}>
                <GroupHeader
                    viewingSelf={viewingSelf}
                    overlayPfp={headerOverlayPfp}
                    onOpenMenu={openMenu}
                    onLongPressInvite={viewingSelf ? openInviteSheet : undefined}
                    onFinish={openFinishConfirm}
                    onCheer={onCheer}
                    countdown={countdown}
                    onAddTime={openRestModal}
                    timerRef={timerRef}
                    headerStyle={[styles.headerInner]}
                    onBack={onPressBack}
                    disableGroupPress={!(viewingSelf || inActiveGroup)}
                    inActiveGroup={inActiveGroup}
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
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
                    scrollEventThrottle={16}
                    style={[styles.scrollview, { opacity: overallOpacity }]}
                >
                    <ProgressBanner totalReps={totalReps} totalVolume={totalVolume} personalBests={personalBests} />

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
                            readOnlyInputs={!viewingSelf}
                            hideAddSet={!viewingSelf}
                            disableRowActions={!viewingSelf}
                        />
                    ))}

                    {/* Editing actions only when viewing self */}
                    {viewingSelf && (
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

            {/* Group menu (view switch + invite) */}
            <GroupMenu
                visible={menuVisible}
                onClose={closeMenu}
                participants={participants}
                viewing={viewing || { uid: viewingSelf ? meUid : (friendUidFromWorkout || "") }}
                onInvite={() => { closeMenu(); openInviteSheet(); }}
                onSelectParticipant={(p) => {
                    const nextUid = String(p?.uid || meUid);
                    setViewing(nextUid);        // << single source of truth
                    onViewingChange?.(nextUid === meUid);
                    closeMenu();
                }}
            />

            {/* Invite people picker (bottom sheet; no backdrop) */}
            <GroupModalBottomSheet
                groupModalExpandFlag={inviteSheetOpen}
                closeGroupModal={closeInviteSheet}
                onInvite={handleInviteSelected}
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
    cancel_btn_text: { fontSize: scaledSize(16), fontFamily: "Outfit_700Bold", color: "#F27171", marginRight: scaledSize(4.5) },

    modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: scaledSize(24) },
    modalContainer: { width: "100%", padding: scaledSize(20), backgroundColor: "#fff", borderRadius: scaledSize(15), alignItems: "center" },
    modalText: { fontSize: scaledSize(16), color: "#333", fontFamily: "Outfit_700Bold", marginBottom: scaledSize(20), textAlign: "center" },
    deleteWorkoutBtn: { width: "100%", paddingVertical: scaledSize(8), backgroundColor: "#FFECEC", borderRadius: scaledSize(8), alignItems: "center", marginBottom: scaledSize(10) },
    deleteWorkoutText: { color: "#F27171", fontSize: scaledSize(14), fontFamily: "Outfit_700Bold" },
    cancelDeleteBtn: { width: "100%", paddingVertical: scaledSize(8), backgroundColor: "#eee", borderRadius: scaledSize(8), alignItems: "center" },
    cancelDeleteText: { color: "#666", fontSize: scaledSize(14), fontFamily: "Outfit_700Bold" },

    finishModalContainer: { width: "100%", padding: scaledSize(20), backgroundColor: "#fff", borderRadius: scaledSize(16), alignItems: "center" },
    finishTitle: { fontSize: scaledSize(18), color: "#111827", fontFamily: "Outfit_700Bold", textAlign: "center", marginBottom: scaledSize(16) },
    finishBtn: { width: "100%", paddingVertical: scaledSize(10), backgroundColor: "#40D99B", borderRadius: scaledSize(10), alignItems: "center", marginBottom: scaledSize(10) },
    finishBtnText: { color: "#fff", fontSize: scaledSize(14.5), fontFamily: "Outfit_700Bold" },
    keepEditingBtn: { width: "100%", paddingVertical: scaledSize(10), backgroundColor: "#F1F5F9", borderRadius: scaledSize(10), alignItems: "center" },
    keepEditingText: { color: "#0F172A", fontSize: scaledSize(14), fontFamily: "Outfit_600SemiBold" },
});

export default NewWorkoutModal;
