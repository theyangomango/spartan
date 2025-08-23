import React, { useCallback, useEffect, useRef, useState } from "react";
import { Text, StyleSheet, View, Pressable, Dimensions } from "react-native";
import Footer from "../components/Footer";
import StartWorkoutButton from "../components/3_Workout/StartWorkoutButton";
import JoinWorkoutButton from "../components/3_Workout/JoinWorkoutButton";
import makeID from "../../backend/helper/makeID";
import NewWorkoutBottomSheet from "../components/3_Workout/NewWorkout/NewWorkoutBottomSheet";
import CurrentWorkoutPanel from "../components/3_Workout/CurrentWorkoutPanel";
import millisToMinutesAndSeconds from "../helper/millisToHoursMinutesSeconds";
import EditTemplateBottomSheet from "../components/3_Workout/Template/EditTemplateBottomSheet";
import updateDoc from '../../backend/helper/firebase/updateDoc';
import { Entypo } from '@expo/vector-icons';
import arrayAppend from '../../backend/helper/firebase/arrayAppend'
import TemplateList from "../components/3_Workout/Template/TemplateList";
import WorkoutSummaryModal from "../components/3_Workout/WorkoutSummaryModal";
import GroupModalBottomSheet from '../components/3_Workout/NewWorkout/Group/GroupModalBottomSheet'
import calculate1RM from "../helper/calculate1RM";
import formatDate from "../helper/formatDate";
import incrementDocValue from "../../backend/helper/firebase/incrementDocValue";
import { db } from "../../firebase.config";

// 🔥 Firestore (native) imports for new features
import {
    collection, addDoc, doc, setDoc,
    onSnapshot, query, where, updateDoc as fsUpdateDoc,
    serverTimestamp, arrayUnion, getDoc
} from "firebase/firestore";

import readDoc from "../../backend/helper/firebase/readDoc";
import InviteBanner from "../components/3_Workout/InviteBanner";
import ParticipantsDropdown from "../components/3_Workout/ParticipantsDropdown";

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844;
const scaledSize = (size) => Math.round(size * scale);

