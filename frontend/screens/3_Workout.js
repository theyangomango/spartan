import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
    SafeAreaView,
    View,
    StyleSheet,
    Animated,
    Alert,
    InteractionManager,
} from "react-native";

// Header & Footer
import FeedHeader from "../components/1_Feed/FeedHeader";
import Footer from "../components/Footer";

// Sections
import WeekCalendar from "../components/3_Workout/sections/WeekCalendar";
import TemplatesRail from "../components/3_Workout/sections/TemplatesRail";
import SectionDivider from "../components/3_Workout/ui/SectionDivider";
import HubRow from "../components/3_Workout/sections/HubRow";
import StartCluster from "../components/3_Workout/sections/StartCluster";

// Modals / Sheets
import NewWorkoutBottomSheet from "../components/3_Workout/NewWorkout/NewWorkoutBottomSheet";
import GroupModalBottomSheet from "../components/3_Workout/NewWorkout/Group/GroupModalBottomSheet";
import EditTemplateBottomSheet from "../components/3_Workout/Template/EditTemplateBottomSheet";
import WorkoutSummaryModal from "../components/3_Workout/WorkoutSummaryModal";
import DayDetailsSheet from "../components/3_Workout/DayDetailsSheet";
import FriendsActivitySheet from "../components/3_Workout/FriendsActivitySheet";
import InviteBanner from "../components/3_Workout/InviteBanner";
import NotificationsBottomSheet from "../components/1_Feed/Notifications/NotificationsBottomSheet";

// Theme & Hooks (project)
import { ss, FOOTER_HEIGHT, BTN_SIZE, TPL_BOTTOM_GAP, TPL_HEIGHT } from "../components/3_Workout/sections/workoutTheme";
import { useFoodLogs, primeFoodLogsCache } from "../hooks/useFoodLogs";
import useResolvedUid from "../hooks/useResolvedUid";
import useUserDoc from "../hooks/useUserDoc";
import useFriendsActivity from "../hooks/useFriendsActivity";
import useLiveFollowing from "../hooks/useLiveFollowing";
import useTemplates from "../hooks/useTemplates";
import useHeaderSearchUsers from "../hooks/useHeaderSearchUsers";
import useWorkoutInvites from "../hooks/useWorkoutInvites";

// Backend utils
import updateDoc from "../../backend/helper/firebase/updateDoc";
import makeID from "../../backend/helper/makeID";

// Local logic
import useWorkoutManager from "../logic/useWorkoutManager";
import useWorkoutStore from "../state/workoutStore";

// utils
import millisToHoursMinutesSeconds from "../helper/millisToHoursMinutesSeconds";
import usePodiumTop3 from "../hooks/usePodiumTop3";
import { initUserFeed, registerFeedSetters } from "../helper/initUserFeed";

// Firestore (for invites)
import { serverTimestamp } from "firebase/firestore";

// UI
import CopyTemplateToast from "../components/3_Workout/ui/CopyTemplateToast";
import { navigationRef } from "../../navigationRef";
import { StackActions } from "@react-navigation/native";

const PREVIEW_EXERCISE = "Bench Press (Barbell)";
const PREVIEW_LABEL = "Bench Press • 1RM";