function Workout({ navigation }) {
    const [workout, setWorkout] = useState(global.userData.currentWorkout);
    const [templates, setTemplates] = useState(global.userData.templates);
    const [isCurrentWorkoutPanelVisible, setIsCurrentWorkoutPanelVisible] = useState(!!workout);
    const [isNewWorkoutBottomSheetVisible, setIsNewWorkoutBottomSheetVisible] = useState(false);
    const [groupModalExpandFlag, setGroupModalExpandFlag] = useState(false);
    const [isEditTemplateBottomSheetVisible, setIsEditTemplateBottomSheetVisible] = useState(false);
    const [completedWorkout, setCompletedWorkout] = useState(null);
    const [isSummaryModalVisible, setIsSummaryModalVisible] = useState(false);

    const [pendingInvites, setPendingInvites] = useState([]); // <-- invites for me

    const openedTemplateRef = useRef(null);
    const workoutTimeInterval = useRef(null);
    const timerRef = useRef(workout ? millisToMinutesAndSeconds(Date.now() - workout.created) : '00:00');

    const userWorkoutStats = useRef(global.userData.statsExercises);

    // Invite listener
    useEffect(() => {
        const uid = global.userData?.uid;
        if (!uid) return;
        const qInv = query(
            collection(db, "workoutInvites"),
            where("toUid", "==", uid),
            where("status", "==", "pending")
        );
        const unsub = onSnapshot(qInv, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setPendingInvites(list);
        });
        return unsub;
    }, []);

    // Timer
    useEffect(() => {
        if (workout) {
            workoutTimeInterval.current = setInterval(() => {
                const diff = Date.now() - workout.created;
                timerRef.current = millisToMinutesAndSeconds(diff);
            }, 1000);
        }
        return () => clearInterval(workoutTimeInterval.current);
    }, [workout]);

    // New Workout
    const startNewWorkout = useCallback(async () => {
        if (!workout) {
            global.isCurrentlyWorkingOut = true;
            const newWID = makeID();
            const newWorkout = {
                wid: newWID,
                creatorUID: global.userData.uid,
                created: Date.now(),
                users: [],
                exercises: [],
                tid: null,
                volume: 0,
                reps: 0,
                PBs: 0
            };

            // Ensure central workout doc exists
            await setDoc(doc(db, "workouts", newWID), {
                wid: newWID,
                creatorUid: global.userData.uid,
                createdAt: serverTimestamp(),
                active: true,
                members: [global.userData.uid],
                updatedAt: serverTimestamp(),
            }, { merge: true });

            setWorkout(newWorkout);
            setIsNewWorkoutBottomSheetVisible(true);
            setTimeout(() => {
                setIsCurrentWorkoutPanelVisible(true);
            }, 500);
        } else {
            setIsNewWorkoutBottomSheetVisible(true);
        }
    }, [workout]);

    const startWorkoutFromTemplate = useCallback(async (index) => {
        if (!workout) {
            global.isCurrentlyWorkingOut = true;
            const newWID = makeID();
            const selectedTemplate = { ...templates[index] };
            const newWorkout = {
                wid: newWID,
                creatorUID: global.userData.uid,
                created: Date.now(),
                users: [],
                exercises: [...selectedTemplate.exercises],
                tid: selectedTemplate.tid,
                volume: 0,
                reps: 0,
                PBs: 0
            };

            await setDoc(doc(db, "workouts", newWID), {
                wid: newWID,
                creatorUid: global.userData.uid,
                createdAt: serverTimestamp(),
                active: true,
                members: [global.userData.uid],
                updatedAt: serverTimestamp(),
            }, { merge: true });

            setWorkout(newWorkout);
            setIsNewWorkoutBottomSheetVisible(true);
            setTimeout(() => {
                setIsCurrentWorkoutPanelVisible(true);
            }, 500);
        } else {
            setIsNewWorkoutBottomSheetVisible(true);
        }
    }, [workout, templates]);

    const updateNewWorkout = useCallback((newWorkout) => {
        setWorkout(newWorkout);
    }, []);

    const cancelWorkout = useCallback(() => {
        global.isCurrentlyWorkingOut = false;
        setWorkout(null);
        setIsNewWorkoutBottomSheetVisible(false);
        clearInterval(workoutTimeInterval.current);
        setIsCurrentWorkoutPanelVisible(false);
        timerRef.current = '00:00';
    }, []);

    const finishWorkout = useCallback(() => {
        global.isCurrentlyWorkingOut = false;
        if (!workout) return;

        const workoutCopy = JSON.parse(JSON.stringify(workout));

        // Clean sets
        workoutCopy.exercises.forEach((exercise) => {
            exercise.sets = exercise.sets.filter((set) => set.weight > 0 && set.reps > 0);
        });
        workoutCopy.exercises = workoutCopy.exercises.filter((exercise) => exercise.sets && exercise.sets.length > 0);

        const duration = Date.now() - workoutCopy.created;
        const completedWorkoutData = { ...workoutCopy, duration };

        setCompletedWorkout(completedWorkoutData);
        arrayAppend("users", global.userData.uid, "completedWorkouts", completedWorkoutData);

        setWorkout(null);
        setIsNewWorkoutBottomSheetVisible(false);
        clearInterval(workoutTimeInterval.current);
        setIsCurrentWorkoutPanelVisible(false);
        timerRef.current = "00:00";
        setIsSummaryModalVisible(true);

    }, [workout]);

    async function postWorkout() {
        setIsSummaryModalVisible(false);
        await navigation.navigate('ProfileStack', { screen: 'Profile' });
        navigation.navigate('ProfileStack', { screen: 'SelectPhotos', params: { workout: completedWorkout } });
    }

    // Templates
    function initTemplate() {
        const tid = makeID();
        const newTemplate = {
            name: 'Untitled Template',
            exerciseCount: 0,
            exercises: [],
            lastDate: null,
            tid: tid
        };

        setTemplates([...templates, newTemplate]);
        openedTemplateRef.current = newTemplate;
        setIsEditTemplateBottomSheetVisible(true);
    }

    const openEditTemplateBottomSheet = useCallback((index) => {
        openedTemplateRef.current = templates[index];
        setIsEditTemplateBottomSheetVisible(true);
    }, [templates]);

    function updateTemplate() {
        setTemplates(prevTemplates => {
            const index = prevTemplates.findIndex(template => template.tid === openedTemplateRef.current.tid);
            if (index !== -1) {
                const updatedTemplates = [...prevTemplates];
                updatedTemplates[index] = { ...openedTemplateRef.current };
                return updatedTemplates;
            }
            return prevTemplates;
        });
    }

    function deleteTemplate() {
        setTemplates(prevTemplates => {
            const index = prevTemplates.findIndex(template => template.tid === openedTemplateRef.current.tid);
            if (index !== -1) {
                return prevTemplates.filter((_, i) => i != index);
            }
        });
        setIsEditTemplateBottomSheetVisible(false);
        openedTemplateRef.current = null;
    }

    useEffect(() => {
        updateDoc('users', global.userData.uid, {
            currentWorkout: workout
        });
    }, [workout]);

    useEffect(() => {
        if (completedWorkout) {
            let newExerciseStats = { ...global.userData.statsExercises };
            const today = formatDate(new Date());

            completedWorkout.exercises.forEach(ex => {
                const prev1RM = ([ex.name] in newExerciseStats && '1RM' in newExerciseStats[ex.name]) ? newExerciseStats[ex.name]['1RM'] : 0;
                const prevTotalVolume = ([ex.name] in newExerciseStats && 'volume' in newExerciseStats[ex.name]) ? newExerciseStats[ex.name]['volume'] : 0;

                newExerciseStats[ex.name] = newExerciseStats[ex.name] || { sets: [], progress1RM: [] };
                newExerciseStats[ex.name].sets = newExerciseStats[ex.name].sets || [];
                newExerciseStats[ex.name].progress1RM = newExerciseStats[ex.name].progress1RM || [];

                let maxSet1RM = prev1RM;
                let newTotalVolume = prevTotalVolume;

                ex.sets.forEach(set => {
                    newExerciseStats[ex.name].sets.push({
                        weight: Number(set.weight),
                        reps: Number(set.reps),
                        date: today,
                        wid: completedWorkout.wid
                    });

                    const set1RM = calculate1RM(Number(set.weight), Number(set.reps));
                    newTotalVolume += (Number(set.weight) * Number(set.reps));

                    if (set1RM > prev1RM) {
                        newExerciseStats[ex.name]['1RM'] = set1RM;
                        newExerciseStats[ex.name]['bestSet'] = {
                            weight: Number(set.weight),
                            reps: Number(set.reps)
                        }
                    }
                    if (set1RM > maxSet1RM) maxSet1RM = set1RM;
                });

                const progress1RMArray = newExerciseStats[ex.name].progress1RM;
                const lastEntry = progress1RMArray[progress1RMArray.length - 1];

                if (lastEntry && lastEntry.date === today) {
                    lastEntry['1RM'] = Math.max(lastEntry['1RM'], maxSet1RM);
                    lastEntry['volume'] = newTotalVolume;
                } else {
                    newExerciseStats[ex.name].progress1RM.push({
                        date: today,
                        '1RM': maxSet1RM,
                        'volume': newTotalVolume
                    });
                }
            });

            updateDoc('users', global.userData.uid, {
                statsExercises: newExerciseStats,
            });
            incrementDocValue('users', global.userData.uid, 'statsTotalWorkouts');
            incrementDocValue('users', global.userData.uid, 'statsTotalVolume', completedWorkout.volume);
            incrementDocValue('users', global.userData.uid, 'statsTotalHours', completedWorkout.duration / 3600000);

            if (completedWorkout.tid) {
                const index = global.userData.templates.findIndex(t => t.tid == completedWorkout.tid);
                if (index > -1) {
                    setTemplates(prevTemplates => {
                        const updatedTemplates = [...prevTemplates];
                        updatedTemplates[index] = {
                            ...updatedTemplates[index],
                            lastDate: today,
                        };
                        return updatedTemplates;
                    });
                }
            }
        }
    }, [completedWorkout]);

    useEffect(() => {
        updateDoc('users', global.userData.uid, { templates: templates });
    }, [templates]);

    // Open/close group sheet
    const showGroupModal = useCallback(() => {
        setGroupModalExpandFlag(prev => !prev);
    }, []);
    const closeGroupModal = useCallback(() => {
        setGroupModalExpandFlag(false);
    }, []);

    // 🔔 Invite selected users
    const handleInviteSelected = useCallback(async (selectedUsers) => {
        try {
            if (!workout?.wid) return;
            const wid = workout.wid;

            // Ensure workout doc exists & add self to members
            await setDoc(doc(db, "workouts", wid), {
                wid,
                creatorUid: global.userData.uid,
                active: true,
                members: arrayUnion(global.userData.uid),
                updatedAt: serverTimestamp(),
            }, { merge: true });

            // Create invites
            const batch = selectedUsers.map(u => addDoc(collection(db, "workoutInvites"), {
                wid,
                fromUid: global.userData.uid,
                fromHandle: global.userData.handle,
                toUid: u.uid,
                status: "pending",
                createdAt: serverTimestamp(),
            }));
            await Promise.all(batch);

            setGroupModalExpandFlag(false);
        } catch (e) {
            console.log("Invite error", e);
        }
    }, [workout?.wid]);

    // ✅ Accept / Decline
    const acceptInvite = useCallback(async (inv) => {
        try {
            await fsUpdateDoc(doc(db, "workouts", inv.wid), {
                members: arrayUnion(global.userData.uid),
                updatedAt: serverTimestamp(),
                active: true,
            });
            await fsUpdateDoc(doc(db, "workoutInvites", inv.id), {
                status: "accepted",
                actedAt: serverTimestamp(),
            });

            const wSnap = await getDoc(doc(db, "workouts", inv.wid));
            const seed = wSnap.exists() ? wSnap.data() : null;

            const joined = {
                wid: inv.wid,
                creatorUID: seed?.creatorUid || inv.fromUid,
                created: Date.now(),
                users: [],
                exercises: [],
                tid: null,
                volume: 0, reps: 0, PBs: 0,
            };
            setWorkout(joined);
            setIsNewWorkoutBottomSheetVisible(true);
            setIsCurrentWorkoutPanelVisible(true);
            updateDoc('users', global.userData.uid, { currentWorkout: joined });
        } catch (e) {
            console.log("Accept invite error", e);
        }
    }, []);

    const declineInvite = useCallback(async (inv) => {
        try {
            await fsUpdateDoc(doc(db, "workoutInvites", inv.id), {
                status: "declined",
                actedAt: serverTimestamp(),
            });
        } catch (e) {
            console.log("Decline invite error", e);
        }
    }, []);

    // 📡 Publish my live top-line to workouts/{wid}/live/{uid}
    useEffect(() => {
        if (!workout?.wid) return;
        const uid = global.userData?.uid;
        let t = null;

        const publish = async () => {
            try {
                await setDoc(
                    doc(db, "workouts", workout.wid, "live", uid),
                    {
                        uid,
                        handle: global.userData?.handle,
                        image: global.userData?.image,
                        volume: workout.volume || 0,
                        reps: workout.reps || 0,
                        PBs: workout.PBs || 0,
                        updatedAt: serverTimestamp(),
                    },
                    { merge: true }
                );
            } catch (e) {
                console.log("live publish error", e);
            }
        };

        t = setTimeout(publish, 400);
        return () => t && clearTimeout(t);
    }, [workout?.wid, workout?.volume, workout?.reps, workout?.PBs, workout?.exercises]);

    return (
        <View style={styles.mainContainer}>
            <View style={styles.body}>
                <View style={{ height: 55 }} />

                {/* Invite banners */}
                {pendingInvites.map((inv) => (
                    <InviteBanner
                        key={inv.id}
                        invite={inv}
                        onAccept={() => acceptInvite(inv)}
                        onDecline={() => declineInvite(inv)}
                    />
                ))}

                <Text style={styles.quickStartText}>Quick Start</Text>
                <StartWorkoutButton startWorkout={startNewWorkout} />

                {isCurrentWorkoutPanelVisible && (
                    <>
                        {/* Removed ParticipantsDropdown here since it now lives inside NewWorkoutModal header */}
                        <CurrentWorkoutPanel
                            workout={workout}
                            timerRef={timerRef}
                            openWorkout={startNewWorkout}
                        />
                    </>
                )}

                <View style={styles.templatesHeadingRow}>
                    <Text style={styles.templatesText}>Templates</Text>
                    <Pressable onPress={initTemplate}>
                        <Entypo name="plus" size={26} style={styles.addIcon} color={'#888'} />
                    </Pressable>
                </View>

                <TemplateList
                    templates={templates}
                    setTemplates={setTemplates}
                    openEditTemplateBottomSheet={openEditTemplateBottomSheet}
                    startWorkoutFromTemplate={startWorkoutFromTemplate}
                />
            </View>

            <Footer navigation={navigation} currentScreenName={'Workout'} />

            <NewWorkoutBottomSheet
                workout={workout}
                cancelNewWorkout={cancelWorkout}
                updateNewWorkout={updateNewWorkout}
                finishNewWorkout={finishWorkout}
                isVisible={isNewWorkoutBottomSheetVisible}
                setIsVisible={setIsNewWorkoutBottomSheetVisible}
                timerRef={timerRef}
                showGroupModal={showGroupModal}
                userWorkoutStats={userWorkoutStats.current}
            />

            <EditTemplateBottomSheet
                isVisible={isEditTemplateBottomSheetVisible}
                setIsVisible={setIsEditTemplateBottomSheetVisible}
                openedTemplateRef={openedTemplateRef}
                updateTemplate={updateTemplate}
                deleteTemplate={deleteTemplate}
            />

            <WorkoutSummaryModal
                isVisible={isSummaryModalVisible}
                workout={completedWorkout}
                onClose={() => setIsSummaryModalVisible(false)}
                postWorkout={postWorkout}
            />

            <GroupModalBottomSheet
                groupModalExpandFlag={groupModalExpandFlag}
                closeGroupModal={closeGroupModal}
                onInvite={handleInviteSelected}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#f5f6fa',
    },
    body: {
        flex: 1,
        paddingTop: scaledSize(15),
    },
    quickStartText: {
        fontSize: scaledSize(18),
        paddingBottom: scaledSize(8),
        paddingHorizontal: scaledSize(20),
        fontFamily: 'Nunito_800ExtraBold',
        letterSpacing: 0.2,
        paddingHorizontal: scaledSize(20)
    },
    templatesHeadingRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between'
    },
    templatesText: {
        marginTop: scaledSize(28),
        fontSize: scaledSize(18),
        marginBottom: 2,
        fontFamily: 'Nunito_800ExtraBold',
        letterSpacing: 0.2,
        paddingHorizontal: scaledSize(20)
    },
    addIcon: {
        paddingHorizontal: scaledSize(28)
    }
});

export default Workout;