/* ---------------- helpers ---------------- */
const toMillis = (v) => {
    if (typeof v === "number") return v;
    if (v instanceof Date) return v.getTime();
    if (v?.toMillis) return v.toMillis();
    if (typeof v?.seconds === "number") return v.seconds * 1000;
    const n = new Date(v).getTime();
    return Number.isFinite(n) ? n : 0;
};
const toDayKey = (d) => {
    if (!d && d !== 0) return "";
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return "";
    x.setHours(0, 0, 0, 0);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

export default function Workout({ navigation, route }) {
    /* ---------- resolve uid & user ---------- */
    const uid = useResolvedUid(route);
    const [messages, setMessages] = useState(null);
    const [footerKeyDummy, setFooterKeyDummy] = useState(0);
    useEffect(() => {
        // Mirror Feed screen setup so header Messages works the same
        registerFeedSetters({ setMessages, setFooterKey: setFooterKeyDummy });
        if (uid) initUserFeed(uid);
    }, [uid]);
    const user = useUserDoc(uid, { ignoreKeys: ['currentWorkout'] }); // avoid rerenders on workout typing

    const markFriendsViewed = React.useCallback(async () => {
        try {
            if (!uid) return;
            await updateDoc("users", uid, { friendsActivityLastViewedAt: serverTimestamp() });
        } catch (e) {
            console.log("markFriendsViewed error", e);
        }
    }, [uid]);

    /* ---------- first paint guard ---------- */
    const [afterPaint, setAfterPaint] = useState(false);
    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            requestAnimationFrame(() => setAfterPaint(true));
        });
        return () => task?.cancel?.();
    }, []);

    /* ---------- prevent phantom “00:00” ---------- */
    useEffect(() => {
        try { global.isCurrentlyWorkingOut = false; } catch { /* ignore */ }
    }, []);

    /* ---------- Invite picker (screen-level) ---------- */
    const [inviteSheetOpen, setInviteSheetOpen] = useState(false);
    const inviteHandlerRef = useRef(null);

    /* ---------- UI/anim ---------- */
    const scaleAnim = useRef(new Animated.Value(0.92)).current;
    useEffect(() => {
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 6, tension: 80 }).start();
    }, []);

    /* ---------- calories (today) ---------- */
    const stableToday = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
    const { totals: todayTotals } = useFoodLogs(stableToday, uid);
    // Warm cache around today on mount for snappier day switches
    useEffect(() => {
        const uidX = uid || global?.userData?.uid || global?.userData?.id;
        if (uidX) primeFoodLogsCache(uidX, stableToday, 7);
    }, [uid, stableToday]);
    const todayCalories = Math.round(Math.max(0, todayTotals?.calories || 0));
    const caloriesGoal = useMemo(
        () => user?.macroGoals?.calories ?? user?.macrosGoal?.calories ?? 2340,
        [user?.macroGoals?.calories, user?.macrosGoal?.calories]
    );
    const fill = Math.min(100, (todayCalories / Math.max(1, caloriesGoal)) * 100);

    /* ---------- templates (state & CRUD via hook) ---------- */
    const {
        templatesWithNone,
        activeIdx,
        setActiveIdx,
        isEditVisible: isEditTemplateVisible,
        setIsEditVisible: setIsEditTemplateVisible,
        openedTemplateRef,
        initTemplate,
        openEditTemplate,
        updateTemplate,
        deleteTemplate,
    } = useTemplates({ uid, userTemplates: user?.templates });
    const [editSheetToggle, setEditSheetToggle] = useState(false);
    const initTemplateAndToggle = useCallback(() => { initTemplate(); setEditSheetToggle((t) => !t); }, [initTemplate]);
    const openEditTemplateAndToggle = useCallback((tpl) => { openEditTemplate(tpl); setEditSheetToggle((t) => !t); }, [openEditTemplate]);

    /* ---------- Copy template (from friend's completed workout) ---------- */
    const toastAnim = useRef(new Animated.Value(0)).current; // 0 hidden, 1 visible
    const [toastMsg, setToastMsg] = useState("");
    const showTemplateToast = useCallback((msg) => {
        setToastMsg(msg || "Template added");
        Animated.sequence([
            Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
            Animated.delay(1800),
            Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start();
    }, [toastAnim]);

    const handleCopyTemplate = useCallback((wk) => {
        try {
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
            const prev = Array.isArray(user?.templates) ? user.templates : [];
            updateDoc("users", uid, { templates: [...prev, newTemplate] }).catch(() => { });
            showTemplateToast("Template copied ✓");
        } catch (e) {
            console.log("handleCopyTemplate error", e);
        }
    }, [uid, user?.templates, showTemplateToast]);

    /* ---------- podium preview ---------- */
    const { top3 } = usePodiumTop3(PREVIEW_EXERCISE);

    /* ---------- friends activity ---------- */
    const { items: friendsActivity, refresh: refreshFriends } = useFriendsActivity(user);
    const [friendsSheetVisible, setFriendsSheetVisible] = useState(false);
    const [friendsSheetToggle, setFriendsSheetToggle] = useState(false);
    const [focusFriendUid, setFocusFriendUid] = useState(null);
    const [focusWorkoutWid, setFocusWorkoutWid] = useState(null);
    useEffect(() => { refreshFriends(); }, [refreshFriends]);
    useEffect(() => { if (friendsSheetVisible) refreshFriends(); }, [friendsSheetVisible, refreshFriends]);

    const lastViewedAtMs =
        (user?.friendsActivityLastViewedAt?.toMillis?.() ||
            new Date(user?.friendsActivityLastViewedAt || 0).getTime()) || 0;

    const itemTs = useCallback(
        (it) => Math.max(
            toMillis(it?.created) || 0,
            toMillis(it?.startedAt) || 0,
            toMillis(it?.finishedAt) || 0
        ),
        []
    );

    // treat as completed only if finishedAt exists and workout has some signal of work
    const looksCompleted = useCallback((it) => {
        const fin = toMillis(it?.finishedAt);
        if (!fin) return false;
        const vol = Number(it?.volume || 0);
        const reps = Number(it?.reps || it?.totalReps || 0);
        const dur = Number(it?.duration || 0);
        const hasSets =
            Array.isArray(it?.exercises) &&
            it.exercises.some((ex) => Array.isArray(ex?.sets) && ex.sets.length > 0);
        return vol > 0 || reps > 0 || dur > 0 || hasSets;
    }, []);

    const newCompletedItems = useMemo(() => {
        const v = lastViewedAtMs || 0;
        const arr = Array.isArray(friendsActivity) ? friendsActivity : [];
        return arr.filter((it) => itemTs(it) > v && looksCompleted(it));
    }, [friendsActivity, lastViewedAtMs, itemTs, looksCompleted]);

    /* ---------- LIVE FOLLOWING: always treat live as new ---------- */
    const liveNow = useLiveFollowing(user); // [{uid,pfp,pfpVersion,isLive:true,_ts}]
    const nonLiveNew = useMemo(() => {
        const liveSet = new Set(liveNow.map((x) => x.uid));
        const uniq = [];
        (Array.isArray(newCompletedItems) ? newCompletedItems : []).forEach((it) => {
            const uidX = it?.uid;
            if (!uidX || liveSet.has(uidX)) return;
            if (uniq.find((u) => u.uid === uidX)) return;
            uniq.push({
                uid: uidX,
                pfp: it?.pfp || it?.pfpUrl || it?.photoURL || it?.image || it?.avatar || "",
                pfpVersion: it?.pfpVersion || 0,
                isLive: false,
                _ts: itemTs(it),
            });
        });
        uniq.sort((a, b) => (b._ts || 0) - (a._ts || 0));
        return uniq;
    }, [newCompletedItems, liveNow, itemTs]);

    const stackUsers = useMemo(() => {
        const merged = [...liveNow, ...nonLiveNew];
        return merged.slice(0, 3);
    }, [liveNow, nonLiveNew]);

    const hasAnyStack = stackUsers.length > 0;
    const [notificationsBottomSheetExpandFlag, setNotificationsBottomSheetExpandFlag] = useState(false);

    /* ---------- Workout Manager (state + persistence + timer) ---------- */
    // Track last consumed global open signal
    const openSignalRef = useRef(0);
    const {
        timerRef,
        isNewWorkoutVisible,
        setIsNewWorkoutVisible,
        isSummaryModalVisible,
        setIsSummaryModalVisible,
        completedWorkout,
        startNewWorkoutFromTemplate,
        updateNewWorkout,
        cancelWorkout,
        finishWorkout,
        postWorkout,
        joinExternalWorkout, // used by InviteBanner accept
    } = useWorkoutManager({ uid, navigation, millisToHMS: millisToHoursMinutesSeconds });

    const hasActiveWorkout = useWorkoutStore((s) => !!s.workout);
    const workoutWid = useWorkoutStore((s) => (s.workout ? s.workout.wid : null));
    // Header search users (shared hook)
    const { allUsersRef, mergeUsersIntoRef } = useHeaderSearchUsers({ following: global?.userData?.following, enablePrefetch: true });

    /* ---------- Auto-open current workout or friends sheet when navigated with intent ---------- */
    useEffect(() => {
        const shouldOpenWorkout = !!route?.params?.openCurrent;
        if (shouldOpenWorkout && hasActiveWorkout) {
            const id = setTimeout(() => setIsNewWorkoutVisible(true), 60);
            navigation.setParams({ openCurrent: false });
            return () => clearTimeout(id);
        }

        if (route?.params?.openFriends) {
            const id = setTimeout(() => {
                setFriendsSheetVisible(true);
                setFriendsSheetToggle((f) => !f);
                const uidHint = route?.params?.focusFriendUid;
                if (uidHint) setFocusFriendUid(String(uidHint));
                const widHint = route?.params?.focusWorkoutWid;
                if (widHint) setFocusWorkoutWid(String(widHint));
            }, 30);
            navigation.setParams({ openFriends: false, focusFriendUid: undefined, focusWorkoutWid: undefined });
            return () => clearTimeout(id);
        }
    }, [route?.params?.openCurrent, route?.params?.openFriends, route?.params?.focusFriendUid, route?.params?.focusWorkoutWid, route?.params?._t, hasActiveWorkout, navigation, setIsNewWorkoutVisible]);

    // Also react immediately on focus transitions (e.g., when tab is already mounted)
    useFocusEffect(
        useCallback(() => {
            // Param-based trigger
            if (route?.params?.openCurrent && hasActiveWorkout) {
                const id = setTimeout(() => setIsNewWorkoutVisible(true), 30);
                navigation.setParams({ openCurrent: false });
                return () => clearTimeout(id);
            }
            if (route?.params?.openFriends) {
                setFriendsSheetVisible(true);
                setFriendsSheetToggle((f) => !f);
                const uidHint = route?.params?.focusFriendUid;
                if (uidHint) setFocusFriendUid(String(uidHint));
                const widHint = route?.params?.focusWorkoutWid;
                if (widHint) setFocusWorkoutWid(String(widHint));
                navigation.setParams({ openFriends: false, focusFriendUid: undefined, focusWorkoutWid: undefined });
            }
            // Global signal trigger (fallback when params don't propagate)
            const lastRef = openSignalRef.current || 0;
            const sig = Number(global?.openCurrentWorkoutSignal || 0);
            if (sig && sig !== lastRef) {
                openSignalRef.current = sig;
                const id = setTimeout(() => setIsNewWorkoutVisible(true), 30);
                return () => clearTimeout(id);
            }
        }, [route?.params?.openCurrent, route?.params?.openFriends, route?.params?.focusFriendUid, route?.params?.focusWorkoutWid, hasActiveWorkout, navigation])
    );

    /* ---------- New workout from current template selection ---------- */
    const onStartWorkout = useCallback(() => {
        const selected = templatesWithNone[Math.max(0, Math.min(activeIdx, templatesWithNone.length - 1))];
        startNewWorkoutFromTemplate(selected?.isNone ? null : selected);
    }, [activeIdx, templatesWithNone, startNewWorkoutFromTemplate]);

    // Stable handlers to avoid re-rendering StartCluster on every parent render
    const openNewWorkout = useCallback(() => setIsNewWorkoutVisible(true), [setIsNewWorkoutVisible]);
    const openFriends = useCallback(() => {
        setFriendsSheetVisible(true);
        setFriendsSheetToggle((f) => !f);
    }, []);

    /* ---------- Day sheet + meals ---------- */
    const [daySheetToggle, setDaySheetToggle] = useState(false);
    const [daySheetVisible, setDaySheetVisible] = useState(false);
    const [daySheetDate, setDaySheetDate] = useState(null);
    const sheetDate = useMemo(() => daySheetDate ?? stableToday, [daySheetDate, stableToday]);
    const { meals: sheetMeals, totals: sheetTotals } = useFoodLogs(sheetDate, uid);
    const dayWorkouts = useMemo(() => {
        const dk = toDayKey(sheetDate);
        const completed = Array.isArray(global?.userData?.completedWorkouts) ? global.userData.completedWorkouts : [];
        const active = global?.userData?.currentWorkout ? [global.userData.currentWorkout] : [];
        return [...completed, ...active]
            .filter((w) => { const when = toMillis(w?.created ?? w?.createdAt); return when && toDayKey(when) === dk; })
            .sort((a, b) => toMillis(b?.created ?? b?.createdAt) - toMillis(a?.created ?? a?.createdAt));
    }, [sheetDate]);

    /* ---------- Header height (for banner anchoring) ---------- */
    const [headerHeight, setHeaderHeight] = useState(0);
    const onHeaderLayout = useCallback((e) => {
        const h = e?.nativeEvent?.layout?.height || 0;
        if (h && h !== headerHeight) setHeaderHeight(h);
    }, [headerHeight]);

    /* ---------- force header rerender when workout clears ---------- */
    // Header renders once; suggestions and timer update via refs and effects

    /* ---------- Invites banner (shared hook) ---------- */
    const {
        currentInvite,
        inviterPfpUri,
        bannerY,
        handleInviteLayout,
        accept: acceptInvite,
        decline: declineInvite,
    } = useWorkoutInvites({
        uid,
        onAccepted: async (wid, seed) => {
            const me = String(uid || global?.userData?.uid || "");
            const joined = {
                wid,
                creatorUID: seed?.creatorUid || seed?.creatorUID || me,
                created: Date.now(),
                users: [],
                exercises: [],
                tid: null,
                volume: 0,
                reps: 0,
                PBs: 0,
            };
            try { global.isCurrentlyWorkingOut = true; } catch { }
            try { if (global?.userData) global.userData.currentWorkout = joined; } catch { }
            try {
                if (typeof joinExternalWorkout === "function") {
                    await joinExternalWorkout({ wid, seedWorkout: seed || joined, inviterUid: currentInvite?.fromUid });
                } else {
                    try { useWorkoutStore.setState({ workout: joined }); } catch { }
                }
            } catch {
                try { useWorkoutStore.setState({ workout: joined }); } catch { }
            }
            setIsNewWorkoutVisible(true);
        },
    });

    /* ---------------- render ---------------- */
    return (
        <SafeAreaView style={styles.root}>
            {/* Header measured for anchoring */}
            <View onLayout={onHeaderLayout}>
                <FeedHeader
                    toMessagesScreen={() => {
                        if (global.userData && messages) {
                            navigation?.navigate("Messages", { userData: global.userData, messages, returnTo: 'Workout' });
                        } else {
                            navigation?.navigate("Messages", { returnTo: 'Workout' });
                        }
                    }}
                    onOpenNotifications={() => setNotificationsBottomSheetExpandFlag((f) => !f)}
                    backButton={false}
                    onBackPress={() => navigation?.goBack?.()}
                    scrollToTop={() => { }}
                    navigation={navigation}
                    allUsersRef={allUsersRef}
                    workout={workoutWid ? { wid: workoutWid } : null}
                    timerRef={timerRef}
                    openCurrentWorkout={() => setIsNewWorkoutVisible(true)}
                />
            </View>

            {/* Invite banner (absolute, anchored below header & within SafeArea) */}
            <Animated.View
                style={[
                    styles.inviteBannerWrap,
                    { top: headerHeight + 6, transform: [{ translateY: bannerY }] },
                ]}
                pointerEvents={currentInvite ? "auto" : "none"}
                onLayout={handleInviteLayout}
            >
                {currentInvite && (
                    <InviteBanner
                        invite={currentInvite}
                        pfpUri={inviterPfpUri}
                        onAccept={acceptInvite}
                        onDecline={declineInvite}
                    />
                )}
            </Animated.View>

            <View style={styles.content}>
                <WeekCalendar
                    workoutsMap={global?.userData?.workoutsByDate || {}}
                    onDayPress={(d) => {
                        try {
                            const uidX = global?.userData?.uid || global?.userData?.id || uid;
                            if (uidX) primeFoodLogsCache(uidX, d, 7);
                        } catch { }
                        setDaySheetDate(d);
                        setDaySheetVisible(true);
                        setDaySheetToggle((f) => !f);
                    }}
                />

                {/* Hub row */}
                <HubRow
                    navigation={navigation}
                    afterPaint={afterPaint}
                    fill={fill}
                    todayCalories={todayCalories}
                    caloriesGoal={caloriesGoal}
                    top3={top3}
                    PREVIEW_LABEL={PREVIEW_LABEL}
                />

                <SectionDivider />
            </View>

            {/* Templates rail (mount after first paint) */}
            {afterPaint && (
                <View style={styles.templatesDock} pointerEvents="box-none">
                    <TemplatesRail
                        templates={templatesWithNone}
                        onIndexChange={setActiveIdx}
                        onAddTemplate={initTemplateAndToggle}
                        onOpenTemplate={openEditTemplateAndToggle}
                    />
                </View>
            )}

            {/* START cluster */}
            <View style={styles.clusterWrap} pointerEvents="box-none">
                <StartCluster
                    navigation={navigation}
                    scaleAnim={scaleAnim}
                    hasActiveWorkout={hasActiveWorkout}
                    onStartWorkout={onStartWorkout}
                    onOpenNewWorkout={openNewWorkout}
                    onOpenFriends={openFriends}
                    hasNewFriendsUpdates={hasAnyStack}
                    friendsStackUsers={stackUsers}
                />
            </View>

            <Footer navigation={navigation} currentScreenName={"Workout"} />

            {/* Notifications (same UX as Feed) */}
            <NotificationsBottomSheet notificationsBottomSheetExpandFlag={notificationsBottomSheetExpandFlag} />

            {/* Day details (always mounted so ref is ready on first open) */}
            <View style={StyleSheet.absoluteFill} pointerEvents={daySheetVisible ? "auto" : "none"}>
                <DayDetailsSheet
                    visible={daySheetVisible}
                    openToggle={daySheetToggle}
                    date={sheetDate}
                    workouts={dayWorkouts}
                    meals={sheetMeals}
                    totals={sheetTotals}
                    calories={sheetTotals?.calories || 0}
                    workoutOn={(dayWorkouts?.length || 0) > 0}
                    onClose={() => setDaySheetVisible(false)}
                    onChangeDate={(d) => {
                        try {
                            const uidX = global?.userData?.uid || global?.userData?.id || uid;
                            if (uidX) primeFoodLogsCache(uidX, d, 7);
                        } catch { }
                        try {
                            const nd = new Date(d);
                            if (!Number.isNaN(nd.getTime())) nd.setHours(0, 0, 0, 0);
                            setDaySheetDate(nd);
                        } catch { setDaySheetDate(d); }
                        // Keep sheet open; no re-expand
                    }}
                    onStartWorkout={onStartWorkout}
                    onOpenMacros={() => {
                        setDaySheetVisible(false);
                        try {
                            if (navigationRef?.isReady?.()) {
                                navigationRef.dispatch(StackActions.push('MacroTrackingOverlay'));
                                return;
                            }
                        } catch { }
                        try {
                            const rootNav = navigation?.getParent?.('ROOT');
                            if (rootNav?.push) rootNav.push('MacroTrackingOverlay');
                            else if (rootNav?.navigate) rootNav.navigate('MacroTrackingOverlay');
                            else navigation.navigate('MacroTrackingOverlay');
                        } catch {
                            navigation.navigate('MacroTrackingOverlay');
                        }
                    }}
                />
            </View>

            {/* Friends sheet */}
            <View style={StyleSheet.absoluteFill} pointerEvents={friendsSheetVisible ? "auto" : "none"}>
                <FriendsActivitySheet
                    visible={friendsSheetVisible}
                    openToggle={friendsSheetToggle}
                    focusUid={focusFriendUid}
                    focusWid={focusWorkoutWid}
                    onConsumedFocus={() => { setFocusFriendUid(null); setFocusWorkoutWid(null); }}
                    items={friendsActivity}
                    lastViewedAt={user?.friendsActivityLastViewedAt}
                    onViewed={markFriendsViewed}
                    onClose={() => setFriendsSheetVisible(false)}
                    onCopyTemplate={handleCopyTemplate}
                    onJoin={(item) => {
                        setFriendsSheetVisible(false);
                        Alert.alert("Join Workout", `Joining ${item.name}'s live session…`);
                    }}
                    onView={(item) => {
                        setFriendsSheetVisible(false);
                        Alert.alert("Workout", `Opening ${item.name}'s workout (${item.duration} min)…`);
                    }}
                />
            </View>

            {/* New Workout sheet */}
            <NewWorkoutBottomSheet
                cancelNewWorkout={cancelWorkout}
                updateNewWorkout={updateNewWorkout}
                finishNewWorkout={finishWorkout}
                isVisible={isNewWorkoutVisible}
                setIsVisible={setIsNewWorkoutVisible}
                timerRef={timerRef}
                showGroupModal={() => setInviteSheetOpen(true)}
                registerInviteHandler={(fn) => { inviteHandlerRef.current = fn; }}
                userWorkoutStats={global?.userData?.statsExercises || {}}
            />

            {/* Template editor (kept identical behavior) */}
            <EditTemplateBottomSheet
                isVisible={isEditTemplateVisible}
                setIsVisible={setIsEditTemplateVisible}
                openToggle={editSheetToggle}
                openedTemplateRef={openedTemplateRef}
                updateTemplate={updateTemplate}
                deleteTemplate={deleteTemplate}
            />

            {isSummaryModalVisible && (
                <WorkoutSummaryModal
                    isVisible={isSummaryModalVisible}
                    workout={completedWorkout}
                    onClose={() => setIsSummaryModalVisible(false)}
                    postWorkout={postWorkout}
                />
            )}

            {/* Copy Template toast (above Templates rail) */}
            <Animated.View pointerEvents="none" style={styles.toastWrap}>
                <CopyTemplateToast anim={toastAnim} text={toastMsg || "Template added"} />
            </Animated.View>

            {/* Invite picker mounted at screen level so backdrop covers everything */}
            <GroupModalBottomSheet
                groupModalExpandFlag={inviteSheetOpen}
                closeGroupModal={() => setInviteSheetOpen(false)}
                onInvite={(users) => {
                    const fn = inviteHandlerRef.current;
                    if (typeof fn === 'function') {
                        try { fn(users); } catch (e) { console.log('invite error', e); }
                    }
                    setInviteSheetOpen(false);
                }}
            />
        </SafeAreaView>
    );
}

/* ---------------- styles ---------------- */
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F7FAFF" },
    content: { flex: 1 },

    templatesDock: { position: "absolute", left: 0, right: 0, bottom: FOOTER_HEIGHT + ss(22) + BTN_SIZE + TPL_BOTTOM_GAP },
    clusterWrap: { position: "absolute", left: 0, right: 0, bottom: FOOTER_HEIGHT + ss(20), alignItems: "center" },

    // Invite banner wrapper (same positioning/animation as original)
    inviteBannerWrap: {
        position: "absolute",
        left: 0,
        right: 0,
        zIndex: 30,
        alignItems: "center",
        paddingTop: 0,
    },
    // Toast positioned above Templates rail
    toastWrap: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: FOOTER_HEIGHT + ss(22) + BTN_SIZE + TPL_BOTTOM_GAP + TPL_HEIGHT + ss(10),
        alignItems: "center",
        zIndex: 40,
    },
});
